import "react-native-gesture-handler";
import "../global.css";
import { useEffect } from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import * as SplashScreen from "expo-splash-screen";
import Animated, { FadeIn } from "react-native-reanimated";
import { Colors } from "../constants/colors";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: Colors.background }}
    >
      <SafeAreaProvider>
        <StatusBar style="dark" backgroundColor={Colors.background} />
        <Animated.View entering={FadeIn.duration(300)} style={{ flex: 1 }}>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: Colors.background },
              animation: "slide_from_right",
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="transfer"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
                gestureEnabled: false,
              }}
            />
            <Stack.Screen
              name="scan-qris"
              options={{
                presentation: "modal",
                animation: "slide_from_bottom",
                gestureEnabled: false,
              }}
            />
          </Stack>
        </Animated.View>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
