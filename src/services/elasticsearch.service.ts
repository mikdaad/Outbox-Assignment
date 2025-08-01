// src/services/elasticsearch.service.ts

import { Client } from '@elastic/elasticsearch';
import { ParsedMail } from 'mailparser';

const INDEX_NAME = 'emails';

/**
 * @class ElasticsearchService
 * Manages all interactions with the Elasticsearch database.
 */
export class ElasticsearchService {
    private client: Client;

    constructor() {
        // Initialize the client to connect to the local Docker container.
        this.client = new Client({ node: 'http://localhost:9200' });
    }

    /**
     * Checks if the 'emails' index exists and creates it with a specific mapping if it doesn't.
     * This ensures that fields like 'date' are stored correctly.
     */
    public async setupIndex(): Promise<void> {
        console.log('[ES] Checking if index exists...');
        const indexExists = await this.client.indices.exists({ index: INDEX_NAME });

        if (!indexExists) {
            console.log(`[ES] Index "${INDEX_NAME}" not found. Creating...`);
            await this.client.indices.create({
                index: INDEX_NAME,
                body: {
                    mappings: {
                        properties: {
                            date: { type: 'date' },
                            subject: { type: 'text' },
                            from: { type: 'object' },
                            to: { type: 'object' },
                            text: { type: 'text' },
                            html: { type: 'text' },
                            accountId: { type: 'keyword' } // 'keyword' is better for exact matching/filtering
                        }
                    }
                }
            });
            console.log('[ES] Index created successfully.');
        } else {
            console.log('[ES] Index already exists.');
        }
    }

    /**
     * Saves a single parsed email object into the Elasticsearch index.
     * @param email The parsed email object from mailparser.
     * @param accountId The email address of the account this email belongs to.
     */
    public async indexEmail(email: ParsedMail, accountId: string): Promise<void> {
        try {
            await this.client.index({
                index: INDEX_NAME,
                // We add the accountId to the document for filtering later.
                body: {
                    ...email,
                    accountId: accountId, 
                },
            });
            console.log(`[ES] Indexed email with subject: "${email.subject}"`);
        } catch (error) {
            console.error('[ES] Error indexing email:', error);
        }
    }
}
