let database;

function openStore() {
 if (!database) {
  database = new Promise((resolve, reject) => {
   const request = indexedDB.open('CapLock-media', 1);
   request.onupgradeneeded = () => request.result.createObjectStore('files');
   request.onsuccess = () => {
    const db = request.result;
    db.onversionchange = () => {
     db.close();
     database = null;
    };
    resolve(db);
   };
   request.onerror = () => reject(request.error);
  }).catch(error => {
   database = null;
   throw error;
  });
 }
 return database;
}

export async function rememberLocalMedia(id, blob) {
 const db = await openStore();
 await new Promise((resolve, reject) => {
  const transaction = db.transaction('files', 'readwrite');
  transaction.oncomplete = resolve;
  transaction.onabort = () => reject(transaction.error || Error('Device storage is unavailable.'));
  transaction.objectStore('files').put(blob, id);
 });
}

export async function readLocalMedia(asset) {
 const db = await openStore();
 return new Promise((resolve, reject) => {
  const request = db.transaction('files').objectStore('files').get(asset.id);
  request.onsuccess = () => resolve(request.result?.size === asset.ref.size ? request.result : null);
  request.onerror = () => reject(request.error);
 });
}
