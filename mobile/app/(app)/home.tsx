import { useEffect, useState } from 'react'
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme'

interface DashboardStats {
  totalDeliveries: number
  pendingDeliveries: number
  completedDeliveries: number
  totalAmount: number
}

export default function HomeScreen() {
  const { user } = useAuth()
  const [stats, setStats] = useState<DashboardStats>({
    totalDeliveries: 0,
    pendingDeliveries: 0,
    completedDeliveries: 0,
    totalAmount: 0,
  })
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchStats = async () => {
    const today = new Date().toISOString().split('T')[0]

    // Récupérer les livraisons du jour
    const { data: deliveries } = await supabase
      .from('deliveries')
      .select('id, status, total_ht')
      .eq('driver_id', user?.id)
      .eq('delivery_date', today)

    if (deliveries) {
      setStats({
        totalDeliveries: deliveries.length,
        pendingDeliveries: deliveries.filter(d => d.status === 'pending' || d.status === 'in_delivery').length,
        completedDeliveries: deliveries.filter(d => d.status === 'delivered').length,
        totalAmount: deliveries
          .filter(d => d.status === 'delivered')
          .reduce((sum, d) => sum + (d.total_ht || 0), 0),
      })
    }
  }

  useEffect(() => {
    fetchStats()
  }, [user])

  const onRefresh = async () => {
    setIsRefreshing(true)
    await fetchStats()
    setIsRefreshing(false)
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(amount)
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      {/* En-tête de bienvenue */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Bonjour,</Text>
        <Text style={styles.userName}>{user?.full_name || 'Livreur'}</Text>
        <Text style={styles.date}>
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}
        </Text>
      </View>

      {/* Statistiques */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, styles.statCardPrimary]}>
          <Ionicons name="cube" size={32} color="#fff" />
          <Text style={styles.statValueLight}>{stats.totalDeliveries}</Text>
          <Text style={styles.statLabelLight}>Livraisons du jour</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="time" size={32} color={Colors.warning} />
          <Text style={styles.statValue}>{stats.pendingDeliveries}</Text>
          <Text style={styles.statLabel}>En attente</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="checkmark-circle" size={32} color={Colors.success} />
          <Text style={styles.statValue}>{stats.completedDeliveries}</Text>
          <Text style={styles.statLabel}>Terminées</Text>
        </View>

        <View style={styles.statCard}>
          <Ionicons name="cash" size={32} color={Colors.primary} />
          <Text style={styles.statValue}>{formatPrice(stats.totalAmount)}</Text>
          <Text style={styles.statLabel}>Montant encaissé</Text>
        </View>
      </View>

      {/* Actions rapides */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Actions rapides</Text>
        <View style={styles.actionsGrid}>
          <View style={styles.actionCard}>
            <Ionicons name="navigate" size={28} color={Colors.primary} />
            <Text style={styles.actionText}>Démarrer tournée</Text>
          </View>
          <View style={styles.actionCard}>
            <Ionicons name="scan" size={28} color={Colors.primary} />
            <Text style={styles.actionText}>Scanner</Text>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.primary,
    padding: Spacing.lg,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.xxl,
  },
  greeting: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSizes.md,
  },
  userName: {
    color: '#fff',
    fontSize: FontSizes.xxl,
    fontWeight: 'bold',
  },
  date: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: FontSizes.sm,
    marginTop: Spacing.xs,
    textTransform: 'capitalize',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: Spacing.md,
    marginTop: -Spacing.xl,
    gap: Spacing.md,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statCardPrimary: {
    backgroundColor: Colors.primary,
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: Spacing.sm,
  },
  statValueLight: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: Spacing.sm,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  statLabelLight: {
    fontSize: FontSizes.xs,
    color: 'rgba(255,255,255,0.8)',
    marginTop: Spacing.xs,
  },
  section: {
    padding: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: Spacing.md,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  actionCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
})
