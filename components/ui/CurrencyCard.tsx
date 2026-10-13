import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "../../constants/colors";
import { CURRENCY_PAIRS } from "../../constants/mockData";

const FALLBACK_RATES: Record<string, number> = {
  EUR: 0.9218,
  GBP: 0.7893,
  JPY: 149.45,
  IDR: 16200,
};

interface RateItem {
  from: string;
  to: string;
  flag: string;
  rate: number;
  change: number;
}

export default function CurrencyCard() {
  const [rates, setRates] = useState<RateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadRates();
  }, []);

  const loadRates = () => {
    setIsLoading(true);
    // Use local fallback rates only - no API calls
    setTimeout(() => {
      setRates(
        CURRENCY_PAIRS.map((pair) => ({
          ...pair,
          rate: FALLBACK_RATES[pair.to] ?? 1,
          change: (Math.random() - 0.4) * 0.5,
        })),
      );
      setIsLoading(false);
    }, 500);
  };

  const formatRate = (rate: number) => {
    if (rate >= 100) return rate.toFixed(0);
    if (rate >= 1) return rate.toFixed(4);
    return rate.toFixed(6);
  };

  return (
    <LinearGradient colors={["#0D1120", "#0A0D1A"]} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Live Rates</Text>
        <Text style={styles.subtitle}>USD Base</Text>
      </View>

      {isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator size="small" color={Colors.accentPurpleLight} />
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.ratesRow}
        >
          {rates.map((item) => (
            <View key={`${item.from}-${item.to}`} style={styles.rateCard}>
              <Text style={styles.flag}>{item.flag}</Text>
              <Text style={styles.pair}>
                {item.from}/{item.to}
              </Text>
              <Text style={styles.rate}>{formatRate(item.rate)}</Text>
              <View style={styles.changeBadge}>
                <Text
                  style={[
                    styles.change,
                    item.change >= 0 ? styles.positive : styles.negative,
                  ]}
                >
                  {item.change >= 0 ? "↑" : "↓"}{" "}
                  {Math.abs(item.change).toFixed(2)}%
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  title: {
    fontSize: 15,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textMuted,
  },
  loading: {
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  ratesRow: {
    gap: 10,
    paddingRight: 4,
  },
  rateCard: {
    backgroundColor: Colors.card,
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    minWidth: 90,
  },
  flag: {
    fontSize: 22,
  },
  pair: {
    fontSize: 11,
    color: Colors.textMuted,
    fontWeight: "500",
  },
  rate: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: "700",
  },
  changeBadge: {
    marginTop: 2,
  },
  change: {
    fontSize: 11,
    fontWeight: "600",
  },
  positive: {
    color: Colors.success,
  },
  negative: {
    color: Colors.error,
  },
});
