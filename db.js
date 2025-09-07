// db.js

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('workout-posts-store', 1);

    request.onerror = (event) => {
      reject('IndexedDB error: ' + event.target.errorCode);
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore('sync-posts', { autoIncrement: true });
    };
  });
}

async function writeData(storeName, data) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  store.add(data);
  return tx.complete;
}

async function readAllData(storeName) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readonly');
  const store = tx.objectStore(storeName);
  return store.getAll();
}

async function clearAllData(storeName) {
  const db = await openDb();
  const tx = db.transaction(storeName, 'readwrite');
  const store = tx.objectStore(storeName);
  store.clear();
  return tx.complete;
}
