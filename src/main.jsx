import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { io } from 'socket.io-client'
import { BrowserRouter, Routes, Route, NavLink, useNavigate } from 'react-router-dom'
import './index.css'
import AdminGate from './routes/AdminGate.jsx';
import AdminLogin from './routes/AdminLogin.jsx';

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


function Countdown() {
  return (
    <div className="w-full text-center my-6">
      <div className="text-2xl md:text-3xl font-bold">Countdown ended</div>
    </div>
  );
}

export default Countdown;




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
  const HERO_KEY = 'hero_cache';
  const [hero, setHero] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HERO_KEY) || '{}'); }
    catch { return {}; }
  });

  // Merge patch safely: keep previous values if incoming is empty/falsy
  const applyHeroPatch = (patch = {}) => {
    setHero(prev => {
      const next = {
        imageUrl: patch.imageUrl || prev?.imageUrl || '/site-logo.png',
        headline: patch.headline ?? prev?.headline ?? 'Leaderboard',
        sub1: patch.sub1 ?? prev?.sub1 ?? 'Top players updated live',
        sub2: patch.sub2 ?? prev?.sub2 ?? '',
        linkText: patch.linkText ?? prev?.linkText ?? '',
        linkUrl: patch.linkUrl ?? prev?.linkUrl ?? '',
        imageGlow: patch.imageGlow ?? prev?.imageGlow ?? 'drop-shadow(0 0 16px rgba(255,255,255,0.65))',
        headlineColor: patch.headlineColor ?? prev?.headlineColor ?? '#ffffff',
        headlineGlow: patch.headlineGlow ?? prev?.headlineGlow ?? '0 0 12px rgba(255,255,255,0.8)',
        sub1Color: patch.sub1Color ?? prev?.sub1Color ?? '#cbd5e1',
        sub2Color: patch.sub2Color ?? prev?.sub2Color ?? '#cbd5e1',
      };
      localStorage.setItem(HERO_KEY, JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/hero`)
      .then(r => r.ok ? r.json() : {})
      .then(applyHeroPatch)
      .catch(() => {}); // keep cached on error
  }, []);

  useEffect(() => {
    const onUpdate = (data) => applyHeroPatch(data);
    socket.on('hero:update', onUpdate);
    return () => socket.off('hero:update', onUpdate);
  }, [socket]);

  return (
    <div className="flex flex-col items-center gap-2 mt-6 text-center">
      <img
        src={resolveAssetUrl(hero.imageUrl)}
        alt="Hero"
        className="w-20 h-20 mb-1"
        style={{ filter: hero.imageGlow }}
      />

      <h2
        className="text-2xl md:text-3xl font-extrabold"
        style={{ color: hero.headlineColor, textShadow: hero.headlineGlow }}
      >
        {hero.headline}
      </h2>

      {hero.sub1 ? <p className="text-sm" style={{ color: hero.sub1Color }}>{hero.sub1}</p> : null}
      {hero.sub2 ? <p className="text-xs italic" style={{ color: hero.sub2Color }}>{hero.sub2}</p> : null}

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
  );
}



function LeaderboardPage() {
  const socket = useSocket(BACKEND_URL);

  const [rewards, setRewards] = useState([175,100,70,50,35,25,15,10,10,10]);

  const CACHE_KEY = "leaderboard-cache";
  const [players, setPlayers] = useState(() => {
    try { return JSON.parse(localStorage.getItem(CACHE_KEY) || "[]"); }
    catch { return []; }
  });
  const [updatedAt, setUpdatedAt] = useState(null);
  const [loading, setLoading] = useState(players.length === 0);
  const [err, setErr] = useState("");

  const normalize = (arr) =>
    (Array.isArray(arr) ? arr : []).map((u, i) => ({
      id: String(u.id ?? u.uuid ?? u.user_id ?? u.userId ?? i),
      name: String(u.name ?? u.username ?? u.displayName ?? `Player ${i+1}`),
      avatar: u.avatar ?? u.steam_avatar ?? u.image ?? null,
      points: Number(u.points ?? u.wagered ?? u.wager ?? u.total ?? 0),
      lastSeen: u.lastSeen ?? null,
    })).sort((a,b) => b.points - a.points);

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
    let cancelled = false;

    async function fetchWithRetry(tries = 3, timeoutMs = 60000) {
      setLoading(true); setErr("");
      for (let i = 0; i < tries; i++) {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), timeoutMs);
        try {
          const [lbRes, cdRes, metaRes] = await Promise.all([
            fetch(`${BACKEND_URL}/api/leaderboard`, { signal: ctrl.signal }),
            fetch(`${BACKEND_URL}/api/countdown`,   { signal: ctrl.signal }).catch(() => null),
            fetch(`${BACKEND_URL}/api/leaderboard/meta`, { signal: ctrl.signal }).catch(() => null),
          ]);
          clearTimeout(t);

          if (!lbRes.ok) throw new Error(`HTTP ${lbRes.status}`);
          const raw = await lbRes.json();
          if (cdRes?.ok) { try { await cdRes.json(); } catch {} }
          if (metaRes?.ok) { try { const m = await metaRes.json(); if (m?.updatedAt) setUpdatedAt(m.updatedAt); } catch {} }

          const arr = normalize(raw);

          if (!cancelled && arr.length > 0) {
            setPlayers(arr);
            localStorage.setItem(CACHE_KEY, JSON.stringify(arr));
          }

          if (!cancelled) setLoading(false);
          return;
        } catch (e) {
          clearTimeout(t);
          if (i === tries - 1) {
            if (!cancelled) { setErr("Couldn’t load live data; showing cached."); setLoading(false); }
          } else {
            await new Promise(r => setTimeout(r, 800 * 2 ** i));
          }
        }
      }
    }

    fetchWithRetry();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const onLB = (data) => {
      if (!Array.isArray(data) || data.length === 0) return;
      const arr = normalize(data);
      if (arr.length === 0) return;
      setPlayers(arr);
      localStorage.setItem(CACHE_KEY, JSON.stringify(arr));
      setUpdatedAt(new Date().toISOString());
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

      {}
      {loading && players.length === 0 && (
        <div className="card mt-4 text-center">Waking server…</div>
      )}
      {err && (
        <div className="card mt-4 text-center text-yellow-300 text-sm">
          {err}
        </div>
      )}
      {updatedAt && (
        <div className="card mt-4 text-center text-xs opacity-70">
          Last updated: {new Date(updatedAt).toLocaleString()}
        </div>
      )}

      <div className="mt-6">
        <Podium players={podium} rewards={rewards} />
      </div>

      <LeaderboardRows players={rest} rewards={rewards} />
    </div>
  );
}
function App() {
  return (
    <div className="bg-ambient min-h-screen">
      <Header />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/leaderboard" element={<LeaderboardPage />} />
        <Route path="/admin-login-n8as" element={<AdminLogin />} />
        <Route path="/secret-admin-pa9f" element={<AdminGate />} />
      </Routes>
    </div>
  );
}


createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>
)
