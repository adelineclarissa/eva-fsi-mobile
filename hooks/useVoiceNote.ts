import { useState, useCallback, useEffect, useRef } from "react";
import { Alert } from "react-native";
import {
  useAudioRecorder,
  useAudioRecorderState,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";

export type VoiceStatus = "idle" | "starting" | "recording";

export type VoiceNotice = {
  kind: "success" | "info" | "error";
  text: string;
};

export type VoiceNoteRecording = {
  uri: string;
  durationMs: number;
};

// Recordings shorter than this are almost always accidental taps
const MIN_RECORDING_MS = 600;
const NOTICE_DURATION_MS = 3000;

/**
 * WhatsApp-style voice notes: hold to record, release to keep the recording
 * and the recording is handed to `onRecorded` (e.g. to send it right away).
 */
export function useVoiceNote(
  onRecorded: (recording: VoiceNoteRecording) => void,
) {
  const recorder = useAudioRecorder({
    ...RecordingPresets.HIGH_QUALITY,
    isMeteringEnabled: true,
  });
  const recorderState = useAudioRecorderState(recorder, 100);
  const [status, setStatus] = useState<VoiceStatus>("idle");
  // Latest callback, so `finish` doesn't go stale
  const onRecordedRef = useRef(onRecorded);
  onRecordedRef.current = onRecorded;
  const [notice, setNotice] = useState<VoiceNotice | null>(null);
  // Set when the finger lifts; may happen before the recorder finished
  // starting (e.g. during the permission prompt). `keep` = false if cancelled.
  const releasedRef = useRef<{ keep: boolean } | null>(null);

  // Auto-dismiss the result message
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), NOTICE_DURATION_MS);
    return () => clearTimeout(id);
  }, [notice]);

  /** Stops the recorder; returns the file URI and how long it recorded. */
  const stopRecorder = useCallback(async () => {
    const durationMs = recorder.currentTime * 1000;
    try {
      await recorder.stop();
    } finally {
      await setAudioModeAsync({ allowsRecording: false }).catch(() => {});
    }
    return { uri: recorder.uri, durationMs };
  }, [recorder]);

  const finish = useCallback(
    async (keep: boolean) => {
      setStatus("idle");
      let result: { uri: string | null; durationMs: number };
      try {
        result = await stopRecorder();
      } catch (error) {
        console.warn("[Voice] failed to stop recording:", error);
        setNotice({ kind: "error", text: "Gagal menghentikan rekaman." });
        return;
      }

      if (!keep) {
        setNotice({ kind: "info", text: "Rekaman dibatalkan." });
      } else if (!result.uri) {
        setNotice({
          kind: "error",
          text: "Rekaman tidak tersimpan. Coba lagi.",
        });
      } else if (result.durationMs < MIN_RECORDING_MS) {
        setNotice({
          kind: "info",
          text: "Tahan tombol mic sambil berbicara.",
        });
      } else {
        onRecordedRef.current({
          uri: result.uri,
          durationMs: result.durationMs,
        });
      }
    },
    [stopRecorder],
  );

  /** Finger down on the mic button. */
  const pressIn = useCallback(async () => {
    if (status !== "idle") return;
    releasedRef.current = null;
    setNotice(null);
    setStatus("starting");

    const { granted } = await requestRecordingPermissionsAsync();
    if (!granted) {
      setStatus("idle");
      Alert.alert(
        "Izin Diperlukan",
        "Aktifkan izin mikrofon di pengaturan untuk mengirim pesan suara.",
      );
      return;
    }
    // Released while the permission prompt / setup was in progress
    if (releasedRef.current) {
      setStatus("idle");
      setNotice({ kind: "info", text: "Tahan tombol mic sambil berbicara." });
      return;
    }

    try {
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      setStatus("recording");
      // TS narrowed the ref to null above, but it can change across awaits
      const released = releasedRef.current as { keep: boolean } | null;
      if (released) finish(released.keep);
    } catch (error) {
      console.warn("[Voice] failed to start recording:", error);
      setStatus("idle");
      setNotice({ kind: "error", text: "Gagal memulai rekaman. Coba lagi." });
    }
  }, [status, recorder, finish]);

  /** Finger up: deliver the recording, or discard it. */
  const pressOut = useCallback(
    (keep: boolean) => {
      releasedRef.current = { keep };
      if (status === "recording") finish(keep);
    },
    [status, finish],
  );

  // Release the mic if the screen unmounts mid-recording
  useEffect(
    () => () => {
      try {
        if (recorder.isRecording) recorder.stop().catch(() => {});
      } catch {
        // Native recorder already released
      }
    },
    [recorder],
  );

  return {
    status,
    durationMillis: recorderState.durationMillis,
    /** Input level in dBFS (roughly -160..0), when metering is available */
    metering: recorderState.metering,
    notice,
    pressIn,
    pressOut,
  };
}
