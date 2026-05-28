import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Colors } from '../../constants/colors';
import { Beneficiary } from '../../types';

interface BeneficiaryListProps {
  beneficiaries: Beneficiary[];
  onSelect: (beneficiary: Beneficiary) => void;
}

function BeneficiaryAvatar({
  beneficiary,
  index,
  onPress,
}: {
  beneficiary: Beneficiary;
  index: number;
  onPress: () => void;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(index * 60).springify()}>
      <Pressable
        onPress={() => { Haptics.selectionAsync(); onPress(); }}
        style={({ pressed }) => [styles.avatarWrapper, pressed && styles.pressed]}
      >
        <View style={[styles.avatar, { backgroundColor: `${beneficiary.color}18`, borderColor: `${beneficiary.color}30` }]}>
          <Text style={[styles.initials, { color: beneficiary.color }]}>
            {beneficiary.initials}
          </Text>
          <View style={[styles.onlineIndicator, { backgroundColor: beneficiary.color }]} />
        </View>
        <Text style={styles.name} numberOfLines={1}>
          {beneficiary.name.split(' ')[0]}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

export default function BeneficiaryList({ beneficiaries, onSelect }: BeneficiaryListProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {beneficiaries.map((b, index) => (
        <BeneficiaryAvatar
          key={b.id}
          beneficiary={b}
          index={index}
          onPress={() => onSelect(b)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 4,
    gap: 16,
  },
  avatarWrapper: {
    alignItems: 'center',
    gap: 6,
    width: 60,
  },
  pressed: {
    opacity: 0.7,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    borderWidth: 1.5,
  },
  initials: {
    fontSize: 16,
    fontWeight: '800',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.surface,
  },
  name: {
    fontSize: 11,
    color: Colors.textSecondary,
    fontWeight: '500',
    textAlign: 'center',
  },
});
