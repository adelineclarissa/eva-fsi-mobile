export function formatCurrency(amount: number, currency = 'IDR'): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const daysDiff = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (daysDiff === 0) return 'Hari ini';
  if (daysDiff === 1) return 'Kemarin';
  if (daysDiff < 7) return `${daysDiff} hari lalu`;

  return date.toLocaleDateString('id-ID', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function maskAccountNumber(accountNumber: string): string {
  return accountNumber.replace(/\d(?=\d{4})/g, '*');
}

export function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    entertainment: '#8B5CF6',
    food: '#F59E0B',
    shopping: '#3B82F6',
    income: '#10B981',
    transfer: '#6B7280',
    transport: '#F97316',
    utilities: '#14B8A6',
    health: '#EC4899',
    tagihan: '#14B8A6',
    belanja: '#3B82F6',
  };
  return colors[category] || '#6B7280';
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
