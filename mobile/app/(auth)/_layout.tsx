import { Stack, Redirect } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { Colors } from '@/constants/theme'

export default function AuthLayout() {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  // Si l'utilisateur est déjà connecté, rediriger vers l'app
  if (session) {
    return <Redirect href="/(app)/home" />
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="login" />
    </Stack>
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
