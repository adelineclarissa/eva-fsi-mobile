import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Colors } from "../constants/colors";
import { useAccountStore } from "../store/accountStore";
import { useChatStore } from "../store/chatStore";
import { formatCurrency } from "../utils/formatters";
import { reportBillPayment } from "../services/fsiApi";
import PinEntryStep from "../components/transaction/PinEntryStep";
import ProcessingOverlay from "../components/transaction/ProcessingOverlay";
import TransactionReceipt, {
  formatReceiptDate,
} from "../components/transaction/TransactionReceipt";
import ConfirmCard from "../components/transaction/ConfirmCard";
import SourceOfFundCard from "../components/transaction/SourceOfFundCard";

type Step = "confirm" | "pin" | "success";

const STEP_TITLES: Record<Step, string> = {
  confirm: "Konfirmasi Pembayaran",
  pin: "Masukkan PIN",
  success: "Pembayaran Berhasil!",
};

const BILLER_ICONS: Record<string, string> = {
  PLN: "flash-outline",
  PDAM: "water-outline",
  BPJS: "medkit-outline",
  TELKOM: "wifi-outline",
};

export default function PayBillScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const { accounts, addTransaction, updateBalance } = useAccountStore();
  const { addMessage, sessionId } = useChatStore();
  const [step, setStep] = useState<Step>("confirm");
  const [sourceAccountId, setSourceAccountId] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [transactionDate, setTransactionDate] = useState("");

  const param = (key: string) =>
    typeof searchParams[key] === "string"
      ? (searchParams[key] as string)
      : undefined;
  const billId = param("billId");
  const billerCode = param("billerCode") ?? "";
  const billerName = param("billerName") || billerCode || "Tagihan";
  const amount = Number(param("amount") ?? 0) || 0;
  const cameFromChat = param("fromChat") === "1";
  const billerIcon =
    BILLER_ICONS[billerCode.toUpperCase()] ?? "receipt-outline";

  const sourceAccount = useMemo(
    () =>
      accounts.find((account) => account.id === sourceAccountId) ??
      accounts.find((account) => account.type === "checking") ??
      accounts[0],
    [accounts, sourceAccountId],
  );

  const otherAccounts = useMemo(
    () => accounts.filter((account) => account.id !== sourceAccount?.id),
    [accounts, sourceAccount],
  );

  const handleConfirm = useCallback(() => {
    if (amount <= 0) {
      Alert.alert("Tagihan Tidak Valid", "Jumlah tagihan tidak ditemukan.");
      return;
    }
    if (amount > (sourceAccount?.balance ?? 0)) {
      Alert.alert(
        "Saldo Tidak Mencukupi",
        `Saldo ${sourceAccount?.name ?? "rekening"} Anda: ${formatCurrency(sourceAccount?.balance ?? 0)}`,
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin("");
    setStep("pin");
  }, [amount, sourceAccount]);

  const handlePinConfirm = useCallback(async () => {
    if (pin.length !== 6) return;
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const now = new Date();
    const txId = `TRX${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}${Math.floor(
      Math.random() * 1000,
    )
      .toString()
      .padStart(3, "0")}`;
    setTransactionId(txId);
    setTransactionDate(now.toISOString());

    try {
      if (sourceAccount) {
        updateBalance(sourceAccount.id, sourceAccount.balance - amount);
      }
      addTransaction({
        id: `tx_${Date.now()}`,
        title: billerName,
        subtitle: billId ? `Tagihan ${billId}` : "Pembayaran Tagihan",
        amount,
        type: "debit",
        category: "tagihan",
        date: now.toISOString(),
        accountId: sourceAccount?.id ?? "",
        status: "completed",
        icon: billerIcon,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Notify the FSI backend about the completed payment
      if (cameFromChat) {
        try {
          const result = await reportBillPayment(sessionId, {
            event: "bill_paid",
            billerName,
            billId,
            amount,
          });
          if (result.reply) {
            addMessage({ role: "assistant", content: result.reply });
          }
        } catch {
          // API notification failed - payment still succeeded locally
        }
      }

      setStep("success");
    } catch {
      Alert.alert("Pembayaran Gagal", "Silakan coba lagi");
    } finally {
      setIsLoading(false);
    }
  }, [
    pin,
    amount,
    billerName,
    billId,
    billerIcon,
    cameFromChat,
    sessionId,
    sourceAccount,
    updateBalance,
    addTransaction,
    addMessage,
  ]);

  const goBack = async () => {
    if (step === "success") {
      router.back();
      return;
    }
    if (step === "pin") {
      setStep("confirm");
      return;
    }

    // Leaving before paying: if came from chat, notify backend about cancellation
    if (cameFromChat) {
      try {
        const result = await reportBillPayment(sessionId, {
          event: "bill_cancelled",
          billerName,
          billId,
          amount,
        });
        if (result.reply) {
          addMessage({ role: "assistant", content: result.reply });
        }
      } catch {
        // API notification failed - continue with navigation
      }
    }
    router.back();
  };

  const receiptText = useMemo(() => {
    if (step !== "success") return "";
    const date = new Date(transactionDate);
    return [
      "=== BUKTI PEMBAYARAN ===",
      "",
      `ID Transaksi: ${transactionId}`,
      `Tanggal: ${date.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`,
      `Waktu: ${date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`,
      "",
      "--------------------------",
      `Tagihan: ${billerName}`,
      `ID Tagihan: ${billId ?? "-"}`,
      "",
      `Dibayar: ${formatCurrency(amount)}`,
      `Biaya Admin: Gratis`,
      `Total: ${formatCurrency(amount)}`,
      "",
      `Dari: ${sourceAccount?.name ?? "-"}`,
      "",
      "--------------------------",
      "Status: BERHASIL",
      "=========================",
    ].join("\n");
  }, [
    step,
    transactionId,
    transactionDate,
    billerName,
    billId,
    amount,
    sourceAccount,
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        {step !== "success" && (
          <Pressable
            onPress={goBack}
            hitSlop={20}
            style={({ pressed }) => [
              styles.backBtn,
              pressed && styles.btnPressed,
            ]}
          >
            <Ionicons name="arrow-back" size={24} color={Colors.textPrimary} />
          </Pressable>
        )}
        <Text style={styles.headerTitle}>{STEP_TITLES[step]}</Text>
        <View style={{ width: 56, height: 56 }} />
      </View>

      {step === "pin" ? (
        <PinEntryStep
          pin={pin}
          setPin={setPin}
          isLoading={isLoading}
          onConfirm={handlePinConfirm}
        />
      ) : step === "success" ? (
        <TransactionReceipt
          title="Pembayaran Berhasil"
          date={transactionDate}
          amount={amount}
          rows={[
            { label: "ID Transaksi", value: transactionId },
            {
              label: "Tanggal",
              value: transactionDate
                ? formatReceiptDate(transactionDate, false)
                : "-",
            },
            { label: "Tagihan", value: billerName },
            { label: "ID Tagihan", value: billId ?? "-" },
            { label: "Jumlah Tagihan", value: formatCurrency(amount) },
            { label: "Biaya Admin", value: "Gratis", green: true },
            {
              label: "Rekening Sumber",
              value: sourceAccount?.accountNumber ?? "-",
            },
          ]}
          shareText={receiptText}
          receiptName="Bukti Pembayaran"
          onDone={() => router.back()}
        />
      ) : (
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
          <Animated.View
            entering={FadeInDown.springify()}
            style={styles.stepContainer}
          >
            {/* Biller identity */}
            <View style={styles.billerCard}>
              <View style={styles.billerIcon}>
                <Ionicons name={billerIcon as any} size={20} color="#fff" />
              </View>
              <View style={styles.billerInfo}>
                <Text style={styles.billerName}>{billerName}</Text>
                <Text style={styles.billerSub}>
                  {billerCode || "Tagihan"}
                  {billId ? ` • ${billId}` : ""}
                </Text>
              </View>
            </View>

            <ConfirmCard
              label="Anda akan membayar"
              amount={amount}
              rows={[
                { label: "Tagihan", value: billerName },
                { label: "ID Tagihan", value: billId ?? "-" },
                {
                  label: "Dari",
                  value: `${sourceAccount?.name ?? "-"} (${formatCurrency(sourceAccount?.balance ?? 0)})`,
                },
                { label: "Biaya Admin", value: "Gratis", green: true },
              ]}
            />

            <SourceOfFundCard
              sourceAccount={sourceAccount}
              otherAccounts={otherAccounts}
              onSelect={(account) => setSourceAccountId(account.id)}
            />

            <Pressable
              onPress={handleConfirm}
              style={({ pressed }) => pressed && styles.btnPressed}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryLight]}
                style={styles.continueBtn}
              >
                <Text style={styles.continueBtnText}>Lanjutkan</Text>
              </LinearGradient>
            </Pressable>
          </Animated.View>
        </ScrollView>
      )}

      <ProcessingOverlay visible={isLoading} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  btnPressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  scroll: { flex: 1 },
  content: { padding: 24 },
  stepContainer: { gap: 12 },
  billerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  billerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.accentTeal,
    alignItems: "center",
    justifyContent: "center",
  },
  billerInfo: { flex: 1, justifyContent: "center" },
  billerName: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  billerSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  continueBtn: {
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
  },
  continueBtnText: { fontSize: 17, fontWeight: "700", color: "#fff" },
});
