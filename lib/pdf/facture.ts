import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface DeliveryItem {
  id: string
  delivery_number: string
  delivery_date: string | null
  total_ht: number | null
}

interface Client {
  code: string
  name: string
  phone: string | null
  city: string | null
  ice: string | null
}

interface Facture {
  id: string
  facture_number: string
  facture_date: string
  total_ht: number
  total_tva: number
  total_ttc: number
  client: Client
}

export async function generateFacturePDF(
  facture: Facture,
  deliveries: DeliveryItem[],
  logoUrl?: string
): Promise<void> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width

  // Load logo if available
  let logoLoaded = false
  if (logoUrl) {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          try {
            doc.addImage(img, 'JPEG', 15, 10, 40, 25)
            logoLoaded = true
          } catch {
            // Logo loading failed, continue without it
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

  // Title: Facture N° - centered
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  const title = `Facture N° : ${facture.facture_number}`
  doc.text(title, pageWidth / 2, 22, { align: 'center' })

  // Date - top right
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  const formattedDate = formatDate(facture.facture_date)
  doc.text(formattedDate, pageWidth - 15, 22, { align: 'right' })

  // Client section - right side below header
  const clientBoxX = pageWidth - 85
  const clientBoxY = 35
  const clientBoxWidth = 70

  doc.setDrawColor(184, 134, 11) // Gold color
  doc.setLineWidth(0.5)
  doc.rect(clientBoxX, clientBoxY, clientBoxWidth, 35)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(184, 134, 11)
  doc.text('CLIENT', clientBoxX + 5, clientBoxY + 8)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)

  let clientY = clientBoxY + 15
  doc.setFont('helvetica', 'bold')
  doc.text(facture.client.name, clientBoxX + 5, clientY)
  clientY += 5

  doc.setFont('helvetica', 'normal')
  if (facture.client.phone) {
    doc.text(`Tél: ${facture.client.phone}`, clientBoxX + 5, clientY)
    clientY += 5
  }
  if (facture.client.ice) {
    doc.text(`ICE: ${facture.client.ice}`, clientBoxX + 5, clientY)
    clientY += 5
  }
  if (facture.client.city) {
    doc.text(facture.client.city, clientBoxX + 5, clientY)
  }

  // Table with deliveries
  const tableData = deliveries.map((del) => [
    del.delivery_date ? formatDate(del.delivery_date) : '-',
    del.delivery_number,
    formatPrice(del.total_ht || 0),
  ])

  autoTable(doc, {
    startY: 80,
    head: [['Date', 'N° BL', 'Montant HT']],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [184, 134, 11], // Gold color
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 11,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 40 },
      1: { halign: 'center', cellWidth: 70 },
      2: { halign: 'right', cellWidth: 60 },
    },
    styles: {
      fontSize: 10,
      cellPadding: 5,
    },
    alternateRowStyles: {
      fillColor: [250, 245, 230],
    },
    margin: { left: 15, right: 15 },
  })

  // Get the Y position after the table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY + 15

  // Totals - bottom right
  const totalsX = pageWidth - 85
  const totalsWidth = 70

  doc.setDrawColor(184, 134, 11)
  doc.setLineWidth(0.5)
  doc.rect(totalsX, finalY, totalsWidth, 40)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)

  // Total HT
  doc.text('Total HT:', totalsX + 5, finalY + 10)
  doc.text(formatPrice(facture.total_ht), totalsX + totalsWidth - 5, finalY + 10, { align: 'right' })

  // Total TVA
  doc.text('Total TVA (20%):', totalsX + 5, finalY + 20)
  doc.text(formatPrice(facture.total_tva), totalsX + totalsWidth - 5, finalY + 20, { align: 'right' })

  // Total TTC
  doc.setDrawColor(184, 134, 11)
  doc.line(totalsX + 3, finalY + 25, totalsX + totalsWidth - 3, finalY + 25)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(184, 134, 11)
  doc.text('Total TTC:', totalsX + 5, finalY + 35)
  doc.text(formatPrice(facture.total_ttc), totalsX + totalsWidth - 5, finalY + 35, { align: 'right' })

  // Save the PDF
  doc.save(`Facture_${facture.facture_number}.pdf`)
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2,
  }).format(price)
}
