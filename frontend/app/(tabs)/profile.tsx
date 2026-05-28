import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import GlassCard from '../../components/common/GlassCard';

const MENU_ITEMS = [
  { icon: 'shield-checkmark-outline', label: 'Keamanan & Privasi', color: Colors.accentPurple },
  { icon: 'notifications-outline', label: 'Notifikasi', color: Colors.accentGold },
  { icon: 'card-outline', label: 'Metode Pembayaran', color: Colors.accentTeal },
  { icon: 'swap-horizontal-outline', label: 'Batas Transaksi', color: '#0891B2' },
  { icon: 'document-text-outline', label: 'Rekening Koran', color: Colors.accentRose },
  { icon: 'help-circle-outline', label: 'Bantuan & Dukungan', color: Colors.textSecondary },
  { icon: 'information-circle-outline', label: 'Tentang EVA', color: Colors.textMuted },
];

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Kartu Profil */}
        <Animated.View entering={FadeInDown.springify()}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryLight]}
            style={styles.profileCard}
          >
            <View style={styles.profileRow}>
              <LinearGradient
                colors={[Colors.accentBlue, Colors.accentTeal]}
                style={styles.avatar}
              >
                <Text style={styles.avatarText}>AC</Text>
              </LinearGradient>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>Adeline Clarissa</Text>
                <Text style={styles.profileEmail}>adeline@example.com</Text>
                <View style={styles.tierBadge}>
                  <Ionicons name="diamond" size={11} color={Colors.accentGold} />
                  <Text style={styles.tierText}>Anggota Premium</Text>
                </View>
              </View>
              <Pressable style={styles.editBtn}>
                <Ionicons name="pencil-outline" size={16} color="rgba(255,255,255,0.8)" />
              </Pressable>
            </View>

            <View style={styles.statsRow}>
              {[
                { label: 'Bergabung Sejak', value: 'Mar 2022' },
                { label: 'Transaksi', value: '842' },
                { label: 'Tingkat', value: 'Premium' },
              ].map((stat) => (
                <View key={stat.label} style={styles.stat}>
                  <Text style={styles.statValue}>{stat.value}</Text>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Skor Keamanan */}
        <Animated.View entering={FadeInDown.delay(150).springify()}>
          <GlassCard>
            <View style={styles.securityRow}>
              <View style={styles.securityLeft}>
                <Ionicons name="shield-checkmark" size={22} color={Colors.success} />
                <View>
                  <Text style={styles.securityTitle}>Skor Keamanan</Text>
                  <Text style={styles.securitySub}>Akun Anda terlindungi dengan baik</Text>
                </View>
              </View>
              <View style={styles.securityScore}>
                <Text style={styles.scoreText}>92</Text>
                <Text style={styles.scoreMax}>/100</Text>
              </View>
            </View>
          </GlassCard>
        </Animated.View>

        {/* Menu Grid */}
        <Animated.View entering={FadeInDown.delay(250).springify()}>
          <GlassCard>
            <View style={styles.menuGrid}>
              {MENU_ITEMS.map((item) => (
                <Pressable
                  key={item.label}
                  style={({ pressed }) => [styles.menuGridItem, pressed && styles.menuGridItemPressed]}
                  onPress={() => Alert.alert(item.label, 'Fitur ini akan segera tersedia!')}
                >
                  <View style={[styles.menuGridIcon, { backgroundColor: `${item.color}18` }]}>
                    <Ionicons name={item.icon as any} size={22} color={item.color} />
                  </View>
                  <Text style={styles.menuGridLabel} numberOfLines={2}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          </GlassCard>
        </Animated.View>

        {/* Keluar */}
        <Animated.View entering={FadeInDown.delay(350).springify()}>
          <Pressable
            style={styles.signOutBtn}
            onPress={() => Alert.alert('Keluar', 'Apakah Anda yakin ingin keluar?', [
              { text: 'Batal', style: 'cancel' },
              { text: 'Keluar', style: 'destructive' },
            ])}
          >
            <Ionicons name="log-out-outline" size={18} color={Colors.error} />
            <Text style={styles.signOutText}>Keluar</Text>
          </Pressable>
        </Animated.View>

        <Text style={styles.version}>EVA Banking v1.0.0 · Dibuat dengan ❤️</Text>
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: 24, gap: 16 },
  profileCard: {
    borderRadius: 24,
    padding: 22,
    gap: 20,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  profileInfo: { flex: 1, gap: 3 },
  profileName: { fontSize: 18, fontWeight: '700', color: '#fff' },
  profileEmail: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  tierBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  tierText: { fontSize: 11, color: Colors.accentGold, fontWeight: '600' },
  editBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: 16,
  },
  stat: { alignItems: 'center', gap: 3 },
  statValue: { fontSize: 16, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 11, color: 'rgba(255,255,255,0.6)' },
  securityRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  securityLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  securityTitle: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  securitySub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  securityScore: { flexDirection: 'row', alignItems: 'flex-end', gap: 1 },
  scoreText: { fontSize: 28, fontWeight: '800', color: Colors.success },
  scoreMax: { fontSize: 14, color: Colors.textMuted, marginBottom: 3 },
  menuGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  menuGridItem: {
    width: '22%',
    flex: 1,
    minWidth: 70,
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 16,
  },
  menuGridItemPressed: { backgroundColor: Colors.cardHover },
  menuGridIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuGridLabel: {
    fontSize: 11,
    color: Colors.textPrimary,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 15,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: `${Colors.error}15`,
    borderWidth: 1,
    borderColor: `${Colors.error}30`,
    borderRadius: 16,
    paddingVertical: 14,
  },
  signOutText: { fontSize: 15, color: Colors.error, fontWeight: '600' },
  version: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', marginTop: 8 },
});
