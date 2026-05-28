import { Stack } from 'expo-router'
import { Colors } from '@/constants/theme'

export default function TourneesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: Colors.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Mes Tournées',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: 'Détail Tournée',
        }}
      />
    </Stack>
  )
}
