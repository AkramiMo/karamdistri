import { useEffect, useState, useCallback } from 'react'
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Linking,
  ActivityIndicator,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { api, RoundDetail, DeliveryInRound } from '@/lib/api'
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme'

const DeliveryStatusLabels: Record<string, string> = {
  pending: 'En attente',
  in_delivery: 'En livraison',
  delivered: 'Livrée',
  partial: 'Partielle',
  returned: 'Retournée',
}

const DeliveryStatusColors: Record<string, string> = {
  pending: '#f59e0b',
  in_delivery: '#3b82f6',
  delivered: '#22c55e',
  partial: '#f97316',
  returned: '#ef4444',
}

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

export default function RoundDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [round, setRound] = useState<RoundDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [isStoppingRound, setIsStoppingRound] = useState(false)

  // Payment modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [selectedDelivery, setSelectedDelivery] = useState<DeliveryInRound | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'check' | 'card'>('cash')

  // Delivery status modal
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [deliveryNotes, setDeliveryNotes] = useState('')

  const fetchRound = useCallback(async () => {
    const result = await api.getRoundDetail(id)

    if (result.success && result.data) {
      setRound(result.data.round)
    } else {
      console.error('Error fetching round:', result.error)
      Alert.alert('Erreur', result.error || 'Impossible de charger la tournée')
    }

    setIsLoading(false)
  }, [id])

  useEffect(() => {
    fetchRound()
  }, [fetchRound])

  const onRefresh = async () => {
    setIsRefreshing(true)
    await fetchRound()
    setIsRefreshing(false)
  }

  const handleStopRound = async () => {
    Alert.alert(
      'Terminer la tournée',
      'Voulez-vous terminer cette tournée ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Terminer',
          style: 'destructive',
          onPress: async () => {
            setIsStoppingRound(true)

            const result = await api.stopRound(id)

            setIsStoppingRound(false)

            if (result.success && result.data) {
              const summary = result.data.round.summary
              Alert.alert(
                'Tournée terminée',
                `Résumé:\n• ${summary.delivered} livrées\n• ${summary.partial} partielles\n• ${summary.returned} retournées`,
                [{ text: 'OK', onPress: () => router.back() }]
              )
            } else {
              Alert.alert('Erreur', result.error || 'Impossible de terminer la tournée')
            }
          }
        }
      ]
    )
  }

  const openMaps = (delivery: DeliveryInRound) => {
    if (delivery.client?.lat && delivery.client?.lng) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${delivery.client.lat},${delivery.client.lng}`
      Linking.openURL(url)
    } else if (delivery.client?.address) {
      const address = encodeURIComponent(
        `${delivery.client.address}, ${delivery.client.city || ''}`
      )
      const url = `https://www.google.com/maps/dir/?api=1&destination=${address}`
      Linking.openURL(url)
    } else {
      Alert.alert('Erreur', 'Aucune adresse disponible')
    }
  }

  const callClient = (phone: string | null) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`)
    }
  }

  const handleMarkDelivered = async (delivery: DeliveryInRound) => {
    setSelectedDelivery(delivery)
    setDeliveryNotes('')
    setShowStatusModal(true)
  }

  const confirmDeliveryStatus = async (status: 'delivered' | 'partial' | 'returned') => {
    if (!selectedDelivery) return

    setActionLoading(selectedDelivery.id)
    setShowStatusModal(false)

    const result = await api.updateDelivery(selectedDelivery.id, {
      status,
      notes: deliveryNotes || undefined
    })

    setActionLoading(null)

    if (result.success) {
      Alert.alert('Succès', `Livraison marquée comme ${DeliveryStatusLabels[status].toLowerCase()}`)
      fetchRound()
    } else {
      Alert.alert('Erreur', result.error || 'Impossible de mettre à jour la livraison')
    }
  }

  const handleOpenPayment = (delivery: DeliveryInRound) => {
    setSelectedDelivery(delivery)
    setPaymentAmount(delivery.balance_due.toFixed(2))
    setPaymentMethod('cash')
    setShowPaymentModal(true)
  }

  const handleSubmitPayment = async () => {
    if (!selectedDelivery) return

    const amount = parseFloat(paymentAmount)
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide')
      return
    }

    setActionLoading(selectedDelivery.id)
    setShowPaymentModal(false)

    const result = await api.recordPayment(selectedDelivery.id, {
      amount,
      method: paymentMethod
    })

    setActionLoading(null)

    if (result.success) {
      Alert.alert('Succès', `Paiement de ${amount.toFixed(2)} MAD enregistré`)
      fetchRound()
    } else {
      Alert.alert('Erreur', result.error || 'Impossible d\'enregistrer le paiement')
    }
  }

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(amount)
  }

  const renderDeliveryItem = ({ item, index }: { item: DeliveryInRound; index: number }) => {
    const statusColor = DeliveryStatusColors[item.status] || Colors.textSecondary
    const statusLabel = DeliveryStatusLabels[item.status] || item.status
    const paymentColor = PaymentStatusColors[item.payment_status] || '#ef4444'
    const paymentLabel = PaymentStatusLabels[item.payment_status] || 'Non payé'
    const isActionLoading = actionLoading === item.id
    const canModify = ['pending', 'in_delivery'].includes(item.status)

    return (
      <View style={styles.deliveryCard}>
        {/* Header with sequence */}
        <View style={styles.cardHeader}>
          <View style={styles.sequenceBadge}>
            <Text style={styles.sequenceText}>{item.sequence}</Text>
          </View>
          <View style={styles.deliveryInfo}>
            <Text style={styles.deliveryNumber}>{item.delivery_number}</Text>
            <View style={styles.badges}>
              <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: paymentColor + '20' }]}>
                <Text style={[styles.statusText, { color: paymentColor }]}>{paymentLabel}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Client Info */}
        <View style={styles.clientSection}>
          <View style={styles.clientInfo}>
            <Text style={styles.clientCode}>{item.client?.code}</Text>
            <Text style={styles.clientName}>{item.client?.name}</Text>
            {item.client?.address && (
              <Text style={styles.clientAddress}>
                {item.client.address}{item.client.city ? `, ${item.client.city}` : ''}
              </Text>
            )}
          </View>
          <View style={styles.quickActions}>
            <TouchableOpacity
              style={styles.quickActionButton}
              onPress={() => openMaps(item)}
            >
              <Ionicons name="navigate" size={22} color={Colors.primary} />
            </TouchableOpacity>
            {item.client?.phone && (
              <TouchableOpacity
                style={styles.quickActionButton}
                onPress={() => callClient(item.client?.phone)}
              >
                <Ionicons name="call" size={22} color={Colors.success} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Articles */}
        <View style={styles.itemsSection}>
          <Text style={styles.itemsTitle}>Articles ({item.items.length})</Text>
          {item.items.slice(0, 3).map((article, idx) => (
            <View key={idx} style={styles.articleRow}>
              <Text style={styles.articleName} numberOfLines={1}>{article.name}</Text>
              <Text style={styles.articleQty}>x{article.quantity_delivered}</Text>
            </View>
          ))}
          {item.items.length > 3 && (
            <Text style={styles.moreItems}>+{item.items.length - 3} autres articles</Text>
          )}
        </View>

        {/* Total & Balance */}
        <View style={styles.totalsRow}>
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(item.total_ttc)}</Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Payé</Text>
            <Text style={[styles.totalValue, { color: Colors.success }]}>
              {formatPrice(item.amount_paid)}
            </Text>
          </View>
          <View style={styles.totalItem}>
            <Text style={styles.totalLabel}>Reste</Text>
            <Text style={[styles.totalValue, { color: item.balance_due > 0 ? '#ef4444' : Colors.success }]}>
              {formatPrice(item.balance_due)}
            </Text>
          </View>
        </View>

        {/* Actions */}
        {isActionLoading ? (
          <View style={styles.loadingActions}>
            <ActivityIndicator size="small" color={Colors.primary} />
          </View>
        ) : (
          <View style={styles.cardActions}>
            {canModify && (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonSuccess]}
                onPress={() => handleMarkDelivered(item)}
              >
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.actionButtonTextWhite}>Valider</Text>
              </TouchableOpacity>
            )}

            {item.balance_due > 0 && (
              <TouchableOpacity
                style={[styles.actionButton, styles.actionButtonPayment]}
                onPress={() => handleOpenPayment(item)}
              >
                <Ionicons name="cash" size={18} color="#fff" />
                <Text style={styles.actionButtonTextWhite}>Encaisser</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    )
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Chargement de la tournée...</Text>
      </View>
    )
  }

  if (!round) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={Colors.error} />
        <Text style={styles.errorText}>Tournée non trouvée</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => router.back()}>
          <Text style={styles.retryButtonText}>Retour</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const pendingDeliveries = round.deliveries.filter(d =>
    ['pending', 'in_delivery'].includes(d.status)
  ).length

  return (
    <View style={styles.container}>
      {/* Round Header */}
      <View style={styles.roundHeader}>
        <View style={styles.roundHeaderTop}>
          <Text style={styles.roundNumber}>{round.round_number}</Text>
          <View style={[styles.roundStatusBadge, {
            backgroundColor: round.status === 'in_progress' ? '#3b82f620' : '#22c55e20'
          }]}>
            <Text style={[styles.roundStatusText, {
              color: round.status === 'in_progress' ? '#3b82f6' : '#22c55e'
            }]}>
              {round.status === 'in_progress' ? 'En cours' : 'Terminée'}
            </Text>
          </View>
        </View>
        <View style={styles.roundStats}>
          <View style={styles.roundStatItem}>
            <Ionicons name="cube" size={16} color={Colors.textSecondary} />
            <Text style={styles.roundStatText}>{round.deliveries.length} livraisons</Text>
          </View>
          <View style={styles.roundStatItem}>
            <Ionicons name="hourglass" size={16} color="#f59e0b" />
            <Text style={styles.roundStatText}>{pendingDeliveries} en attente</Text>
          </View>
        </View>
        {round.status === 'in_progress' && (
          <TouchableOpacity
            style={styles.stopRoundButton}
            onPress={handleStopRound}
            disabled={isStoppingRound}
          >
            {isStoppingRound ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="stop-circle" size={20} color="#fff" />
                <Text style={styles.stopRoundButtonText}>Terminer la tournée</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Deliveries List */}
      <FlatList
        data={round.deliveries}
        keyExtractor={(item) => item.id}
        renderItem={renderDeliveryItem}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
        }
      />

      {/* Status Modal */}
      <Modal visible={showStatusModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Statut de la livraison</Text>
            <Text style={styles.modalSubtitle}>{selectedDelivery?.delivery_number}</Text>

            <TextInput
              style={styles.notesInput}
              placeholder="Notes (optionnel)"
              value={deliveryNotes}
              onChangeText={setDeliveryNotes}
              multiline
            />

            <View style={styles.statusButtons}>
              <TouchableOpacity
                style={[styles.statusButton, { backgroundColor: '#22c55e' }]}
                onPress={() => confirmDeliveryStatus('delivered')}
              >
                <Ionicons name="checkmark-circle" size={24} color="#fff" />
                <Text style={styles.statusButtonText}>Livrée</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statusButton, { backgroundColor: '#f97316' }]}
                onPress={() => confirmDeliveryStatus('partial')}
              >
                <Ionicons name="remove-circle" size={24} color="#fff" />
                <Text style={styles.statusButtonText}>Partielle</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.statusButton, { backgroundColor: '#ef4444' }]}
                onPress={() => confirmDeliveryStatus('returned')}
              >
                <Ionicons name="close-circle" size={24} color="#fff" />
                <Text style={styles.statusButtonText}>Retournée</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowStatusModal(false)}
            >
              <Text style={styles.cancelButtonText}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={showPaymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Encaisser</Text>
            <Text style={styles.modalSubtitle}>
              {selectedDelivery?.delivery_number} - {selectedDelivery?.client?.name}
            </Text>

            <View style={styles.paymentInfo}>
              <Text style={styles.paymentInfoLabel}>Reste à payer:</Text>
              <Text style={styles.paymentInfoValue}>
                {formatPrice(selectedDelivery?.balance_due || 0)}
              </Text>
            </View>

            <Text style={styles.inputLabel}>Montant (MAD)</Text>
            <TextInput
              style={styles.input}
              placeholder="0.00"
              keyboardType="decimal-pad"
              value={paymentAmount}
              onChangeText={setPaymentAmount}
            />

            <Text style={styles.inputLabel}>Mode de paiement</Text>
            <View style={styles.paymentMethods}>
              {(['cash', 'check', 'card'] as const).map(method => (
                <TouchableOpacity
                  key={method}
                  style={[
                    styles.paymentMethodButton,
                    paymentMethod === method && styles.paymentMethodActive,
                  ]}
                  onPress={() => setPaymentMethod(method)}
                >
                  <Ionicons
                    name={method === 'cash' ? 'cash' : method === 'check' ? 'document-text' : 'card'}
                    size={24}
                    color={paymentMethod === method ? '#fff' : Colors.text}
                  />
                  <Text style={[
                    styles.paymentMethodText,
                    paymentMethod === method && styles.paymentMethodTextActive,
                  ]}>
                    {method === 'cash' ? 'Espèces' : method === 'check' ? 'Chèque' : 'Carte'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowPaymentModal(false)}
              >
                <Text style={styles.modalButtonCancelText}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={handleSubmitPayment}
              >
                <Text style={styles.modalButtonConfirmText}>Confirmer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    fontSize: FontSizes.lg,
    color: Colors.error,
    marginTop: Spacing.md,
  },
  retryButton: {
    marginTop: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.primary,
    borderRadius: BorderRadius.md,
  },
  retryButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  roundHeader: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  roundHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  roundNumber: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
    fontFamily: 'monospace',
  },
  roundStatusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  roundStatusText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  roundStats: {
    flexDirection: 'row',
    gap: Spacing.lg,
  },
  roundStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  roundStatText: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
  },
  stopRoundButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: '#ef4444',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  stopRoundButtonText: {
    color: '#fff',
    fontSize: FontSizes.md,
    fontWeight: '600',
  },
  list: {
    padding: Spacing.md,
  },
  deliveryCard: {
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
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
  },
  sequenceBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.sm,
  },
  sequenceText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: FontSizes.sm,
  },
  deliveryInfo: {
    flex: 1,
  },
  deliveryNumber: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.text,
    fontFamily: 'monospace',
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginTop: 4,
  },
  statusBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
  },
  clientSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  clientInfo: {
    flex: 1,
  },
  clientCode: {
    fontSize: FontSizes.xs,
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
    marginTop: 2,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  quickActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemsSection: {
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  itemsTitle: {
    fontSize: FontSizes.xs,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  articleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  articleName: {
    flex: 1,
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  articleQty: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary,
    marginLeft: Spacing.sm,
  },
  moreItems: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
  },
  totalItem: {
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
  },
  totalValue: {
    fontSize: FontSizes.md,
    fontWeight: 'bold',
    color: Colors.text,
  },
  loadingActions: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  cardActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.divider,
    paddingTop: Spacing.sm,
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
  actionButtonSuccess: {
    backgroundColor: Colors.success,
  },
  actionButtonPayment: {
    backgroundColor: '#8b5cf6',
  },
  actionButtonTextWhite: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: '#fff',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  notesInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.lg,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  statusButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statusButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  statusButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: FontSizes.sm,
  },
  cancelButton: {
    alignItems: 'center',
    paddingVertical: Spacing.md,
  },
  cancelButtonText: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
  },
  paymentInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  paymentInfoLabel: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
  },
  paymentInfoValue: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: '#ef4444',
  },
  inputLabel: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: Spacing.xs,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: FontSizes.lg,
    marginBottom: Spacing.md,
  },
  paymentMethods: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  paymentMethodButton: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.xs,
  },
  paymentMethodActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  paymentMethodText: {
    fontSize: FontSizes.sm,
    color: Colors.text,
  },
  paymentMethodTextActive: {
    color: '#fff',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  modalButton: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: Colors.background,
  },
  modalButtonConfirm: {
    backgroundColor: Colors.primary,
  },
  modalButtonCancelText: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  modalButtonConfirmText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
})
