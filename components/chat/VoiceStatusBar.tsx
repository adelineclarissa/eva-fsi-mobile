import React, { useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import type { VoiceStatus, VoiceNotice } from "../../hooks/useVoiceNote";

interface VoiceStatusBarProps {
  status: VoiceStatus;
  durationMillis: number;
  metering?: number;
  notice: VoiceNotice | null;
  /** Finger has slid far enough that releasing will discard the recording */
  willCancel: boolean;
}

const LEVEL_BARS = 5;

function formatDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** Maps dBFS (about -60 quiet .. 0 loud) to 0..1 */
function normalizeLevel(metering?: number) {
  if (metering == null) return 0;
  return Math.min(1, Math.max(0, (metering + 60) / 60));
}

function PulsingDot() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.25, { duration: 500 }),
        withTiming(1, { duration: 500 }),
      ),
      -1,
      false,
    );
  }, []);

  const style = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[styles.recDot, style]} />;
}

function LevelMeter({ metering }: { metering?: number }) {
  const level = normalizeLevel(metering);
  return (
    <View style={styles.meter}>
      {Array.from({ length: LEVEL_BARS }, (_, i) => {
        const active = level > i / LEVEL_BARS;
        return (
          <View
            key={i}
            style={[
              styles.meterBar,
              { height: 6 + i * 3 },
              active && styles.meterBarActive,
            ]}
          />
        );
      })}
    </View>
  );
}

const NOTICE_STYLE: Record<
  VoiceNotice["kind"],
  { icon: keyof typeof Ionicons.glyphMap; color: string }
> = {
  success: { icon: "checkmark-circle", color: Colors.success },
  info: { icon: "information-circle", color: Colors.textSecondary },
  error: { icon: "alert-circle", color: Colors.error },
};

/**
 * Shows what the voice recorder is doing: preparing the mic, recording (with
 * timer, input level and slide-to-cancel hint), or the outcome of the last
 * recording.
 */
export default function VoiceStatusBar({
  status,
  durationMillis,
  metering,
  notice,
  willCancel,
}: VoiceStatusBarProps) {
  let content: React.ReactNode = null;

  if (status === "starting") {
    content = (
      <>
        <ActivityIndicator size="small" color={Colors.textMuted} />
        <Text style={styles.text}>Menyiapkan mikrofon...</Text>
      </>
    );
  } else if (status === "recording") {
    content = (
      <>
        <PulsingDot />
        <Text style={[styles.text, styles.recText]}>Merekam</Text>
        <Text style={styles.timer}>{formatDuration(durationMillis)}</Text>
        <LevelMeter metering={metering} />
        <View style={styles.spacer} />
        {willCancel ? (
          <Text style={styles.cancelText}>Lepas untuk batal</Text>
        ) : (
          <Text style={styles.hintText}>‹ Geser untuk batal</Text>
        )}
      </>
    );
  } else if (notice) {
    const { icon, color } = NOTICE_STYLE[notice.kind];
    content = (
      <>
        <Ionicons name={icon} size={16} color={color} />
        <Text style={[styles.text, { color }]}>{notice.text}</Text>
      </>
    );
  }

  if (!content) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
      style={[styles.container, status === "recording" && styles.recording]}
    >
      {content}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  recording: {
    borderColor: Colors.accentRose,
    backgroundColor: "#FEF2F2",
  },
  recDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accentRose,
  },
  text: {
    flexShrink: 1,
    fontSize: 13,
    color: Colors.textSecondary,
  },
  recText: {
    color: Colors.accentRose,
    fontWeight: "600",
  },
  timer: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
    fontVariant: ["tabular-nums"],
  },
  meter: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 2,
    height: 18,
  },
  meterBar: {
    width: 3,
    borderRadius: 2,
    backgroundColor: Colors.border,
  },
  meterBarActive: {
    backgroundColor: Colors.accentRose,
  },
  spacer: {
    flex: 1,
  },
  hintText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  cancelText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.accentRose,
  },
});
