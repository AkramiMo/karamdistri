import { useEffect } from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { Redirect } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { Colors } from '@/constants/theme'

export default function Index() {
  const { session, isLoading } = useAuth()

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    )
  }

  if (session) {
    return <Redirect href="/(app)/home" />
  }

  return <Redirect href="/(auth)/login" />
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
})
