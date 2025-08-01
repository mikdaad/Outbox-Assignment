// src/index.ts

// --- Imports ---
// Use the new ESM-style import for dotenv
import 'dotenv/config'; 
// Use the .js extension for local file imports in an ESM project
import { ImapService, ImapConfig } from './services/imap.service.js'; 
import { ElasticsearchService } from './services/elasticsearch.service.js';
import { ParsedMail } from 'mailparser';

/**
 * The main entry point for the application.
 * We wrap the startup logic in an async function to use 'await'.
 */
async function main() {
    // --- 1. Initialize Services ---
    // Create a single instance of the Elasticsearch service.
    const elasticsearchService = new ElasticsearchService();
    
    console.log('[App] Starting services...');
    // Setup the Elasticsearch index. This creates the 'emails' index if it doesn't exist.
    // We 'await' this to ensure the index is ready before we start fetching emails.
    await elasticsearchService.setupIndex();
    console.log('[App] Elasticsearch service is ready.');


    // --- 2. Define the Core Logic ---
    /**
     * This callback function is the heart of the application.
     * It's triggered by the ImapService every time a new email is parsed.
     * @param mail The parsed email object.
     * @param accountUser The email address of the account that received the mail.
     */
    function processNewEmail(mail: ParsedMail, accountUser: string) {
        console.log(`--- Processing New Email for ${accountUser} ---`);
        console.log(`   Subject: ${mail.subject}`);

        // Here is the integration point:
        // The email from the IMAP service is passed directly to the Elasticsearch service to be saved.
        elasticsearchService.indexEmail(mail, accountUser);
        
        // --- UPCOMING FEATURES WILL GO HERE ---
        // TODO: Call AI service to categorize the email.
        // TODO: Send Slack/Webhook notifications if category is 'Interested'.

        console.log('------------------------------------------\n');
    }


    // --- 3. Configure and Start IMAP Listeners ---
    // Load the account configurations from your .env file.
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
    // Loop through each account configuration.
    accounts.forEach(config => {
        // Ensure that user and password exist before trying to connect.
        if (config.user && config.password) {
            // Create a new ImapService instance for this specific account.
            // Pass our `processNewEmail` function as the callback.
            const imapService = new ImapService(config, processNewEmail);
            // Start the connection. This will run in the background.
            imapService.connect();
        }
    });
    console.log('[App] All IMAP services are connecting...');
}

// --- Run the Application ---
// Call the main function and catch any errors that might occur during startup.
main().catch(error => {
    console.error('[App] A critical error occurred during startup:', error);
    process.exit(1);
});
