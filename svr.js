var exp = require('express');
var fs = require('fs');
var cors = require('cors');
require('dotenv').config();

var dbp = require('./cfg/db').dbp;

if (typeof require('./cfg/db').initDb !== 'function') {
  throw new Error('cfg/db.js must export initDb()');
}

var app = exp();
var prt = Number(process.env.PORT) || 3000;
var uploadsDir = process.env.UPLDS_DIR || './uplds';

app.use(cors());
app.use(exp.json());
app.use('/uplds', exp.static(uploadsDir));

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

(async function boot() {
  try {
    await require('./cfg/db').initDb();
    app.listen(prt, '0.0.0.0', function() {
      console.log(`\n✅ Server running on port ${prt}\n`);
      console.log(`DB: ${dbp}`);
      console.log(`Uploads: ${uploadsDir}`);
      if (process.env.RENDER_GIT_COMMIT) {
        console.log(`Render commit: ${process.env.RENDER_GIT_COMMIT}`);
      }
    });
  } catch (e) {
    console.error('Failed to initialize database:', e);
    process.exit(1);
  }
})();
