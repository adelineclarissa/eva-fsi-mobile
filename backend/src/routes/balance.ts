import { Router, Request, Response } from 'express';
import { mutableAccounts, mutableTransactions, beneficiaries, userProfile } from '../data/mockData';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  return res.json({
    user: userProfile,
    accounts: mutableAccounts,
    totalBalance: mutableAccounts.reduce((sum, a) => sum + a.balance, 0),
  });
});

router.get('/accounts', (_req: Request, res: Response) => {
  return res.json({ accounts: mutableAccounts });
});

router.get('/transactions', (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  return res.json({
    transactions: mutableTransactions.slice(0, limit),
    total: mutableTransactions.length,
  });
});

router.get('/beneficiaries', (_req: Request, res: Response) => {
  return res.json({ beneficiaries });
});

export default router;
