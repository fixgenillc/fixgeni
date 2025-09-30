import { Router } from 'express';
export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.type('text/plain').send('ok');
});
