/**
 * Calcul de la Marge Brute (MB) pour les ventes
 * MB = Σ [(Prix unitaire HT - CR) × quantité vendue]
 */

export interface DeliveryItemForMB {
  unit_price: number
  quantity_delivered: number
  quantity_returned: number
  article?: {
    cr?: number | null
  } | null
}

export interface MBCalculationResult {
  mb: number
  hasMissingCR: boolean
  itemsWithoutCR: number
  totalItems: number
}

/**
 * Calcule la Marge Brute (MB) à partir des articles d'une livraison
 * @param items - Liste des articles avec prix, quantités et CR
 * @returns Résultat du calcul avec MB et indicateur de CR manquants
 */
export function calculateMB(items: DeliveryItemForMB[]): MBCalculationResult {
  let mb = 0
  let itemsWithoutCR = 0
  let totalItems = 0

  for (const item of items) {
    const qtySold = (item.quantity_delivered || 0) - (item.quantity_returned || 0)

    if (qtySold > 0) {
      totalItems++
      const cr = item.article?.cr

      if (cr === null || cr === undefined) {
        itemsWithoutCR++
        // On calcule quand même avec CR = 0, mais on signale l'avertissement
        mb += item.unit_price * qtySold
      } else {
        mb += (item.unit_price - cr) * qtySold
      }
    }
  }

  return {
    mb,
    hasMissingCR: itemsWithoutCR > 0,
    itemsWithoutCR,
    totalItems
  }
}

/**
 * Calcule la MB pour une tournée (plusieurs livraisons)
 * @param roundItems - Liste des items de tournée avec leurs livraisons
 * @returns Résultat du calcul avec MB et indicateur de CR manquants
 */
export function calculateMBForRound(roundItems: Array<{ delivery?: { delivery_items?: DeliveryItemForMB[] } | null }>): MBCalculationResult {
  let totalMB = 0
  let totalItemsWithoutCR = 0
  let totalItems = 0

  for (const ri of roundItems) {
    const deliveryItems = ri.delivery?.delivery_items
    if (!deliveryItems) continue

    const result = calculateMB(deliveryItems)
    totalMB += result.mb
    totalItemsWithoutCR += result.itemsWithoutCR
    totalItems += result.totalItems
  }

  return {
    mb: totalMB,
    hasMissingCR: totalItemsWithoutCR > 0,
    itemsWithoutCR: totalItemsWithoutCR,
    totalItems
  }
}
