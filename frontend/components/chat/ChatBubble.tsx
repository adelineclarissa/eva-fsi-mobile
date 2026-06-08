import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Animated, {
  FadeInLeft,
  FadeInRight,
  ZoomIn,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import Markdown from "react-native-markdown-display";
import { Colors } from "../../constants/colors";
import { ChatMessage, Beneficiary } from "../../types";
import { formatTime } from "../../utils/formatters";
import BeneficiarySelector from "./BeneficiarySelector";

interface ChatBubbleProps {
  message: ChatMessage;
  onSelectBeneficiary?: (beneficiary: Beneficiary) => void;
  selectionDisabled?: boolean;
  selectedBeneficiaryId?: string | null;
}

const TOOL_LABELS: Record<
  string,
  { icon: string; label: string; color: string }
> = {
  check_balance: {
    icon: "wallet",
    label: "Checked balance",
    color: Colors.accentTeal,
  },
  transfer_funds: {
    icon: "send",
    label: "Transferred funds",
    color: Colors.accentPurple,
  },
  get_exchange_rate: {
    icon: "refresh-circle",
    label: "Got exchange rate",
    color: Colors.accentGold,
  },
  search_documents: {
    icon: "search",
    label: "Searched documents",
    color: Colors.accentRose,
  },
  get_transaction_history: {
    icon: "time",
    label: "Retrieved transactions",
    color: "#0891B2",
  },
  get_beneficiaries: {
    icon: "people",
    label: "Got beneficiaries",
    color: Colors.textSecondary,
  },
};

const markdownStyles = {
  body: { color: "#000", fontSize: 15, lineHeight: 22 },
  paragraph: { marginBottom: 4 },
  strong: { fontWeight: "700" as const, color: "#000" },
  em: { fontStyle: "italic" as const },
  code_inline: {
    backgroundColor: "rgba(0,0,0,0.08)",
    color: Colors.accentTeal,
    borderRadius: 4,
    fontFamily: "monospace",
    fontSize: 13,
    paddingHorizontal: 4,
  },
  bullet_list_icon: { color: Colors.accentPurple },
  list_item: { marginBottom: 4 },
  heading1: {
    color: "#000",
    fontSize: 18,
    fontWeight: "700" as const,
    marginBottom: 6,
  },
  heading2: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700" as const,
    marginBottom: 4,
  },
};

function ToolBadge({ toolName }: { toolName: string }) {
  const info = TOOL_LABELS[toolName] || {
    icon: "flash",
    label: toolName,
    color: Colors.textMuted,
  };
  return (
    <Animated.View
      entering={ZoomIn.springify()}
      style={[styles.toolBadge, { borderColor: `${info.color}40` }]}
    >
      <Ionicons name={info.icon as any} size={11} color={info.color} />
      <Text style={[styles.toolLabel, { color: info.color }]}>
        {info.label}
      </Text>
    </Animated.View>
  );
}

export default function ChatBubble({
  message,
  onSelectBeneficiary,
  selectionDisabled = false,
  selectedBeneficiaryId = null,
}: ChatBubbleProps) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <Animated.View
        entering={FadeInRight.springify()}
        style={styles.userContainer}
      >
        <LinearGradient
          colors={[Colors.accentPurple, Colors.accentPurpleDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.userBubble}
        >
          <Text style={styles.userText}>{message.content}</Text>
        </LinearGradient>
        <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>
      </Animated.View>
    );
  }

  const hasBeneficiaryAction =
    message.actionPayload?.type === "beneficiary_selection";

  return (
    <Animated.View
      entering={FadeInLeft.springify()}
      style={styles.assistantContainer}
    >
      {/* Avatar */}
      <View style={styles.avatarWrapper}>
        <LinearGradient
          colors={[Colors.accentPurple, Colors.accentTeal]}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>E</Text>
        </LinearGradient>
      </View>

      <View style={styles.assistantContent}>
        {/* Tool badges */}
        {message.toolsUsed && message.toolsUsed.length > 0 && (
          <View style={styles.toolBadges}>
            {message.toolsUsed.map((tool, i) => (
              <ToolBadge key={`${tool}-${i}`} toolName={tool} />
            ))}
          </View>
        )}

        {/* Message bubble */}
        <View style={styles.assistantBubble}>
          <Markdown style={markdownStyles}>{message.content}</Markdown>
        </View>

        {/* Beneficiary selector */}
        {hasBeneficiaryAction && message.actionPayload.data && (
          <BeneficiarySelector
            matches={message.actionPayload.data.matches}
            keyword={message.actionPayload.data.keyword}
            onSelect={onSelectBeneficiary ?? (() => {})}
            disabled={selectionDisabled}
            selectedId={selectedBeneficiaryId}
          />
        )}

        <Text style={styles.timestamp}>{formatTime(message.timestamp)}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  userContainer: {
    alignItems: "flex-end",
    marginVertical: 6,
    paddingHorizontal: 16,
  },
  userBubble: {
    maxWidth: "78%",
    borderRadius: 20,
    borderBottomRightRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    shadowColor: Colors.accentPurple,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  userText: {
    color: "#fff",
    fontSize: 15,
    lineHeight: 22,
  },
  assistantContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginVertical: 6,
    paddingHorizontal: 16,
    gap: 10,
  },
  avatarWrapper: {
    marginTop: 4,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "800",
  },
  assistantContent: {
    flex: 1,
    gap: 6,
  },
  toolBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  toolBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  toolLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  assistantBubble: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderTopLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timestamp: {
    fontSize: 10,
    color: Colors.textMuted,
    marginTop: 2,
    marginHorizontal: 4,
  },
});
