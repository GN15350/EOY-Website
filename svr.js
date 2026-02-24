const exp = require('express');
const pth = require('path');
const fs = require('fs');
const cors = require('cors');
const upldsDir = process.env.UPLDS_DIR || './uplds';
const app = exp();
const prt = 3000;

if (typeof dbModule.initDb !== 'function') {
  throw new Error('cfg/db.js must export initDb()');
}


app.use(cors());
app.use(exp.json());
if (!fs.existsSync(upldsDir)) {
  fs.mkdirSync(upldsDir, { recursive: true });
}

var authRtr = require('./rts/auth').rtr;
var usrRtr = require('./rts/usr');
var teamRtr = require('./rts/team');

app.use('/api/auth', authRtr);
app.use('/api/usr', usrRtr);
app.use('/api/team', teamRtr);
app.get('/api/health', function(req, res) {
  res.json({ ok: true, db: dbp, uploads: upldsDir });
});


start();
