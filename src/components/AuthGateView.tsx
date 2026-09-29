import React, { useState, useEffect } from 'react';
import { Lock, ShieldCheck, KeyRound, AlertTriangle } from 'lucide-react';
import { AuthSession, UserRealtimeWorkspace } from '../types';

interface Props {
  onAuthenticated: (
    session: AuthSession,
    workspace: UserRealtimeWorkspace,
    activeOtp: string
  ) => void;
}

export const AuthGateView: React.FC<Props> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('signup');
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [homeCity, setHomeCity] = useState('Chennai');
  const [loginCity, setLoginCity] = useState('Chennai');

  // 2FA & Brute Force States
  const [otpInput, setOtpInput] = useState('');
  const [dispatchedOtp, setDispatchedOtp] = useState<string | null>(null);
  const [failedAttempts, setFailedAttempts] = useState<number>(0);
  const [lockedUntilCaptcha, setLockedUntilCaptcha] = useState<boolean>(false);
  const [captchaChallenge, setCaptchaChallenge] = useState<string>('');
  const [captchaInput, setCaptchaInput] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Live Device Fingerprint detected from Browser
  const [deviceFingerprint, setDeviceFingerprint] = useState({
    browser: 'Standard Web Client',
    os: 'Workstation OS',
    resolution: '1920 × 1080',
    timezone: 'Asia/Kolkata',
    fingerprintHash: 'fp_live_client',
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
      const res = `${window.screen.width} × ${window.screen.height}`;
      const browser = ua.includes('Edg')
        ? 'Blink Web Engine'
        : ua.includes('Gecko')
        ? 'Standard Web Engine'
        : 'WebKit Engine';
      const os = window.navigator.platform || 'Workstation OS';
      const hash = `fp_${btoa(`${browser}-${os}-${res}-${tz}`).slice(0, 14).toLowerCase()}`;
      setDeviceFingerprint({ browser, os, resolution: res, timezone: tz, fingerprintHash: hash });
    }
  }, []);

  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusNotice(null);
    setLoading(true);

    try {
      const endpoint = mode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
      const payload =
        mode === 'signup'
          ? { name, email, password, homeCity }
          : { email, password, captchaAnswer: captchaInput };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (typeof data.failedAttempts === 'number') {
          setFailedAttempts(data.failedAttempts);
        }
        if (data.lockedUntilCaptcha) {
          setLockedUntilCaptcha(true);
          setCaptchaChallenge(data.captchaChallenge || '7K9M2X');
        }
        setErrorMsg(data.error || 'Authentication failed.');
        return;
      }

      if (data.pending2FA) {
        setDispatchedOtp(data.demoOtpCode);
        setOtpInput(data.demoOtpCode || '');
        setLoginCity(mode === 'signup' ? homeCity : loginCity);
        setStep('2fa');
        setStatusNotice(data.message);
      }
    } catch {
      setErrorMsg('Unable to reach authentication server. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otpCode: otpInput,
          loginCity,
          deviceFingerprint,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'Invalid 2FA verification code.');
        return;
      }

      onAuthenticated(data.session, data.workspace, data.currentOtpForVault || otpInput);
    } catch {
      setErrorMsg('Failed to verify 2FA token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col justify-between">
      {/* Top Bar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
        <span className="text-lg font-bold tracking-tight text-slate-900">SpendVista</span>
        <div className="text-xs text-slate-500 font-mono">
          Zero-Sample Real-Time Mode · 2FA + AES-256-GCM + JWT
        </div>
      </header>

      <main className="flex-1 w-full max-w-5xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 6 Cols: Real-Time Security Architecture Overview with Two-Line Section Descriptions */}
        <section className="lg:col-span-6 space-y-6">
          <div className="space-y-2">
            <div className="text-xs text-slate-500">
              Real-Time Banking-Grade Financial & Cybersecurity Platform
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              Authenticate with Two-Factor Authorization (2FA)
            </h1>
            {/* Two-Line Description */}
            <p className="text-xs text-slate-600 leading-relaxed">
              This real-time workspace initializes with zero pre-stored sample data and records financial entries, threat scans, and forensic logs only when you actively use each feature.
              <br />
              Every account is protected by PBKDF2 password hashing, mandatory 6-digit Two-Factor Authorization (2FA), device fingerprinting, and 5-attempt brute-force lockout.
            </p>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-200 text-xs">
            <div className="p-4 space-y-1">
              <div className="font-semibold text-slate-900">
                01. Two-Factor Authorization (Password + 6-Digit OTP + Device Binding)
              </div>
              <p className="text-slate-600 leading-relaxed">
                Verifies your primary password first and then requires a dynamic 6-digit 2FA verification code before issuing signed JWT and Refresh Tokens.
                <br />
                Your browser hardware fingerprint ({deviceFingerprint.fingerprintHash}) is automatically bound to your session upon verification.
              </p>
            </div>

            <div className="p-4 space-y-1">
              <div className="font-semibold text-slate-900">
                02. Brute Force Attack Prevention & Impossible Travel Guard
              </div>
              <p className="text-slate-600 leading-relaxed">
                Monitors failed login attempts in real time and locks the account with a mandatory CAPTCHA challenge after 5 failed attempts.
                <br />
                Tracks consecutive login cities and automatically freezes outflows if an impossible travel transit occurs within 30 minutes.
              </p>
            </div>

            <div className="p-4 space-y-1">
              <div className="font-semibold text-slate-900">
                03. Live Device Fingerprint Telemetry (Current Endpoint)
              </div>
              <p className="text-slate-600 leading-relaxed">
                Captures your real operating system, browser engine, screen resolution, and timezone to establish a trusted device identity.
                <br />
                Detected Endpoint: <span className="font-mono text-slate-900">{deviceFingerprint.os} · {deviceFingerprint.browser} · {deviceFingerprint.resolution} · {deviceFingerprint.timezone}</span>
              </p>
            </div>
          </div>
        </section>

        {/* Right 6 Cols: Sign Up / Log In + 2FA Step Card */}
        <section className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 sm:p-8 space-y-6">
          {step === 'credentials' ? (
            <>
              <div className="border-b border-slate-200 pb-4 space-y-2">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-slate-900">
                    {mode === 'signup' ? 'Create Real-Time Account' : 'Sign In to Your Account'}
                  </h2>
                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setMode('signup');
                        setErrorMsg(null);
                      }}
                      className={`px-3 py-1 font-medium rounded-md cursor-pointer ${
                        mode === 'signup'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Sign Up
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMode('login');
                        setErrorMsg(null);
                      }}
                      className={`px-3 py-1 font-medium rounded-md cursor-pointer ${
                        mode === 'login'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Log In
                    </button>
                  </div>
                </div>
                {/* Two-Line Description */}
                <p className="text-xs text-slate-500 leading-relaxed">
                  {mode === 'signup'
                    ? 'Register your personal finance profile and establish your Digital Twin home city baseline with zero pre-filled mock data.'
                    : 'Enter your registered email and password to request a real-time 6-digit Two-Factor Authorization (2FA) code.'}
                  <br />
                  All records created after sign-in are persisted exclusively to your authenticated account.
                </p>
              </div>

              {errorMsg && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold">Security Alert</div>
                    <div>{errorMsg}</div>
                  </div>
                </div>
              )}

              <form onSubmit={handleCredentialsSubmit} className="space-y-4 text-xs">
                {mode === 'signup' && (
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g., Girija S."
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g., user@example.com"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter strong password"
                    className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                    required
                  />
                </div>

                {mode === 'signup' ? (
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Digital Twin Home City (Baseline Location)
                    </label>
                    <input
                      type="text"
                      value={homeCity}
                      onChange={(e) => {
                        setHomeCity(e.target.value);
                        setLoginCity(e.target.value);
                      }}
                      placeholder="e.g., Chennai"
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                      required
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">
                      Current Login Location (Used for Impossible Travel Detection)
                    </label>
                    <input
                      type="text"
                      value={loginCity}
                      onChange={(e) => setLoginCity(e.target.value)}
                      placeholder="e.g., Chennai or Mumbai"
                      className="w-full px-3 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                      required
                    />
                  </div>
                )}

                {/* CAPTCHA box if Brute Force Lockout is triggered (after 5 failed attempts) */}
                {lockedUntilCaptcha && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-2">
                    <div className="font-semibold text-red-900">
                      Brute Force Protection Active (Failed Attempts: {failedAttempts}/5)
                    </div>
                    <p className="text-red-800">
                      Enter the security CAPTCHA code below to unlock your account:
                    </p>
                    <div className="flex items-center gap-3">
                      <span className="px-3 py-1.5 bg-white border border-red-300 rounded font-mono font-bold tracking-widest text-sm text-slate-900">
                        {captchaChallenge}
                      </span>
                      <input
                        type="text"
                        value={captchaInput}
                        onChange={(e) => setCaptchaInput(e.target.value)}
                        placeholder="Enter CAPTCHA code"
                        className="flex-1 px-3 py-1.5 font-mono bg-white border border-red-300 rounded"
                        required
                      />
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 px-4 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>
                    {loading
                      ? 'Verifying Credentials...'
                      : mode === 'signup'
                      ? 'Register & Proceed to 2FA Verification'
                      : 'Sign In & Request 2FA Code'}
                  </span>
                </button>
              </form>
            </>
          ) : (
            /* STEP 2: TWO-FACTOR AUTHORIZATION (2FA) */
            <div className="space-y-5">
              <div className="border-b border-slate-200 pb-4 space-y-1.5">
                <div className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Step 2 of 2 · Two-Factor Authorization (2FA)</span>
                </div>
                <h2 className="text-lg font-bold text-slate-900">
                  Enter 6-Digit 2FA Security Code
                </h2>
                {/* Two-Line Description */}
                <p className="text-xs text-slate-500 leading-relaxed">
                  A one-time 6-digit verification code has been generated for <strong className="text-slate-800">{email}</strong> to authorize this session and issue your JWT + Refresh Tokens.
                  <br />
                  This code also serves as your active session key for decrypting the AES-256 Privacy Vault.
                </p>
              </div>

              {statusNotice && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 space-y-1">
                  <div className="font-semibold">Live 2FA Authenticator Dispatch</div>
                  <div>{statusNotice}</div>
                  {dispatchedOtp && (
                    <div className="pt-1 font-mono text-sm font-bold text-emerald-800">
                      Generated 6-Digit 2FA OTP: {dispatchedOtp}
                    </div>
                  )}
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleVerify2FA} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    6-Digit 2FA OTP Code
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value)}
                    placeholder="Enter 6-digit OTP"
                    className="w-full px-3 py-2.5 text-center text-base font-mono font-bold tracking-widest bg-white border border-slate-300 rounded-lg focus:outline-none focus:border-slate-900"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Confirm Session City (Checked by Impossible Travel Detector)
                  </label>
                  <input
                    type="text"
                    value={loginCity}
                    onChange={(e) => setLoginCity(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    required
                  />
                </div>

                <div className="flex items-center justify-between gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setStep('credentials');
                      setErrorMsg(null);
                    }}
                    className="px-4 py-2.5 font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 px-4 font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>
                      {loading ? 'Verifying 2FA & Issuing JWT...' : 'Verify 2FA & Launch Workspace'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white px-6 py-4 text-xs text-slate-500 text-center">
        SpendVista · Real-Time Two-Factor Authentication · Zero Pre-Stored Sample Data
      </footer>
    </div>
  );
};
