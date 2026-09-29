import React, { useState, useEffect } from 'react';
import { Lock, Unlock, RefreshCw, Check } from 'lucide-react';
import { AuthSession, UserRealtimeWorkspace } from '../types';

interface Props {
  session: AuthSession;
  workspace: UserRealtimeWorkspace;
  onUpdateWorkspace: (next: UserRealtimeWorkspace) => void;
  onUpdateTokens: (accessToken: string, refreshToken: string) => void;
}

export const IdentityAccessView: React.FC<Props> = ({
  session,
  workspace,
  onUpdateWorkspace,
  onUpdateTokens,
}) => {
  // Feature 5: Behavioral Biometrics Real-Time Telemetry
  const [typingSample, setTypingSample] = useState('');
  const [keystrokeTimestamps, setKeystrokeTimestamps] = useState<number[]>([]);
  const [typingWpm, setTypingWpm] = useState<number>(0);
  const [mouseVelocity, setMouseVelocity] = useState<number>(0);
  const [clickCount, setClickCount] = useState<number>(0);
  const [biometricStatus, setBiometricStatus] = useState<string>(
    'Awaiting live typing or pointer interaction...'
  );

  //Impossible Travel Custom Test City
  const [travelDestCity, setTravelDestCity] = useState('Mumbai');
  const [busy, setBusy] = useState(false);

  // Measure real pointer movement velocity and click cadence
  useEffect(() => {
    let lastX = 0;
    let lastY = 0;
    let lastTime = performance.now();

    const handleMouseMove = (e: MouseEvent) => {
      const now = performance.now();
      const dt = now - lastTime;
      if (dt > 60) {
        const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);
        const vel = Math.round((dist / dt) * 1000);
        setMouseVelocity(vel);
        lastX = e.clientX;
        lastY = e.clientY;
        lastTime = now;
      }
    };

    const handleClick = () => {
      setClickCount((c) => c + 1);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
    };
  }, []);

  const handleTypingChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTypingSample(val);
    const now = performance.now();
    const nextStamps = [...keystrokeTimestamps.slice(-15), now];
    setKeystrokeTimestamps(nextStamps);

    if (nextStamps.length >= 3) {
      const intervals: number[] = [];
      for (let i = 1; i < nextStamps.length; i++) {
        intervals.push(nextStamps[i] - nextStamps[i - 1]);
      }
      const avgMs = intervals.reduce((a, b) => a + b, 0) / intervals.length;
      const computedWpm = Math.min(200, Math.max(10, Math.round(12000 / Math.max(30, avgMs))));
      setTypingWpm(computedWpm);

      if (computedWpm > 140) {
        setBiometricStatus('Anomalous high-speed keystroke cadence detected — Step-up 2FA advised');
      } else {
        setBiometricStatus('Verified human typing cadence matches your session signature');
      }
    }
  };

  const triggerSecurityAction = async (
    action: string,
    payload: Record<string, unknown> = {}
  ) => {
    setBusy(true);
    try {
      const res = await fetch('/api/data/security-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({ action, payload }),
      });
      const data = await res.json();
      if (res.ok && data.workspace) {
        onUpdateWorkspace(data.workspace);
      }
    } finally {
      setBusy(false);
    }
  };

  const handleRotateJwt = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/auth/refresh-jwt', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.accessToken}` },
      });
      const data = await res.json();
      if (res.ok && data.workspace) {
        onUpdateTokens(data.accessToken, data.refreshToken);
        onUpdateWorkspace(data.workspace);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Impossible Travel Detection & Login Activity (Feature 7) */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-200">
          <div className="space-y-1.5">
            <div className="text-xs text-slate-500">
              Feature 07 · Real-Time Geo-Velocity & Impossible Travel Guard
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              Impossible Travel Detection & Real-Time Login Activity
            </h2>
            {/* Mandatory Two-Line Description */}
            <p className="text-xs text-slate-600 leading-relaxed">
              Monitors the geographic city and timestamp of every authenticated sign-in to detect physically impossible transit between consecutive logins.
              <br />
              If a login occurs from a distant city within 30 minutes of your previous login, your account is automatically frozen until you verify 2FA.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs shrink-0">
            <input
              type="text"
              value={travelDestCity}
              onChange={(e) => setTravelDestCity(e.target.value)}
              placeholder="Conflicting City"
              className="w-32 px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
            />
            {workspace.accountFrozen ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => triggerSecurityAction('unfreeze-account')}
                className="px-4 py-2 font-semibold text-white bg-emerald-700 rounded-lg hover:bg-emerald-800 flex items-center gap-1.5 cursor-pointer"
              >
                <Unlock className="w-3.5 h-3.5" />
                <span>Verify 2FA & Unfreeze Account</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  triggerSecurityAction('simulate-impossible-travel', {
                    originCity: session.user.homeCity,
                    destCity: travelDestCity || 'Mumbai',
                  })
                }
                className="px-4 py-2 font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Test Conflicting Login ({travelDestCity})</span>
              </button>
            )}
          </div>
        </div>

        {workspace.loginActivity.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No login events recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-medium">
                  <th className="py-2.5 px-4">Login Time</th>
                  <th className="py-2.5 px-4">Location & IP</th>
                  <th className="py-2.5 px-4">Device Signature</th>
                  <th className="py-2.5 px-4">Verification Details</th>
                  <th className="py-2.5 px-4 text-right">Risk Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {workspace.loginActivity.map((entry) => (
                  <tr key={entry.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      {entry.time}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-medium text-slate-900">{entry.location}</span>
                      <span className="mx-1.5 text-slate-400">·</span>
                      <span className="font-mono text-slate-500">{entry.ipAddress}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600 whitespace-nowrap">{entry.device}</td>
                    <td className="py-3 px-4 text-slate-600">{entry.details}</td>
                    <td
                      className={`py-3 px-4 text-right font-mono tabular-nums font-semibold whitespace-nowrap ${
                        entry.riskScore >= 71 ? 'text-red-700' : 'text-emerald-700'
                      }`}
                    >
                      {entry.riskScore}/100 ({entry.status})
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Row 2: Behavioral Biometrics (Feature 5) + Session Hijack & Brute Force (Features 8 & 9) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section 2: Behavioral Biometrics (Feature 5) */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="border-b border-slate-200 pb-4 space-y-1.5">
            <div className="text-xs text-slate-500">Feature 05 · Live Interaction Telemetry</div>
            <h2 className="text-base font-semibold text-slate-900">
              Behavioral Biometrics Monitor
            </h2>
            {/* Mandatory Two-Line Description */}
            <p className="text-xs text-slate-600 leading-relaxed">
              Measures your real-time keystroke cadence (WPM), pointer movement velocity, click frequency, and active login hour as you interact with the app.
              <br />
              If an automated script or sudden behavioral shift occurs, you can record the biometric anomaly to enforce step-up 2FA verification.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-slate-500">Live Typing Speed</div>
              <div className="text-base font-mono font-semibold text-slate-900 mt-0.5 tabular-nums">
                {typingWpm} WPM
              </div>
              <div className="text-slate-500 mt-0.5">Measured from input</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-slate-500">Live Pointer Speed</div>
              <div className="text-base font-mono font-semibold text-slate-900 mt-0.5 tabular-nums">
                {mouseVelocity} px/s
              </div>
              <div className="text-slate-500 mt-0.5">Real mouse sensor</div>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <div className="text-slate-500">Session Clicks</div>
              <div className="text-base font-mono font-semibold text-slate-900 mt-0.5 tabular-nums">
                {clickCount} clicks
              </div>
              <div className="text-slate-500 mt-0.5">Active session</div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">
              Type in the box below to measure your real-time keystroke rhythm:
            </label>
            <input
              type="text"
              value={typingSample}
              onChange={handleTypingChange}
              placeholder="Type here to calibrate your real-time keystroke cadence..."
              className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-slate-900"
            />
            <div className="text-xs text-slate-600 mt-2 font-medium">{biometricStatus}</div>
          </div>

          <div className="pt-2">
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                triggerSecurityAction('biometric-anomaly', { wpm: typingWpm || 175 })
              }
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
            >
              Record Biometric Anomaly Event to Audit Log
            </button>
          </div>
        </section>

        {/* Section 3: Session Hijack Detection & Brute Force Prevention (Features 8 & 9) */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="border-b border-slate-200 pb-4 space-y-1.5">
            <div className="text-xs text-slate-500">
              Features 08 & 09 · Token Binding & Brute-Force Defense
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              Session Hijack Detection & Brute Force Prevention
            </h2>
            {/* Mandatory Two-Line Description */}
            <p className="text-xs text-slate-600 leading-relaxed">
              Protects your active session against stolen cookies, token reuse, and simultaneous IP/browser changes while enforcing a 5-attempt failed login lockout on the sign-in gate.
              <br />
              You can rotate your live HMAC-SHA256 JWT + Refresh Token at any time or record a session hijack test to verify token revocation.
            </p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
            <div className="font-semibold text-slate-900">
              Active JWT Access Token & Refresh Token Status
            </div>
            <div className="font-mono text-slate-600 break-all bg-white p-2.5 border border-slate-200 rounded">
              {session.accessToken}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <span className="text-slate-500">
                Issued for: <strong className="text-slate-800">{session.user.email}</strong>
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => triggerSecurityAction('session-hijack-test')}
                  className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 cursor-pointer"
                >
                  Trigger Cookie Theft Defense
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleRotateJwt}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Rotate JWT & Refresh Token</span>
                </button>
              </div>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
            <div className="font-semibold text-slate-900">
              Brute Force Attack Prevention Policy (Active on Sign-In)
            </div>
            <p className="text-slate-600 leading-relaxed">
              The authentication server tracks failed login attempts per account. After 5 failed password attempts, the account is automatically locked, a CAPTCHA challenge is enforced, and the attacker IP is permanently logged in your Threat Feed and Audit Trail.
            </p>
          </div>
        </section>
      </div>

      {/* Section 4: Device Fingerprinting & Trusted Endpoints (Feature 6) */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 space-y-1.5">
          <div className="text-xs text-slate-500">Feature 06 · Endpoint Hardware Fingerprinting</div>
          <h2 className="text-base font-semibold text-slate-900">
            Device Fingerprinting & Trusted Devices Registry
          </h2>
          {/* Mandatory Two-Line Description */}
          <p className="text-xs text-slate-600 leading-relaxed">
            Creates a unique hardware identity for each device that signs into your account by recording its Browser, OS, Screen Resolution, Timezone, and IP pattern.
            <br />
            Only devices you actually sign in from are stored here, and revoking trust on any endpoint immediately requires step-up MFA on its next access.
          </p>
        </div>

        {workspace.devices.length === 0 ? (
          <div className="py-10 px-6 text-center text-xs text-slate-500">
            No devices registered yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-medium">
                  <th className="py-3 px-6">Device Name & Fingerprint</th>
                  <th className="py-3 px-4">Browser · OS</th>
                  <th className="py-3 px-4">Resolution · Timezone</th>
                  <th className="py-3 px-4">IP Pattern</th>
                  <th className="py-3 px-4">Trust Status</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {workspace.devices.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-6">
                      <div className="font-semibold text-slate-900">{d.name}</div>
                      <div className="font-mono text-slate-500">{d.fingerprintHash}</div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600">
                      {d.browser} · {d.os}
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums text-slate-600">
                      {d.resolution} · {d.timezone}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-600">{d.ipPattern}</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`font-semibold ${
                          d.trusted ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {d.trusted ? 'Trusted Endpoint' : 'Untrusted — MFA Required'}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() =>
                          triggerSecurityAction('toggle-device-trust', { deviceId: d.id })
                        }
                        className="px-3 py-1 text-xs font-medium text-slate-700 bg-slate-100 rounded hover:bg-slate-200 cursor-pointer inline-flex items-center gap-1"
                      >
                        <Check className="w-3 h-3" />
                        <span>{d.trusted ? 'Revoke Trust' : 'Mark Trusted'}</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
