import { create } from "zustand";
import { ChatMessage, Beneficiary, BeneficiarySelectionData } from "../types";
import { generateId } from "../utils/formatters";

export interface PendingBeneficiarySelection {
  messageId: string;
  keyword: string;
  matches: Beneficiary[];
  amount?: number;
  desc?: string;
}

interface ChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  sessionId: string;
  activeTool: string | null;
  pendingSelection: PendingBeneficiarySelection | null;
  selectedBeneficiary: Beneficiary | null;
  completedBenefCardIds: string[]; // message IDs of benef cards already selected

  addMessage: (message: Omit<ChatMessage, "id" | "timestamp">) => void;
  appendToLastMessage: (content: string) => void;
  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (content: string) => void;
  finalizeStreamingMessage: (toolsUsed?: string[]) => void;
  setActiveTool: (tool: string | null) => void;
  clearChat: () => void;
  generateSessionId: () => void;
  setPendingSelection: (selection: PendingBeneficiarySelection | null) => void;
  clearPendingSelection: () => void;
  cancelPendingSelection: () => void;
  setSelectedBeneficiary: (beneficiary: Beneficiary | null) => void;
  addBeneficiarySelectionMessage: (
    data: BeneficiarySelectionData & { amount?: number; desc?: string },
  ) => void;
  addSelectionResultMessage: (beneficiary: Beneficiary) => void;
}

const createSessionId = () =>
  `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  isStreaming: false,
  streamingContent: "",
  sessionId: createSessionId(),
  activeTool: null,
  pendingSelection: null,
  selectedBeneficiary: null,
  completedBenefCardIds: [],

  addMessage: (message) =>
    set((state) => ({
      messages: [
        ...state.messages,
        {
          ...message,
          id: generateId(),
          timestamp: new Date().toISOString(),
        },
      ],
    })),

  appendToLastMessage: (content) =>
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0) {
        const last = messages[messages.length - 1];
        messages[messages.length - 1] = {
          ...last,
          content: last.content + content,
        };
      }
      return { messages };
    }),

  setLoading: (isLoading) => set({ isLoading }),
  setStreaming: (isStreaming) => set({ isStreaming }),
  setStreamingContent: (streamingContent) => set({ streamingContent }),

  appendStreamingContent: (content) =>
    set((state) => ({ streamingContent: state.streamingContent + content })),

  finalizeStreamingMessage: (toolsUsed) => {
    const { streamingContent } = get();
    if (streamingContent) {
      set((state) => ({
        messages: [
          ...state.messages,
          {
            id: generateId(),
            role: "assistant" as const,
            content: streamingContent,
            timestamp: new Date().toISOString(),
            toolsUsed,
          },
        ],
        streamingContent: "",
        isStreaming: false,
        activeTool: null,
      }));
    }
  },

  setActiveTool: (activeTool) => set({ activeTool }),

  clearChat: () =>
    set({
      messages: [],
      sessionId: createSessionId(),
      isLoading: false,
      isStreaming: false,
      streamingContent: "",
      activeTool: null,
      pendingSelection: null,
      selectedBeneficiary: null,
      completedBenefCardIds: [],
    }),

  generateSessionId: () => set({ sessionId: createSessionId() }),

  setPendingSelection: (pendingSelection) => set({ pendingSelection }),

  clearPendingSelection: () => set({ pendingSelection: null }),

  cancelPendingSelection: () => {
    const { pendingSelection } = get();
    const messageIdToRemove = pendingSelection?.messageId;
    set((state) => ({
      pendingSelection: null,
      messages: messageIdToRemove
        ? state.messages.filter((m) => m.id !== messageIdToRemove)
        : state.messages,
    }));
  },

  setSelectedBeneficiary: (selectedBeneficiary) => set({ selectedBeneficiary }),

  addBeneficiarySelectionMessage: (data) => {
    const id = generateId();
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id,
          role: "assistant" as const,
          content:
            data.matches.length === 1
              ? "Did you mean:"
              : `Who would you like to transfer to?`,
          timestamp: new Date().toISOString(),
          actionPayload: {
            type: "beneficiary_selection",
            data: {
              keyword: data.keyword,
              matches: data.matches,
            },
          },
        },
      ],
      pendingSelection: {
        messageId: id,
        keyword: data.keyword,
        matches: data.matches,
        amount: data.amount,
        desc: data.desc,
      },
    }));
  },

  addSelectionResultMessage: (beneficiary) => {
    const { pendingSelection } = get();
    const completedId = pendingSelection?.messageId;
    set((state) => ({
      messages: [
        ...state.messages,
        {
          id: generateId(),
          role: "user" as const,
          content: `Selected: ${beneficiary.name}`,
          timestamp: new Date().toISOString(),
          selectionResult: { selectedBeneficiary: beneficiary },
        },
      ],
      pendingSelection: null,
      selectedBeneficiary: beneficiary,
      completedBenefCardIds: completedId
        ? [...state.completedBenefCardIds, completedId]
        : state.completedBenefCardIds,
    }));
  },
}));
