import { create } from 'zustand';
import { ChatMessage } from '../types';
import { generateId } from '../utils/formatters';

interface ChatStore {
  messages: ChatMessage[];
  isLoading: boolean;
  isStreaming: boolean;
  streamingContent: string;
  sessionId: string;
  activeTool: string | null;

  addMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  appendToLastMessage: (content: string) => void;
  setLoading: (loading: boolean) => void;
  setStreaming: (streaming: boolean) => void;
  setStreamingContent: (content: string) => void;
  appendStreamingContent: (content: string) => void;
  finalizeStreamingMessage: (toolsUsed?: string[]) => void;
  setActiveTool: (tool: string | null) => void;
  clearChat: () => void;
  generateSessionId: () => void;
}

const createSessionId = () => `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const useChatStore = create<ChatStore>((set, get) => ({
  messages: [],
  isLoading: false,
  isStreaming: false,
  streamingContent: '',
  sessionId: createSessionId(),
  activeTool: null,

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
        messages[messages.length - 1] = { ...last, content: last.content + content };
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
            role: 'assistant' as const,
            content: streamingContent,
            timestamp: new Date().toISOString(),
            toolsUsed,
          },
        ],
        streamingContent: '',
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
      streamingContent: '',
      activeTool: null,
    }),

  generateSessionId: () => set({ sessionId: createSessionId() }),
}));
