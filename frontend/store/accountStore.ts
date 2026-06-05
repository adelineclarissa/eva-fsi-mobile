import { create } from "zustand";
import { Account, Transaction, Beneficiary, UserProfile } from "../types";
import { MOCK_TRANSACTIONS, MOCK_BENEFICIARIES } from "../constants/mockData";
import { fetchUserAccounts, fetchUserProfile, RawAccount } from "../services/bankApi";

const ACCOUNT_COLORS = ["#1B3D7A", "#10B981", "#8B5CF6", "#F59E0B"];

interface AccountStore {
  user: UserProfile | null;
  accounts: Account[];
  transactions: Transaction[];
  beneficiaries: Beneficiary[];
  activeAccountId: string | null;
  isLoading: boolean;
  lastRefreshed: string | null;

  fetchUserData: () => Promise<void>;
  setAccounts: (accounts: Account[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  updateBalance: (accountId: string, newBalance: number) => void;
  addTransaction: (transaction: Transaction) => void;
  getTotalBalance: () => number;
  getAccount: (type: "checking" | "savings") => Account | undefined;
  getActiveAccount: () => Account | undefined;
  setActiveAccount: (id: string) => void;
  setLoading: (loading: boolean) => void;
}

function mapRawAccount(raw: RawAccount, index: number): Account {
  const rawNumber = String(raw.card_number ?? raw.account_number ?? "");
  const masked = rawNumber.length > 4 ? `****${rawNumber.slice(-4)}` : rawNumber;
  const type = raw.account_type === "savings" ? "savings" : "checking";
  return {
    id: raw.account_id,
    type,
    name: (raw.account_name as string) ?? (type === "savings" ? "Tabungan" : "Tabungan Utama"),
    balance: raw.balance ?? 0,
    currency: raw.currency ?? "IDR",
    accountNumber: masked,
    rawAccountNumber: rawNumber,
    color: ACCOUNT_COLORS[index % ACCOUNT_COLORS.length],
  };
}

export const useAccountStore = create<AccountStore>((set, get) => ({
  user: null,
  accounts: [],
  transactions: MOCK_TRANSACTIONS,
  beneficiaries: MOCK_BENEFICIARIES,
  activeAccountId: null,
  isLoading: false,
  lastRefreshed: null,

  fetchUserData: async () => {
    set({ isLoading: true });
    try {
      const [accountsData, profileData] = await Promise.all([
        fetchUserAccounts(),
        fetchUserProfile(),
      ]);

      const rawAccounts = Array.isArray(accountsData)
        ? (accountsData as RawAccount[])
        : (accountsData.accounts ?? []);

      const accounts = rawAccounts.map((a, i) => mapRawAccount(a, i));

      const user: UserProfile = {
        id: (profileData.user_id as string) ?? "",
        name: (profileData.name as string) ?? "",
        email: (profileData.email as string) ?? "",
        phone: (profileData.phone as string) ?? "",
        tier: (profileData.tier as UserProfile["tier"]) ?? "standard",
        joinDate: (profileData.join_date as string) ?? new Date().toISOString(),
      };

      set({
        accounts,
        user,
        activeAccountId: accounts[0]?.id ?? null,
        lastRefreshed: new Date().toISOString(),
      });
    } finally {
      set({ isLoading: false });
    }
  },

  setAccounts: (accounts) => set({ accounts }),
  setTransactions: (transactions) => set({ transactions }),

  updateBalance: (accountId, newBalance) =>
    set((state) => ({
      accounts: state.accounts.map((acc) =>
        acc.id === accountId ? { ...acc, balance: newBalance } : acc,
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
}));
