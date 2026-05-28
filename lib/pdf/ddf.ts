import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { CompanySettings, defaultCompanySettings, formatCompanyAddress, formatCompanyIdentifiers } from '../company'

interface DDFItem {
  supply_code: string
  supply_name: string
  quantity: string | number
  estimated_price: number
}

interface Supplier {
  code: string
  name: string
  contact_name?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
}

interface DDF {
  id: string
  ddf_number: string
  request_date: string
  response_deadline: string | null
  status: string
  notes: string | null
  supplier: Supplier
  ddf_items: DDFItem[]
}

export async function generateDDFPDF(ddf: DDF, company?: CompanySettings): Promise<void> {
  const doc = new jsPDF()
  const settings = company || defaultCompanySettings

  // Header - Logo
  try {
    const logoUrl = '/logo.jpg'
    const img = new Image()
    img.crossOrigin = 'anonymous'

    await new Promise<void>((resolve, reject) => {
      img.onload = () => {
        const maxWidth = 50
        const maxHeight = 25
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (maxWidth / width) * height
          width = maxWidth
        }
        if (height > maxHeight) {
          width = (maxHeight / height) * width
          height = maxHeight
        }

        doc.addImage(img, 'JPEG', 20, 10, width, height)
        resolve()
      }
      img.onerror = () => {
        doc.setFontSize(24)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(184, 134, 11)
        doc.text(settings.company_name, 20, 25)
        resolve()
      }
      img.src = logoUrl
    })
  } catch {
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(184, 134, 11)
    doc.text(settings.company_name, 20, 25)
  }

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)

  let headerY = 38
  const companyAddress = formatCompanyAddress(settings)
  if (companyAddress) {
    doc.text(companyAddress, 20, headerY)
    headerY += 5
  }
  if (settings.phone) {
    doc.text(`Tel: ${settings.phone}`, 20, headerY)
    headerY += 5
  }
  if (settings.fax) {
    doc.text(`Fax: ${settings.fax}`, 20, headerY)
    headerY += 5
  }
  if (settings.email) {
    doc.text(`Email: ${settings.email}`, 20, headerY)
  }

  // DDF title - centered
  const pageWidth = doc.internal.pageSize.width
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Demande de Devis', pageWidth / 2, 24, { align: 'center' })

  // DDF info box
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setDrawColor(200, 200, 200)
  doc.setFillColor(245, 245, 245)
  doc.roundedRect(125, 35, 70, 25, 2, 2, 'FD')

  doc.text(`N°: ${ddf.ddf_number}`, 130, 43)
  doc.text(`Date: ${formatDate(ddf.request_date)}`, 130, 50)
  if (ddf.response_deadline) {
    doc.text(`Date limite: ${formatDate(ddf.response_deadline)}`, 130, 57)
  }

  // Supplier info
  doc.setFontSize(12)
  doc.setFont('helvetica', 'bold')
  doc.text('Fournisseur', 20, 65)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.setDrawColor(184, 134, 11)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(20, 68, 80, 35, 2, 2, 'D')

  doc.setFont('helvetica', 'bold')
  doc.text(`${ddf.supplier.code} - ${ddf.supplier.name}`, 25, 77)
  doc.setFont('helvetica', 'normal')

  let yPos = 83
  if (ddf.supplier.contact_name) {
    doc.text(`Contact: ${ddf.supplier.contact_name}`, 25, yPos)
    yPos += 5
  }
  if (ddf.supplier.phone) {
    doc.text(`Tel: ${ddf.supplier.phone}`, 25, yPos)
    yPos += 5
  }
  if (ddf.supplier.email) {
    doc.text(`Email: ${ddf.supplier.email}`, 25, yPos)
    yPos += 5
  }
  if (ddf.supplier.address) {
    doc.text(`${ddf.supplier.address}`, 25, yPos)
  }

  // Table headers
  const headers = ['#', 'Code', 'Designation', 'Quantite']

  const tableData = ddf.ddf_items.map((item, index) => [
    (index + 1).toString(),
    item.supply_code || '-',
    item.supply_name,
    item.quantity?.toString() || '-',
  ])

  autoTable(doc, {
    startY: 110,
    head: [headers],
    body: tableData,
    theme: 'striped',
    headStyles: {
      fillColor: [184, 134, 11],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 15 },
      1: { halign: 'center', cellWidth: 30 },
      2: { halign: 'left', cellWidth: 100 },
      3: { halign: 'center', cellWidth: 30 },
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245],
    },
  })

  // Get the Y position after the table
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable.finalY + 10

  // Notes
  if (ddf.notes) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    doc.text('Notes:', 20, finalY + 10)
    doc.text(ddf.notes, 20, finalY + 16)
    finalY += 25
  }

  // Response section
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(0, 0, 0)
  doc.text('Merci de nous retourner votre meilleure offre.', 20, finalY + 20)

  // Signature area
  const signatureY = finalY + 35
  doc.setDrawColor(200, 200, 200)
  doc.setFillColor(255, 255, 255)
  doc.roundedRect(120, signatureY, 70, 30, 2, 2, 'D')

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Signature & Cachet:', 125, signatureY + 8)

  // Footer with company identifiers
  const pageHeight = doc.internal.pageSize.height

  doc.setDrawColor(200, 200, 200)
  doc.line(20, pageHeight - 25, pageWidth - 20, pageHeight - 25)

  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)

  const identifiers = formatCompanyIdentifiers(settings)
  if (identifiers) {
    doc.text(
      `${settings.company_name} - ${identifiers}`,
      pageWidth / 2,
      pageHeight - 18,
      { align: 'center' }
    )
  }

  doc.text(
    `Document genere le ${new Date().toLocaleDateString('fr-FR')}`,
    20,
    pageHeight - 10
  )

  // Save the PDF
  doc.save(`DDF_${ddf.ddf_number}.pdf`)
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatPrice(price: number | null): string {
  if (price === null || price === 0) return '-'
  return new Intl.NumberFormat('fr-MA', {
    style: 'currency',
    currency: 'MAD',
    minimumFractionDigits: 2,
  }).format(price)
}
