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
        this.client = new Client({ 
            node: 'http://localhost:9200',
            requestTimeout: 50000 
        });
    }

    /**
     * Checks if the 'emails' index exists and creates it with an updated mapping.
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
                            accountId: { type: 'keyword' },
                            category: { type: 'keyword' } // <-- ADDED: For filtering by AI category
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
     * Saves a single parsed email object, including its category, into Elasticsearch.
     * @param email The parsed email object.
     * @param accountId The email address of the account.
     * @param category The AI-determined category.
     */
    public async indexEmail(email: ParsedMail, accountId: string, category: string): Promise<void> {
        try {
            await this.client.index({
                index: INDEX_NAME,
                body: {
                    ...email,
                    accountId: accountId, 
                    category: category, // <-- ADDED: Store the category
                },
            });
            console.log(`[ES] Indexed email with subject: "${email.subject}" [Category: ${category}]`);
        } catch (error) {
            console.error('[ES] Error indexing email:', error);
        }
    }

   

    /**
     * FIX: Added the missing searchEmails function.
     * Searches for emails in Elasticsearch based on various criteria.
     * @param query The text to search for in the email subject or body.
     * @param accountId The specific account to filter by.
     * @param category The AI-determined category to filter by.
     * @returns A list of email documents that match the search criteria.
     */
    public async searchEmails(query: string, accountId: string, category: string): Promise<any[]> {
        const mustClauses: any[] = [];

        if (query) {
            mustClauses.push({
                multi_match: {
                    query: query,
                    fields: ['subject', 'text'],
                    fuzziness: 'AUTO'
                }
            });
        }

        // Use 'term' for exact matching on keyword fields
        if (accountId) {
            mustClauses.push({
                term: { 'accountId.keyword': accountId }
            });
        }

        if (category) {
            mustClauses.push({
                term: { 'category.keyword': category }
            });
        }

        try {
            const response = await this.client.search({
                index: INDEX_NAME,
                body: {
                    query: {
                        bool: {
                            must: mustClauses.length > 0 ? mustClauses : { match_all: {} }
                        }
                    },
                    sort: [
                        { date: { order: 'desc' } } // Sort by most recent
                    ],
                    size: 100 // Return up to 100 results
                }
            });
            return response.hits.hits.map(hit => hit._source);
        } catch (error) {
            console.error('[ES] Error searching emails:', error);
            return [];
        }
    }

    public async emailExists(messageId: string): Promise<boolean> {
        if (!messageId) return false; // Cannot check for existence without an ID.

        try {
            const response = await this.client.count({
                index: INDEX_NAME,
                body: {
                    query: {
                        term: {
                            'messageId.keyword': messageId
                        }
                    }
                }
            });
            return response.count > 0;
        } catch (error) {
            // If the index doesn't exist yet, it will throw an error. In that case, the email doesn't exist.
            return false;
        }
    }
}
