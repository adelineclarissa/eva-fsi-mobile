const BANK_API_BASE =
  process.env.BANK_API_BASE || "https://api.epsindo.ai/bank-api";
const BANK_API_TOKEN = process.env.BANK_API_TOKEN || "mytoken";
const BANK_USER_ID = process.env.BANK_USER_ID || "USR001";

interface BalanceResponse {
  account_id: string;
  account_name?: string;
  balance: number;
  currency: string;
  [key: string]: unknown;
}

interface AccountResponse {
  account_id: string;
  card_number: string;
  currency: string;
  balance: number;
  created_at?: string;
  [key: string]: unknown;
}

interface BeneficiaryResponse {
  id: string;
  name: string;
  account_number?: string;
  bank_name?: string;
  [key: string]: unknown;
}

interface ExchangeRateResponse {
  from_currency: string;
  to_currency: string;
  rate: number;
  [key: string]: unknown;
}

interface LoginResponse {
  access_token?: string;
  token?: string;
  user_id?: string;
  name?: string;
  email?: string;
  phone?: string;
  [key: string]: unknown;
}

interface UserProfileResponse {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  [key: string]: unknown;
}

// Generic API call with bearer token — unwraps {"success": true, "data": ...} wrapper
async function bankApiCall<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BANK_API_BASE}${path}`;

  // Create AbortController with 5s timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BANK_API_TOKEN}`,
        ...options?.headers,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Bank API error ${response.status}: ${text}`);
    }

    const json = (await response.json()) as {
      success: boolean;
      data: T;
      message: string;
      response_code: string;
    };

    if (!json.success) {
      throw new Error(`Bank API error: ${json.message}`);
    }

    return json.data;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Check balance for a specific account
 */
export async function checkBalance(
  accountId: string,
): Promise<BalanceResponse> {
  return bankApiCall<BalanceResponse>(
    `/api/customer/ibridge/v2/account/balance/${accountId}`,
  );
}

/**
 * Get all accounts for the user
 */
export async function getAccounts(): Promise<AccountResponse[]> {
  return bankApiCall<AccountResponse[]>(
    `/api/customer/user/${BANK_USER_ID}/accounts`,
  );
}

/**
 * Get all beneficiaries for the user
 */
export async function getBeneficiaries(): Promise<BeneficiaryResponse[]> {
  return bankApiCall<BeneficiaryResponse[]>(
    `/api/customer/user/${BANK_USER_ID}/beneficiaries`,
  );
}

/**
 * Search beneficiaries by query
 */
export async function searchBeneficiaries(
  query: string,
): Promise<BeneficiaryResponse[]> {
  return bankApiCall<BeneficiaryResponse[]>(
    `/api/customer/user/${BANK_USER_ID}/beneficiaries/search?q=${encodeURIComponent(query)}`,
  );
}

/**
 * Get exchange rates
 */
export async function getExchangeRate(
  fromCurrency: string,
  toCurrency: string,
  amount?: number,
): Promise<ExchangeRateResponse> {
  return bankApiCall<ExchangeRateResponse>(
    `/api/customer/ibridge/v1/forex/exchange-rate`,
    {
      method: "POST",
      body: JSON.stringify({
        from_currency: fromCurrency,
        to_currency: toCurrency,
        ...(amount ? { amount } : {}),
      }),
    },
  );
}

/**
 * Get user profile
 */
export async function getUser(): Promise<Record<string, unknown>> {
  return bankApiCall<Record<string, unknown>>(
    `/api/customer/user/${BANK_USER_ID}`,
  );
}
