import React, { useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Alert,
  Share,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import { Ionicons } from "@expo/vector-icons";

import { Colors } from "../../constants/colors";
import { formatCurrency } from "../../utils/formatters";

export interface ReceiptRow {
  label: string;
  value: string;
  green?: boolean;
}

interface TransactionReceiptProps {
  /** e.g. "Transfer Berhasil" */
  title: string;
  /** ISO timestamp of the transaction */
  date: string;
  amount: number;
  rows: ReceiptRow[];
  /** Plain-text receipt used for the share sheet */
  shareText: string;
  /** Used in share title and alerts, e.g. "Bukti Transfer" */
  receiptName: string;
  onDone: () => void;
}

export function formatReceiptDate(iso: string, withSeconds = true): string {
  if (!iso) return "";
  const date = new Date(iso);
  return (
    date.toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    }) +
    " " +
    date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      ...(withSeconds ? { second: "2-digit" as const } : {}),
    })
  );
}

export default function TransactionReceipt({
  title,
  date,
  amount,
  rows,
  shareText,
  receiptName,
  onDone,
}: TransactionReceiptProps) {
  const receiptRef = useRef<View>(null);

  const handleDownload = useCallback(async () => {
    try {
      // Loaded lazily: expo-media-library throws on import under web
      const MediaLibrary: typeof import("expo-media-library") = require("expo-media-library");
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Izin diperlukan",
          `Izinkan akses galeri untuk menyimpan ${receiptName.toLowerCase()}.`,
        );
        return;
      }
      const uri = await captureRef(receiptRef, { format: "png", quality: 1 });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("Tersimpan!", `${receiptName} berhasil disimpan ke galeri.`);
    } catch {
      Alert.alert("Gagal", `Tidak dapat menyimpan ${receiptName.toLowerCase()}.`);
    }
  }, [receiptName]);

  const handleShare = async () => {
    try {
      await Share.share({ message: shareText, title: receiptName });
    } catch {
      // User cancelled share
    }
  };

  return (
    <View style={styles.receiptOuter}>
      <ScrollView
        style={styles.receiptScroll}
        contentContainerStyle={styles.receiptScrollContent}
      >
        <View ref={receiptRef} style={styles.receiptCard}>
          <View style={styles.receiptCheckCircle}>
            <Ionicons name="checkmark" size={36} color="#fff" />
          </View>

          <Text style={styles.receiptTitle}>{title}</Text>
          <Text style={styles.receiptDateTime}>{formatReceiptDate(date)}</Text>

          <Text style={styles.receiptAmount}>{formatCurrency(amount)}</Text>

          <View style={styles.receiptDivider} />

          {rows.map(({ label, value, green }, i, arr) => (
            <View
              key={label}
              style={[
                styles.receiptRow,
                i < arr.length - 1 && styles.receiptRowBorder,
              ]}
            >
              <Text style={styles.receiptRowLabel}>{label}</Text>
              <Text
                style={[
                  styles.receiptRowValue,
                  green ? { color: Colors.success } : null,
                ]}
              >
                {value}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <View style={styles.receiptActions}>
        <Pressable
          style={({ pressed }) => [
            styles.receiptIconWrapper,
            { backgroundColor: pressed ? Colors.border : "transparent" },
          ]}
          onPress={handleShare}
        >
          <View style={styles.receiptIconBtn}>
            <Ionicons
              name="share-social-outline"
              size={20}
              color={Colors.primary}
            />
          </View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.receiptIconWrapper,
            { backgroundColor: pressed ? Colors.border : "transparent" },
          ]}
          onPress={handleDownload}
        >
          <View style={styles.receiptIconBtn}>
            <Ionicons name="download-outline" size={20} color={Colors.primary} />
          </View>
        </Pressable>
        <Pressable
          style={({ pressed }) => [
            styles.receiptDoneWrapper,
            { backgroundColor: pressed ? "#153d7a" : "transparent" },
          ]}
          onPress={onDone}
        >
          <View style={styles.receiptDoneBtn}>
            <Text style={styles.receiptDoneBtnText}>Selesai</Text>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  receiptScroll: { flex: 1, backgroundColor: Colors.background },
  receiptScrollContent: { padding: 20, paddingBottom: 40, gap: 16 },
  receiptCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 24,
    alignItems: "center",
  },
  receiptCheckCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.accentTeal,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  receiptTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 4,
  },
  receiptDateTime: {
    fontSize: 13,
    color: Colors.textMuted,
    marginBottom: 16,
  },
  receiptAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.primary,
    marginBottom: 20,
  },
  receiptDivider: {
    width: "100%",
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginBottom: 4,
  },
  receiptRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    width: "100%",
    paddingVertical: 12,
  },
  receiptRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  receiptRowLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    flex: 1,
  },
  receiptRowValue: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.textPrimary,
    flex: 1,
    textAlign: "right",
  },
  receiptOuter: {
    flex: 1,
  },
  receiptActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  receiptIconWrapper: {
    borderRadius: 24,
    overflow: "hidden",
  },
  receiptIconBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  receiptDoneWrapper: {
    flex: 1,
    borderRadius: 30,
    overflow: "hidden",
  },
  receiptDoneBtn: {
    paddingVertical: 12,
    paddingHorizontal: 70,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#1A4FA0",
  },
  receiptDoneBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
});
