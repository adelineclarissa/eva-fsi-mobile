import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import { useAccountStore } from '../../store/accountStore';
import { Transaction } from '../../types';
import { formatCurrency } from '../../utils/formatters';

type Filter = 'semua' | 'debit' | 'kredit';

const FILTERS: { key: Filter; label: string }[] = [
  { key: 'semua', label: 'Semua' },
  { key: 'debit', label: 'Keluar' },
  { key: 'kredit', label: 'Masuk' },
];

const CATEGORY_COLORS: Record<string, string> = {
  transport: Colors.accentBlue,
  shopping: Colors.accentPink,
  belanja: Colors.accentPink,
  income: Colors.accentGreen,
  transfer: Colors.accentTeal,
  tagihan: Colors.accentOrange,
  food: Colors.accentGold,
};

function dateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hari ini';
  if (diffDays === 1) return 'Kemarin';
  return date.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long' });
}

function groupTransactions(txs: Transaction[]): { label: string; items: Transaction[] }[] {
  const map = new Map<string, Transaction[]>();
  txs.forEach((tx) => {
    const label = dateLabel(tx.date);
    if (!map.has(label)) map.set(label, []);
    map.get(label)!.push(tx);
  });
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

export default function AktivitasScreen() {
  const { transactions } = useAccountStore();
  const [filter, setFilter] = useState<Filter>('semua');

  const filtered = useMemo(() => {
    if (filter === 'debit') return transactions.filter((t) => t.type === 'debit');
    if (filter === 'kredit') return transactions.filter((t) => t.type === 'credit');
    return transactions;
  }, [transactions, filter]);

  const groups = useMemo(() => groupTransactions(filtered), [filtered]);

  const totalMasuk = useMemo(
    () => transactions.filter((t) => t.type === 'credit').reduce((s, t) => s + t.amount, 0),
    [transactions]
  );
  const totalKeluar = useMemo(
    () => transactions.filter((t) => t.type === 'debit').reduce((s, t) => s + t.amount, 0),
    [transactions]
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.springify()} style={styles.header}>
          <Text style={styles.title}>Aktivitas</Text>
          <Text style={styles.subtitle}>{transactions.length} transaksi</Text>
        </Animated.View>

        {/* Ringkasan */}
        <Animated.View entering={FadeInDown.delay(80).springify()} style={styles.summaryRow}>
          <View style={[styles.summaryCard, { borderLeftColor: Colors.accentGreen }]}>
            <View style={[styles.summaryIconBox, { backgroundColor: `${Colors.accentGreen}12` }]}>
              <Ionicons name="arrow-down-outline" size={14} color={Colors.accentGreen} />
            </View>
            <View>
              <Text style={styles.summaryLabel}>Total Masuk</Text>
              <Text style={[styles.summaryAmount, { color: Colors.accentGreen }]}>
                {formatCurrency(totalMasuk)}
              </Text>
            </View>
          </View>
          <View style={[styles.summaryCard, { borderLeftColor: Colors.accentRed }]}>
            <View style={[styles.summaryIconBox, { backgroundColor: `${Colors.accentRed}12` }]}>
              <Ionicons name="arrow-up-outline" size={14} color={Colors.accentRed} />
            </View>
            <View>
              <Text style={styles.summaryLabel}>Total Keluar</Text>
              <Text style={[styles.summaryAmount, { color: Colors.accentRed }]}>
                {formatCurrency(totalKeluar)}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Filter chips */}
        <Animated.View entering={FadeInDown.delay(140).springify()} style={styles.filterRow}>
          {FILTERS.map((f) => (
            <Pressable
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </Animated.View>

        {/* Grouped transactions */}
        {groups.map((group, gi) => (
          <Animated.View
            key={group.label}
            entering={FadeInDown.delay(180 + gi * 60).springify()}
            style={styles.group}
          >
            <Text style={styles.groupLabel}>{group.label}</Text>
            <View style={styles.groupCard}>
              {group.items.map((tx, ti) => {
                const color = CATEGORY_COLORS[tx.category] ?? Colors.textMuted;
                const isCredit = tx.type === 'credit';
                return (
                  <React.Fragment key={tx.id}>
                    <View style={styles.txRow}>
                      <View style={[styles.txIcon, { backgroundColor: `${color}15` }]}>
                        <Ionicons name={tx.icon as any} size={18} color={color} />
                      </View>
                      <View style={styles.txInfo}>
                        <Text style={styles.txTitle}>{tx.title}</Text>
                        <Text style={styles.txSub}>{tx.subtitle}</Text>
                      </View>
                      <View style={styles.txRight}>
                        <Text style={[styles.txAmount, { color: isCredit ? Colors.accentGreen : Colors.textPrimary }]}>
                          {isCredit ? '+' : '-'}{formatCurrency(tx.amount)}
                        </Text>
                        <Text style={styles.txStatus}>Berhasil</Text>
                      </View>
                    </View>
                    {ti < group.items.length - 1 && <View style={styles.divider} />}
                  </React.Fragment>
                );
              })}
            </View>
          </Animated.View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24, gap: 16 },
  header: { gap: 2, paddingTop: 8, paddingBottom: 4 },
  title: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary },
  subtitle: { fontSize: 13, color: Colors.textMuted },
  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 14,
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 1,
  },
  summaryIconBox: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },
  summaryAmount: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  filterRow: { flexDirection: 'row', gap: 8 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterText: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  group: { gap: 8 },
  groupLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: 4,
  },
  groupCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  txRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  txIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  txInfo: { flex: 1, gap: 3 },
  txTitle: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  txSub: { fontSize: 12, color: Colors.textMuted },
  txRight: { alignItems: 'flex-end', gap: 3 },
  txAmount: { fontSize: 14, fontWeight: '700' },
  txStatus: { fontSize: 11, color: Colors.accentGreen, fontWeight: '500' },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: 16 },
});
