/**
 * Export Excel pour les quantités vendues/livrées par article et par mois
 */

import * as XLSX from 'xlsx'

export interface DeliveryItemForExport {
  article_code: string
  article_name: string
  quantity_delivered: number
  quantity_returned: number
  delivery_date: string
}

/**
 * Exporter les quantités vendues par article pour un mois donné
 */
export function exportDeliveriesByMonth(
  items: DeliveryItemForExport[],
  month: string // Format: YYYY-MM
): { workbook: XLSX.WorkBook; filename: string } {
  // Agréger les quantités par article (livré - retourné)
  const aggregated = new Map<string, { code: string; name: string; quantity: number }>()

  for (const item of items) {
    const itemMonth = item.delivery_date.substring(0, 7)
    if (itemMonth !== month) continue

    const netQuantity = item.quantity_delivered - item.quantity_returned
    if (netQuantity <= 0) continue

    const key = item.article_code
    const existing = aggregated.get(key)
    if (existing) {
      existing.quantity += netQuantity
    } else {
      aggregated.set(key, {
        code: item.article_code,
        name: item.article_name,
        quantity: netQuantity,
      })
    }
  }

  // Convertir en tableau pour Excel
  const data = Array.from(aggregated.values()).map(item => ({
    'Code Article': item.code,
    'Désignation': item.name,
    'Quantité Vendue': item.quantity,
  }))

  // Trier par code article
  data.sort((a, b) => a['Code Article'].localeCompare(b['Code Article']))

  // Créer le workbook
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Définir les largeurs de colonnes
  worksheet['!cols'] = [
    { wch: 15 },  // Code Article
    { wch: 40 },  // Désignation
    { wch: 15 },  // Quantité
  ]

  const workbook = XLSX.utils.book_new()
  const [year, monthNum] = month.split('-')
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  const sheetName = `${monthNames[parseInt(monthNum) - 1]} ${year}`
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  const filename = `ventes_${month}.xlsx`

  return { workbook, filename }
}

/**
 * Télécharger l'export des ventes par mois
 */
export function downloadDeliveriesExcel(
  items: DeliveryItemForExport[],
  month: string
): void {
  const { workbook, filename } = exportDeliveriesByMonth(items, month)
  XLSX.writeFile(workbook, filename)
}

/**
 * Obtenir les quantités agrégées par article pour un mois
 */
export function getMonthlyDeliveryQuantities(
  items: DeliveryItemForExport[],
  month: string
): Array<{ code: string; name: string; quantity: number }> {
  const aggregated = new Map<string, { code: string; name: string; quantity: number }>()

  for (const item of items) {
    const itemMonth = item.delivery_date.substring(0, 7)
    if (itemMonth !== month) continue

    const netQuantity = item.quantity_delivered - item.quantity_returned
    if (netQuantity <= 0) continue

    const key = item.article_code
    const existing = aggregated.get(key)
    if (existing) {
      existing.quantity += netQuantity
    } else {
      aggregated.set(key, {
        code: item.article_code,
        name: item.article_name,
        quantity: netQuantity,
      })
    }
  }

  return Array.from(aggregated.values()).sort((a, b) => a.code.localeCompare(b.code))
}
