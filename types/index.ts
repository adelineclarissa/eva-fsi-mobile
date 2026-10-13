export interface Account {
  id: string;
  type: "checking" | "savings";
  name: string;
  balance: number;
  currency: string;
  accountNumber: string; // masked, for display only e.g. ****4821
  rawAccountNumber: string; // full numeric account number
  color?: string;
}

export interface Transaction {
  id: string;
  title: string;
  subtitle?: string;
  amount: number;
  type: "credit" | "debit";
  category: string;
  date: string;
  accountId: string;
  status: "completed" | "pending" | "failed";
  icon?: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  accountNumber: string;
  bankName?: string;
  initials: string;
  color: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: "standard" | "premium" | "elite";
  joinDate: string;
}

export type MessageRole = "user" | "assistant" | "system";

export interface BeneficiarySelectionData {
  keyword: string;
  matches: Beneficiary[];
}

export interface BeneficiarySelectionResult {
  selectedBeneficiary: Beneficiary;
}

export interface ActionPayload {
  type: "beneficiary_selection";
  data: BeneficiarySelectionData;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: string;
  toolsUsed?: string[];
  isStreaming?: boolean;
  actionPayload?: ActionPayload;
  selectionResult?: BeneficiarySelectionResult;
}

export interface TransferPayload {
  toBeneficiaryName: string;
  amount: number;
  currency: string;
  fromAccount: "checking" | "savings";
  note?: string;
}

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  rateFormatted: string;
  source: "live" | "cached";
  timestamp: string;
}

export type QuickActionType =
  | "transfer"
  | "pay"
  | "topup"
  | "exchange"
  | "savings"
  | "cards"
  | "investment"
  | "more";

export interface QuickAction {
  type: QuickActionType;
  label: string;
  icon: string;
  gradient: [string, string];
}
