import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { io } from 'socket.io-client'
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import './index.css'


const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL?.replace(/\/$/, '') || 'http://localhost:8080')

function resolveAssetUrl(url) {
  if (!url) return '/site-logo.png'
  if (/^https?:\/\//i.test(url)) return url
  if (url.startsWith('/')) return `${BACKEND_URL}${url}`
  return url
}

const ADMIN_TOKEN_KEY = 'admin_token'
function getAdminToken() { return localStorage.getItem(ADMIN_TOKEN_KEY) || '' }
function setAdminToken(token) { token ? localStorage.setItem(ADMIN_TOKEN_KEY, token) : localStorage.removeItem(ADMIN_TOKEN_KEY) }

function useSocket(url) {
  const socket = useMemo(() => io(url, { transports: ['websocket'], autoConnect: true }), [url])
  useEffect(() => () => socket?.disconnect(), [socket])
  return socket
}

function toNum(x){ if(x==null) return 0; if(typeof x==='string') x=x.replace(',', '.'); const n=Number(x); return Number.isFinite(n)?n:0 }
function formatUSD2(n){ return `${toNum(n).toFixed(2)}$` }
function formatPrize(n){ return `${Math.floor(toNum(n))}$` }

async function fetchPrizes() {
  const r = await fetch(`${BACKEND_URL}/api/prizes`)
  if (!r.ok) return [175,100,70,50,35,25,15,10,10,10]
  const j = await r.json()
  return Array.isArray(j?.prizes) ? j.prizes : [175,100,70,50,35,25,15,10,10,10]
}


function Header() {
  return (
    <div className="container-outer mt-6">
      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="TokyoRewards" className="logo-glow" />
          <div className="site-title">TokyoRewards</div>
        </div>
        <nav className="navbar">
          <NavLink to="/" end className={({isActive})=>`nav-btn ${isActive?'active':''}`}>Home</NavLink>
          <NavLink to="/leaderboard" className={({isActive})=>`nav-btn ${isActive?'active':''}`}>Leaderboards</NavLink>
          <NavLink to="/admin" className={({isActive})=>`nav-btn ${isActive?'active':''}`}>Admin</NavLink>
        </nav>
      </div>
    </div>
  )
}

// ---------- Home ----------
function Home() {
  const navigate = useNavigate()
  const introText = "Welcome to TokyoRewards!"

  const LINKS = [
    { title: 'Twitter',  href: 'https://x.com/oyk0T',                  icon: 'https://cdn.simpleicons.org/x/ffffff' },
    { title: 'Discord',  href: 'https://discord.gg/WvX3dn6Y',          icon: 'https://cdn.simpleicons.org/discord/ffffff' },
    { title: 'Kick',     href: 'https://kick.com/t0kyoo',              icon: 'https://cdn.simpleicons.org/kick/ffffff' },
    { title: 'YouTube',  href: 'https://www.youtube.com/@T0kyoSlotss', icon: 'https://cdn.simpleicons.org/youtube/ffffff' },
  ]

  return (
    <div className="container-outer mt-8 text-center">
      <h2 className="text-3xl font-bold text-white mb-8 drop-shadow-[0_0_10px_rgba(255,255,255,0.6)]">
        {introText}
      </h2>

      <div className="flex justify-center mb-8">
        <img
          src="/logo.png"
          alt="TokyoRewards Logo"
          className="w-[40rem] sm:w-[50rem] md:w-[60rem] logo-hover-glow cursor-pointer"
          onClick={() => navigate('/leaderboard')}
        />
      </div>

      <div className="flex justify-center gap-6 mt-8">
        {LINKS.map((l, i) => (
          <a
            key={i}
            href={l.href}
            target="_blank"
            rel="noreferrer"
            className="card hover:bg-white/10 transition-all rounded-2xl p-4 w-32 h-32 flex flex-col items-center justify-center"
          >
            {l.icon && (
              <img
                src={l.icon}
                alt={l.title}
                className="w-10 h-10 mb-2 drop-shadow-[0_0_10px_rgba(255,255,255,0.8)]"
              />
            )}
            <div className="text-sm font-medium">{l.title}</div>
          </a>
        ))}
      </div>
    </div>
  )
}

// ---------- Announcement ----------
function Announcement({ socket }) {
  const [text, setText] = useState('')
  useEffect(()=>{ fetch(`${BACKEND_URL}/api/announcement`).then(r=>r.json()).then(d=>setText(d.announcement||'')).catch(()=>{}) },[])
  useEffect(()=>{ const onUpdate=(d)=>setText(d?.announcement??''); socket.on('announcement:update', onUpdate); return ()=> socket.off('announcement:update', onUpdate) },[socket])
  return <div className="announcement-text">{text}</div>
}

// ---------- Countdown ----------
function Countdown({ socket }) {
  const [end, setEnd] = useState(null)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/countdown`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setEnd(d?.end ? Date.parse(d.end) : null))
      .catch(() => setEnd(null))
  }, [])

  useEffect(() => {
    if (!socket) return
    const onUpdate = (p) => setEnd(p?.end ? Date.parse(p.end) : null)
    socket.on('countdown:update', onUpdate)
    return () => socket.off('countdown:update', onUpdate)
  }, [socket])

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250)
    return () => clearInterval(id)
  }, [])

  if (end == null || end - now <= 0) {
    return (
      <div className="w-full text-center my-6">
        <div className="text-2xl md:text-3xl font-bold">Leaderboard ended</div>
      </div>
    )
  }

  const diff = end - now
  const d = String(Math.floor(diff / 86400000)).padStart(2, '0')
  const h = String(Math.floor(diff / 3600000) % 24).padStart(2, '0')
  const m = String(Math.floor(diff / 60000) % 60).padStart(2, '0')
  const s = String(Math.floor(diff / 1000) % 60).padStart(2, '0')

  return (
    <div className="w-full text-center my-6">
      <div className="countdown">{d}d : {h}h : {m}m : {s}s</div>
    </div>
  )
}

// ---------- Avatar ----------
function Avatar({ player, size=40 }) {
  const url = player?.avatar
  const initials = (player?.name || '?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase()
  return url ? (
    <img src={url} width={size} height={size} className="rounded-full object-cover border border-slate-600" />
  ) : (
    <div style={{width:size, height:size}} className="rounded-full bg-slate-700 grid place-items-center text-sm font-bold text-slate-200 border border-slate-600">{initials}</div>
  )
}

// ---------- Podium & Rows ----------
function Podium({ players, rewards = [] }) {
  const [first, second, third] = players
  return (
    <div className="card">
      <h2 className="section-title">Top 3</h2>
      <div className="podium-wrap">
        <PodiumBlock place={2} player={second} height="h-36" variant="second" rewards={rewards} />
        <PodiumBlock place={1} player={first}  height="h-48" variant="first"  rewards={rewards} />
        <PodiumBlock place={3} player={third}  height="h-28" variant="third"  rewards={rewards} />
      </div>
    </div>
  )
}

function PodiumBlock({ place, player, height, variant, rewards = [] }) {
  const classes =
    variant === 'first'
      ? 'bg-blue-500 neon-border'
      : variant === 'second'
      ? 'bg-blue-600 neon-border'
      : 'bg-blue-700 neon-border'

  const reward = rewards[place - 1] 

  return (
    <div className="podium-col">
      <Avatar player={player} size={72} />
      <div className="mt-2 font-semibold text-center line-clamp-1">{player?.name ?? '—'}</div>
      <div className="text-sm muted">{formatUSD2(player?.points)}</div>
      <div className="text-xs text-blue-300 mt-1">
        {Number.isFinite(reward) ? `Prize: ${formatPrize(reward)}` : ''}
      </div>
      <div className={`podium-block ${height} ${classes}`}>
        <div className="podium-no">#{place}</div>
      </div>
    </div>
  )
}

function LeaderboardRows({ players, rewards = [] }) {
  return (
    <div className="card mt-6">
      <h2 className="section-title"></h2>
      <div className="rows">
        {players.map((p, i) => {
          const prize = rewards[i + 3] ?? null 
          return (
            <div key={p.id ?? i} className="row">
              <div className="row-rank">#{i + 4}</div>
              <div className="flex items-center gap-3">
                <Avatar player={p} />
                <div>
                  <div className="row-name">{p.name}</div>
                  {Number.isFinite(prize) ? (
                    <div className="text-xs text-blue-300 mt-0.5">Prize: {formatPrize(prize)}</div>
                  ) : null}
                </div>
              </div>
              <div className="row-points">{formatUSD2(p.points)}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}


function Hero({ socket }) {
  const [hero, setHero] = useState({})

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/hero`).then(r => r.json()).then(setHero).catch(()=>{})
  }, [])

  useEffect(() => {
    const onUpdate = (data) => setHero(data || {})
    socket.on('hero:update', onUpdate)
    return () => socket.off('hero:update', onUpdate)
  }, [socket])

  return (
    <div className="flex flex-col items-center gap-2 mt-6 text-center">
      <img
        src={resolveAssetUrl(hero.imageUrl)}
        alt="Hero"
        className="w-20 h-20 mb-1"
        style={{
          filter: hero.imageGlow || 'drop-shadow(0 0 16px rgba(255,255,255,0.65))'
        }}
      />

      <h2
        className="text-2xl md:text-3xl font-extrabold"
        style={{
          color: hero.headlineColor || '#ffffff',
          textShadow: hero.headlineGlow || '0 0 12px rgba(255,255,255,0.8)'
        }}
      >
        {hero.headline || ''}
      </h2>

      {hero.sub1 ? (
        <p className="text-sm" style={{ color: hero.sub1Color || '#cbd5e1' }}>
          {hero.sub1}
        </p>
      ) : null}

      {hero.sub2 ? (
        <p className="text-xs italic" style={{ color: hero.sub2Color || '#cbd5e1' }}>
          {hero.sub2}
        </p>
      ) : null}

      {hero.linkText ? (
        <a
          href={hero.linkUrl || '#'}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white visited:text-white no-underline hover:bg-white/10 hover:shadow-[0_0_8px_rgba(0,157,255,0.6)] transition-all"
        >
          {hero.linkText}
        </a>
      ) : null}
    </div>
  )
}


function LeaderboardPage() {
  const socket = useSocket(BACKEND_URL);
  const [players, setPlayers] = useState([]);
  const [rewards, setRewards] = useState([175,100,70,50,35,25,15,10,10,10]);


  const normalize = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map((u, i) => ({
      id: String(u.id ?? u.uuid ?? u.user_id ?? u.userId ?? i),
      name: String(u.name ?? u.username ?? u.displayName ?? `Player ${i+1}`),
      avatar: u.avatar ?? u.steam_avatar ?? u.image ?? null,
      points: Number(u.points ?? u.wagered ?? u.wager ?? u.total ?? 0),
    }));
  };

  useEffect(() => { fetchPrizes().then(setRewards).catch(()=>{}); }, []);

  useEffect(() => {
    const onPrizes = (arr) => {
      if (Array.isArray(arr) && arr.length === 10) {
        setRewards(arr.map(n => Math.floor(Number(n) || 0)));
      }
    };
    socket.on('prizes:update', onPrizes);
    return () => socket.off('prizes:update', onPrizes);
  }, [socket]);

  useEffect(() => {
    async function bootstrap() {
      try {
        const [lbRes, cdRes] = await Promise.all([
          fetch(`${BACKEND_URL}/api/leaderboard`),
          fetch(`${BACKEND_URL}/api/countdown`),
        ]);
        const raw = lbRes.ok ? await lbRes.json() : [];
        await cdRes.json().catch(()=>null);
        setPlayers(normalize(raw));
      } catch {
        setPlayers([]);
      }
    }
    bootstrap();
  }, []);

  useEffect(() => {
    const onLB = (data) => {
      if (Array.isArray(data)) setPlayers(normalize(data));
    };
    socket.on('leaderboard:update', onLB);
    return () => socket.off('leaderboard:update', onLB);
  }, [socket]);

  const padded = useMemo(() => {
    const out = players.slice(0, 10);
    while (out.length < 10) {
      out.push({ id: `placeholder-${out.length+1}`, name: '—', avatar: null, points: 0 });
    }
    return out;
  }, [players]);

  const podium = padded.slice(0, 3);
  const rest   = padded.slice(3);

  return (
    <div className="container-outer mt-6">
      <div className="card text-center py-6">
        <Hero socket={socket} />
      </div>

      <div className="card text-center mt-6">
        <Countdown socket={socket} />
      </div>

      <div className="mt-6">
        <Podium players={podium} rewards={rewards} />
      </div>

      <LeaderboardRows players={rest} rewards={rewards} />
    </div>
  );
}

function AdminPage() {
  const [token, setTokenState] = useState(getAdminToken())
  const [hasAuth, setHasAuth] = useState(!!getAdminToken())

  const [prizesLocal, setPrizesLocal] = useState([175,100,70,50,35,25,15,10,10,10])
  const [endLocal, setEndLocal] = useState('')
  const [serverEnd, setServerEnd] = useState('')

  const [hHeadline, setHHeadline] = useState('')
  const [hSub1, setHSub1] = useState('')
  const [hSub2, setHSub2] = useState('')
  const [hLinkText, setHLinkText] = useState('')
  const [hLinkUrl, setHLinkUrl] = useState('')
  const [hHeadlineColor, setHHeadlineColor] = useState('#ffffff')
  const [hSub1Color, setHSub1Color] = useState('#cbd5e1')
  const [hSub2Color, setHSub2Color] = useState('#cbd5e1')
  const [hGlowColor, setHGlowColor] = useState('#ffffff')
  const [hGlowSize, setHGlowSize]   = useState(12)
  const [hGlowAlpha, setHGlowAlpha] = useState(0.8)
  const [hImageUrl, setHImageUrl] = useState('/site-logo.png')
  const [imgGlowColor, setImgGlowColor] = useState('#ffffff')
  const [imgGlowSize, setImgGlowSize]   = useState(16)
  const [imgGlowAlpha, setImgGlowAlpha] = useState(0.65)

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/countdown`).then(r => r.json()).then(d => {
      const iso = d.end || ''
      setServerEnd(iso)
      if (iso) {
        const dt = new Date(iso)
        const tz = dt.getTimezoneOffset() * 60000
        const local = new Date(dt.getTime() - tz).toISOString().slice(0, 16)
        setEndLocal(local)
      } else {
        setEndLocal('')
      }
    }).catch(()=>{})

    fetch(`${BACKEND_URL}/api/hero`).then(r => r.json()).then(h => {
      setHHeadline(h.headline || '')
      setHSub1(h.sub1 || '')
      setHSub2(h.sub2 || '')
      setHLinkText(h.linkText || '')
      setHLinkUrl(h.linkUrl || '')
      setHHeadlineColor(h.headlineColor || '#ffffff')
      setHSub1Color(h.sub1Color || '#cbd5e1')
      setHSub2Color(h.sub2Color || '#cbd5e1')
      setHImageUrl(h.imageUrl || '/site-logo.png')
      setHGlowColor('#ffffff'); setHGlowSize(12); setHGlowAlpha(0.8)
      setImgGlowColor('#ffffff'); setImgGlowSize(16); setImgGlowAlpha(0.65)
    }).catch(()=>{})

    fetchPrizes().then(ps => setPrizesLocal(ps.map(n=>Math.floor(Number(n)||0)))).catch(()=>{})
  }, [])

  function saveToken() {
    if (!token) return
    setAdminToken(token); setHasAuth(true)
  }
  function logout() {
    setAdminToken(''); setTokenState(''); setHasAuth(false)
  }
  const authHeader = () => ({ 'x-admin-token': getAdminToken() })

  function hexToRgba(hex, alpha = 1) {
    let h = hex.replace('#', '')
    if (h.length === 3) h = h.split('').map(c => c + c).join('')
    const n = parseInt(h, 16)
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255
    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  async function saveCountdown() {
    if (!endLocal) return alert('Pick a date/time.')
    const iso = new Date(endLocal).toISOString()
    const res = await fetch(`${BACKEND_URL}/api/countdown`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeader() },
      body: JSON.stringify({ end: iso })
    })
    if (res.status === 401) return (logout(), alert('Unauthorized token. Logged out.'))
    if (!res.ok) return alert('Failed (check date format)')
    const data = await res.json()
    setServerEnd(data.end || '')
    alert('Countdown saved')
  }

  async function saveHero() {
    const headlineGlowCss = `0 0 ${hGlowSize}px ${hexToRgba(hGlowColor, hGlowAlpha)}`
    const imageGlowCss    = `drop-shadow(0 0 ${imgGlowSize}px ${hexToRgba(imgGlowColor, imgGlowAlpha)})`
    const res = await fetch(`${BACKEND_URL}/api/hero`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeader() },
      body: JSON.stringify({
        headline: hHeadline, sub1: hSub1, sub2: hSub2,
        linkText: hLinkText, linkUrl: hLinkUrl,
        headlineColor: hHeadlineColor, sub1Color: hSub1Color, sub2Color: hSub2Color,
        imageUrl: hImageUrl,
        headlineGlow: headlineGlowCss, imageGlow: imageGlowCss
      })
    })
    if (res.status === 401) return (logout(), alert('Unauthorized token. Logged out.'))
    if (!res.ok) return alert('Failed (check ADMIN_TOKEN)')
    alert('Changes saved')
  }

  async function savePrizes() {
    const res = await fetch(`${BACKEND_URL}/api/prizes`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...authHeader() },
      body: JSON.stringify({ prizes: prizesLocal })
    })
    if (res.status === 401) return (logout(), alert('Unauthorized token. Logged out.'))
    if (!res.ok) return alert('Failed to save prizes')
    alert('Prizes saved')
  }

  async function exportIdsTxt() {
  const res = await fetch(`${BACKEND_URL}/api/ids`, {
    headers: { 'x-admin-token': getAdminToken() }
  });
  if (res.status === 401) { logout(); return alert('Unauthorized token. Logged out.'); }
  if (!res.ok) return alert('Failed to export IDs');

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
            <input className="btn flex-1" placeholder="Enter ADMIN_TOKEN" value={token} onChange={e=>setTokenState(e.target.value)} />
            <button className="btn" onClick={saveToken}>Login</button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm muted">Logged in</div>
              <button className="btn ghost" onClick={logout}>Logout</button>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {}
              <div className="card">
                <div className="mb-2 font-semibold">Countdown</div>
                <label className="text-sm muted mb-1 block">End (local time)</label>
                <input type="datetime-local" className="btn w-full" value={endLocal} onChange={e=>setEndLocal(e.target.value)} />
                <div className="text-xs muted mt-2">Server value: {serverEnd || '— not set —'}</div>
                <div className="flex gap-2 mt-3">
                  <button className="btn" onClick={saveCountdown}>Save Changes</button>
                </div>
              </div>

              {}
              <div className="card">
                <div className="mb-2 font-semibold">Leaderboard</div>

                <label className="text-sm muted mb-1 block">Headline</label>
                <input className="btn w-full mb-2" value={hHeadline} onChange={e=>setHHeadline(e.target.value)} placeholder="Headline" />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <div>
                    <label className="text-sm muted mb-1 block">Headline Color</label>
                    <input type="color" className="w-full h-10 rounded-xl bg-white/5 border border-white/10" value={hHeadlineColor} onChange={e=>setHHeadlineColor(e.target.value)} />
                  </div>
                  <div className="md:col-span-2">
                    <div className="mt-2 rounded-2xl border border-white/10 p-3">
                      <div className="mb-2 font-semibold">Headline Glow</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-sm muted mb-1 block">Color</label>
                          <input type="color" className="w-full h-10 rounded-xl bg-white/5 border border-white/10" value={hGlowColor} onChange={e=>setHGlowColor(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-sm muted mb-1 block">Size (px): {hGlowSize}</label>
                          <input type="range" min="0" max="40" step="1" className="w-full" value={hGlowSize} onChange={e=>setHGlowSize(Number(e.target.value))} />
                        </div>
                        <div>
                          <label className="text-sm muted mb-1 block">Intensity: {hGlowAlpha}</label>
                          <input type="range" min="0" max="1" step="0.05" className="w-full" value={hGlowAlpha} onChange={e=>setHGlowAlpha(Number(e.target.value))} />
                        </div>
                      </div>

                      <div className="mt-3 grid place-items-center rounded-xl bg-white/5 p-4">
                        <div className="text-xl font-bold" style={{ color: hHeadlineColor, textShadow: `0 0 ${hGlowSize}px rgba(255,255,255,${hGlowAlpha})` }}>
                          {hHeadline || 'Preview Headline'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {}
                <label className="text-sm muted mt-3 mb-1 block">Sub text 1</label>
                <input className="btn w-full mb-2" value={hSub1} onChange={e=>setHSub1(e.target.value)} placeholder="Subtitle 1" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm muted mb-1 block">Sub text 1 Color</label>
                    <input type="color" className="w-full h-10 rounded-xl bg-white/5 border border-white/10" value={hSub1Color} onChange={e=>setHSub1Color(e.target.value)} />
                  </div>
                </div>

                {}
                <label className="text-sm muted mt-3 mb-1 block">Sub text 2</label>
                <input className="btn w-full mb-2" value={hSub2} onChange={e=>setHSub2(e.target.value)} placeholder="Subtitle 2" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <label className="text-sm muted mb-1 block">Sub text 2 Color</label>
                    <input type="color" className="w-full h-10 rounded-xl bg-white/5 border border-white/10" value={hSub2Color} onChange={e=>setHSub2Color(e.target.value)} />
                  </div>
                </div>

                {}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                  <div>
                    <label className="text-sm muted mb-1 block">Image URL</label>
                    <input className="btn w-full" value={hImageUrl} onChange={e=>setHImageUrl(e.target.value)} placeholder="/uploads/hero.png or https://…" />
                  </div>

                  <div>
                    <div className="rounded-2xl border border-white/10 p-3">
                      <div className="mb-2 font-semibold">Image Glow</div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                          <label className="text-sm muted mb-1 block">Color</label>
                          <input type="color" className="w-full h-10 rounded-xl bg-white/5 border border-white/10" value={imgGlowColor} onChange={e=>setImgGlowColor(e.target.value)} />
                        </div>
                        <div>
                          <label className="text-sm muted mb-1 block">Size (px): {imgGlowSize}</label>
                          <input type="range" min="0" max="40" step="1" className="w-full" value={imgGlowSize} onChange={e=>setImgGlowSize(Number(e.target.value))} />
                        </div>
                        <div>
                          <label className="text-sm muted mb-1 block">Intensity: {imgGlowAlpha}</label>
                          <input type="range" min="0" max="1" step="0.05" className="w-full" value={imgGlowAlpha} onChange={e=>setImgGlowAlpha(Number(e.target.value))} />
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
                    type="file" accept="image/*"
                    className="block w-full text-sm text-slate-300 file:mr-4 file:py-2 file:px-3 file:rounded-xl file:border file:border-white/10 file:bg-white/5 file:text-white hover:file:bg-white/10"
                    onChange={async e => {
                      const f = e.target.files?.[0]; if (!f) return;
                      const form = new FormData(); form.append('image', f);
                      const res = await fetch(`${BACKEND_URL}/api/hero/image`, { method: 'POST', headers: authHeader(), body: form })
                      if (!res.ok) return alert('Upload failed.')
                      const data = await res.json()
                      setHImageUrl(data.imageUrl || '')
                      alert('Image uploaded.')
                    }}
                  />
                </div>

                {/* Link controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-3">
                  <div>
                    <label className="text-sm muted mb-1 block">Link Text</label>
                    <input className="btn w-full" value={hLinkText} onChange={e=>setHLinkText(e.target.value)} placeholder="e.g. Learn more" />
                  </div>
                  <div>
                    <label className="text-sm muted mb-1 block">Link URL</label>
                    <input className="btn w-full" value={hLinkUrl} onChange={e=>setHLinkUrl(e.target.value)} placeholder="https://…" />
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
                      className="btn w-full" type="number" value={val}
                      onChange={e => {
                        const next = [...prizesLocal]
                        next[idx] = Math.max(0, Math.floor(Number(e.target.value) || 0))
                        setPrizesLocal(next)
                      }}
                    />
                  </label>
                ))}
              </div>
              <button className="btn mt-3" onClick={savePrizes}>Save Prizes</button>
            </div>

            {/* Export IDs */}
            <div className="card mt-4">
              <div className="mb-2 font-semibold">Export IDs</div>
              <p className="text-sm muted mb-2">Downloads a CSV with <code>id, uuid, steam64</code> from the affiliate API.</p>
              <button className="btn" onClick={exportIdsTxt}>Export IDs (TXT)</button>

            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ---------- App ----------
function App() {
  return (
    <div className="bg-ambient min-h-screen">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/admin" element={<AdminPage />} />
      </Routes>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
