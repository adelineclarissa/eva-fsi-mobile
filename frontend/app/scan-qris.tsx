import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { CameraView, useCameraPermissions, Camera } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
} from "react-native-reanimated";

import { Colors } from "../constants/colors";
import { useAccountStore } from "../store/accountStore";

interface ScannedResult {
  data: string;
  format: string;
}

interface QrisInboxItem {
  id: string;
  merchantName: string;
  amount: number;
  timestamp: string;
  status: "pending" | "completed" | "expired";
}

// Mock inbox data
const MOCK_INBOX: QrisInboxItem[] = [
  {
    id: "1",
    merchantName: "Kopi Senja",
    amount: 45000,
    timestamp: "2026-06-11T14:30:00",
    status: "pending",
  },
  {
    id: "2",
    merchantName: "Indomaret",
    amount: 125000,
    timestamp: "2026-06-11T12:15:00",
    status: "completed",
  },
  {
    id: "3",
    merchantName: "GoFood",
    amount: 32000,
    timestamp: "2026-06-10T19:45:00",
    status: "completed",
  },
];

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(amount);
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

export default function ScanQrisScreen() {
  const router = useRouter();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [permissionResponse, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [lastResult, setLastResult] = useState<ScannedResult | null>(null);
  const [showInbox, setShowInbox] = useState(false);
  const [showFlash, setShowFlash] = useState(false);
  const [showShowQr, setShowShowQr] = useState(false);
  const cameraRef = useRef<Camera>(null);

  useEffect(() => {
    if (permissionResponse?.status !== "granted") {
      requestPermission();
    }
    setHasPermission(permissionResponse?.status === "granted");
  }, [permissionResponse]);

  const handleBarcodeScanned = useCallback(
    (result: { data: string; type: string }) => {
      if (scanned) return;

      setScanned(true);
      setLastResult({ data: result.data, format: result.type });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

      // Simulate QRIS processing
      setTimeout(() => {
        Alert.alert(
          "QRIS Terdeteksi",
          `QR Code berhasil dipindai.\n\nData: ${result.data.substring(0, 50)}...`,
          [
            {
              text: "Batal",
              style: "cancel",
              onPress: () => {
                setScanned(false);
                setLastResult(null);
              },
            },
            {
              text: "Bayar",
              onPress: () => {
                // Navigate to payment flow
                router.push({
                  pathname: "/transfer",
                  params: { qrisData: result.data },
                });
              },
            },
          ],
        );
      }, 500);
    },
    [scanned, router],
  );

  const toggleFlash = useCallback(() => {
    setShowFlash((prev) => !prev);
    Haptics.selectionAsync();
  }, []);

  const switchToInbox = useCallback(() => {
    setShowInbox(true);
    Haptics.selectionAsync();
  }, []);

  const switchToScanner = useCallback(() => {
    setShowInbox(false);
    setScanned(false);
    Haptics.selectionAsync();
  }, []);

  const openShowQr = useCallback(() => {
    setShowShowQr(true);
    Haptics.selectionAsync();
  }, []);

  if (hasPermission === null || permissionResponse?.status !== "granted") {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-outline" size={64} color={Colors.primary} />
          <Text style={styles.permissionTitle}>Akses Kamera Diperlukan</Text>
          <Text style={styles.permissionText}>
            Izin kamera diperlukan untuk memindai QRIS. Silakan berikan izin
            pada pengaturan perangkat Anda.
          </Text>
          <Pressable
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryLight]}
              style={styles.permissionGradient}
            >
              <Text style={styles.permissionButtonText}>Berikan Izin</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={Colors.surface} />
        </Pressable>
        <Text style={styles.headerTitle}>QRIS</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={openShowQr} style={styles.headerActionBtn}>
            <Ionicons name="qr-code" size={22} color={Colors.surface} />
          </Pressable>
        </View>
      </View>

      {/* Tab Switcher */}
      <View style={styles.tabContainer}>
        <Pressable
          style={[styles.tab, !showInbox && styles.tabActive]}
          onPress={switchToScanner}
        >
          <Ionicons
            name="scan"
            size={18}
            color={showInbox ? Colors.textMuted : Colors.surface}
          />
          <Text style={[styles.tabText, !showInbox && styles.tabTextActive]}>
            Scan QR
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, showInbox && styles.tabActive]}
          onPress={switchToInbox}
        >
          <Ionicons
            name="mail-outline"
            size={18}
            color={showInbox ? Colors.surface : Colors.textMuted}
          />
          <Text style={[styles.tabText, showInbox && styles.tabTextActive]}>
            Inbox
          </Text>
        </Pressable>
      </View>

      {/* Camera View */}
      {!showInbox && (
        <View style={styles.cameraContainer}>
          <CameraView
            ref={cameraRef}
            style={styles.camera}
            facing="back"
            onBarcodeScanned={handleBarcodeScanned}
            torchMode={showFlash ? "on" : "off"}
          >
            {/* Scanner Overlay */}
            <View style={styles.overlay}>
              <View style={styles.overlayTop} />
              <View style={styles.middleRow}>
                <View style={styles.overlaySide} />
                <View style={styles.scanFrame}>
                  {/* Corner markers */}
                  <View style={[styles.corner, styles.cornerTL]} />
                  <View style={[styles.corner, styles.cornerTR]} />
                  <View style={[styles.corner, styles.cornerBL]} />
                  <View style={[styles.corner, styles.cornerBR]} />
                  {/* Scanning line */}
                  <View style={styles.scanLine} />
                </View>
                <View style={styles.overlaySide} />
              </View>
              <View style={styles.overlayBottom}>
                <Text style={styles.scanInstruction}>
                  Arahkan kamera ke QRIS untuk memindai
                </Text>
              </View>
            </View>
          </CameraView>

          {/* Bottom Controls */}
          <View style={styles.bottomControls}>
            <Pressable style={styles.controlButton} onPress={toggleFlash}>
              <Ionicons
                name={showFlash ? "flash" : "flash-outline"}
                size={24}
                color={Colors.surface}
              />
            </Pressable>
            <Pressable style={styles.controlButton} onPress={openShowQr}>
              <Ionicons
                name="qr-code-outline"
                size={24}
                color={Colors.surface}
              />
              <Text style={styles.controlButtonText}>Show QR</Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Inbox View */}
      {showInbox && (
        <ScrollView style={styles.inboxContainer}>
          {MOCK_INBOX.map((item) => (
            <View key={item.id} style={styles.inboxItem}>
              <View style={styles.inboxIcon}>
                <Ionicons
                  name={
                    item.status === "completed"
                      ? "checkmark-circle"
                      : item.status === "pending"
                        ? "time-outline"
                        : "close-circle-outline"
                  }
                  size={28}
                  color={
                    item.status === "completed"
                      ? Colors.success
                      : item.status === "pending"
                        ? Colors.warning
                        : Colors.textMuted
                  }
                />
              </View>
              <View style={styles.inboxContent}>
                <Text style={styles.inboxMerchant}>{item.merchantName}</Text>
                <Text style={styles.inboxTime}>
                  {formatTime(item.timestamp)}
                </Text>
              </View>
              <View style={styles.inboxRight}>
                <Text style={styles.inboxAmount}>
                  {formatCurrency(item.amount)}
                </Text>
                <Text
                  style={[
                    styles.inboxStatus,
                    item.status === "completed"
                      ? styles.statusCompleted
                      : item.status === "pending"
                        ? styles.statusPending
                        : styles.statusExpired,
                  ]}
                >
                  {item.status === "completed"
                    ? "Selesai"
                    : item.status === "pending"
                      ? "Menunggu"
                      : "Kadaluarsa"}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Show QR Modal */}
      <Modal
        visible={showShowQr}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <ShowQrModal onClose={() => setShowShowQr(false)} />
      </Modal>
    </SafeAreaView>
  );
}

function ShowQrModal({ onClose }: { onClose: () => void }) {
  const { user, accounts, activeAccountId } = useAccountStore();
  const activeAccount = accounts.find((a) => a.id === activeAccountId);
  const [qrisKey, setQrisKey] = useState(0);

  // Generate QRIS data (simplified - in production this would be a real QRIS string)
  const qrisData = `00020101021126580016COM.NOBUBANK.WWW01189${activeAccount?.rawAccountNumber || "1122334455"}0210ANDHNI PUTRI520458125303IDN5802ID5913ANDHINI PUTRI6004JKT6105123456237051234567890123456789012346304${qrisKey}`;

  const handleRegenerate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setQrisKey((prev) => prev + 1);
  }, []);

  const handleShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `QRIS Transfer - ${user?.name || "User"}\nRekening: ${activeAccount?.accountNumber || "****4455"}`,
        title: "Bagikan QRIS",
      });
    } catch {
      Alert.alert("Bagikan QR", "QR Code berhasil dibagikan!");
    }
  }, [user?.name, activeAccount?.accountNumber]);

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Simpan QR", "QR Code berhasil disimpan ke galeri!");
  }, []);

  const fullName = user?.name?.toUpperCase() || "ANDHINI PUTRI";
  const accountNum = activeAccount?.accountNumber || "****4455";

  return (
    <SafeAreaView style={styles.showQrContainer}>
      {/* Header */}
      <View style={styles.showQrHeader}>
        <Pressable onPress={onClose} style={styles.closeButton}>
          <Ionicons name="arrow-back" size={24} color={Colors.surface} />
        </Pressable>
        <Text style={styles.showQrTitle}>QRIS Transfer</Text>
        <View style={styles.headerPlaceholder}>
          <Ionicons name="qr-code" size={20} color={Colors.surface} />
        </View>
      </View>

      <ScrollView
        style={styles.showQrScroll}
        contentContainerStyle={styles.showQrScrollContent}
      >
        {/* Blue Card */}
        <LinearGradient
          colors={[Colors.primary, Colors.primaryLight, "#1a4fa0"]}
          style={styles.blueCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          {/* Card Header - QRIS & Bank logos */}
          <View style={styles.blueCardHeader}>
            <View style={styles.qrisLogo}>
              <Text style={styles.qrisLogoText}>QRIS</Text>
              <Text style={styles.qrisLogoSub}>READY</Text>
            </View>
            <View style={styles.bankLogo}>
              <Text style={styles.bankLogoText}>EVA Bank</Text>
            </View>
          </View>

          {/* Account Name & Number */}
          <Text style={styles.blueCardName}>{fullName}</Text>
          <Text style={styles.blueCardAccount}>{accountNum}</Text>

          {/* QR Code */}
          <View style={styles.qrWrapper}>
            <View style={styles.qrWhiteBox}>
              <QrCodeDisplay data={qrisData} />
            </View>
          </View>

          {/* Detail Button */}
          <Pressable style={styles.detailBtn} onPress={() => {}}>
            <Text style={styles.detailBtnText}>Tambah Detail QRIS</Text>
          </Pressable>

          {/* Valid Text */}
          <Text style={styles.qrValidText}>
            QR berlaku untuk 1 kali transaksi
          </Text>

          {/* Decorative wave at bottom */}
          <View style={styles.waveContainer}>
            <View style={[styles.wave, styles.wave1]} />
            <View style={[styles.wave, styles.wave2]} />
          </View>
        </LinearGradient>

        {/* Action Buttons Row */}
        <View style={styles.actionRow}>
          <Pressable
            style={({ pressed }) => [
              styles.actionIconWrapper,
              { backgroundColor: pressed ? Colors.border : "transparent" },
            ]}
            onPress={handleShare}
          >
            <View style={styles.actionIconBtn}>
              <Ionicons
                name="share-social-outline"
                size={22}
                color={Colors.primary}
              />
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.actionIconWrapper,
              { backgroundColor: pressed ? Colors.border : "transparent" },
            ]}
            onPress={handleSave}
          >
            <View style={styles.actionIconBtn}>
              <Ionicons
                name="download-outline"
                size={22}
                color={Colors.primary}
              />
            </View>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.regenerateWrapper,
              { backgroundColor: pressed ? "#153d7a" : "transparent" },
            ]}
            onPress={handleRegenerate}
          >
            <View style={styles.regenerateBtn}>
              <Ionicons
                name="refresh-outline"
                size={16}
                color={Colors.primary}
              />
              <Text style={styles.regenerateBtnText}>Tampilkan QRIS Baru</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function QrCodeDisplay({ data }: { data: string }) {
  // Simple QR code visual representation
  // In production, use react-native-qrcode-svg for actual QR generation
  return (
    <View style={styles.qrCode}>
      <View style={styles.qrPattern}>
        {/* QR-like pattern visualization */}
        {Array.from({ length: 256 }).map((_, i) => {
          const row = Math.floor(i / 16);
          const col = i % 16;
          // Create a pattern that looks like a QR code
          const isCorner =
            (row < 4 && col < 4) ||
            (row < 4 && col > 11) ||
            (row > 11 && col < 4);
          const isRandom = Math.random() > 0.5;
          const shouldShow = isCorner || (row >= 4 && col >= 4 && isRandom);

          return (
            <View
              key={i}
              style={[
                styles.qrPixel,
                shouldShow ? styles.qrPixelFilled : styles.qrPixelEmpty,
              ]}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.surface,
  },
  permissionContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 16,
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: Colors.textPrimary,
    textAlign: "center",
  },
  permissionText: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  permissionButton: {
    marginTop: 16,
    borderRadius: 12,
    overflow: "hidden",
    width: "100%",
  },
  permissionGradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: "center",
  },
  permissionButtonText: {
    color: Colors.surface,
    fontSize: 16,
    fontWeight: "700",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.surface,
    textAlign: "center",
    marginRight: 28,
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerActionBtn: {
    padding: 4,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 8,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textMuted,
  },
  tabTextActive: {
    color: Colors.surface,
  },
  cameraContainer: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    ...StyleSheet.absoluteFillObject,
  },
  overlayTop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  middleRow: {
    height: 260,
    flexDirection: "row",
  },
  overlaySide: {
    width: 60,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  scanFrame: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.surface,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 20,
    height: 20,
    borderColor: Colors.accentBlue,
    borderWidth: 3,
  },
  cornerTL: {
    top: -1,
    left: -1,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: -1,
    right: -1,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: -1,
    left: -1,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: -1,
    right: -1,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 8,
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 2,
    backgroundColor: Colors.accentBlue,
    opacity: 0.8,
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  scanInstruction: {
    fontSize: 14,
    color: Colors.surface,
    textAlign: "center",
    fontWeight: "500",
  },
  bottomControls: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 48,
    paddingVertical: 24,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  controlButton: {
    alignItems: "center",
    gap: 4,
  },
  controlButtonText: {
    fontSize: 12,
    color: Colors.surface,
    fontWeight: "500",
  },
  inboxContainer: {
    flex: 1,
    padding: 16,
  },
  inboxItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  inboxIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  inboxContent: {
    flex: 1,
    marginLeft: 12,
  },
  inboxMerchant: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.textPrimary,
  },
  inboxTime: {
    fontSize: 12,
    color: Colors.textMuted,
    marginTop: 2,
  },
  inboxRight: {
    alignItems: "flex-end",
    gap: 4,
  },
  inboxAmount: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.textPrimary,
  },
  inboxStatus: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusCompleted: {
    color: Colors.success,
    backgroundColor: "#ECFDF5",
  },
  statusPending: {
    color: Colors.warning,
    backgroundColor: "#FFFBEB",
  },
  statusExpired: {
    color: Colors.textMuted,
    backgroundColor: Colors.background,
  },
  // Show QR Modal styles
  showQrContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  showQrHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.primary,
  },
  showQrTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: Colors.surface,
    textAlign: "center",
    marginRight: 24,
  },
  closeButton: {
    padding: 4,
  },
  headerPlaceholder: {
    width: 24,
    alignItems: "center",
  },
  showQrScroll: {
    flex: 1,
  },
  showQrScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    gap: 24,
  },
  // Blue Card
  blueCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    position: "relative",
    overflow: "hidden",
    minHeight: 480,
    justifyContent: "space-between",
  },
  blueCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 20,
  },
  qrisLogo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  qrisLogoText: {
    fontSize: 16,
    fontWeight: "800",
    color: Colors.surface,
    letterSpacing: 1,
  },
  qrisLogoSub: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
    marginLeft: 2,
  },
  bankLogo: {
    backgroundColor: "rgba(255,255,255,0.15)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 6,
  },
  bankLogoText: {
    fontSize: 14,
    fontWeight: "800",
    color: Colors.surface,
    letterSpacing: 1,
  },
  blueCardName: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.surface,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  blueCardAccount: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 1,
    marginBottom: 20,
  },
  qrWrapper: {
    marginBottom: 16,
  },
  qrWhiteBox: {
    width: 180,
    height: 180,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    padding: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  detailBtn: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
    marginBottom: 12,
  },
  detailBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
  },
  qrValidText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
    zIndex: 1,
  },
  waveContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    overflow: "hidden",
  },
  wave: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    height: 60,
    borderRadius: 100,
  },
  wave1: {
    left: -40,
    backgroundColor: "rgba(255,255,255,0.05)",
    width: 200,
  },
  wave2: {
    right: -40,
    backgroundColor: "rgba(255,255,255,0.03)",
    width: 240,
  },
  // QR Code Display
  qrCode: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.surface,
    borderRadius: 4,
    overflow: "hidden",
  },
  qrPattern: {
    width: "100%",
    height: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
  },
  qrPixel: {
    width: "6.25%",
    height: "6.25%",
  },
  qrPixelFilled: {
    backgroundColor: Colors.primaryDark,
  },
  qrPixelEmpty: {
    backgroundColor: "transparent",
  },
  // Action Row
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    gap: 12,
    width: "100%",
    maxWidth: 360,
  },
  actionIconWrapper: {
    padding: 4,
  },
  actionIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  regenerateWrapper: {
    flex: 1,
    padding: 4,
  },
  regenerateBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    paddingHorizontal: 20,
  },
  regenerateBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
});
