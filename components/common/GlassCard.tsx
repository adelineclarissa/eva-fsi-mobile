import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { Colors } from '../../constants/colors';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  noPadding?: boolean;
}

export default function GlassCard({ children, style, noPadding }: GlassCardProps) {
  return (
    <View style={[styles.card, !noPadding && styles.padding, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  padding: {
    padding: 16,
  },
});
