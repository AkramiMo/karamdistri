import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

interface ArticleItem {
  article_code: string
  article_name: string
  quantity: number
  unit_price: number
  total: number
}

interface DeliveryItem {
  id: string
  delivery_number: string
  delivery_date: string | null
  total_ht: number | null
  items?: ArticleItem[]
}

interface Client {
  code: string
  name: string
  phone: string | null
  city: string | null
  ice: string | null
}

interface CompanyInfo {
  ice?: string | null
  if_number?: string | null
  tp?: string | null  // Taxe Professionnelle (Patente)
}

interface Facture {
  id: string
  facture_number: string
  facture_date: string
  total_ht: number
  total_tva: number
  total_ttc: number
  tva_rate?: number
  client: Client
}

export async function generateFacturePDF(
  facture: Facture,
  deliveries: DeliveryItem[],
  logoUrl?: string,
  companyInfo?: CompanyInfo
): Promise<void> {
  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.width

  // Load logo if available
  if (logoUrl) {
    try {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          try {
            doc.addImage(img, 'PNG', 5, 5, 40, 25)
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

  // Company ICE, IF and TP below logo (aligned with visible logo content)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  let companyY = 33
  if (companyInfo?.ice) {
    doc.text(`ICE: ${companyInfo.ice}`, 15, companyY)
    companyY += 4
  }
  if (companyInfo?.if_number) {
    doc.text(`IF: ${companyInfo.if_number}`, 15, companyY)
    companyY += 4
  }
  if (companyInfo?.tp) {
    doc.text(`TP: ${companyInfo.tp}`, 15, companyY)
  }

  // Title: Facture N° - smaller size, centered
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  const title = `Facture N° : ${facture.facture_number}`
  doc.text(title, pageWidth / 2, 20, { align: 'center' })

  // Date - top right
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  const formattedDate = formatDate(facture.facture_date)
  doc.text(formattedDate, pageWidth - 15, 20, { align: 'right' })

  // Client section - right side, no border
  const clientX = pageWidth - 85

  doc.setFontSize(10)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(184, 134, 11)
  doc.text('CLIENT', clientX, 38)

  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)
  doc.setFontSize(10)

  let clientY = 45
  doc.setFont('helvetica', 'bold')
  doc.text(facture.client.name, clientX, clientY)
  clientY += 5

  doc.setFont('helvetica', 'normal')
  if (facture.client.phone) {
    doc.text(`Tel: ${facture.client.phone}`, clientX, clientY)
    clientY += 5
  }
  if (facture.client.ice) {
    doc.text(`ICE: ${facture.client.ice}`, clientX, clientY)
    clientY += 5
  }
  if (facture.client.city) {
    doc.text(facture.client.city, clientX, clientY)
  }

  // Build table data with BL details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tableData: any[] = []

  deliveries.forEach((del) => {
    const blRef = del.delivery_number
    const blDate = del.delivery_date ? formatDate(del.delivery_date) : '-'
    const itemCount = del.items?.length || 1

    // Add article rows with BL reference and date
    if (del.items && del.items.length > 0) {
      del.items.forEach((item, index) => {
        if (index === 0) {
          // First row with rowSpan for Réf BL and Date
          tableData.push([
            { content: blRef, rowSpan: itemCount, styles: { valign: 'middle', halign: 'center' } },
            { content: blDate, rowSpan: itemCount, styles: { valign: 'middle', halign: 'center' } },
            item.article_code,
            item.article_name,
            item.quantity.toString(),
            formatPrice(item.unit_price),
            formatPrice(item.total)
          ])
        } else {
          // Subsequent rows without Réf BL and Date columns
          tableData.push([
            item.article_code,
            item.article_name,
            item.quantity.toString(),
            formatPrice(item.unit_price),
            formatPrice(item.total)
          ])
        }
      })
    }
  })

  autoTable(doc, {
    startY: 75,
    head: [['Réf BL', 'Date', 'Code', 'Article', 'Qté', 'P.U.', 'Total HT']],
    body: tableData,
    theme: 'grid',
    headStyles: {
      fillColor: [184, 134, 11],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 8,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 28 },  // Réf BL
      1: { halign: 'center', cellWidth: 22 },  // Date
      2: { halign: 'center', cellWidth: 18 },  // Code
      3: { halign: 'left', cellWidth: 50 },    // Article
      4: { halign: 'center', cellWidth: 15 },  // Qté
      5: { halign: 'right', cellWidth: 25 },   // P.U.
      6: { halign: 'right', cellWidth: 25 },   // Total HT
    },
    styles: {
      fontSize: 7,
      cellPadding: 2,
    },
    margin: { left: 10, right: 10 },
  })

  // Get the Y position after the table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY + 10

  // Totals - right side, no border
  const totalsX = pageWidth - 85
  const totalsValueX = pageWidth - 15

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(0, 0, 0)

  // Total HT
  doc.text('Total HT:', totalsX, finalY)
  doc.text(formatPrice(facture.total_ht), totalsValueX, finalY, { align: 'right' })

  // Total TVA
  const tvaRate = facture.tva_rate ?? 20
  doc.text(`Total TVA (${tvaRate}%):`, totalsX, finalY + 7)
  doc.text(formatPrice(facture.total_tva), totalsValueX, finalY + 7, { align: 'right' })

  // Separator line
  doc.setDrawColor(184, 134, 11)
  doc.setLineWidth(0.5)
  doc.line(totalsX, finalY + 11, totalsValueX, finalY + 11)

  // Total TTC
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(184, 134, 11)
  doc.text('Total TTC:', totalsX, finalY + 18)
  doc.text(formatPrice(facture.total_ttc), totalsValueX, finalY + 18, { align: 'right' })

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
