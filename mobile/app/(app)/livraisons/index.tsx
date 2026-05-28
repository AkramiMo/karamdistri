import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput,
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme'
import { Delivery, DeliveryStatusLabels, DeliveryStatusColors, DeliveryStatus } from '@/types'

export default function LivraisonsScreen() {
  const { user } = useAuth()
  const router = useRouter()
  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [filteredDeliveries, setFilteredDeliveries] = useState<Delivery[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const fetchDeliveries = useCallback(async () => {
    const { data, error } = await supabase
      .from('deliveries')
      .select(`
        *,
        client:clients(id, code, name, phone, address, city)
      `)
      .eq('driver_id', user?.id)
      .order('delivery_date', { ascending: false })
      .limit(50)

    if (!error && data) {
      setDeliveries(data)
      setFilteredDeliveries(data)
    }
    setIsLoading(false)
  }, [user])

  useEffect(() => {
    fetchDeliveries()
  }, [fetchDeliveries])

  useEffect(() => {
    if (searchTerm) {
      const filtered = deliveries.filter(
        d =>
          d.delivery_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          d.client?.code?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredDeliveries(filtered)
    } else {
      setFilteredDeliveries(deliveries)
    }
  }, [searchTerm, deliveries])

  const onRefresh = async () => {
    setIsRefreshing(true)
    await fetchDeliveries()
    setIsRefreshing(false)
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    })
  }

  const renderDeliveryItem = ({ item }: { item: Delivery }) => {
    const status = item.status as DeliveryStatus
    const statusColor = DeliveryStatusColors[status] || Colors.textSecondary
    const statusLabel = DeliveryStatusLabels[status] || item.status

    return (
      <TouchableOpacity
        style={styles.deliveryCard}
        onPress={() => router.push(`/livraisons/${item.id}`)}
      >
        <View style={styles.cardLeft}>
          <View style={[styles.statusIndicator, { backgroundColor: statusColor }]} />
        </View>
        <View style={styles.cardContent}>
          <View style={styles.cardHeader}>
            <Text style={styles.deliveryNumber}>{item.delivery_number}</Text>
            <Text style={styles.deliveryDate}>{formatDate(item.delivery_date)}</Text>
          </View>
          <Text style={styles.clientName}>{item.client?.name}</Text>
          <Text style={styles.statusLabel}>{statusLabel}</Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={Colors.textLight} />
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      {/* Barre de recherche */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={Colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Rechercher une livraison..."
          placeholderTextColor={Colors.textLight}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm !== '' && (
          <TouchableOpacity onPress={() => setSearchTerm('')}>
            <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* Liste des livraisons */}
      <FlatList
        data={filteredDeliveries}
        keyExtractor={(item) => item.id}
        renderItem={renderDeliveryItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color={Colors.textLight} />
            <Text style={styles.emptyText}>Aucune livraison trouvée</Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    margin: Spacing.md,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  list: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  deliveryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardLeft: {
    marginRight: Spacing.md,
  },
  statusIndicator: {
    width: 4,
    height: 40,
    borderRadius: 2,
  },
  cardContent: {
    flex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryNumber: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    fontFamily: 'monospace',
  },
  deliveryDate: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  clientName: {
    fontSize: FontSizes.md,
    fontWeight: '500',
    color: Colors.text,
    marginTop: Spacing.xs,
  },
  statusLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
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
  },
})
