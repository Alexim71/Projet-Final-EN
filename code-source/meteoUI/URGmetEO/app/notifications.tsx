import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Switch,
  ScrollView,
} from "react-native";
import { Stack } from "expo-router";
import { useSettings } from "../context/SettingsContext";
import { useTranslation } from "react-i18next";

export default function NotificationsScreen() {
  const [today, setToday] = useState(true);
  const [tomorrow, setTomorrow] = useState(true);
  const [weekend, setWeekend] = useState(true);
  const [week, setWeek] = useState(true);
  const [rainNearby, setRainNearby] = useState(true);
  const [pollen, setPollen] = useState(false);

  const { updateSettings } = useSettings();
  const { t, i18n } = useTranslation();

  const NotificationItem = ({
    label,
    value,
    onChange,
  }: {
    label: string;
    value: boolean;
    onChange: (val: boolean) => void;
  }) => (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    updateSettings({ language: lang });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t("notifications"),
        }}
      />

      <ScrollView style={styles.container}>
        <NotificationItem
          label={t("forecastToday")}
          value={today}
          onChange={setToday}
        />

        <NotificationItem
          label={t("forecastTomorrow")}
          value={tomorrow}
          onChange={setTomorrow}
        />

        <NotificationItem
          label={t("forecastWeekEnd")}
          value={weekend}
          onChange={setWeekend}
        />

        <NotificationItem
          label={t("forecastWeek")}
          value={week}
          onChange={setWeek}
        />

        <NotificationItem
          label={t("rainfallNearby")}
          value={rainNearby}
          onChange={setRainNearby}
        />

        <NotificationItem
          label={t("pollenForecast")}
          value={pollen}
          onChange={setPollen}
        />       
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    paddingTop: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  label: {
    fontSize: 16,
  },
});