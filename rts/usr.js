const exp = require('express');
const rtr = exp.Router();
const { qry, run, get } = require('../cfg/db');
const { vrf } = require('./auth');
const mult = require('multer');
const pth = require('path');
const nodemailer = require('nodemailer');
const TEAM_ADMIN_EMAIL = 'mcbrayers@friscoisd.org';
let mailer = null;

function getMailer() {
  if (mailer) return mailer;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = String(process.env.SMTP_SECURE || '').toLowerCase() === 'true' || port === 465;

  if (!host || !user || !pass) return null;

  mailer = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });
  return mailer;
}

const ensureRequestedTbl = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS requested_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uid INTEGER NOT NULL,
      rid INTEGER NOT NULL,
      ca DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (uid) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (rid) REFERENCES users(id) ON DELETE CASCADE,
      UNIQUE(uid, rid)
    )
  `);
};

const upl = mult({
  storage: mult.diskStorage({
    destination: './uplds',
    filename: (req, file, cb) => {
      cb(null, Date.now() + pth.extname(file.originalname));
    }
  })
});

// Public user options for signup requested-members dropdowns
rtr.get('/options', async (req, res) => {
  try {
    const usrs = await qry(
      'SELECT id, fn, ln, pn, cl FROM users WHERE lower(em) != lower(?) ORDER BY fn, ln',
      [TEAM_ADMIN_EMAIL]
    );
    res.json({ ok: true, data: usrs });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, msg: 'Error' });
  }
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

// Get my requested members
rtr.get('/profile/requests', vrf, async (req, res) => {
  try {
    await ensureRequestedTbl();
    const data = await qry(
      `SELECT u.id, u.fn, u.ln, u.pn, u.cl
       FROM requested_members rm
       JOIN users u ON u.id = rm.rid
       WHERE rm.uid = ?
       AND lower(u.em) != lower(?)
       ORDER BY u.fn, u.ln`,
      [req.uid, TEAM_ADMIN_EMAIL]
    );
    res.json({ ok: true, data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, msg: 'Error' });
  }
});

// Replace my requested members (max 3)
rtr.put('/profile/requests', vrf, async (req, res) => {
  try {
    await ensureRequestedTbl();
    const rawIds = Array.isArray(req.body?.memberIds) ? req.body.memberIds : [];
    const ids = [...new Set(rawIds.map((v) => Number(v)).filter((v) => Number.isInteger(v) && v > 0 && v !== req.uid))];

    if (ids.length > 3) {
      return res.status(400).json({ ok: false, msg: 'You can request up to 3 members' });
    }

    if (ids.length > 0) {
      const placeholders = ids.map(() => '?').join(',');
      const existing = await qry(`SELECT id FROM users WHERE id IN (${placeholders})`, ids);
      if (existing.length !== ids.length) {
        return res.status(400).json({ ok: false, msg: 'One or more selected users do not exist' });
      }
    }

    await run('DELETE FROM requested_members WHERE uid = ?', [req.uid]);
    for (const rid of ids) {
      await run('INSERT INTO requested_members (uid, rid) VALUES (?, ?)', [req.uid, rid]);
    }

    const data = await qry(
      `SELECT u.id, u.fn, u.ln, u.pn, u.cl
       FROM requested_members rm
       JOIN users u ON u.id = rm.rid
       WHERE rm.uid = ?
       ORDER BY u.fn, u.ln`,
      [req.uid]
    );
    res.json({ ok: true, data });
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
    const usrs = await qry(
      'SELECT id, fn, ln, pn, cl, em, pp FROM users WHERE id != ? AND lower(em) != lower(?) ORDER BY fn, ln',
      [req.uid, TEAM_ADMIN_EMAIL]
    );
    res.json({ ok: true, data: usrs });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, msg: 'Error' });
  }
});

// Get requested members by user ID
rtr.get('/:id/requests', vrf, async (req, res) => {
  try {
    await ensureRequestedTbl();
    const data = await qry(
      `SELECT u.id, u.fn, u.ln, u.pn, u.cl
       FROM requested_members rm
       JOIN users u ON u.id = rm.rid
       WHERE rm.uid = ?
       AND lower(u.em) != lower(?)
       ORDER BY u.fn, u.ln`,
      [req.params.id, TEAM_ADMIN_EMAIL]
    );
    res.json({ ok: true, data });
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

    const { toId } = req.body || {};
    if (!toId) {
      return res.status(400).json({ ok: false, msg: 'Recipient is required' });
    }

    // Get requester info
    const frm = await get('SELECT fn, ln, pn, em FROM users WHERE id = ?', [req.uid]);
    const target = await get('SELECT id, fn, ln, pn, em FROM users WHERE id = ?', [toId]);
    if (!target) {
      return res.status(404).json({ ok: false, msg: 'Recipient not found' });
    }

    const frmNm = `${frm.pn || frm.fn} ${frm.ln}`;
    const toNm = `${target.pn || target.fn} ${target.ln}`;
    const toEm = target.em;
    const smtp = getMailer();
    if (!smtp) {
      return res.status(503).json({
        ok: false,
        msg: 'Email is not configured. Ask admin to set SMTP_HOST, SMTP_USER, SMTP_PASS (and optionally SMTP_PORT, SMTP_SECURE, SMTP_FROM).'
      });
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const subject = `Team Member Request from ${frmNm}`;
    const text = `${frmNm} (${frm.em}) wants to work with you on their CS project team.`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <p>Hi ${toNm},</p>
        <p><strong>${frmNm}</strong> (${frm.em}) wants to work with you on their CS project team.</p>
        <p>Please reply to this email to accept or decline.</p>
      </div>
    `;

    await smtp.sendMail({ from, to: toEm, subject, text, html });

    res.json({ ok: true, msg: `Request email sent to ${toNm}` });
  } catch (e) {
    console.error(e);
    const msg = String(e?.response || e?.message || '');
    if (msg.includes('AUTH005') || msg.includes('Too many bad auth attempts')) {
      return res.status(429).json({
        ok: false,
        msg: 'Yahoo temporarily blocked SMTP login after too many attempts. Wait and try again, or generate a new Yahoo app password.'
      });
    }
    if (msg.includes('Invalid login')) {
      return res.status(401).json({
        ok: false,
        msg: 'SMTP login failed. Recheck SMTP_USER/SMTP_PASS (use Yahoo app password).'
      });
    }
    res.status(500).json({ ok: false, msg: 'Error sending request email' });
  }
});

module.exports = rtr;
