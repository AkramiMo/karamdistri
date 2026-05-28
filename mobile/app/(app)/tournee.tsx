import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Linking,
  Alert,
  ScrollView,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme'
import { Delivery, DeliveryStatusLabels, DeliveryStatusColors, DeliveryStatus } from '@/types'

type FilterType = 'today' | 'history'

const PaymentStatusLabels: Record<string, string> = {
  pending: 'Non payé',
  partial: 'Partiel',
  paid: 'Payé',
}

const PaymentStatusColors: Record<string, string> = {
  pending: '#ef4444',
  partial: '#f59e0b',
  paid: '#22c55e',
}

export default function TourneeScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filter, setFilter] = useState<FilterType>('today')

  const fetchTournee = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    let allDeliveries: Delivery[] = []

    if (filter === 'today') {
      // Récupérer les BLT du jour via les tournées
      const { data: roundsData } = await supabase
        .from('delivery_rounds')
        .select(`
          id,
          round_number,
          round_date,
          status,
          delivery_round_items(
            id,
            sequence_order,
            delivery:deliveries(
              *,
              client:clients(id, code, name, phone, address, city, gps_lat, gps_lng)
            )
          )
        `)
        .eq('driver_id', user?.id)
        .eq('round_date', today)

      if (roundsData) {
        roundsData.forEach((round: any) => {
          round.delivery_round_items?.forEach((item: any) => {
            if (item.delivery) {
              allDeliveries.push({
                ...item.delivery,
                sequence_order: item.sequence_order
              })
            }
          })
        })
      }

      // Aussi récupérer les BLT assignés directement
      const { data: directData } = await supabase
        .from('deliveries')
        .select(`
          *,
          client:clients(id, code, name, phone, address, city, gps_lat, gps_lng)
        `)
        .eq('driver_id', user?.id)
        .eq('delivery_date', today)

      if (directData) {
        const existingIds = new Set(allDeliveries.map(d => d.id))
        directData.forEach(d => {
          if (!existingIds.has(d.id)) {
            allDeliveries.push(d)
          }
        })
      }

      // Trier par séquence
      allDeliveries.sort((a: any, b: any) => (a.sequence_order || 0) - (b.sequence_order || 0))
    } else {
      // Historique - tous les BLT des 30 derniers jours
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      const fromDate = thirtyDaysAgo.toISOString().split('T')[0]

      // Via les tournées
      const { data: roundsData } = await supabase
        .from('delivery_rounds')
        .select(`
          id,
          round_number,
          round_date,
          status,
          delivery_round_items(
            id,
            delivery:deliveries(
              *,
              client:clients(id, code, name, phone, address, city, gps_lat, gps_lng)
            )
          )
        `)
        .eq('driver_id', user?.id)
        .gte('round_date', fromDate)
        .order('round_date', { ascending: false })

      if (roundsData) {
        roundsData.forEach((round: any) => {
          round.delivery_round_items?.forEach((item: any) => {
            if (item.delivery) {
              allDeliveries.push(item.delivery)
            }
          })
        })
      }

      // Aussi les BLT directs
      const { data: directData } = await supabase
        .from('deliveries')
        .select(`
          *,
          client:clients(id, code, name, phone, address, city, gps_lat, gps_lng)
        `)
        .eq('driver_id', user?.id)
        .gte('delivery_date', fromDate)
        .order('delivery_date', { ascending: false })

      if (directData) {
        const existingIds = new Set(allDeliveries.map(d => d.id))
        directData.forEach(d => {
          if (!existingIds.has(d.id)) {
            allDeliveries.push(d)
          }
        })
      }

      // Trier par date décroissante
      allDeliveries.sort((a, b) =>
        new Date(b.delivery_date || 0).getTime() - new Date(a.delivery_date || 0).getTime()
      )
    }

    setDeliveries(allDeliveries)
    setIsLoading(false)
  }, [user, filter])

  useEffect(() => {
    setIsLoading(true)
    fetchTournee()
  }, [fetchTournee])

  const onRefresh = async () => {
    setIsRefreshing(true)
    await fetchTournee()
    setIsRefreshing(false)
  }

  const openMaps = (delivery: Delivery) => {
    if (delivery.client?.gps_lat && delivery.client?.gps_lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${delivery.client.gps_lat},${delivery.client.gps_lng}`
      Linking.openURL(url)
    } else if (delivery.client?.address) {
      const address = encodeURIComponent(
        `${delivery.client.address}, ${delivery.client.city || ''}`
      )
      const url = `https://www.google.com/maps/dir/?api=1&destination=${address}`
      Linking.openURL(url)
    } else {
      Alert.alert('Erreur', 'Aucune adresse disponible pour ce client')
    }
  }

  const callClient = (phone: string | null) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`)
    }
  }

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-'
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    })
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
      minimumFractionDigits: 2,
    }).format(amount)
  }

  const renderDeliveryItem = ({ item }: { item: Delivery }) => {
    const status = item.status as DeliveryStatus
    const statusColor = DeliveryStatusColors[status] || Colors.textSecondary
    const statusLabel = DeliveryStatusLabels[status] || item.status
    const paymentStatus = (item as any).payment_status || 'pending'
    const paymentColor = PaymentStatusColors[paymentStatus] || '#ef4444'
    const paymentLabel = PaymentStatusLabels[paymentStatus] || 'Non payé'

    return (
      <TouchableOpacity
        style={styles.deliveryCard}
        onPress={() => router.push(`/livraisons/${item.id}`)}
      >
        <View style={styles.cardHeader}>
          <View style={styles.deliveryInfo}>
            <Text style={styles.deliveryNumber}>{item.delivery_number}</Text>
            {filter === 'history' && (
              <Text style={styles.deliveryDate}>{formatDate(item.delivery_date)}</Text>
            )}
          </View>
          <View style={styles.badges}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: paymentColor + '20' }]}>
              <Text style={[styles.statusText, { color: paymentColor }]}>
                {paymentLabel}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.clientInfo}>
          <Text style={styles.clientCode}>{item.client?.code}</Text>
          <Text style={styles.clientName}>{item.client?.name}</Text>
          {item.client?.address && (
            <Text style={styles.clientAddress}>
              {item.client.address}, {item.client.city}
            </Text>
          )}
        </View>

        <View style={styles.amountRow}>
          <Text style={styles.amountLabel}>Total:</Text>
          <Text style={styles.amountValue}>{formatPrice(item.total_ht || 0)}</Text>
        </View>

        <View style={styles.cardActions}>
          {filter === 'today' && (
            <>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => openMaps(item)}
              >
                <Ionicons name="navigate" size={18} color={Colors.primary} />
              </TouchableOpacity>

              {item.client?.phone && (
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => callClient(item.client?.phone)}
                >
                  <Ionicons name="call" size={18} color={Colors.success} />
                </TouchableOpacity>
              )}
            </>
          )}

          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={() => router.push(`/livraisons/${item.id}`)}
          >
            <Text style={styles.actionButtonTextPrimary}>Détails</Text>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    )
  }

  const pendingCount = deliveries.filter(
    d => d.status === 'pending' || d.status === 'in_delivery'
  ).length

  const deliveredCount = deliveries.filter(
    d => d.status === 'delivered'
  ).length

  const paidCount = deliveries.filter(
    d => (d as any).payment_status === 'paid'
  ).length

  return (
    <View style={styles.container}>
      {/* Filtres */}
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'today' && styles.filterButtonActive]}
          onPress={() => setFilter('today')}
        >
          <Ionicons
            name="today"
            size={18}
            color={filter === 'today' ? '#fff' : Colors.primary}
          />
          <Text style={[styles.filterText, filter === 'today' && styles.filterTextActive]}>
            Aujourd'hui
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'history' && styles.filterButtonActive]}
          onPress={() => setFilter('history')}
        >
          <Ionicons
            name="time"
            size={18}
            color={filter === 'history' ? '#fff' : Colors.primary}
          />
          <Text style={[styles.filterText, filter === 'history' && styles.filterTextActive]}>
            Historique
          </Text>
        </TouchableOpacity>
      </View>

      {/* Résumé */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{deliveries.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: Colors.warning }]}>
            {pendingCount}
          </Text>
          <Text style={styles.summaryLabel}>En attente</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: Colors.success }]}>
            {deliveredCount}
          </Text>
          <Text style={styles.summaryLabel}>Livrés</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: '#22c55e' }]}>
            {paidCount}
          </Text>
          <Text style={styles.summaryLabel}>Payés</Text>
        </View>
      </View>

      {/* Liste des livraisons */}
      <FlatList
        data={deliveries}
        keyExtractor={(item) => item.id}
        renderItem={renderDeliveryItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color={Colors.textLight} />
            <Text style={styles.emptyText}>
              {filter === 'today'
                ? 'Aucune livraison pour aujourd\'hui'
                : 'Aucun historique disponible'}
            </Text>
          </View>
        }
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: Spacing.sm,
    backgroundColor: Colors.surface,
    gap: Spacing.sm,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  filterTextActive: {
    color: '#fff',
  },
  summary: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: 1,
    backgroundColor: Colors.border,
  },
  summaryValue: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
  },
  summaryLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  list: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  deliveryCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  deliveryInfo: {
    flexDirection: 'column',
  },
  deliveryNumber: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.text,
    fontFamily: 'monospace',
  },
  deliveryDate: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  clientInfo: {
    marginBottom: Spacing.sm,
  },
  clientCode: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  clientName: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  clientAddress: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    marginBottom: Spacing.sm,
  },
  amountLabel: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  amountValue: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actionButtonPrimary: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  actionButtonText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  actionButtonTextPrimary: {
    fontSize: FontSizes.sm,
    color: '#fff',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
  },
  emptyText: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
})
