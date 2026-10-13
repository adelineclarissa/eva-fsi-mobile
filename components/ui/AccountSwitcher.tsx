import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Account } from "../../types";
import { formatCurrency } from "../../utils/formatters";
import { Colors } from "../../constants/colors";

interface AccountSwitcherProps {
  accounts: Account[];
  activeAccountId: string | null;
  onSelect: (id: string) => void;
}

export default function AccountSwitcher({
  accounts,
  activeAccountId,
  onSelect,
}: AccountSwitcherProps) {
  const [showBalances, setShowBalances] = useState(true);

  if (accounts.length <= 1) return null;

  const handleSelect = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(id);
  };

  const toggleBalances = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowBalances((prev) => !prev);
  };

  return (
    <View style={styles.wrapper}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>Rekening Saya</Text>
        <Pressable
          onPress={toggleBalances}
          hitSlop={8}
          style={styles.eyeBtn}
          accessibilityLabel={
            showBalances ? "Sembunyikan saldo" : "Tampilkan saldo"
          }
        >
          <Ionicons
            name={showBalances ? "eye-outline" : "eye-off-outline"}
            size={18}
            color={Colors.textSecondary}
          />
        </Pressable>
      </View>
      <View style={styles.list}>
        <View style={styles.card}>
          {accounts.map((account, index) => {
            const isActive = account.id === activeAccountId;
            const color = account.color ?? Colors.primary;
            return (
              <Pressable
                key={account.id}
                style={[
                  styles.row,
                  isActive && styles.rowActive,
                  index < accounts.length - 1 && styles.rowDivider,
                ]}
                onPress={() => handleSelect(account.id)}
              >
                <View style={styles.cardTitleRow}>
                  <View style={[styles.dot, { backgroundColor: color }]} />
                  <View style={styles.titleGroup}>
                    <Text
                      style={[
                        styles.accountName,
                        isActive && styles.accountNameActive,
                      ]}
                      numberOfLines={1}
                    >
                      {account.name}
                    </Text>
                    <Text style={styles.accountNumber}>
                      {account.accountNumber}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[styles.balance, isActive && styles.balanceActive]}
                >
                  {showBalances
                    ? formatCurrency(account.balance, account.currency)
                    : "••••••"}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  eyeBtn: {
    alignItems: "center",
    justifyContent: "center",
    padding: 2,
    backgroundColor: "transparent",
  },
  list: {
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(148, 163, 184, 0.18)",
  },
  rowActive: {
    backgroundColor: "rgba(15, 23, 42, 0.03)",
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    gap: 8,
  },
  titleGroup: {
    flex: 1,
    gap: 2,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  accountName: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  accountNameActive: {
    color: Colors.textPrimary,
  },
  accountNumber: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "400",
  },
  balance: {
    fontSize: 15,
    fontWeight: "800",
    color: Colors.textSecondary,
    textAlign: "right",
  },
  balanceActive: {
    color: Colors.textPrimary,
  },
});
