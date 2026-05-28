import { Router, Request, Response } from 'express';
import { transferFunds } from '../services/tools';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { toBeneficiaryName, amount, currency, fromAccount, note } = req.body;

    if (!toBeneficiaryName || !amount || !fromAccount) {
      return res.status(400).json({
        success: false,
        error: 'toBeneficiaryName, amount, and fromAccount are required',
      });
    }

    const result = await transferFunds(
      toBeneficiaryName,
      parseFloat(amount),
      currency || 'USD',
      fromAccount
    );

    const parsed = JSON.parse(result);
    return res.json(parsed);
  } catch (error) {
    console.error('Transfer error:', error);
    return res.status(500).json({
      success: false,
      error: 'Transfer failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
