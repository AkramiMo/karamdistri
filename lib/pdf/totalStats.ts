import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { CompanySettings, defaultCompanySettings } from '../company'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface SupplierStats {
  id: string
  name: string
  totalReceptions: number
  totalPaid: number
  remaining: number
}

interface SupplyQuantity {
  code: string
  name: string
  quantity: number
}

interface TotalStatsData {
  month: string
  monthLabel: string
  totalReceptions: number
  totalQuantity: number
  totalArticles: number
  totalEtiquettes: number
  totalEmballages: number
  totalProduitsKg: number
  supplierStats: SupplierStats[]
  totalPaid: number
  totalRemaining: number
  supplyQuantities: SupplyQuantity[]
}

export async function generateTotalStatsPDF(
  data: TotalStatsData,
  company?: CompanySettings
): Promise<void> {
  const doc = new jsPDF()
  const settings = company || defaultCompanySettings
  const pageWidth = doc.internal.pageSize.width
  const pageHeight = doc.internal.pageSize.height

  // Format amount: "1 767 DH" (space as thousand separator, no decimals)
  const formatMontant = (value: number): string => {
    return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' DH'
  }

  // Format quantity: "1 234 kg"
  const formatKg = (value: number): string => {
    return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' kg'
  }

  // Format units: "1 234 unités"
  const formatUnits = (value: number): string => {
    return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' unités'
  }

  // Header - Logo
  let logoHeight = 25
  try {
    const logoUrl = '/Logo.png'
    const img = new Image()
    img.crossOrigin = 'anonymous'

    await new Promise<void>((resolve) => {
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

        logoHeight = height
        doc.setFillColor(255, 255, 255)
        doc.rect(15, 5, width + 10, height + 10, 'F')
        doc.addImage(img, 'PNG', 20, 10, width, height)
        resolve()
      }
      img.onerror = () => {
        doc.setFontSize(24)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(16, 185, 129)
        doc.text(settings.company_name, 20, 25)
        resolve()
      }
      img.src = logoUrl
    })
  } catch {
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(16, 185, 129)
    doc.text(settings.company_name, 20, 25)
  }

  // Title
  let yPos = 10 + logoHeight + 15

  // Title banner
  doc.setFillColor(16, 185, 129)
  doc.rect(14, yPos - 8, pageWidth - 28, 14, 'F')

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(`STATISTIQUE TOTALE - ${data.monthLabel.toUpperCase()}`, pageWidth / 2, yPos, { align: 'center' })

  yPos += 20

  // Generation date
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, pageWidth - 20, yPos - 5, { align: 'right' })

  // Build table body
  const tableBody: string[][] = [
    ['Montant total des réceptions', formatMontant(data.totalReceptions)],
    ['Qté articles reçus', formatUnits(data.totalArticles)],
    ['   - Étiquettes', formatUnits(data.totalEtiquettes)],
    ['   - Emballages', formatUnits(data.totalEmballages)],
    ['   - Produits (Olive/Légumes/Sauce)', formatKg(data.totalProduitsKg)],
  ]

  // Add supplier section header if there are suppliers
  if (data.supplierStats.length > 0) {
    tableBody.push(['--- MONTANT PAR FOURNISSEUR ---', ''])
    data.supplierStats.forEach(supplier => {
      tableBody.push([`   ${supplier.name}`, formatMontant(supplier.totalReceptions)])
    })
  }

  tableBody.push(['Montant total réglé', formatMontant(data.totalPaid)])
  tableBody.push(['Montant reste à payer', formatMontant(data.totalRemaining)])

  // Main table with wider value column
  autoTable(doc, {
    startY: yPos + 5,
    head: [['Indicateur', 'Valeur']],
    body: tableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 11,
    },
    bodyStyles: {
      fontSize: 10,
      cellPadding: 4,
    },
    columnStyles: {
      0: { cellWidth: 120, fontStyle: 'bold', textColor: [55, 65, 81] },
      1: { cellWidth: 50, halign: 'right', overflow: 'linebreak' },
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body') {
        const rowData = hookData.row.raw as string[]
        const indicator = rowData[0]

        if (indicator.includes('MONTANT PAR FOURNISSEUR')) {
          hookData.cell.styles.fillColor = [209, 250, 229]
          hookData.cell.styles.textColor = [6, 95, 70]
          hookData.cell.styles.fontStyle = 'bold'
          hookData.cell.styles.halign = 'center'
        }

        if (indicator.startsWith('   ')) {
          hookData.cell.styles.fontStyle = 'normal'
          hookData.cell.styles.textColor = [75, 85, 99]
        }

        if (hookData.column.index === 1) {
          if (indicator === 'Montant total des réceptions') {
            hookData.cell.styles.textColor = [184, 134, 11]
            hookData.cell.styles.fontStyle = 'bold'
          } else if (indicator === 'Qté articles reçus') {
            hookData.cell.styles.textColor = [59, 130, 246]
            hookData.cell.styles.fontStyle = 'bold'
          } else if (indicator.includes('Étiquettes')) {
            hookData.cell.styles.textColor = [219, 39, 119] // pink-600
            hookData.cell.styles.fontStyle = 'bold'
          } else if (indicator.includes('Emballages')) {
            hookData.cell.styles.textColor = [79, 70, 229] // indigo-600
            hookData.cell.styles.fontStyle = 'bold'
          } else if (indicator.includes('Produits')) {
            hookData.cell.styles.textColor = [147, 51, 234] // purple-600
            hookData.cell.styles.fontStyle = 'bold'
          } else if (indicator === 'Montant total réglé') {
            hookData.cell.styles.textColor = [22, 163, 74]
            hookData.cell.styles.fontStyle = 'bold'
          } else if (indicator === 'Montant reste à payer') {
            hookData.cell.styles.textColor = data.totalRemaining > 0 ? [220, 38, 38] : [22, 163, 74]
            hookData.cell.styles.fontStyle = 'bold'
          } else if (indicator.startsWith('   ') && !indicator.includes('↳')) {
            hookData.cell.styles.textColor = [184, 134, 11]
          }
        }

        // Style for sub-indicators (starting with "   -")
        if (indicator.startsWith('   -')) {
          if (hookData.column.index === 0) {
            hookData.cell.styles.fontStyle = 'normal'
            hookData.cell.styles.textColor = [75, 85, 99]
          }
        }

        if (indicator === 'Montant total réglé') {
          hookData.cell.styles.fillColor = [220, 252, 231]
        }
        if (indicator === 'Montant reste à payer') {
          hookData.cell.styles.fillColor = [254, 243, 199]
        }
      }
    },
    margin: { left: 20, right: 20 },
  })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let finalY = (doc as any).lastAutoTable?.finalY || yPos + 100

  // Bar chart for supply quantities
  if (data.supplyQuantities.length > 0) {
    const chartHeight = Math.min(data.supplyQuantities.length * 12 + 40, 150)

    // Check if we need a new page for the chart
    if (finalY + chartHeight + 30 > pageHeight - 20) {
      doc.addPage()
      finalY = 20
    } else {
      finalY += 15
    }

    // Chart title
    doc.setFillColor(16, 185, 129)
    doc.rect(14, finalY - 4, pageWidth - 28, 10, 'F')
    doc.setFontSize(12)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('QUANTITÉS PAR FOURNITURE', pageWidth / 2, finalY + 3, { align: 'center' })

    finalY += 20

    // Draw horizontal bar chart
    const chartMarginLeft = 45
    const chartMarginRight = 25
    const chartWidth = pageWidth - chartMarginLeft - chartMarginRight
    const barHeight = 8
    const barSpacing = 4
    const maxQuantity = Math.max(...data.supplyQuantities.map(s => s.quantity))

    // Colors for bars (gold palette)
    const barColors = [
      [184, 134, 11],   // #B8860B
      [212, 168, 75],   // lighter gold
      [232, 200, 120],  // even lighter
      [139, 105, 20],   // darker gold
      [201, 152, 58],
      [222, 184, 92],
      [166, 124, 0],
      [191, 151, 48],
      [217, 184, 91],
      [154, 114, 0],
    ]

    const itemsToShow = data.supplyQuantities.slice(0, 15)

    itemsToShow.forEach((supply, index) => {
      const barY = finalY + index * (barHeight + barSpacing)

      // Check if we need a new page
      if (barY + barHeight + 20 > pageHeight - 20) {
        doc.addPage()
        finalY = 20 - index * (barHeight + barSpacing)
      }

      const actualBarY = finalY + index * (barHeight + barSpacing)

      // Supply code label on the left
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(55, 65, 81)
      doc.text(supply.code, chartMarginLeft - 3, actualBarY + barHeight - 2, { align: 'right' })

      // Calculate bar width
      const barWidth = (supply.quantity / maxQuantity) * chartWidth * 0.75

      // Draw bar with rounded corners
      const color = barColors[index % barColors.length]
      doc.setFillColor(color[0], color[1], color[2])
      doc.roundedRect(chartMarginLeft, actualBarY, barWidth, barHeight, 2, 2, 'F')

      // Value on the bar
      doc.setFontSize(7)
      doc.setFont('helvetica', 'bold')

      // If bar is wide enough, put value inside, otherwise outside
      const valueText = formatKg(supply.quantity)
      const textWidth = doc.getTextWidth(valueText)

      if (barWidth > textWidth + 10) {
        // Value inside the bar (white text)
        doc.setTextColor(255, 255, 255)
        doc.text(valueText, chartMarginLeft + barWidth - 3, actualBarY + barHeight - 2, { align: 'right' })
      } else {
        // Value outside the bar (dark text)
        doc.setTextColor(55, 65, 81)
        doc.text(valueText, chartMarginLeft + barWidth + 3, actualBarY + barHeight - 2, { align: 'left' })
      }
    })

    // Update finalY after chart
    finalY = finalY + itemsToShow.length * (barHeight + barSpacing) + 10
  }

  // Supply quantities table (after chart)
  if (data.supplyQuantities.length > 0) {
    // Check if we need a new page for the table
    if (finalY + 50 > pageHeight - 20) {
      doc.addPage()
      finalY = 20
    } else {
      finalY += 10
    }

    // Table title
    doc.setFillColor(100, 116, 139) // slate-500
    doc.rect(14, finalY - 4, pageWidth - 28, 10, 'F')
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(255, 255, 255)
    doc.text('DÉTAIL DES FOURNITURES', pageWidth / 2, finalY + 3, { align: 'center' })

    finalY += 12

    // Supply quantities table
    const supplyBody = data.supplyQuantities.map(s => [s.code, s.name, formatKg(s.quantity)])

    autoTable(doc, {
      startY: finalY,
      head: [['Code', 'Désignation', 'Quantité']],
      body: supplyBody,
      theme: 'striped',
      headStyles: {
        fillColor: [100, 116, 139],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: {
        fontSize: 8,
        cellPadding: 2,
      },
      columnStyles: {
        0: { cellWidth: 25, fontStyle: 'bold' },
        1: { cellWidth: 100 },
        2: { cellWidth: 35, halign: 'right', fontStyle: 'bold', textColor: [184, 134, 11] },
      },
      margin: { left: 20, right: 20 },
      // Handle page breaks properly
      showHead: 'everyPage',
      didDrawPage: () => {
        // Add header on new pages
        doc.setFontSize(8)
        doc.setFont('helvetica', 'italic')
        doc.setTextColor(150, 150, 150)
        doc.text(`Statistique Totale - ${data.monthLabel}`, 20, 12)
      },
    })
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages()
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i)
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(150, 150, 150)
    doc.text(
      `${settings.company_name} - Statistique Totale ${data.monthLabel} - Page ${i}/${totalPages}`,
      pageWidth / 2,
      pageHeight - 10,
      { align: 'center' }
    )
  }

  // Save PDF
  const fileName = `Statistique_Totale_${data.month}.pdf`
  doc.save(fileName)
}
