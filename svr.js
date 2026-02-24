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

var app = exp();
var prt = Number(process.env.PORT) || 3000;
var uploadsDir = process.env.UPLDS_DIR || './uplds';

app.use(cors());
app.use(exp.json());
if (!fs.existsSync(upldsDir)) {
  fs.mkdirSync(upldsDir, { recursive: true });
}

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

var authRtr = require('./rts/auth').rtr;
var usrRtr = require('./rts/usr');
var teamRtr = require('./rts/team');

app.use('/api/auth', authRtr);
app.use('/api/usr', usrRtr);
app.use('/api/team', teamRtr);
app.get('/api/health', function(req, res) {
  res.json({ ok: true, db: dbp, uploads: uploadsDir });
});


start();
