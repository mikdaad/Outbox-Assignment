// In your main application file, e.g., src/index.ts

import 'dotenv/config'; // <-- CHANGE THIS LINE
import { ImapService, ImapConfig } from './services/imap.service.js'; // <-- ADD .js
import { ParsedMail } from 'mailparser';


// This is the function that will be called every time an email is parsed.
// This is where you'll connect to your other services.
function processNewEmail(mail: ParsedMail, accountUser: string) {
    console.log(`--- New Email Processed for ${accountUser} ---`);
    console.log(`Subject: ${mail.subject}`);
    console.log(`From: ${mail.from?.text}`);
    // 1. Call your AI service to categorize the email.
    // 2. Call your Elasticsearch service to index the email with its category.
    // 3. If the category is "Interested", call your notification service.
    console.log('------------------------------------------\n');
}

// Define configurations for all your accounts
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

// Create and connect a service for each account
accounts.forEach(config => {
    if (config.user && config.password) {
        const imapService = new ImapService(config, processNewEmail);
        imapService.connect();
    }
});