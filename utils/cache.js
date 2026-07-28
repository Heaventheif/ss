"use strict";

const _store = new Map(); 
const MAX_ENTRIES = 1500; 

// Get a cached value if present and not expired.
function get(key) {
  const entry = _store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    _store.delete(key);
    return null;
  }
  
  
  _store.delete(key);
  _store.set(key, entry);
  return entry.value;
}

// Store a value in the cache with a time-to-live.
function set(key, value, ttlMs = 5 * 60 * 1000) {
  if (_store.size >= MAX_ENTRIES && !_store.has(key)) {
    const oldestKey = _store.keys().next().value; 
    _store.delete(oldestKey);
  }
  _store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

// Remove a value from the cache.
function del(key) {
  _store.delete(key);
}

// Remove all expired entries from the cache.
function sweep() {
  const now = Date.now();
  let removed = 0;
  for (const [key, entry] of _store.entries()) {
    if (now > entry.expiresAt) { _store.delete(key); removed++; }
  }
  return removed;
}

// Get the current number of cached entries.
function size() {
  return _store.size;
}

export { get, set, del, sweep, size  };
export default { get, set, del, sweep, size };
