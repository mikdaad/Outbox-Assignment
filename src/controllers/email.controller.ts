// src/controllers/email.controller.ts

import { Request, Response } from 'express';
import { ElasticsearchService } from '../services/elasticsearch.service.js';

const elasticsearchService = new ElasticsearchService();

export const searchEmailsController = async (req: Request, res: Response) => {
    try {
        const { q, accountId, category } = req.query;

        const results = await elasticsearchService.searchEmails(
            q as string,
            accountId as string,
            category as string
        );

        res.status(200).json(results);
    } catch (error) {
        console.error('[API] Error in searchEmailsController:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
