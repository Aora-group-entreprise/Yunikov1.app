'use client';

import { useEffect } from 'react';

export default function GlobalError({
   error,
}: {
   error: Error & { digest?: string };
}) {
   useEffect(() => {
      console.error('[Yuniko global runtime error]', error);
   }, [error]);

   const message = error?.message || 'Unknown global runtime error';
   const digest = error?.digest || 'none';

   return (
      <html lang="fr">
         <body style={{ margin: 0, minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', background: '#f7fbff', color: '#102033', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
            <main style={{ width: 'min(760px, 100%)', padding: '32px', borderRadius: '24px', background: '#fff', border: '1px solid #dce5ef', boxShadow: '0 24px 70px rgba(30,70,120,.12)' }}>
               <div style={{ color: '#b42318', fontWeight: 800, fontSize: 12, letterSpacing: '.08em' }}>YUNIKO • GLOBAL RUNTIME ERROR</div>
               <h1 style={{ fontSize: 28, margin: '12px 0' }}>Erreur critique de l&apos;application</h1>
               <p style={{ color: '#53657a' }}>Le serveur ou le rendu global a échoué. Les détails disponibles sont affichés ci-dessous.</p>
               <pre style={{ padding: 16, borderRadius: 14, background: '#111827', color: '#f9fafb', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{message}</pre>
               <p style={{ color: '#53657a', fontSize: 13 }}>Digest: {digest}</p>
               <button type="button" onClick={() => window.location.reload()} style={{ border: 0, borderRadius: 12, padding: '11px 16px', background: '#1677ff', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Recharger</button>
            </main>
         </body>
      </html>
   );
}
