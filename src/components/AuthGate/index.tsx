'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useYunikoAuth } from '@/src/lib/yuniko/auth-context';

export default function AuthGate({ children }: { children: React.ReactNode }) {
   const { user, isLoading } = useYunikoAuth();
   const router = useRouter();
   const pathname = usePathname();

   useEffect(() => {
      if (!isLoading && !user) {
         const next = pathname && pathname !== '/' ? `?next=${encodeURIComponent(pathname)}` : '';
         router.replace(`/login${next}`);
      }
   }, [isLoading, user, pathname, router]);

   if (isLoading || !user) {
      return (
         <main
            aria-busy="true"
            style={{
               minHeight: '100dvh',
               width: '100%',
               display: 'grid',
               placeItems: 'center',
               background: '#0d0715',
            }}
         >
            <div
               style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  border: '3px solid rgba(255,255,255,.15)',
                  borderTopColor: '#FF006E',
                  animation: 'yuniko-auth-spin 1s linear infinite',
               }}
            />
         </main>
      );
   }

   return <>{children}</>;
}
