export const Colors = {
  background: '#F2F5FA',
  surface: '#FFFFFF',
  card: '#FFFFFF',
  cardHover: '#F0F4FA',
  border: '#E2E8F0',
  borderLight: '#EDF2F7',

  primary: '#1B3D7A',
  primaryLight: '#2756B0',
  primaryDark: '#122A57',

  accentBlue: '#3B82F6',
  accentGold: '#F59E0B',
  accentGreen: '#10B981',
  accentRed: '#EF4444',
  accentOrange: '#F97316',
  accentTeal: '#14B8A6',
  accentPurple: '#8B5CF6',
  accentPink: '#EC4899',
  accentIndigo: '#6366F1',

  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  success: '#10B981',
  error: '#EF4444',
  warning: '#F59E0B',

  // Legacy aliases kept for backward compatibility
  accentPurpleLight: '#8B5CF6',
  accentPurpleDark: '#6D28D9',
  accentRose: '#EF4444',
  accentTealLight: '#2DD4BF',

  gradients: {
    card: ['#1B3D7A', '#2D5BAD'] as [string, string],
    blue: ['#3B82F6', '#2563EB'] as [string, string],
    teal: ['#14B8A6', '#0891B2'] as [string, string],
    gold: ['#F59E0B', '#F97316'] as [string, string],
    purple: ['#8B5CF6', '#7C3AED'] as [string, string],
    green: ['#10B981', '#059669'] as [string, string],
    red: ['#EF4444', '#DC2626'] as [string, string],
    orange: ['#F97316', '#EA580C'] as [string, string],
    indigo: ['#6366F1', '#4F46E5'] as [string, string],
    gray: ['#94A3B8', '#64748B'] as [string, string],
    pink: ['#EC4899', '#DB2777'] as [string, string],
  },
} as const;
