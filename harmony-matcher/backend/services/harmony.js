const { getDb } = require('../database');
const { v4: uuidv4 } = require('uuid');

async function importFromHarmonyAPI(eventId, selectedIds = null) {
  const response = await fetch(process.env.HARMONY_API_URL);
  const data = await response.json();
  
  let members = data.items || [];
  if (selectedIds?.length > 0) {
    members = members.filter((m, idx) => selectedIds.includes(idx));
  }
  
  const db = getDb();
  let count = 0;
  
  for (const member of members) {
    const placeholderPhone = `+972500000${count.toString().padStart(4, '0')}`;
    try {
      db.prepare(`INSERT OR IGNORE INTO attendees (id, event_id, name, phone, photo_url, harmony_id) VALUES (?, ?, ?, ?, ?, ?)`).run(
        uuidv4(), eventId, member.title, placeholderPhone, member.thumbnail_url, member.title
      );
      count++;
    } catch (e) { console.error(`Error importing ${member.title}:`, e); }
  }
  
  return { count };
}

module.exports = { importFromHarmonyAPI };
