import express from 'express';
import { env } from './config/env.js';
import { metaRouter } from './webhooks/meta.js';
import { contactsRouter } from './contacts/contacts-router.js';
import { campaignsRouter } from './campaigns/campaigns-router.js';
import { usersRouter } from './users/users-router.js';
import { messagesRouter } from './messaging/messages-router.js';
import { templatesRouter } from './templates/templates-router.js';
import { eventsRouter } from './events/events-router.js';
import { requireAuth } from './middleware/auth.js';
import { startScheduler } from './campaigns/scheduler.js';

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', env.DASHBOARD_URL);
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', project: 'naty', env: env.NODE_ENV });
});

app.use('/webhook/meta', metaRouter);
app.use('/contacts', requireAuth, contactsRouter);
app.use('/campaigns', requireAuth, campaignsRouter);
app.use('/users', requireAuth, usersRouter);
app.use('/messages', requireAuth, messagesRouter);
app.use('/templates', requireAuth, templatesRouter);
app.use('/events', requireAuth, eventsRouter);

app.listen(env.PORT, () => {
  console.log(`✓ Naty API running on port ${env.PORT} [${env.NODE_ENV}]`);
  startScheduler();
});
