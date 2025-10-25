// src/routes/AdminGate.jsx
import { useEffect, useMemo, useState, Suspense, lazy } from 'react';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, '') || 'http://localhost:8080';
const LazyAdmin = lazy(() => import('../admin/AdminPanel.jsx'));

export default function AdminGate() {
  const [ok, setOk] = useState(null);
  const [token, setToken] = useState('');

  useEffect(() => {
    const t = localStorage.getItem('admin_token') || '';
    if (!t) return setOk(false);
    setToken(t);
    fetch(`${BACKEND_URL}/api/admin/ping`, { headers: { 'x-admin-token': t } })
      .then(r => setOk(r.ok)) 
      .catch(() => setOk(false));
  }, []);

  if (ok === null) return null;     
  if (!ok) return <div style={{ display:'none' }} />;  
  const fetchAuthed = useMemo(() => {
    return (input, init = {}) =>
      fetch(input, {
        ...init,
        headers: { ...(init.headers || {}), 'x-admin-token': token }
      });
  }, [token]);

  return (
    <Suspense fallback={null}>
      <LazyAdmin token={token} fetchAuthed={fetchAuthed} />
    </Suspense>
  );
}
