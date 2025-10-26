// src/admin/AdminPanel.jsx
import React, { useEffect, useMemo, useState } from 'react';

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, '') || 'http://localhost:8080');

// --- helpers (kept local so this file is self-contained) ---
function resolveAssetUrl(url) {
  if (!url) return '/site-logo.png';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('/')) return `${BACKEND_URL}${url}`;
  return url;
}

async function fetchPrizes() {
  const r = await fetch(`${BACKEND_URL}/api/prizes`);
  if (!r.ok) return [175,100,70,50,35,25,15,10,10,10];
  const j = await r.json();
  return Array.isArray(j?.prizes) ? j.prizes : [175,100,70,50,35,25,15,10,10,10];
}

const ADMIN_TOKEN_KEY = 'admin_token';
function getAdminToken() { return localStorage.getItem(ADMIN_TOKEN_KEY) || ''; }
function setAdminToken(token) { token ? localStorage.setItem(ADMIN_TOKEN_KEY, token) : localStorage.removeItem(ADMIN_TOKEN_KEY); }

// --- the panel ---
// Props:
//   token?: string           // (optional) from AdminGate
//   fetchAuthed?: (url, init) => Promise<Response> // (optional) from AdminGate
export default function AdminPanel({ token: tokenProp, fetchAuthed }) {
  // If a token is passed from the gate, prefer it; otherwise fall back to localStorage.
  const [tokenLocal, setTokenLocal] = useState(tokenProp || getAdminToken());
  const [hasAuth, setHasAuth] = useState(!!(tokenProp || getAdminToken()));

  const [prizesLocal, setPrizesLocal] = useState([175,100,70,50,35,25,15,10,10,10]);
  const [endLocal, setEndLocal] = useState('');
  const [serverEnd, setServerEnd] = useState('');
  const [winStart, setWinStart] = useState(''); // "YYYY-MM-DDTHH:MM"
  const [winEnd,   setWinEnd]   = useState('');
  const [hHeadline, setHHeadline] = useState('');
  const [hSub1, setHSub1] = useState('');
  const [hSub2, setHSub2] = useState('');
  const [hLinkText, setHLinkText] = useState('');
  const [hLinkUrl, setHLinkUrl] = useState('');
  const [hHeadlineColor, setHHeadlineColor] = useState('#ffffff');
  const [hSub1Color, setHSub1Color] = useState('#cbd5e1');
  const [hSub2Color, setHSub2Color] = useState('#cbd5e1');
  const [hGlowColor, setHGlowColor] = useState('#ffffff');
  const [hGlowSize, setHGlowSize]   = useState(12);
  const [hGlowAlpha, setHGlowAlpha] = useState(0.8);
  const [hImageUrl, setHImageUrl] = useState('/site-logo.png');
  const [imgGlowColor, setImgGlowColor] = useState('#ffffff');
  const [imgGlowSize, setImgGlowSize]   = useState(16);
  const [imgGlowAlpha, setImgGlowAlpha] = useState(0.65);
  // Build an auth header helper. If fetchAuthed was passed from the Gate, we’ll use it
  // for admin endpoints; otherwise inject header manually.
  const effectiveToken = tokenProp || tokenLocal;
  const authHeader = useMemo(() => ({
    'x-admin-token': effectiveToken || ''
  }), [effectiveToken]);

  const callAuthed = useMemo(() => {
    if (fetchAuthed) return fetchAuthed;
    // Fallback if not provided by the Gate
    return (input, init = {}) =>
      fetch(input, { ...init, headers: { ...(init.headers || {}), ...authHeader } });
  }, [fetchAuthed, authHeader]);
  useEffect(() => {
  fetch(`${BACKEND_URL}/api/contest`)
    .then(r => r.json())
    .then(j => {
      const toLocal = (iso) => {
        if (!iso) return '';
        const dt = new Date(iso);
        const tz = dt.getTimezoneOffset() * 60000;
        return new Date(dt.getTime() - tz).toISOString().slice(0,16);
      };
      setWinStart(toLocal(j.start));
      setWinEnd(toLocal(j.end));
    })
    .catch(()=>{});
  }, []);

  useEffect(() => {
    // countdown
    fetch(`${BACKEND_URL}/api/countdown`)
      .then(r => r.json())
      .then(d => {
        const iso = d.end || '';
        setServerEnd(iso);
        if (iso) {
          const dt = new Date(iso);
          const tz = dt.getTimezoneOffset() * 60000;
          const local = new Date(dt.getTime() - tz).toISOString().slice(0, 16);
          setEndLocal(local);
        } else {
          setEndLocal('');
        }
      })
      .catch(() => {});

    // hero
    fetch(`${BACKEND_URL}/api/hero`)
      .then(r => r.json())
      .then(h => {
        setHHeadline(h.headline || '');
        setHSub1(h.sub1 || '');
        setHSub2(h.sub2 || '');
        setHLinkText(h.linkText || '');
        setHLinkUrl(h.linkUrl || '');
        setHHeadlineColor(h.headlineColor || '#ffffff');
        setHSub1Color(h.sub1Color || '#cbd5e1');
        setHSub2Color(h.sub2Color || '#cbd5e1');
        setHImageUrl(h.imageUrl || '/site-logo.png');
        setHGlowColor('#ffffff'); setHGlowSize(12); setHGlowAlpha(0.8);
        setImgGlowColor('#ffffff'); setImgGlowSize(16); setImgGlowAlpha(0.65);
      })
      .catch(() => {});

    // prizes
    fetchPrizes()
      .then(ps => setPrizesLocal(ps.map(n => Math.floor(Number(n) || 0))))
      .catch(() => {});
  }, []);
  function saveToken() {
    if (!tokenLocal) return;
    setAdminToken(tokenLocal);
    setHasAuth(true);
  }
  function logout() {
    setAdminToken('');
    setTokenLocal('');
    setHasAuth(false);
  }

  function hexToRgba(hex, alpha = 1) {
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const n = parseInt(h, 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  async function saveCountdown() {
    if (!endLocal) return alert('Pick a date/time.');
    const iso = new Date(endLocal).toISOString();
    const res = await callAuthed(`${BACKEND_URL}/api/countdown`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ end: iso })
    });
    // Your backend returns 404 for wrong/missing token; treat any !ok as unauthorized.
    if (!res.ok) { logout(); return alert('Unauthorized token. Logged out.'); }
    const data = await res.json();
    setServerEnd(data.end || '');
    alert('Countdown saved');
  }
  async function saveContestWindow() {
    const toIso = (local) => (local ? new Date(local).toISOString() : null);
    const res = await callAuthed(`${BACKEND_URL}/api/contest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ start: toIso(winStart), end: toIso(winEnd) })
    });
    if (!res.ok) { logout(); return alert('Unauthorized token. Logged out.'); }
    alert('Contest window saved — public leaderboard now shows gains within this window.');
  }

  async function clearContestWindow() {
    const res = await callAuthed(`${BACKEND_URL}/api/contest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ start: null, end: null })
    });
    if (!res.ok) { logout(); return alert('Unauthorized token. Logged out.'); }
    setWinStart(''); setWinEnd('');
    alert('Contest window cleared — public leaderboard shows lifetime totals.');
  }

  async function saveHero() {
    const headlineGlowCss = `0 0 ${hGlowSize}px ${hexToRgba(hGlowColor, hGlowAlpha)}`;
    const imageGlowCss    = `drop-shadow(0 0 ${imgGlowSize}px ${hexToRgba(imgGlowColor, imgGlowAlpha)})`;
    const res = await callAuthed(`${BACKEND_URL}/api/hero`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        headline: hHeadline, sub1: hSub1, sub2: hSub2,
        linkText: hLinkText, linkUrl: hLinkUrl,
        headlineColor: hHeadlineColor, sub1Color: hSub1Color, sub2Color: hSub2Color,
        imageUrl: hImageUrl,
        headlineGlow: headlineGlowCss, imageGlow: imageGlowCss
      })
    });
    if (!res.ok) { logout(); return alert('Unauthorized token. Logged out.'); }
    alert('Changes saved');
  }

  async function savePrizes() {
    const res = await callAuthed(`${BACKEND_URL}/api/prizes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ prizes: prizesLocal })
    });
    if (!res.ok) { logout(); return alert('Unauthorized token. Logged out.'); }
    alert('Prizes saved');
  }

  async function exportIdsTxt() {
    const res = await callAuthed(`${BACKEND_URL}/api/ids`);
    if (!res.ok) { logout(); return alert('Unauthorized token. Logged out.'); }

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tokyorewards-ids_${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="container-outer mt-8">
      <div className="card">
        <h2 className="section-title">Admin Panel</h2>

        {!hasAuth ? (
          <div className="flex items-center gap-2">
            <input
              className="btn flex-1"
              placeholder="Enter ADMIN_TOKEN"
              value={tokenLocal}
              onChange={e=>setTokenLocal(e.target.value)}
            />
            <button className="btn" onClick={saveToken}>Login</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm muted">Logged in</div>
              <button className="btn ghost" onClick={logout}>Logout</button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Countdown */}
              <div className="card">
                <div className="mb-2 font-semibold">Countdown</div>
                <label className="text-sm muted mb-1 block">End (local time)</label>
                <input
                  type="datetime-local"
                  className="btn w-full"
                  value={endLocal}
                  onChange={e=>setEndLocal(e.target.value)}
                />
                <div className="text-xs muted mt-2">Server value: {serverEnd || '— not set —'}</div>
                <div className="flex gap-2 mt-3">
                  <button className="btn" onClick={saveCountdown}>Save Changes</button>
                </div>
              </div>

              {/* Leaderboard / Hero */}
              <div className="card">
                <div className="mb-2 font-semibold">Leaderboard</div>

                <label className="text-sm muted mb-1 block">Headline</label>
                <input
                  className="btn w-full mb-2"
                  value={hHeadline}
                  onChange={e=>setHHeadline(e.target.value)}
                  placeholder="Headline"
                />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="text-sm muted mb-1 block">Headline Color</label>
                    <input
                      type="color"
                      className="w-full h-10 rounded-xl bg-white/5 border border-white/10"
                      value={hHeadlineColor}
                      onChange={e=>setHHeadlineColor(e.target.value)}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <div className="mt-2 rounded-2xl border border-white/10 p-3">
                      <div className="mb-2 font-semibold">Headline Glow</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-sm muted mb-1 block">Color</label>
                          <input
                            type="color"
                            className="w-full h-10 rounded-xl bg-white/5 border border-white/10"
                            value={hGlowColor}
                            onChange={e=>setHGlowColor(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm muted mb-1 block">Size (px): {hGlowSize}</label>
                          <input
                            type="range" min="0" max="40" step="1" className="w-full"
                            value={hGlowSize}
                            onChange={e=>setHGlowSize(Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="text-sm muted mb-1 block">Intensity: {hGlowAlpha}</label>
                          <input
                            type="range" min="0" max="1" step="0.05" className="w-full"
                            value={hGlowAlpha}
                            onChange={e=>setHGlowAlpha(Number(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="mt-3 grid place-items-center rounded-xl bg-white/5 p-4">
                        <div
                          className="text-xl font-bold"
                          style={{ color: hHeadlineColor, textShadow: `0 0 ${hGlowSize}px rgba(255,255,255,${hGlowAlpha})` }}
                        >
                          {hHeadline || 'Preview Headline'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sub 1 */}
                <label className="text-sm muted mt-3 mb-1 block">Sub text 1</label>
                <input
                  className="btn w-full mb-2"
                  value={hSub1}
                  onChange={e=>setHSub1(e.target.value)}
                  placeholder="Subtitle 1"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm muted mb-1 block">Sub text 1 Color</label>
                    <input
                      type="color"
                      className="w-full h-10 rounded-xl bg-white/5 border border-white/10"
                      value={hSub1Color}
                      onChange={e=>setHSub1Color(e.target.value)}
                    />
                  </div>
                </div>

                {/* Sub 2 */}
                <label className="text-sm muted mt-3 mb-1 block">Sub text 2</label>
                <input
                  className="btn w-full mb-2"
                  value={hSub2}
                  onChange={e=>setHSub2(e.target.value)}
                  placeholder="Subtitle 2"
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm muted mb-1 block">Sub text 2 Color</label>
                    <input
                      type="color"
                      className="w-full h-10 rounded-xl bg-white/5 border border-white/10"
                      value={hSub2Color}
                      onChange={e=>setHSub2Color(e.target.value)}
                    />
                  </div>
                </div>

                {/* Image + Glow */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                  <div>
                    <label className="text-sm muted mb-1 block">Image URL</label>
                    <input
                      className="btn w-full"
                      value={hImageUrl}
                      onChange={e=>setHImageUrl(e.target.value)}
                      placeholder="/uploads/hero.png or https://…"
                    />
                  </div>
                  <div>
                    <div className="rounded-2xl border border-white/10 p-3">
                      <div className="mb-2 font-semibold">Image Glow</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-sm muted mb-1 block">Color</label>
                          <input
                            type="color"
                            className="w-full h-10 rounded-xl bg-white/5 border border-white/10"
                            value={imgGlowColor}
                            onChange={e=>setImgGlowColor(e.target.value)}
                          />
                        </div>
                        <div>
                          <label className="text-sm muted mb-1 block">Size (px): {imgGlowSize}</label>
                          <input
                            type="range" min="0" max="40" step="1" className="w-full"
                            value={imgGlowSize}
                            onChange={e=>setImgGlowSize(Number(e.target.value))}
                          />
                        </div>
                        <div>
                          <label className="text-sm muted mb-1 block">Intensity: {imgGlowAlpha}</label>
                          <input
                            type="range" min="0" max="1" step="0.05" className="w-full"
                            value={imgGlowAlpha}
                            onChange={e=>setImgGlowAlpha(Number(e.target.value))}
                          />
                        </div>
                      </div>

                      <div className="mt-3 grid place-items-center rounded-xl bg-white/5 p-4">
                        <img
                          src={resolveAssetUrl(hImageUrl)}
                          alt="Preview"
                          className="w-16 h-16"
                          style={{ filter: `drop-shadow(0 0 ${imgGlowSize}px rgba(255,255,255,${imgGlowAlpha}))` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upload image */}
                <div className="mt-2">
                  <label className="text-sm muted mb-1 block">Upload Image</label>
                  <input
                    type="file"
                    accept="image/*"
                    className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-3 file:rounded-xl file:border file:border-white/10 file:bg-white/5 file:text-white hover:file:bg-white/10"
                    onChange={async e => {
                      const f = e.target.files?.[0]; if (!f) return;
                      const form = new FormData(); form.append('image', f);
                      const res = await callAuthed(`${BACKEND_URL}/api/hero/image`, {
                        method: 'POST',
                        body: form
                      });
                      if (!res.ok) return alert('Upload failed.');
                      const data = await res.json();
                      setHImageUrl(data.imageUrl || '');
                      alert('Image uploaded.');
                    }}
                  />
                </div>

                {/* Link controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                  <div>
                    <label className="text-sm muted mb-1 block">Link Text</label>
                    <input
                      className="btn w-full"
                      value={hLinkText}
                      onChange={e=>setHLinkText(e.target.value)}
                      placeholder="e.g. Learn more"
                    />
                  </div>
                  <div>
                    <label className="text-sm muted mb-1 block">Link URL</label>
                    <input
                      className="btn w-full"
                      value={hLinkUrl}
                      onChange={e=>setHLinkUrl(e.target.value)}
                      placeholder="https://…"
                    />
                  </div>
                </div>

                <button className="btn mt-3" onClick={saveHero}>Save Changes</button>
              </div>
            </div>

            {/* Prizes editor */}
            <div className="card mt-4">
              <div className="mb-2 font-semibold">Prizes (Top 10)</div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {prizesLocal.map((val, idx) => (
                  <label key={idx} className="flex items-center gap-2">
                    <span className="text-sm muted w-8">#{idx+1}</span>
                    <input
                      className="btn w-full"
                      type="number"
                      value={val}
                      onChange={e => {
                        const next = [...prizesLocal];
                        next[idx] = Math.max(0, Math.floor(Number(e.target.value) || 0));
                        setPrizesLocal(next);
                      }}
                    />
                  </label>
                ))}
              </div>
              <button className="btn mt-3" onClick={savePrizes}>Save Prizes</button>
            </div>
            {/* Contest Window */}
            <div className="card mt-4">
              <div className="mb-2 font-semibold">Contest Window (Public Leaderboard)</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm muted">Start (local)</span>
                  <input
                    type="datetime-local"
                    className="btn w-full mt-1"
                    value={winStart}
                    onChange={e=>setWinStart(e.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="text-sm muted">End (local)</span>
                  <input
                    type="datetime-local"
                    className="btn w-full mt-1"
                    value={winEnd}
                    onChange={e=>setWinEnd(e.target.value)}
                  />
                </label>
              </div>
              <div className="flex gap-2 mt-3">
                <button className="btn" onClick={saveContestWindow}>Save window</button>
                <button className="btn ghost" onClick={clearContestWindow}>Clear</button>
              </div>
              <p className="text-xs muted mt-2">
                When set, <code>/api/leaderboard</code> shows each player's <strong>gain</strong> between Start and End.
              </p>
            </div>
            {/* Export IDs */}
            <div className="card mt-4">
              <div className="mb-2 font-semibold">Export IDs</div>
              <p className="text-sm muted mb-2">
                Downloads a CSV with <code>id, uuid, steam64</code> from the affiliate API.
              </p>
              <button className="btn" onClick={exportIdsTxt}>Export IDs (TXT)</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

