const FSI_API_URL =
  process.env.EXPO_PUBLIC_FSI_API_URL ||
  "https://api.epsindo.ai/fsi/api/v1/chat";
const FSI_API_KEY = process.env.EXPO_PUBLIC_FSI_API_KEY || "";
const FSI_USER_ID = process.env.EXPO_PUBLIC_FSI_USER_ID || "";

function maskKey(key: string): string {
  if (!key) return "(empty)";
  return `${key.slice(0, 6)}…${key.slice(-4)} (len ${key.length})`;
}

console.log("[FSI] config:", {
  url: FSI_API_URL,
  urlFromEnv: !!process.env.EXPO_PUBLIC_FSI_API_URL,
  apiKey: maskKey(FSI_API_KEY),
  userId: FSI_USER_ID || "(empty)",
});

export interface ToolCallInfo {
  tool_name: string;
  arguments: Record<string, unknown>;
}

export interface LlmActionPayload {
  action: string;
  data: Record<string, unknown>;
}

export interface ChatApiResponse {
  reply: string;
  toolsUsed: string[];
  toolCalls: ToolCallInfo[];
  actionPayload: LlmActionPayload | null;
  conversationId: string;
  timestamp: string;
}

function tryParseActionPayload(text: string): LlmActionPayload | null {
  if (!text) return null;
  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && parsed.action && parsed.data) {
      return {
        action: String(parsed.action),
        data: parsed.data as Record<string, unknown>,
      };
    }
  } catch {
    // Not JSON — fall through
  }
  return null;
}

async function postChat(
  label: string,
  payload: Record<string, unknown>,
): Promise<ChatApiResponse> {
  const startedAt = Date.now();
  console.log(`[FSI] ${label} → POST ${FSI_API_URL}`, {
    apiKey: maskKey(FSI_API_KEY),
    payload,
  });

  let response: Response;
  try {
    response = await fetch(FSI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(FSI_API_KEY ? { "X-API-Key": FSI_API_KEY } : {}),
      },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    // fetch only rejects on network-level failures (DNS, TLS, offline, CORS)
    console.error(
      `[FSI] ${label} ✗ network error after ${Date.now() - startedAt}ms:`,
      err instanceof Error ? `${err.name}: ${err.message}` : err,
    );
    throw err;
  }

  const elapsed = Date.now() - startedAt;
  const rawBody = await response.text();
  console.log(`[FSI] ${label} ← HTTP ${response.status} in ${elapsed}ms`, {
    contentType: response.headers.get("content-type"),
  });

  if (!response.ok) {
    console.error(`[FSI] ${label} ✗ HTTP ${response.status} in ${elapsed}ms`, {
      errorBody: rawBody.slice(0, 1000),
      request: payload,
      retryWithCurl: `curl -X POST '${FSI_API_URL}' -H 'Content-Type: application/json' -H 'X-API-Key: <key>' -d '${JSON.stringify(payload).replace(/'/g, "'\\''")}'`,
    });
    let message = `FSI request failed: ${response.status}`;
    try {
      const error = JSON.parse(rawBody);
      message = error.error || error.detail || message;
    } catch {
      // Non-JSON error body — keep status message
    }
    throw new Error(message);
  }

  let data: any;
  try {
    data = JSON.parse(rawBody);
  } catch (err) {
    console.error(
      `[FSI] ${label} ✗ invalid JSON response:`,
      rawBody.slice(0, 1000),
    );
    throw err;
  }

  console.log(`[FSI] ${label} response:`, {
    conversation_id: data.conversation_id,
    tool_calls: (data.tool_calls ?? []).map((tc: ToolCallInfo) => tc.tool_name),
    guardrail_blocked: data.guardrail_blocked,
    pii_blocked: data.pii_blocked,
    message: String(data.message ?? "").slice(0, 300),
  });

  const rawToolCalls = (data.tool_calls ?? []) as ToolCallInfo[];
  const rawMessage = data.message || "";

  // Try parsing the message as a structured action payload
  const actionPayload = tryParseActionPayload(rawMessage);
  if (actionPayload) {
    console.log(`[FSI] ${label} action payload:`, actionPayload);
  }

  // If the message is a pure JSON action payload, use a fallback reply
  const reply = actionPayload ? "" : rawMessage;

  return {
    reply,
    toolsUsed: rawToolCalls.map((tc: ToolCallInfo) => tc.tool_name),
    toolCalls: rawToolCalls,
    actionPayload,
    conversationId: data.conversation_id || (payload.conversation_id as string),
    timestamp: new Date().toISOString(),
  };
}

export async function sendChatMessage(
  message: string,
  conversationId: string,
): Promise<ChatApiResponse> {
  const payload = {
    message,
    conversation_id: conversationId,
    user_id: FSI_USER_ID,
  };

  return postChat("sendChatMessage", payload);
}

export interface TransactionReportPayload {
  event: "transaction_completed" | "transaction_cancelled";
  recipientName: string;
  amount?: number;
  currency?: string;
  note?: string;
}

export async function reportTransaction(
  conversationId: string,
  report: TransactionReportPayload,
): Promise<ChatApiResponse> {
  let message = "";

  if (report.event === "transaction_completed") {
    const amountStr = report.amount
      ? `${report.currency ?? "IDR"} ${report.amount.toLocaleString("id-ID")}`
      : "sejumlah tertentu";
    const noteStr = report.note ? ` dengan catatan "${report.note}"` : "";
    message = `Saya berhasil melakukan transfer ke ${report.recipientName}${noteStr} sebesar ${amountStr}. Tolong konfirmasi dan beri tahu pengguna bahwa transaksi telah selesai. Ada lagi yang bisa saya bantu?`;
  } else {
    message = `Saya membatalkan transfer ke ${report.recipientName}. Tolong beri tahu pengguna bahwa transaksi telah dibatalkan. Ada lagi yang bisa saya bantu?`;
  }

  const payload = {
    message,
    conversation_id: conversationId,
    user_id: FSI_USER_ID,
  };

  return postChat("reportTransaction", payload);
}

export interface BillPaymentReportPayload {
  event: "bill_paid" | "bill_cancelled";
  billerName: string;
  billId?: string;
  amount?: number;
}

export async function reportBillPayment(
  conversationId: string,
  report: BillPaymentReportPayload,
): Promise<ChatApiResponse> {
  const billIdStr = report.billId ? ` (ID tagihan ${report.billId})` : "";
  let message = "";

  if (report.event === "bill_paid") {
    const amountStr = report.amount
      ? `IDR ${report.amount.toLocaleString("id-ID")}`
      : "sejumlah tertentu";
    message = `Saya berhasil membayar tagihan ${report.billerName}${billIdStr} sebesar ${amountStr}. Tolong konfirmasi dan beri tahu pengguna bahwa pembayaran tagihan telah selesai. Ada lagi yang bisa saya bantu?`;
  } else {
    message = `Saya membatalkan pembayaran tagihan ${report.billerName}${billIdStr}. Tolong beri tahu pengguna bahwa pembayaran tagihan telah dibatalkan. Ada lagi yang bisa saya bantu?`;
  }

  const payload = {
    message,
    conversation_id: conversationId,
    user_id: FSI_USER_ID,
  };

  return postChat("reportBillPayment", payload);
}
