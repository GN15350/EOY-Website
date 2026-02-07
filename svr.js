const exp = require('express');
const cors = require('cors');
const pth = require('path');
const fs = require('fs');

const app = exp();
const prt = 3000;

app.use(cors());
app.use(exp.json());
app.use('/uplds', exp.static('uplds'));

if (!fs.existsSync('./uplds')) {
  fs.mkdirSync('./uplds');
}

const { rtr: authRtr } = require('./rts/auth');
const usrRtr = require('./rts/usr');

app.use('/api/auth', authRtr);
app.use('/api/usr', usrRtr);

app.listen(prt, () => {
  console.log(`\n✅ Server running on port ${prt}\n`);
  console.log('Endpoints:');
  console.log('  POST /api/auth/register');
  console.log('  POST /api/auth/login');
  console.log('  GET  /api/usr/profile');
  console.log('  PUT  /api/usr/profile');
  console.log('  POST /api/usr/profile/pic');
  console.log('  GET  /api/usr/all');
  console.log('  GET  /api/usr/:id');
  console.log('  POST /api/usr/request (CS1 only)\n');
});
