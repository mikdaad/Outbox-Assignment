// src/index.ts


import 'dotenv/config'; 
import { ImapService, ImapConfig } from './services/imap.service.js'; 
import { ElasticsearchService } from './services/elasticsearch.service.js';
import { AiService } from  './services/ai.services.js';
import { NotificationService } from './services/notification.services.js';
import { ParsedMail } from 'mailparser';
import express from 'express';
import cors from 'cors';
import emailRoutes from './controllers/email.routes.js';

/**
 * A simple promise-based delay function.
 * @param ms The number of milliseconds to wait.
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- FIX: Implement a Queue to process emails sequentially ---
// This queue will hold all incoming emails waiting to be processed.
const emailQueue: { mail: ParsedMail, accountUser: string }[] = [];
// This flag prevents multiple workers from running at the same time.
let isProcessing = false;

/**
 * The main entry point for the application.
 */
async function main() {
    // --- 1. Initialize All Services ---
    const elasticsearchService = new ElasticsearchService();
    const aiService = new AiService();
    const notificationService = new NotificationService();
    
    console.log('[App] Starting services...');
    await elasticsearchService.setupIndex();
    console.log('[App] All services are ready.');

    /**
     * The Queue Worker: Processes emails from the queue one by one.
     */

    const app = express();
    const PORT = process.env.PORT || 3001;

    app.use(cors()); // Enable Cross-Origin Resource Sharing
    app.use(express.json()); // Middleware to parse JSON bodies

    // Use the email API routes
    app.use('/api', emailRoutes);

    app.listen(PORT, () => {
        console.log(`[API] Server is running on http://localhost:${PORT}`);
    });

    async function processQueue() {
        if (isProcessing) return; // Don't start a new worker if one is already running.
        isProcessing = true;
        console.log(`[Queue] Worker started. Items to process: ${emailQueue.length}`);

        // Process items until the queue is empty.
        while (emailQueue.length > 0) {
            const { mail, accountUser } = emailQueue.shift()!; // Get the next email from the queue

            console.log(`--- Processing Email for ${accountUser} ---`);
            console.log(`   Subject: ${mail.subject}`);

            // Step 1: Categorize the email with AI
            const category = await aiService.categorizeEmail(mail);
            console.log(`[App] AI categorized email as: ${category}`);

            // Step 2: Index the email in Elasticsearch with its new category
            await elasticsearchService.indexEmail(mail, accountUser, category);
            
            // Step 3: If the lead is interested, send notifications
            if (category === 'Interested') {
                console.log('[App] "Interested" lead found! Triggering notifications...');
                notificationService.sendSlackNotification(mail);
                notificationService.triggerWebhook(mail, category);
            }

            console.log('------------------------------------------\n');
            
            // FIX: Increase delay to respect the 3 requests-per-minute (RPM) limit.
            // The error suggests waiting 20 seconds, so we'll wait 21 seconds to be safe.
            await delay(21000); 
        }

        isProcessing = false;
        console.log('[Queue] Worker finished. Queue is empty.');
    }

    /**
     * This function now acts as a producer, adding emails to the queue.
     */
    function onNewEmail(mail: ParsedMail, accountUser: string) {
        console.log(`[Queue] New email received, adding to queue. Subject: "${mail.subject}"`);
        emailQueue.push({ mail, accountUser });
        // Start the queue processor if it's not already running.
        processQueue();
    }

    // --- 3. Configure and Start IMAP Listeners ---
    const accounts: ImapConfig[] = [
        {
            user: process.env.IMAP_USER_1!,
            password: process.env.IMAP_PASSWORD_1!,
            host: process.env.IMAP_HOST_1!,
            port: 993,
            tls: true,
        },
        {
            user: process.env.IMAP_USER_2!,
            password: process.env.IMAP_PASSWORD_2!,
            host: process.env.IMAP_HOST_2!,
            port: 993,
            tls: true,
        }
    ];

    console.log('[App] Starting IMAP listeners...');
    accounts.forEach(config => {
        if (config.user && config.password) {
            // Pass the new 'onNewEmail' function as the callback.
            const imapService = new ImapService(config, onNewEmail);
            imapService.connect();
        }
    });
    console.log('[App] All IMAP services are connecting...');

    
}

// --- Run the Application ---
main().catch(error => {
    console.error('[App] A critical error occurred during startup:', error);
    process.exit(1);
});
