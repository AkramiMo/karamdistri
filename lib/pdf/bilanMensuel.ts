import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { CompanySettings, defaultCompanySettings } from '../company'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

interface BilanMensuelData {
  month: string // format: "2026-10"
  receptionsKg: number
  livraisonsKg: number
  commandesCount: number
  livraisonsCount: number
  ventesCount: number
  caVentes: number
  marge: number
  paiementsRecus: number
  paiementsEffectues: number
  restePaiements: number
  valBRRecue: number
  valBRReglee: number
  diffBR: number
}

export async function generateBilanMensuelPDF(
  data: BilanMensuelData,
  company?: CompanySettings
): Promise<void> {
  const doc = new jsPDF()
  const settings = company || defaultCompanySettings
  const pageWidth = doc.internal.pageSize.width

  // Formatter le mois
  const monthDate = new Date(data.month + '-01')
  const monthLabel = format(monthDate, 'MMMM yyyy', { locale: fr }).toUpperCase()

  // Fonction pour formater les montants
  const formatMontant = (value: number): string => {
    return Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' DH'
  }

  const formatKg = (value: number): string => {
    return value.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' kg'
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
        doc.setTextColor(184, 134, 11) // #B8860B
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

  // Titre du bilan
  let yPos = 10 + logoHeight + 15

  // Bannière titre
  doc.setFillColor(184, 134, 11) // #B8860B
  doc.rect(14, yPos - 8, pageWidth - 28, 14, 'F')

  doc.setFontSize(16)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(255, 255, 255)
  doc.text(`BILAN MENSUEL - ${monthLabel}`, pageWidth / 2, yPos, { align: 'center' })

  yPos += 20

  // Date de génération
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(`Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm', { locale: fr })}`, pageWidth - 20, yPos - 5, { align: 'right' })

  // Tableau principal à deux colonnes
  autoTable(doc, {
    startY: yPos + 5,
    head: [['Indicateur', 'Valeur']],
    body: [
      ['Qté totale reçue', formatKg(data.receptionsKg)],
      ['Qté totale livrée', formatKg(data.livraisonsKg)],
      ['Nombre de commandes', String(data.commandesCount)],
      ['Nombre de livraisons', String(data.livraisonsCount)],
      ['Nombre de ventes', String(data.ventesCount)],
      ['CA', formatMontant(data.caVentes)],
      ['MB', formatMontant(data.marge)],
      ['Encaissement', formatMontant(data.paiementsRecus)],
      ['Décaissement', formatMontant(data.paiementsEffectues)],
      ['Reste', formatMontant(data.restePaiements)],
      ['Val BR reçue', formatMontant(data.valBRRecue)],
      ['Val BR réglée', formatMontant(data.valBRReglee)],
      ['Diff', formatMontant(data.diffBR)],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: [184, 134, 11], // #B8860B
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 11,
    },
    bodyStyles: {
      fontSize: 10,
      cellPadding: 5,
    },
    tableWidth: 'auto',
    columnStyles: {
      0: { cellWidth: 80, fontStyle: 'bold', textColor: [55, 65, 81] },
      1: { cellWidth: 60, halign: 'right', fontStyle: 'bold' },
    },
    didParseCell: (hookData) => {
      // Colorer les valeurs selon le type
      if (hookData.section === 'body' && hookData.column.index === 1) {
        const row = hookData.row.index
        if (row === 0 || row === 1) {
          // Qté reçue/livrée - bleu
          hookData.cell.styles.textColor = [59, 130, 246]
        } else if (row === 5) {
          // CA - teal
          hookData.cell.styles.textColor = [20, 184, 166]
        } else if (row === 6) {
          // MB - vert
          hookData.cell.styles.textColor = [22, 163, 74]
        } else if (row === 7) {
          // Encaissement - emerald
          hookData.cell.styles.textColor = [5, 150, 105]
        } else if (row === 8) {
          // Décaissement - rouge
          hookData.cell.styles.textColor = [220, 38, 38]
        } else if (row === 9) {
          // Reste - vert ou rouge selon valeur
          hookData.cell.styles.textColor = data.restePaiements >= 0 ? [22, 163, 74] : [220, 38, 38]
        } else if (row === 10) {
          // Val BR reçue - bleu
          hookData.cell.styles.textColor = [59, 130, 246]
        } else if (row === 11) {
          // Val BR réglée - vert
          hookData.cell.styles.textColor = [22, 163, 74]
        } else if (row === 12) {
          // Diff - vert si <= 0, rouge sinon
          hookData.cell.styles.textColor = data.diffBR <= 0 ? [22, 163, 74] : [220, 38, 38]
        }
      }
      // Mettre en surbrillance les lignes de total
      if (hookData.section === 'body' && (hookData.row.index === 9 || hookData.row.index === 12)) {
        hookData.cell.styles.fillColor = [243, 244, 246] // gray-100
      }
    },
    margin: { left: (pageWidth - 140) / 2 },
  })

  // Footer
  const pageHeight = doc.internal.pageSize.height
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(150, 150, 150)
  doc.text(
    `${settings.company_name} - Bilan mensuel ${monthLabel}`,
    pageWidth / 2,
    pageHeight - 10,
    { align: 'center' }
  )

  // Sauvegarder le PDF
  const fileName = `Bilan_${data.month}.pdf`
  doc.save(fileName)
}
