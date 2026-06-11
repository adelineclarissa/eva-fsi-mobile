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

export default function ChatScreen() {
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);
  const router = useRouter();

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
    setSelectedBeneficiary,
  } = useChatStore();
  const { beneficiaries } = useAccountStore();

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100,
      );
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

        if (beneficiaryName) {
          // Add a confirmation message for the transfer intent
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

          // Search beneficiaries and show selection UI
          const matches = searchBeneficiaries(beneficiaries, beneficiaryName);
          addBeneficiarySelectionMessage({
            keyword: beneficiaryName,
            matches,
            amount: amount ? Number(amount) : undefined,
            desc: desc ? String(desc) : undefined,
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
    clearPendingSelection();
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
    clearPendingSelection,
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
          onSelectBeneficiary={handleBeneficiarySelect}
          selectionDisabled={isCompleted}
          selectedBeneficiaryId={null}
        />
      );
    },
    [handleBeneficiarySelect, selectedBeneficiary, completedBenefCardIds],
  );

  const renderHeader = () => (
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
          <Text style={styles.welcomeTitle}>EVA</Text>
          <Text style={styles.welcomeSubtitle}>
            Asisten perbankan cerdas Anda.{"\n"}Tanya apa saja tentang keuangan
            Anda.
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
                  style={({ pressed }) => [
                    styles.capabilityButton,
                    pressed && styles.capabilityButtonPressed,
                  ]}
                >
                  <View
                    style={[styles.capabilityChip, { borderColor: cap.color }]}
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
                  style={({ pressed }) => [
                    styles.capabilityButton,
                    pressed && styles.capabilityButtonPressed,
                  ]}
                >
                  <View
                    style={[styles.capabilityChip, { borderColor: cap.color }]}
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
                </Pressable>
              ))}
            </View>
          </View>
        </Animated.View>
      )}
    </View>
  );

  const renderFooter = () => (
    <View>
      {/* Typing indicator */}
      {isLoading && <TypingIndicator activeTool={null} />}
      <View style={{ height: 16 }} />
    </View>
  );

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
            <Text style={styles.headerTitle}>EVA</Text>
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
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          ListFooterComponent={renderFooter}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        {/* Input area */}
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
          <Text style={styles.disclaimer}>
            Powered by Claude · Responses may be inaccurate
          </Text>
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
    fontSize: 17,
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
    paddingBottom: 8,
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
  capabilityButtonPressed: {
    opacity: 0.7,
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
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.accentPurpleLight,
    marginBottom: 2,
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 8 : 12,
    backgroundColor: Colors.background,
    gap: 8,
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
    alignItems: "flex-end",
    gap: 10,
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 6,
    paddingVertical: 6,
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
    paddingTop: 8,
    paddingBottom: 8,
    paddingHorizontal: 4,
  },
  sendBtn: {
    borderRadius: 14,
    overflow: "hidden",
  },
  sendBtnPressed: {
    opacity: 0.8,
  },
  sendGradient: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
  },
  disclaimer: {
    fontSize: 10,
    color: Colors.textMuted,
    textAlign: "center",
  },
});
