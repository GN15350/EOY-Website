const sql3 = require('sqlite3').verbose();
const pth = require('path');
const fs = require('fs');

const dataDir = process.env.DATA_DIR || pth.join(__dirname, '..');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbp = pth.join(dataDir, 'db.sqlite');
const dbc = new sql3.Database(dbp);

dbc.serialize(() => {
  console.log(`Creating tables in ${dbp}...`);

  dbc.run('PRAGMA foreign_keys = ON');

  dbc.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fn TEXT NOT NULL,
      ln TEXT NOT NULL,
      pn TEXT,
      em TEXT UNIQUE NOT NULL,
      pw TEXT NOT NULL,
      ph TEXT,
      cl TEXT NOT NULL,
      pp TEXT,
      ts TEXT,
      ss TEXT,
      ca DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✓ Users');

  dbc.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tn TEXT UNIQUE NOT NULL,
      lid INTEGER NOT NULL,
      ca DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (lid) REFERENCES users(id)
    )
  `);
  console.log('✓ Teams');

  dbc.run(`
    CREATE TABLE IF NOT EXISTS team_meta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tid INTEGER UNIQUE NOT NULL,
      pn TEXT,
      pd TEXT,
      gl TEXT,
      FOREIGN KEY (tid) REFERENCES teams(id)
    )
  `);
  console.log('✓ TeamMetadata');

  dbc.run(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid INTEGER NOT NULL,
      tid INTEGER NOT NULL,
      rol TEXT DEFAULT 'member',
      ja DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (uid) REFERENCES users(id),
      FOREIGN KEY (tid) REFERENCES teams(id),
      UNIQUE(uid, tid)
    )
  `);
  console.log('✓ Memberships');

  dbc.run(`
    CREATE TABLE IF NOT EXISTS tkns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid INTEGER NOT NULL,
      tkn TEXT NOT NULL,
      ca DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (uid) REFERENCES users(id)
    )
  `, () => {
    console.log('✓ Tokens');
    console.log('\n✅ Done!\n');
    dbc.close();
  });
});
