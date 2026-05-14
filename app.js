const API = '/api/index.php';
function setToken(tok) { localStorage.setItem('token', tok); }
function getToken() { return localStorage.getItem('token'); }
function authHeader() { return { Authorization: `Bearer ${getToken()}` }; }
window.guardPage = async function (requiredRole, fallbackUrl = 'index.html') {
  const token = localStorage.getItem('token');
  if (!token) return location.replace(fallbackUrl);
  try {
    const resp = await fetch(`${API}?action=me&token=${token}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!resp.ok) throw new Error('no auth');
    const data = await resp.json();
    if (requiredRole === 'viewer' && data.role === 'admin') {
      return;
    }
    if (data.role !== requiredRole) {
      const redirectTo = data.role === 'admin' ? 'admin.html' : 'viewer.html';
      return location.replace(redirectTo);
    }
  } catch (_) {
    return location.replace(fallbackUrl);
  }
};
document.getElementById('loginBtn')?.addEventListener('click', async () => {
  const role = document.getElementById('roleSelect').value;
  const pwd = document.getElementById('pwd').value;
  const res = await fetch(`${API}?action=login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: pwd, role: role })
  });
  if (res.status === 202) {
    const data = await res.json();
    document.getElementById('errMsg').textContent = data.error || 'Неверный пароль';
    return;
  }
  if (!res.ok) {
    document.getElementById('errMsg').textContent = 'Ошибка сервера';
    return;
  }
  const { token } = await res.json();
  setToken(token);
  if (role === 'admin') location.href = 'admin.html';
  else location.href = 'viewer.html';
});