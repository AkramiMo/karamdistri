/**
 * Utilitaire pour sauvegarder les fichiers Excel avec sélecteur de dossier
 * Utilise l'API File System Access si disponible (Chrome, Edge)
 * Sinon, utilise le téléchargement standard
 */

import * as XLSX from 'xlsx'

// Stocker les handles de dossiers pour réutilisation (en mémoire pour la session)
let commandesFolderHandle: FileSystemDirectoryHandle | null = null
let ventesFolderHandle: FileSystemDirectoryHandle | null = null

// Stocker dans IndexedDB pour persistance
const DB_NAME = 'ExcelFolderHandles'
const STORE_NAME = 'handles'

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
  })
}

async function saveHandleToDB(key: string, handle: FileSystemDirectoryHandle): Promise<void> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put(handle, key)
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
    db.close()
  } catch (error) {
    console.error('Erreur sauvegarde handle:', error)
  }
}

async function getHandleFromDB(key: string): Promise<FileSystemDirectoryHandle | null> {
  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(key)
    const handle = await new Promise<FileSystemDirectoryHandle | null>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
    db.close()

    // Vérifier que le handle est valide (retourner même si permission est 'prompt')
    if (handle) {
      try {
        const permission = await (handle as any).queryPermission({ mode: 'readwrite' })
        // Garder le handle si permission est 'granted' ou 'prompt'
        if (permission === 'granted' || permission === 'prompt') {
          return handle
        }
      } catch {
        // Permission query failed, handle invalid
      }
    }
    return null
  } catch (error) {
    console.error('Erreur récupération handle:', error)
    return null
  }
}

// Vérifier si l'API File System Access est disponible
export function isFileSystemAccessSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

/**
 * Initialiser les handles depuis IndexedDB
 */
export async function initExcelFolderHandles(): Promise<void> {
  if (!isFileSystemAccessSupported()) return

  try {
    commandesFolderHandle = await getHandleFromDB('commandes-excel-folder')
    ventesFolderHandle = await getHandleFromDB('ventes-excel-folder')
  } catch (error) {
    console.error('Erreur init handles Excel:', error)
  }
}

/**
 * Sélectionner un dossier pour les exports Commandes
 */
export async function selectCommandesFolder(): Promise<boolean> {
  if (!isFileSystemAccessSupported()) {
    alert('Votre navigateur ne supporte pas la sélection de dossier. Utilisez Chrome ou Edge.')
    return false
  }

  try {
    commandesFolderHandle = await (window as any).showDirectoryPicker({
      id: 'commandes-excel-folder',
      mode: 'readwrite',
      startIn: 'documents',
    })
    localStorage.setItem('commandesExcelFolderName', commandesFolderHandle!.name)
    await saveHandleToDB('commandes-excel-folder', commandesFolderHandle!)
    return true
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Erreur sélection dossier Commandes:', error)
    }
    return false
  }
}

/**
 * Sélectionner un dossier pour les exports Ventes
 */
export async function selectVentesFolder(): Promise<boolean> {
  if (!isFileSystemAccessSupported()) {
    alert('Votre navigateur ne supporte pas la sélection de dossier. Utilisez Chrome ou Edge.')
    return false
  }

  try {
    ventesFolderHandle = await (window as any).showDirectoryPicker({
      id: 'ventes-excel-folder',
      mode: 'readwrite',
      startIn: 'documents',
    })
    localStorage.setItem('ventesExcelFolderName', ventesFolderHandle!.name)
    await saveHandleToDB('ventes-excel-folder', ventesFolderHandle!)
    return true
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Erreur sélection dossier Ventes:', error)
    }
    return false
  }
}

/**
 * Obtenir le nom du dossier Commandes sélectionné
 */
export function getCommandesFolderName(): string | null {
  if (commandesFolderHandle) return commandesFolderHandle.name
  return localStorage.getItem('commandesExcelFolderName')
}

/**
 * Obtenir le nom du dossier Ventes sélectionné
 */
export function getVentesFolderName(): string | null {
  if (ventesFolderHandle) return ventesFolderHandle.name
  return localStorage.getItem('ventesExcelFolderName')
}

/**
 * Vérifier si le dossier Commandes est prêt
 */
export function isCommandesFolderReady(): boolean {
  return commandesFolderHandle !== null
}

/**
 * Vérifier si le dossier Ventes est prêt
 */
export function isVentesFolderReady(): boolean {
  return ventesFolderHandle !== null
}

/**
 * Générer un nom de fichier avec timestamp
 */
function generateFilename(prefix: string): string {
  const now = new Date()
  const date = now.toISOString().split('T')[0] // YYYY-MM-DD
  const time = now.toTimeString().split(' ')[0].replace(/:/g, '-') // HH-MM-SS
  return `${prefix}_${date}_${time}.xlsx`
}

/**
 * Sauvegarder un fichier Excel dans le dossier Commandes sélectionné
 */
export async function saveCommandesExcel(workbook: XLSX.WorkBook, customFilename?: string): Promise<{ success: boolean; filename: string }> {
  const filename = customFilename || generateFilename('commandes')
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

  // Si un dossier est sélectionné, sauvegarder dedans
  if (commandesFolderHandle) {
    try {
      // Vérifier la permission et la demander si nécessaire
      let permission = await (commandesFolderHandle as any).queryPermission({ mode: 'readwrite' })
      if (permission === 'prompt') {
        permission = await (commandesFolderHandle as any).requestPermission({ mode: 'readwrite' })
      }
      if (permission !== 'granted') {
        throw new Error('Permission non accordée')
      }

      const fileHandle = await commandesFolderHandle.getFileHandle(filename, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(blob)
      await writable.close()
      console.log(`Excel sauvegardé: ${filename}`)
      return { success: true, filename }
    } catch (error) {
      console.error('Erreur sauvegarde dans dossier Commandes:', error)
      // Si erreur (permission révoquée), reset le handle
      commandesFolderHandle = null
      localStorage.removeItem('commandesExcelFolderName')
    }
  }

  // Sinon, utiliser le téléchargement standard
  downloadBlob(blob, filename)
  return { success: true, filename }
}

/**
 * Sauvegarder un fichier Excel dans le dossier Ventes sélectionné
 */
export async function saveVentesExcel(workbook: XLSX.WorkBook, customFilename?: string): Promise<{ success: boolean; filename: string }> {
  const filename = customFilename || generateFilename('ventes')
  const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

  // Si un dossier est sélectionné, sauvegarder dedans
  if (ventesFolderHandle) {
    try {
      // Vérifier la permission et la demander si nécessaire
      let permission = await (ventesFolderHandle as any).queryPermission({ mode: 'readwrite' })
      if (permission === 'prompt') {
        permission = await (ventesFolderHandle as any).requestPermission({ mode: 'readwrite' })
      }
      if (permission !== 'granted') {
        throw new Error('Permission non accordée')
      }

      const fileHandle = await ventesFolderHandle.getFileHandle(filename, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(blob)
      await writable.close()
      console.log(`Excel sauvegardé: ${filename}`)
      return { success: true, filename }
    } catch (error) {
      console.error('Erreur sauvegarde dans dossier Ventes:', error)
      // Si erreur (permission révoquée), reset le handle
      ventesFolderHandle = null
      localStorage.removeItem('ventesExcelFolderName')
    }
  }

  // Sinon, utiliser le téléchargement standard
  downloadBlob(blob, filename)
  return { success: true, filename }
}

/**
 * Téléchargement standard d'un blob
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/**
 * Réinitialiser les dossiers sélectionnés
 */
export async function resetExcelFolders(): Promise<void> {
  commandesFolderHandle = null
  ventesFolderHandle = null
  localStorage.removeItem('commandesExcelFolderName')
  localStorage.removeItem('ventesExcelFolderName')

  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.delete('commandes-excel-folder')
    store.delete('ventes-excel-folder')
    db.close()
  } catch (error) {
    console.error('Erreur reset handles Excel:', error)
  }
}

// Noms de fichiers fixes pour l'append
const COMMANDES_FILENAME = 'commandes.xlsx'
const VENTES_FILENAME = 'ventes.xlsx'

/**
 * Lire un fichier Excel existant depuis le dossier
 */
async function readExcelFile(
  folderHandle: FileSystemDirectoryHandle,
  filename: string
): Promise<XLSX.WorkBook | null> {
  try {
    const fileHandle = await folderHandle.getFileHandle(filename, { create: false })
    const file = await fileHandle.getFile()
    const arrayBuffer = await file.arrayBuffer()
    return XLSX.read(arrayBuffer, { type: 'array' })
  } catch (error) {
    // Le fichier n'existe pas encore
    return null
  }
}

/**
 * Ajouter une ligne à un fichier Excel existant ou créer le fichier
 */
async function appendRowToExcel(
  folderHandle: FileSystemDirectoryHandle | null,
  filename: string,
  row: Record<string, string | number>,
  columns: string[],
  colWidths: { wch: number }[],
  sheetName: string
): Promise<{ success: boolean; filename: string }> {
  if (!folderHandle) {
    console.error('Aucun dossier sélectionné pour', sheetName)
    return { success: false, filename: '' }
  }

  try {
    // Vérifier la permission et la demander si nécessaire
    let permission = await (folderHandle as any).queryPermission({ mode: 'readwrite' })
    if (permission === 'prompt') {
      // Tenter de demander la permission
      permission = await (folderHandle as any).requestPermission({ mode: 'readwrite' })
    }
    if (permission !== 'granted') {
      console.error('Permission non accordée pour', sheetName)
      return { success: false, filename: '' }
    }

    // Essayer de lire le fichier existant
    let workbook = await readExcelFile(folderHandle, filename)
    let worksheet: XLSX.WorkSheet
    let existingData: any[] = []

    if (workbook && workbook.Sheets[sheetName]) {
      // Le fichier existe, lire les données existantes
      worksheet = workbook.Sheets[sheetName]
      existingData = XLSX.utils.sheet_to_json(worksheet)
    } else {
      // Nouveau fichier
      workbook = XLSX.utils.book_new()
    }

    // Ajouter la nouvelle ligne
    existingData.push(row)

    // Recréer la feuille avec toutes les données
    worksheet = XLSX.utils.json_to_sheet(existingData, { header: columns })
    worksheet['!cols'] = colWidths

    // Remplacer ou ajouter la feuille
    if (workbook.SheetNames.includes(sheetName)) {
      workbook.Sheets[sheetName] = worksheet
    } else {
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)
    }

    // Sauvegarder le fichier
    const buffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' })
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })

    const fileHandle = await folderHandle.getFileHandle(filename, { create: true })
    const writable = await fileHandle.createWritable()
    await writable.write(blob)
    await writable.close()

    console.log(`Ligne ajoutée à ${filename}`)
    return { success: true, filename }
  } catch (error) {
    console.error('Erreur ajout ligne Excel:', error)
    return { success: false, filename: '' }
  }
}

/**
 * Ajouter une commande au fichier commandes.xlsx
 */
export async function appendToCommandesExcel(
  row: Record<string, string | number>,
  columns: string[],
  colWidths: { wch: number }[]
): Promise<{ success: boolean; filename: string }> {
  return appendRowToExcel(
    commandesFolderHandle,
    COMMANDES_FILENAME,
    row,
    columns,
    colWidths,
    'Commandes'
  )
}

/**
 * Ajouter une vente au fichier ventes.xlsx
 */
export async function appendToVentesExcel(
  row: Record<string, string | number>,
  columns: string[],
  colWidths: { wch: number }[]
): Promise<{ success: boolean; filename: string }> {
  return appendRowToExcel(
    ventesFolderHandle,
    VENTES_FILENAME,
    row,
    columns,
    colWidths,
    'Ventes'
  )
}
