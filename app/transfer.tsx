import React, {
  useState,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  Alert,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Colors } from "../constants/colors";
import { useAccountStore } from "../store/accountStore";
import { useChatStore } from "../store/chatStore";
import { Beneficiary } from "../types";
import { formatCurrency } from "../utils/formatters";
import { reportTransaction } from "../services/fsiApi";
import PinEntryStep from "../components/transaction/PinEntryStep";
import ProcessingOverlay from "../components/transaction/ProcessingOverlay";
import TransactionReceipt, {
  formatReceiptDate,
} from "../components/transaction/TransactionReceipt";
import ConfirmCard from "../components/transaction/ConfirmCard";
import SourceOfFundCard from "../components/transaction/SourceOfFundCard";

const formatAmount = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseAmount = (value: string) => {
  return parseFloat(value.replace(/\./g, "")) || 0;
};

type Step = "select" | "amount" | "confirm" | "pin" | "success";

const STEP_TITLES: Record<Step, string> = {
  select: "Transfer Dana",
  amount: "Masukkan Jumlah",
  confirm: "Konfirmasi Transfer",
  pin: "Masukkan PIN",
  success: "Transfer Terkirim!",
};

const DEFAULT_PIN = "";

export default function TransferScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const { beneficiaries, accounts, addTransaction, updateBalance } =
    useAccountStore();
  const { addMessage, sessionId } = useChatStore();
  const [step, setStep] = useState<Step>("select");
  const [selected, setSelected] = useState<Beneficiary | null>(null);
  const [amount, setAmount] = useState("");
  const [fromAccount, setFromAccount] = useState<"checking" | "savings">(
    "checking",
  );
  const [sourceAccountId, setSourceAccountId] = useState<string | null>(null);
  const [transactionType, setTransactionType] = useState<
    "immediate" | "scheduled" | "recurring"
  >("immediate");
  const [note, setNote] = useState("");
  const [pin, setPin] = useState(DEFAULT_PIN);
  const [isLoading, setIsLoading] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const initializedRef = useRef(false);

  const beneficiaryId =
    typeof searchParams.beneficiaryId === "string"
      ? searchParams.beneficiaryId
      : undefined;
  const paramAmount =
    typeof searchParams.amount === "string" ? searchParams.amount : undefined;
  const paramDesc =
    typeof searchParams.desc === "string" ? searchParams.desc : undefined;
  const newAccountName =
    typeof searchParams.newAccountName === "string"
      ? searchParams.newAccountName
      : undefined;
  const newAccountNumber =
    typeof searchParams.newAccountNumber === "string"
      ? searchParams.newAccountNumber
      : undefined;
  const newBankName =
    typeof searchParams.newBankName === "string"
      ? searchParams.newBankName
      : undefined;

  // Pre-fill from chat navigation params, but only when those params actually change.
  useEffect(() => {
    if (!beneficiaryId) return;

    const ben = beneficiaries.find((b) => b.id === beneficiaryId);
    if (!ben) return;

    setSelected((current) => (current?.id === ben.id ? current : ben));
    setStep((current) => (current === "select" ? "amount" : current));
  }, [beneficiaryId, beneficiaries]);

  // Pre-fill from new account params (not in beneficiary list)
  useEffect(() => {
    if (!newAccountName || !newAccountNumber) return;

    const initials = newAccountName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();

    const newBen: Beneficiary = {
      id: `new_${newAccountNumber}`,
      name: newAccountName,
      accountNumber: newAccountNumber,
      bankName: newBankName,
      initials,
      color: Colors.accentPurple,
    };

    setSelected(newBen);
    setStep("amount");
  }, [newAccountName, newAccountNumber, newBankName]);

  useEffect(() => {
    if (!paramAmount) return;

    const rawDigits = paramAmount.replace(/\D/g, "");
    setAmount(formatAmount(rawDigits));
  }, [paramAmount]);

  useEffect(() => {
    if (paramDesc) {
      setNote(paramDesc);
    }
  }, [paramDesc]);

  useEffect(() => {
    if (!accounts.length || initializedRef.current) return;

    const requestedType =
      typeof searchParams.fromAccount === "string"
        ? (searchParams.fromAccount as "checking" | "savings")
        : undefined;
    const preferredAccount =
      accounts.find((account) => account.type === requestedType) ??
      accounts.find((account) => account.type === "checking") ??
      accounts[0];

    if (preferredAccount) {
      setSourceAccountId(preferredAccount.id);
      setFromAccount(preferredAccount.type);
      initializedRef.current = true;
    }
  }, [accounts, searchParams.fromAccount]);

  const sourceAccount = useMemo(
    () =>
      accounts.find((account) => account.id === sourceAccountId) ??
      accounts.find((account) => account.type === fromAccount) ??
      accounts[0],
    [accounts, sourceAccountId, fromAccount],
  );

  const otherAccounts = useMemo(
    () => accounts.filter((account) => account.id !== sourceAccountId),
    [accounts, sourceAccountId],
  );

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

  const cameFromChat = Boolean(searchParams.beneficiaryId);

  const handlePinConfirm = useCallback(async () => {
    if (!selected || pin.length !== 6) return;
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
      // Local transfer - update state directly
      if (sourceAccount) {
        updateBalance(
          sourceAccount.id,
          sourceAccount.balance - parseAmount(amount),
        );
      }
      addTransaction({
        id: `tx_${Date.now()}`,
        title: `Transfer ke ${selected.name}`,
        subtitle: note || "Transfer Pribadi",
        amount: parseAmount(amount),
        type: "debit",
        category: "transfer",
        date: now.toISOString(),
        accountId: sourceAccount?.id ?? "",
        status: "completed",
        icon: "send-outline",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Notify the FSI backend about the completed transaction
      if (cameFromChat) {
        try {
          const result = await reportTransaction(sessionId, {
            event: "transaction_completed",
            recipientName: selected.name,
            amount: parseAmount(amount),
            currency: "IDR",
            note: note || undefined,
          });
          if (result.reply) {
            addMessage({ role: "assistant", content: result.reply });
          }
        } catch {
          // API notification failed - transaction still succeeded locally
        }
      }

      setStep("success");
    } catch {
      Alert.alert("Transfer Gagal", "Silakan coba lagi");
    } finally {
      setIsLoading(false);
    }
  }, [
    selected,
    amount,
    fromAccount,
    note,
    sourceAccount,
    pin,
    updateBalance,
    addTransaction,
    addMessage,
  ]);

  const handleConfirm = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin(DEFAULT_PIN);
    setStep("pin");
  }, []);

  const goBack = async () => {
    // If on success page, just go back without cancel message
    if (step === "success") {
      router.back();
      return;
    }

    // Before success, if came from chat, notify backend about cancellation
    if (cameFromChat && selected) {
      try {
        const result = await reportTransaction(sessionId, {
          event: "transaction_cancelled",
          recipientName: selected.name,
          amount: parseAmount(amount) || undefined,
        });
        if (result.reply) {
          addMessage({ role: "assistant", content: result.reply });
        }
      } catch {
        // API notification failed - continue with navigation
      }

      router.back();
      return;
    }

    // Normal back navigation for direct transfer access
    if (step === "select") {
      router.back();
      return;
    }
    if (step === "amount") setStep("select");
    else if (step === "confirm") setStep("amount");
    else if (step === "pin") setStep("confirm");
    else router.back();
  };

  const receiptText = useMemo(() => {
    if (step !== "success" || !selected) return "";
    const date = new Date(transactionDate);
    return [
      "=== BUKTI TRANSFER ===",
      "",
      `ID Transaksi: ${transactionId}`,
      `Tanggal: ${date.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`,
      `Waktu: ${date.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`,
      "",
      "--------------------------",
      `Penerima: ${selected.name}`,
      `Rekening: ${selected.accountNumber}`,
      `Bank: ${selected.bankName || "-"}`,
      "",
      `Dikirim: ${formatCurrency(parseAmount(amount))}`,
      `Biaya: Gratis`,
      `Total: ${formatCurrency(parseAmount(amount))}`,
      "",
      `Dari: ${sourceAccount?.name ?? (fromAccount === "checking" ? "Rek. Utama" : "Tabungan")}`,
      `Catatan: ${note || "-"}`,
      "",
      "--------------------------",
      "Status: BERHASIL",
      "=========================",
    ].join("\n");
  }, [
    step,
    selected,
    transactionId,
    transactionDate,
    amount,
    fromAccount,
    note,
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {step === "amount" ? (
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={styles.amountHeader}
        >
          <Pressable
            onPress={goBack}
            hitSlop={20}
            style={({ pressed }) => [
              styles.backBtnLight,
              pressed && styles.btnPressed,
            ]}
          >
            <Ionicons name="arrow-back" size={24} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitleLight}>
            {selected
              ? `Transfer to ${selected.bankName || "BCA"} Account`
              : "Transfer to Account"}
          </Text>
          <View style={{ width: 56, height: 56 }} />
        </LinearGradient>
      ) : (
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
              <Ionicons
                name="arrow-back"
                size={24}
                color={Colors.textPrimary}
              />
            </Pressable>
          )}
          <Text style={styles.headerTitle}>{STEP_TITLES[step]}</Text>
          <View style={{ width: 56, height: 56 }} />
        </View>
      )}

      {step === "pin" ? (
        <PinEntryStep
          pin={pin}
          setPin={setPin}
          isLoading={isLoading}
          onConfirm={handlePinConfirm}
        />
      ) : step === "success" ? (
        <TransactionReceipt
          title="Transfer Berhasil"
          date={transactionDate}
          amount={parseAmount(amount)}
          rows={[
            { label: "ID Transaksi", value: transactionId },
            {
              label: "Tanggal",
              value: transactionDate
                ? formatReceiptDate(transactionDate, false)
                : "-",
            },
            { label: "Nama Penerima", value: selected?.name ?? "-" },
            {
              label: "Rekening Penerima",
              value: selected?.accountNumber ?? "-",
            },
            { label: "Bank Penerima", value: selected?.bankName || "-" },
            {
              label: "Jumlah Transfer",
              value: formatCurrency(parseAmount(amount)),
            },
            { label: "Biaya Transfer", value: "Gratis", green: true },
            {
              label: "Rekening Pengirim",
              value: sourceAccount?.accountNumber ?? "-",
            },
          ]}
          shareText={receiptText}
          receiptName="Bukti Transfer"
          onDone={() => router.back()}
        />
      ) : (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          onScroll={() => Keyboard.dismiss()}
          scrollEventThrottle={16}
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
                    <Pressable
                      style={styles.beneficiaryRow}
                      onPress={() => handleSelectBeneficiary(b)}
                    >
                      {({ pressed }) => (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            flex: 1,
                            width: "100%",
                            alignSelf: "stretch",
                            gap: 12,
                            paddingVertical: 12,
                            paddingHorizontal: 16,
                            backgroundColor: pressed
                              ? Colors.border
                              : "transparent",
                          }}
                        >
                          <View
                            style={[
                              styles.beneficiaryAvatar,
                              { backgroundColor: b.color || Colors.primary },
                            ]}
                          >
                            <Text style={styles.beneficiaryInitials}>
                              {b.initials ||
                                b.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")
                                  .slice(0, 2)
                                  .toUpperCase()}
                            </Text>
                          </View>
                          <View style={styles.bInfo}>
                            <Text style={styles.bName}>{b.name}</Text>
                            <Text style={styles.bAccountSub}>
                              {b.bankName || "Bank"} • {b.accountNumber}
                            </Text>
                          </View>
                          <Ionicons
                            name="chevron-forward"
                            size={20}
                            color={Colors.textMuted}
                          />
                        </View>
                      )}
                    </Pressable>
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
              {/* Recipient Identity */}
              {selected && (
                <View style={styles.recipientCard}>
                  <View
                    style={[
                      styles.beneficiaryAvatar,
                      { backgroundColor: selected.color || Colors.primary },
                    ]}
                  >
                    <Text style={styles.beneficiaryInitials}>
                      {selected.initials ||
                        selected.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.bInfo}>
                    <Text style={styles.bName}>{selected.name}</Text>
                    <Text style={styles.bAccountSub}>
                      {selected.bankName || "Bank"} • {selected.accountNumber}
                    </Text>
                  </View>
                </View>
              )}

              {/* Amount Input */}
              <View style={styles.amountCard}>
                <View style={styles.amountRow}>
                  <Text style={styles.currencyLabel}>IDR</Text>
                  <TextInput
                    style={styles.amountTextInput}
                    value={amount}
                    onChangeText={(text) => setAmount(formatAmount(text))}
                    placeholder="0"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                  />
                </View>
                <Text style={styles.balanceHint}>
                  Tersedia: {formatCurrency(sourceAccount?.balance ?? 0)}
                </Text>
              </View>

              {/* Source of Fund */}
              <SourceOfFundCard
                sourceAccount={sourceAccount}
                otherAccounts={otherAccounts}
                onSelect={(account) => {
                  setSourceAccountId(account.id);
                  setFromAccount(account.type);
                }}
              />

              {/* Notes */}
              <TextInput
                style={styles.noteInput}
                value={note}
                onChangeText={setNote}
                placeholder="Transfer untuk apa?"
                placeholderTextColor={Colors.textMuted}
              />

              {/* Continue Button */}
              <Pressable
                onPress={handleAmountContinue}
                style={({ pressed }) => pressed && styles.btnPressed}
                disabled={parseAmount(amount) <= 0}
              >
                <LinearGradient
                  colors={
                    parseAmount(amount) > 0
                      ? [Colors.primary, Colors.primaryLight]
                      : [Colors.border, Colors.border]
                  }
                  style={[
                    styles.continueBtn,
                    parseAmount(amount) <= 0 && styles.continueBtnDisabled,
                  ]}
                >
                  <Text
                    style={[
                      styles.continueBtnText,
                      parseAmount(amount) <= 0 &&
                        styles.continueBtnTextDisabled,
                    ]}
                  >
                    Lanjutkan
                  </Text>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          )}

          {step === "confirm" && (
            <Animated.View
              entering={FadeInDown.springify()}
              style={styles.stepContainer}
            >
              <ConfirmCard
                label="Anda akan mengirim"
                amount={parseAmount(amount)}
                rows={[
                  { label: "Kepada", value: selected?.name },
                  { label: "Rekening", value: selected?.accountNumber },
                  {
                    label: "Dari",
                    value:
                      fromAccount === "checking"
                        ? `Rek. Utama (${formatCurrency(sourceAccount?.balance ?? 0)})`
                        : `Tabungan (${formatCurrency(sourceAccount?.balance ?? 0)})`,
                  },
                  { label: "Biaya", value: "Gratis", green: true },
                  { label: "Catatan", value: note || "Tidak ada" },
                ]}
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
          )}
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
  amountHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backBtnLight: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleLight: {
    flex: 1,
    textAlign: "center",
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
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
    width: "100%",
    gap: 12,
  },
  beneficiaryRowPressed: {
    backgroundColor: Colors.border,
  },
  beneficiaryAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  beneficiaryInitials: {
    fontSize: 14,
    fontWeight: "700",
    color: "#fff",
  },
  bDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: 68,
  },
  pressed: { opacity: 0.6 },
  btnPressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  bInfo: { flex: 1, justifyContent: "center" },
  bTextRow: { flexDirection: "row", alignItems: "center", flexWrap: "nowrap" },
  bName: { fontSize: 14, fontWeight: "600", color: Colors.textPrimary },
  bAccountInline: {
    fontSize: 14,
    fontWeight: "400",
    color: Colors.textMuted,
    marginHorizontal: 4,
  },
  bAccount: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  bAccountSub: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
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
  recipientCard: {
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
  amountCard: {
    backgroundColor: Colors.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    gap: 8,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  currencyLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  amountTextInput: {
    fontSize: 32,
    fontWeight: "700",
    color: Colors.textPrimary,
    flex: 1,
  },
  amountInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  amountInputBox: {
    backgroundColor: Colors.background,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 6,
  },
  amountLabel: {
    fontSize: 13,
    color: Colors.textMuted,
    fontWeight: "600",
  },
  amountInputRow: {
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
  transactionTypeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  transactionTypeChip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: Colors.background,
  },
  transactionTypeChipActive: {
    borderColor: Colors.primary,
    backgroundColor: `${Colors.primary}12`,
  },
  transactionTypeChipText: {
    fontSize: 11,
    fontWeight: "700",
    color: Colors.textSecondary,
    letterSpacing: 0.8,
  },
  transactionTypeChipTextActive: {
    color: Colors.primary,
  },
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
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  continueBtnText: { fontSize: 17, fontWeight: "700", color: "#fff" },
  continueBtnTextDisabled: {
    color: "#fff",
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
