import { create } from 'zustand';
import { Account, Transaction, Beneficiary } from '../types';
import { MOCK_ACCOUNTS, MOCK_TRANSACTIONS, MOCK_BENEFICIARIES } from '../constants/mockData';

interface AccountStore {
  accounts: Account[];
  transactions: Transaction[];
  beneficiaries: Beneficiary[];
  isLoading: boolean;
  lastRefreshed: string | null;

  // Actions
  setAccounts: (accounts: Account[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  updateBalance: (accountId: string, newBalance: number) => void;
  addTransaction: (transaction: Transaction) => void;
  getTotalBalance: () => number;
  getAccount: (type: 'checking' | 'savings') => Account | undefined;
  setLoading: (loading: boolean) => void;
  syncFromBackend: (data: {
    accounts?: Account[];
    transactions?: Transaction[];
    beneficiaries?: Beneficiary[];
  }) => void;
  refresh: () => Promise<void>;
}

export const useAccountStore = create<AccountStore>((set, get) => ({
  accounts: MOCK_ACCOUNTS,
  transactions: MOCK_TRANSACTIONS,
  beneficiaries: MOCK_BENEFICIARIES,
  isLoading: false,
  lastRefreshed: null,

  setAccounts: (accounts) => set({ accounts }),
  setTransactions: (transactions) => set({ transactions }),

  updateBalance: (accountId, newBalance) =>
    set((state) => ({
      accounts: state.accounts.map((acc) =>
        acc.id === accountId ? { ...acc, balance: newBalance } : acc
      ),
    })),

  addTransaction: (transaction) =>
    set((state) => ({
      transactions: [transaction, ...state.transactions],
    })),

  getTotalBalance: () =>
    get().accounts.reduce((sum, acc) => sum + acc.balance, 0),

  getAccount: (type) => get().accounts.find((acc) => acc.type === type),

  setLoading: (isLoading) => set({ isLoading }),

  syncFromBackend: ({ accounts, transactions, beneficiaries }) =>
    set((state) => ({
      accounts: accounts || state.accounts,
      transactions: transactions || state.transactions,
      beneficiaries: beneficiaries || state.beneficiaries,
      lastRefreshed: new Date().toISOString(),
    })),

  refresh: async () => {
    const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';
    set({ isLoading: true });
    try {
      const [balanceRes, txRes] = await Promise.all([
        fetch(`${API_URL}/balance`),
        fetch(`${API_URL}/balance/transactions?limit=20`),
      ]);

      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        const txData = txRes.ok ? await txRes.json() : null;

        set({
          accounts: balanceData.accounts || get().accounts,
          transactions: txData?.transactions || get().transactions,
          lastRefreshed: new Date().toISOString(),
        });
      }
    } catch {
      // Keep mock data on network error
    } finally {
      set({ isLoading: false });
    }
  },
}));
