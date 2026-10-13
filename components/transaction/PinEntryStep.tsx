import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "../../constants/colors";

interface PinEntryStepProps {
  pin: string;
  setPin: (p: string) => void;
  isLoading: boolean;
  onConfirm: () => void;
}

export default function PinEntryStep({
  pin,
  setPin,
  isLoading,
  onConfirm,
}: PinEntryStepProps) {
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (pin.length === 6 && !isLoading) {
      onConfirm();
    }
  }, [pin, isLoading, onConfirm]);

  return (
    <Pressable
      style={styles.pinContainer}
      onPress={() => inputRef.current?.focus()}
    >
      <View style={styles.pinCard}>
        <View style={styles.pinHeader}>
          <Ionicons
            name="lock-closed-outline"
            size={32}
            color={Colors.primary}
          />
          <Text style={styles.pinTitle}>PIN Transaksi</Text>
          <Text style={styles.pinSubtitle}>Silakan masukkan PIN Anda</Text>
        </View>

        <View style={styles.pinDotsRow}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              style={[
                styles.pinDot,
                i < pin.length ? styles.pinDotFilled : styles.pinDotEmpty,
              ]}
            />
          ))}
        </View>

        <TextInput
          ref={inputRef}
          value={pin}
          onChangeText={(text) => setPin(text.replace(/\D/g, "").slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          secureTextEntry
          autoFocus
          style={styles.pinHiddenInput}
        />
      </View>
    </Pressable>
  );
}

// Matches reference: white card top + gray keypad bottom
const styles = StyleSheet.create({
  pinContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  pinCard: {
    flex: 1.2,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 20,
  },
  pinHeader: {
    alignItems: "center",
    gap: 8,
    marginTop: 16,
  },
  pinTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.primary,
  },
  pinSubtitle: {
    fontSize: 14,
    color: Colors.textMuted,
    textAlign: "center",
  },
  pinDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    marginTop: 24,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  pinDotFilled: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  pinDotEmpty: {
    borderColor: Colors.border,
    backgroundColor: "transparent",
  },
  pinHiddenInput: {
    position: "absolute",
    width: 1,
    height: 1,
    opacity: 0,
  },
});
