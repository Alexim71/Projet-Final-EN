import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useSettings } from "../context/SettingsContext";
import type { NotificationPrefs, NotificationItem } from "../context/SettingsContext";
import {
  requestNotificationPermission,
  getNotificationPermissionStatus,
  applyNotificationPrefs,
  sendTestNotification,
  getScheduledCount,
} from "./services/notificationService";

// ─── Configuration des items ─────────────────────────────────────────────────

type NotifKey = keyof NotificationPrefs;

function getItems(t: (key: string) => string): {
  key: NotifKey;
  icon: string;
  title: string;
  desc: string;
  isWeekly?: boolean;
  weeklyLabel?: string;
}[] {
  return [
    {
      key: "forecastToday",
      icon: "🌤️",
      title: t("notif.forecastTodayTitle"),
      desc: t("notif.forecastTodayDesc"),
    },
    {
      key: "forecastTomorrow",
      icon: "📅",
      title: t("notif.forecastTomorrowTitle"),
      desc: t("notif.forecastTomorrowDesc"),
    },
    {
      key: "forecastWeekend",
      icon: "🏖️",
      title: t("notif.forecastWeekendTitle"),
      desc: t("notif.forecastWeekendDesc"),
      isWeekly: true,
      weeklyLabel: t("notif.forecastWeekendDay"),
    },
    {
      key: "forecastWeek",
      icon: "📆",
      title: t("notif.forecastWeekTitle"),
      desc: t("notif.forecastWeekDesc"),
      isWeekly: true,
      weeklyLabel: t("notif.forecastWeekDay"),
    },
    {
      key: "rainNearby",
      icon: "🌧️",
      title: t("notif.rainNearbyTitle"),
      desc: t("notif.rainNearbyDesc"),
    },
    {
      key: "alerts",
      icon: "⚠️",
      title: t("notif.alertsTitle"),
      desc: t("notif.alertsDesc"),
    },
  ];
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Renvoie true si l'heure HH:MM est déjà passée pour aujourd'hui */
function isTimePast(hour: number, minute: number): boolean {
  const now = new Date();
  return now.getHours() > hour || (now.getHours() === hour && now.getMinutes() >= minute);
}

function formatTime(
  item: NotificationItem,
  enabled: boolean,
  tFn: (key: string) => string,
  isWeekly?: boolean,
  weeklyLabel?: string,
) {
  const timeStr = `${pad(item.hour)}:${pad(item.minute)}`;
  if (isWeekly) return `${weeklyLabel} ${timeStr}`;
  if (!enabled) return `${timeStr} ${tFn("notif.perDay")}`;
  return isTimePast(item.hour, item.minute)
    ? `${timeStr} — ${tFn("notif.tomorrow")}`
    : `${timeStr} — ${tFn("notif.today")}`;
}

// ─── TimePicker modal ─────────────────────────────────────────────────────────

type TimePickerProps = {
  visible: boolean;
  title: string;
  hour: number;
  minute: number;
  darkMode: boolean;
  onConfirm: (h: number, m: number) => void;
  onCancel: () => void;
};

function TimePicker({ visible, title, hour, minute, darkMode, onConfirm, onCancel }: TimePickerProps) {
  const { t } = useTranslation();
  const [h, setH] = useState(hour);
  const [m, setM] = useState(minute);

  useEffect(() => {
    if (visible) { setH(hour); setM(minute); }
  }, [visible, hour, minute]);

  const theme = {
    bg:     darkMode ? "#1c1c1e" : "#ffffff",
    text:   darkMode ? "#ffffff" : "#000000",
    sub:    darkMode ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.4)",
    border: darkMode ? "#3a3a3c" : "#e5e5ea",
    btn:    darkMode ? "#2c2c2e" : "#f2f2f7",
  };

  const changeH = (delta: number) => setH(prev => (prev + delta + 24) % 24);
  const changeM = (delta: number) => setM(prev => {
    const next = prev + delta;
    if (next < 0) return 59;
    if (next > 59) return 0;
    return next;
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <Pressable style={tpStyles.overlay} onPress={onCancel}>
        <Pressable style={[tpStyles.sheet, { backgroundColor: theme.bg }]} onPress={() => {}}>

          {/* Header */}
          <View style={tpStyles.header}>
            <Ionicons name="time-outline" size={18} color="#4facfe" />
            <Text style={[tpStyles.headerTitle, { color: theme.text }]}>{title}</Text>
          </View>

          {/* Preview */}
          <View style={tpStyles.preview}>
            <Text style={tpStyles.previewTime}>{pad(h)}:{pad(m)}</Text>
          </View>

          {/* Steppers */}
          <View style={tpStyles.steppersRow}>

            {/* Heure */}
            <View style={tpStyles.stepperCol}>
              <Text style={[tpStyles.stepperLabel, { color: theme.sub }]}>{t("notif.hourLabel")}</Text>
              <View style={tpStyles.stepperControls}>
                <TouchableOpacity style={[tpStyles.stepBtn, { backgroundColor: theme.btn }]} onPress={() => changeH(1)}>
                  <Ionicons name="add" size={20} color="#4facfe" />
                </TouchableOpacity>
                <Text style={[tpStyles.stepValue, { color: theme.text }]}>{pad(h)}</Text>
                <TouchableOpacity style={[tpStyles.stepBtn, { backgroundColor: theme.btn }]} onPress={() => changeH(-1)}>
                  <Ionicons name="remove" size={20} color="#4facfe" />
                </TouchableOpacity>
              </View>
            </View>

            <Text style={[tpStyles.colon, { color: theme.text }]}>:</Text>

            {/* Minute */}
            <View style={tpStyles.stepperCol}>
              <Text style={[tpStyles.stepperLabel, { color: theme.sub }]}>{t("notif.minuteLabel")}</Text>
              <View style={tpStyles.stepperControls}>
                <TouchableOpacity style={[tpStyles.stepBtn, { backgroundColor: theme.btn }]} onPress={() => changeM(1)}>
                  <Ionicons name="add" size={20} color="#4facfe" />
                </TouchableOpacity>
                <Text style={[tpStyles.stepValue, { color: theme.text }]}>{pad(m)}</Text>
                <TouchableOpacity style={[tpStyles.stepBtn, { backgroundColor: theme.btn }]} onPress={() => changeM(-1)}>
                  <Ionicons name="remove" size={20} color="#4facfe" />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <Text style={[tpStyles.hint, { color: theme.sub }]}>{t("notif.minutesHint")}</Text>

          {/* Actions */}
          <View style={[tpStyles.actions, { borderTopColor: theme.border }]}>
            <TouchableOpacity style={tpStyles.actionCancel} onPress={onCancel} activeOpacity={0.7}>
              <Text style={[tpStyles.actionCancelText, { color: theme.sub }]}>{t("notif.cancelBtn")}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={tpStyles.actionConfirm} onPress={() => onConfirm(h, m)} activeOpacity={0.7}>
              <Text style={tpStyles.actionConfirmText}>{t("notif.confirmBtn")}</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { t } = useTranslation();
  const { darkMode, notifications, updateSettings } = useSettings();
  const [permStatus, setPermStatus] = useState<"granted" | "denied" | "undetermined" | null>(null);
  const [applying, setApplying] = useState(false);
  const [pickerKey, setPickerKey] = useState<NotifKey | null>(null);
  const [scheduledCount, setScheduledCount] = useState<number | null>(null);

  const items = getItems(t);

  const theme = {
    bg:     darkMode ? "#0a0a0a" : "#f2f2f7",
    card:   darkMode ? "#1c1c1e" : "#ffffff",
    text:   darkMode ? "#ffffff" : "#000000",
    sub:    darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
    border: darkMode ? "#2c2c2e" : "#e5e5ea",
  };

  useEffect(() => {
    getNotificationPermissionStatus().then(s => setPermStatus(s as any));
    getScheduledCount().then(n => setScheduledCount(n));
  }, []);

  const applyPrefs = async (updated: NotificationPrefs) => {
    setApplying(true);
    try {
      await applyNotificationPrefs(updated);
      const n = await getScheduledCount();
      setScheduledCount(n);
    } catch (e: any) {
      Alert.alert(
        t("notif.schedErrTitle"),
        `${t("notif.schedErrMsg")}\n\n${e?.message ?? String(e)}`
      );
    } finally {
      setApplying(false);
    }
  };

  // Basculer enabled d'un item
  const toggle = async (key: NotifKey, value: boolean) => {
    const updated: NotificationPrefs = {
      ...notifications,
      [key]: { ...notifications[key], enabled: value },
    };
    updateSettings({ notifications: updated });
    await applyPrefs(updated);
  };

  // Tout activer / désactiver
  const toggleAll = async (enable: boolean) => {
    const updated = (Object.keys(notifications) as NotifKey[]).reduce(
      (acc, k) => ({ ...acc, [k]: { ...notifications[k], enabled: enable } }),
      {} as NotificationPrefs
    );
    updateSettings({ notifications: updated });
    await applyPrefs(updated);
  };

  // Confirmer une nouvelle heure depuis le TimePicker
  const handleTimeConfirm = async (h: number, m: number) => {
    if (!pickerKey) return;
    const updated: NotificationPrefs = {
      ...notifications,
      [pickerKey]: { ...notifications[pickerKey], hour: h, minute: m },
    };
    updateSettings({ notifications: updated });
    setPickerKey(null);
    await applyPrefs(updated);
  };

  const handleRequestPermission = async () => {
    const granted = await requestNotificationPermission();
    setPermStatus(granted ? "granted" : "denied");
    if (!granted) {
      Alert.alert(
        t("notif.permDeniedAlertTitle"),
        t("notif.permDeniedAlertMsg"),
        [{ text: "OK" }]
      );
    }
  };

  const handleTest = async () => {
    if (permStatus !== "granted") {
      const granted = await requestNotificationPermission();
      setPermStatus(granted ? "granted" : "denied");
      if (!granted) {
        Alert.alert(t("notif.permRequiredAlertTitle"), t("notif.permRequiredAlertMsg"));
        return;
      }
    }
    try {
      await sendTestNotification();
      Alert.alert(t("notif.testSuccessTitle"), t("notif.testSuccessMsg"));
    } catch (e: any) {
      Alert.alert(
        t("notif.testErrTitle"),
        `${e?.message ?? t("error")}\n\n${t("notif.testErrCheck")}`
      );
    }
  };

  const allEnabled = (Object.keys(notifications) as NotifKey[]).every(k => notifications[k].enabled);

  const activeItem = pickerKey ? items.find(i => i.key === pickerKey) : null;

  return (
    <>
      <Stack.Screen
        options={{
          title: t("notif.screenTitle"),
          headerStyle: { backgroundColor: darkMode ? "#1c1c1e" : "#ffffff" },
          headerTintColor: darkMode ? "#ffffff" : "#000000",
        }}
      />

      <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>

        {/* ── Bannière permission ── */}
        {permStatus === null ? null : permStatus === "granted" ? (
          <View style={[styles.permBanner, styles.permGranted]}>
            <Ionicons name="checkmark-circle" size={20} color="#34c759" />
            <Text style={[styles.permTitle, { color: "#34c759", marginLeft: 10 }]}>
              {t("notif.permGranted")}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            style={[styles.permBanner, permStatus === "denied" ? styles.permDenied : styles.permPending]}
            onPress={handleRequestPermission}
            activeOpacity={0.8}
          >
            <Ionicons
              name={permStatus === "denied" ? "notifications-off-outline" : "notifications-outline"}
              size={20}
              color={permStatus === "denied" ? "#ff3b30" : "#ff9f0a"}
            />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.permTitle, { color: permStatus === "denied" ? "#ff3b30" : "#ff9f0a" }]}>
                {permStatus === "denied" ? t("notif.permDenied") : t("notif.permPending")}
              </Text>
              <Text style={[styles.permSub, { color: theme.sub }]}>
                {permStatus === "denied" ? t("notif.permDeniedSub") : t("notif.permPendingSub")}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.sub} />
          </TouchableOpacity>
        )}

        {/* ── Activer tout / Désactiver tout ── */}
        <View style={[styles.quickRow, { borderColor: theme.border }]}>
          <TouchableOpacity
            style={[
              styles.quickBtn,
              {
                borderColor: allEnabled ? "#4facfe" : theme.border,
                backgroundColor: allEnabled ? "rgba(79,172,254,0.12)" : "transparent",
              },
            ]}
            onPress={() => toggleAll(!allEnabled)}
            activeOpacity={0.7}
          >
            <Ionicons
              name={allEnabled ? "notifications-off-outline" : "notifications-outline"}
              size={14}
              color={allEnabled ? "#4facfe" : theme.sub}
              style={{ marginRight: 6 }}
            />
            <Text style={[styles.quickBtnText, { color: allEnabled ? "#4facfe" : theme.sub }]}>
              {allEnabled ? t("notif.disableAll") : t("notif.enableAll")}
            </Text>
          </TouchableOpacity>
          {applying && <ActivityIndicator size="small" color="#4facfe" style={{ marginLeft: 12 }} />}
          {!applying && scheduledCount !== null && (
            <Text style={[styles.scheduledBadge, { color: scheduledCount > 0 ? "#34c759" : theme.sub }]}>
              {scheduledCount > 0
                ? t("notif.scheduledBadge", { count: scheduledCount })
                : t("notif.noneScheduled")}
            </Text>
          )}
        </View>

        {/* ── Liste des notifications ── */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {items.map((item, idx) => {
            const notif = notifications[item.key];
            const timeLabel = formatTime(notif, notif.enabled, t, item.isWeekly, item.weeklyLabel);
            return (
              <View
                key={item.key}
                style={[
                  styles.itemRow,
                  { borderBottomColor: theme.border },
                  idx === items.length - 1 && { borderBottomWidth: 0 },
                ]}
              >
                <Text style={styles.itemIcon}>{item.icon}</Text>
                <View style={styles.itemBody}>
                  <Text style={[styles.itemTitle, { color: theme.text }]}>{item.title}</Text>
                  <Text style={[styles.itemDesc, { color: theme.sub }]}>{item.desc}</Text>
                  <TouchableOpacity
                    style={styles.itemTimePill}
                    onPress={() => setPickerKey(item.key)}
                    activeOpacity={0.7}
                    hitSlop={8}
                  >
                    <Ionicons name="time-outline" size={11} color="#4facfe" style={{ marginRight: 3 }} />
                    <Text style={styles.itemTime}>{timeLabel}</Text>
                    <Ionicons name="pencil-outline" size={10} color="#4facfe" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
                <Switch
                  value={notif.enabled}
                  onValueChange={val => toggle(item.key, val)}
                  trackColor={{ false: "#767577", true: "#4facfe" }}
                  thumbColor="#ffffff"
                />
              </View>
            );
          })}
        </View>

        {/* ── Bouton test ── */}
        <TouchableOpacity
          style={styles.testBtn}
          onPress={handleTest}
          activeOpacity={0.7}
        >
          <Ionicons name="notifications" size={18} color="#4facfe" />
          <Text style={styles.testBtnText}>{t("notif.testBtn")}</Text>
        </TouchableOpacity>

        {/* ── Info ── */}
        <View style={[styles.infoBox, { borderColor: theme.border }]}>
          <Text style={[styles.infoText, { color: theme.sub }]}>{t("notif.infoText")}</Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── TimePicker modal ── */}
      {pickerKey && (
        <TimePicker
          visible={!!pickerKey}
          title={activeItem?.title ?? t("notif.defaultPickerTitle")}
          hour={notifications[pickerKey].hour}
          minute={notifications[pickerKey].minute}
          darkMode={darkMode}
          onConfirm={handleTimeConfirm}
          onCancel={() => setPickerKey(null)}
        />
      )}
    </>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Permission
  permBanner: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    borderRadius: 12,
    padding: 14,
  },
  permGranted: { backgroundColor: "rgba(52,199,89,0.12)" },
  permDenied:  { backgroundColor: "rgba(255,59,48,0.1)" },
  permPending: { backgroundColor: "rgba(255,159,10,0.12)" },
  permTitle: { fontWeight: "700", fontSize: 14 },
  permSub:   { fontSize: 12, marginTop: 2, lineHeight: 16 },

  // Tout activer
  quickRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    marginBottom: 16,
  },
  quickBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  quickBtnText: { fontSize: 13, fontWeight: "600" },
  scheduledBadge: { fontSize: 12, fontWeight: "600", marginLeft: "auto" },

  // Card
  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 8,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  itemIcon: {
    fontSize: 26,
    marginRight: 12,
    width: 32,
    textAlign: "center",
  },
  itemBody: { flex: 1, marginRight: 10 },
  itemTitle: { fontSize: 15, fontWeight: "600", marginBottom: 2 },
  itemDesc:  { fontSize: 12, lineHeight: 16 },
  itemTimePill: {
    marginTop: 5,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(79,172,254,0.1)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  itemTime: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4facfe",
  },

  // Test
  testBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    margin: 16,
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(79,172,254,0.4)",
    backgroundColor: "rgba(79,172,254,0.08)",
    gap: 8,
  },
  testBtnText: { fontSize: 15, fontWeight: "600", color: "#4facfe" },

  // Info
  infoBox: {
    margin: 16,
    marginTop: 4,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  infoText: { fontSize: 12, lineHeight: 18 },
});

// ─── TimePicker styles ────────────────────────────────────────────────────────

const tpStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  preview: {
    alignItems: "center",
    marginBottom: 20,
  },
  previewTime: {
    fontSize: 52,
    fontWeight: "200",
    color: "#4facfe",
    letterSpacing: 2,
  },
  steppersRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 8,
  },
  stepperCol: {
    alignItems: "center",
    gap: 8,
  },
  stepperLabel: {
    fontSize: 12,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stepperControls: {
    alignItems: "center",
    gap: 10,
  },
  stepBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  stepValue: {
    fontSize: 32,
    fontWeight: "300",
    minWidth: 60,
    textAlign: "center",
  },
  colon: {
    fontSize: 32,
    fontWeight: "200",
    marginTop: 20,
    paddingHorizontal: 4,
  },
  hint: {
    textAlign: "center",
    fontSize: 11,
    marginBottom: 20,
  },
  actions: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 16,
    gap: 12,
  },
  actionCancel: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  actionCancelText: {
    fontSize: 15,
    fontWeight: "500",
  },
  actionConfirm: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "#4facfe",
    alignItems: "center",
  },
  actionConfirmText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#ffffff",
  },
});
