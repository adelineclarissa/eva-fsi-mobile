import React, { useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Animated, {
  FadeInDown,
  useAnimatedScrollHandler,
  useSharedValue,
  useAnimatedStyle,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Colors } from '../../constants/colors';
import { useAccountStore } from '../../store/accountStore';
import { QuickActionType } from '../../types';
import BalanceCard from '../../components/ui/BalanceCard';
import QuickActions from '../../components/ui/QuickActions';
import AccountSwitcher from '../../components/ui/AccountSwitcher';

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView);

function getSapa() {
  const hour = new Date().getHours();
  if (hour < 10) return 'Selamat pagi,';
  if (hour < 15) return 'Selamat siang,';
  if (hour < 18) return 'Selamat sore,';
  return 'Selamat malam,';
}

export default function HomeScreen() {
  const router = useRouter();
  const {
    user,
    accounts,
    activeAccountId,
    isLoading,
    refresh,
    getActiveAccount,
    setActiveAccount,
  } = useAccountStore();

  const scrollY = useSharedValue(0);
  const activeAccount = getActiveAccount();
  const displayName = user?.name?.split(' ')[0]?.toUpperCase() ?? 'USER';

  useEffect(() => {
    refresh();
  }, []);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const headerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollY.value, [0, 80], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          scrollY.value,
          [0, 80],
          [0, -10],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const handleQuickAction = useCallback(
    (type: QuickActionType) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (type === 'transfer') {
        router.push('/transfer');
      } else if (type === 'exchange') {
        router.push('/(tabs)/chat');
      } else if (type === 'cards') {
        router.push('/(tabs)/cards');
      } else {
        Alert.alert('Segera Hadir', 'Fitur ini akan segera tersedia!');
      }
    },
    [router],
  );

  const handleAIPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/chat');
  }, [router]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <Animated.View style={[styles.header, headerStyle]}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>{getSapa()}</Text>
          <Text style={styles.userName}>{displayName}</Text>
          <View style={styles.rewardsBadge}>
            <Ionicons name="star" size={11} color={Colors.accentGold} />
            <Text style={styles.rewardsBadgeText}>EVA Poin</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.onlineDot} />
          <Pressable style={styles.headerBtn}>
            <Ionicons
              name="log-out-outline"
              size={20}
              color={Colors.textSecondary}
            />
          </Pressable>
        </View>
      </Animated.View>

      <AnimatedScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={refresh}
            tintColor={Colors.primary}
            colors={[Colors.primary]}
          />
        }
      >
        {/* Kartu Saldo Aktif */}
        {activeAccount && (
          <Animated.View entering={FadeInDown.delay(80).springify()}>
            <BalanceCard account={activeAccount} userName={user?.name ?? 'User'} />
          </Animated.View>
        )}

        {/* Pilih Rekening (hanya tampil jika lebih dari 1 rekening) */}
        {accounts.length > 1 && (
          <Animated.View entering={FadeInDown.delay(140).springify()}>
            <AccountSwitcher
              accounts={accounts}
              activeAccountId={activeAccountId}
              onSelect={setActiveAccount}
            />
          </Animated.View>
        )}

        {/* Menu Cepat */}
        <Animated.View
          entering={FadeInDown.delay(200).springify()}
          style={styles.section}
        >
          <QuickActions onAction={handleQuickAction} />
        </Animated.View>

        <View style={styles.bottomPad} />
      </AnimatedScrollView>

      {/* Tombol AI — fixed */}
      <View style={styles.aiRow}>
        <Pressable style={styles.aiBtn} onPress={handleAIPress}>
          <LinearGradient
            colors={[Colors.primary, Colors.primaryLight]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.aiBtnGradient}
          >
            <Ionicons name="chatbubble-ellipses" size={16} color="#fff" />
            <Text style={styles.aiBtnText}>Tanya EVA</Text>
          </LinearGradient>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 16,
  },
  headerLeft: { gap: 2 },
  greeting: { fontSize: 13, color: Colors.textSecondary, fontWeight: '400' },
  userName: {
    fontSize: 20,
    color: Colors.textPrimary,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  rewardsBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245,158,11,0.1)',
    borderColor: 'rgba(245,158,11,0.25)',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 6,
  },
  rewardsBadgeText: {
    fontSize: 11,
    color: Colors.accentGold,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 4,
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
    shadowColor: Colors.success,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: { flex: 1 },
  content: { paddingTop: 4, paddingBottom: 24, gap: 24 },
  section: { paddingHorizontal: 24, gap: 12 },
  bottomPad: { height: 80 },
  aiRow: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  aiBtn: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  aiBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  aiBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
});
