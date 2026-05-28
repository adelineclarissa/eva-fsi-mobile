import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { formatCurrency } from '../../utils/formatters';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;

interface BalanceCardProps {
  checkingBalance: number;
  userName: string;
  onPress?: () => void;
}

export default function BalanceCard({ checkingBalance, userName, onPress }: BalanceCardProps) {
  const [balanceVisible, setBalanceVisible] = useState(false);
  const scale = useSharedValue(0.96);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 500 });
    scale.value = withSpring(1, { damping: 16, stiffness: 120 });
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => { scale.value = withSpring(0.97, { damping: 20 }); };
  const handlePressOut = () => { scale.value = withSpring(1, { damping: 15 }); };

  return (
    <Animated.View style={[styles.container, cardStyle]}>
      <Pressable onPress={onPress} onPressIn={handlePressIn} onPressOut={handlePressOut}>
        <LinearGradient
          colors={['#1B3D7A', '#1E4799', '#24519E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          <View style={styles.circle1} />
          <View style={styles.circle2} />
          <View style={styles.circle3} />

          <View style={styles.accountInfo}>
            <Text style={styles.accountNumber}>128004311 · {userName.toUpperCase()}</Text>
            <Text style={styles.accountType}>TABUNGAN UTAMA</Text>
          </View>

          <View style={styles.balanceSection}>
            <View style={styles.balanceLabelRow}>
              <Text style={styles.balanceLabel}>Saldo Tersedia</Text>
              <Pressable onPress={() => setBalanceVisible(!balanceVisible)} hitSlop={12}>
                <Ionicons
                  name={balanceVisible ? 'eye-outline' : 'eye-off-outline'}
                  size={16}
                  color="rgba(255,255,255,0.55)"
                />
              </Pressable>
            </View>
            <Text style={styles.balanceAmount}>
              {balanceVisible ? formatCurrency(checkingBalance) : '••••••••'}
            </Text>
          </View>

          <View style={styles.footer}>
            <Text style={styles.openDate}>Sejak Maret 2026</Text>
            <Pressable style={styles.arrowBtn} onPress={onPress}>
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </Pressable>
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: CARD_WIDTH,
    alignSelf: 'center',
    borderRadius: 22,
    shadowColor: '#1B3D7A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
    elevation: 12,
  },
  gradient: {
    borderRadius: 22,
    padding: 22,
    overflow: 'hidden',
    minHeight: 200,
    justifyContent: 'space-between',
  },
  circle1: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: 'rgba(255,255,255,0.05)',
    top: -80,
    right: -60,
  },
  circle2: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255,255,255,0.04)',
    bottom: -50,
    left: -30,
  },
  circle3: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(59,130,246,0.2)',
    top: 40,
    right: 60,
  },
  accountInfo: { gap: 4 },
  accountNumber: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.65)',
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  accountType: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.45)',
    fontWeight: '600',
    letterSpacing: 1.2,
  },
  balanceSection: { gap: 6, marginTop: 16 },
  balanceLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  balanceLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
    fontWeight: '400',
  },
  balanceAmount: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
  },
  openDate: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.4)',
    fontWeight: '400',
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
