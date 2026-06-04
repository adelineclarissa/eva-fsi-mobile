import { create } from 'zustand';
import { Account, Transaction, Beneficiary, UserProfile } from '../types';
import { MOCK_ACCOUNTS, MOCK_TRANSACTIONS, MOCK_BENEFICIARIES } from '../constants/mockData';

const ACCOUNT_COLORS = ['#1B3D7A', '#10B981', '#8B5CF6', '#F59E0B'];

interface AccountStore {
  user: UserProfile | null;
  accounts: Account[];
  transactions: Transaction[];
  beneficiaries: Beneficiary[];
  activeAccountId: string | null;
  isLoading: boolean;
  lastRefreshed: string | null;

  setAccounts: (accounts: Account[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  updateBalance: (accountId: string, newBalance: number) => void;
  addTransaction: (transaction: Transaction) => void;
  getTotalBalance: () => number;
  getAccount: (type: 'checking' | 'savings') => Account | undefined;
  getActiveAccount: () => Account | undefined;
  setActiveAccount: (id: string) => void;
  setLoading: (loading: boolean) => void;
  syncFromBackend: (data: {
    user?: UserProfile;
    accounts?: Account[];
    transactions?: Transaction[];
    beneficiaries?: Beneficiary[];
  }) => void;
  refresh: () => Promise<void>;
}

export const useAccountStore = create<AccountStore>((set, get) => ({
  user: null,
  accounts: MOCK_ACCOUNTS,
  transactions: MOCK_TRANSACTIONS,
  beneficiaries: MOCK_BENEFICIARIES,
  activeAccountId: MOCK_ACCOUNTS[0]?.id ?? null,
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

  getActiveAccount: () => {
    const { accounts, activeAccountId } = get();
    return accounts.find((a) => a.id === activeAccountId) ?? accounts[0];
  },

  setActiveAccount: (id) => set({ activeAccountId: id }),

  setLoading: (isLoading) => set({ isLoading }),

  syncFromBackend: ({ user, accounts, transactions, beneficiaries }) =>
    set((state) => ({
      user: user ?? state.user,
      accounts: accounts ?? state.accounts,
      transactions: transactions ?? state.transactions,
      beneficiaries: beneficiaries ?? state.beneficiaries,
      activeAccountId:
        state.activeAccountId && accounts?.find((a) => a.id === state.activeAccountId)
          ? state.activeAccountId
          : accounts?.[0]?.id ?? state.activeAccountId,
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

        const accounts: Account[] = (balanceData.accounts ?? []).map(
          (a: Account, i: number) => ({
            ...a,
            color: a.color ?? ACCOUNT_COLORS[i % ACCOUNT_COLORS.length],
          })
        );

        set((state) => ({
          user: balanceData.user ?? state.user,
          accounts: accounts.length > 0 ? accounts : state.accounts,
          transactions: txData?.transactions ?? state.transactions,
          activeAccountId:
            state.activeAccountId && accounts.find((a) => a.id === state.activeAccountId)
              ? state.activeAccountId
              : accounts[0]?.id ?? state.activeAccountId,
          lastRefreshed: new Date().toISOString(),
        }));
      }
    } catch {
      // Keep existing data on network error
    } finally {
      set({ isLoading: false });
    }
  },
}));
