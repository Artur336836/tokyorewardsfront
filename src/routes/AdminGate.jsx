import { useEffect, useState, Suspense, lazy } from 'react';

export default function AdminGate() {
  const [ok, setOk] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token') || '';
    if (!token) return setOk(false);

    fetch(`${import.meta.env.VITE_BACKEND_URL}/api/admin/ping`, {
      headers: { 'x-admin-token': token }
    })
      .then(r => setOk(r.ok))
      .catch(() => setOk(false));
  }, []);

  if (ok === null) return null;      // render nothing while checking
  if (!ok) return <NotFoundPage />;  // or redirect home

  return <LazyAdmin />;              // only load when verified
}

function NotFoundPage() {
  return <div style={{display:'none'}} />; // or your real 404
}

// lazy import AFTER validation -> people can’t view source/styles easily
const LazyAdmin = (function(){
  const Comp = () => {
    const Admin = lazy(() => import('../admin/AdminPanel.jsx'));
    return <Suspense fallback={null}><Admin /></Suspense>;
  };
  return Comp;
})();
