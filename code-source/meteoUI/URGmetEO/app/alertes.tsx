import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  AppState,
} from "react-native";
import { Stack } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "react-i18next";

// ─── Types ───────────────────────────────────────────────────────────────────

type AlertLevel = "normal" | "warning" | "critical";
type Direction = "up" | "down";

interface SensorDef {
  id: string;
  label: string;
  unit: string;
  emoji: string;
  warnThreshold: number;
  critThreshold: number;
  direction: Direction;
}

interface LiveValues {
  temperature: number | null;
  humidity: number | null;
  pressure: number | null;
  wind: number | null;
  rain: number | null;
  timestamp: number | null;
}

// ─── Configuration par défaut des seuils (labels traduits dynamiquement) ──────

const DEFAULT_SENSORS: SensorDef[] = [
  { id: "temperature", label: "temperature", unit: "°C",   emoji: "🌡️", warnThreshold: 35,   critThreshold: 40,  direction: "up"   },
  { id: "humidity",    label: "humidity",    unit: "%",    emoji: "💧", warnThreshold: 80,   critThreshold: 95,  direction: "up"   },
  { id: "pressure",   label: "pressure",    unit: "hPa",  emoji: "🌀", warnThreshold: 1000, critThreshold: 990, direction: "down" },
  { id: "wind",       label: "wind",        unit: "km/h", emoji: "🌬️", warnThreshold: 50,   critThreshold: 90,  direction: "up"   },
  { id: "rain",       label: "rain",        unit: "mm/h", emoji: "🌧️", warnThreshold: 20,   critThreshold: 50,  direction: "up"   },
];

const THRESHOLDS_KEY = "alert_thresholds_v1";
const LIVE_KEY       = "last_weather_sensor";

// ─── Niveaux d'alerte (labels traduits dynamiquement via t()) ────────────────

const LEVEL_CFG = {
  normal:   { color: "#34c759", bg: "rgba(52,199,89,0.12)",  border: "rgba(52,199,89,0.3)",  labelKey: "alertes.normal",   icon: "checkmark-circle-outline" },
  warning:  { color: "#ff9f0a", bg: "rgba(255,159,10,0.12)", border: "rgba(255,159,10,0.3)", labelKey: "alertes.warning",  icon: "warning-outline"          },
  critical: { color: "#ff3b30", bg: "rgba(255,59,48,0.12)",  border: "rgba(255,59,48,0.3)",  labelKey: "alertes.critical", icon: "alert-circle-outline"     },
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLiveValue(sensor: SensorDef, live: LiveValues | null): number | null {
  if (!live) return null;
  return (live as any)[sensor.id] ?? null;
}

function getLevel(sensor: SensorDef, live: LiveValues | null): AlertLevel {
  const val = getLiveValue(sensor, live);
  if (val === null) return "normal";
  if (sensor.direction === "up") {
    if (val >= sensor.critThreshold) return "critical";
    if (val >= sensor.warnThreshold) return "warning";
  } else {
    if (val < sensor.critThreshold) return "critical";
    if (val < sensor.warnThreshold) return "warning";
  }
  return "normal";
}

function getOverall(sensors: SensorDef[], live: LiveValues | null): AlertLevel {
  if (sensors.some(s => getLevel(s, live) === "critical")) return "critical";
  if (sensors.some(s => getLevel(s, live) === "warning"))  return "warning";
  return "normal";
}

function formatTimestamp(ts: number | null): string {
  if (!ts) return "";
  const diff = Math.floor((Date.now() - ts) / 60000);
  if (diff < 1)  return "À l'instant";
  if (diff < 60) return `Il y a ${diff} min`;
  return `Il y a ${Math.floor(diff / 60)} h`;
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function AlertesScreen() {
  const { darkMode } = useSettings();
  const { t } = useTranslation();
  const [sensors, setSensors] = useState<SensorDef[]>(DEFAULT_SENSORS);
  const [live, setLive] = useState<LiveValues | null>(null);
  const [editSensor, setEditSensor] = useState<SensorDef | null>(null);
  const [editWarn, setEditWarn] = useState("");
  const [editCrit, setEditCrit] = useState("");

  const theme = {
    bg:     darkMode ? "#0a0a0a" : "#f2f2f7",
    card:   darkMode ? "#1c1c1e" : "#ffffff",
    text:   darkMode ? "#ffffff" : "#000000",
    sub:    darkMode ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.45)",
    border: darkMode ? "#2c2c2e" : "#e5e5ea",
    input:  darkMode ? "#2c2c2e" : "#f0f0f5",
  };

  const loadData = async () => {
    try {
      // Charger les seuils configurés
      const rawThresh = await AsyncStorage.getItem(THRESHOLDS_KEY);
      if (rawThresh) {
        const saved: { id: string; warnThreshold: number; critThreshold: number }[] = JSON.parse(rawThresh);
        setSensors(DEFAULT_SENSORS.map(def => {
          const s = saved.find(x => x.id === def.id);
          return s ? { ...def, warnThreshold: s.warnThreshold, critThreshold: s.critThreshold } : def;
        }));
      }
      // Charger les valeurs météo actuelles
      const rawLive = await AsyncStorage.getItem(LIVE_KEY);
      if (rawLive) setLive(JSON.parse(rawLive));
    } catch {}
  };

  useEffect(() => {
    loadData();
    const sub = AppState.addEventListener("change", s => { if (s === "active") loadData(); });
    return () => sub.remove();
  }, []);

  const openEdit = (sensor: SensorDef) => {
    setEditSensor(sensor);
    setEditWarn(String(sensor.warnThreshold));
    setEditCrit(String(sensor.critThreshold));
  };

  const confirmEdit = async () => {
    if (!editSensor) return;
    const warn = parseFloat(editWarn.replace(",", "."));
    const crit = parseFloat(editCrit.replace(",", "."));

    if (isNaN(warn) || isNaN(crit)) {
      Alert.alert(t("error"), t("alertes.errNumbers"));
      return;
    }
    if (editSensor.direction === "up" && warn >= crit) {
      Alert.alert(t("error"), t("alertes.errDirUp"));
      return;
    }
    if (editSensor.direction === "down" && warn <= crit) {
      Alert.alert(t("error"), t("alertes.errDirDown"));
      return;
    }

    const updated = sensors.map(s =>
      s.id === editSensor.id ? { ...s, warnThreshold: warn, critThreshold: crit } : s
    );
    setSensors(updated);
    // Sauvegarder seulement les seuils
    const toSave = updated.map(s => ({ id: s.id, warnThreshold: s.warnThreshold, critThreshold: s.critThreshold }));
    await AsyncStorage.setItem(THRESHOLDS_KEY, JSON.stringify(toSave));
    setEditSensor(null);
  };

  const resetThresholds = () => {
    if (!editSensor) return;
    const def = DEFAULT_SENSORS.find(d => d.id === editSensor.id)!;
    setEditWarn(String(def.warnThreshold));
    setEditCrit(String(def.critThreshold));
  };

  const overall = getOverall(sensors, live);
  const overallCfg = LEVEL_CFG[overall];
  const hasLiveData = live !== null;

  return (
    <>
      <Stack.Screen
        options={{
          title: t("alertes.screenTitle"),
          headerStyle: { backgroundColor: darkMode ? "#1c1c1e" : "#ffffff" },
          headerTintColor: darkMode ? "#ffffff" : "#000000",
        }}
      />

      <ScrollView style={[styles.container, { backgroundColor: theme.bg }]}>

        {/* ── Statut global ── */}
        <View style={[styles.overallCard, { backgroundColor: overallCfg.bg, borderColor: overallCfg.border }]}>
          <Ionicons name={overallCfg.icon as any} size={40} color={overallCfg.color} />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={[styles.overallTitle, { color: overallCfg.color }]}>{t("alertes.overallStatus")}</Text>
            <Text style={[styles.overallStatus, { color: overallCfg.color }]}>{t(overallCfg.labelKey)}</Text>
            <Text style={[styles.overallSub, { color: overallCfg.color, opacity: 0.75 }]}>
              {overall === "normal"   && t("alertes.normalDesc")}
              {overall === "warning"  && t("alertes.warningDesc")}
              {overall === "critical" && t("alertes.criticalDesc")}
            </Text>
          </View>
        </View>

        {/* ── Source des données ── */}
        <View style={[styles.sourceRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Ionicons
            name={hasLiveData ? "cloud-done-outline" : "cloud-offline-outline"}
            size={15}
            color={hasLiveData ? "#34c759" : theme.sub}
          />
          <Text style={[styles.sourceText, { color: hasLiveData ? "#34c759" : theme.sub }]}>
            {hasLiveData
              ? `${t("alertes.dataSource")} — ${formatTimestamp(live!.timestamp)}`
              : t("alertes.awaitingData")}
          </Text>
        </View>

        {/* ── Liste des capteurs ── */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {sensors.map((sensor, idx) => {
            const lvl = getLevel(sensor, live);
            const cfg = LEVEL_CFG[lvl];
            const val = getLiveValue(sensor, live);

            return (
              <TouchableOpacity
                key={sensor.id}
                style={[
                  styles.sensorRow,
                  { borderBottomColor: theme.border },
                  idx === sensors.length - 1 && { borderBottomWidth: 0 },
                ]}
                onPress={() => openEdit(sensor)}
                activeOpacity={0.7}
              >
                {/* Barre colorée */}
                <View style={[styles.levelBar, { backgroundColor: cfg.color }]} />

                {/* Emoji */}
                <Text style={styles.sensorEmoji}>{sensor.emoji}</Text>

                {/* Corps */}
                <View style={styles.sensorBody}>
                  <Text style={[styles.sensorLabel, { color: theme.text }]}>{t(`alertes.${sensor.id}Label`)}</Text>
                  <View style={styles.sensorMeta}>
                    <View style={[styles.levelBadge, { backgroundColor: cfg.bg }]}>
                      <Ionicons name={cfg.icon as any} size={10} color={cfg.color} style={{ marginRight: 3 }} />
                      <Text style={[styles.levelBadgeText, { color: cfg.color }]}>{t(cfg.labelKey)}</Text>
                    </View>
                    <Text style={[styles.thresholdHint, { color: theme.sub }]}>
                      {sensor.direction === "up"
                        ? `⚠ ≥${sensor.warnThreshold} • 🔴 ≥${sensor.critThreshold}`
                        : `⚠ <${sensor.warnThreshold} • 🔴 <${sensor.critThreshold}`}
                    </Text>
                  </View>
                </View>

                {/* Valeur live */}
                <View style={styles.valueCol}>
                  <Text style={[styles.valueText, { color: val !== null ? cfg.color : theme.sub }]}>
                    {val !== null ? val.toFixed(1) : "—"}
                  </Text>
                  {val !== null && (
                    <Text style={[styles.unitText, { color: theme.sub }]}>{sensor.unit}</Text>
                  )}
                  <Ionicons name="settings-outline" size={12} color={theme.sub} style={{ marginTop: 4 }} />
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ── Légende ── */}
        <View style={[styles.legend, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.legendTitle, { color: theme.text }]}>{t("alertes.legend")}</Text>
          {(["normal", "warning", "critical"] as AlertLevel[]).map(l => (
            <View key={l} style={styles.legendRow}>
              <View style={[styles.legendDot, { backgroundColor: LEVEL_CFG[l].color }]} />
              <Text style={[styles.legendText, { color: theme.sub }]}>
                <Text style={{ fontWeight: "700", color: LEVEL_CFG[l].color }}>{t(LEVEL_CFG[l].labelKey)}</Text>
                {l === "normal"   ? ` — ${t("alertes.normalDesc")}` : ""}
                {l === "warning"  ? ` — ${t("alertes.warningDesc")}` : ""}
                {l === "critical" ? ` — ${t("alertes.criticalDesc")}` : ""}
              </Text>
            </View>
          ))}
          <Text style={[styles.legendNote, { color: theme.sub }]}>
            💡 {t("alertes.tipEdit")}
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Modal édition seuils ── */}
      {editSensor && (
        <Modal visible transparent animationType="fade" onRequestClose={() => setEditSensor(null)}>
          <Pressable style={styles.overlay} onPress={() => setEditSensor(null)}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"}>
              <Pressable style={[styles.sheet, { backgroundColor: theme.card }]} onPress={() => {}}>

                {/* En-tête */}
                <View style={styles.sheetHeader}>
                  <Text style={styles.sheetEmoji}>{editSensor.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.sheetTitle, { color: theme.text }]}>{t(`alertes.${editSensor.id}Label`)}</Text>
                    <Text style={[styles.sheetSub, { color: theme.sub }]}>
                      {t("alertes.unit")} : {editSensor.unit}
                      {getLiveValue(editSensor, live) !== null
                        ? `  •  ${t("alertes.currentValue")} : ${getLiveValue(editSensor, live)!.toFixed(1)} ${editSensor.unit}`
                        : ""}
                    </Text>
                  </View>
                </View>

                {/* Seuil jaune */}
                <Text style={[styles.inputLabel, { color: "#ff9f0a" }]}>
                  🟡 {t("alertes.warnThreshold")} ({editSensor.unit})
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: "rgba(255,159,10,0.5)" }]}
                  value={editWarn}
                  onChangeText={setEditWarn}
                  keyboardType="numeric"
                  placeholderTextColor={theme.sub}
                />

                {/* Seuil rouge */}
                <Text style={[styles.inputLabel, { color: "#ff3b30" }]}>
                  🔴 {t("alertes.critThreshold")} ({editSensor.unit})
                </Text>
                <TextInput
                  style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: "rgba(255,59,48,0.5)" }]}
                  value={editCrit}
                  onChangeText={setEditCrit}
                  keyboardType="numeric"
                  placeholderTextColor={theme.sub}
                />

                {/* Hint */}
                <Text style={[styles.dirHint, { color: theme.sub }]}>
                  {editSensor.direction === "up"
                    ? t("alertes.alertIfUp", { warn: editWarn || "?", crit: editCrit || "?" })
                    : t("alertes.alertIfDown", { warn: editWarn || "?", crit: editCrit || "?" })}
                </Text>

                {/* Réinitialiser */}
                <TouchableOpacity style={styles.resetBtn} onPress={resetThresholds} activeOpacity={0.7}>
                  <Text style={[styles.resetBtnText, { color: theme.sub }]}>↺ {t("alertes.reset")}</Text>
                </TouchableOpacity>

                {/* Actions principales */}
                <View style={[styles.sheetActions, { borderTopColor: theme.border }]}>
                  <TouchableOpacity
                    style={[styles.cancelBtn, { borderColor: theme.border }]}
                    onPress={() => setEditSensor(null)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.cancelBtnText, { color: theme.sub }]}>{t("alertes.annuler")}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.confirmBtn} onPress={confirmEdit} activeOpacity={0.8}>
                    <Text style={styles.confirmBtnText}>{t("alertes.confirm")}</Text>
                  </TouchableOpacity>
                </View>
              </Pressable>
            </KeyboardAvoidingView>
          </Pressable>
        </Modal>
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },

  overallCard: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    marginBottom: 8,
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
  },
  overallTitle:  { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  overallStatus: { fontSize: 22, fontWeight: "700", marginBottom: 2 },
  overallSub:    { fontSize: 12, lineHeight: 16 },

  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    gap: 8,
  },
  sourceText: { fontSize: 12, fontWeight: "500" },

  card: {
    marginHorizontal: 16,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  sensorRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingRight: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  levelBar:   { width: 4, alignSelf: "stretch", marginRight: 12, borderRadius: 2 },
  sensorEmoji:{ fontSize: 26, width: 36, textAlign: "center", marginRight: 10 },
  sensorBody: { flex: 1, marginRight: 8 },
  sensorLabel:{ fontSize: 15, fontWeight: "600", marginBottom: 4 },
  sensorMeta: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },

  levelBadge:    { flexDirection: "row", alignItems: "center", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  levelBadgeText:{ fontSize: 11, fontWeight: "700" },
  thresholdHint: { fontSize: 11 },

  valueCol:  { alignItems: "flex-end", minWidth: 55 },
  valueText: { fontSize: 22, fontWeight: "300" },
  unitText:  { fontSize: 11, marginTop: -2 },

  legend: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  legendTitle:{ fontSize: 13, fontWeight: "700", marginBottom: 10 },
  legendRow:  { flexDirection: "row", alignItems: "flex-start", marginBottom: 6 },
  legendDot:  { width: 10, height: 10, borderRadius: 5, marginTop: 3, marginRight: 8 },
  legendText: { flex: 1, fontSize: 12, lineHeight: 18 },
  legendNote: { fontSize: 11, marginTop: 8, lineHeight: 16, fontStyle: "italic" },

  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  sheet: {
    width: "100%",
    maxWidth: 360,
    borderRadius: 20,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 12,
  },
  sheetHeader: { flexDirection: "row", alignItems: "center", marginBottom: 18, gap: 10 },
  sheetEmoji:  { fontSize: 32 },
  sheetTitle:  { fontSize: 17, fontWeight: "700" },
  sheetSub:    { fontSize: 12, marginTop: 2 },

  inputLabel: { fontSize: 12, fontWeight: "600", marginBottom: 6, marginTop: 12 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  dirHint: { fontSize: 11, marginTop: 10, lineHeight: 16, fontStyle: "italic" },

  resetBtn:      { alignSelf: "center", paddingVertical: 10, marginTop: 12 },
  resetBtnText:  { fontSize: 12, textDecorationLine: "underline" },
  sheetActions: {
    flexDirection: "row",
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: 6,
    paddingTop: 14,
    gap: 10,
  },
  cancelBtn:     { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center", borderWidth: 1 },
  cancelBtnText: { fontSize: 15, fontWeight: "500" },
  confirmBtn:    { flex: 2, paddingVertical: 13, borderRadius: 12, backgroundColor: "#4facfe", alignItems: "center" },
  confirmBtnText:{ fontSize: 15, fontWeight: "700", color: "#ffffff" },
});
