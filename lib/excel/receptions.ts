/**
 * Export Excel pour les quantités reçues par article et par mois
 */

import * as XLSX from 'xlsx'

export interface ReceptionItemForExport {
  article_code: string
  article_name: string
  category?: string
  quantity_received: number
  reception_date: string
}

/**
 * Exporter les quantités reçues par article pour un mois donné
 */
export function exportReceptionsByMonth(
  items: ReceptionItemForExport[],
  month: string // Format: YYYY-MM
): { workbook: XLSX.WorkBook; filename: string } {
  // Agréger les quantités par article
  const aggregated = new Map<string, { code: string; name: string; category: string; quantity: number }>()

  for (const item of items) {
    const itemMonth = item.reception_date.substring(0, 7)
    if (itemMonth !== month) continue

    const key = item.article_code
    const existing = aggregated.get(key)
    if (existing) {
      existing.quantity += item.quantity_received
    } else {
      aggregated.set(key, {
        code: item.article_code,
        name: item.article_name,
        category: item.category || 'Non classé',
        quantity: item.quantity_received,
      })
    }
  }

  // Convertir en tableau pour Excel
  const data = Array.from(aggregated.values()).map(item => ({
    'Code Article': item.code,
    'Désignation': item.name,
    'Catégorie': item.category,
    'Quantité Reçue': item.quantity,
  }))

  // Trier par catégorie puis par code article
  data.sort((a, b) => {
    const catCompare = a['Catégorie'].localeCompare(b['Catégorie'])
    if (catCompare !== 0) return catCompare
    return a['Code Article'].localeCompare(b['Code Article'])
  })

  // Créer le workbook
  const worksheet = XLSX.utils.json_to_sheet(data)

  // Définir les largeurs de colonnes
  worksheet['!cols'] = [
    { wch: 15 },  // Code Article
    { wch: 40 },  // Désignation
    { wch: 15 },  // Catégorie
    { wch: 15 },  // Quantité
  ]

  const workbook = XLSX.utils.book_new()
  const [year, monthNum] = month.split('-')
  const monthNames = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
                      'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre']
  const sheetName = `${monthNames[parseInt(monthNum) - 1]} ${year}`
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  const filename = `receptions_${month}.xlsx`

  return { workbook, filename }
}

/**
 * Télécharger l'export des réceptions par mois
 */
export function downloadReceptionsExcel(
  items: ReceptionItemForExport[],
  month: string
): void {
  const { workbook, filename } = exportReceptionsByMonth(items, month)
  XLSX.writeFile(workbook, filename)
}

/**
 * Calculer les statistiques par article et par mois
 */
export function calculateReceptionStats(
  items: ReceptionItemForExport[]
): Map<string, Map<string, number>> {
  // Map<mois, Map<code_article, quantité>>
  const stats = new Map<string, Map<string, number>>()

  for (const item of items) {
    const month = item.reception_date.substring(0, 7)

    if (!stats.has(month)) {
      stats.set(month, new Map())
    }

    const monthStats = stats.get(month)!
    const currentQty = monthStats.get(item.article_code) || 0
    monthStats.set(item.article_code, currentQty + item.quantity_received)
  }

  return stats
}

/**
 * Obtenir les quantités agrégées par article pour un mois
 */
export function getMonthlyArticleQuantities(
  items: ReceptionItemForExport[],
  month: string
): Array<{ code: string; name: string; category: string; quantity: number }> {
  const aggregated = new Map<string, { code: string; name: string; category: string; quantity: number }>()

  for (const item of items) {
    const itemMonth = item.reception_date.substring(0, 7)
    if (itemMonth !== month) continue

    const key = item.article_code
    const existing = aggregated.get(key)
    if (existing) {
      existing.quantity += item.quantity_received
    } else {
      aggregated.set(key, {
        code: item.article_code,
        name: item.article_name,
        category: item.category || 'Non classé',
        quantity: item.quantity_received,
      })
    }
  }

  return Array.from(aggregated.values()).sort((a, b) => {
    const catCompare = a.category.localeCompare(b.category)
    if (catCompare !== 0) return catCompare
    return a.code.localeCompare(b.code)
  })
}
