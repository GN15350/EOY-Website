const exp = require('express');
const rtr = exp.Router();
const { qry, run, get } = require('../cfg/db');
const { vrf } = require('./auth');
const TEAM_ADMIN_EMAIL = 'mcbrayers@friscoisd.org';

async function isTeamAdmin(uid) {
  const u = await get('SELECT em FROM users WHERE id = ?', [uid]);
  return !!u && typeof u.em === 'string' && u.em.toLowerCase() === TEAM_ADMIN_EMAIL;
}

async function requireTeamAdmin(req, res, nxt) {
  try {
    if (await isTeamAdmin(req.uid)) return nxt();
    return res.status(403).json({ ok: false, msg: 'Admin access required' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ ok: false, msg: 'Error' });
  }
}

async function getTeamById(tid) {
  const team = await get(
    `SELECT
      t.id,
      t.tn,
      t.lid,
      tm.pn,
      tm.pd,
      tm.gl,
      u.fn AS lfn,
      u.ln AS lln,
      u.pn AS lpn,
      u.pp AS lpp,
      u.cl AS lcl
    FROM teams t
    LEFT JOIN team_meta tm ON tm.tid = t.id
    LEFT JOIN users u ON u.id = t.lid
    WHERE t.id = ?`,
    [tid]
  );

  if (!team) return null;

  const members = await qry(
    `SELECT
      m.uid,
      m.rol,
      u.fn,
      u.ln,
      u.pn,
      u.pp,
      u.cl
    FROM members m
    JOIN users u ON u.id = m.uid
    WHERE m.tid = ?
    ORDER BY CASE WHEN m.uid = ? THEN 0 ELSE 1 END, u.fn, u.ln`,
    [tid, team.lid]
  );

  return {
    id: team.id,
    tn: team.tn,
    lid: team.lid,
    meta: {
      pn: team.pn || null,
      pd: team.pd || null,
      gl: team.gl || null
    },
    leader: {
      id: team.lid,
      fn: team.lfn,
      ln: team.lln,
      pn: team.lpn,
      pp: team.lpp,
      cl: team.lcl
    },
    members: members.map((m) => ({
      id: m.uid,
      rol: m.rol,
      fn: m.fn,
      ln: m.ln,
      pn: m.pn,
      pp: m.pp,
      cl: m.cl
    }))
  };
}

// Get current user's team
rtr.get('/my', vrf, async (req, res) => {
  try {
    const myTeam = await get(
      `SELECT t.id
       FROM members m
       JOIN teams t ON t.id = m.tid
       WHERE m.uid = ?
       ORDER BY m.ja DESC
       LIMIT 1`,
      [req.uid]
    );

    if (!myTeam) {
      return res.json({ ok: true, data: null });
    }

    const data = await getTeamById(myTeam.id);
    res.json({ ok: true, data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, msg: 'Error' });
  }
});

// List all teams
rtr.get('/all', vrf, async (req, res) => {
  try {
    const teams = await qry(
      `SELECT
        t.id,
        t.tn,
        tm.pn,
        tm.pd,
        tm.gl,
        t.lid,
        u.fn AS lfn,
        u.ln AS lln,
        u.pn AS lpn,
        u.pp AS lpp,
        COUNT(m.uid) AS memberCount
      FROM teams t
      LEFT JOIN team_meta tm ON tm.tid = t.id
      LEFT JOIN users u ON u.id = t.lid
      LEFT JOIN members m ON m.tid = t.id
      GROUP BY t.id
      ORDER BY t.tn`
    );

    res.json({
      ok: true,
      data: teams.map((t) => ({
        id: t.id,
        tn: t.tn,
        lid: t.lid,
        memberCount: t.memberCount || 0,
        meta: {
          pn: t.pn || null,
          pd: t.pd || null,
          gl: t.gl || null
        },
        leader: {
          id: t.lid,
          fn: t.lfn,
          ln: t.lln,
          pn: t.lpn,
          pp: t.lpp
        }
      }))
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, msg: 'Error' });
  }
});

// Get team by user ID
rtr.get('/by-user/:uid', vrf, async (req, res) => {
  try {
    const row = await get(
      `SELECT tid
       FROM members
       WHERE uid = ?
       ORDER BY ja DESC
       LIMIT 1`,
      [req.params.uid]
    );

    if (!row) {
      return res.json({ ok: true, data: null });
    }

    const data = await getTeamById(row.tid);
    res.json({ ok: true, data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, msg: 'Error' });
  }
});

// Get team by ID
rtr.get('/:id', vrf, async (req, res) => {
  try {
    const data = await getTeamById(req.params.id);
    if (!data) {
      return res.status(404).json({ ok: false, msg: 'Team not found' });
    }
    res.json({ ok: true, data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, msg: 'Error' });
  }
});

// Create a team with current user as leader
rtr.post('/', vrf, async (req, res) => {
  try {
    const { tn, pn, pd, gl } = req.body || {};
    if (!tn || !tn.trim()) {
      return res.status(400).json({ ok: false, msg: 'Team name is required' });
    }

    const inTeam = await get('SELECT tid FROM members WHERE uid = ? LIMIT 1', [req.uid]);
    if (inTeam) {
      return res.status(400).json({ ok: false, msg: 'You are already in a team' });
    }

    const r = await run('INSERT INTO teams (tn, lid) VALUES (?, ?)', [tn.trim(), req.uid]);
    await run('INSERT INTO members (uid, tid, rol) VALUES (?, ?, ?)', [req.uid, r.id, 'leader']);
    await run(
      'INSERT INTO team_meta (tid, pn, pd, gl) VALUES (?, ?, ?, ?)',
      [r.id, pn || null, pd || null, gl || null]
    );

    const data = await getTeamById(r.id);
    res.json({ ok: true, data });
  } catch (e) {
    if (String(e.message || '').includes('UNIQUE constraint failed: teams.tn')) {
      return res.status(400).json({ ok: false, msg: 'Team name already exists' });
    }
    console.error(e);
    res.status(500).json({ ok: false, msg: 'Error' });
  }
});

// Update team metadata (leader only)
rtr.put('/:id/meta', vrf, async (req, res) => {
  try {
    const { pn, pd, gl } = req.body || {};
    const team = await get('SELECT id, lid FROM teams WHERE id = ?', [req.params.id]);
    if (!team) {
      return res.status(404).json({ ok: false, msg: 'Team not found' });
    }
    if (team.lid !== req.uid) {
      return res.status(403).json({ ok: false, msg: 'Only team leader can edit team info' });
    }

    const exists = await get('SELECT id FROM team_meta WHERE tid = ?', [team.id]);
    if (exists) {
      await run('UPDATE team_meta SET pn = ?, pd = ?, gl = ? WHERE tid = ?', [pn || null, pd || null, gl || null, team.id]);
    } else {
      await run('INSERT INTO team_meta (tid, pn, pd, gl) VALUES (?, ?, ?, ?)', [team.id, pn || null, pd || null, gl || null]);
    }

    const data = await getTeamById(team.id);
    res.json({ ok: true, data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, msg: 'Error' });
  }
});

// Delete team (admin only)
rtr.delete('/:id', vrf, requireTeamAdmin, async (req, res) => {
  try {
    const team = await get('SELECT id FROM teams WHERE id = ?', [req.params.id]);
    if (!team) {
      return res.status(404).json({ ok: false, msg: 'Team not found' });
    }

    await run('DELETE FROM members WHERE tid = ?', [team.id]);
    await run('DELETE FROM team_meta WHERE tid = ?', [team.id]);
    await run('DELETE FROM teams WHERE id = ?', [team.id]);

    res.json({ ok: true, msg: 'Team deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, msg: 'Error' });
  }
});

// Remove member from team (admin only)
rtr.delete('/:tid/member/:uid', vrf, requireTeamAdmin, async (req, res) => {
  try {
    const team = await get('SELECT id, lid FROM teams WHERE id = ?', [req.params.tid]);
    if (!team) {
      return res.status(404).json({ ok: false, msg: 'Team not found' });
    }

    if (Number(req.params.uid) === Number(team.lid)) {
      return res.status(400).json({ ok: false, msg: 'Use team delete to remove the leader' });
    }

    const r = await run('DELETE FROM members WHERE tid = ? AND uid = ?', [team.id, req.params.uid]);
    if (!r.ch) {
      return res.status(404).json({ ok: false, msg: 'Member not found in team' });
    }

    const data = await getTeamById(team.id);
    res.json({ ok: true, data, msg: 'Member removed' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ ok: false, msg: 'Error' });
  }
});

module.exports = rtr;
