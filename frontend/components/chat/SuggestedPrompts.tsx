import React from "react";
import { Pressable, Text, StyleSheet, View } from "react-native";
import Animated, { FadeInUp, Layout } from "react-native-reanimated";
import { Colors } from "../../constants/colors";

const QUICK_ACTIONS = [
  { label: "Berapa kurs USD hari ini?", prompt: "Berapa kurs USD hari ini?" },
  {
    label: "Cek saldo rekening saya",
    prompt: "Berapa saldo rekening saya sekarang?",
  },
  {
    label: "Transfer dana",
    prompt: "Saya ingin transfer dana ke rekening lain",
  },
] as const;

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
  visible: boolean;
}

export default function SuggestedPrompts({
  onSelect,
  visible,
}: SuggestedPromptsProps) {
  if (!visible) return null;

  return (
    <Animated.View
      entering={FadeInUp.springify()}
      layout={Layout.springify()}
      style={styles.wrapper}
    >
      <View style={styles.container}>
        <Text style={styles.title}>Coba pertanyaan ini</Text>
        <View style={styles.buttonsContainer}>
          {QUICK_ACTIONS.map((item, index) => (
            <Animated.View
              key={item.label}
              entering={FadeInUp.delay(100 + index * 80).springify()}
            >
              <Pressable
                onPress={() => onSelect(item.prompt)}
                style={({ pressed }) => [
                  styles.pressable,
                  pressed && styles.pressablePressed,
                ]}
              >
                {({ pressed }) => (
                  <View
                    style={[styles.button, pressed && styles.buttonPressed]}
                  >
                    <Text style={styles.buttonText}>{item.label}</Text>
                  </View>
                )}
              </Pressable>
            </Animated.View>
          ))}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  container: {
    backgroundColor: "#DCE3EF",
    borderRadius: 20,
    padding: 10,
    gap: 6,
  },
  title: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginBottom: 2,
    paddingHorizontal: 4,
  },
  buttonsContainer: {
    gap: 6,
  },
  pressable: {
    borderRadius: 20,
    overflow: "hidden",
  },
  pressablePressed: {
    opacity: 0.7,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8F9FC",
    borderWidth: 1.5,
    borderColor: `${Colors.primary}30`,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  buttonPressed: {
    backgroundColor: "#D0D9E8",
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.primary,
    textAlign: "center",
    letterSpacing: 0.2,
  },
});
