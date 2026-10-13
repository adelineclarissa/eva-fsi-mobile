import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { Transaction } from '../../types';
import { formatCurrency, formatDate, getCategoryColor } from '../../utils/formatters';

interface TransactionItemProps {
  transaction: Transaction;
  index?: number;
  onPress?: () => void;
}

export default function TransactionItem({ transaction, index = 0, onPress }: TransactionItemProps) {
  const isCredit = transaction.type === 'credit';
  const iconColor = getCategoryColor(transaction.category);

  return (
    <Animated.View entering={FadeInRight.delay(index * 50).springify()}>
      <Pressable
        style={({ pressed }) => [styles.container, pressed && styles.pressed]}
        onPress={onPress}
      >
        <View style={[styles.iconWrapper, { backgroundColor: `${iconColor}15` }]}>
          <Ionicons
            name={(transaction.icon as any) || 'card-outline'}
            size={19}
            color={iconColor}
          />
        </View>
        <View style={styles.details}>
          <Text style={styles.title} numberOfLines={1}>
            {transaction.title}
          </Text>
          <Text style={styles.subtitle}>
            {transaction.subtitle || transaction.category} · {formatDate(transaction.date)}
          </Text>
        </View>
        <View style={styles.amountSection}>
          <Text style={[styles.amount, isCredit ? styles.creditAmount : styles.debitAmount]}>
            {isCredit ? '+' : '-'}{formatCurrency(transaction.amount)}
          </Text>
          <View style={[styles.statusDot, transaction.status === 'completed' ? styles.statusCompleted : styles.statusPending]} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderRadius: 14,
    gap: 12,
  },
  pressed: {
    backgroundColor: Colors.cardHover,
  },
  iconWrapper: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  details: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 14,
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 11,
    color: Colors.textMuted,
  },
  amountSection: {
    alignItems: 'flex-end',
    gap: 4,
  },
  amount: {
    fontSize: 14,
    fontWeight: '700',
  },
  creditAmount: {
    color: Colors.success,
  },
  debitAmount: {
    color: Colors.textPrimary,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    alignSelf: 'flex-end',
  },
  statusCompleted: {
    backgroundColor: Colors.success,
  },
  statusPending: {
    backgroundColor: Colors.warning,
  },
});
