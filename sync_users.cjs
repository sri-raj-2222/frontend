const fs = require('fs');
const path = require('path');
const DB_PATH = path.join(__dirname, 'server', 'tasks_db.json');

const raw = fs.readFileSync(DB_PATH, 'utf-8');
const db = JSON.parse(raw);

// Extract users from tasks
db.tasks.forEach(t => {
  if (t.posted_by && t.user) {
    const existing = db.users.find(u => u.id === t.posted_by);
    if (!existing) {
      db.users.push({
        id: t.posted_by,
        name: t.user.name,
        avatar_url: t.user.avatar_url,
        rating: 0,
        reviews_count: 0,
        points: 0
      });
    } else if (!existing.name) {
      existing.name = t.user.name;
      existing.avatar_url = t.user.avatar_url;
    }
  }
});

fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
console.log('Users array synchronized with tasks.');
