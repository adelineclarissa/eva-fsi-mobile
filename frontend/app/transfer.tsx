import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Colors } from "../constants/colors";
import { useAccountStore } from "../store/accountStore";
import { Beneficiary } from "../types";
import { formatCurrency } from "../utils/formatters";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:3001";

const formatAmount = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseAmount = (value: string) => {
  return parseFloat(value.replace(/\./g, "")) || 0;
};

type Step = "select" | "amount" | "confirm" | "success";

const STEP_TITLES: Record<Step, string> = {
  select: "Kirim Uang",
  amount: "Masukkan Jumlah",
  confirm: "Konfirmasi Transfer",
  success: "Transfer Terkirim!",
};

export default function TransferScreen() {
  const router = useRouter();
  const { beneficiaries, accounts, addTransaction, updateBalance } =
    useAccountStore();
  const [step, setStep] = useState<Step>("select");
  const [selected, setSelected] = useState<Beneficiary | null>(null);
  const [amount, setAmount] = useState("");
  const [fromAccount, setFromAccount] = useState<"checking" | "savings">(
    "checking",
  );
  const [note, setNote] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const sourceAccount = accounts.find((a) => a.type === fromAccount);

  const handleSelectBeneficiary = (b: Beneficiary) => {
    Haptics.selectionAsync();
    setSelected(b);
    setStep("amount");
  };

  const handleAmountContinue = () => {
    const parsed = parseAmount(amount);
    if (parsed <= 0) {
      Alert.alert(
        "Jumlah Tidak Valid",
        "Masukkan jumlah yang valid lebih dari 0",
      );
      return;
    }
    if (parsed > (sourceAccount?.balance ?? 0)) {
      Alert.alert(
        "Saldo Tidak Mencukupi",
        `Saldo ${fromAccount === "checking" ? "rekening utama" : "tabungan"} Anda: ${formatCurrency(sourceAccount?.balance ?? 0)}`,
      );
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep("confirm");
  };

  const handleConfirm = useCallback(async () => {
    if (!selected) return;
    setIsLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const response = await fetch(`${API_URL}/transfer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          toBeneficiaryName: selected.name,
          amount: parseAmount(amount),
          currency: "IDR",
          fromAccount,
          note,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (sourceAccount) updateBalance(sourceAccount.id, data.newBalance);
        addTransaction({
          id: data.transactionId,
          title: `Transfer ke ${selected.name}`,
          subtitle: note || "Transfer Pribadi",
          amount: parseAmount(amount),
          type: "debit",
          category: "transfer",
          date: new Date().toISOString(),
          accountId: sourceAccount?.id ?? "",
          status: "completed",
          icon: "send-outline",
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setStep("success");
      } else {
        Alert.alert("Transfer Gagal", data.error || "Silakan coba lagi");
      }
    } catch {
      if (sourceAccount)
        updateBalance(
          sourceAccount.id,
          sourceAccount.balance - parseAmount(amount),
        );
      addTransaction({
        id: `tx_${Date.now()}`,
        title: `Transfer ke ${selected.name}`,
        subtitle: note || "Transfer Pribadi",
        amount: parseAmount(amount),
        type: "debit",
        category: "transfer",
        date: new Date().toISOString(),
        accountId: sourceAccount?.id ?? "",
        status: "completed",
        icon: "send-outline",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("success");
    } finally {
      setIsLoading(false);
    }
  }, [selected, amount, fromAccount, note, sourceAccount]);

  const goBack = () => {
    if (step === "select") router.back();
    else if (step === "amount") setStep("select");
    else if (step === "confirm") setStep("amount");
    else router.back();
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          onPress={goBack}
          style={({ pressed }) => [
            styles.backBtn,
            pressed && styles.btnPressed,
          ]}
        >
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>{STEP_TITLES[step]}</Text>
        <View style={styles.backBtn} />
      </View>

      {step === "success" ? (
        <Animated.View
          entering={ZoomIn.springify()}
          style={styles.successContainer}
        >
          <LinearGradient
            colors={[Colors.accentGreen, Colors.accentTeal]}
            style={styles.successIcon}
          >
            <Ionicons name="checkmark" size={40} color="#fff" />
          </LinearGradient>
          <Text style={styles.successTitle}>Transfer Berhasil!</Text>
          <Text style={styles.successAmount}>
            {formatCurrency(parseAmount(amount))}
          </Text>
          <Text style={styles.successRecipient}>
            dikirim ke {selected?.name}
          </Text>
          <View style={styles.successCard}>
            <Text style={styles.successDetail}>ID Transaksi</Text>
            <Text style={styles.successDetailValue}>
              TRX{Date.now().toString().slice(-8)}
            </Text>
          </View>
          <Pressable
            style={({ pressed }) => [
              styles.doneBtn,
              pressed && styles.btnPressed,
            ]}
            onPress={() => router.back()}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryLight]}
              style={styles.doneBtnGradient}
            >
              <Text style={styles.doneBtnText}>Selesai</Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {step === "select" && (
            <Animated.View
              entering={FadeInDown.springify()}
              style={styles.stepContainer}
            >
              <Text style={styles.stepLabel}>Pilih Penerima</Text>
              <View style={styles.beneficiaryContainer}>
                {beneficiaries.map((b, i) => (
                  <Animated.View
                    key={b.id}
                    entering={FadeInDown.delay(i * 40).springify()}
                  >
                    <View style={styles.beneficiaryRow}>
                      <View style={styles.bInfo}>
                        <Text style={styles.bName} numberOfLines={1}>
                          {b.name}
                        </Text>
                        <Text style={styles.bAccount} numberOfLines={1}>
                          {b.accountNumber}
                        </Text>
                      </View>
                      <Pressable
                        style={({ pressed }) => [
                          styles.sendBtn,
                          pressed && styles.sendBtnPressed,
                        ]}
                        onPress={() => handleSelectBeneficiary(b)}
                      >
                        <Text style={styles.sendBtnText}>Send</Text>
                      </Pressable>
                    </View>
                    {i < beneficiaries.length - 1 && (
                      <View style={styles.bDivider} />
                    )}
                  </Animated.View>
                ))}
              </View>
            </Animated.View>
          )}

          {step === "amount" && (
            <Animated.View
              entering={FadeInDown.springify()}
              style={styles.stepContainer}
            >
              <View style={styles.recipientInfo}>
                <Text style={styles.recipientName}>ke {selected?.name}</Text>
                <Text style={styles.bAccount}>{selected?.accountNumber}</Text>
              </View>

              <View style={styles.amountInput}>
                <Text style={styles.currencySymbol}>Rp</Text>
                <TextInput
                  style={styles.amountText}
                  value={amount}
                  onChangeText={(text) => setAmount(formatAmount(text))}
                  placeholder="0"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numeric"
                  autoFocus
                />
              </View>

              <Text style={styles.balanceHint}>
                Tersedia: {formatCurrency(sourceAccount?.balance ?? 0)}
              </Text>

              <View style={styles.accountSelector}>
                {(["checking", "savings"] as const).map((type) => {
                  const acc = accounts.find((a) => a.type === type);
                  const label = type === "checking" ? "Rek. Utama" : "Tabungan";
                  return (
                    <Pressable
                      key={type}
                      style={({ pressed }) => [
                        styles.accountOption,
                        fromAccount === type && styles.accountOptionActive,
                        pressed && styles.btnPressed,
                      ]}
                      onPress={() => setFromAccount(type)}
                    >
                      <Text
                        style={[
                          styles.accountOptionText,
                          fromAccount === type &&
                            styles.accountOptionTextActive,
                        ]}
                      >
                        {label}: {formatCurrency(acc?.balance ?? 0)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="Tambahkan catatan (opsional)"
                placeholderTextColor={Colors.textMuted}
              />

              <Pressable
                onPress={handleAmountContinue}
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
          )}

          {step === "confirm" && (
            <Animated.View
              entering={FadeInDown.springify()}
              style={styles.stepContainer}
            >
              <View style={styles.confirmCard}>
                <Text style={styles.confirmLabel}>Anda akan mengirim</Text>
                <Text style={styles.confirmAmount}>
                  {formatCurrency(parseAmount(amount))}
                </Text>
                <View style={styles.confirmDetails}>
                  {[
                    { label: "Kepada", value: selected?.name },
                    { label: "Rekening", value: selected?.accountNumber },
                    {
                      label: "Dari",
                      value:
                        fromAccount === "checking"
                          ? `Rek. Utama (${formatCurrency(sourceAccount?.balance ?? 0)})`
                          : `Tabungan (${formatCurrency(sourceAccount?.balance ?? 0)})`,
                    },
                    { label: "Biaya", value: "Gratis" },
                    { label: "Catatan", value: note || "Tidak ada" },
                  ].map(({ label, value }) => (
                    <View key={label} style={styles.confirmRow}>
                      <Text style={styles.confirmRowLabel}>{label}</Text>
                      <Text
                        style={[
                          styles.confirmRowValue,
                          label === "Biaya" && { color: Colors.success },
                        ]}
                      >
                        {value}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <Pressable
                onPress={handleConfirm}
                disabled={isLoading}
                style={({ pressed }) =>
                  !isLoading && pressed && styles.btnPressed
                }
              >
                <LinearGradient
                  colors={
                    isLoading
                      ? [Colors.border, Colors.border]
                      : [Colors.primary, Colors.primaryLight]
                  }
                  style={styles.continueBtn}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.continueBtnText}>
                      Konfirmasi Transfer
                    </Text>
                  )}
                </LinearGradient>
              </Pressable>
            </Animated.View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: Colors.textPrimary },
  scroll: { flex: 1 },
  content: { padding: 24 },
  stepContainer: { gap: 12 },
  stepLabel: {
    fontSize: 15,
    color: Colors.textMuted,
    fontWeight: "500",
    marginBottom: 0,
  },
  beneficiaryContainer: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: "hidden",
  },
  beneficiaryRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 16,
  },
  bDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: 16,
  },
  pressed: { opacity: 0.6 },
  btnPressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  bInfo: { flex: 1, marginRight: 12 },
  bName: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  bAccount: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  sendBtn: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
  },
  sendBtnPressed: { opacity: 0.6 },
  sendBtnText: { fontSize: 13, fontWeight: "600", color: Colors.textPrimary },
  recipientInfo: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 12,
  },
  recipientName: { fontSize: 17, fontWeight: "600", color: Colors.textPrimary },
  amountInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: "700",
    color: Colors.textSecondary,
    marginTop: 6,
  },
  amountText: {
    fontSize: 52,
    fontWeight: "800",
    color: Colors.textPrimary,
    minWidth: 100,
    textAlign: "center",
  },
  balanceHint: { textAlign: "center", fontSize: 13, color: Colors.textMuted },
  accountSelector: { flexDirection: "row", gap: 10 },
  accountOption: {
    flex: 1,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    padding: 12,
    alignItems: "center",
  },
  accountOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}12`,
  },
  accountOptionText: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: "500",
    textAlign: "center",
  },
  accountOptionTextActive: { color: Colors.primary, fontWeight: "700" },
  noteInput: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.textPrimary,
    fontSize: 15,
  },
  continueBtn: {
    borderRadius: 18,
    padding: 18,
    alignItems: "center",
    marginTop: 8,
  },
  continueBtnText: { fontSize: 17, fontWeight: "700", color: "#fff" },
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
  successContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    gap: 12,
  },
  successIcon: {
    width: 88,
    height: 88,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  successTitle: { fontSize: 24, fontWeight: "800", color: Colors.textPrimary },
  successAmount: { fontSize: 36, fontWeight: "800", color: Colors.textPrimary },
  successRecipient: { fontSize: 16, color: Colors.textMuted },
  successCard: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    gap: 4,
    width: "100%",
  },
  successDetail: { fontSize: 12, color: Colors.textMuted },
  successDetailValue: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  doneBtn: {
    width: "100%",
    borderRadius: 18,
    overflow: "hidden",
    marginTop: 16,
  },
  doneBtnGradient: { padding: 18, alignItems: "center" },
  doneBtnText: { fontSize: 17, fontWeight: "700", color: "#fff" },
});
