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
import { ChatMessage } from "../../types";
import ChatBubble from "../../components/chat/ChatBubble";
import TypingIndicator from "../../components/chat/TypingIndicator";
import { sendChatMessage } from "../../services/fsiApi";

export default function ChatScreen() {
  const [inputText, setInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const {
    messages,
    isLoading,
    sessionId,
    addMessage,
    setLoading,
    clearChat,
  } = useChatStore();

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100,
      );
    }
  }, [messages.length]);

  const sendMessage = useCallback(async () => {
    const messageText = inputText.trim();
    if (!messageText || isLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText("");
    addMessage({ role: "user", content: messageText });
    setLoading(true);
    try {
      const result = await sendChatMessage(messageText, sessionId);
      addMessage({
        role: "assistant",
        content: result.reply,
        toolsUsed: result.toolsUsed,
      });
    } catch {
      addMessage({
        role: "assistant",
        content: "Gagal terhubung ke server. Periksa koneksi dan coba lagi.",
      });
    } finally {
      setLoading(false);
    }
  }, [inputText, isLoading, sessionId, addMessage, setLoading]);

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
    ({ item }: { item: ChatMessage }) => (
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
});
