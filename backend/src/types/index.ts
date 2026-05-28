export interface Account {
  id: string;
  type: 'checking' | 'savings';
  name: string;
  balance: number;
  currency: string;
  accountNumber: string;
  color: string;
}

export interface Transaction {
  id: string;
  title: string;
  subtitle?: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  date: string;
  accountId: string;
  status: 'completed' | 'pending' | 'failed';
  icon?: string;
}

export interface Beneficiary {
  id: string;
  name: string;
  accountNumber: string;
  bankName?: string;
  avatar?: string;
  initials: string;
  color: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string;
  tier: 'standard' | 'premium' | 'elite';
  joinDate: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
}

export interface ToolCall {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResult {
  toolUseId: string;
  content: string;
  isError?: boolean;
}

export interface TransferRequest {
  toBeneficiaryId: string;
  amount: number;
  currency: string;
  fromAccount: 'checking' | 'savings';
  note?: string;
}

export interface TransferResponse {
  success: boolean;
  transactionId?: string;
  message: string;
  newBalance?: number;
}

export interface ExchangeRateResponse {
  from: string;
  to: string;
  rate: number;
  convertedAmount?: number;
  originalAmount?: number;
  timestamp: string;
}

export interface DocumentChunk {
  id: string;
  documentId: string;
  documentName: string;
  content: string;
  index: number;
  score?: number;
}

export interface VectorDocument {
  id: string;
  name: string;
  chunks: DocumentChunk[];
  uploadedAt: string;
}
