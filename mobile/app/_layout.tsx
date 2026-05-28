import { useEffect } from 'react'
import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { AuthProvider } from '@/contexts/AuthContext'
import { Colors } from '@/constants/theme'

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: Colors.primary,
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  )
}
