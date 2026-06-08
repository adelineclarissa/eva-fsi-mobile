const BANK_API_URL =
  process.env.EXPO_PUBLIC_BANK_API_URL || "https://api.epsindo.ai/bank-api";
const BANK_API_TOKEN = process.env.EXPO_PUBLIC_BANK_API_TOKEN || "mytoken";
const USER_ID = process.env.EXPO_PUBLIC_FSI_USER_ID || "USR001";

export interface RawAccount {
  account_id: string;
  card_number?: string;
  account_number?: string;
  account_name?: string;
  currency: string;
  balance: number;
  account_type?: string;
  [key: string]: unknown;
}

export interface RawUserAccounts {
  user_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  tier?: string;
  join_date?: string;
  accounts?: RawAccount[];
  [key: string]: unknown;
}

async function bankFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${BANK_API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${BANK_API_TOKEN}`,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Bank API ${res.status}: ${text}`);
  }

  const json = await res.json();
  if (json.success === false) {
    throw new Error(`Bank API error: ${json.message}`);
  }

  return (json.data ?? json) as T;
}

export interface RawUserProfile {
  user_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  tier?: string;
  join_date?: string;
  [key: string]: unknown;
}

export function fetchUserAccounts(): Promise<RawUserAccounts> {
  return bankFetch<RawUserAccounts>(`/api/customer/user/${USER_ID}/accounts`);
}

export function fetchUserProfile(): Promise<RawUserProfile> {
  return bankFetch<RawUserProfile>(`/api/customer/user/${USER_ID}`);
}
