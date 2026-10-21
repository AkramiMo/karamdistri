import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface Client {
  code: string
  name: string
  phone: string | null
  address: string | null
  city: string | null
  ice: string | null
}

interface BLItem {
  delivery_number: string
  delivery_date: string
  total_ht: number
  amount_paid: number
  balance_due: number
  payment_status: string
}

interface FactureItem {
  facture_number: string
  facture_date: string
  total_ttc: number
  status: string
  delivery_numbers?: string[]
}

interface PaymentItem {
  payment_number: string
  payment_date: string
  amount: number
  payment_method: string
  reference: string | null
  delivery_number?: string | null
  facture_number?: string | null
}

interface SituationData {
  client: Client
  period: { from: string; to: string }
  deliveries: BLItem[]
  factures: FactureItem[]
  payments: PaymentItem[]
  totalDebt: number
}

interface CompanyInfo {
  name?: string
  ice?: string | null
  if_number?: string | null
  tp?: string | null
  phone?: string | null
  address?: string | null
}

const formatCurrency = (amount: number) => {
  const formatted = amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${formatted} DH`
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

const paymentMethodLabels: Record<string, string> = {
  cash: 'Espèces',
  cash_deposit: "Versement d'espèces",
  check: 'Chèque',
  transfer: 'Virement',
  card: 'Carte',
}

const statusLabels: Record<string, string> = {
  pending: 'En attente',
  partial: 'Partiel',
  partially_paid: 'Partiel',
  paid: 'Payé',
  unpaid: 'Non payé',
  draft: 'Brouillon',
  sent: 'Envoyée',
  overdue: 'En retard',
}

export async function generateSituationClientPDF(
  data: SituationData,
  logoUrl?: string,
  companyInfo?: CompanyInfo
): Promise<void> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width
  let yPos = 10

  // Calculs globaux (utilisés partout dans le document)
  const totalBL = data.deliveries.reduce((sum, bl) => sum + bl.total_ht, 0)
  const totalFactures = data.factures.reduce((sum, f) => sum + f.total_ttc, 0)
  const totalGeneral = totalBL + totalFactures
  const totalPaid = data.payments.reduce((sum, p) => sum + p.amount, 0)
  const soldeDu = totalGeneral - totalPaid

  // Load logo if available
  if (logoUrl) {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          try {
            doc.addImage(img, 'PNG', 10, 6, 40, 24)
          } catch {
            // Logo loading failed
          }
          resolve()
        }
        img.onerror = () => reject()
        img.src = logoUrl
      })
    } catch {
      // Continue without logo
    }
  }

  // Company info (sous le logo, aligné à gauche avec le contenu visuel du logo)
  yPos = 32
  const idX = 18  // Aligné avec le contenu visuel du logo
  if (companyInfo) {
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(80, 80, 80)
    if (companyInfo.ice) {
      doc.text(`ICE: ${companyInfo.ice}`, idX, yPos)
      yPos += 4
    }
    if (companyInfo.if_number) {
      doc.text(`IF: ${companyInfo.if_number}`, idX, yPos)
      yPos += 4
    }
    if (companyInfo.tp) {
      doc.text(`TP: ${companyInfo.tp}`, idX, yPos)
      yPos += 4
    }
  }

  yPos += 4

  // Title
  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(184, 134, 11) // Golden color
  doc.text('SITUATION DE COMPTE CLIENT', pageWidth / 2, yPos, { align: 'center' })
  yPos += 8

  // Period and Solde dû
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Période: du ${formatDate(data.period.from)} au ${formatDate(data.period.to)}`, pageWidth / 2, yPos, { align: 'center' })
  yPos += 6
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(220, 38, 38) // Red color
  doc.text(`Solde dû: ${formatCurrency(soldeDu)}`, pageWidth / 2, yPos, { align: 'center' })
  yPos += 10

  // Client info box
  doc.setDrawColor(184, 134, 11)
  doc.setLineWidth(0.5)
  doc.roundedRect(10, yPos, pageWidth - 20, 28, 3, 3)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('INFORMATIONS CLIENT', 15, yPos + 6)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  yPos += 11
  doc.text(`Code: ${data.client.code}`, 15, yPos)
  doc.text(`Nom: ${data.client.name}`, 70, yPos)
  yPos += 5
  doc.text(`Tél: ${data.client.phone || '-'}`, 15, yPos)
  doc.text(`Ville: ${data.client.city || '-'}`, 70, yPos)
  yPos += 5
  if (data.client.ice) {
    doc.text(`ICE: ${data.client.ice}`, 15, yPos)
  }
  if (data.client.address) {
    doc.text(`Adresse: ${data.client.address}`, 70, yPos)
  }
  yPos += 12

  // BL Table
  if (data.deliveries.length > 0) {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(184, 134, 11)
    doc.text('BONS DE LIVRAISON', 10, yPos)
    yPos += 2

    autoTable(doc, {
      startY: yPos,
      head: [['N° BL', 'Date', 'Montant', 'Payé', 'Reste', 'Statut']],
      body: data.deliveries.map(bl => [
        bl.delivery_number,
        formatDate(bl.delivery_date),
        formatCurrency(bl.total_ht),
        formatCurrency(bl.amount_paid),
        formatCurrency(bl.balance_due),
        statusLabels[bl.payment_status] || bl.payment_status,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [184, 134, 11], textColor: 255 },
      alternateRowStyles: { fillColor: [252, 248, 240] },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' },
      },
    })

    yPos = (doc as any).lastAutoTable.finalY + 8
  }

  // Factures Table
  if (data.factures.length > 0) {
    // Check if we need a new page
    if (yPos > 220) {
      doc.addPage()
      yPos = 15
    }

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(184, 134, 11)
    doc.text('FACTURES', 10, yPos)
    yPos += 2

    autoTable(doc, {
      startY: yPos,
      head: [['N° Facture', 'Date', 'BL Liés', 'Montant TTC', 'Statut']],
      body: data.factures.map(f => [
        f.facture_number,
        formatDate(f.facture_date),
        f.delivery_numbers?.join(' ') || '',
        formatCurrency(f.total_ttc),
        statusLabels[f.status] || f.status,
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [184, 134, 11], textColor: 255 },
      alternateRowStyles: { fillColor: [252, 248, 240] },
      columnStyles: {
        2: { cellWidth: 40 },
        3: { halign: 'right' },
      },
    })

    yPos = (doc as any).lastAutoTable.finalY + 8
  }

  // Payments Table
  if (data.payments.length > 0) {
    // Check if we need a new page
    if (yPos > 220) {
      doc.addPage()
      yPos = 15
    }

    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(184, 134, 11)
    doc.text('PAIEMENTS', 10, yPos)
    yPos += 2

    autoTable(doc, {
      startY: yPos,
      head: [['N° Paiement', 'Date', 'Montant', 'Méthode', 'Référence']],
      body: data.payments.map(p => [
        p.payment_number,
        formatDate(p.payment_date),
        formatCurrency(p.amount),
        paymentMethodLabels[p.payment_method] || p.payment_method,
        p.facture_number || p.delivery_number || p.reference || '-',
      ]),
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [34, 139, 34], textColor: 255 },
      alternateRowStyles: { fillColor: [240, 255, 240] },
      columnStyles: {
        2: { halign: 'right' },
      },
    })

    yPos = (doc as any).lastAutoTable.finalY + 10
  }

  // Summary box
  // Check if we need a new page
  if (yPos > 250) {
    doc.addPage()
    yPos = 15
  }

  const summaryBoxHeight = 50
  doc.setDrawColor(184, 134, 11)
  doc.setFillColor(252, 248, 240)
  doc.setLineWidth(1)
  doc.roundedRect(pageWidth - 95, yPos, 85, summaryBoxHeight, 3, 3, 'FD')

  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)

  doc.text('Total BL:', pageWidth - 90, yPos + 7)
  doc.text(formatCurrency(totalBL), pageWidth - 15, yPos + 7, { align: 'right' })

  doc.text('Total Factures:', pageWidth - 90, yPos + 14)
  doc.text(formatCurrency(totalFactures), pageWidth - 15, yPos + 14, { align: 'right' })

  doc.setFont('helvetica', 'bold')
  doc.text('TOTAL:', pageWidth - 90, yPos + 22)
  doc.text(formatCurrency(totalGeneral), pageWidth - 15, yPos + 22, { align: 'right' })

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(34, 139, 34)
  doc.text('Total Payé:', pageWidth - 90, yPos + 30)
  doc.text(formatCurrency(totalPaid), pageWidth - 15, yPos + 30, { align: 'right' })

  doc.setTextColor(220, 38, 38)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.text('SOLDE DÛ:', pageWidth - 90, yPos + 40)
  doc.text(formatCurrency(soldeDu), pageWidth - 15, yPos + 40, { align: 'right' })

  // Solde dû à la date avec référence de paiement
  yPos += summaryBoxHeight + 10

  const todayFormatted = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  // Récupérer la dernière référence de paiement si disponible
  const lastPaymentRef = data.payments.length > 0
    ? data.payments.sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime())[0]?.reference
    : null

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)

  let soldeLine = `Solde dû à la date du ${todayFormatted} : ${formatCurrency(soldeDu)}`
  if (lastPaymentRef) {
    soldeLine += ` (Réf. dernier paiement: ${lastPaymentRef})`
  }

  doc.text(soldeLine, 10, yPos)

  // Footer
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(
      `Document généré le ${new Date().toLocaleDateString('fr-FR')} - Page ${i}/${pageCount}`,
      pageWidth - 10,
      doc.internal.pageSize.height - 10,
      { align: 'right' }
    )
  }

  // Save PDF
  const fileName = `Situation_${data.client.code}_${data.period.from}_${data.period.to}.pdf`
  doc.save(fileName)
}
