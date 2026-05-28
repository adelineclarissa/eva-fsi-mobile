import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { View, Text, StyleSheet, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

const TAB_CONFIG = [
  { name: 'index', icon: 'home-outline', activeIcon: 'home', label: 'Beranda' },
  { name: 'cards', icon: 'time-outline', activeIcon: 'time', label: 'Aktivitas' },
  null,
  { name: 'chat', icon: 'chatbubbles-outline', activeIcon: 'chatbubbles', label: 'Asisten AI' },
  { name: 'profile', icon: 'person-outline', activeIcon: 'person', label: 'Profil' },
] as const;

function CustomTabBar({ state, navigation }: BottomTabBarProps) {
  const router = useRouter();

  return (
    <View style={styles.tabBar}>
      {TAB_CONFIG.map((tab, i) => {
        if (tab === null) {
          return (
            <Pressable
              key="qris"
              style={styles.qrisOuter}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push('/transfer');
              }}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryLight]}
                style={styles.qrisButton}
              >
                <Ionicons name="qr-code-outline" size={24} color="#fff" />
              </LinearGradient>
              <Text style={styles.qrisLabel}>Pindai</Text>
            </Pressable>
          );
        }

        const routeIndex = state.routes.findIndex((r) => r.name === tab.name);
        const isFocused = state.index === routeIndex;

        const onPress = () => {
          Haptics.selectionAsync();
          navigation.navigate(tab.name as never);
        };

        return (
          <Pressable key={tab.name} style={styles.tabItem} onPress={onPress}>
            <Ionicons
              name={(isFocused ? tab.activeIcon : tab.icon) as any}
              size={22}
              color={isFocused ? Colors.primary : Colors.textMuted}
            />
            <Text style={[styles.tabLabel, isFocused && styles.activeTabLabel]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="cards" />
      <Tabs.Screen name="chat" />
      <Tabs.Screen name="profile" />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingBottom: Platform.OS === 'ios' ? 24 : 8,
    paddingTop: 8,
    paddingHorizontal: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 12,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    color: Colors.textMuted,
    fontWeight: '500',
  },
  activeTabLabel: {
    color: Colors.primary,
    fontWeight: '700',
  },
  qrisOuter: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    marginTop: -28,
  },
  qrisButton: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
    borderWidth: 3,
    borderColor: Colors.surface,
  },
  qrisLabel: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '700',
  },
});
