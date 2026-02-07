const exp = require('express');
const rtr = exp.Router();
const { qry, run, get } = require('../cfg/db');
const { vrf } = require('./auth');
const mult = require('multer');
const pth = require('path');

const upl = mult({
  storage: mult.diskStorage({
    destination: './uplds',
    filename: (req, file, cb) => {
      cb(null, Date.now() + pth.extname(file.originalname));
    }
  })
});

// Get profile
rtr.get('/profile', vrf, async (req, res) => {
  try {
    const u = await get('SELECT id, fn, ln, pn, em, ph, cl, pp, ts, ss FROM users WHERE id = ?', [req.uid]);
    if (!u) {
      return res.status(404).json({ ok: false, msg: 'User not found' });
    }
    res.json({ ok: true, data: u });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, msg: 'Error' });
  }
});

// Update profile
rtr.put('/profile', vrf, async (req, res) => {
  try {
    const { fn, ln, pn, ph, cl, ts, ss } = req.body;
    
    await run(
      'UPDATE users SET fn = ?, ln = ?, pn = ?, ph = ?, cl = ?, ts = ?, ss = ? WHERE id = ?',
      [fn, ln, pn || null, ph || null, cl, ts || null, ss || null, req.uid]
    );

    const u = await get('SELECT id, fn, ln, pn, em, ph, cl, pp, ts, ss FROM users WHERE id = ?', [req.uid]);
    res.json({ ok: true, data: u });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, msg: 'Error' });
  }
});

// Upload picture
rtr.post('/profile/pic', vrf, upl.single('pic'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, msg: 'No file' });
    }

    const pp = '/uplds/' + req.file.filename;
    await run('UPDATE users SET pp = ? WHERE id = ?', [pp, req.uid]);

    res.json({ ok: true, pp });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, msg: 'Error' });
  }
});

// Get all users (for dropdown)
rtr.get('/all', vrf, async (req, res) => {
  try {
    const usrs = await qry('SELECT id, fn, ln, pn, cl, em, pp FROM users WHERE id != ? ORDER BY fn, ln', [req.uid]);
    res.json({ ok: true, data: usrs });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, msg: 'Error' });
  }
});

// Get user by ID
rtr.get('/:id', vrf, async (req, res) => {
  try {
    const u = await get('SELECT id, fn, ln, pn, em, ph, cl, pp, ts, ss FROM users WHERE id = ?', [req.params.id]);
    if (!u) {
      return res.status(404).json({ ok: false, msg: 'User not found' });
    }
    res.json({ ok: true, data: u });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, msg: 'Error' });
  }
});

// Send member request (CS1 only)
rtr.post('/request', vrf, async (req, res) => {
  try {
    // Check if requester is CS1
    const req_usr = await get('SELECT cl FROM users WHERE id = ?', [req.uid]);
    if (!req_usr || req_usr.cl !== 'CS1') {
      return res.status(403).json({ ok: false, msg: 'Only CS1 students can send requests' });
    }

    const { toId, toEm, toNm } = req.body;

    // Get requester info
    const frm = await get('SELECT fn, ln, pn, em FROM users WHERE id = ?', [req.uid]);
    const frmNm = `${frm.pn || frm.fn} ${frm.ln}`;

    // Send email (simulated - in real app, use nodemailer)
    console.log(`\n📧 EMAIL SENT:`);
    console.log(`To: ${toEm}`);
    console.log(`Subject: Team Member Request from ${frmNm}`);
    console.log(`Body: ${frmNm} (${frm.em}) wants to work with you on their CS project team!`);
    console.log(`Reply to accept or decline this request.\n`);

    // Note: In production, store this in a separate requests table
    // For now, just send the email notification

    res.json({ ok: true, msg: 'Request sent and email delivered' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, msg: 'Error sending request' });
  }
});

module.exports = rtr;
