'use client';

import { useEffect, useMemo } from 'react';

type AppError = Error & { digest?: string };

export default function Error({
   error,
   reset,
}: {
   error: AppError;
   reset: () => void;
}) {
   const details = useMemo(() => ({
      message: error?.message || 'Unknown error',
      digest: error?.digest || 'none',
      path: typeof window !== 'undefined' ? window.location.pathname + window.location.search : 'unknown',
      time: new Date().toISOString(),
   }), [error]);

   useEffect(() => {
      console.error('[Yuniko runtime error]', error);
   }, [error]);

   const copyDetails = async () => {
      const text = [
         'Yuniko runtime error',
         `Message: ${details.message}`,
         `Digest: ${details.digest}`,
         `Path: ${details.path}`,
         `Time: ${details.time}`,
      ].join('\\n');
      try {
         await navigator.clipboard.writeText(text);
      } catch {}
   };

   return (
      <main style={styles.page}>
         <section style={styles.card}>
            <div style={styles.badge}>YUNIKO • RUNTIME ERROR</div>
            <h1 style={styles.title}>Une erreur réelle s&apos;est produite</h1>
            <p style={styles.subtitle}>
               L&apos;application a rencontré un problème pendant le chargement. Voici les informations disponibles pour identifier la cause.
            </p>
            <div style={styles.errorBox}>
               <div style={styles.label}>Erreur</div>
               <pre style={styles.message}>{details.message}</pre>
            </div>
            <div style={styles.grid}>
               <div style={styles.info}><span>Digest</span><code>{details.digest}</code></div>
               <div style={styles.info}><span>Route</span><code>{details.path}</code></div>
               <div style={styles.info}><span>Heure</span><code>{details.time}</code></div>
            </div>
            <div style={styles.actions}>
               <button type="button" onClick={() => reset()} style={styles.primary}>Réessayer</button>
               <button type="button" onClick={() => window.location.reload()} style={styles.secondary}>Recharger</button>
               <button type="button" onClick={copyDetails} style={styles.secondary}>Copier les détails</button>
            </div>
         </section>
      </main>
   );
}

const styles = {
   page: { minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', background: 'linear-gradient(135deg, #f7fbff 0%, #eef7ff 45%, #f8f2ff 100%)', fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', color: '#102033' },
   card: { width: 'min(760px, 100%)', padding: '32px', borderRadius: '24px', background: 'rgba(255,255,255,.92)', border: '1px solid rgba(80,110,150,.18)', boxShadow: '0 24px 70px rgba(30,70,120,.14)' },
   badge: { display: 'inline-block', marginBottom: '14px', padding: '7px 10px', borderRadius: '999px', background: '#fff0f0', color: '#b42318', fontSize: '12px', fontWeight: 800, letterSpacing: '.08em' },
   title: { margin: '0 0 10px', fontSize: '28px', lineHeight: 1.2 },
   subtitle: { margin: '0 0 22px', color: '#53657a', lineHeight: 1.6 },
   errorBox: { padding: '16px', borderRadius: '16px', background: '#111827', color: '#f9fafb', overflow: 'auto' },
   label: { marginBottom: '8px', fontSize: '12px', fontWeight: 700, color: '#aebbd0', textTransform: 'uppercase' as const },
   message: { margin: 0, whiteSpace: 'pre-wrap' as const, overflowWrap: 'anywhere' as const, fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: '13px', lineHeight: 1.6 },
   grid: { display: 'grid', gap: '10px', marginTop: '14px' },
   info: { display: 'grid', gap: '4px', padding: '11px 13px', borderRadius: '12px', background: '#f5f8fc' },
   actions: { display: 'flex', flexWrap: 'wrap' as const, gap: '10px', marginTop: '20px' },
   primary: { border: 0, borderRadius: '12px', padding: '11px 16px', background: '#1677ff', color: '#fff', fontWeight: 700, cursor: 'pointer' },
   secondary: { border: '1px solid #d5dfeb', borderRadius: '12px', padding: '11px 16px', background: '#fff', color: '#24364b', fontWeight: 650, cursor: 'pointer' },
};
