import express from 'express';
import { env } from './config/env.js';
import { twilioRouter } from './webhooks/twilio.js';
import { contactsRouter } from './contacts/contacts-router.js';
import { campaignsRouter } from './campaigns/campaigns-router.js';
import { usersRouter } from './users/users-router.js';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', project: 'naty', env: env.NODE_ENV });
});

app.use('/webhook/twilio', twilioRouter);
app.use('/contacts', contactsRouter);
app.use('/campaigns', campaignsRouter);
app.use('/users', usersRouter);

app.listen(env.PORT, () => {
  console.log(`✓ Naty API running on port ${env.PORT} [${env.NODE_ENV}]`);
});
