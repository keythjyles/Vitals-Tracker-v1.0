let database;

function openDatabase() {
  return database ??= new Promise((resolve, reject) => {
    const request = indexedDB.open('WavLock-clips', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('sources', {keyPath: 'id'});
      request.result.createObjectStore('clips', {keyPath: 'id'});
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      database = undefined;
      reject(request.error);
    };
  });
}

async function transaction(names, mode, operation) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(names, mode);
    const request = operation(tx);
    tx.oncomplete = () => resolve(request?.result);
    tx.onabort = () => reject(tx.error || Error('The saved clips could not be updated.'));
  });
}

export function listClips() {
  return transaction(['clips'], 'readonly', tx => tx.objectStore('clips').getAll());
}

export function readSource(id) {
  return transaction(['sources'], 'readonly', tx => tx.objectStore('sources').get(id));
}

export function saveClip(clip, source) {
  return transaction(['sources', 'clips'], 'readwrite', tx => {
    const originals = tx.objectStore('sources');
    const existing = originals.getKey(source.id);
    existing.onsuccess = () => {
      if (existing.result === undefined) originals.put(source);
    };
    tx.objectStore('clips').put(clip);
  });
}

export async function renameClip(id, name) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clips', 'readwrite');
    const clips = tx.objectStore('clips');
    const existing = clips.get(id);
    let updated;
    existing.onsuccess = () => {
      if (!existing.result) {
        tx.abort();
        return;
      }
      updated = {...existing.result, name};
      clips.put(updated);
    };
    tx.oncomplete = () => resolve(updated);
    tx.onabort = () => reject(tx.error || Error('The saved clip is unavailable.'));
  });
}
