import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Animated, { FadeInLeft } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "../../constants/colors";
import { Beneficiary } from "../../types";

interface BeneficiarySelectorProps {
  matches: Beneficiary[];
  keyword: string;
  onSelect: (beneficiary: Beneficiary) => void;
  disabled: boolean;
  selectedId?: string | null;
}

export default function BeneficiarySelector({
  matches,
  keyword,
  onSelect,
  disabled,
  selectedId,
}: BeneficiarySelectorProps) {
  if (matches.length === 0) {
    return (
      <Animated.View entering={FadeInLeft.springify()} style={styles.container}>
        <View style={styles.noResultBubble}>
          <Ionicons
            name="search-outline"
            size={16}
            color={Colors.textSecondary}
          />
          <Text style={styles.noResultText}>
            Sorry, I couldn't find "{keyword}" in your beneficiary list. Please
            enter their account number directly.
          </Text>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View entering={FadeInLeft.springify()} style={styles.container}>
      <View style={styles.optionsRow}>
        {matches.map((ben) => {
          const isSelected = selectedId === ben.id;
          return (
            <Pressable
              key={ben.id}
              onPress={() => !disabled && onSelect(ben)}
              disabled={disabled}
              style={({ pressed }) => [
                styles.optionButton,
                isSelected && styles.optionButtonSelected,
                pressed && !disabled && styles.optionButtonPressed,
                disabled && !isSelected && styles.optionButtonDisabled,
              ]}
            >
              <View style={styles.optionInner}>
                <View
                  style={[
                    styles.initialsCircle,
                    { backgroundColor: ben.color },
                  ]}
                >
                  <Text style={styles.initialsText}>{ben.initials}</Text>
                </View>
                <View style={styles.optionTextContainer}>
                  <Text style={styles.optionName} numberOfLines={1}>
                    {ben.name}
                  </Text>
                  <Text style={styles.optionBank} numberOfLines={1}>
                    {ben.bankName} · {ben.accountNumber}
                  </Text>
                </View>
                {isSelected ? (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  </View>
                ) : (
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={Colors.textMuted}
                  />
                )}
              </View>
            </Pressable>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 10,
    paddingHorizontal: 0,
  },
  headerText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  noResultBubble: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "rgba(107, 114, 128, 0.06)",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "rgba(107, 114, 128, 0.12)",
  },
  noResultText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: Colors.textSecondary,
    fontWeight: "500",
  },
  optionsRow: {
    gap: 10,
  },
  optionButton: {
    borderRadius: 20,
  },
  optionButtonSelected: {
    borderColor: Colors.accentPurple,
    backgroundColor: "rgba(139, 92, 246, 0.06)",
    shadowColor: Colors.accentPurple,
    shadowOpacity: 0.15,
  },
  optionButtonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.97 }],
  },
  optionButtonDisabled: {
    opacity: 0.3,
  },
  initialsCircle: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
    flexShrink: 0,
  },
  initialsText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "700",
  },
  optionTextContainer: {
    flex: 1,
    flexDirection: "column", // explicit stacking
    justifyContent: "center", // vertically centers the text block
    gap: 3,
  },
  optionName: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  optionBank: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  checkBadge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.accentPurple,
    alignItems: "center",
    justifyContent: "center",
  },
  optionInner: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    backgroundColor: "#fff",
    paddingHorizontal: 18,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 20,
  },
});
