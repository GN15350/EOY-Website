const exp = require('express');
const rtr = exp.Router();
const bcr = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { qry, run, get } = require('../cfg/db');

const sec = 'your_secret_key_12345';


rtr.post('/register', async (req, res) => {
  try {
    const { fn, ln, pn, em, pw, ph, cl, ts, ss } = req.body;


    if (!fn || !ln || !em || !pw || !cl) {
      return res.status(400).json({ ok: false, msg: 'Missing required fields' });
    }

    const ex = await get('SELECT id FROM users WHERE em = ?', [em]);
    if (ex) {
      return res.status(400).json({ ok: false, msg: 'Email already registered. Please use a different email or try logging in.' });
    }

    const hsh = await bcr.hash(pw, 10);

    const r = await run(
      'INSERT INTO users (fn, ln, pn, em, pw, ph, cl, ts, ss) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [fn, ln, pn || null, em, hsh, ph || null, cl, ts || null, ss || null]
    );

    const tkn = jwt.sign({ uid: r.id }, sec, { expiresIn: '7d' });
    await run('INSERT INTO tkns (uid, tkn) VALUES (?, ?)', [r.id, tkn]);

    res.json({ ok: true, tkn, uid: r.id });
  } catch (e) {
    console.error('Register error:', e);
    res.status(500).json({ ok: false, msg: 'Server error during registration' });
  }
});


rtr.post('/login', async (req, res) => {
  try {
    const { em, pw } = req.body;

    const u = await get('SELECT * FROM users WHERE em = ?', [em]);
    if (!u) {
      return res.status(401).json({ ok: false, msg: 'Invalid credentials' });
    }

    const vld = await bcr.compare(pw, u.pw);
    if (!vld) {
      return res.status(401).json({ ok: false, msg: 'Invalid credentials' });
    }

    const tkn = jwt.sign({ uid: u.id }, sec, { expiresIn: '7d' });
    await run('INSERT INTO tkns (uid, tkn) VALUES (?, ?)', [u.id, tkn]);

    res.json({ ok: true, tkn, uid: u.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, msg: 'Error' });
  }
});


const vrf = async (req, res, nxt) => {
  const tkn = req.headers.authorization?.split(' ')[1];
  if (!tkn) {
    return res.status(401).json({ ok: false, msg: 'No token' });
  }

  try {
    const dec = jwt.verify(tkn, sec);
    req.uid = dec.uid;
    nxt();
  } catch (e) {
    res.status(401).json({ ok: false, msg: 'Invalid token' });
  }
};

module.exports = { rtr, vrf };
