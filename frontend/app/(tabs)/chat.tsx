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
import * as DocumentPicker from "expo-document-picker";

import { Colors } from "../../constants/colors";
import { useChatStore } from "../../store/chatStore";
import { useAccountStore } from "../../store/accountStore";
import { ChatMessage } from "../../types";
import ChatBubble from "../../components/chat/ChatBubble";
import TypingIndicator from "../../components/chat/TypingIndicator";
import {
  sendChatMessage,
  streamChatMessage,
  uploadDocument,
} from "../../services/apiService";

export default function ChatScreen() {
  const [inputText, setInputText] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [pendingAccounts, setPendingAccounts] = useState<
    { index: number; account_name: string; currency: string }[] | null
  >(null);
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const {
    messages,
    isLoading,
    isStreaming,
    streamingContent,
    sessionId,
    activeTool,
    addMessage,
    setLoading,
    setStreaming,
    appendStreamingContent,
    setStreamingContent,
    finalizeStreamingMessage,
    setActiveTool,
    clearChat,
  } = useChatStore();

  const {
    refresh: refreshAccounts,
    activeAccountId,
    setActiveAccount,
    accounts,
  } = useAccountStore();

  useEffect(() => {
    if (messages.length > 0 || isStreaming) {
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100,
      );
    }
  }, [messages.length, isStreaming, streamingContent]);

  const sendMessage = useCallback(
    async (text?: string) => {
      const messageText = (text || inputText).trim();
      if (!messageText || isLoading || isStreaming) return;

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setInputText("");

      addMessage({ role: "user", content: messageText });
      setLoading(true);

      try {
        // Try streaming first
        setStreaming(true);
        setStreamingContent("");

        let toolsUsed: string[] = [];
        let streamWorked = false;

        try {
          await streamChatMessage(
            messageText,
            sessionId,
            (token) => {
              appendStreamingContent(token);
            },
            (toolName) => {
              setActiveTool(toolName);
            },
            (tools) => {
              toolsUsed = tools;
              streamWorked = true;
            },
            (error) => {
              console.warn("Stream error:", error);
            },
            activeAccountId ?? undefined,
            (accounts) => {
              setPendingAccounts(accounts);
              setStreaming(false);
              setLoading(false);
            },
          );

          if (streamWorked) {
            finalizeStreamingMessage(toolsUsed);
            // Refresh account data if a transfer was made
            if (toolsUsed.includes("transfer_funds")) {
              await refreshAccounts();
            }
          }
        } catch (streamError) {
          // Fallback to non-streaming
          setStreaming(false);
          setStreamingContent("");

          const result = await sendChatMessage(
            messageText,
            sessionId,
            activeAccountId ?? undefined,
          );
          addMessage({
            role: "assistant",
            content: result.reply,
            toolsUsed: result.toolsUsed,
          });

          if (result.toolsUsed.includes("transfer_funds")) {
            await refreshAccounts();
          }
        }
      } catch (error) {
        setStreaming(false);
        addMessage({
          role: "assistant",
          content:
            "I'm having trouble connecting to the server. Please check that the backend is running and try again.",
        });
      } finally {
        setLoading(false);
        setActiveTool(null);
      }
    },
    [inputText, isLoading, isStreaming, sessionId],
  );

  const handleAccountSelect = useCallback(
    async (accountIndex: number) => {
      const selectedAccount = pendingAccounts?.find(
        (a) => a.index === accountIndex,
      );
      if (!selectedAccount || !pendingAccounts) return;

      // Find the account_id from the local accounts store by matching name
      const matchedAccount = accounts.find(
        (a) => a.name === selectedAccount.account_name,
      );

      if (matchedAccount) {
        setActiveAccount(matchedAccount.id);
        setPendingAccounts(null);

        // Re-send the last user message with the selected account
        const lastUserMessage = [...messages]
          .reverse()
          .find((m) => m.role === "user");
        if (lastUserMessage) {
          setLoading(true);
          setStreaming(true);
          setStreamingContent("");

          try {
            await streamChatMessage(
              lastUserMessage.content,
              sessionId,
              (token) => {
                appendStreamingContent(token);
              },
              (toolName) => {
                setActiveTool(toolName);
              },
              (tools) => {
                finalizeStreamingMessage(tools);
                if (tools.includes("transfer_funds")) {
                  refreshAccounts();
                }
              },
              (error) => {
                console.warn("Stream error:", error);
              },
              matchedAccount.id,
            );
          } catch (error) {
            console.error("Re-send error:", error);
          } finally {
            setLoading(false);
            setActiveTool(null);
            setStreaming(false);
          }
        }
      }
    },
    [pendingAccounts, accounts, messages, sessionId],
  );

  const handleUploadPDF = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/pdf",
        copyToCacheDirectory: true,
      });

      if (result.canceled) return;

      const file = result.assets[0];
      setIsUploading(true);

      addMessage({
        role: "user",
        content: `📄 Uploading "${file.name}"...`,
      });

      const uploadResult = await uploadDocument(
        file.uri,
        file.name,
        file.mimeType || "application/pdf",
      );

      addMessage({
        role: "assistant",
        content: `✅ Document **"${uploadResult.name}"** uploaded successfully!\n\n📊 **${uploadResult.pages} pages** processed and indexed.\n\nYou can now ask me questions about this document. Try:\n- "Summarize this document"\n- "What are the main topics?"\n- "What does it say about [specific topic]?"`,
      });
    } catch (error) {
      addMessage({
        role: "assistant",
        content: `❌ Failed to upload document. Please ensure the backend server is running and try again.`,
      });
    } finally {
      setIsUploading(false);
    }
  }, []);

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
    ({ item, index }: { item: ChatMessage; index: number }) => (
      <ChatBubble key={item.id} message={item} />
    ),
    [],
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
            {[
              {
                icon: "wallet-outline",
                label: "Cek Saldo",
                color: Colors.accentTeal,
              },
              {
                icon: "send-outline",
                label: "Transfer Dana",
                color: Colors.accentPurple,
              },
              {
                icon: "swap-horizontal-outline",
                label: "Cek Kurs",
                color: Colors.accentGold,
              },
              {
                icon: "document-text-outline",
                label: "Info Produk Deposito",
                color: Colors.accentRose,
              },
            ].map((cap) => (
              <View key={cap.label} style={styles.capabilityChip}>
                <Ionicons name={cap.icon as any} size={16} color={cap.color} />
                <Text style={[styles.capabilityLabel, { color: cap.color }]}>
                  {cap.label}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>
      )}
    </View>
  );

  const renderFooter = () => (
    <View>
      {/* Account selection prompt */}
      {pendingAccounts && (
        <Animated.View
          entering={FadeIn.delay(100)}
          style={styles.accountSelectContainer}
        >
          <Text style={styles.accountSelectTitle}>
            Pilih akun yang ingin Anda cek:
          </Text>
          <View style={styles.accountSelectList}>
            {pendingAccounts.map((account) => (
              <Pressable
                key={account.index}
                onPress={() => handleAccountSelect(account.index)}
                style={({ pressed }) => [
                  styles.accountSelectItem,
                  pressed && styles.accountSelectItemPressed,
                ]}
              >
                <LinearGradient
                  colors={[Colors.accentPurple, Colors.accentTeal]}
                  style={styles.accountSelectAvatar}
                >
                  <Ionicons name="card-outline" size={16} color="#fff" />
                </LinearGradient>
                <View style={styles.accountSelectInfo}>
                  <Text style={styles.accountSelectName}>
                    {account.account_name}
                  </Text>
                  <Text style={styles.accountSelectCurrency}>
                    {account.currency}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={Colors.textMuted}
                />
              </Pressable>
            ))}
          </View>
        </Animated.View>
      )}
      {/* Streaming content */}
      {isStreaming && streamingContent && (
        <View style={styles.streamingContainer}>
          <LinearGradient
            colors={[Colors.accentPurple, Colors.accentTeal]}
            style={styles.streamAvatar}
          >
            <Text style={styles.avatarText}>E</Text>
          </LinearGradient>
          <View style={styles.streamBubble}>
            <Text style={styles.streamText}>{streamingContent}</Text>
            <View style={styles.streamingDot} />
          </View>
        </View>
      )}
      {/* Typing indicator */}
      {(isLoading || (isStreaming && !streamingContent)) && (
        <TypingIndicator activeTool={activeTool} />
      )}
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
          <View style={styles.inputRow}>
            {/* Upload PDF button */}
            <Pressable
              onPress={handleUploadPDF}
              style={[
                styles.inputAction,
                isUploading && styles.inputActionDisabled,
              ]}
              disabled={isUploading}
            >
              {isUploading ? (
                <ActivityIndicator
                  size="small"
                  color={Colors.accentPurpleLight}
                />
              ) : (
                <Ionicons
                  name="attach-outline"
                  size={22}
                  color={Colors.textSecondary}
                />
              )}
            </Pressable>

            {/* Text input */}
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

            {/* Send button */}
            <Pressable
              onPress={() => sendMessage()}
              disabled={!inputText.trim() || isLoading || isStreaming}
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
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 10,
    marginTop: 12,
  },
  capabilityChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
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
  // Account selection styles
  accountSelectContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  accountSelectTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
    marginBottom: 10,
  },
  accountSelectList: {
    gap: 8,
  },
  accountSelectItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    gap: 10,
  },
  accountSelectItemPressed: {
    opacity: 0.7,
  },
  accountSelectAvatar: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  accountSelectInfo: {
    flex: 1,
  },
  accountSelectName: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  accountSelectCurrency: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
});
