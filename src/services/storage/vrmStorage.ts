/**
 * Persistent Storage for VRM 3D Models across restarts.
 * Uses Electron IPC (file system in userData) when available,
 * and IndexedDB when running in browser environments.
 */

const DB_NAME = 'KizunaVRMStorage';
const DB_VERSION = 1;
const STORE_NAME = 'vrm_files';

class VRMStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getIDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB not supported'));
        return;
      }

      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e: any) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });

    return this.dbPromise;
  }

  /**
   * Saves a VRM model (as ArrayBuffer or Blob) persistently to disk / IndexedDB.
   * Returns a local object URL ready for Three.js GLTFLoader.
   */
  public async saveVRM(characterId: string, data: ArrayBuffer | Blob): Promise<string> {
    const arrayBuffer = data instanceof Blob ? await data.arrayBuffer() : data;

    // 1. Try Electron native file system save
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.saveVrmModel) {
      try {
        const uint8 = new Uint8Array(arrayBuffer);
        const res = await electronAPI.saveVrmModel(characterId, uint8);
        if (res && res.success) {
          const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
          const url = URL.createObjectURL(blob);
          localStorage.setItem(`kizuna_vrm_saved_${characterId}`, 'true');
          return url;
        }
      } catch (err) {
        console.warn('Electron VRM save failed, falling back to IndexedDB:', err);
      }
    }

    // 2. Fallback to browser IndexedDB
    try {
      const db = await this.getIDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.put(arrayBuffer, characterId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
      localStorage.setItem(`kizuna_vrm_saved_${characterId}`, 'true');
    } catch (err) {
      console.error('IndexedDB VRM save failed:', err);
    }

    const blob = new Blob([arrayBuffer], { type: 'model/gltf-binary' });
    return URL.createObjectURL(blob);
  }

  /**
   * Loads a previously saved VRM model from disk / IndexedDB.
   * Returns a live object URL, or null if none saved.
   */
  public async loadVRM(characterId: string): Promise<string | null> {
    // 1. Try Electron
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.loadVrmModel) {
      try {
        const data: Uint8Array | null = await electronAPI.loadVrmModel(characterId);
        if (data && data.byteLength > 0) {
          const blob = new Blob([data], { type: 'model/gltf-binary' });
          return URL.createObjectURL(blob);
        }
      } catch (err) {
        console.warn('Electron VRM load failed, checking IndexedDB:', err);
      }
    }

    // 2. Try IndexedDB
    try {
      const db = await this.getIDB();
      const buffer = await new Promise<ArrayBuffer | null>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const req = store.get(characterId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });

      if (buffer && buffer.byteLength > 0) {
        const blob = new Blob([buffer], { type: 'model/gltf-binary' });
        return URL.createObjectURL(blob);
      }
    } catch (err) {
      console.warn('IndexedDB VRM load error:', err);
    }

    return null;
  }

  /**
   * Deletes a saved VRM model
   */
  public async deleteVRM(characterId: string): Promise<void> {
    const electronAPI = (window as any).electronAPI;
    if (electronAPI?.deleteVrmModel) {
      try {
        await electronAPI.deleteVrmModel(characterId);
      } catch {}
    }

    try {
      const db = await this.getIDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.delete(characterId);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {}

    localStorage.removeItem(`kizuna_vrm_saved_${characterId}`);
  }
}

export const vrmStorage = new VRMStorageService();
