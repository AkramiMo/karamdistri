import { useEffect, useState } from 'react'
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
} from 'react-native'
import { useLocalSearchParams, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { supabase } from '@/lib/supabase'
import { Colors, Spacing, FontSizes, BorderRadius } from '@/constants/theme'
import { Delivery, DeliveryItem, DeliveryStatusLabels, DeliveryStatusColors, DeliveryStatus } from '@/types'

export default function DeliveryDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const router = useRouter()
  const [delivery, setDelivery] = useState<Delivery | null>(null)
  const [items, setItems] = useState<DeliveryItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'check'>('cash')

  const fetchDelivery = async () => {
    const { data: deliveryData } = await supabase
      .from('deliveries')
      .select(`
        *,
        client:clients(*)
      `)
      .eq('id', id)
      .single()

    if (deliveryData) {
      setDelivery(deliveryData)
    }

    const { data: itemsData } = await supabase
      .from('delivery_items')
      .select(`
        *,
        article:articles(code, name)
      `)
      .eq('delivery_id', id)

    if (itemsData) {
      setItems(itemsData)
    }

    setIsLoading(false)
  }

  useEffect(() => {
    fetchDelivery()
  }, [id])

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('fr-MA', {
      style: 'currency',
      currency: 'MAD',
    }).format(amount)
  }

  const handleStartDelivery = async () => {
    const { error } = await supabase
      .from('deliveries')
      .update({ status: 'in_delivery' })
      .eq('id', id)

    if (!error) {
      setDelivery(prev => prev ? { ...prev, status: 'in_delivery' } : null)
    }
  }

  const handleCompleteDelivery = async () => {
    Alert.alert(
      'Confirmer la livraison',
      'Voulez-vous marquer cette livraison comme terminée ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: async () => {
            const { error } = await supabase
              .from('deliveries')
              .update({ status: 'delivered' })
              .eq('id', id)

            if (!error) {
              setDelivery(prev => prev ? { ...prev, status: 'delivered' } : null)
              Alert.alert('Succès', 'Livraison terminée avec succès')
            }
          },
        },
      ]
    )
  }

  const handlePayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      Alert.alert('Erreur', 'Veuillez entrer un montant valide')
      return
    }

    const { error } = await supabase.from('cash_register').insert({
      transaction_date: new Date().toISOString(),
      category: 'vente',
      operation_type: 'encaissement',
      amount: parseFloat(paymentAmount),
      reference: delivery?.delivery_number,
      reference_id: delivery?.id,
      notes: `Paiement ${paymentMethod === 'cash' ? 'espèces' : 'chèque'} - ${delivery?.client?.name}`,
    })

    if (!error) {
      setShowPaymentModal(false)
      setPaymentAmount('')
      Alert.alert('Succès', 'Paiement enregistré avec succès')
    } else {
      Alert.alert('Erreur', 'Erreur lors de l\'enregistrement du paiement')
    }
  }

  if (isLoading || !delivery) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Chargement...</Text>
      </View>
    )
  }

  const status = delivery.status as DeliveryStatus
  const statusColor = DeliveryStatusColors[status] || Colors.textSecondary
  const statusLabel = DeliveryStatusLabels[status] || delivery.status

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* En-tête */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.deliveryNumber}>{delivery.delivery_number}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {statusLabel}
              </Text>
            </View>
          </View>
        </View>

        {/* Informations client */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Client</Text>
          <View style={styles.clientCard}>
            <View style={styles.clientInfo}>
              <Text style={styles.clientCode}>{delivery.client?.code}</Text>
              <Text style={styles.clientName}>{delivery.client?.name}</Text>
              {delivery.client?.address && (
                <Text style={styles.clientAddress}>
                  {delivery.client.address}, {delivery.client.city}
                </Text>
              )}
            </View>
            {delivery.client?.phone && (
              <TouchableOpacity style={styles.phoneButton}>
                <Ionicons name="call" size={24} color={Colors.success} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Articles */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Articles ({items.length})</Text>
          {items.map((item, index) => (
            <View key={item.id} style={styles.itemRow}>
              <View style={styles.itemInfo}>
                <Text style={styles.itemCode}>{item.article?.code}</Text>
                <Text style={styles.itemName}>{item.article?.name}</Text>
              </View>
              <View style={styles.itemQuantity}>
                <Text style={styles.quantityText}>{item.quantity}</Text>
              </View>
              <View style={styles.itemPrice}>
                <Text style={styles.priceText}>{formatPrice(item.total_ht)}</Text>
              </View>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalValue}>{formatPrice(delivery.total_ht || 0)}</Text>
          </View>
        </View>

        {/* Notes */}
        {delivery.notes && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notes}>{delivery.notes}</Text>
          </View>
        )}
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        {delivery.status === 'pending' && (
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={handleStartDelivery}
          >
            <Ionicons name="car" size={20} color="#fff" />
            <Text style={styles.actionButtonText}>Démarrer la livraison</Text>
          </TouchableOpacity>
        )}

        {delivery.status === 'in_delivery' && (
          <>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSecondary]}
              onPress={() => setShowPaymentModal(true)}
            >
              <Ionicons name="cash" size={20} color={Colors.primary} />
              <Text style={[styles.actionButtonText, { color: Colors.primary }]}>
                Encaisser
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.actionButtonSuccess]}
              onPress={handleCompleteDelivery}
            >
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.actionButtonText}>Valider</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {/* Modal de paiement */}
      <Modal visible={showPaymentModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Enregistrer un paiement</Text>

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
              <TouchableOpacity
                style={[
                  styles.paymentMethodButton,
                  paymentMethod === 'cash' && styles.paymentMethodActive,
                ]}
                onPress={() => setPaymentMethod('cash')}
              >
                <Ionicons
                  name="cash"
                  size={24}
                  color={paymentMethod === 'cash' ? '#fff' : Colors.text}
                />
                <Text
                  style={[
                    styles.paymentMethodText,
                    paymentMethod === 'cash' && styles.paymentMethodTextActive,
                  ]}
                >
                  Espèces
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.paymentMethodButton,
                  paymentMethod === 'check' && styles.paymentMethodActive,
                ]}
                onPress={() => setPaymentMethod('check')}
              >
                <Ionicons
                  name="document-text"
                  size={24}
                  color={paymentMethod === 'check' ? '#fff' : Colors.text}
                />
                <Text
                  style={[
                    styles.paymentMethodText,
                    paymentMethod === 'check' && styles.paymentMethodTextActive,
                  ]}
                >
                  Chèque
                </Text>
              </TouchableOpacity>
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
                onPress={handlePayment}
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
  content: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryNumber: {
    fontSize: FontSizes.xl,
    fontWeight: 'bold',
    color: Colors.text,
    fontFamily: 'monospace',
  },
  statusBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
  },
  statusText: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
  },
  section: {
    backgroundColor: Colors.surface,
    padding: Spacing.md,
    marginTop: Spacing.md,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: Spacing.md,
  },
  clientCard: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clientInfo: {
    flex: 1,
  },
  clientCode: {
    fontSize: FontSizes.sm,
    fontWeight: '600',
    color: Colors.primary,
  },
  clientName: {
    fontSize: FontSizes.lg,
    fontWeight: '600',
    color: Colors.text,
  },
  clientAddress: {
    fontSize: FontSizes.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  phoneButton: {
    padding: Spacing.md,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  itemInfo: {
    flex: 1,
  },
  itemCode: {
    fontSize: FontSizes.xs,
    color: Colors.textSecondary,
    fontFamily: 'monospace',
  },
  itemName: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  itemQuantity: {
    width: 50,
    alignItems: 'center',
  },
  quantityText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: Colors.text,
  },
  itemPrice: {
    width: 80,
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: FontSizes.md,
    color: Colors.text,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: Spacing.md,
    marginTop: Spacing.sm,
    borderTopWidth: 2,
    borderTopColor: Colors.primary,
  },
  totalLabel: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.text,
  },
  totalValue: {
    fontSize: FontSizes.lg,
    fontWeight: 'bold',
    color: Colors.primary,
  },
  notes: {
    fontSize: FontSizes.md,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  actions: {
    flexDirection: 'row',
    padding: Spacing.md,
    gap: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  actionButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  actionButtonSecondary: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  actionButtonSuccess: {
    backgroundColor: Colors.success,
  },
  actionButtonText: {
    fontSize: FontSizes.md,
    fontWeight: '600',
    color: '#fff',
  },
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
    marginBottom: Spacing.lg,
    textAlign: 'center',
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
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  paymentMethodButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  paymentMethodActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  paymentMethodText: {
    fontSize: FontSizes.md,
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
