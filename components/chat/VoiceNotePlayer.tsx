import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";

interface VoiceNotePlayerProps {
  uri: string;
  /** Known recording length, shown before the player has loaded */
  durationMs: number;
  /** "light" on white backgrounds, "dark" inside the purple user bubble */
  variant?: "light" | "dark";
}

function formatSeconds(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`;
}

export default function VoiceNotePlayer({
  uri,
  durationMs,
  variant = "light",
}: VoiceNotePlayerProps) {
  const player = useAudioPlayer(uri);
  const status = useAudioPlayerStatus(player);
  const dark = variant === "dark";

  // Rewind when playback reaches the end so the next tap replays it
  useEffect(() => {
    if (status.didJustFinish) {
      player.pause();
      player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  const duration = status.duration > 0 ? status.duration : durationMs / 1000;
  const progress =
    duration > 0 ? Math.min(1, status.currentTime / duration) : 0;
  const showElapsed = status.playing || status.currentTime > 0;

  const togglePlay = () => {
    if (status.playing) player.pause();
    else player.play();
  };

  const fg = dark ? "#fff" : Colors.accentPurple;

  return (
    <View style={styles.container}>
      <Pressable
        onPress={togglePlay}
        hitSlop={8}
        style={[styles.playBtn, dark && styles.playBtnDark]}
      >
        <Ionicons
          name={status.playing ? "pause" : "play"}
          size={16}
          color={dark ? Colors.accentPurple : "#fff"}
        />
      </Pressable>
      <View style={styles.track}>
        <View
          style={[
            styles.trackBg,
            {
              backgroundColor: dark ? "rgba(255,255,255,0.35)" : Colors.border,
            },
          ]}
        />
        <View
          style={[
            styles.trackFill,
            { width: `${progress * 100}%`, backgroundColor: fg },
          ]}
        />
      </View>
      <Text
        style={[styles.time, { color: dark ? "#fff" : Colors.textSecondary }]}
      >
        {formatSeconds(showElapsed ? status.currentTime : duration)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 180,
  },
  playBtn: {
    width: 30,
    height: 30,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.accentPurple,
  },
  playBtnDark: {
    backgroundColor: "#fff",
  },
  track: {
    flex: 1,
    height: 4,
    justifyContent: "center",
  },
  trackBg: {
    ...StyleSheet.absoluteFill,
    borderRadius: 2,
  },
  trackFill: {
    height: 4,
    borderRadius: 2,
  },
  time: {
    fontSize: 12,
    fontWeight: "600",
    fontVariant: ["tabular-nums"],
  },
});
