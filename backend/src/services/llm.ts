const LLM_URL = process.env.LLM_URL || "https://api.epsindo.ai/fsi/api/v1/chat";
const LLM_API_KEY = process.env.LLM_API_KEY || "eps-v1-j8OlarSGqbbXSnJb5UDw";
const LLM_USER_ID = process.env.LLM_USER_ID || "eva-user";

interface LLMRequest {
  message: string;
  conversation_id: string;
  user_id: string;
}

interface LLMResponse {
  message: string;
  conversation_id: string;
  tool_calls: unknown[];
  guardrail_blocked: boolean;
  pii_blocked: boolean;
  pii_masked: boolean;
}

// Maps sessionId → conversation_id returned by the server
const sessions = new Map<string, string>();

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

export interface ChatResponse {
  reply: string;
  toolsUsed: string[];
  sessionId: string;
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

  return { reply: data.message, toolsUsed: [], sessionId };
}

export async function streamChat(
  userMessage: string,
  sessionId: string,
  onToken: (token: string) => void,
  _onToolUse: (toolName: string) => void,
  onComplete: (toolsUsed: string[]) => void,
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

  // Simulate streaming token by token
  for (const char of data.message) {
    onToken(char);
    await new Promise((resolve) => setTimeout(resolve, 8));
  }

  onComplete([]);
}

export function clearSession(sessionId: string): void {
  sessions.delete(sessionId);
}
