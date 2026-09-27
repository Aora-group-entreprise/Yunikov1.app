'use client';

import * as stylex from '@stylexjs/stylex';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
   MdArrowBack,
   MdArrowForward,
   MdCalendarToday,
   MdCameraAlt,
   MdCheckCircle,
   MdPublic,
   MdLock,
   MdPerson,
   MdVisibility,
   MdVisibilityOff,
   MdClose,
} from 'react-icons/md';
import { useYunikoAuth } from '@/src/lib/yuniko/auth-context';
import { yunikoApiFetch, type YunikoAuthUser } from '@/src/lib/yuniko/api';
import { styles } from './index.stylex';
import { COUNTRIES } from '@/src/data/countries';

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

async function readAuthError(response: Response, fallback: string): Promise<string> {
   const contentType = response.headers.get('content-type') ?? '';
   const raw = await response.text();
   let message = '';

   if (raw) {
      if (contentType.includes('application/json')) {
         try {
            const data = JSON.parse(raw) as {
               error?: unknown;
               message?: unknown;
               detail?: unknown;
            };
            const candidate = data.error ?? data.message ?? data.detail;
            if (typeof candidate === 'string') message = candidate;
         } catch {
            // Fall back to the raw response below.
         }
      }

      if (!message) message = raw.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
   }

   const status = response.status ? `HTTP ${response.status}` : 'HTTP unknown';
   if (message) return `${fallback}: ${message} (${status})`;
   return `${fallback} (${status})`;
}

async function processAvatar(file: File): Promise<string> {
   return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = event => {
         const image = new Image();
         image.onload = () => {
            const canvas = document.createElement('canvas');
            const size = 300;
            canvas.width = size;
            canvas.height = size;
            const context = canvas.getContext('2d');
            if (!context) {
               reject(new Error('Canvas not supported'));
               return;
            }
            const min = Math.min(image.width, image.height);
            const sx = (image.width - min) / 2;
            const sy = (image.height - min) / 2;
            context.drawImage(image, sx, sy, min, min, 0, 0, size, size);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
         };
         image.onerror = () => reject(new Error('Unable to read image'));
         image.src = String(event.target?.result ?? '');
      };
      reader.onerror = () => reject(new Error('Unable to read file'));
      reader.readAsDataURL(file);
   });
}

function Field({
   icon,
   value,
   onChange,
   placeholder,
   type = 'text',
   suffix,
   highlight,
}: {
   icon: React.ReactNode;
   value: string;
   onChange: (value: string) => void;
   placeholder: string;
   type?: string;
   suffix?: React.ReactNode;
   highlight?: 'ok' | 'error';
}) {
   const borderColor =
      highlight === 'ok'
         ? 'rgba(74,222,128,.5)'
         : highlight === 'error'
           ? 'rgba(248,113,113,.5)'
           : 'rgba(255,255,255,.1)';

   return (
      <div
         style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '14px 16px',
            borderRadius: 16,
            background: 'rgba(255,255,255,.06)',
            border: '1px solid ' + borderColor,
            transition: 'border-color .18s ease',
         }}
      >
         {icon}
         <input
            value={value}
            onChange={event => onChange(event.target.value)}
            placeholder={placeholder}
            type={type}
            autoCapitalize={type === 'password' ? 'none' : undefined}
            autoCorrect="off"
            style={{
               flex: 1,
               minWidth: 0,
               background: 'transparent',
               color: 'rgba(255,255,255,.9)',
               border: 0,
               outline: 0,
               fontSize: 14,
            }}
         />
         {suffix}
      </div>
   );
}

function StepDots({ current, total }: { current: number; total: number }) {
   return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
         {Array.from({ length: total }).map((_, index) => (
            <span
               key={index}
               style={{
                  width: index + 1 === current ? 20 : 6,
                  height: 6,
                  borderRadius: 999,
                  background: index + 1 <= current ? GRADIENT : 'rgba(255,255,255,.18)',
                  display: 'block',
                  transition: 'width .25s ease',
               }}
            />
         ))}
      </div>
   );
}

export default function RightSection({
   initialReset,
   initialError,
}: {
   initialReset?: boolean;
   initialError?: string;
}) {
   const router = useRouter();
   const { login } = useYunikoAuth();
   const fileInputRef = useRef<HTMLInputElement>(null);

   const [mode, setMode] = useState<Mode>(initialReset || initialError ? 'forgot' : 'signin');
   const [signupStep, setSignupStep] = useState(1);
   const [forgotStep, setForgotStep] = useState(1);

   const [username, setUsername] = useState('');
   const [password, setPassword] = useState('');
   const [showPassword, setShowPassword] = useState(false);

   const [signup, setSignup] = useState<SignupData>({
      username: '',
      password: '',
      confirmPassword: '',
      displayName: '',
      country: '',
      countryFlag: '',
      age: '',
      avatarUrl: null,
   });
   const [signupShowPassword, setSignupShowPassword] = useState(false);
   const [signupShowConfirm, setSignupShowConfirm] = useState(false);

   const [forgotUsername, setForgotUsername] = useState('');
   const [forgotPassword, setForgotPassword] = useState('');
   const [forgotConfirm, setForgotConfirm] = useState('');
   const [forgotShowPassword, setForgotShowPassword] = useState(false);
   const [forgotDone, setForgotDone] = useState(false);

   const [loading, setLoading] = useState(false);
   const [error, setError] = useState('');

   const clearError = () => setError('');
   const updateSignup = (patch: Partial<SignupData>) => setSignup(current => ({ ...current, ...patch }));

   async function handleSignin() {
      if (!username.trim() || !password) {
         setError('Please fill in all fields');
         return;
      }
      setLoading(true);
      clearError();
      try {
         const response = await yunikoApiFetch('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ username: username.trim(), password }),
         });
         if (!response.ok) {
            setError(await readAuthError(response, 'Login failed'));
            return;
         }
         const data = await response.json().catch(() => ({}));
         if (!data.user) {
            setError('Login failed: the server returned no user (HTTP 200)');
            return;
         }
         login(data.user as YunikoAuthUser);
         router.replace('/');
      } catch (error) {
         const message = error instanceof Error ? error.message : String(error);
         setError(`Login request error: ${message}`);
      } finally {
         setLoading(false);
      }
   }

   function validateSignupStep1() {
      if (!signup.username.trim()) {
         setError('Username is required');
         return false;
      }
      if (signup.username.trim().length < 3) {
         setError('Username must be at least 3 characters');
         return false;
      }
      if (!signup.password) {
         setError('Password is required');
         return false;
      }
      if (signup.password.length < 6) {
         setError('Password must be at least 6 characters');
         return false;
      }
      if (signup.password !== signup.confirmPassword) {
         setError("Passwords don't match");
         return false;
      }
      return true;
   }

   function validateSignupStep2() {
      if (!signup.displayName.trim()) {
         setError('Display name is required');
         return false;
      }
      if (!signup.country) {
         setError('Please select your country');
         return false;
      }
      const age = Number.parseInt(signup.age, 10);
      if (!signup.age || Number.isNaN(age) || age < 13 || age > 120) {
         setError('Please enter a valid age (13+)');
         return false;
      }
      return true;
   }

   async function handleRegister() {
      setLoading(true);
      clearError();
      try {
         const response = await yunikoApiFetch('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
               username: signup.username.trim().toLowerCase(),
               displayName: signup.displayName.trim(),
               password: signup.password,
               country: signup.country,
               countryFlag: signup.countryFlag,
               age: Number.parseInt(signup.age, 10),
               avatarUrl: signup.avatarUrl,
            }),
         });
         if (!response.ok) {
            setError(await readAuthError(response, 'Registration failed'));
            return;
         }
         const data = await response.json().catch(() => ({}));
         if (!data.user) {
            setError('Registration failed: the server returned no user (HTTP 200)');
            return;
         }
         login(data.user as YunikoAuthUser);
         setSignupStep(4);
      } catch (error) {
         const message = error instanceof Error ? error.message : String(error);
         setError(`Registration request error: ${message}`);
      } finally {
         setLoading(false);
      }
   }

   function handleForgotLookup() {
      if (!forgotUsername.trim()) {
         setError('Please enter your username');
         return;
      }
      clearError();
      setForgotStep(2);
   }

   async function handleForgotReset() {
      if (!forgotPassword) {
         setError('Please enter a new password');
         return;
      }
      if (forgotPassword.length < 6) {
         setError('Password must be at least 6 characters');
         return;
      }
      if (forgotPassword !== forgotConfirm) {
         setError("Passwords don't match");
         return;
      }

      setLoading(true);
      clearError();
      try {
         const response = await yunikoApiFetch('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ username: forgotUsername.trim(), newPassword: forgotPassword }),
         });
         const data = await response.json().catch(() => ({}));
         if (!response.ok) {
            setError(data.error ?? 'Reset failed');
            return;
         }
         setForgotDone(true);
         window.setTimeout(() => {
            setMode('signin');
            setForgotStep(1);
            setForgotUsername('');
            setForgotPassword('');
            setForgotConfirm('');
            setForgotDone(false);
            clearError();
         }, 2000);
      } catch {
         setError('Network error. Please try again.');
      } finally {
         setLoading(false);
      }
   }

   async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
         updateSignup({ avatarUrl: await processAvatar(file) });
         clearError();
      } catch {
         setError('Failed to process image. Try another.');
      }
      event.target.value = '';
   }

   const PrimaryButton = ({
      onClick,
      disabled,
      children,
   }: {
      onClick: () => void;
      disabled?: boolean;
      children: React.ReactNode;
   }) => (
      <button
         onClick={onClick}
         disabled={disabled ?? loading}
         style={{
            width: '100%',
            padding: '16px',
            borderRadius: 16,
            border: 0,
            background: GRADIENT,
            boxShadow: '0 4px 20px rgba(255,0,110,.35)',
            color: 'white',
            fontWeight: 700,
            fontSize: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            opacity: loading ? .75 : 1,
         }}
      >
         {loading ? (
            <span
               style={{
                  width: 20,
                  height: 20,
                  border: '2px solid rgba(255,255,255,.3)',
                  borderTopColor: 'white',
                  borderRadius: '50%',
                  animation: 'yuniko-auth-spin 1s linear infinite',
               }}
            />
         ) : children}
      </button>
   );

   if (mode === 'signup' && signupStep === 4) {
      return (
         <div
            {...stylex.props(styles.root)}
            style={{
               minHeight: '100dvh',
               width: '100%',
               maxWidth: 430,
               background: GRADIENT,
               color: 'white',
               display: 'flex',
               flexDirection: 'column',
               alignItems: 'center',
               justifyContent: 'center',
               padding: 32,
               textAlign: 'center',
            }}
         >
            <div
               style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 16,
               }}
            >
               <div
                  style={{
                     width: 112,
                     height: 112,
                     borderRadius: '50%',
                     overflow: 'hidden',
                     border: '3px solid rgba(255,255,255,.4)',
                     boxShadow: '0 0 60px rgba(0,0,0,.3)',
                  }}
               >
                  {signup.avatarUrl ? (
                     <img src={signup.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                     <div style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', background: 'rgba(255,255,255,.2)' }}>
                        <MdPerson size={48} color="rgba(255,255,255,.7)" />
                     </div>
                  )}
               </div>
               <div>
                  <h1 style={{ margin: 0, fontSize: 30, lineHeight: 1.15, fontWeight: 900 }}>Welcome to Yuniko!</h1>
                  <p style={{ margin: '8px 0 0', color: 'rgba(255,255,255,.9)', fontSize: 18, fontWeight: 600 }}>{signup.displayName}</p>
                  <p style={{ margin: '3px 0 0', color: 'rgba(255,255,255,.6)', fontSize: 14 }}>@{signup.username.toLowerCase()}</p>
                  {signup.country && <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,.55)', fontSize: 14 }}>{signup.countryFlag} {signup.country}</p>}
               </div>
               <button
                  onClick={() => router.replace('/')}
                  style={{
                     marginTop: 16,
                     padding: '16px 32px',
                     borderRadius: 16,
                     border: 0,
                     background: 'white',
                     color: '#8B00FF',
                     fontWeight: 700,
                     fontSize: 16,
                     boxShadow: '0 8px 32px rgba(0,0,0,.25)',
                     display: 'flex',
                     alignItems: 'center',
                     gap: 8,
                  }}
               >
                  Start Exploring <MdArrowForward size={18} />
               </button>
            </div>
         </div>
      );
   }

   return (
      <div {...stylex.props(styles.root)}>
         <div
            style={{
               position: 'relative',
               display: 'flex',
               flexDirection: 'column',
               alignItems: 'center',
               justifyContent: 'flex-end',
               padding: '56px 24px 28px',
               minHeight: 220,
               overflow: 'hidden',
            }}
         >
            <div
               style={{
                  position: 'absolute',
                  inset: 0,
                  background: 'linear-gradient(180deg, rgba(255,0,110,.17) 0%, rgba(139,0,255,.13) 60%, transparent 100%)',
               }}
            />
            <div
               style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  width: 256,
                  height: 256,
                  borderRadius: '50%',
                  transform: 'translateX(-50%)',
                  background: 'radial-gradient(circle, rgba(255,0,110,.18) 0%, transparent 70%)',
                  filter: 'blur(40px)',
               }}
            />
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
               <div
                  style={{
                     width: 68,
                     height: 68,
                     borderRadius: 20,
                     display: 'grid',
                     placeItems: 'center',
                     marginBottom: 12,
                     background: GRADIENT,
                     boxShadow: '0 0 44px rgba(255,0,110,.45), 0 8px 28px rgba(0,0,0,.4)',
                  }}
               >
                  <span style={{ color: 'white', fontSize: 34, fontWeight: 900, lineHeight: 1 }}>Y</span>
               </div>
               <h1
                  style={{
                     margin: 0,
                     fontSize: 24,
                     fontWeight: 900,
                     background: GRADIENT,
                     WebkitBackgroundClip: 'text',
                     WebkitTextFillColor: 'transparent',
                  }}
               >
                  Yuniko
               </h1>
            </div>
         </div>

         <div style={{ flex: 1, padding: '0 24px 40px' }}>
            {mode === 'signin' && (
               <div>
                  <div
                     style={{
                        display: 'flex',
                        padding: 4,
                        borderRadius: 16,
                        marginBottom: 24,
                        background: 'rgba(255,255,255,.06)',
                        border: '1px solid rgba(255,255,255,.08)',
                     }}
                  >
                     <button
                        style={{
                           flex: 1,
                           padding: '10px 0',
                           border: 0,
                           borderRadius: 12,
                           background: GRADIENT,
                           color: 'white',
                           fontSize: 14,
                           fontWeight: 600,
                           boxShadow: '0 2px 10px rgba(255,0,110,.3)',
                        }}
                     >
                        Sign In
                     </button>
                     <button
                        onClick={() => { setMode('signup'); setSignupStep(1); clearError(); }}
                        style={{ flex: 1, border: 0, color: 'rgba(255,255,255,.5)', fontSize: 14, fontWeight: 600 }}
                     >
                        Sign Up
                     </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
                     <Field icon={<MdPerson size={18} color="rgba(255,255,255,.4)" />} value={username} onChange={value => { setUsername(value); clearError(); }} placeholder="Username" />
                     <Field
                        icon={<MdLock size={18} color="rgba(255,255,255,.4)" />}
                        value={password}
                        onChange={value => { setPassword(value); clearError(); }}
                        placeholder="Password"
                        type={showPassword ? 'text' : 'password'}
                        suffix={<button type="button" onClick={() => setShowPassword(value => !value)} style={{ border: 0, color: 'rgba(255,255,255,.4)' }}>{showPassword ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}</button>}
                     />
                  </div>

                  <div style={{ textAlign: 'right', marginBottom: 20 }}>
                     <button onClick={() => { setMode('forgot'); setForgotStep(1); clearError(); }} style={{ border: 0, color: '#FF3D9A', fontSize: 14, fontWeight: 500 }}>
                        Forgot Password?
                     </button>
                  </div>

                  {error && <p style={{ color: '#f87171', fontSize: 12, textAlign: 'center', margin: '0 0 16px' }}>{error}</p>}
                  <PrimaryButton onClick={handleSignin}><span>Sign In</span><MdArrowForward size={16} /></PrimaryButton>

                  <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.4)', fontSize: 14, marginTop: 20 }}>
                     Don't have an account?{' '}
                     <button onClick={() => { setMode('signup'); setSignupStep(1); clearError(); }} style={{ border: 0, color: '#FF3D9A', fontWeight: 600 }}>
                        Sign Up
                     </button>
                  </p>
               </div>
            )}

            {mode === 'signup' && signupStep === 1 && (
               <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                     <button type="button" onClick={() => { setMode('signin'); clearError(); }} style={{ border: 0, color: 'rgba(255,255,255,.6)' }}><MdArrowBack size={20} /></button>
                     <StepDots current={1} total={3} />
                     <span style={{ width: 24 }} />
                  </div>
                  <h2 style={{ color: 'white', fontSize: 20, margin: '0 0 4px', fontWeight: 700 }}>Create account</h2>
                  <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 14, margin: '0 0 20px' }}>Choose a unique username</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderRadius: 16, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}>
                        <span style={{ color: 'rgba(255,255,255,.4)', fontSize: 14 }}>@</span>
                        <input value={signup.username} onChange={event => { updateSignup({ username: event.target.value.replace(/[^a-zA-Z0-9._]/g, '') }); clearError(); }} placeholder="username" autoCapitalize="none" autoCorrect="off" style={{ flex: 1, minWidth: 0, background: 'transparent', color: 'rgba(255,255,255,.9)', fontSize: 14, outline: 0 }} />
                     </div>
                     <Field icon={<MdLock size={18} color="rgba(255,255,255,.4)" />} value={signup.password} onChange={value => { updateSignup({ password: value }); clearError(); }} placeholder="Password (min 6 characters)" type={signupShowPassword ? 'text' : 'password'} suffix={<button type="button" onClick={() => setSignupShowPassword(value => !value)} style={{ border: 0, color: 'rgba(255,255,255,.4)' }}>{signupShowPassword ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}</button>} />
                     <Field icon={<MdLock size={18} color="rgba(255,255,255,.4)" />} value={signup.confirmPassword} onChange={value => { updateSignup({ confirmPassword: value }); clearError(); }} placeholder="Confirm password" type={signupShowConfirm ? 'text' : 'password'} highlight={signup.confirmPassword && signup.confirmPassword === signup.password ? 'ok' : signup.confirmPassword && signup.confirmPassword !== signup.password ? 'error' : undefined} suffix={<button type="button" onClick={() => setSignupShowConfirm(value => !value)} style={{ border: 0, color: 'rgba(255,255,255,.4)' }}>{signupShowConfirm ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}</button>} />
                  </div>

                  {error && <p style={{ color: '#f87171', fontSize: 12, textAlign: 'center', margin: '0 0 16px' }}>{error}</p>}
                  <button onClick={() => { if (validateSignupStep1()) { clearError(); setSignupStep(2); } }} style={{ width: '100%', padding: 16, borderRadius: 16, border: 0, background: GRADIENT, boxShadow: '0 4px 20px rgba(255,0,110,.35)', color: 'white', fontWeight: 700, fontSize: 14, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                     Continue <MdArrowForward size={16} />
                  </button>
                  <p style={{ textAlign: 'center', color: 'rgba(255,255,255,.4)', fontSize: 14, marginTop: 20 }}>
                     Already have an account? <button onClick={() => { setMode('signin'); clearError(); }} style={{ border: 0, color: '#FF3D9A', fontWeight: 600 }}>Sign In</button>
                  </p>
               </div>
            )}

            {mode === 'signup' && signupStep === 2 && (
               <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                     <button type="button" onClick={() => { setSignupStep(1); clearError(); }} style={{ border: 0, color: 'rgba(255,255,255,.6)' }}><MdArrowBack size={20} /></button>
                     <StepDots current={2} total={3} />
                     <span style={{ width: 24 }} />
                  </div>
                  <h2 style={{ color: 'white', fontSize: 20, margin: '0 0 4px', fontWeight: 700 }}>About you</h2>
                  <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 14, margin: '0 0 20px' }}>Help others find and know you</p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                     <Field icon={<MdPerson size={18} color="rgba(255,255,255,.4)" />} value={signup.displayName} onChange={value => { updateSignup({ displayName: value }); clearError(); }} placeholder="Display name (e.g. Alex)" />
                     <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}>
                        <MdPublic size={18} color="rgba(255,255,255,.4)" />
                        <select value={signup.country} onChange={event => { const country = COUNTRIES.find(item => item.name === event.target.value); updateSignup({ country: event.target.value, countryFlag: country?.flag ?? '' }); clearError(); }} style={{ flex: 1, color: signup.country ? 'rgba(255,255,255,.9)' : 'rgba(255,255,255,.3)', background: 'transparent', fontSize: 14, outline: 0, appearance: 'none' }}>
                           <option value="" disabled style={{ background: '#160d26' }}>Select your country</option>
                           {COUNTRIES.map(country => <option key={country.code} value={country.name} style={{ background: '#160d26', color: 'white' }}>{country.flag} {country.name}</option>)}
                        </select>
                     </div>
                     <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 16, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)' }}>
                        <MdCalendarToday size={18} color="rgba(255,255,255,.4)" />
                        <input type="number" min={13} max={120} value={signup.age} onChange={event => { updateSignup({ age: event.target.value }); clearError(); }} placeholder="Your age" style={{ flex: 1, minWidth: 0, background: 'transparent', color: 'rgba(255,255,255,.9)', fontSize: 14, outline: 0 }} />
                     </div>
                  </div>

                  {error && <p style={{ color: '#f87171', fontSize: 12, textAlign: 'center', margin: '0 0 16px' }}>{error}</p>}
                  <button onClick={() => { if (validateSignupStep2()) { clearError(); setSignupStep(3); } }} style={{ width: '100%', padding: 16, borderRadius: 16, border: 0, background: GRADIENT, boxShadow: '0 4px 20px rgba(255,0,110,.35)', color: 'white', fontWeight: 700, fontSize: 14, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8 }}>
                     Continue <MdArrowForward size={16} />
                  </button>
               </div>
            )}

            {mode === 'signup' && signupStep === 3 && (
               <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                     <button type="button" onClick={() => { setSignupStep(2); clearError(); }} style={{ border: 0, color: 'rgba(255,255,255,.6)' }}><MdArrowBack size={20} /></button>
                     <StepDots current={3} total={3} />
                     <span style={{ width: 24 }} />
                  </div>
                  <h2 style={{ color: 'white', fontSize: 20, margin: '0 0 4px', fontWeight: 700 }}>Add your photo</h2>
                  <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 14, margin: '0 0 24px' }}>Help people recognize you</p>

                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                  <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
                     <button type="button" onClick={() => fileInputRef.current?.click()} style={{ width: 128, height: 128, borderRadius: '50%', overflow: 'hidden', display: 'grid', placeItems: 'center', background: signup.avatarUrl ? 'transparent' : 'rgba(255,255,255,.06)', border: signup.avatarUrl ? '3px solid rgba(255,0,110,.5)' : '2px dashed rgba(255,255,255,.2)', position: 'relative' }}>
                        {signup.avatarUrl ? <img src={signup.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}><span style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(255,0,110,.15)', display: 'grid', placeItems: 'center' }}><MdCameraAlt size={24} color="#FF006E" /></span><span style={{ color: 'rgba(255,255,255,.4)', fontSize: 12 }}>Tap to add</span></div>}
                     </button>
                  </div>

                  {signup.avatarUrl && <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}><button type="button" onClick={() => updateSignup({ avatarUrl: null })} style={{ border: 0, color: 'rgba(255,255,255,.35)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 6 }}><MdClose size={13} /> Remove photo</button></div>}

                  {error && <p style={{ color: '#f87171', fontSize: 12, textAlign: 'center', margin: '0 0 16px' }}>{error}</p>}
                  <PrimaryButton onClick={handleRegister}><span>Create Account</span><MdArrowForward size={16} /></PrimaryButton>
                  {!signup.avatarUrl && <button type="button" onClick={handleRegister} disabled={loading} style={{ width: '100%', padding: '12px 0', color: 'rgba(255,255,255,.35)', fontSize: 14, border: 0 }}>Skip for now</button>}
               </div>
            )}

            {mode === 'forgot' && (
               <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: 20 }}>
                     <button type="button" onClick={() => { if (forgotStep === 1) setMode('signin'); else setForgotStep(1); clearError(); }} style={{ border: 0, color: 'rgba(255,255,255,.6)' }}><MdArrowBack size={20} /></button>
                  </div>

                  {forgotStep === 1 ? (
                     <>
                        <h2 style={{ color: 'white', fontSize: 20, margin: '0 0 4px', fontWeight: 700 }}>Reset password</h2>
                        <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 14, margin: '0 0 20px' }}>Enter your username to continue</p>
                        <div style={{ marginBottom: 20 }}>
                           <Field icon={<MdPerson size={18} color="rgba(255,255,255,.4)" />} value={forgotUsername} onChange={value => { setForgotUsername(value); clearError(); }} placeholder="Your username" />
                        </div>
                        {error && <p style={{ color: '#f87171', fontSize: 12, textAlign: 'center', margin: '0 0 16px' }}>{error}</p>}
                        <PrimaryButton onClick={handleForgotLookup}><span>Continue</span><MdArrowForward size={16} /></PrimaryButton>
                     </>
                  ) : (
                     <>
                        <h2 style={{ color: 'white', fontSize: 20, margin: '0 0 4px', fontWeight: 700 }}>New password</h2>
                        <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 14, margin: '0 0 20px' }}>Set a new password for <span style={{ color: 'rgba(255,255,255,.8)', fontWeight: 500 }}>@{forgotUsername}</span></p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                           <Field icon={<MdLock size={18} color="rgba(255,255,255,.4)" />} value={forgotPassword} onChange={value => { setForgotPassword(value); clearError(); }} placeholder="New password (min 6 characters)" type={forgotShowPassword ? 'text' : 'password'} suffix={<button type="button" onClick={() => setForgotShowPassword(value => !value)} style={{ border: 0, color: 'rgba(255,255,255,.4)' }}>{forgotShowPassword ? <MdVisibilityOff size={16} /> : <MdVisibility size={16} />}</button>} />
                           <Field icon={<MdLock size={18} color="rgba(255,255,255,.4)" />} value={forgotConfirm} onChange={value => { setForgotConfirm(value); clearError(); }} placeholder="Confirm new password" type="password" highlight={forgotConfirm && forgotConfirm === forgotPassword ? 'ok' : forgotConfirm && forgotConfirm !== forgotPassword ? 'error' : undefined} />
                        </div>
                        {forgotDone && <p style={{ color: '#4ade80', fontSize: 12, textAlign: 'center', margin: '0 0 16px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6 }}><MdCheckCircle size={14} /> Password updated! Redirecting to sign in…</p>}
                        {error && <p style={{ color: '#f87171', fontSize: 12, textAlign: 'center', margin: '0 0 16px' }}>{error}</p>}
                        <PrimaryButton onClick={handleForgotReset} disabled={loading || forgotDone}><span>Reset Password</span><MdArrowForward size={16} /></PrimaryButton>
                     </>
                  )}
               </div>
            )}
         </div>
      </div>
   );
}
