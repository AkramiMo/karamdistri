/**
 * Export des commandes vers Excel
 */

import { appendToCommandesExcel } from './saveWithPicker'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface OrderClient {
  code: string
  name: string
}

export interface OrderForExport {
  id: string
  order_number: string
  order_date: string
  status: string
  total_ht: number
  client?: OrderClient
}

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  confirmed: 'Confirmée',
  in_preparation: 'En préparation',
  ready: 'Prête',
  in_delivery: 'En livraison',
  delivered: 'Livrée',
  partial: 'Partiellement livrée',
  returned: 'Retournée',
  cancelled: 'Annulée',
  out_of_stock: 'Rupture de stock',
  in_progress: 'En cours',
}

// Colonnes pour le fichier Excel commandes
const COMMANDES_COLUMNS = ['Date', 'N° Commande', 'Code Client', 'Client', 'Statut', 'Total HT']
const COMMANDES_COL_WIDTHS = [
  { wch: 12 },  // Date
  { wch: 18 },  // N° Commande
  { wch: 12 },  // Code Client
  { wch: 30 },  // Client
  { wch: 18 },  // Statut
  { wch: 12 },  // Total HT
]

/**
 * Convertir une commande en ligne Excel
 */
function orderToRow(order: OrderForExport): Record<string, string | number> {
  return {
    'Date': format(new Date(order.order_date), 'dd/MM/yyyy', { locale: fr }),
    'N° Commande': order.order_number,
    'Code Client': order.client?.code || '-',
    'Client': order.client?.name || '-',
    'Statut': statusLabels[order.status] || order.status,
    'Total HT': order.total_ht,
  }
}

/**
 * Ajouter une commande au fichier Excel existant (append)
 * Colonnes: Date, N° Commande, Code Client, Client, Statut, Total HT
 */
export async function appendCommandeToExcel(
  order: OrderForExport
): Promise<{ success: boolean; filename: string }> {
  const row = orderToRow(order)
  const result = await appendToCommandesExcel(row, COMMANDES_COLUMNS, COMMANDES_COL_WIDTHS)
  return result
}

/**
 * Exporter plusieurs commandes vers Excel (utilisé pour export manuel)
 * Colonnes: Date, N° Commande, Code Client, Client, Statut, Total HT
 */
export async function exportCommandesToExcel(
  orders: OrderForExport[]
): Promise<{ success: boolean; filename: string; count: number }> {
  let result = { success: true, filename: '' }

  for (const order of orders) {
    result = await appendCommandeToExcel(order)
    if (!result.success) break
  }

  return {
    success: result.success,
    filename: result.filename,
    count: orders.length,
  }
}
