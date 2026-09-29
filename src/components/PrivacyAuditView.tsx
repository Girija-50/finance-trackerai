import React, { useState } from 'react';
import { Lock, Unlock, Download, Plus, Cloud, ShieldCheck } from 'lucide-react';
import { PrivacyVaultItem, UserRealtimeWorkspace } from '../types';

interface Props {
  accessToken: string;
  activeOtpCode: string;
  workspace: UserRealtimeWorkspace;
  onUpdateWorkspace: (next: UserRealtimeWorkspace) => void;
}

export const PrivacyAuditView: React.FC<Props> = ({
  accessToken,
  activeOtpCode,
  workspace,
  onUpdateWorkspace,
}) => {
  // Feature 16: AES-256 Privacy Vault Decryption State
  const [vaultUnlocked, setVaultUnlocked] = useState(false);
  const [otpInput, setOtpInput] = useState(activeOtpCode);
  const [decryptedValues, setDecryptedValues] = useState<Record<string, string>>({});
  const [vaultError, setVaultError] = useState<string | null>(null);

  // New Vault Entry Form State
  const [newLabel, setNewLabel] = useState('');
  const [newType, setNewType] = useState<PrivacyVaultItem['fieldType']>('Account Number');
  const [newPlaintext, setNewPlaintext] = useState('');
  const [encrypting, setEncrypting] = useState(false);
  const [backupRunning, setBackupRunning] = useState(false);

  const handleCreateVaultItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLabel.trim() || !newPlaintext.trim()) return;
    setEncrypting(true);
    setVaultError(null);
    try {
      const res = await fetch('/api/data/vault', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          label: newLabel.trim(),
          fieldType: newType,
          plaintext: newPlaintext.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data.workspace) {
        onUpdateWorkspace(data.workspace);
        setNewLabel('');
        setNewPlaintext('');
      }
    } finally {
      setEncrypting(false);
    }
  };

  const handleToggleDecryptVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setVaultError(null);
    if (vaultUnlocked) {
      setVaultUnlocked(false);
      setDecryptedValues({});
      return;
    }

    const res = await fetch('/api/crypto/decrypt-vault', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ otpCode: otpInput }),
    });
    const data = await res.json();
    if (!res.ok) {
      setVaultError(data.error || 'Failed to verify 2FA OTP for vault decryption.');
      return;
    }

    setDecryptedValues(data.decryptedMap || {});
    setVaultUnlocked(true);
    if (data.workspace) {
      onUpdateWorkspace(data.workspace);
    }
  };

  const handleTriggerCloudBackup = async () => {
    setBackupRunning(true);
    try {
      const res = await fetch('/api/data/security-action', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: 'cloud-backup' }),
      });
      const data = await res.json();
      if (res.ok && data.workspace) {
        onUpdateWorkspace(data.workspace);
      }
    } finally {
      setBackupRunning(false);
    }
  };

  const handleExportAuditLog = () => {
    const headers = ['Time', 'Event', 'Actor', 'IP Address', 'Severity', 'Integrity Hash'];
    const rows = workspace.auditLogs.map((a) => [
      `"${a.time}"`,
      `"${a.event.replace(/"/g, '""')}"`,
      `"${a.actor}"`,
      `"${a.ipAddress}"`,
      a.severity,
      a.hash,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'forensic-audit-trail.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      {/* Section 1: Banking-Grade Security Posture & Encrypted Cloud Backup */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="border-b border-slate-200 pb-4 space-y-1.5">
          <div className="text-xs text-slate-500">
            Banking-Grade Security Architecture · Cryptographic Controls
          </div>
          <h2 className="text-base font-semibold text-slate-900">
            AES-256 Encryption, JWT + Refresh Tokens, 2FA & Encrypted Cloud Backup
          </h2>
          {/* Mandatory Two-Line Description */}
          <p className="text-xs text-slate-600 leading-relaxed">
            Enforces server-side AES-256-GCM authenticated encryption, HMAC-SHA256 JWT session tokens, and 6-digit Two-Factor Authorization across your entire financial profile.
            <br />
            Trigger an Encrypted Cloud Backup below to persist a fresh cryptographic snapshot of your real-time workspace.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-slate-500">Record Encryption</div>
            <div className="text-sm font-semibold text-slate-900 mt-1">AES-256-GCM Active</div>
            <div className="text-emerald-700 mt-1">12-byte IV + 16-byte Auth Tag</div>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-slate-500">Token Security</div>
            <div className="text-sm font-semibold text-slate-900 mt-1">JWT + Refresh Tokens</div>
            <div className="text-slate-600 mt-1">Signed Bearer session active</div>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg">
            <div className="text-slate-500">Multi-Factor Gate</div>
            <div className="text-sm font-semibold text-slate-900 mt-1">
              Password + 2FA OTP ({activeOtpCode})
            </div>
            <div className="text-slate-600 mt-1">Required for login & vault decryption</div>
          </div>
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg flex flex-col justify-between">
            <div>
              <div className="text-slate-500">Encrypted Cloud Backup</div>
              <div className="text-sm font-semibold text-slate-900 mt-1">
                {workspace.lastCloudBackup || 'No backup triggered yet'}
              </div>
            </div>
            <button
              type="button"
              onClick={handleTriggerCloudBackup}
              disabled={backupRunning}
              className="mt-2 px-3 py-1.5 text-xs font-semibold text-white bg-slate-900 rounded hover:bg-slate-800 inline-flex items-center gap-1.5 self-start cursor-pointer"
            >
              <Cloud className="w-3.5 h-3.5" />
              <span>{backupRunning ? 'Syncing...' : 'Run Encrypted Cloud Backup'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Section 2: Privacy Vault (Feature 16) */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="text-xs text-slate-500">Feature 16 · Zero-Knowledge Credential Storage</div>
            <h2 className="text-base font-semibold text-slate-900">
              AES-256 Privacy Vault (Account Number, UPI ID, PAN, Aadhaar, Card Details)
            </h2>
            {/* Mandatory Two-Line Description */}
            <p className="text-xs text-slate-600 leading-relaxed">
              Encrypts sensitive financial credentials (Account Number, UPI ID, PAN, Aadhaar, and Card Details) with server-side AES-256-GCM only when you add them.
              <br />
              Stored records remain masked by default and can only be decrypted by verifying your active 6-digit Two-Factor Authorization (2FA) code.
            </p>
          </div>

          <form onSubmit={handleToggleDecryptVault} className="flex flex-wrap items-center gap-2 shrink-0">
            {!vaultUnlocked && (
              <input
                type="text"
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                placeholder="2FA OTP Code"
                className="w-28 px-3 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg"
                title={`Active 2FA OTP: ${activeOtpCode}`}
                required
              />
            )}
            <button
              type="submit"
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer ${
                vaultUnlocked
                  ? 'bg-slate-100 text-slate-800 hover:bg-slate-200'
                  : 'bg-slate-900 text-white hover:bg-slate-800'
              }`}
            >
              {vaultUnlocked ? (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Vault (Mask Values)</span>
                </>
              ) : (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Verify 2FA & Decrypt Vault</span>
                </>
              )}
            </button>
          </form>
        </div>

        {vaultError && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
            {vaultError}
          </div>
        )}

        {/* Add New Encrypted Record Form */}
        <form
          onSubmit={handleCreateVaultItem}
          className="p-5 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end text-xs"
        >
          <div>
            <label className="block font-medium text-slate-700 mb-1">Credential Type</label>
            <select
              value={newType}
              onChange={(e) => setNewType(e.target.value as PrivacyVaultItem['fieldType'])}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
            >
              <option value="Account Number">Account Number</option>
              <option value="UPI ID">UPI ID</option>
              <option value="PAN">PAN</option>
              <option value="Aadhaar">Aadhaar (Optional)</option>
              <option value="Card Details">Card Details</option>
            </select>
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">Label</label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="e.g., Primary Savings Account"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              Sensitive Value (Encrypted with AES-256)
            </label>
            <input
              type="text"
              value={newPlaintext}
              onChange={(e) => setNewPlaintext(e.target.value)}
              placeholder="Enter sensitive number or ID..."
              className="w-full px-3 py-2 font-mono bg-white border border-slate-200 rounded-lg"
              required
            />
          </div>
          <div>
            <button
              type="submit"
              disabled={encrypting}
              className="w-full px-4 py-2 font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{encrypting ? 'Encrypting...' : 'Encrypt & Save to Vault'}</span>
            </button>
          </div>
        </form>

        {workspace.vaultItems.length === 0 ? (
          <div className="py-12 px-6 text-center text-xs text-slate-500">
            Your AES-256 Privacy Vault is empty (no sample credentials stored). Use the form above to encrypt and store your first credential.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-medium">
                  <th className="py-3 px-6">Label</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">
                    {vaultUnlocked ? 'Decrypted Cleartext (2FA Verified)' : 'Masked Value'}
                  </th>
                  <th className="py-3 px-4">AES-256-GCM Ciphertext & IV</th>
                  <th className="py-3 px-6 text-right">Algorithm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {workspace.vaultItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-6 font-semibold text-slate-900">{item.label}</td>
                    <td className="py-3.5 px-4 text-slate-600">{item.fieldType}</td>
                    <td className="py-3.5 px-4 font-mono tabular-nums">
                      {vaultUnlocked ? (
                        <span className="font-semibold text-emerald-700">
                          {decryptedValues[item.id] || item.maskedValue}
                        </span>
                      ) : (
                        <span className="text-slate-500">{item.maskedValue}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400 max-w-xs truncate">
                      {item.ciphertextHex.slice(0, 24)}... (IV: {item.ivHex})
                    </td>
                    <td className="py-3.5 px-6 text-right font-mono text-emerald-700 font-medium">
                      {item.algorithm}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Section 3: Permanent Forensic Audit Trail (Feature 17) */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="text-xs text-slate-500">Feature 17 · Digital Forensics Ledger</div>
            <h2 className="text-base font-semibold text-slate-900">
              Immutable Forensic Audit Trail
            </h2>
            {/* Mandatory Two-Line Description */}
            <p className="text-xs text-slate-600 leading-relaxed">
              Permanently records every real action you perform (2FA login, expense addition, token rotation, threat scan, and fraud alert) with an exact timestamp.
              <br />
              Each entry is sealed with a SHA-256 integrity hash and can be exported to CSV for digital forensics and compliance auditing.
            </p>
          </div>

          <button
            type="button"
            onClick={handleExportAuditLog}
            className="px-3.5 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 inline-flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Audit CSV</span>
          </button>
        </div>

        {workspace.auditLogs.length === 0 ? (
          <div className="py-10 px-6 text-center text-xs text-slate-500">
            No audit events recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-medium">
                  <th className="py-3 px-6">Time</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Authenticated Actor</th>
                  <th className="py-3 px-4">Origin IP</th>
                  <th className="py-3 px-4">Severity</th>
                  <th className="py-3 px-6 text-right">SHA-256 Hash</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {workspace.auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-6 font-mono tabular-nums font-medium text-slate-800 whitespace-nowrap">
                      {log.time}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">{log.event}</td>
                    <td className="py-3 px-4 text-slate-600">{log.actor}</td>
                    <td className="py-3 px-4 font-mono text-slate-500">{log.ipAddress}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`font-semibold ${
                          log.severity === 'Critical'
                            ? 'text-red-700'
                            : log.severity === 'Security'
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                        }`}
                      >
                        {log.severity}
                      </span>
                    </td>
                    <td className="py-3 px-6 text-right font-mono text-slate-400 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        {log.hash}
                      </span>
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
