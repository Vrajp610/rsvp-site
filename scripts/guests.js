// guests.js — authoritative loader (no local fallback)

// Start with empty mapping — will be populated from Apps Script
window.guestGroups = {};

function notifyGuestListLoaded(success = true) {
  const evt = new CustomEvent('guestlist:loaded', { detail: { success } });
  document.dispatchEvent(evt);
}

// Attempt to fetch an authoritative guest list from the Apps Script web app
(function loadFromAppsScript() {
  const endpoint = window.GUESTS_ENDPOINT;
  if (!endpoint) {
    // GUESTS_ENDPOINT missing — logging removed
    notifyGuestListLoaded(false);
    return;
  }

  const url = endpoint + (endpoint.includes('?') ? '&' : '?') + 'action=guestlist';

  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error('Network response was not ok: ' + res.status);
      return res.json();
    })
    .then(data => {
      if (!data) {
        notifyGuestListLoaded(false);
        return;
      }

      // If the Apps Script returns a mapping { G001: ["A","B"], ... }
      if (typeof data === 'object' && !Array.isArray(data)) {
        window.guestGroups = data;
        // guest list loaded (mapping) — logging removed
        notifyGuestListLoaded(true);
        return;
      }

      // If Apps Script returns rows: [{group_id: 'G001', name_1: 'A', name_2: 'B'}, ...]
      if (Array.isArray(data)) {
        const map = {};
        data.forEach(row => {
          const id = row.group_id || row.groupId || row.group;
          if (!id) return;

          const names = [];

          // Collect any columns that look like name fields (name, name_1, name 1, name1, names, etc.)
          Object.keys(row).forEach(k => {
            const normalizedKey = String(k || '').replace(/\s+/g, '').toLowerCase();
            if (normalizedKey.startsWith('name')) {
              const v = row[k];
              if (v && String(v).trim()) names.push(String(v).trim());
            }
          });

          // Fallback: if there's a `names` column that is CSV, expand it
          if (names.length === 0 && row.names) {
            const extras = String(row.names).split(',').map(s => s.trim()).filter(Boolean);
            if (extras.length) names.push(...extras);
          }

          map[id] = names;
        });
        window.guestGroups = map;
        // guest list loaded (rows) — logging removed
        notifyGuestListLoaded(true);
        return;
      }

      // Unexpected guest list format — logging removed
      notifyGuestListLoaded(false);
    })
    .catch(err => {
      // Could not load guest list — logging removed
      notifyGuestListLoaded(false);
    });
})();


