import { useState } from 'react'
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Pressable,
} from 'react-native'
import { router } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme'

export default function LoginScreen() {
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Erreur', 'Veuillez remplir tous les champs')
      return
    }

    try {
      setIsLoading(true)
      const { error } = await signIn(email, password)
      setIsLoading(false)

      if (error) {
        Alert.alert('Erreur', error.message || 'Email ou mot de passe incorrect')
      } else {
        router.replace('/(app)/home')
      }
    } catch (e: any) {
      setIsLoading(false)
      Alert.alert('Erreur', e.message || 'Une erreur est survenue')
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <View style={styles.logoPlaceholder}>
            <Text style={styles.logoText}>AKKA</Text>
          </View>
          <Text style={styles.title}>ERP Mobile</Text>
          <Text style={styles.subtitle}>Connexion Livreur</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="votre@email.com"
            placeholderTextColor="#999"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Mot de passe</Text>
          <TextInput
            style={styles.input}
            placeholder="••••••••"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
              isLoading && styles.buttonDisabled
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            <Text style={styles.buttonText}>
              {isLoading ? 'Connexion...' : 'Se connecter'}
            </Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: '#B8860B',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  logoText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 5,
  },
  form: {
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  input: {
    backgroundColor: '#f9f9f9',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#333',
  },
  button: {
    backgroundColor: '#B8860B',
    borderRadius: 10,
    padding: 15,
    alignItems: 'center',
    marginTop: 25,
  },
  buttonPressed: {
    backgroundColor: '#9A7209',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
})
