import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { QUICK_ACTIONS } from '../../constants/mockData';
import { QuickActionType } from '../../types';

interface QuickActionsProps {
  onAction: (type: QuickActionType) => void;
}

function ActionButton({
  action,
  index,
  onPress,
}: {
  action: (typeof QUICK_ACTIONS)[0];
  index: number;
  onPress: () => void;
}) {
  const scale = useSharedValue(1);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.88, { damping: 15 }, () => {
      scale.value = withSpring(1, { damping: 12 });
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).springify()}
      style={[styles.actionCell, animStyle]}
    >
      <Pressable onPress={handlePress} style={styles.actionWrapper}>
        <LinearGradient
          colors={action.gradient as [string, string]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.actionIcon}
        >
          <Ionicons name={action.icon as any} size={20} color="#fff" />
        </LinearGradient>
        <Text style={styles.actionLabel}>{action.label}</Text>
      </Pressable>
    </Animated.View>
  );
}

export default function QuickActions({ onAction }: QuickActionsProps) {
  const rows = [QUICK_ACTIONS.slice(0, 4), QUICK_ACTIONS.slice(4, 8)];

  return (
    <View style={styles.card}>
      {rows.map((row, rowIdx) => (
        <View key={rowIdx} style={styles.row}>
          {row.map((action, colIdx) => (
            <ActionButton
              key={action.type}
              action={action}
              index={rowIdx * 4 + colIdx}
              onPress={() => onAction(action.type)}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 8,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionCell: {
    flex: 1,
    alignItems: 'center',
  },
  actionWrapper: {
    alignItems: 'center',
    gap: 8,
  },
  actionIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  actionLabel: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
});
