import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Account } from '../../types';
import { formatCurrency } from '../../utils/formatters';
import { Colors } from '../../constants/colors';

interface AccountSwitcherProps {
  accounts: Account[];
  activeAccountId: string | null;
  onSelect: (id: string) => void;
}

export default function AccountSwitcher({
  accounts,
  activeAccountId,
  onSelect,
}: AccountSwitcherProps) {
  if (accounts.length <= 1) return null;

  const handleSelect = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(id);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>Rekening Saya</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {accounts.map((account) => {
          const isActive = account.id === activeAccountId;
          const color = account.color ?? Colors.primary;
          return (
            <Pressable
              key={account.id}
              style={[styles.card, isActive && { borderColor: color, borderWidth: 2 }]}
              onPress={() => handleSelect(account.id)}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.dot, { backgroundColor: color }]} />
                <Text
                  style={[styles.accountName, isActive && styles.accountNameActive]}
                  numberOfLines={1}
                >
                  {account.name}
                </Text>
                {isActive && (
                  <Ionicons name="checkmark-circle" size={14} color={color} />
                )}
              </View>
              <Text style={styles.accountNumber}>{account.accountNumber}</Text>
              <Text style={[styles.balance, isActive && styles.balanceActive]}>
                {formatCurrency(account.balance, account.currency)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.textPrimary,
    paddingHorizontal: 24,
  },
  scroll: {
    paddingHorizontal: 24,
    gap: 12,
    flexDirection: 'row',
  },
  card: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    padding: 14,
    width: 168,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  accountName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  accountNameActive: {
    color: Colors.textPrimary,
  },
  accountNumber: {
    fontSize: 12,
    color: Colors.textMuted,
    fontWeight: '400',
  },
  balance: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.textSecondary,
    marginTop: 4,
  },
  balanceActive: {
    color: Colors.textPrimary,
  },
});
