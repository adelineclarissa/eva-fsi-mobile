import React from 'react';
import { ScrollView, Pressable, Text, StyleSheet, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

const QUICK_ACTIONS = [
  { icon: 'wallet-outline', label: 'Cek Saldo', prompt: 'Berapa saldo rekening saya sekarang?', color: Colors.accentTeal },
  { icon: 'send-outline', label: 'Transfer Dana', prompt: 'Saya ingin transfer dana ke rekening lain', color: Colors.accentPurple },
  { icon: 'swap-horizontal-outline', label: 'Cek Kurs', prompt: 'Berapa kurs mata uang hari ini?', color: Colors.accentGold },
  { icon: 'document-text-outline', label: 'Info Produk Deposito', prompt: 'Jelaskan produk deposito yang tersedia', color: Colors.accentRose },
] as const;

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
  visible: boolean;
}

export default function SuggestedPrompts({ onSelect, visible }: SuggestedPromptsProps) {
  if (!visible) return null;

  return (
    <Animated.View entering={FadeInUp.springify()}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {QUICK_ACTIONS.map((item) => (
          <Pressable
            key={item.label}
            onPress={() => onSelect(item.prompt)}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
          >
            <View style={[styles.iconWrapper, { backgroundColor: `${item.color}18` }]}>
              <Ionicons name={item.icon as any} size={15} color={item.color} />
            </View>
            <Text style={styles.chipText}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipPressed: {
    backgroundColor: Colors.cardHover,
  },
  iconWrapper: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
});
