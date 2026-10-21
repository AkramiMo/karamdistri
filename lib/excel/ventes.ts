/**
 * Export des ventes vers Excel
 */

import { appendToVentesExcel } from './saveWithPicker'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

export interface SaleForExport {
  id: string
  sale_number: string
  sale_date: string
  total_ht: number | null
  total_ttc: number | null
  amount_paid: number | null
  balance_due: number | null
  mb: number | null
  payment_status: string
  rblt_number?: string | null
  client?: { name: string; code: string }
  delivery?: { delivery_number: string }
  return?: { round?: { round_number: string } }
}

const paymentStatusLabels: Record<string, string> = {
  pending: 'Non réglée',
  paid: 'Réglée',
  partial: 'Partiellement réglée',
  returned: 'Retour',
  cancelled: 'Annulée',
}

// Colonnes pour le fichier Excel ventes
const VENTES_COLUMNS = ['Date', 'N° Vente', 'Code Client', 'Client', 'BL', 'Recette', 'Encaissé', 'Solde', 'Statut', 'Total HT', 'MB']
const VENTES_COL_WIDTHS = [
  { wch: 12 },  // Date
  { wch: 18 },  // N° Vente
  { wch: 12 },  // Code Client
  { wch: 25 },  // Client
  { wch: 16 },  // BL
  { wch: 12 },  // Recette
  { wch: 12 },  // Encaissé
  { wch: 12 },  // Solde
  { wch: 18 },  // Statut
  { wch: 12 },  // Total HT
  { wch: 12 },  // MB
]

/**
 * Convertir une vente en ligne Excel
 */
function saleToRow(sale: SaleForExport): Record<string, string | number> {
  return {
    'Date': format(new Date(sale.sale_date), 'dd/MM/yyyy', { locale: fr }),
    'N° Vente': sale.sale_number,
    'Code Client': sale.client?.code || sale.rblt_number || '-',
    'Client': sale.client?.name || (sale.rblt_number ? '---' : '-'),
    'BL': sale.return?.round?.round_number || sale.delivery?.delivery_number || '-',
    'Recette': sale.total_ttc || 0,
    'Encaissé': sale.amount_paid || 0,
    'Solde': sale.balance_due || 0,
    'Statut': paymentStatusLabels[sale.payment_status] || sale.payment_status,
    'Total HT': sale.total_ht || 0,
    'MB': sale.mb || 0,
  }
}

/**
 * Ajouter une vente au fichier Excel existant (append)
 * Colonnes: Date, N° Vente, Code Client, Client, BL, Recette, Encaissé, Solde, Statut, Total HT, MB
 */
export async function appendVenteToExcel(
  sale: SaleForExport
): Promise<{ success: boolean; filename: string }> {
  const row = saleToRow(sale)
  const result = await appendToVentesExcel(row, VENTES_COLUMNS, VENTES_COL_WIDTHS)
  return result
}

/**
 * Exporter plusieurs ventes vers Excel (utilisé pour export manuel)
 * Colonnes: Date, N° Vente, Code Client, Client, BL, Recette, Encaissé, Solde, Statut, Total HT, MB
 */
export async function exportVentesToExcel(
  sales: SaleForExport[]
): Promise<{ success: boolean; filename: string; count: number }> {
  let result = { success: true, filename: '' }

  for (const sale of sales) {
    result = await appendVenteToExcel(sale)
    if (!result.success) break
  }

  return {
    success: result.success,
    filename: result.filename,
    count: sales.length,
  }
}
