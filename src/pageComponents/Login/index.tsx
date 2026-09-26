'use client';

import { useSearchParams } from 'next/navigation';
import RightSection from './components/RightSection';

export default function LoginPage() {
   const searchParams = useSearchParams();

   return (
      <main
         style={{
            minHeight: '100dvh',
            width: '100%',
            background: '#0d0715',
            color: 'white',
            display: 'flex',
            justifyContent: 'center',
            overflowX: 'hidden',
         }}
      >
         <RightSection
            initialReset={searchParams.get('reset') === 'true'}
            initialError={searchParams.get('error') ?? undefined}
         />
      </main>
   );
}
