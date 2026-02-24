const sql3 = require('sqlite3').verbose();
const pth = require('path');
const fs = require('fs');

const dataDir = process.env.DATA_DIR || pth.join(__dirname, '..');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbp = pth.join(dataDir, 'db.sqlite');
const dbc = new sql3.Database(dbp);

dbc.run('PRAGMA foreign_keys = ON');

const qry = (s, p = []) => {
  return new Promise((res, rej) => {
    dbc.all(s, p, (e, r) => {
      if (e) rej(e);
      else res(r);
    });
  });
};

const run = (s, p = []) => {
  return new Promise((res, rej) => {
    dbc.run(s, p, function(e) {
      if (e) rej(e);
      else res({ id: this.lastID, ch: this.changes });
    });
  });
};

const get = (s, p = []) => {
  return new Promise((res, rej) => {
    dbc.get(s, p, (e, r) => {
      if (e) rej(e);
      else res(r);
    });
  });
};

module.exports = { dbc, qry, run, get, dbp };
