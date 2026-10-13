import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Colors } from "../../constants/colors";
import { Account } from "../../types";

interface SourceOfFundCardProps {
  sourceAccount?: Account;
  otherAccounts: Account[];
  onSelect: (account: Account) => void;
}

export default function SourceOfFundCard({
  sourceAccount,
  otherAccounts,
  onSelect,
}: SourceOfFundCardProps) {
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);

  return (
    <View style={styles.fundCard}>
      <View style={styles.fundCardHeader}>
        <View>
          <Text style={styles.fundCardLabel}>Source of Fund</Text>
          <Text style={styles.fundCardTitle}>
            {sourceAccount?.name ?? "Pilih rekening"}
          </Text>
        </View>
        <Pressable
          onPress={() => setShowAccountDropdown((prev) => !prev)}
          style={styles.chevronBtn}
        >
          <Ionicons
            name={showAccountDropdown ? "chevron-up" : "chevron-down"}
            size={18}
            color={Colors.primary}
          />
        </Pressable>
      </View>
      <Text style={styles.fundCardMeta}>
        {sourceAccount?.accountNumber ?? "-"} •{" "}
        {sourceAccount?.currency ?? "IDR"}
      </Text>

      {showAccountDropdown && otherAccounts.length > 0 && (
        <View style={styles.accountDropdown}>
          {otherAccounts.map((account) => (
            <Pressable
              key={account.id}
              style={({ pressed }) => [
                styles.accountDropdownItem,
                pressed && styles.accountDropdownItemPressed,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                onSelect(account);
                setShowAccountDropdown(false);
              }}
            >
              <View style={styles.accountDropdownInner}>
                <View
                  style={[
                    styles.accountDropdownIcon,
                    { backgroundColor: account.color ?? Colors.primary },
                  ]}
                >
                  <Ionicons name="card" size={18} color="#fff" />
                </View>
                <View style={styles.accountDropdownTextContainer}>
                  <Text style={styles.accountDropdownName}>{account.name}</Text>
                  <Text style={styles.accountDropdownNumber}>
                    {account.accountNumber.replace(
                      /(\d{3})(\d{3})(\d{4})/,
                      "$1 - $2 - $3",
                    )}
                    {" • "}
                    {account.currency}
                  </Text>
                </View>
              </View>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fundCard: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 8,
  },
  fundCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  fundCardLabel: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  fundCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
    marginTop: 4,
  },
  fundCardMeta: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  chevronBtn: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  accountDropdown: {
    gap: 10,
    marginTop: 4,
  },
  accountDropdownItem: {
    borderRadius: 18,
  },
  accountDropdownItemPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  accountDropdownInner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
  },
  accountDropdownIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  accountDropdownTextContainer: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
  },
  accountDropdownName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  accountDropdownNumber: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
