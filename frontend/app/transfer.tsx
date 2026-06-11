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
  Share,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import * as MediaLibrary from "expo-media-library";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter, useLocalSearchParams } from "expo-router";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Colors } from "../constants/colors";
import { useAccountStore } from "../store/accountStore";
import { useChatStore } from "../store/chatStore";
import { Beneficiary } from "../types";
import { formatCurrency } from "../utils/formatters";

const formatAmount = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};

const parseAmount = (value: string) => {
  return parseFloat(value.replace(/\./g, "")) || 0;
};

type Step = "select" | "amount" | "confirm" | "pin" | "success";

const STEP_TITLES: Record<Step, string> = {
  select: "Kirim Uang",
  amount: "Masukkan Jumlah",
  confirm: "Konfirmasi Transfer",
  pin: "Masukkan PIN",
  success: "Transfer Terkirim!",
};

const DEFAULT_PIN = "";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const PIN_INPUT_WIDTH = Math.min(SCREEN_WIDTH - 48, 360);

function PinEntryStep({
  pin,
  setPin,
  isLoading,
  onConfirm,
}: {
  pin: string;
  setPin: (p: string | ((prev: string) => string)) => void;
  isLoading: boolean;
  onConfirm: () => void;
}) {
  const inputRef = React.useRef<TextInput>(null);

  React.useEffect(() => {
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

export default function TransferScreen() {
  const router = useRouter();
  const searchParams = useLocalSearchParams();
  const { beneficiaries, accounts, addTransaction, updateBalance } =
    useAccountStore();
  const { addMessage } = useChatStore();
  const [step, setStep] = useState<Step>("select");
  const [selected, setSelected] = useState<Beneficiary | null>(null);
  const [amount, setAmount] = useState("");
  const [fromAccount, setFromAccount] = useState<"checking" | "savings">(
    "checking",
  );
  const [sourceAccountId, setSourceAccountId] = useState<string | null>(null);
  const [showAccountDropdown, setShowAccountDropdown] = useState(false);
  const [transactionType, setTransactionType] = useState<
    "immediate" | "scheduled" | "recurring"
  >("immediate");
  const [note, setNote] = useState("");
  const [pin, setPin] = useState(DEFAULT_PIN);
  const [isLoading, setIsLoading] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [transactionDate, setTransactionDate] = useState("");
  const receiptRef = useRef<View>(null);
  const initializedRef = useRef(false);

  const beneficiaryId =
    typeof searchParams.beneficiaryId === "string"
      ? searchParams.beneficiaryId
      : undefined;
  const paramAmount =
    typeof searchParams.amount === "string" ? searchParams.amount : undefined;
  const paramDesc =
    typeof searchParams.desc === "string" ? searchParams.desc : undefined;

  // Pre-fill from chat navigation params, but only when those params actually change.
  useEffect(() => {
    if (!beneficiaryId) return;

    const ben = beneficiaries.find((b) => b.id === beneficiaryId);
    if (!ben) return;

    setSelected((current) => (current?.id === ben.id ? current : ben));
    setStep((current) => (current === "select" ? "amount" : current));
  }, [beneficiaryId, beneficiaries]);

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

      addMessage({
        role: "user",
        content: `I completed a transfer of ${formatCurrency(parseAmount(amount))} to ${selected.name}${note ? ` (${note})` : ""}.`,
      });

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

  const handleDownload = useCallback(async () => {
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Izin diperlukan",
          "Izinkan akses galeri untuk menyimpan bukti transfer.",
        );
        return;
      }
      const uri = await captureRef(receiptRef, { format: "png", quality: 1 });
      await MediaLibrary.saveToLibraryAsync(uri);
      Alert.alert("Tersimpan!", "Bukti transfer berhasil disimpan ke galeri.");
    } catch {
      Alert.alert("Gagal", "Tidak dapat menyimpan bukti transfer.");
    }
  }, []);

  const handleConfirm = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin(DEFAULT_PIN);
    setStep("pin");
  }, []);

  const goBack = () => {
    // If on success page, just go back without cancel message
    if (step === "success") {
      router.back();
      return;
    }

    // Before success, if came from chat, cancel transfer
    if (cameFromChat) {
      if (selected) {
        addMessage({
          role: "user",
          content: `I cancelled the transfer to ${selected.name}.`,
        });
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

  const handleShareReceipt = async () => {
    try {
      await Share.share({
        message: receiptText,
        title: "Bukti Transfer",
      });
    } catch (error) {
      // User cancelled share
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {step === "amount" ? (
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight]}
          style={styles.amountHeader}
        >
          <Pressable
            onPress={goBack}
            style={({ pressed }) => [
              styles.backBtnLight,
              pressed && styles.btnPressed,
            ]}
          >
            <Ionicons name="arrow-back" size={20} color="#fff" />
          </Pressable>
          <Text style={styles.headerTitleLight}>
            {selected
              ? `Transfer to ${selected.bankName || "BCA"} Account`
              : "Transfer to Account"}
          </Text>
          <View style={styles.backBtnLight} />
        </LinearGradient>
      ) : (
        <View style={styles.header}>
          {step !== "success" && (
            <Pressable
              onPress={goBack}
              style={({ pressed }) => [
                styles.backBtn,
                pressed && styles.btnPressed,
              ]}
            >
              <Ionicons
                name="arrow-back"
                size={20}
                color={Colors.textPrimary}
              />
            </Pressable>
          )}
          <Text style={styles.headerTitle}>{STEP_TITLES[step]}</Text>
          <View style={styles.backBtn} />
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
        <View style={styles.receiptOuter}>
          <ScrollView
            style={styles.receiptScroll}
            contentContainerStyle={styles.receiptScrollContent}
          >
            <View ref={receiptRef} style={styles.receiptCard}>
              <View style={styles.receiptCheckCircle}>
                <Ionicons name="checkmark" size={36} color="#fff" />
              </View>

              <Text style={styles.receiptTitle}>Transfer Berhasil</Text>
              <Text style={styles.receiptDateTime}>
                {transactionDate
                  ? new Date(transactionDate).toLocaleDateString("id-ID", {
                      day: "2-digit",
                      month: "long",
                      year: "numeric",
                    }) +
                    " " +
                    new Date(transactionDate).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })
                  : ""}
              </Text>

              <Text style={styles.receiptAmount}>
                {formatCurrency(parseAmount(amount))}
              </Text>

              <View style={styles.receiptDivider} />

              {[
                { label: "ID Transaksi", value: transactionId },
                {
                  label: "Tanggal",
                  value: transactionDate
                    ? new Date(transactionDate).toLocaleDateString("id-ID", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                      }) +
                      " " +
                      new Date(transactionDate).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
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
              ].map(({ label, value, green }, i, arr) => (
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
              onPress={handleShareReceipt}
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
                <Ionicons
                  name="download-outline"
                  size={20}
                  color={Colors.primary}
                />
              </View>
            </Pressable>
            <Pressable
              style={({ pressed }) => [
                styles.receiptDoneWrapper,
                { backgroundColor: pressed ? "#153d7a" : "transparent" },
              ]}
              onPress={() => router.back()}
            >
              <View style={styles.receiptDoneBtn}>
                <Text style={styles.receiptDoneBtnText}>Selesai</Text>
              </View>
            </Pressable>
          </View>
        </View>
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
              <View style={styles.amountCard}>
                <View style={styles.recipientInfo}>
                  <Text style={styles.recipientName}>ke {selected?.name}</Text>
                  <Text style={styles.bAccount}>{selected?.accountNumber}</Text>
                </View>

                <View style={styles.amountInputBox}>
                  <Text style={styles.amountLabel}>Jumlah transfer</Text>
                  <View style={styles.amountInputRow}>
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
                </View>

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
                        name={
                          showAccountDropdown ? "chevron-up" : "chevron-down"
                        }
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
                            setSourceAccountId(account.id);
                            setFromAccount(account.type);
                            setShowAccountDropdown(false);
                          }}
                        >
                          <View style={styles.accountDropdownInner}>
                            <View
                              style={[
                                styles.accountDropdownIcon,
                                {
                                  backgroundColor:
                                    account.color ?? Colors.primary,
                                },
                              ]}
                            >
                              <Ionicons name="card" size={18} color="#fff" />
                            </View>
                            <View style={styles.accountDropdownTextContainer}>
                              <Text style={styles.accountDropdownName}>
                                {account.name}
                              </Text>
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

                <View style={styles.transactionTypeRow}>
                  {[
                    { key: "immediate", label: "IMMEDIATE" },
                    { key: "scheduled", label: "SCHEDULED" },
                    { key: "recurring", label: "RECURRING" },
                  ].map((item) => (
                    <Pressable
                      key={item.key}
                      onPress={() =>
                        setTransactionType(item.key as typeof transactionType)
                      }
                      style={[
                        styles.transactionTypeChip,
                        transactionType === item.key &&
                          styles.transactionTypeChipActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.transactionTypeChipText,
                          transactionType === item.key &&
                            styles.transactionTypeChipTextActive,
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
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
              </View>
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
  amountHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  backBtnLight: {
    width: 40,
    height: 40,
    borderRadius: 14,
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
  amountCard: {
    backgroundColor: Colors.card,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 18,
    gap: 14,
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

  // PIN styles — matches reference: white card top + gray keypad bottom
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

  // Receipt styles
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
