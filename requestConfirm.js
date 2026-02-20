const msgEl = document.getElementById('invite-message');
const expEl = document.getElementById('invite-expiry');
const statusEl = document.getElementById('status');
const acceptBtn = document.getElementById('accept-btn');
const declineBtn = document.getElementById('decline-btn');
const returnLink = document.getElementById('return-link');

function setButtonsDisabled(disabled) {
  acceptBtn.disabled = disabled;
  declineBtn.disabled = disabled;
}

function tokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('token') || '';
}

async function loadInvite(token) {
  const res = await api.req(`/usr/request/invite/${encodeURIComponent(token)}`, { noAuth: true });
  if (!res.ok) {
    msgEl.textContent = res.msg || 'Invitation could not be loaded.';
    setButtonsDisabled(true);
    return false;
  }

  const teamName = res.data.teamName ? ` for team "${res.data.teamName}"` : '';
  msgEl.textContent = `${res.data.requesterName} invited you${teamName}.`;
  expEl.textContent = `Expires: ${new Date(res.data.expiresAt).toLocaleString()}`;
  return true;
}

async function respond(token, action) {
  setButtonsDisabled(true);
  statusEl.textContent = 'Submitting...';

  const res = await api.req(`/usr/request/invite/${encodeURIComponent(token)}/respond`, {
    m: 'POST',
    body: { action },
    noAuth: true
  });

  if (!res.ok) {
    statusEl.textContent = res.msg || 'Could not update invitation.';
    setButtonsDisabled(false);
    return;
  }

  statusEl.textContent = res.msg;
  if (action === 'accept') {
    returnLink.href = 'login.html';
    returnLink.textContent = 'Invitation accepted. Log in to view your team';
  } else {
    returnLink.href = 'login.html';
    returnLink.textContent = 'Invitation declined. Return to login';
  }
  returnLink.style.display = 'inline-block';
}

async function init() {
  const token = tokenFromUrl();
  if (!token) {
    msgEl.textContent = 'Missing invitation token.';
    setButtonsDisabled(true);
    return;
  }

  const ok = await loadInvite(token);
  if (!ok) return;

  acceptBtn.addEventListener('click', () => respond(token, 'accept'));
  declineBtn.addEventListener('click', () => respond(token, 'decline'));
}

init();
