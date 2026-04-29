import { Stack, useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { SettingsProvider, useSettings } from "../context/SettingsContext";
import { AuthProvider } from "../context/AuthContext";
import { DarkTheme, DefaultTheme, ThemeProvider } from "@react-navigation/native";
import "./locales/i18n";
import * as Notifications from "expo-notifications";
import { applyNotificationPrefs } from "./services/notificationService";

// Configurer le handler global dès le démarrage de l'app
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge:  false,
  }),
});

export default function RootLayout() {
  return (
    <AuthProvider>
      <SettingsProvider>
        <NavigationStackWrapper />
      </SettingsProvider>
    </AuthProvider>
  );
}

function NavigationStackWrapper() {
  const { darkMode, notifications } = useSettings();
  const router = useRouter();
  const routerRef = useRef(router);
  const notificationsRef = useRef(notifications);
  useEffect(() => { routerRef.current = router; }, [router]);
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);

  useEffect(() => {
    // Replanifier pour le lendemain dès qu'une notification se déclenche
    const receivedSub = Notifications.addNotificationReceivedListener(() => {
      applyNotificationPrefs(notificationsRef.current).catch(() => {});
    });

    const navigate = (data) => {
      if (!data?.screen) return;
      try {
        if (data.screen === 'forecastDetail' && data.lat && data.lon) {
          routerRef.current.push({
            pathname: '/forecastDetail',
            params: { city: data.city || '', lat: data.lat, lon: data.lon },
          });
        } else if (data.screen === 'rainMap') {
          routerRef.current.push('/rainMap');
        } else {
          routerRef.current.push('/home');
        }
      } catch (e) {
        console.log('[Notif] navigate error:', e);
      }
    };

    // Tap quand l'app est déjà ouverte (foreground / background)
    const sub = Notifications.addNotificationResponseReceivedListener(response => {
      navigate(response.notification.request.content.data);
    });

    // Tap qui a lancé l'app depuis l'état fermé
    Notifications.getLastNotificationResponseAsync().then(response => {
      if (response?.notification?.request?.content?.data) {
        setTimeout(() => navigate(response.notification.request.content.data), 300);
      }
    });

    return () => {
      receivedSub.remove();
      sub.remove();
    };
  }, []);

  return (
    <ThemeProvider value={darkMode ? DarkTheme : DefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="App" />
        <Stack.Screen name="home" />
        <Stack.Screen name="login" />
        <Stack.Screen name="PressureCard" />
        <Stack.Screen name="cardDetail" />
        <Stack.Screen name="rainMap" />
        <Stack.Screen name="settings"      options={{ headerShown: true }} />
        <Stack.Screen name="notifications" options={{ headerShown: true }} />
        <Stack.Screen name="about"         options={{ headerShown: true }} />
        <Stack.Screen name="licence"       options={{ headerShown: true }} />
        <Stack.Screen name="privacy"       options={{ headerShown: true }} />
        <Stack.Screen name="rate"          options={{ headerShown: true }} />
        <Stack.Screen name="emplacement" />
        <Stack.Screen name="forecastDetail" />
      </Stack>
    </ThemeProvider>
  );
}