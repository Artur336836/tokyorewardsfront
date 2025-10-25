// src/routes/AdminGate.jsx
import React, { useEffect, useState, Suspense, lazy } from 'react';

const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, '') || 'http://localhost:8080';

const LazyAdmin = lazy(() => import('../admin/AdminPanel.jsx'));

export default function AdminGate() {
  const [ok, setOk] = useState(null); 
  const [token, setToken] = useState('');

  useEffect(() => {
    const t =
      sessionStorage.getItem('admin_token') ||
      localStorage.getItem('admin_token') ||
      '';
    if (!t) { setOk(false); return; }
    setToken(t);

    fetch(`${BACKEND_URL}/api/admin/ping`, { headers: { 'x-admin-token': t } })
      .then(r => setOk(r.ok))
      .catch(() => setOk(false));
  }, []);

  const fetchAuthed = (input, init = {}) =>
    fetch(input, { ...init, headers: { ...(init.headers || {}), 'x-admin-token': token } });

  if (ok !== true) return null;

  return (
    <Suspense fallback={null}>
      <LazyAdmin token={token} fetchAuthed={fetchAuthed} />
    </Suspense>
  );
}
