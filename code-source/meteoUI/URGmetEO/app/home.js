import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

export default function Home() {
  const { lat, lon } = useLocalSearchParams();
  const [temperature, setTemperature] = useState(null);

  useEffect(() => {
    // Simulation météo (API plus tard)
    setTemperature(28);
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.city}>Météo locale</Text>

      <Text style={styles.coords}>
        📍 {Number(lat).toFixed(2)}, {Number(lon).toFixed(2)}
      </Text>

      <Text style={styles.temp}>
        {temperature}°C
      </Text>

      <Text style={styles.desc}>
        ☀️ Ensoleillé
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#4facfe",
    alignItems: "center",
    justifyContent: "center",
  },
  city: {
    fontSize: 26,
    color: "#fff",
    fontWeight: "bold",
  },
  coords: {
    color: "#e0f2ff",
    marginTop: 10,
  },
  temp: {
    fontSize: 72,
    fontWeight: "bold",
    color: "#fff",
    marginVertical: 20,
  },
  desc: {
    fontSize: 22,
    color: "#fff",
  },
});
