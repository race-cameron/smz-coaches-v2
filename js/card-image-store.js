/**
 * SMZ Coaches V2 — Card Image Store (IndexedDB)
 *
 * Card metadata (scores, age group, shields, dates) lives in
 * localStorage via CardsState — it's tiny. The actual card IMAGES
 * (the flattened renderedFront + the source photo) are the real
 * space hogs, since they're stored as base64 and every card keeps
 * its own copy forever for progression history. localStorage caps
 * out around 5-10MB per origin on iOS Safari, which is only about
 * 15-20 full cards — nowhere near enough for a real season roster.
 *
 * IndexedDB has a MUCH higher quota (typically hundreds of MB+, tied
 * to device storage), so card images live here instead, keyed by
 * card id. CardsState stores only a `hasImage: true` flag + the card
 * id — everywhere that needs the actual picture fetches it from here
 * asynchronously.
 *
 * Cards saved before this upgrade still have their image data
 * embedded directly in the old localStorage record (renderedFront /
 * photo fields) — callers should keep checking those fields first
 * and only fall back to CardImageStore.get() when hasImage is set
 * and no inline image is present, so nothing already saved breaks.
 */
const CardImageStore = (() => {

  const DB_NAME = 'smz_v2_card_images';
  const DB_VERSION = 1;
  const STORE = 'images';

  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) {
        reject(new Error('This browser does not support the storage needed to save card images.'));
        return;
      }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: 'id' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error('Could not open card image storage.'));
    });
    return dbPromise;
  }

  // data: { renderedFront, photo }
  async function put(id, data) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put({ id, renderedFront: data.renderedFront || null, photo: data.photo || null });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error('Could not save the card image.'));
    });
  }

  async function get(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error || new Error('Could not load the card image.'));
    });
  }

  async function remove(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error('Could not remove the card image.'));
    });
  }

  async function removeMany(ids) {
    if (!ids || !ids.length) return true;
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      ids.forEach(id => store.delete(id));
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error || new Error('Could not clear card images.'));
    });
  }

  return { put, get, remove, removeMany };

})();
