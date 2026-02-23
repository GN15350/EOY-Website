const exp = require('express');
const pth = require('path');
const fs = require('fs');
const cors = require('cors');

const app = exp();
const prt = 3000;

// CORS is handled by Cloudflare Transform Rules
// In local dev we still need CORS to allow the frontend to hit the API.
app.use(cors());

app.use(exp.json());
app.use('/uplds', exp.static('uplds'));

if (!fs.existsSync('./uplds')) {
  fs.mkdirSync('./uplds');
}

const { rtr: authRtr } = require('./rts/auth');
const usrRtr = require('./rts/usr');
const teamRtr = require('./rts/team');

app.use('/api/auth', authRtr);
app.use('/api/usr', usrRtr);
app.use('/api/team', teamRtr);
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

app.listen(prt, '0.0.0.0', () => {
  console.log(`\n✅ Server running on port ${prt}\n`);
  console.log('Endpoints:');
  console.log('  POST /api/auth/register');
  console.log('  POST /api/auth/login');
  console.log('  GET  /api/usr/profile');
  console.log('  PUT  /api/usr/profile');
  console.log('  POST /api/usr/profile/pic');
  console.log('  GET  /api/usr/all');
  console.log('  GET  /api/usr/:id');
  console.log('  POST /api/usr/request (CS1 only)');
  console.log('  GET  /api/usr/request/invite/:token');
  console.log('  POST /api/usr/request/invite/:token/respond\n');
  console.log('  GET  /api/team/my');
  console.log('  GET  /api/team/all');
  console.log('  GET  /api/team/by-user/:uid');
  console.log('  GET  /api/team/:id');
  console.log('  POST /api/team');
  console.log('  PUT  /api/team/:id/meta\n');
  console.log('  DELETE /api/team/:id (admin only)');
  console.log('  DELETE /api/team/:tid/member/:uid (admin only)\n');
});
