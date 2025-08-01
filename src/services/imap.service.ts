// src/services/imap.service.ts

import Imap from 'node-imap';
import { simpleParser, ParsedMail } from 'mailparser';

/**
 * @interface ImapConfig
 * Defines the configuration structure needed for a single IMAP account.
 */
export interface ImapConfig {
    user: string;
    password: string;
    host: string;
    port: number;
    tls: boolean;
}

/**
 * @class ImapService
 * Manages the connection, fetching, and real-time listening for a single IMAP account.
 */
export class ImapService {
    private imap: Imap;
    // We can use a callback to pass parsed emails back to the main application
    private onNewMail: (mail: ParsedMail, accountUser: string) => void;
    private mailListenerAdded = false;

    constructor(private config: ImapConfig, onNewMailCallback: (mail: ParsedMail, accountUser: string) => void) {
        this.imap = new Imap(this.config);
        this.onNewMail = onNewMailCallback;
    }

    /**
     * Initiates the connection to the IMAP server and sets up event listeners.
     */
    public connect(): void {
        console.log(`[IMAP] Attempting to connect to ${this.config.host}...`);

        this.imap.once('ready', () => {
            console.log(`[IMAP] Successfully connected to ${this.config.host}`);
            this.fetchInitialEmails();
        });

        this.imap.once('error', (err: Error) => {
            console.error(`[IMAP] Error for ${this.config.user}:`, err);
        });

        this.imap.once('end', () => {
            console.log(`[IMAP] Connection ended for ${this.config.user}`);
        });

        // Add mail listener only once
        if (!this.mailListenerAdded) {
            this.imap.on('mail', (numNewMsgs: number) => {
                console.log(`[IMAP] *** NEW MAIL RECEIVED for ${this.config.user}! Count: ${numNewMsgs} ***`);
                this.imap.openBox('INBOX', true, (err, box) => {
                    if (err) {
                        console.error('[IMAP] Error opening INBOX for new mail:', err);
                        return;
                    }
                    let start = box.messages.total - numNewMsgs + 1;
                    if (start < 1) start = 1;
                    const fetchRange = `${start}:*`;
                    console.log(`[IMAP] Fetching new mail in range: ${fetchRange}`);
                    const f = this.imap.fetch(fetchRange, { bodies: '' });
                    f.on('message', (msg, seqno) => this.handleMessage(msg, seqno));
                    f.once('error', (fetchErr: Error) => console.error('[IMAP] Fetch error on new mail:', fetchErr));
                    f.once('end', () => console.log('[IMAP] Finished fetching new email.'));
                });
            });
            this.mailListenerAdded = true;
        }

        this.imap.connect();
    }

    /**
     * Fetches emails from the last 30 days upon initial connection.
     */
    private fetchInitialEmails(): void {
        this.imap.openBox('INBOX', false, (err, box) => {
            if (err) {
                console.error('[IMAP] Error opening INBOX:', err);
                return;
            }

            console.log(`[IMAP] INBOX opened for ${this.config.user}. Total messages: ${box.messages.total}`);

            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

            // Format date as DD-MMM-YYYY for IMAP
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const day = thirtyDaysAgo.getDate();
            const month = monthNames[thirtyDaysAgo.getMonth()];
            const year = thirtyDaysAgo.getFullYear();
            const imapDate = `${day < 10 ? '0' + day : day}-${month}-${year}`;

            this.imap.search([['SINCE', imapDate]], (searchErr, results) => {
                if (searchErr) {
                    console.error('[IMAP] Error searching emails:', searchErr);
                    return;
                }

                if (results.length === 0) {
                    console.log('[IMAP] No new emails in the last 30 days.');
                    this.listenForNewEmails();
                    return;
                }

                console.log(`[IMAP] Found ${results.length} emails from the last 30 days. Fetching...`);

                try {
                    const f = this.imap.fetch(results, { bodies: '' });
                    f.on('message', (msg, seqno) => this.handleMessage(msg, seqno));
                    f.once('error', (fetchErr: Error) => {
                        console.error('[IMAP] Fetch error:', fetchErr);
                    });
                    f.once('end', () => {
                        console.log('[IMAP] Finished fetching all initial emails.');
                        this.listenForNewEmails();
                    });
                } catch (e) {
                    console.error('[IMAP] Error fetching emails:', e);
                    this.listenForNewEmails();
                }
            });
        });
    }

    /**
     * Enters IDLE mode to listen for new emails in real-time.
     */
    private listenForNewEmails(): void {
        console.log(`[IMAP] Entering IDLE mode for ${this.config.user}...`);
        // No explicit idle() method; IMAP connection remains open and 'mail' event will fire on new mail.
        // 'mail' event listener is now only added once in connect()
    }

    /**
     * Handles a single message stream from an IMAP fetch operation.
     * @param msg The IMAP message object.
     * @param seqno The sequence number of the message.
     */
    private handleMessage(msg: Imap.ImapMessage, seqno: number): void {
        console.log(`[IMAP] Processing message #${seqno}`);
        msg.on('body', (stream) => {
            simpleParser(stream, (parseErr, parsed) => {
                if (parseErr) {
                    console.error(`[IMAP] Error parsing email #${seqno}:`, parseErr);
                    return;
                }
                // Pass the parsed email to the callback function
                this.onNewMail(parsed, this.config.user);
            });
        });
    }

    /**
     * Closes the IMAP connection.
     */
    public close(): void {
        this.imap.end();
    }
}