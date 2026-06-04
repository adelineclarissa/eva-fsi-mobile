import { Router, Request, Response } from "express";
import {
  mutableAccounts,
  mutableTransactions,
  beneficiaries,
  userProfile,
} from "../data/mockData";
import {
  getAccounts,
  checkBalance,
  getBeneficiaries,
  getUser,
} from "../services/bankApi";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    // Try Bank API first
    const [accounts, bankUser] = await Promise.all([getAccounts(), getUser()]);
    const totalBalance = accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);

    return res.json({
      source: "bank-api",
      user: {
        id: bankUser.user_id || "USR001",
        name: bankUser.name || "User",
        email: bankUser.email || "",
        phone: bankUser.phone || "",
        tier: "premium" as const,
        joinDate: new Date().toISOString().split("T")[0],
      },
      accounts: accounts.map((a) => ({
        id: a.account_id,
        type: "checking",
        name: `Account ****${a.card_number?.slice(-4) || a.account_id?.slice(-4)}`,
        balance: a.balance ?? 0,
        currency: a.currency || "IDR",
        accountNumber: `****${a.card_number?.slice(-4) || a.account_id?.slice(-4)}`,
      })),
      totalBalance,
    });
  } catch (error) {
    console.warn("Bank API failed, falling back to mock data:", error);
    // Fall back to mock data
    return res.json({
      source: "mock",
      user: userProfile,
      accounts: mutableAccounts,
      totalBalance: mutableAccounts.reduce((sum, a) => sum + a.balance, 0),
    });
  }
});

router.get("/accounts", async (_req: Request, res: Response) => {
  try {
    const accounts = await getAccounts();
    return res.json({
      source: "bank-api",
      accounts: accounts.map((a) => ({
        id: a.account_id,
        type: "checking",
        name: `Account ****${a.card_number?.slice(-4) || a.account_id?.slice(-4)}`,
        balance: a.balance ?? 0,
        currency: a.currency || "IDR",
        accountNumber: `****${a.card_number?.slice(-4) || a.account_id?.slice(-4)}`,
      })),
    });
  } catch (error) {
    console.warn("Bank API failed, falling back to mock data:", error);
    return res.json({
      source: "mock",
      accounts: mutableAccounts,
    });
  }
});

router.get("/transactions", (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  return res.json({
    transactions: mutableTransactions.slice(0, limit),
    total: mutableTransactions.length,
  });
});

router.get("/beneficiaries", async (_req: Request, res: Response) => {
  try {
    const benes = await getBeneficiaries();
    return res.json({
      source: "bank-api",
      beneficiaries: benes.map((b) => ({
        id: b.id,
        name: b.name,
        accountNumber: b.account_number || "",
        bankName: b.bank_name,
      })),
    });
  } catch (error) {
    console.warn("Bank API failed, falling back to mock data:", error);
    return res.json({
      source: "mock",
      beneficiaries,
    });
  }
});

export default router;
