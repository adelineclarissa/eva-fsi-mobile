import { Router, Request, Response } from 'express';
import { getExchangeRate } from '../services/tools';

const router = Router();

router.get('/', async (req: Request, res: Response) => {
  try {
    const { from = 'USD', to, amount } = req.query;

    if (!to) {
      return res.status(400).json({ error: 'Target currency (to) is required' });
    }

    const result = await getExchangeRate(
      from as string,
      to as string,
      amount ? parseFloat(amount as string) : undefined
    );

    return res.json(JSON.parse(result));
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch exchange rate' });
  }
});

router.get('/popular', async (_req: Request, res: Response) => {
  const currencies = ['EUR', 'GBP', 'JPY', 'SGD', 'IDR', 'AUD', 'CAD'];
  try {
    const rates = await Promise.all(
      currencies.map(async (currency) => {
        const result = await getExchangeRate('USD', currency);
        return { currency, ...JSON.parse(result) };
      })
    );
    return res.json({ base: 'USD', rates });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch rates' });
  }
});

export default router;
