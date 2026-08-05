// IndexedDB Utility for Automatic Local Audio Backup of Oral Exam Sessions & Read-Aloud Practice

const DB_NAME = 'PSLE_OralExam_BackupDB';
const DB_VERSION = 2;
const STORE_NAME = 'audio_recordings';
const READ_ALOUD_STORE = 'read_aloud_recordings';

export interface AudioBackupRecord {
  id: string; // e.g. "Q1", "Q2", "Q3", "Q4"
  questionNumber: number;
  theme: string;
  audioBlob?: Blob;
  audioDataUrl?: string;
  audioMimeType?: string;
  text?: string;
  timestamp: string;
}

export interface ReadAloudBackupRecord {
  id: string; // e.g. "read_aloud_latest"
  passageTitle: string;
  passageText: string;
  audioBlob?: Blob;
  audioBase64?: string;
  audioMimeType?: string;
  timestamp: string;
}

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this environment'));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(READ_ALOUD_STORE)) {
        db.createObjectStore(READ_ALOUD_STORE, { keyPath: 'id' });
      }
    };
  });
};

export const saveAudioBackup = async (record: AudioBackupRecord): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to save audio backup to IndexedDB:', err);
  }
};

export const getAllAudioBackups = async (): Promise<AudioBackupRecord[]> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to fetch audio backups from IndexedDB:', err);
    return [];
  }
};

export const clearAudioBackups = async (): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to clear audio backups in IndexedDB:', err);
  }
};

// ============================================================================
// READ-ALOUD BACKUP METHODS
// ============================================================================

export const saveReadAloudBackup = async (record: ReadAloudBackupRecord): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(READ_ALOUD_STORE, 'readwrite');
      const store = transaction.objectStore(READ_ALOUD_STORE);
      const request = store.put(record);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to save read-aloud backup to IndexedDB:', err);
  }
};

export const getReadAloudBackup = async (id = 'read_aloud_latest'): Promise<ReadAloudBackupRecord | null> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(READ_ALOUD_STORE, 'readonly');
      const store = transaction.objectStore(READ_ALOUD_STORE);
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to get read-aloud backup from IndexedDB:', err);
    return null;
  }
};

export const clearReadAloudBackup = async (id = 'read_aloud_latest'): Promise<void> => {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(READ_ALOUD_STORE, 'readwrite');
      const store = transaction.objectStore(READ_ALOUD_STORE);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to clear read-aloud backup in IndexedDB:', err);
  }
};
