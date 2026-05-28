const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3001';

export interface ChatApiResponse {
  reply: string;
  toolsUsed: string[];
  sessionId: string;
  timestamp: string;
}

export async function sendChatMessage(
  message: string,
  sessionId: string
): Promise<ChatApiResponse> {
  const response = await fetch(`${BASE_URL}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(error.error || `Request failed: ${response.status}`);
  }

  return response.json();
}

export async function streamChatMessage(
  message: string,
  sessionId: string,
  onToken: (token: string) => void,
  onToolUse: (toolName: string) => void,
  onComplete: (toolsUsed: string[]) => void,
  onError: (error: string) => void
): Promise<void> {
  const response = await fetch(`${BASE_URL}/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, sessionId }),
  });

  if (!response.ok) {
    throw new Error(`Stream request failed: ${response.status}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response stream available');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6));

          if ('token' in data) {
            onToken(data.token);
          } else if ('toolName' in data) {
            onToolUse(data.toolName);
          } else if ('toolsUsed' in data) {
            onComplete(data.toolsUsed);
          } else if ('message' in data) {
            onError(data.message);
          }
        } catch {
          // Ignore parse errors for partial chunks
        }
      }
    }
  }
}

export async function uploadDocument(
  uri: string,
  name: string,
  mimeType: string
): Promise<{ documentId: string; name: string; pages: number; message: string }> {
  const formData = new FormData();
  formData.append('file', {
    uri,
    name,
    type: mimeType || 'application/pdf',
  } as unknown as Blob);

  const response = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Upload failed');
  }

  return response.json();
}

export async function getExchangeRates(
  from: string,
  to: string,
  amount?: number
): Promise<{ from: string; to: string; rate: number; rateFormatted: string; convertedAmount?: number }> {
  const params = new URLSearchParams({ from, to });
  if (amount !== undefined) params.append('amount', amount.toString());

  const response = await fetch(`${BASE_URL}/exchange-rates?${params}`);
  if (!response.ok) throw new Error('Failed to fetch exchange rates');

  return response.json();
}

export async function getPopularRates(): Promise<{
  base: string;
  rates: Array<{ currency: string; rate: number; rateFormatted: string }>;
}> {
  const response = await fetch(`${BASE_URL}/exchange-rates/popular`);
  if (!response.ok) throw new Error('Failed to fetch rates');
  return response.json();
}

export async function checkHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${BASE_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}
