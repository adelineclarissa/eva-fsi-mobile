const LLM_URL = process.env.LLM_URL || "https://api.epsindo.ai/fsi/api/v1/chat";
const LLM_API_KEY = process.env.LLM_API_KEY || "eps-v1-j8OlarSGqbbXSnJb5UDw";
const LLM_USER_ID = process.env.LLM_USER_ID || "eva-user";

import {
  checkBalance as bankCheckBalance,
  getAccounts as bankGetAccounts,
} from "./bankApi";

interface LLMRequest {
  message: string;
  conversation_id: string;
  user_id: string;
}

interface ToolCallInfo {
  tool_name: string;
  input: Record<string, unknown>;
  output?: string;
}

interface LLMResponse {
  message: string;
  conversation_id: string;
  tool_calls: ToolCallInfo[];
  guardrail_blocked: boolean;
  pii_blocked: boolean;
  pii_masked: boolean;
}

// Maps sessionId → conversation_id returned by the server
const sessions = new Map<string, string>();

// Maps sessionId → activeAccountId (kept out of LLM context)
const sessionAccounts = new Map<string, string>();

export function setActiveAccount(sessionId: string, accountId: string): void {
  console.log(
    "[setActiveAccount] sessionId:",
    sessionId,
    "accountId:",
    accountId,
  );
  sessionAccounts.set(sessionId, accountId);
}

async function callLLM(
  message: string,
  sessionId: string,
): Promise<LLMResponse> {
  const conversationId = sessions.get(sessionId) ?? sessionId;

  const body: LLMRequest = {
    message,
    conversation_id: conversationId,
    user_id: LLM_USER_ID,
  };

  console.log("=== LLM Request Payload ===");
  console.log(JSON.stringify(body, null, 2));
  console.log("===========================");

  const response = await fetch(LLM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(LLM_API_KEY ? { "X-API-Key": LLM_API_KEY } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as LLMResponse;
  console.log("LLM Response:", JSON.stringify(data, null, 2));

  // Keep the conversation_id the server echoes back
  if (data.conversation_id) {
    sessions.set(sessionId, data.conversation_id);
  }

  return data;
}

/**
 * Send intercepted tool results back to the LLM so it can generate
 * a response based on real banking data (without knowing account IDs).
 */
async function sendToolResultsBack(
  toolResults: ToolCallInfo[],
  sessionId: string,
): Promise<LLMResponse> {
  const conversationId = sessions.get(sessionId) ?? sessionId;

  // Format tool results as a message the LLM can understand
  const resultMessages = toolResults
    .map((tc) => `[Tool Result: ${tc.tool_name}] ${tc.output || "No output"}`)
    .join("\n");

  const body: LLMRequest = {
    message: `Tool execution results:\n${resultMessages}`,
    conversation_id: conversationId,
    user_id: LLM_USER_ID,
  };

  console.log("=== Sending Tool Results Back to LLM ===");
  console.log(JSON.stringify(body, null, 2));
  console.log("=========================================");

  const response = await fetch(LLM_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(LLM_API_KEY ? { "X-API-Key": LLM_API_KEY } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`LLM error ${response.status}: ${text}`);
  }

  const data = (await response.json()) as LLMResponse;
  console.log(
    "LLM Response (after tool results):",
    JSON.stringify(data, null, 2),
  );

  if (data.conversation_id) {
    sessions.set(sessionId, data.conversation_id);
  }

  return data;
}

export interface ChatResponse {
  reply: string;
  toolsUsed: string[];
  sessionId: string;
  toolResults?: Record<string, unknown>[];
}

export async function chat(
  userMessage: string,
  sessionId: string,
): Promise<ChatResponse> {
  const data = await callLLM(userMessage, sessionId);

  if (data.guardrail_blocked || data.pii_blocked) {
    return {
      reply:
        "Maaf, pesan ini tidak dapat diproses karena melanggar kebijakan keamanan.",
      toolsUsed: [],
      sessionId,
    };
  }

  // Intercept tool calls to inject real banking API data
  const interceptedToolCalls = await interceptToolCalls(
    data.tool_calls,
    sessionId,
  );

  // Send intercepted results back to LLM so it generates response with real data
  const finalData = await sendToolResultsBack(interceptedToolCalls, sessionId);

  return {
    reply: finalData.message,
    toolsUsed: interceptedToolCalls.map((tc) => tc.tool_name),
    toolResults: interceptedToolCalls.map((tc) => ({
      tool_name: tc.tool_name,
      input: tc.input,
      output: tc.output,
    })),
    sessionId,
  };
}

export async function streamChat(
  userMessage: string,
  sessionId: string,
  onToken: (token: string) => void,
  onToolUse: (toolName: string) => void,
  onComplete: (toolsUsed: string[]) => void,
  onAccountSelect?: (
    accounts: { index: number; account_name: string; currency: string }[],
  ) => void,
): Promise<void> {
  const data = await callLLM(userMessage, sessionId);

  if (data.guardrail_blocked || data.pii_blocked) {
    const blocked =
      "Maaf, pesan ini tidak dapat diproses karena melanggar kebijakan keamanan.";
    for (const char of blocked) {
      onToken(char);
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
    onComplete([]);
    return;
  }

  // Intercept tool calls to inject real banking API data
  const interceptedToolCalls = await interceptToolCalls(
    data.tool_calls,
    sessionId,
  );

  // Emit tool events if any
  for (const tc of interceptedToolCalls) {
    onToolUse(tc.tool_name);
  }

  // Check if any tool needs account selection
  const needsSelection = interceptedToolCalls.some(
    (tc) => tc.tool_name === "check_balance" && !sessionAccounts.get(sessionId),
  );

  if (needsSelection && onAccountSelect) {
    // Extract accounts from the intercepted output
    for (const tc of interceptedToolCalls) {
      if (tc.tool_name === "check_balance" && tc.output) {
        try {
          const parsed = JSON.parse(tc.output);
          if (parsed.needs_selection && parsed.accounts) {
            onAccountSelect(parsed.accounts);
            onComplete([tc.tool_name]);
            return;
          }
        } catch {
          // Ignore parse errors
        }
      }
    }
  }

  // Send intercepted results back to LLM so it generates response with real data
  const finalData = await sendToolResultsBack(interceptedToolCalls, sessionId);

  // Simulate streaming token by token
  for (const char of finalData.message) {
    onToken(char);
    await new Promise((resolve) => setTimeout(resolve, 8));
  }

  onComplete(interceptedToolCalls.map((tc) => tc.tool_name));
}

export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
  sessionAccounts.delete(sessionId);
}

/**
 * Intercept tool calls that need account context and re-execute with real banking API.
 * This keeps account IDs out of the LLM while still providing accurate data.
 */
async function interceptToolCalls(
  toolCalls: ToolCallInfo[],
  sessionId: string,
): Promise<ToolCallInfo[]> {
  const accountId = sessionAccounts.get(sessionId);
  console.log("=== interceptToolCalls ===");
  console.log("sessionId:", sessionId);
  console.log("accountId:", accountId);
  console.log("toolCalls:", JSON.stringify(toolCalls, null, 2));
  console.log("=========================");

  if (toolCalls.length === 0) return toolCalls;

  return Promise.all(
    toolCalls.map(async (tc) => {
      if (tc.tool_name === "check_balance") {
        // If no active account, fetch all accounts and let LLM ask user to choose
        if (!accountId) {
          console.log(
            "[interceptToolCalls] No active account, fetching all accounts",
          );
          try {
            const accounts = await bankGetAccounts();
            // Return account list WITHOUT account_ids — LLM asks user to pick
            const accountOptions = accounts.map((a, i) => ({
              index: i + 1,
              account_name:
                a.account_name ||
                `Account ****${String(a.card_number).slice(-4)}`,
              currency: a.currency || "IDR",
            }));
            return {
              ...tc,
              output: JSON.stringify({
                source: "bank-api",
                needs_selection: true,
                accounts: accountOptions,
                message: `Found ${accountOptions.length} account(s). Ask user to select one.`,
              }),
            };
          } catch (error) {
            console.warn("Bank API getAccounts failed:", error);
            return tc;
          }
        }

        // Active account exists — check balance directly
        console.log(
          "[interceptToolCalls] Calling bankCheckBalance with accountId:",
          accountId,
        );
        try {
          const balance = await bankCheckBalance(accountId);
          console.log(
            "[interceptToolCalls] Balance response:",
            JSON.stringify(balance, null, 2),
          );
          return {
            ...tc,
            output: JSON.stringify({
              source: "bank-api",
              account_name: balance.account_name || "Account",
              balance: balance.balance,
              currency: balance.currency,
              formatted: `${balance.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })} ${balance.currency}`,
            }),
          };
        } catch (error) {
          console.warn("Bank API checkBalance failed:", error);
          return tc;
        }
      }
      return tc;
    }),
  );
}
