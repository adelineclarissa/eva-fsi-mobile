import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInUp,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { Colors } from "../../constants/colors";
import { useChatStore } from "../../store/chatStore";
import { useAccountStore } from "../../store/accountStore";
import { useRouter } from "expo-router";
import { ChatMessage, Beneficiary } from "../../types";
import ChatBubble from "../../components/chat/ChatBubble";
import TypingIndicator from "../../components/chat/TypingIndicator";
import SuggestedPrompts from "../../components/chat/SuggestedPrompts";
import { sendChatMessage, LlmActionPayload } from "../../services/fsiApi";

function searchBeneficiaries(
  beneficiaries: Beneficiary[],
  keyword: string,
): Beneficiary[] {
  const lower = keyword.toLowerCase().trim();
  if (!lower) return [];
  return beneficiaries.filter((b) => b.name.toLowerCase().includes(lower));
}

function extractTransferBeneficiaryName(
  actionPayload: LlmActionPayload | null,
): string | null {
  if (!actionPayload || actionPayload.action !== "transfer") return null;
  const data = actionPayload.data;
  return (
    (data.name as string) ??
    (data.beneficiary_name as string) ??
    (data.toBeneficiaryName as string) ??
    (data.recipient as string) ??
    null
  );
}

function extractTransferAccountNumber(
  actionPayload: LlmActionPayload | null,
): string | null {
  if (!actionPayload || actionPayload.action !== "transfer") return null;
  const data = actionPayload.data;
  return (
    (data.accountNumber as string) ??
    (data.account_number as string) ??
    (data.recipientAccount as string) ??
    (data.recipient_account as string) ??
    (data.toAccount as string) ??
    (data.to_account as string) ??
    null
  );
}

function extractTransferBankName(
  actionPayload: LlmActionPayload | null,
): string | null {
  if (!actionPayload || actionPayload.action !== "transfer") return null;
  const data = actionPayload.data;
  return (
    (data.bankName as string) ??
    (data.bank_name as string) ??
    (data.recipientBank as string) ??
    (data.recipient_bank as string) ??
    null
  );
}

export default function ChatScreen() {
  const [inputText, setInputText] = useState("");
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const suggestionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();

  // Track keyboard show/hide
  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
        // Scroll to bottom after keyboard animation starts
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      },
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const {
    messages,
    isLoading,
    sessionId,
    addMessage,
    setLoading,
    clearChat,
    pendingSelection,
    selectedBeneficiary,
    completedBenefCardIds,
    addBeneficiarySelectionMessage,
    addSelectionResultMessage,
    clearPendingSelection,
    cancelPendingSelection,
    setSelectedBeneficiary,
  } = useChatStore();
  const { beneficiaries, user } = useAccountStore();

  useEffect(() => {
    const scrollToBottom = () =>
      flatListRef.current?.scrollToEnd({ animated: true });
    requestAnimationFrame(() => requestAnimationFrame(scrollToBottom));
  }, [messages.length, isLoading, suggestionsVisible, pendingSelection]);

  // Dismiss keyboard when pending selection appears
  useEffect(() => {
    if (pendingSelection) {
      Keyboard.dismiss();
    }
  }, [pendingSelection]);

  // Show suggestions 3 seconds after an assistant reply, unless user replies first
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    const shouldTrigger =
      !isLoading && !pendingSelection && lastMessage?.role === "assistant";

    if (shouldTrigger) {
      // Clear any existing timer
      if (suggestionTimerRef.current) {
        clearTimeout(suggestionTimerRef.current);
      }
      setSuggestionsVisible(false);
      suggestionTimerRef.current = setTimeout(() => {
        setSuggestionsVisible(true);
      }, 3000);
    }

    return () => {
      if (suggestionTimerRef.current) {
        clearTimeout(suggestionTimerRef.current);
      }
    };
  }, [messages.length, isLoading, pendingSelection]);

  // Hide suggestions when user sends a new message
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === "user") {
      setSuggestionsVisible(false);
      if (suggestionTimerRef.current) {
        clearTimeout(suggestionTimerRef.current);
      }
    }
  }, [messages.length]);

  const handleBeneficiarySelect = useCallback(
    (beneficiary: Beneficiary) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      // Must run before clearPendingSelection so the messageId is captured
      addSelectionResultMessage(beneficiary);
      setSelectedBeneficiary(null);

      // Navigate to transfer screen with pre-filled data
      router.push({
        pathname: "/transfer",
        params: {
          beneficiaryId: beneficiary.id,
          amount: String(pendingSelection?.amount ?? ""),
          desc: pendingSelection?.desc ?? "",
        },
      });
    },
    [pendingSelection, addSelectionResultMessage, router],
  );

  const sendChat = useCallback(
    async (messageText: string) => {
      if (isLoading) return;

      addMessage({ role: "user", content: messageText });
      setLoading(true);
      try {
        const result = await sendChatMessage(messageText, sessionId);

        // Check if the LLM returned a transfer intent with a beneficiary name
        const beneficiaryName = extractTransferBeneficiaryName(
          result.actionPayload,
        );
        const accountNumber = extractTransferAccountNumber(
          result.actionPayload,
        );
        const bankName = extractTransferBankName(result.actionPayload);

        if (beneficiaryName) {
          // Search beneficiaries first
          const matches = searchBeneficiaries(beneficiaries, beneficiaryName);

          if (matches.length > 0) {
            // Found matches — show intent confirmation + selection UI
            const amount = result.actionPayload?.data.amount;
            const desc = result.actionPayload?.data.desc;
            const intentText = amount
              ? `Transfer Rp ${Number(amount).toLocaleString("id-ID")} ke ${beneficiaryName}${desc ? ` (${desc})` : ""}`
              : `Transfer ke ${beneficiaryName}`;
            addMessage({
              role: "assistant",
              content: intentText,
              toolsUsed: result.toolsUsed,
            });

            addBeneficiarySelectionMessage({
              keyword: beneficiaryName,
              matches,
              amount: amount ? Number(amount) : undefined,
              desc: desc ? String(desc) : undefined,
            });
          } else {
            // No matches — call LLM again to ask user for account number
            const amount = result.actionPayload?.data.amount;
            const desc = result.actionPayload?.data.desc;
            const amountStr = amount
              ? ` sebesar Rp ${Number(amount).toLocaleString("id-ID")}`
              : "";
            const descStr = desc ? ` dengan catatan "${desc}"` : "";

            const prompt = `User ingin melakukan transfer${amountStr} ke "${beneficiaryName}"${descStr}. Saya sudah mencari "${beneficiaryName}" di daftar penerima (beneficiary) user dan tidak ditemukan. Tolong beri tahu user bahwa "${beneficiaryName}" tidak ditemukan di daftar penerima, lalu minta user untuk memasukkan nomor rekening tujuan. Jangan asumsikan nomor rekening. Tunggu user memberikan nomor rekening sebelum melanjutkan.`;
            const llmResult = await sendChatMessage(prompt, sessionId);
            addMessage({
              role: "assistant",
              content: llmResult.reply,
              toolsUsed: llmResult.toolsUsed,
            });
          }
        } else if (accountNumber && beneficiaryName) {
          // Transfer with account number (not in beneficiary list) — navigate directly
          const amount = result.actionPayload?.data.amount;
          const desc = result.actionPayload?.data.desc;
          const intentText = amount
            ? `Transfer Rp ${Number(amount).toLocaleString("id-ID")} ke ${beneficiaryName} (${accountNumber})${desc ? ` (${desc})` : ""}`
            : `Transfer ke ${beneficiaryName} (${accountNumber})`;
          addMessage({
            role: "assistant",
            content: intentText,
            toolsUsed: result.toolsUsed,
          });

          // Navigate to transfer with new account params
          router.push({
            pathname: "/transfer",
            params: {
              newAccountName: beneficiaryName,
              newAccountNumber: accountNumber,
              newBankName: bankName ?? "",
              amount: amount ? String(amount) : "",
              desc: desc ? String(desc) : "",
            },
          });
        } else {
          // No transfer intent — just add the normal reply
          addMessage({
            role: "assistant",
            content: result.reply,
            toolsUsed: result.toolsUsed,
          });
        }
      } catch {
        addMessage({
          role: "assistant",
          content: "Gagal terhubung ke server. Periksa koneksi dan coba lagi.",
        });
      } finally {
        setLoading(false);
      }
    },
    [
      isLoading,
      sessionId,
      addMessage,
      setLoading,
      beneficiaries,
      addBeneficiarySelectionMessage,
    ],
  );

  const sendMessage = useCallback(() => {
    const messageText = inputText.trim();
    if (!messageText) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText("");
    sendChat(messageText);
  }, [inputText, sendChat]);

  const handleCancelTransaction = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    cancelPendingSelection();
    setSelectedBeneficiary(null);
    setInputText("");

    // Send cancellation context to the bot without showing a user message bubble
    const cancelPrompt =
      'User sebelumnya berniat melakukan transaksi, namun belum ada eksekusi. Dengan menekan "batalkan transaksi", user membatalkan niat tersebut (bukan transaksi yang sudah terjadi). Hentikan konteks transaksi, jangan asumsi user masih ingin bertransaksi, dan tanyakan kembali apakah ada yang bisa dibantu.';

    setLoading(true);
    sendChatMessage(cancelPrompt, sessionId)
      .then((result) => {
        addMessage({
          role: "assistant",
          content: result.reply,
          toolsUsed: result.toolsUsed,
        });
      })
      .catch(() => {
        addMessage({
          role: "assistant",
          content: "Gagal terhubung ke server. Periksa koneksi dan coba lagi.",
        });
      })
      .finally(() => {
        setLoading(false);
      });
  }, [
    cancelPendingSelection,
    setSelectedBeneficiary,
    addMessage,
    setLoading,
    sessionId,
  ]);

  const handleCapabilityTap = useCallback(
    (prompt: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setInputText("");
      sendChat(prompt);
    },
    [sendChat],
  );

  const handleClearChat = useCallback(() => {
    Alert.alert(
      "Clear Chat",
      "This will delete all messages and start a new session.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear",
          style: "destructive",
          onPress: () => {
            clearChat();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          },
        },
      ],
    );
  }, [clearChat]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      const isCompleted = completedBenefCardIds.includes(item.id);
      return (
        <ChatBubble
          key={item.id}
          message={item}
          userName={user?.name}
          onSelectBeneficiary={handleBeneficiarySelect}
          selectionDisabled={isCompleted}
          selectedBeneficiaryId={null}
        />
      );
    },
    [
      handleBeneficiarySelect,
      selectedBeneficiary,
      completedBenefCardIds,
      user?.name,
    ],
  );

  const renderHeader = useCallback(
    () => (
      <View>
        {/* Welcome screen for empty state */}
        {messages.length === 0 && (
          <Animated.View
            entering={FadeIn.delay(300)}
            style={styles.welcomeContainer}
          >
            <LinearGradient
              colors={[Colors.accentPurple, Colors.accentTeal]}
              style={styles.welcomeAvatar}
            >
              <Ionicons name="sparkles" size={32} color="#fff" />
            </LinearGradient>
            <Text style={styles.welcomeTitle}>Hi, {user?.name || "there"}</Text>
            <Text style={styles.welcomeSubtitle}>
              Bagaimana saya dapat membantu {"\n"}kebutuhan perbankan anda hari
              ini?
            </Text>

            <View style={styles.capabilitiesGrid}>
              <View style={styles.capabilitiesRow}>
                {[
                  {
                    icon: "wallet-outline",
                    label: "Cek Saldo",
                    prompt: "Berapa saldo rekening saya sekarang?",
                    color: Colors.accentTeal,
                  },
                  {
                    icon: "send-outline",
                    label: "Transfer Dana",
                    prompt: "Saya ingin transfer dana ke rekening lain",
                    color: Colors.accentPurple,
                  },
                ].map((cap) => (
                  <Pressable
                    key={cap.label}
                    onPress={() => handleCapabilityTap(cap.prompt)}
                    style={styles.capabilityButton}
                  >
                    {({ pressed }) => (
                      <View
                        style={[
                          styles.capabilityChip,
                          { borderColor: cap.color },
                          pressed && styles.capabilityChipPressed,
                        ]}
                      >
                        <Ionicons
                          name={cap.icon as any}
                          size={14}
                          color={cap.color}
                        />
                        <Text
                          style={[styles.capabilityLabel, { color: cap.color }]}
                        >
                          {cap.label}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
              <View style={styles.capabilitiesRow}>
                {[
                  {
                    icon: "swap-horizontal-outline",
                    label: "Cek Kurs",
                    prompt: "Berapa kurs mata uang hari ini?",
                    color: Colors.accentGold,
                  },
                  {
                    icon: "document-text-outline",
                    label: "Info Produk Deposito",
                    prompt: "Jelaskan produk deposito yang tersedia",
                    color: Colors.accentRose,
                  },
                ].map((cap) => (
                  <Pressable
                    key={cap.label}
                    onPress={() => handleCapabilityTap(cap.prompt)}
                    style={styles.capabilityButton}
                  >
                    {({ pressed }) => (
                      <View
                        style={[
                          styles.capabilityChip,
                          { borderColor: cap.color },
                          pressed && styles.capabilityChipPressed,
                        ]}
                      >
                        <Ionicons
                          name={cap.icon as any}
                          size={14}
                          color={cap.color}
                        />
                        <Text
                          style={[styles.capabilityLabel, { color: cap.color }]}
                        >
                          {cap.label}
                        </Text>
                      </View>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>
          </Animated.View>
        )}
      </View>
    ),
    [messages.length, user, handleCapabilityTap],
  );

  const renderFooter = useCallback(() => {
    const lastMessage = messages[messages.length - 1];
    const showSuggestions =
      suggestionsVisible && lastMessage?.role === "assistant";

    return (
      <View>
        {/* Suggested quick replies after assistant response */}
        <SuggestedPrompts
          visible={showSuggestions}
          onSelect={handleCapabilityTap}
        />
        {/* Typing indicator */}
        {isLoading && <TypingIndicator activeTool={null} />}
        <View style={{ height: 16 }} />
      </View>
    );
  }, [suggestionsVisible, messages.length, isLoading, handleCapabilityTap]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <Animated.View entering={FadeInDown.springify()} style={styles.header}>
        <View style={styles.headerLeft}>
          <LinearGradient
            colors={[Colors.accentPurple, Colors.accentTeal]}
            style={styles.headerAvatar}
          >
            <Ionicons name="sparkles" size={18} color="#fff" />
          </LinearGradient>
          <View>
            <Text style={styles.headerTitle}>Epsindo Virtual Assistant</Text>
            <View style={styles.onlineRow}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineText}>Online</Text>
            </View>
          </View>
        </View>
        <Pressable onPress={handleClearChat} style={styles.clearBtn}>
          <Ionicons name="trash-outline" size={18} color={Colors.textMuted} />
        </Pressable>
      </Animated.View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        {/* Messages - takes remaining space */}
        <View style={{ flex: 1 }}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            contentContainerStyle={[
              styles.messageList,
              {
                paddingBottom:
                  Platform.OS === "android" ? keyboardHeight + 16 : 16,
              },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: true })
            }
          />
        </View>

        {/* Input area - stays fixed at bottom */}
        <Animated.View
          entering={SlideInUp.springify()}
          style={styles.inputContainer}
        >
          {pendingSelection ? (
            <Pressable
              onPress={handleCancelTransaction}
              style={({ pressed }) => [
                styles.cancelBtn,
                pressed && styles.cancelBtnPressed,
              ]}
            >
              <LinearGradient
                colors={[Colors.accentRose, "#E11D48"]}
                style={styles.cancelGradient}
              >
                <Ionicons name="close-circle" size={18} color="#fff" />
                <Text style={styles.cancelText}>Batalkan Transaksi</Text>
              </LinearGradient>
            </Pressable>
          ) : (
            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                style={styles.input}
                value={inputText}
                onChangeText={setInputText}
                placeholder="Tanya EVA apa saja..."
                placeholderTextColor={Colors.textMuted}
                multiline
                maxLength={500}
                onSubmitEditing={() => sendMessage()}
                returnKeyType="send"
                blurOnSubmit={false}
              />
              <Pressable
                onPress={() => sendMessage()}
                disabled={!inputText.trim() || isLoading}
                style={({ pressed }) => [
                  styles.sendBtn,
                  pressed && styles.sendBtnPressed,
                ]}
              >
                <LinearGradient
                  colors={
                    inputText.trim() && !isLoading
                      ? [Colors.accentPurple, Colors.accentPurpleDark]
                      : [Colors.border, Colors.border]
                  }
                  style={styles.sendGradient}
                >
                  {isLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons
                      name="send"
                      size={16}
                      color={inputText.trim() ? "#fff" : Colors.textMuted}
                    />
                  )}
                </LinearGradient>
              </Pressable>
            </View>
          )}
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  onlineText: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  clearBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  messageList: {
    paddingTop: 8,
    flexGrow: 1,
  },
  welcomeContainer: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 24,
    gap: 12,
  },
  welcomeAvatar: {
    width: 72,
    height: 72,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: Colors.textPrimary,
  },
  welcomeSubtitle: {
    fontSize: 15,
    color: Colors.textMuted,
    textAlign: "center",
    lineHeight: 22,
  },
  capabilitiesGrid: {
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    width: "100%",
  },
  capabilitiesRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  capabilityButton: {
    minWidth: 0,
  },
  capabilityChipPressed: {
    backgroundColor: "#F1F5F9",
  },
  capabilityChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  capabilityLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  streamingContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    marginVertical: 6,
    gap: 10,
  },
  streamAvatar: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  avatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  streamBubble: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderTopLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    flexWrap: "wrap",
  },
  streamText: {
    color: Colors.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  streamingDot: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accentPurpleLight,
    marginBottom: 2,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 12,
    paddingTop: 6,
    paddingBottom: Platform.OS === "ios" ? 14 : 24,
    backgroundColor: Colors.background,
    gap: 4,
  },
  cancelBtn: {
    borderRadius: 16,
    overflow: "hidden",
  },
  cancelBtnPressed: {
    opacity: 0.85,
  },
  cancelGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  inputAction: {
    width: 38,
    height: 38,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  inputActionDisabled: {
    opacity: 0.5,
  },
  input: {
    flex: 1,
    color: Colors.textPrimary,
    fontSize: 15,
    maxHeight: 100,
    paddingTop: 6,
    paddingBottom: 6,
    paddingHorizontal: 2,
  },
  sendBtn: {
    borderRadius: 999,
    overflow: "hidden",
  },
  sendBtnPressed: {
    opacity: 0.8,
  },
  sendGradient: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
  },
  disclaimer: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: "center",
  },
});
