/**
 * Utilitaire pour sauvegarder les PDF avec sélecteur de dossier
 * Utilise l'API File System Access si disponible (Chrome, Edge)
 * Sinon, utilise le téléchargement standard
 */

import jsPDF from 'jspdf'

// Stocker les handles de dossiers pour réutilisation (en mémoire pour la session)
let blFolderHandle: FileSystemDirectoryHandle | null = null
let factureFolderHandle: FileSystemDirectoryHandle | null = null

// Stocker dans IndexedDB pour persistance
const DB_NAME = 'PDFFolderHandles'
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

    // Retourner le handle même si la permission n'est pas encore granted
    // La permission sera demandée lors de la sauvegarde
    return handle || null
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
export async function initFolderHandles(): Promise<void> {
  if (!isFileSystemAccessSupported()) return

  try {
    blFolderHandle = await getHandleFromDB('bl-folder')
    factureFolderHandle = await getHandleFromDB('facture-folder')
  } catch (error) {
    console.error('Erreur init handles:', error)
  }
}

/**
 * Sélectionner un dossier pour les BL
 */
export async function selectBLFolder(): Promise<boolean> {
  if (!isFileSystemAccessSupported()) {
    alert('Votre navigateur ne supporte pas la sélection de dossier. Utilisez Chrome ou Edge.')
    return false
  }

  try {
    blFolderHandle = await (window as any).showDirectoryPicker({
      id: 'bl-folder',
      mode: 'readwrite',
      startIn: 'documents',
    })
    localStorage.setItem('blFolderName', blFolderHandle!.name)
    await saveHandleToDB('bl-folder', blFolderHandle!)
    return true
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Erreur sélection dossier BL:', error)
    }
    return false
  }
}

/**
 * Sélectionner un dossier pour les Factures
 */
export async function selectFactureFolder(): Promise<boolean> {
  if (!isFileSystemAccessSupported()) {
    alert('Votre navigateur ne supporte pas la sélection de dossier. Utilisez Chrome ou Edge.')
    return false
  }

  try {
    factureFolderHandle = await (window as any).showDirectoryPicker({
      id: 'facture-folder',
      mode: 'readwrite',
      startIn: 'documents',
    })
    localStorage.setItem('factureFolderName', factureFolderHandle!.name)
    await saveHandleToDB('facture-folder', factureFolderHandle!)
    return true
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Erreur sélection dossier Factures:', error)
    }
    return false
  }
}

/**
 * Obtenir le nom du dossier BL sélectionné
 */
export function getBLFolderName(): string | null {
  if (blFolderHandle) return blFolderHandle.name
  return localStorage.getItem('blFolderName')
}

/**
 * Obtenir le nom du dossier Factures sélectionné
 */
export function getFactureFolderName(): string | null {
  if (factureFolderHandle) return factureFolderHandle.name
  return localStorage.getItem('factureFolderName')
}

/**
 * Vérifier si le dossier BL est prêt
 */
export function isBLFolderReady(): boolean {
  return blFolderHandle !== null
}

/**
 * Vérifier si le dossier Factures est prêt
 */
export function isFactureFolderReady(): boolean {
  return factureFolderHandle !== null
}

/**
 * Demander la permission pour le dossier Factures (doit être appelé lors d'un clic utilisateur)
 */
export async function requestFactureFolderPermission(): Promise<boolean> {
  if (!factureFolderHandle) return false

  try {
    let permission = await (factureFolderHandle as any).queryPermission({ mode: 'readwrite' })
    if (permission === 'granted') return true

    // Demander la permission
    permission = await (factureFolderHandle as any).requestPermission({ mode: 'readwrite' })
    return permission === 'granted'
  } catch (error) {
    console.error('Erreur demande permission:', error)
    return false
  }
}

/**
 * Demander la permission pour le dossier BL (doit être appelé lors d'un clic utilisateur)
 */
export async function requestBLFolderPermission(): Promise<boolean> {
  if (!blFolderHandle) return false

  try {
    let permission = await (blFolderHandle as any).queryPermission({ mode: 'readwrite' })
    if (permission === 'granted') return true

    // Demander la permission
    permission = await (blFolderHandle as any).requestPermission({ mode: 'readwrite' })
    return permission === 'granted'
  } catch (error) {
    console.error('Erreur demande permission:', error)
    return false
  }
}

/**
 * Sauvegarder un PDF dans le dossier BL sélectionné
 */
export async function saveBLPDF(doc: jsPDF, filename: string): Promise<void> {
  // Si un dossier est sélectionné, sauvegarder dedans
  if (blFolderHandle) {
    try {
      // Vérifier et demander la permission si nécessaire
      let permission = await (blFolderHandle as any).queryPermission({ mode: 'readwrite' })
      if (permission !== 'granted') {
        // Demander la permission (requiert user activation - le clic sur le bouton)
        permission = await (blFolderHandle as any).requestPermission({ mode: 'readwrite' })
        if (permission !== 'granted') {
          throw new Error('Permission refusée par l\'utilisateur')
        }
      }

      const fileHandle = await blFolderHandle.getFileHandle(filename, { create: true })
      const writable = await fileHandle.createWritable()
      const pdfBlob = doc.output('blob')
      await writable.write(pdfBlob)
      await writable.close()
      return
    } catch (error) {
      console.error('Erreur sauvegarde dans dossier BL:', error)
      // Ne pas reset le handle, l'utilisateur pourra réessayer
    }
  }

  // Sinon, utiliser le téléchargement standard
  doc.save(filename)
}

/**
 * Sauvegarder un PDF dans le dossier Factures sélectionné
 * Note: requestFactureFolderPermission() doit être appelé AVANT cette fonction (lors du clic)
 */
export async function saveFacturePDF(doc: jsPDF, filename: string): Promise<void> {
  // Si un dossier est sélectionné, sauvegarder dedans
  if (factureFolderHandle) {
    try {
      // Vérifier la permission (devrait être granted si requestFactureFolderPermission a été appelé)
      const permission = await (factureFolderHandle as any).queryPermission({ mode: 'readwrite' })
      if (permission === 'granted') {
        const fileHandle = await factureFolderHandle.getFileHandle(filename, { create: true })
        const writable = await fileHandle.createWritable()
        const pdfBlob = doc.output('blob')
        await writable.write(pdfBlob)
        await writable.close()
        console.log(`PDF sauvegardé dans le dossier: ${filename}`)
        return
      }
    } catch (error) {
      console.error('Erreur sauvegarde dans dossier Factures:', error)
    }
  }

  // Sinon, utiliser le téléchargement standard
  doc.save(filename)
}

/**
 * Réinitialiser les dossiers sélectionnés
 */
export async function resetFolders(): Promise<void> {
  blFolderHandle = null
  factureFolderHandle = null
  localStorage.removeItem('blFolderName')
  localStorage.removeItem('factureFolderName')

  try {
    const db = await openDB()
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.delete('bl-folder')
    store.delete('facture-folder')
    db.close()
  } catch (error) {
    console.error('Erreur reset handles:', error)
  }
}
