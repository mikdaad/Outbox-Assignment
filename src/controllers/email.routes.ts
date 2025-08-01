// src/routes/email.routes.ts

import { Router } from 'express';
import { searchEmailsController } from '../controllers/email.controller.js';

const router = Router();

router.get('/emails', searchEmailsController);

export default router;
