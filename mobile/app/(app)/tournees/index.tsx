import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { api, RoundSummary } from '@/lib/api'
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme'
import * as Location from 'expo-location'

type FilterType = 'today' | 'pending' | 'completed'

const StatusLabels: Record<string, string> = {
  pending: 'En attente',
  in_progress: 'En cours',
  completed: 'Terminée',
  cancelled: 'Annulée',
}

const StatusColors: Record<string, string> = {
  pending: '#f59e0b',
  in_progress: '#3b82f6',
  completed: '#22c55e',
  cancelled: '#ef4444',
}

export default function TourneesScreen() {
  const router = useRouter()
  const [rounds, setRounds] = useState<RoundSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [filter, setFilter] = useState<FilterType>('today')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchRounds = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]

    let params: { status?: string; date?: string } = {}

    if (filter === 'today') {
      params.date = today
    } else if (filter === 'pending') {
      params.status = 'pending'
    } else if (filter === 'completed') {
      params.status = 'completed'
    }

    const result = await api.getRounds(params)

    if (result.success && result.data) {
      setRounds(result.data.rounds)
    } else {
      console.error('Error fetching rounds:', result.error)
    }

    setIsLoading(false)
  }, [filter])

  useEffect(() => {
    setIsLoading(true)
    fetchRounds()
  }, [fetchRounds])

  const onRefresh = async () => {
    setIsRefreshing(true)
    await fetchRounds()
    setIsRefreshing(false)
  }

  const handleStartRound = async (roundId: string) => {
    Alert.alert(
      'Démarrer la tournée',
      'Voulez-vous démarrer cette tournée maintenant ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Démarrer',
          onPress: async () => {
            setActionLoading(roundId)

            // Get current GPS position
            let position: { lat: number; lng: number } | undefined
            try {
              const { status } = await Location.requestForegroundPermissionsAsync()
              if (status === 'granted') {
                const loc = await Location.getCurrentPositionAsync({})
                position = {
                  lat: loc.coords.latitude,
                  lng: loc.coords.longitude
                }
              }
            } catch (e) {
              console.log('GPS error:', e)
            }

            const result = await api.startRound(roundId, position)

            setActionLoading(null)

            if (result.success) {
              Alert.alert('Succès', 'Tournée démarrée !', [
                { text: 'OK', onPress: () => router.push(`/tournees/${roundId}`) }
              ])
              fetchRounds()
            } else {
              Alert.alert('Erreur', result.error || 'Impossible de démarrer la tournée')
            }
          }
        }
      ]
    )
  }

  const handleStopRound = async (roundId: string) => {
    Alert.alert(
      'Terminer la tournée',
      'Voulez-vous terminer cette tournée ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Terminer',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(roundId)

            const result = await api.stopRound(roundId)

            setActionLoading(null)

            if (result.success && result.data) {
              const summary = result.data.round.summary
              Alert.alert(
                'Tournée terminée',
                `Résumé:\n• ${summary.delivered} livrées\n• ${summary.partial} partielles\n• ${summary.returned} retournées`
              )
              fetchRounds()
            } else {
              Alert.alert('Erreur', result.error || 'Impossible de terminer la tournée')
            }
          }
        }
      ]
    )
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('fr-FR', {
      weekday: 'short',
      day: '2-digit',
      month: '2-digit'
    })
  }

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '-'
    const date = new Date(timeStr)
    return date.toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderRoundItem = ({ item }: { item: RoundSummary }) => {
    const statusColor = StatusColors[item.status] || Colors.textSecondary
    const statusLabel = StatusLabels[item.status] || item.status
    const isActionLoading = actionLoading === item.id

    return (
      <TouchableOpacity
        style={styles.roundCard}
        onPress={() => router.push(`/tournees/${item.id}`)}
        disabled={isActionLoading}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.roundInfo}>
            <Text style={styles.roundNumber}>{item.round_number}</Text>
            <Text style={styles.roundDate}>{formatDate(item.round_date)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Ionicons name="cube-outline" size={18} color={Colors.textSecondary} />
            <Text style={styles.statValue}>{item.deliveries_count}</Text>
            <Text style={styles.statLabel}>livraisons</Text>
          </View>

          {item.status === 'in_progress' && (
            <View style={styles.statItem}>
              <Ionicons name="checkmark-circle-outline" size={18} color={Colors.success} />
              <Text style={[styles.statValue, { color: Colors.success }]}>
                {item.delivered_count}
              </Text>
              <Text style={styles.statLabel}>livrées</Text>
            </View>
          )}

          {item.start_time && (
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.statValue}>{formatTime(item.start_time)}</Text>
              <Text style={styles.statLabel}>début</Text>
            </View>
          )}

          {item.total_distance && (
            <View style={styles.statItem}>
              <Ionicons name="navigate-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.statValue}>{item.total_distance.toFixed(1)}</Text>
              <Text style={styles.statLabel}>km</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          {item.status === 'pending' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonStart]}
              onPress={() => handleStartRound(item.id)}
              disabled={isActionLoading}
            >
              {isActionLoading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="play" size={18} color="#fff" />
                  <Text style={styles.actionButtonTextWhite}>Démarrer</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {item.status === 'in_progress' && (
            <>
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonPrimary]}
                onPress={() => router.push(`/tournees/${item.id}`)}
              >
                <Ionicons name="list" size={18} color="#fff" />
                <Text style={styles.actionButtonTextWhite}>Livraisons</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonStop]}
                onPress={() => handleStopRound(item.id)}
                disabled={isActionLoading}
              >
                {isActionLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="stop" size={18} color="#fff" />
                    <Text style={styles.actionButtonTextWhite}>Terminer</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {item.status === 'completed' && (
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonOutline]}
              onPress={() => router.push(`/tournees/${item.id}`)}
            >
              <Ionicons name="eye" size={18} color={Colors.primary} />
              <Text style={styles.actionButtonTextPrimary}>Voir détails</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  // Stats
  const pendingCount = rounds.filter(r => r.status === 'pending').length
  const inProgressCount = rounds.filter(r => r.status === 'in_progress').length
  const completedCount = rounds.filter(r => r.status === 'completed').length

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
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
          style={[styles.filterButton, filter === 'pending' && styles.filterButtonActive]}
          onPress={() => setFilter('pending')}
        >
          <Ionicons
            name="hourglass"
            size={18}
            color={filter === 'pending' ? '#fff' : Colors.primary}
          />
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            En attente
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, filter === 'completed' && styles.filterButtonActive]}
          onPress={() => setFilter('completed')}
        >
          <Ionicons
            name="checkmark-done"
            size={18}
            color={filter === 'completed' ? '#fff' : Colors.primary}
          />
          <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
            Terminées
          </Text>
        </TouchableOpacity>
      </View>

      {/* Résumé */}
      <View style={styles.summary}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{rounds.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: StatusColors.pending }]}>
            {pendingCount}
          </Text>
          <Text style={styles.summaryLabel}>En attente</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: StatusColors.in_progress }]}>
            {inProgressCount}
          </Text>
          <Text style={styles.summaryLabel}>En cours</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: StatusColors.completed }]}>
            {completedCount}
          </Text>
          <Text style={styles.summaryLabel}>Terminées</Text>
        </View>
      </View>

      {/* Liste des tournées */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      ) : (
        <FlatList
          data={rounds}
          keyExtractor={(item) => item.id}
          renderItem={renderRoundItem}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Ionicons name="car-outline" size={64} color={Colors.textLight} />
              <Text style={styles.emptyText}>
                Aucune tournée trouvée
              </Text>
              <Text style={styles.emptySubtext}>
                Tirez vers le bas pour actualiser
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
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
    gap: Spacing.xs,
  },
  filterButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: FontSizes.xs,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    color: Colors.textSecondary,
  },
  list: {
    padding: Spacing.md,
  },
  roundCard: {
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
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
    marginBottom: Spacing.md,
  },
  roundInfo: {
    flex: 1,
  },
  roundNumber: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.text,
    fontFamily: 'monospace',
  },
  roundDate: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
    marginBottom: Spacing.sm,
  },
  statItem: {
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  actionButtonStart: {
    backgroundColor: Colors.success,
  },
  actionButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  actionButtonStop: {
    backgroundColor: '#ef4444',
  },
  actionButtonOutline: {
    borderWidth: 1,
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  actionButtonTextWhite: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#fff',
  },
  actionButtonTextPrimary: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary,
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
  emptySubtext: {
    fontSize: FontSizes.sm,
    color: Colors.textLight,
    marginTop: Spacing.xs,
  },
})
