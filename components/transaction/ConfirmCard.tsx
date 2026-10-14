import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { Colors } from "../../constants/colors";
import { formatCurrency } from "../../utils/formatters";

export interface ConfirmRow {
  label: string;
  value?: string;
  green?: boolean;
}

interface ConfirmCardProps {
  /** e.g. "Anda akan mengirim" */
  label: string;
  amount: number;
  rows: ConfirmRow[];
}

export default function ConfirmCard({ label, amount, rows }: ConfirmCardProps) {
  return (
    <View style={styles.confirmCard}>
      <Text style={styles.confirmLabel}>{label}</Text>
      <Text style={styles.confirmAmount}>{formatCurrency(amount)}</Text>
      <View style={styles.confirmDetails}>
        {rows.map(({ label: rowLabel, value, green }) => (
          <View key={rowLabel} style={styles.confirmRow}>
            <Text style={styles.confirmRowLabel}>{rowLabel}</Text>
            <Text
              style={[
                styles.confirmRowValue,
                green && { color: Colors.success },
              ]}
            >
              {value}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  confirmCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    padding: 22,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 16,
  },
  confirmLabel: { fontSize: 13, color: Colors.textMuted, textAlign: "center" },
  confirmAmount: {
    fontSize: 36,
    fontWeight: "800",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  confirmDetails: { gap: 12 },
  confirmRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  confirmRowLabel: { fontSize: 14, color: Colors.textMuted },
  confirmRowValue: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
});
