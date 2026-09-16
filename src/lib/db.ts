const DB_NAME = "TerraMapDB";
const STORE_NAME = "appData";

export const SimpleDB = {
  open: (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, 1);
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
      request.onsuccess = (event) =>
        resolve((event.target as IDBOpenDBRequest).result);
      request.onerror = (event) =>
        reject("DB Error: " + (event.target as IDBOpenDBRequest).error);
    });
  },
  get: async <T>(key: string): Promise<T | undefined> => {
    const db = await SimpleDB.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(request.error);
    });
  },
  set: async <T>(key: string, value: T): Promise<void> => {
    const db = await SimpleDB.open();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(value, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  },
};
