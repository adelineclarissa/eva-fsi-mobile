import {
  mutableAccounts,
  mutableTransactions,
  beneficiaries,
} from "../data/mockData";
import { searchDocuments, hasDocuments } from "./rag";
import { v4 as uuidv4 } from "uuid";
import {
  checkBalance as bankCheckBalance,
  getAccounts as bankGetAccounts,
} from "./bankApi";

const EXCHANGE_RATE_API_KEY = process.env.EXCHANGE_RATE_API_KEY || "";
const EXCHANGE_FALLBACK_RATES: Record<string, number> = {
  USD: 1,
  EUR: 0.92,
  GBP: 0.79,
  JPY: 149.5,
  SGD: 1.34,
  AUD: 1.53,
  CAD: 1.36,
  IDR: 16200,
  CNY: 7.24,
  CHF: 0.9,
  INR: 83.5,
  MYR: 4.72,
  THB: 35.6,
  KRW: 1320,
  HKD: 7.82,
};

export async function checkBalance(
  accountType: "checking" | "savings" | "all",
): Promise<string> {
  try {
    // Try Bank API first, fall back to mock data
    const accounts = await bankGetAccounts();

    if (accountType === "all" || !accountType) {
      const total = accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);
      return JSON.stringify({
        source: "bank-api",
        accounts: accounts.map((a) => ({
          account_id: a.account_id,
          account_name: a.account_name || a.account_type || "Account",
          balance: a.balance ?? 0,
          currency: a.currency || "USD",
          formatted: `$${(a.balance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
        })),
        total,
        totalFormatted: `$${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      });
    }

    // Bank API returns all accounts - no type filter needed
    const total = accounts.reduce((sum, a) => sum + (a.balance ?? 0), 0);
    return JSON.stringify({
      source: "bank-api",
      accounts: accounts.map((a) => ({
        account_id: a.account_id,
        account_name: `Account ****${String(a.card_number).slice(-4)}`,
        balance: a.balance ?? 0,
        currency: a.currency || "IDR",
        formatted: `$${(a.balance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      })),
      total,
      totalFormatted: `$${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    });
  } catch (error) {
    console.warn(
      "Bank API checkBalance failed, falling back to mock data:",
      error,
    );
    return checkBalanceFallback(accountType);
  }
}

function checkBalanceFallback(
  accountType: "checking" | "savings" | "all",
): string {
  const checking = mutableAccounts.find((a) => a.type === "checking");
  const savings = mutableAccounts.find((a) => a.type === "savings");

  if (accountType === "checking" && checking) {
    return JSON.stringify({
      source: "mock",
      account: "Checking Account",
      accountNumber: checking.accountNumber,
      balance: checking.balance,
      currency: checking.currency,
      formatted: `$${checking.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    });
  }

  if (accountType === "savings" && savings) {
    return JSON.stringify({
      source: "mock",
      account: "Savings Account",
      accountNumber: savings.accountNumber,
      balance: savings.balance,
      currency: savings.currency,
      formatted: `$${savings.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    });
  }

  const total = (checking?.balance ?? 0) + (savings?.balance ?? 0);
  return JSON.stringify({
    source: "mock",
    accounts: [
      {
        type: "checking",
        name: "Checking Account",
        balance: checking?.balance ?? 0,
        formatted: `$${(checking?.balance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      },
      {
        type: "savings",
        name: "Savings Account",
        balance: savings?.balance ?? 0,
        formatted: `$${(savings?.balance ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      },
    ],
    total: total,
    totalFormatted: `$${total.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
  });
}

export async function transferFunds(
  toBeneficiaryName: string,
  amount: number,
  currency: string,
  fromAccount: "checking" | "savings",
): Promise<string> {
  const beneficiary = beneficiaries.find((b) =>
    b.name.toLowerCase().includes(toBeneficiaryName.toLowerCase()),
  );

  if (!beneficiary) {
    const names = beneficiaries.map((b) => b.name).join(", ");
    return JSON.stringify({
      success: false,
      error: `Beneficiary "${toBeneficiaryName}" not found. Available: ${names}`,
    });
  }

  const account = mutableAccounts.find((a) => a.type === fromAccount);
  if (!account) {
    return JSON.stringify({
      success: false,
      error: "Source account not found",
    });
  }

  if (account.balance < amount) {
    return JSON.stringify({
      success: false,
      error: `Insufficient funds. Available balance: $${account.balance.toFixed(2)}`,
    });
  }

  // Execute transfer
  account.balance -= amount;

  const transaction = {
    id: `tx_${uuidv4().slice(0, 8)}`,
    title: `Transfer to ${beneficiary.name}`,
    subtitle: "AI-Initiated Transfer",
    amount,
    type: "debit" as const,
    category: "transfer",
    date: new Date().toISOString(),
    accountId: account.id,
    status: "completed" as const,
    icon: "send",
  };

  mutableTransactions.unshift(transaction);

  return JSON.stringify({
    success: true,
    transactionId: transaction.id,
    message: `Successfully transferred $${amount.toFixed(2)} to ${beneficiary.name}`,
    recipient: beneficiary.name,
    recipientAccount: beneficiary.accountNumber,
    newBalance: account.balance,
    newBalanceFormatted: `$${account.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
    timestamp: transaction.date,
  });
}

export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  amount?: number,
): Promise<string> {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();

  try {
    let rate: number;

    if (EXCHANGE_RATE_API_KEY) {
      const response = await fetch(
        `https://v6.exchangerate-api.com/v6/${EXCHANGE_RATE_API_KEY}/pair/${from}/${to}`,
      );
      if (response.ok) {
        const data = (await response.json()) as { conversion_rate: number };
        rate = data.conversion_rate;
      } else {
        rate = getApproximateRate(from, to);
      }
    } else {
      rate = getApproximateRate(from, to);
    }

    const result: Record<string, unknown> = {
      from,
      to,
      rate,
      rateFormatted: rate >= 1 ? rate.toFixed(4) : rate.toFixed(6),
      source: EXCHANGE_RATE_API_KEY ? "live" : "cached",
      timestamp: new Date().toISOString(),
    };

    if (amount !== undefined && !isNaN(amount)) {
      const converted = amount * rate;
      result.originalAmount = amount;
      result.convertedAmount = converted;
      result.convertedFormatted = converted.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
      result.summary = `${amount} ${from} = ${result.convertedFormatted} ${to}`;
    }

    return JSON.stringify(result);
  } catch (error) {
    return JSON.stringify({ error: "Failed to fetch exchange rate", from, to });
  }
}

function getApproximateRate(from: string, to: string): number {
  const fromRate = EXCHANGE_FALLBACK_RATES[from] ?? 1;
  const toRate = EXCHANGE_FALLBACK_RATES[to] ?? 1;
  return toRate / fromRate;
}

export async function searchDocumentsWrapper(query: string): Promise<string> {
  if (!hasDocuments()) {
    return JSON.stringify({
      found: false,
      message:
        "No documents have been uploaded yet. Please upload a PDF document first.",
    });
  }

  const chunks = await searchDocuments(query);

  if (chunks.length === 0) {
    return JSON.stringify({
      found: false,
      message: "No relevant information found in uploaded documents.",
    });
  }

  return JSON.stringify({
    found: true,
    results: chunks.map((c) => ({
      document: c.documentName,
      content: c.content,
      relevanceScore: c.score,
    })),
    context: chunks.map((c) => c.content).join("\n\n---\n\n"),
  });
}

export async function getTransactionHistory(limit = 10): Promise<string> {
  const recent = mutableTransactions.slice(0, limit);
  return JSON.stringify({
    transactions: recent.map((t) => ({
      id: t.id,
      title: t.title,
      subtitle: t.subtitle,
      amount: t.amount,
      type: t.type,
      category: t.category,
      date: t.date,
      status: t.status,
      formattedAmount: `${t.type === "debit" ? "-" : "+"}$${t.amount.toFixed(2)}`,
    })),
    count: recent.length,
  });
}

export async function getBeneficiaries(): Promise<string> {
  return JSON.stringify({
    beneficiaries: beneficiaries.map((b) => ({
      id: b.id,
      name: b.name,
      accountNumber: b.accountNumber,
      bankName: b.bankName,
    })),
    count: beneficiaries.length,
  });
}
