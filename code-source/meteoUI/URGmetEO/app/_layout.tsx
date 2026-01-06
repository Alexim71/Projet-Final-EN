import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    />
  );
}



// ✅ SOLUTION ALTERNATIVE — DÉSACTIVER LE HEADER POUR UN SEUL ÉCRAN

// Dans le fichier de l’écran (ex: app/index.tsx) :

// import { Stack } from "expo-router";

// export default function SplashScreen() {
//   return (
//     <>
//       <Stack.Screen options={{ headerShown: false }} />
//       {/* ton UI */}
//     </>
//   );
// }