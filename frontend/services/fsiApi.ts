const FSI_API_URL =
  process.env.EXPO_PUBLIC_FSI_API_URL ||
  "https://api.epsindo.ai/fsi/api/v1/chat";
const FSI_API_KEY = process.env.EXPO_PUBLIC_FSI_API_KEY || "";
const FSI_USER_ID = process.env.EXPO_PUBLIC_FSI_USER_ID || "";

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

export async function sendChatMessage(
  message: string,
  conversationId: string,
): Promise<ChatApiResponse> {
  const payload = {
    message,
    conversation_id: conversationId,
    user_id: FSI_USER_ID,
  };

  console.log(
    "[FSI] sendChatMessage payload:",
    JSON.stringify(payload, null, 2),
  );

  const response = await fetch(FSI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(FSI_API_KEY ? { "X-API-Key": FSI_API_KEY } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Network error" }));
    throw new Error(error.error || `FSI request failed: ${response.status}`);
  }

  const data = await response.json();
  const rawToolCalls = (data.tool_calls ?? []) as ToolCallInfo[];
  const rawMessage = data.message || "";

  // Try parsing the message as a structured action payload
  const actionPayload = tryParseActionPayload(rawMessage);

  // If the message is a pure JSON action payload, use a fallback reply
  const reply = actionPayload ? "" : rawMessage;

  return {
    reply,
    toolsUsed: rawToolCalls.map((tc: ToolCallInfo) => tc.tool_name),
    toolCalls: rawToolCalls,
    actionPayload,
    conversationId: data.conversation_id || conversationId,
    timestamp: new Date().toISOString(),
  };
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

  console.log(
    "[FSI] reportTransaction payload:",
    JSON.stringify(payload, null, 2),
  );

  const response = await fetch(FSI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(FSI_API_KEY ? { "X-API-Key": FSI_API_KEY } : {}),
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ error: "Network error" }));
    throw new Error(error.error || `FSI request failed: ${response.status}`);
  }

  const data = await response.json();
  const rawToolCalls = (data.tool_calls ?? []) as ToolCallInfo[];
  const rawMessage = data.message || "";

  const actionPayload = tryParseActionPayload(rawMessage);
  const reply = actionPayload ? "" : rawMessage;

  return {
    reply,
    toolsUsed: rawToolCalls.map((tc: ToolCallInfo) => tc.tool_name),
    toolCalls: rawToolCalls,
    actionPayload,
    conversationId: data.conversation_id || conversationId,
    timestamp: new Date().toISOString(),
  };
}
