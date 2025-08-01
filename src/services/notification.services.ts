// src/services/notification.service.ts

import axios from 'axios';
import { ParsedMail } from 'mailparser';

/**
 * @class NotificationService
 * Manages sending notifications to external services like Slack and webhooks.
 */
export class NotificationService {
    private slackWebhookUrl: string | undefined;
    private externalWebhookUrl: string | undefined;

    constructor() {
        this.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
        this.externalWebhookUrl = process.env.EXTERNAL_WEBHOOK_URL;
    }

    /**
     * Sends a formatted notification to a Slack channel.
     * @param email The email that triggered the notification.
     */
    public async sendSlackNotification(email: ParsedMail): Promise<void> {
        if (!this.slackWebhookUrl) {
            console.warn('[Slack] SLACK_WEBHOOK_URL not set. Skipping notification.');
            return;
        }

        const payload = {
            text: `🚀 New "Interested" Lead!`,
            blocks: [
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*🚀 New "Interested" Lead!*`
                    }
                },
                {
                    type: 'divider'
                },
                {
                    type: 'section',
                    fields: [
                        { type: 'mrkdwn', text: `*From:*\n${email.from?.text}` },
                        { type: 'mrkdwn', text: `*Date:*\n${email.date?.toLocaleString()}` }
                    ]
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Subject:*\n${email.subject}`
                    }
                },
                {
                    type: 'section',
                    text: {
                        type: 'mrkdwn',
                        text: `*Snippet:*\n>${email.text?.substring(0, 200)}...`
                    }
                }
            ]
        };

        try {
            await axios.post(this.slackWebhookUrl, payload);
            console.log('[Slack] "Interested" notification sent successfully.');
        } catch (error) {
            console.error('[Slack] Error sending notification:', error);
        }
    }

    /**
     * Triggers a generic webhook with the email data.
     * @param email The email that triggered the webhook.
     */
    public async triggerWebhook(email: ParsedMail, category: string): Promise<void> {
        if (!this.externalWebhookUrl) {
            console.warn('[Webhook] EXTERNAL_WEBHOOK_URL not set. Skipping webhook.');
            return;
        }

        const payload = {
            event: 'email_categorized',
            category: category,
            email: {
                from: email.from?.value,
                subject: email.subject,
                date: email.date,
                messageId: email.messageId,
            }
        };

        try {
            await axios.post(this.externalWebhookUrl, payload);
            console.log('[Webhook] Triggered successfully for "Interested" email.');
        } catch (error) {
            console.error('[Webhook] Error triggering webhook:', error);
        }
    }
}
