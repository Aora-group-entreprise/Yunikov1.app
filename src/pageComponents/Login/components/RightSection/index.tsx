'use client';

import * as stylex from '@stylexjs/stylex';
import { useState } from 'react';
import { MdArrowBack, MdArrowForward, MdCalendarToday, MdCameraAlt, MdCheckCircle, MdLock, MdPerson, MdVisibility, MdVisibilityOff, MdPublic, MdClose } from 'react-icons/md';
import { useYunikoAuth } from '@/src/lib/yuniko/auth-context';
import { yunikoApiFetch, type YunikoAuthUser } from '@/src/lib/yuniko/api';
import { styles } from './index.stylex';

type Mode = 'signin' | 'signup' | 'forgot';

interface SignupData {
   username: string;
   password: string;
   confirmPassword: string;
   displayName: string;
   country: string;
   countryFlag: string;
   age: string;
   avatarUrl: string | null;
}

const GRADIENT = 'linear-gradient(135deg, #FF006E 0%, #8B00FF 100%)';

function Field({
   icon,
   value,
   onChange,
   placeholder,
   type = 'text',
   suffix,
}: {
   icon: React.ReactNode;
   value: string;
   onChange: (value: string) => void;
   placeholder: string;
   type?: string;
   suffix?: React.ReactNode;
}) {
   return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
         {icon}
         <input
            value={value}
            onChange={event => onChange(event.target.value)}
            placeholder={placeholder}
            type={type}
            autoCapitalize="none"
            autoCorrect="off"
            style={{ flex: 1, minWidth: 0, background: 'transparent', border: 0, outline: 0, color: 'rgba(255,255,255,.92)', fontSize: 14 }}
         />
         {suffix}
      </div>
   );
}

export default function RightSection({ initialReset, initialError }: { initialReset?: boolean; initialError?: string }) {
   const { login } = useYunikoAuth();
   const [mode, setMode] = useState<Mode>(initialReset || initialError ? 'forgot' : 'signin');
   const [step, setStep] = useState(1);
   const [loading, setLoading] = useState(false);
   const [error, setError] = useState(initialError ?? '');
   const [username, setUsername] = useState('');
   const [password, setPassword] = useState('');
   const [showPassword, setShowPassword] = useState(false);
   const [signup, setSignup] = useState<SignupData>({ username: '', password: '', confirmPassword: '', displayName: '', country: '', countryFlag: '', age: '', avatarUrl: null });
   const [forgotUsername, setForgotUsername] = useState('');
   const [newPassword, setNewPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
   const [resetDone, setResetDone] = useState(false);

   const clearError = () => setError('');

   async function submitLogin() {
      if (!username.trim() || !password) return setError('Username and password are required');
      setLoading(true); clearError();
      try {
         const response = await yunikoApiFetch('/auth/login', { method: 'POST', body: JSON.stringify({ username: username.trim(), password }) });
         const data = await response.json().catch(() => ({}));
         if (!response.ok) return setError(data.error ?? 'Login failed');
         login(data.user as YunikoAuthUser);
         window.location.href = '/';
      } catch { setError('Network error. Please try again.'); }
      finally { setLoading(false); }
   }

   async function submitRegister() {
      if (!signup.username.trim() || signup.username.trim().length < 3) return setError('Username must be at least 3 characters');
      if (signup.password.length < 6) return setError('Password must be at least 6 characters');
      if (signup.password !== signup.confirmPassword) return setError("Passwords don't match");
      if (!signup.displayName.trim()) return setError('Display name is required');
      if (!signup.country.trim()) return setError('Country is required');
      const age = Number(signup.age);
      if (!Number.isInteger(age) || age < 13 || age > 120) return setError('Please enter a valid age (13+)');

      setLoading(true); clearError();
      try {
         const response = await yunikoApiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
               username: signup.username.trim().toLowerCase(),
               displayName: signup.displayName.trim(),
               password: signup.password,
               country: signup.country.trim(),
               countryFlag: signup.countryFlag,
               age,
               avatarUrl: signup.avatarUrl,
            }),
         });
         const data = await response.json().catch(() => ({}));
         if (!response.ok) return setError(data.error ?? 'Registration failed');
         login(data.user as YunikoAuthUser);
         setStep(4);
      } catch { setError('Network error. Please try again.'); }
      finally { setLoading(false); }
   }

   async function resetPassword() {
      if (!forgotUsername.trim()) return setError('Username is required');
      if (newPassword.length < 6) return setError('Password must be at least 6 characters');
      if (newPassword !== confirmPassword) return setError("Passwords don't match");
      setLoading(true); clearError();
      try {
         const response = await yunikoApiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify({ username: forgotUsername.trim(), newPassword }) });
         const data = await response.json().catch(() => ({}));
         if (!response.ok) return setError(data.error ?? 'Reset failed');
         setResetDone(true);
         setTimeout(() => { setMode('signin'); setResetDone(false); setNewPassword(''); setConfirmPassword(''); }, 1500);
      } catch { setError('Network error. Please try again.'); }
      finally { setLoading(false); }
   }

   async function chooseAvatar(event: React.ChangeEvent<HTMLInputElement>) {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => setSignup(current => ({ ...current, avatarUrl: String(reader.result) }));
      reader.readAsDataURL(file);
   }

   if (mode === 'signup' && step === 4) {
      return (
         <main {...stylex.props(styles.root)} style={{ background: GRADIENT, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 520 }}>
            <div style={{ textAlign: 'center', padding: 32 }}>
               <div style={{ width: 112, height: 112, borderRadius: '50%', overflow: 'hidden', margin: '0 auto 18px', border: '3px solid rgba(255,255,255,.4)' }}>
                  {signup.avatarUrl ? <img src={signup.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <MdPerson size={56} style={{ marginTop: 25, opacity: .7 }} />}
               </div>
               <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0 }}>Welcome to Yuniko!</h1>
               <p style={{ fontSize: 17, fontWeight: 600 }}>{signup.displayName}</p>
               <button onClick={() => { window.location.href = '/'; }} style={{ marginTop: 18, border: 0, borderRadius: 16, padding: '14px 26px', fontWeight: 800, color: '#8B00FF', background: 'white' }}>Start Exploring <MdArrowForward /></button>
            </div>
         </main>
      );
   }

   return (
      <main {...stylex.props(styles.root)} style={{ background: 'linear-gradient(180deg, rgba(255,0,110,.13), rgba(139,0,255,.08) 48%, transparent)' }}>
         <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ width: 68, height: 68, borderRadius: 20, margin: '0 auto 10px', display: 'grid', placeItems: 'center', background: GRADIENT, boxShadow: '0 0 44px rgba(255,0,110,.35)' }}>
               <span style={{ color: 'white', fontSize: 34, fontWeight: 900, lineHeight: 1 }}>Y</span>
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, background: GRADIENT, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Yuniko</div>
         </div>

         {mode === 'signin' && (
            <>
               <div style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 16, background: 'rgba(255,255,255,.06)', marginBottom: 22 }}>
                  <button style={{ flex: 1, border: 0, borderRadius: 12, padding: 10, background: GRADIENT, color: 'white', fontWeight: 700 }}>Sign In</button>
                  <button onClick={() => { setMode('signup'); setStep(1); clearError(); }} style={{ flex: 1, border: 0, background: 'transparent', color: 'rgba(255,255,255,.5)', fontWeight: 700 }}>Sign Up</button>
               </div>
               <div style={{ display: 'grid', gap: 12 }}>
                  <Field icon={<MdPerson color="rgba(255,255,255,.4)" size={20} />} value={username} onChange={v => { setUsername(v); clearError(); }} placeholder="Username" />
                  <Field icon={<MdLock color="rgba(255,255,255,.4)" size={20} />} value={password} onChange={v => { setPassword(v); clearError(); }} placeholder="Password" type={showPassword ? 'text' : 'password'} suffix={<button type="button" onClick={() => setShowPassword(v => !v)} style={{ background: 0, border: 0, color: 'rgba(255,255,255,.5)' }}>{showPassword ? <MdVisibilityOff /> : <MdVisibility />}</button>} />
               </div>
               {error && <p role="alert" style={{ color: '#f87171', textAlign: 'center', fontSize: 12 }}>{error}</p>}
               <button disabled={loading} onClick={submitLogin} style={{ width: '100%', marginTop: 16, padding: 15, border: 0, borderRadius: 16, color: 'white', fontWeight: 800, background: GRADIENT }}>{loading ? 'Signing in…' : <>Sign In <MdArrowForward /></>}</button>
               <button onClick={() => { setMode('forgot'); clearError(); }} style={{ width: '100%', marginTop: 14, border: 0, background: 0, color: '#FF3D9A', fontWeight: 600 }}>Forgot Password?</button>
               <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.4)', fontSize: 13 }}>Don&apos;t have an account? <button onClick={() => { setMode('signup'); setStep(1); clearError(); }} style={{ border: 0, background: 0, color: '#FF3D9A', fontWeight: 700 }}>Sign Up</button></p>
            </>
         )}

         {mode === 'signup' && step < 4 && (
            <>
               <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <button onClick={() => step === 1 ? setMode('signin') : setStep(step - 1)} style={{ border: 0, background: 0, color: 'rgba(255,255,255,.6)' }}><MdArrowBack size={22} /></button>
                  <span style={{ color: 'rgba(255,255,255,.55)', fontSize: 12 }}>Step {step} of 3</span>
                  <span />
               </div>
               <h2 style={{ color: 'white', fontSize: 21, margin: '0 0 5px' }}>{step === 1 ? 'Create account' : step === 2 ? 'About you' : 'Add your photo'}</h2>
               <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 13, marginBottom: 18 }}>{step === 1 ? 'Choose your username and password' : step === 2 ? 'Tell us a little about you' : 'Help people recognize you'}</p>

               {step === 1 && <div style={{ display: 'grid', gap: 12 }}>
                  <Field icon={<MdPerson color="rgba(255,255,255,.4)" />} value={signup.username} onChange={v => { setSignup(s => ({ ...s, username: v.replace(/[^a-zA-Z0-9._]/g, '') })); clearError(); }} placeholder="Username" />
                  <Field icon={<MdLock color="rgba(255,255,255,.4)" />} value={signup.password} onChange={v => setSignup(s => ({ ...s, password: v }))} placeholder="Password (min 6 characters)" type="password" />
                  <Field icon={<MdLock color="rgba(255,255,255,.4)" />} value={signup.confirmPassword} onChange={v => setSignup(s => ({ ...s, confirmPassword: v }))} placeholder="Confirm password" type="password" />
               </div>}

               {step === 2 && <div style={{ display: 'grid', gap: 12 }}>
                  <Field icon={<MdPerson color="rgba(255,255,255,.4)" />} value={signup.displayName} onChange={v => setSignup(s => ({ ...s, displayName: v }))} placeholder="Display name" />
                  <Field icon={<MdPublic color="rgba(255,255,255,.4)" />} value={signup.country} onChange={v => setSignup(s => ({ ...s, country: v }))} placeholder="Country (e.g. Madagascar)" />
                  <Field icon={<MdCalendarToday color="rgba(255,255,255,.4)" />} value={signup.age} onChange={v => setSignup(s => ({ ...s, age: v }))} placeholder="Age (13+)" type="number" />
               </div>}

               {step === 3 && <div style={{ textAlign: 'center' }}>
                  <input id="yuniko-avatar" type="file" accept="image/*" onChange={chooseAvatar} style={{ display: 'none' }} />
                  <label htmlFor="yuniko-avatar" style={{ display: 'grid', placeItems: 'center', width: 128, height: 128, borderRadius: '50%', margin: '0 auto 14px', overflow: 'hidden', background: 'rgba(255,255,255,.06)', border: '2px dashed rgba(255,255,255,.2)', cursor: 'pointer' }}>
                     {signup.avatarUrl ? <img src={signup.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <MdCameraAlt size={32} color="#FF006E" />}
                  </label>
                  {signup.avatarUrl && <button onClick={() => setSignup(s => ({ ...s, avatarUrl: null }))} style={{ border: 0, background: 0, color: 'rgba(255,255,255,.4)' }}><MdClose /> Remove photo</button>}
               </div>}

               {error && <p role="alert" style={{ color: '#f87171', textAlign: 'center', fontSize: 12 }}>{error}</p>}
               <button disabled={loading} onClick={() => step < 3 ? setStep(step + 1) : submitRegister()} style={{ width: '100%', marginTop: 18, padding: 15, border: 0, borderRadius: 16, color: 'white', fontWeight: 800, background: GRADIENT }}>{loading ? 'Please wait…' : step < 3 ? <>Continue <MdArrowForward /></> : <>Create Account <MdArrowForward /></>}</button>
            </>
         )}

         {mode === 'forgot' && (
            <>
               <button onClick={() => setMode('signin')} style={{ border: 0, background: 0, color: 'rgba(255,255,255,.6)', marginBottom: 18 }}><MdArrowBack size={22} /></button>
               <h2 style={{ color: 'white', fontSize: 21 }}>Reset password</h2>
               <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 13 }}>Use your Yuniko username, just like the original Yuniko authentication flow.</p>
               <Field icon={<MdPerson color="rgba(255,255,255,.4)" />} value={forgotUsername} onChange={setForgotUsername} placeholder="Username" />
               <div style={{ height: 12 }} />
               <Field icon={<MdLock color="rgba(255,255,255,.4)" />} value={newPassword} onChange={setNewPassword} placeholder="New password" type="password" />
               <div style={{ height: 12 }} />
               <Field icon={<MdLock color="rgba(255,255,255,.4)" />} value={confirmPassword} onChange={setConfirmPassword} placeholder="Confirm new password" type="password" />
               {resetDone && <p style={{ color: '#4ade80', textAlign: 'center', fontSize: 12 }}><MdCheckCircle /> Password updated.</p>}
               {error && <p role="alert" style={{ color: '#f87171', textAlign: 'center', fontSize: 12 }}>{error}</p>}
               <button disabled={loading || resetDone} onClick={resetPassword} style={{ width: '100%', marginTop: 16, padding: 15, border: 0, borderRadius: 16, color: 'white', fontWeight: 800, background: GRADIENT }}>{loading ? 'Please wait…' : 'Reset Password'}</button>
            </>
         )}
      </main>
   );
}
