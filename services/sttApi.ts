import { Platform } from "react-native";
import { File } from "expo-file-system";

const STT_API_URL =
  process.env.EXPO_PUBLIC_STT_API_URL ||
  "https://stt.epsindo.ai/v1/audio/transcriptions";
const STT_API_KEY = process.env.EXPO_PUBLIC_STT_API_KEY || "";
const STT_MODEL =
  process.env.EXPO_PUBLIC_STT_MODEL || "epsindo.ai/Qwen3-ASR-1.7B";

/**
 * Sends a recorded audio file to the STT server (OpenAI-compatible
 * /v1/audio/transcriptions) and returns the transcript.
 */
export async function transcribeAudio(uri: string): Promise<string> {
  const form = new FormData();

  if (Platform.OS === "web") {
    // On web the recorder returns a blob: URL (webm)
    const blob = await (await fetch(uri)).blob();
    form.append("file", blob, "recording.webm");
  } else {
    // Expo's fetch serializes FormData parts via `bytes()`, which
    // expo-file-system's File provides (RN Blobs and { uri } parts fail)
    form.append("file", new File(uri));
  }
  form.append("model", STT_MODEL);
  form.append("language", "id");

  const startedAt = Date.now();
  const res = await fetch(STT_API_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${STT_API_KEY}` },
    body: form,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`[STT] HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  const json = (await res.json()) as { text?: string };
  console.log(`[STT] transcribed in ${Date.now() - startedAt}ms`);
  return (json.text ?? "").trim();
}
