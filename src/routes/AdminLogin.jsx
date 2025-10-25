
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, '') || 'http://localhost:8080';

const ADMIN_REDIRECT = '/secret-admin-xyz123';

export default function AdminLogin() {
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const navigate = useNavigate();

  async function submit(e) {
    e?.preventDefault();
    setErr(''); if (!token) return setErr('Enter token');
    setBusy(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/admin/ping`, {
        method: 'GET',
        headers: { 'x-admin-token': token }
      });
      if (!res.ok) {
        setErr('Invalid token');
        setBusy(false);
        return;
      }
      sessionStorage.setItem('admin_token', token);
      navigate(ADMIN_REDIRECT, { replace: true });
    } catch (e) {
      setErr('Network error');
      setBusy(false);
    }
  }

  return (
    <div className="container-outer mt-8">
      <div className="card max-w-md mx-auto">
        <h2 className="section-title">Admin Login</h2>
        <form onSubmit={submit} className="flex flex-col gap-3">
          <label className="text-sm muted">Enter admin token</label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="btn w-full"
            placeholder="Admin token"
            autoComplete="off"
          />
          {err && <div className="text-sm text-red-400">{err}</div>}
          <div className="flex gap-2">
            <button className="btn" disabled={busy} type="submit">{busy ? 'Checking…' : 'Login'}</button>
            <button type="button" className="btn ghost" onClick={() => { setToken(''); setErr(''); }}>
              Clear
            </button>
          </div>
        </form>

        <div className="text-xs muted mt-3">
          Note: keep this URL private. Token is stored only in your browser session (sessionStorage).
        </div>
      </div>
    </div>
  );
}
