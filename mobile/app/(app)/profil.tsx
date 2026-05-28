import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/contexts/AuthContext'
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme'

export default function ProfilScreen() {
  const { user, signOut } = useAuth()

  const handleLogout = () => {
    Alert.alert(
      'Déconnexion',
      'Êtes-vous sûr de vouloir vous déconnecter ?',
      [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Déconnexion', style: 'destructive', onPress: signOut },
      ]
    )
  }

  return (
    <View style={styles.container}>
      {/* Avatar et infos utilisateur */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.full_name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.full_name || 'Utilisateur'}</Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
      </View>

      {/* Options */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="person-outline" size={24} color={Colors.text} />
            <Text style={styles.menuItemText}>Modifier le profil</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="notifications-outline" size={24} color={Colors.text} />
            <Text style={styles.menuItemText}>Notifications</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="settings-outline" size={24} color={Colors.text} />
            <Text style={styles.menuItemText}>Paramètres</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <View style={styles.menuItemLeft}>
            <Ionicons name="help-circle-outline" size={24} color={Colors.text} />
            <Text style={styles.menuItemText}>Aide</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
        </TouchableOpacity>
      </View>

      {/* Déconnexion */}
      <View style={styles.section}>
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color={Colors.error} />
          <Text style={styles.logoutText}>Se déconnecter</Text>
        </TouchableOpacity>
      </View>

      {/* Version */}
      <Text style={styles.version}>AKKA ERP Mobile v1.0.0</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    alignItems: 'center',
    padding: Spacing.xl,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  avatarText: {
    fontSize: FontSizes.xxxl,
    fontWeight: 'bold',
    color: '#fff',
  },
  userName: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  userEmail: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  section: {
    backgroundColor: Colors.surface,
    marginTop: Spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  menuItemText: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  logoutText: {
    fontSize: FontSizes.md,
    color: Colors.error,
    fontWeight: '600',
  },
  version: {
    textAlign: 'center',
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    marginTop: Spacing.xl,
  },
})
