'use server';
import 'server-only';

import { yunikoApiFetch } from '@/src/lib/yuniko/api';

export async function sendPasswordResetEmail(params: { email: string }) {
   const username = params.email.trim();
   if (!username) throw new Error('Username is required');

   const response = await yunikoApiFetch('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ username, newPassword: '' }),
   });

   if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data?.error ?? 'Password reset failed');
   }
}
