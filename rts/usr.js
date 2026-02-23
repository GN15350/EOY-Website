const exp = require('express');
const rtr = exp.Router();
const { qry, run, get } = require('../cfg/db');
const { vrf } = require('./auth');
const mult = require('multer');
const pth = require('path');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
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

const ensureTeamInviteTbl = async () => {
  await run(`
    CREATE TABLE IF NOT EXISTS team_invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_id INTEGER NOT NULL,
      recipient_id INTEGER NOT NULL,
      token TEXT NOT NULL UNIQUE,
      status TEXT NOT NULL DEFAULT 'pending',
      expires_at DATETIME NOT NULL,
      ca DATETIME DEFAULT CURRENT_TIMESTAMP,
      responded_at DATETIME,
      FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (recipient_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);
};

function makeInviteToken() {
  return crypto.randomBytes(32).toString('hex');
}

function frontendBaseUrl(req) {
  return process.env.FRONTEND_BASE_URL || `${req.protocol}://${req.get('host')}`;
}

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
    await ensureTeamInviteTbl();

    // Check if requester is CS1
    const req_usr = await get('SELECT cl FROM users WHERE id = ?', [req.uid]);
    if (!req_usr || req_usr.cl !== 'CS1') {
      return res.status(403).json({ ok: false, msg: 'Only CS1 students can send requests' });
    }

    const { toId } = req.body || {};
    if (!toId) {
      return res.status(400).json({ ok: false, msg: 'Recipient is required' });
    }

    if (Number(toId) === Number(req.uid)) {
      return res.status(400).json({ ok: false, msg: 'You cannot request yourself' });
    }

    const reqTeam = await get(
      `SELECT tid
       FROM members
       WHERE uid = ?
       ORDER BY ja DESC
       LIMIT 1`,
      [req.uid]
    );
    if (!reqTeam) {
      return res.status(400).json({
        ok: false,
        msg: 'Create your team first. Invitations can only be sent for an existing team.'
      });
    }

    // Get requester info
    const frm = await get('SELECT fn, ln, pn, em FROM users WHERE id = ?', [req.uid]);
    const target = await get('SELECT id, fn, ln, pn, em, cl FROM users WHERE id = ?', [toId]);
    if (!target) {
      return res.status(404).json({ ok: false, msg: 'Recipient not found' });
    }
    if (target.cl !== 'CS1') {
      return res.status(400).json({ ok: false, msg: 'Only CS1 students can be requested' });
    }

    const targetTeam = await get(
      `SELECT tid
       FROM members
       WHERE uid = ?
       ORDER BY ja DESC
       LIMIT 1`,
      [toId]
    );
    if (targetTeam) {
      return res.status(400).json({ ok: false, msg: 'That student is already on a team' });
    }

    const existingInvite = await get(
      `SELECT id
       FROM team_invites
       WHERE requester_id = ?
       AND recipient_id = ?
       AND status = 'pending'
       AND datetime(expires_at) > datetime('now')`,
      [req.uid, toId]
    );
    if (existingInvite) {
      return res.status(400).json({ ok: false, msg: 'A pending invitation already exists for this student' });
    }

    const token = makeInviteToken();
    await run(
      `INSERT INTO team_invites (requester_id, recipient_id, token, status, expires_at)
       VALUES (?, ?, ?, 'pending', datetime('now', '+7 days'))`,
      [req.uid, toId, token]
    );

    const frmNm = `${frm.pn || frm.fn} ${frm.ln}`;
    const toNm = `${target.pn || target.fn} ${target.ln}`;
    const toEm = target.em;
    const inviteUrl = `${frontendBaseUrl(req).replace(/\/$/, '')}/requestConfirm.html?token=${encodeURIComponent(token)}`;
    const smtp = getMailer();
    if (!smtp) {
      return res.status(503).json({
        ok: false,
        msg: 'Email is not configured. Ask admin to set SMTP_HOST, SMTP_USER, SMTP_PASS (and optionally SMTP_PORT, SMTP_SECURE, SMTP_FROM).'
      });
    }

    const from = process.env.SMTP_FROM || process.env.SMTP_USER;
    const subject = `Team Member Request from ${frmNm}`;
    const text = `${frmNm} (${frm.em}) wants to work with you on their CS project team. Open this link to accept or decline: ${inviteUrl}`;
    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <p>Hi ${toNm},</p>
        <p><strong>${frmNm}</strong> (${frm.em}) wants to work with you on their CS project team.</p>
        <p>
          Open this link to accept or decline the invitation:<br />
          <a href="${inviteUrl}">${inviteUrl}</a>
        </p>
        <p>This invitation expires in 7 days.</p>
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

rtr.get('/request/invite/:token', async (req, res) => {
  try {
    await ensureTeamInviteTbl();
    const inv = await get(
      `SELECT
        ti.id,
        ti.requester_id,
        ti.recipient_id,
        ti.status,
        ti.expires_at,
        u.fn,
        u.ln,
        u.pn,
        t.tn
      FROM team_invites ti
      JOIN users u ON u.id = ti.requester_id
      LEFT JOIN members m ON m.uid = ti.requester_id
      LEFT JOIN teams t ON t.id = m.tid
      WHERE ti.token = ?
      ORDER BY m.ja DESC
      LIMIT 1`,
      [req.params.token]
    );

    if (!inv) return res.status(404).json({ ok: false, msg: 'Invitation not found' });
    if (inv.status !== 'pending') {
      return res.status(400).json({ ok: false, msg: `Invitation already ${inv.status}` });
    }
    if (Date.parse(inv.expires_at) <= Date.now()) {
      return res.status(400).json({ ok: false, msg: 'Invitation has expired' });
    }

    return res.json({
      ok: true,
      data: {
        requesterId: inv.requester_id,
        requesterName: `${inv.pn || inv.fn} ${inv.ln}`,
        teamName: inv.tn || null,
        expiresAt: inv.expires_at
      }
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, msg: 'Error' });
  }
});

rtr.post('/request/invite/:token/respond', async (req, res) => {
  try {
    await ensureTeamInviteTbl();
    const action = String(req.body?.action || '').toLowerCase();
    if (!['accept', 'decline'].includes(action)) {
      return res.status(400).json({ ok: false, msg: 'Action must be accept or decline' });
    }

    const inv = await get(
      `SELECT id, requester_id, recipient_id, status, expires_at
       FROM team_invites
       WHERE token = ?`,
      [req.params.token]
    );

    if (!inv) return res.status(404).json({ ok: false, msg: 'Invitation not found' });
    if (inv.status !== 'pending') {
      return res.status(400).json({ ok: false, msg: `Invitation already ${inv.status}` });
    }
    if (Date.parse(inv.expires_at) <= Date.now()) {
      await run("UPDATE team_invites SET status = 'expired', responded_at = CURRENT_TIMESTAMP WHERE id = ?", [inv.id]);
      return res.status(400).json({ ok: false, msg: 'Invitation has expired' });
    }

    if (action === 'decline') {
      await run("UPDATE team_invites SET status = 'declined', responded_at = CURRENT_TIMESTAMP WHERE id = ?", [inv.id]);
      return res.json({ ok: true, msg: 'Invitation declined' });
    }

    const recipientTeam = await get(
      `SELECT tid
       FROM members
       WHERE uid = ?
       ORDER BY ja DESC
       LIMIT 1`,
      [inv.recipient_id]
    );
    if (recipientTeam) {
      return res.status(400).json({ ok: false, msg: 'You are already on a team' });
    }

    const requesterTeam = await get(
      `SELECT tid
       FROM members
       WHERE uid = ?
       ORDER BY ja DESC
       LIMIT 1`,
      [inv.requester_id]
    );
    if (!requesterTeam) {
      return res.status(400).json({ ok: false, msg: 'Requester is not currently on a team' });
    }

    await run('INSERT INTO members (uid, tid, rol) VALUES (?, ?, ?)', [inv.recipient_id, requesterTeam.tid, 'member']);
    await run("UPDATE team_invites SET status = 'accepted', responded_at = CURRENT_TIMESTAMP WHERE id = ?", [inv.id]);

    return res.json({ ok: true, msg: 'Invitation accepted. You were added to the team.', data: { tid: requesterTeam.tid } });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, msg: 'Error' });
  }
});

module.exports = rtr;
