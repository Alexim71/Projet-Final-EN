import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      
      <Stack.Screen name="App" />
      <Stack.Screen name="home" />
      <Stack.Screen name="login" />
      <Stack.Screen name="PressureCard" />
       <Stack.Screen name="cardDetail" />
       <Stack.Screen name="rainMap" />
       
    </Stack>
  );
}
