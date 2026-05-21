const fs = require('fs');
const path = require('path');

// DATA_DIR can be overridden by env var so Railway can point it at a persistent volume
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const COLLECTIONS = ['users', 'friendships', 'hangouts', 'messages', 'transactions', 'invites'];
COLLECTIONS.forEach(col => {
  const file = path.join(DATA_DIR, `${col}.json`);
  if (!fs.existsSync(file)) fs.writeFileSync(file, '[]', 'utf8');
});

const filePath = (col) => path.join(DATA_DIR, `${col}.json`);
const read = (col) => JSON.parse(fs.readFileSync(filePath(col), 'utf8'));
const write = (col, data) => fs.writeFileSync(filePath(col), JSON.stringify(data, null, 2), 'utf8');

const db = {
  find: (col, fn) => read(col).filter(fn),
  findOne: (col, fn) => read(col).find(fn) || null,
  insert: (col, item) => { const d = read(col); d.push(item); write(col, d); return item; },
  update: (col, fn, changes) => {
    const d = read(col).map(r => fn(r) ? { ...r, ...changes } : r);
    write(col, d); return d;
  },
  remove: (col, fn) => { write(col, read(col).filter(r => !fn(r))); },
  count: (col, fn) => read(col).filter(fn).length,
};

module.exports = db;
