import { Tabs, Redirect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Colors } from '@/constants/theme'
import { Platform, View, ActivityIndicator, StyleSheet } from 'react-native'
import { useAuth } from '@/contexts/AuthContext'

export default function AppLayout() {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  // Si l'utilisateur n'est pas connecté, rediriger vers login
  if (!session) {
    return <Redirect href="/(auth)/login" />
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          paddingBottom: Platform.OS === 'ios' ? 20 : 10,
          paddingTop: 5,
          height: Platform.OS === 'ios' ? 85 : 65,
        },
        headerStyle: {
          backgroundColor: Colors.primary,
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tournee"
        options={{
          title: 'Ma Tournée',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="car" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="tournees"
        options={{
          title: 'Tournées',
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="map" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="livraisons"
        options={{
          title: 'Livraisons',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cube" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profil"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
})
