// src/services/ai.service.ts

import { ParsedMail } from 'mailparser';

// Define the possible categories for type safety.
export type EmailCategory = 'Interested' | 'Not Interested' | 'Meeting Booked' | 'Spam' | 'Out of Office' | 'Promotional' | 'Uncategorized';

/**
 * @class AiService
 * MOCK IMPLEMENTATION: This version uses simple keyword matching for instant,
 * rate-limit-free categorization. It does NOT call the OpenAI API.
 */
export class AiService {

    constructor() {
        console.log(`[AI] Initialized with MOCK (local keyword-based) service. No API calls will be made.`);
    }

    public getClientCount(): number {
        return 3; // Pretend we have 3 workers to allow for parallel processing.
    }

    /**
     * Categorizes an email locally based on keywords in its subject and body.
     * @param email The parsed email object.
     * @returns The category of the email as a string.
     */
    public async categorizeEmail(email: ParsedMail): Promise<EmailCategory> {
        const subject = (email.subject || '').toLowerCase();
        const text = (email.text || '').toLowerCase();
        const content = `${subject} ${text}`;

        // More robust keyword matching
        if (/\b(meeting|schedule|calendar|book a time|call)\b/i.test(content)) {
            return 'Meeting Booked';
        }
        if (/\b(interested|learn more|next steps|demo|proposal|quote)\b/i.test(content)) {
            return 'Interested';
        }
        if (/\b(not interested|unsubscribe|not a fit|remove me)\b/i.test(content)) {
            return 'Not Interested';
        }
        if (/\b(out of office|away from my desk|auto-reply|ooo)\b/i.test(content)) {
            return 'Out of Office';
        }
        if (/\b(spam|lottery|winner|congratulations|free gift)\b/i.test(subject)) {
            return 'Spam';
        }
        // A new category for promotional emails
        if (/\b(sale|% off|discount|offer|limited time|new arrivals)\b/i.test(content)) {
            return 'Promotional';
        }
        
        return 'Uncategorized';
    }
}
