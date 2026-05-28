import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/colors';

interface TypingIndicatorProps {
  activeTool?: string | null;
}

const TOOL_MESSAGES: Record<string, string> = {
  check_balance: 'Checking balance...',
  transfer_funds: 'Processing transfer...',
  get_exchange_rate: 'Fetching live rates...',
  search_documents: 'Searching documents...',
  get_transaction_history: 'Loading transactions...',
  get_beneficiaries: 'Getting contacts...',
};

function Dot({ delay }: { delay: number }) {
  const translateY = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-6, { duration: 300 }),
          withTiming(0, { duration: 300 })
        ),
        -1,
        false
      )
    );
  }, [delay]);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return <Animated.View style={[styles.dot, style]} />;
}

export default function TypingIndicator({ activeTool }: TypingIndicatorProps) {
  const toolMessage = activeTool ? TOOL_MESSAGES[activeTool] : null;

  return (
    <Animated.View entering={FadeIn.springify()} exiting={FadeOut.duration(200)} style={styles.container}>
      <View style={styles.row}>
        {/* Avatar */}
        <LinearGradient
          colors={[Colors.accentPurple, Colors.accentTeal]}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>N</Text>
        </LinearGradient>

        {/* Bubble */}
        <View style={styles.bubble}>
          {toolMessage ? (
            <Text style={styles.toolText}>{toolMessage}</Text>
          ) : null}
          <View style={styles.dots}>
            <Dot delay={0} />
            <Dot delay={150} />
            <Dot delay={300} />
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginVertical: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '800',
  },
  bubble: {
    backgroundColor: Colors.card,
    borderRadius: 20,
    borderTopLeftRadius: 6,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 6,
  },
  toolText: {
    fontSize: 12,
    color: Colors.accentPurpleLight,
    fontWeight: '500',
  },
  dots: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    height: 20,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.accentPurpleLight,
  },
});
