const FSI_API_URL =
  process.env.EXPO_PUBLIC_FSI_API_URL ||
  "https://api.epsindo.ai/fsi/api/v1/chat";
const FSI_API_KEY = process.env.EXPO_PUBLIC_FSI_API_KEY || "";
const FSI_USER_ID = process.env.EXPO_PUBLIC_FSI_USER_ID || "";

export interface ChatApiResponse {
  reply: string;
  toolsUsed: string[];
  conversationId: string;
  timestamp: string;
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
  return {
    reply: data.message || "",
    toolsUsed: (data.tool_calls ?? []).map(
      (tc: { tool_name: string }) => tc.tool_name,
    ),
    conversationId: data.conversation_id || conversationId,
    timestamp: new Date().toISOString(),
  };
}
