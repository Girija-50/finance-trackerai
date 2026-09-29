import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  MessageSquareWarning,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Search,
  Download,
  LogOut,
  X,
} from 'lucide-react';
import {
  AuthSession,
  CurrencyCode,
  RiskLevel,
  TransactionType,
  UserRealtimeWorkspace,
  WorkspaceView,
} from './types';
import {
  ACCOUNTS,
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  createEmptyWorkspace,
} from './data/initialData';
import { AuthGateView } from './components/AuthGateView';
import { ScamChatbotDrawer } from './components/ScamChatbotDrawer';
import { ThreatScannersView } from './components/ThreatScannersView';
import { IdentityAccessView } from './components/IdentityAccessView';
import { PrivacyAuditView } from './components/PrivacyAuditView';
import { FraudTwinView } from './components/FraudTwinView';

const SESSION_STORAGE_KEY = 'ft_realtime_auth_session_v1';
const OTP_STORAGE_KEY = 'ft_realtime_active_otp_v1';

const CURRENCY_RATES: Record<
  CurrencyCode,
  { symbol: string; rateFromInr: number; locale: string }
> = {
  [CurrencyCode.INR]: { symbol: '₹', rateFromInr: 1, locale: 'en-IN' },
  [CurrencyCode.USD]: { symbol: '$', rateFromInr: 0.012, locale: 'en-US' },
  [CurrencyCode.EUR]: { symbol: '€', rateFromInr: 0.011, locale: 'de-DE' },
};

export function App() {
  // Authentication & Session State
  const [session, setSession] = useState<AuthSession | null>(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [activeOtpCode, setActiveOtpCode] = useState<string>(() => {
    try {
      return sessionStorage.getItem(OTP_STORAGE_KEY) || '';
    } catch {
      return '';
    }
  });

  const [workspace, setWorkspace] = useState<UserRealtimeWorkspace>(() =>
    createEmptyWorkspace()
  );

  // Navigation & UI Modals
  const [activeView, setActiveView] = useState<WorkspaceView>('dashboard');
  const [isChatbotOpen, setIsChatbotOpen] = useState<boolean>(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [currency, setCurrency] = useState<CurrencyCode>(CurrencyCode.INR);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | RiskLevel>('ALL');

  // New Transaction Form State
  const [formDesc, setFormDesc] = useState('');
  const [formMerchant, setFormMerchant] = useState('');
  const [formCategory, setFormCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [formAccount, setFormAccount] = useState(ACCOUNTS[0]);
  const [formLocation, setFormLocation] = useState('Chennai');
  const [formDevice, setFormDevice] = useState('Authenticated Browser Session (Trusted)');
  const [formTime, setFormTime] = useState(() =>
    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
  const [formType, setFormType] = useState<TransactionType>(TransactionType.EXPENSE);
  const [formAmount, setFormAmount] = useState('');
  const [submittingTxn, setSubmittingTxn] = useState(false);

  // Fetch user's real-time workspace on session mount
  useEffect(() => {
    if (!session?.accessToken) return;
    fetch('/api/data/workspace', {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error('Session expired');
        return res.json();
      })
      .then((data) => {
        if (data.workspace) {
          setWorkspace(data.workspace);
        }
        if (data.currentOtpForVault) {
          setActiveOtpCode(data.currentOtpForVault);
        }
        if (data.user?.homeCity) {
          setFormLocation(data.user.homeCity);
        }
      })
      .catch(() => {
        setSession(null);
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
      });
  }, [session?.accessToken]);

  const handleAuthenticated = (
    newSession: AuthSession,
    userWorkspace: UserRealtimeWorkspace,
    otp: string
  ) => {
    setSession(newSession);
    setWorkspace(userWorkspace);
    setActiveOtpCode(otp);
    setFormLocation(newSession.user.homeCity || 'Chennai');
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(newSession));
      sessionStorage.setItem(OTP_STORAGE_KEY, otp);
    } catch {
      // Ignore storage errors
    }
  };

  const handleSignOut = () => {
    setSession(null);
    setWorkspace(createEmptyWorkspace());
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(OTP_STORAGE_KEY);
  };

  const formatMoney = (inrAmount: number, showSign = false): string => {
    const cfg = CURRENCY_RATES[currency];
    const converted = inrAmount * cfg.rateFromInr;
    const formatted = new Intl.NumberFormat(cfg.locale, {
      style: 'currency',
      currency,
      minimumFractionDigits: currency === CurrencyCode.INR ? 0 : 2,
      maximumFractionDigits: currency === CurrencyCode.INR ? 0 : 2,
    }).format(Math.abs(converted));

    if (!showSign) {
      return converted < 0 ? `-${formatted}` : formatted;
    }
    if (converted > 0) return `+${formatted}`;
    if (converted < 0) return `-${formatted}`;
    return formatted;
  };

  // Real-time Dashboard Metrics computed strictly from user's logged data
  const dashboardMetrics = useMemo(() => {
    let monthlyExpenses = 0;
    let monthlyIncome = 0;
    let safeExpenses = 0;
    let fraudAlertsCount = 0;

    for (const t of workspace.transactions) {
      if (t.type === TransactionType.EXPENSE) {
        monthlyExpenses += t.amount;
        if (t.riskScore < 71) {
          safeExpenses += t.amount;
        }
      } else {
        monthlyIncome += t.amount;
      }
      if (t.riskScore >= 50 || t.flaggedFraud) {
        fraudAlertsCount += 1;
      }
    }

    const trustedCount = workspace.devices.filter((d) => d.trusted).length;
    const untrustedCount = workspace.devices.length - trustedCount;
    const criticalThreats = workspace.threats.filter((th) => th.riskScore >= 71).length;

    const aiSecurityScore = Math.max(
      40,
      Math.min(
        100,
        100 -
          untrustedCount * 8 -
          criticalThreats * 5 -
          (workspace.accountFrozen ? 15 : 0)
      )
    );

    return {
      monthlyExpenses,
      monthlyIncome,
      safeExpenses,
      fraudAlertsCount,
      aiSecurityScore,
      trustedCount,
      untrustedCount,
    };
  }, [workspace]);

  // Real-Time Dynamic AI Recommendations based on actual user workspace state
  const liveRecommendations = useMemo(() => {
    const recs: Array<{
      id: string;
      priority: string;
      title: string;
      description: string;
      actionLabel: string;
      targetView: WorkspaceView;
    }> = [];

    if (workspace.accountFrozen) {
      recs.push({
        id: 'rec-freeze',
        priority: 'Urgent Security Action',
        title: 'Resolve Impossible Travel Account Freeze',
        description:
          'Your account outflows are currently paused due to conflicting login locations. Verify your 2FA status in Identity & Access to unfreeze.',
        actionLabel: 'Open Identity & Access',
        targetView: 'identity',
      });
    }

    if (workspace.transactions.length === 0) {
      recs.push({
        id: 'rec-train-twin',
        priority: 'Digital Twin Calibration',
        title: 'Log Your First Real Transaction to Train Your Digital Twin',
        description:
          'Your Digital Twin starts with zero sample data. Record your normal daily expenses so the AI Fraud Engine learns your spending range and favorite merchants.',
        actionLabel: 'Log First Transaction',
        targetView: 'fraud-twin',
      });
    } else if (dashboardMetrics.fraudAlertsCount > 0) {
      recs.push({
        id: 'rec-fraud-review',
        priority: 'High-Risk Anomaly',
        title: `Inspect ${dashboardMetrics.fraudAlertsCount} Flagged Transaction(s) with Explainable AI`,
        description:
          'One or more logged transactions deviated significantly from your Digital Twin baseline. Review the XAI breakdown in Fraud & Twin AI.',
        actionLabel: 'Review in Fraud & Twin AI',
        targetView: 'fraud-twin',
      });
    }

    if (workspace.vaultItems.length === 0) {
      recs.push({
        id: 'rec-vault',
        priority: 'Privacy Protection',
        title: 'Encrypt Sensitive Identifiers in the AES-256 Privacy Vault',
        description:
          'Store your bank account number, UPI ID, PAN, or card details using server-side AES-256-GCM encryption protected by your 2FA OTP.',
        actionLabel: 'Open Privacy Vault',
        targetView: 'privacy-audit',
      });
    }

    if (
      workspace.phishingScans.length === 0 &&
      workspace.qrScans.length === 0 &&
      workspace.receiptScans.length === 0
    ) {
      recs.push({
        id: 'rec-scanners',
        priority: 'Proactive Threat Defense',
        title: 'Verify Suspicious SMS Links, UPI QR Codes & GST Invoices',
        description:
          'Use the AI Threat Scanners before authorizing unknown UPI collect requests or clicking bank KYC links.',
        actionLabel: 'Open Threat Scanners',
        targetView: 'scanners',
      });
    }

    return recs;
  }, [workspace, dashboardMetrics.fraudAlertsCount]);

  const filteredLedger = useMemo(() => {
    return workspace.transactions.filter((t) => {
      if (riskFilter !== 'ALL' && t.riskLevel !== riskFilter) return false;
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        return (
          t.description.toLowerCase().includes(q) ||
          t.merchant.toLowerCase().includes(q) ||
          t.location.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [workspace.transactions, riskFilter, searchQuery]);

  const handleCreateTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) return;
    const numAmount = parseFloat(formAmount);
    if (isNaN(numAmount) || numAmount <= 0 || !formMerchant.trim()) return;

    setSubmittingTxn(true);
    try {
      const res = await fetch('/api/data/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          description: formDesc.trim() || `${formCategory} at ${formMerchant.trim()}`,
          merchant: formMerchant.trim(),
          category: formCategory,
          account: formAccount,
          location: formLocation.trim() || session.user.homeCity,
          device: formDevice,
          time: formTime,
          type: formType,
          amount: numAmount,
        }),
      });
      const data = await res.json();
      if (res.ok && data.workspace) {
        setWorkspace(data.workspace);
        setFormDesc('');
        setFormMerchant('');
        setFormAmount('');
        setIsLogModalOpen(false);
      }
    } finally {
      setSubmittingTxn(false);
    }
  };

  const handleUnfreezeAccount = async () => {
    if (!session) return;
    const res = await fetch('/api/data/security-action', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({ action: 'unfreeze-account' }),
    });
    const data = await res.json();
    if (res.ok && data.workspace) {
      setWorkspace(data.workspace);
    }
  };

  const handleExportLedgerCSV = () => {
    const headers = [
      'ID',
      'Date',
      'Time',
      'Location',
      'Merchant',
      'Description',
      'Category',
      'Amount_INR',
      'Risk_Score',
      'Risk_Level',
      'XAI_Explanation',
    ];
    const rows = workspace.transactions.map((t) => [
      t.id,
      t.date,
      t.time,
      `"${t.location}"`,
      `"${t.merchant}"`,
      `"${t.description}"`,
      `"${t.category}"`,
      t.amount,
      t.riskScore,
      t.riskLevel,
      `"${t.xaiReasons.join(' | ').replace(/"/g, '""')}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'realtime-finance-ledger.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Render Sign Up / Log In + Two-Factor Authorization Gate if not authenticated
  if (!session) {
    return <AuthGateView onAuthenticated={handleAuthenticated} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3.5 flex items-center justify-between">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#dashboard"
          onClick={(e) => {
            e.preventDefault();
            setActiveView('dashboard');
          }}
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap"
        >
          SpendVista
        </a>

        {/* Zone 2: 5 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveView('dashboard')}
            className={`py-1 transition-colors whitespace-nowrap border-b-2 cursor-pointer ${
              activeView === 'dashboard'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Security Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveView('fraud-twin')}
            className={`py-1 transition-colors whitespace-nowrap border-b-2 cursor-pointer ${
              activeView === 'fraud-twin'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Fraud & Twin AI
          </button>
          <button
            type="button"
            onClick={() => setActiveView('scanners')}
            className={`py-1 transition-colors whitespace-nowrap border-b-2 cursor-pointer ${
              activeView === 'scanners'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Threat Scanners
          </button>
          <button
            type="button"
            onClick={() => setActiveView('identity')}
            className={`py-1 transition-colors whitespace-nowrap border-b-2 cursor-pointer ${
              activeView === 'identity'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Identity & Access
          </button>
          <button
            type="button"
            onClick={() => setActiveView('privacy-audit')}
            className={`py-1 transition-colors whitespace-nowrap border-b-2 cursor-pointer ${
              activeView === 'privacy-audit'
                ? 'border-slate-900 text-slate-900 font-semibold'
                : 'border-transparent hover:text-slate-900'
            }`}
          >
            Privacy & Audit
          </button>
        </nav>

        {/* Zone 3: 2 Primary Actions */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsChatbotOpen(true)}
            className="px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
          >
            <MessageSquareWarning className="w-3.5 h-3.5" />
            <span>AI Scam Chatbot</span>
          </button>
          <button
            type="button"
            onClick={() => setIsLogModalOpen((prev) => !prev)}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Log Transaction</span>
          </button>
        </div>
      </header>

      {/* Mobile Navigation Bar */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center gap-2 overflow-x-auto">
        {(
          [
            ['dashboard', 'Security Dashboard'],
            ['fraud-twin', 'Fraud & Twin AI'],
            ['scanners', 'Threat Scanners'],
            ['identity', 'Identity & Access'],
            ['privacy-audit', 'Privacy & Audit'],
          ] as Array<[WorkspaceView, string]>
        ).map(([view, label]) => (
          <button
            key={view}
            type="button"
            onClick={() => setActiveView(view)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
              activeView === view
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Main Content Container */}
      <main className="flex-1 w-full max-w-[1380px] mx-auto px-6 py-8 space-y-8">
        {/* Impossible Travel Active Alert Banner */}
        {workspace.accountFrozen && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-start sm:items-center gap-2.5 text-red-900">
              <Lock className="w-4 h-4 text-red-700 shrink-0 mt-0.5 sm:mt-0" />
              <div>
                <span className="font-semibold">Impossible Travel Freeze Active:</span>{' '}
                <span>
                  A conflicting login location was detected within 30 minutes of your previous session. Verify 2FA to unfreeze account outflows.
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleUnfreezeAccount}
              className="px-3 py-1.5 font-semibold text-white bg-red-700 rounded-lg hover:bg-red-800 flex items-center gap-1 cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <Unlock className="w-3.5 h-3.5" />
              <span>Verify 2FA & Unfreeze</span>
            </button>
          </div>
        )}

        {/* Workspace Context Header with Two-Line Description */}
        <section className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-6 border-b border-slate-200">
          <div className="space-y-1.5 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span>Authenticated User: {session.user.name} ({session.user.email})</span>
              <span aria-hidden="true">·</span>
              <span>Home City: {session.user.homeCity}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">Active 2FA Vault Key: {activeOtpCode}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
              {activeView === 'dashboard' && 'Real-Time AI Security & Financial Dashboard'}
              {activeView === 'fraud-twin' &&
                'AI Fraud Detection Engine, Digital Twin & Explainable AI'}
              {activeView === 'scanners' &&
                'AI Phishing SMS, Fake QR & OCR Invoice Scanners'}
              {activeView === 'identity' &&
                'Behavioral Biometrics, Device Fingerprinting & Access Defense'}
              {activeView === 'privacy-audit' &&
                'AES-256 Privacy Vault & Immutable Forensic Audit Trail'}
            </h1>
            {/* Mandatory Two-Line Description for Top Workspace Section */}
            <p className="text-xs text-slate-600 leading-relaxed">
              Operates in strict real-time mode with zero pre-populated sample data—every metric, risk graph, and forensic record reflects only the actions you take.
              <br />
              Protected continuously by 2FA authentication, HMAC-SHA256 JWT tokens, device fingerprinting, and real-time AI threat analysis.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
              {([CurrencyCode.INR, CurrencyCode.USD, CurrencyCode.EUR] as CurrencyCode[]).map(
                (code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setCurrency(code)}
                    className={`px-2.5 py-1 text-xs font-mono font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      currency === code
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {code} ({CURRENCY_RATES[code].symbol})
                  </button>
                )
              )}
            </div>

            <button
              type="button"
              onClick={handleExportLedgerCSV}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={handleSignOut}
              className="px-3.5 py-1.5 text-xs font-medium text-red-700 bg-white border border-slate-200 rounded-lg hover:bg-red-50 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </section>

        {/* Inline Log Transaction Modal / Drawer */}
        {isLogModalOpen && (
          <section className="bg-white border border-slate-300 rounded-xl p-6 space-y-4">
            <div className="flex items-start justify-between pb-3 border-b border-slate-200">
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-slate-900">
                  Record Real-Time Transaction with Live AI Fraud Scoring
                </h2>
                {/* Mandatory Two-Line Description */}
                <p className="text-xs text-slate-600 leading-relaxed">
                  Submits your income or expense entry to the AI Fraud Detection Engine to calculate a real-time 0–100 Dynamic Cyber Risk Score before storing it.
                  <br />
                  Automatically updates your Digital Twin behavioral baseline, Merchant Trust Registry, and Forensic Audit Trail upon submission.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsLogModalOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTransaction} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Type</label>
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => {
                        setFormType(TransactionType.EXPENSE);
                        setFormCategory(EXPENSE_CATEGORIES[0]);
                      }}
                      className={`py-1.5 font-medium rounded-md cursor-pointer ${
                        formType === TransactionType.EXPENSE
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600'
                      }`}
                    >
                      Expense (-)
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setFormType(TransactionType.INCOME);
                        setFormCategory(INCOME_CATEGORIES[0]);
                      }}
                      className={`py-1.5 font-medium rounded-md cursor-pointer ${
                        formType === TransactionType.INCOME
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600'
                      }`}
                    >
                      Income (+)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Amount (₹ INR)
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    placeholder="e.g., 650 or 30000"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    className="w-full px-3 py-2 font-mono tabular-nums bg-white border border-slate-200 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    City / Location
                  </label>
                  <input
                    type="text"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    placeholder="e.g., Chennai or Delhi"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Time (24h)</label>
                  <input
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    className="w-full px-3 py-2 font-mono bg-white border border-slate-200 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Merchant Counterparty
                  </label>
                  <input
                    type="text"
                    value={formMerchant}
                    onChange={(e) => setFormMerchant(e.target.value)}
                    placeholder="e.g., Metro Store or Unknown Shop"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    required
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={formDesc}
                    onChange={(e) => setFormDesc(e.target.value)}
                    placeholder="e.g., Dinner or Electronics"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  >
                    {(formType === TransactionType.EXPENSE
                      ? EXPENSE_CATEGORIES
                      : INCOME_CATEGORIES
                    ).map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Device Context</label>
                  <select
                    value={formDevice}
                    onChange={(e) => setFormDevice(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                  >
                    <option value="Authenticated Browser Session (Trusted)">
                      Authenticated Browser Session (Trusted)
                    </option>
                    <option value="Unknown Device · Untrusted Endpoint">
                      Unknown Device · Untrusted Endpoint
                    </option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="px-4 py-2 font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingTxn}
                  className="px-5 py-2 font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer disabled:opacity-50"
                >
                  {submittingTxn
                    ? 'Scoring with AI Fraud Engine...'
                    : 'Evaluate & Save Transaction'}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* VIEW 1: HOMEPAGE SECURITY DASHBOARD */}
        {activeView === 'dashboard' && (
          <div className="space-y-8">
            {/* Dashboard Section 1: Core Security & Financial Posture Summary */}
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 space-y-1">
                <h2 className="text-base font-semibold text-slate-900">
                  01. Real-Time Security & Expense Posture Summary
                </h2>
                {/* Mandatory Two-Line Description */}
                <p className="text-xs text-slate-600 leading-relaxed">
                  Aggregates your live AI Security Score, total monthly expenses, active fraud alerts, and verified device endpoints in real time.
                  <br />
                  All four indicators start at zero/baseline upon registration and update dynamically as you record transactions or run security checks.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
                <div className="p-5">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span>AI Security Score</span>
                    <span className="text-emerald-700 font-medium">2FA · AES-256</span>
                  </div>
                  <div className="text-2xl font-mono font-bold tabular-nums text-slate-900">
                    {dashboardMetrics.aiSecurityScore}/100
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Computed from active threats & device trust
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span>Monthly Expenses</span>
                    <span>Real-Time Total</span>
                  </div>
                  <div className="text-2xl font-mono font-bold tabular-nums text-slate-900">
                    {formatMoney(dashboardMetrics.monthlyExpenses)}
                  </div>
                  <div className="mt-2 text-xs text-slate-500 font-mono tabular-nums">
                    {workspace.transactions.length} logged transaction(s)
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span>Fraud Alerts</span>
                    <span
                      className={
                        dashboardMetrics.fraudAlertsCount > 0
                          ? 'text-red-700 font-semibold'
                          : 'text-emerald-700'
                      }
                    >
                      {dashboardMetrics.fraudAlertsCount > 0 ? 'Review Needed' : 'All Clear'}
                    </span>
                  </div>
                  <div
                    className={`text-2xl font-mono font-bold tabular-nums ${
                      dashboardMetrics.fraudAlertsCount > 0
                        ? 'text-red-700'
                        : 'text-slate-900'
                    }`}
                  >
                    {dashboardMetrics.fraudAlertsCount} Alert(s)
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Flagged by AI Fraud Detection Engine
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                    <span>Trusted Devices</span>
                    <span>Fingerprinting</span>
                  </div>
                  <div className="text-2xl font-mono font-bold tabular-nums text-slate-900">
                    {dashboardMetrics.trustedCount} Trusted
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    {dashboardMetrics.untrustedCount} untrusted endpoint(s)
                  </div>
                </div>
              </div>
            </section>

            {/* Row 2: Risk Trend Graph + Recent Threats */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Dashboard Section 2: Risk Trend Graph */}
              <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between pb-4 mb-5 border-b border-slate-200 gap-4">
                    <div className="space-y-1">
                      <h2 className="text-base font-semibold text-slate-900">
                        02. Dynamic Cyber Risk Score Trend Graph (0–100)
                      </h2>
                      {/* Mandatory Two-Line Description */}
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Visualizes the real-time 0–100 security risk score assigned to each transaction you record (Safe ≤ 30, Medium 31–70, Critical 71–100).
                        <br />
                        Populates exclusively as you log transactions and links each bar directly to its Explainable AI (XAI) reasoning.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveView('fraud-twin')}
                      className="text-xs font-medium text-slate-700 hover:text-slate-900 underline underline-offset-4 shrink-0 cursor-pointer"
                    >
                      Open Fraud AI
                    </button>
                  </div>

                  {workspace.transactions.length === 0 ? (
                    <div className="py-12 text-center space-y-3">
                      <p className="text-xs text-slate-500">
                        No transactions logged yet. Log your first transaction to generate your live Risk Score Trend Graph.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsLogModalOpen(true)}
                        className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
                      >
                        + Log First Transaction
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {workspace.transactions.slice(0, 6).map((t) => {
                        const barColor =
                          t.riskScore >= 71
                            ? 'bg-red-600'
                            : t.riskScore >= 31
                            ? 'bg-amber-500'
                            : 'bg-emerald-600';

                        return (
                          <div key={t.id} className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <div className="flex items-center gap-2 truncate">
                                <span className="font-mono text-slate-500">{t.date}</span>
                                <span aria-hidden="true">·</span>
                                <span className="font-semibold text-slate-900">{t.merchant}</span>
                                <span aria-hidden="true">·</span>
                                <span className="text-slate-500">{t.location}</span>
                                <span aria-hidden="true">·</span>
                                <span className="font-mono font-medium text-slate-800">
                                  {formatMoney(t.amount)}
                                </span>
                              </div>
                              <span
                                className={`font-mono font-bold tabular-nums shrink-0 ${
                                  t.riskScore >= 71
                                    ? 'text-red-700'
                                    : t.riskScore >= 31
                                    ? 'text-amber-700'
                                    : 'text-emerald-700'
                                }`}
                              >
                                Score: {t.riskScore} ({t.riskLevel})
                              </span>
                            </div>
                            <div className="w-full h-2.5 bg-slate-100 rounded-sm overflow-hidden">
                              <div
                                className={`h-full transition-transform duration-150 origin-left ${barColor}`}
                                style={{ width: `${Math.max(5, t.riskScore)}%` }}
                              />
                            </div>
                            <div className="text-[11px] text-slate-500 truncate">
                              XAI: {t.xaiReasons[0]}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <span>Digital Twin Home City: {session.user.homeCity}</span>
                  <span className="font-mono">0–30 Safe · 31–70 Medium · 71–100 Critical</span>
                </div>
              </section>

              {/* Dashboard Section 3: Recent Threats */}
              <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between pb-4 mb-4 border-b border-slate-200 gap-4">
                    <div className="space-y-1">
                      <h2 className="text-base font-semibold text-slate-900">
                        03. Recent Threats & Intercepts
                      </h2>
                      {/* Mandatory Two-Line Description */}
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Lists high-risk anomalies, phishing links, fake QR collect requests, and impossible travel events intercepted during your usage.
                        <br />
                        Remains empty when no threats have occurred and records incidents automatically when scanners or fraud rules trigger.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveView('scanners')}
                      className="text-xs font-medium text-slate-700 hover:text-slate-900 underline underline-offset-4 shrink-0 cursor-pointer"
                    >
                      Open Scanners
                    </button>
                  </div>

                  {workspace.threats.length === 0 ? (
                    <div className="py-12 text-center text-xs text-slate-500">
                      Zero threats recorded in your session so far. Any high-risk transaction, phishing SMS, or fake QR scan you run will appear here.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-200 text-xs">
                      {workspace.threats.slice(0, 5).map((th) => (
                        <div key={th.id} className="py-3 first:pt-0 last:pb-0 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-slate-500">
                              {th.module} · {th.time}
                            </span>
                            <span
                              className={`font-mono font-bold tabular-nums ${
                                th.riskScore >= 71 ? 'text-red-700' : 'text-amber-700'
                              }`}
                            >
                              Risk {th.riskScore}/100 ({th.severity})
                            </span>
                          </div>
                          <div className="font-semibold text-slate-900">{th.title}</div>
                          <div className="text-slate-600">Action: {th.actionTaken}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                  <span>Synced with Forensic Audit Trail</span>
                  <button
                    type="button"
                    onClick={() => setActiveView('privacy-audit')}
                    className="font-medium text-slate-800 hover:underline cursor-pointer"
                  >
                    View Audit Log
                  </button>
                </div>
              </section>
            </div>

            {/* Row 3: Login Activity & Trusted Devices + AI Recommendations */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Dashboard Section 4: Login Activity & Trusted Devices */}
              <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-6">
                <div>
                  <div className="flex items-start justify-between pb-3 mb-3 border-b border-slate-200 gap-4">
                    <div className="space-y-1">
                      <h2 className="text-base font-semibold text-slate-900">
                        04. Login Activity & Trusted Devices
                      </h2>
                      {/* Mandatory Two-Line Description */}
                      <p className="text-xs text-slate-600 leading-relaxed">
                        Displays your real Two-Factor Authorization (2FA) sign-in timestamps, locations, and hardware-fingerprinted browser endpoints.
                        <br />
                        Automatically verifies travel velocity between consecutive logins to prevent session hijacking and impossible travel.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveView('identity')}
                      className="text-xs font-medium text-slate-700 hover:text-slate-900 underline underline-offset-4 shrink-0 cursor-pointer"
                    >
                      Manage Identity
                    </button>
                  </div>

                  <div className="divide-y divide-slate-200 text-xs">
                    {workspace.loginActivity.slice(0, 4).map((log) => (
                      <div
                        key={log.id}
                        className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">
                            {log.time} · {log.location} ({log.device})
                          </div>
                          <div className="text-slate-500 mt-0.5">{log.details}</div>
                        </div>
                        <span
                          className={`font-mono font-semibold shrink-0 ${
                            log.riskScore >= 71 ? 'text-red-700' : 'text-emerald-700'
                          }`}
                        >
                          {log.status} (Risk {log.riskScore})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200">
                  <div className="text-xs font-semibold text-slate-900 mb-2">
                    Registered Device Fingerprints ({workspace.devices.length})
                  </div>
                  <div className="divide-y divide-slate-200 text-xs">
                    {workspace.devices.map((dev) => (
                      <div
                        key={dev.id}
                        className="py-2.5 flex items-center justify-between gap-4"
                      >
                        <div>
                          <span className="font-medium text-slate-900">{dev.name}</span>
                          <span className="mx-1.5 text-slate-400">·</span>
                          <span className="text-slate-500">
                            {dev.resolution} · {dev.timezone} · {dev.ipPattern}
                          </span>
                        </div>
                        <span
                          className={`font-semibold whitespace-nowrap ${
                            dev.trusted ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {dev.trusted ? 'Trusted' : 'MFA Required'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Dashboard Section 5: AI Recommendations */}
              <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between">
                <div>
                  <div className="pb-4 mb-4 border-b border-slate-200 space-y-1">
                    <h2 className="text-base font-semibold text-slate-900">
                      05. AI Security Recommendations
                    </h2>
                    {/* Mandatory Two-Line Description */}
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Generates real-time, personalized security guidance based on your current Digital Twin maturity, active threats, and vault status.
                      <br />
                      Click any recommendation action link below to jump directly to the corresponding security control module.
                    </p>
                  </div>

                  <div className="space-y-4 text-xs">
                    {liveRecommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
                      >
                        <div className="flex items-center justify-between text-slate-500">
                          <span className="font-semibold text-slate-900">{rec.title}</span>
                          <span className="font-mono text-[11px] text-slate-600">
                            {rec.priority}
                          </span>
                        </div>
                        <p className="text-slate-600 leading-relaxed">{rec.description}</p>
                        <button
                          type="button"
                          onClick={() => setActiveView(rec.targetView)}
                          className="text-xs font-semibold text-slate-900 underline underline-offset-2 hover:text-slate-700 cursor-pointer"
                        >
                          {rec.actionLabel} →
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            {/* Dashboard Section 6: Real-Time Financial Ledger & XAI Risk Audit */}
            <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1 max-w-2xl">
                  <h2 className="text-base font-semibold text-slate-900">
                    06. Real-Time Financial Ledger & Explainable AI (XAI) Risk Audit
                  </h2>
                  {/* Mandatory Two-Line Description */}
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Stores and displays only the real financial transactions you record, complete with their 0–100 Cyber Risk Score and XAI reasoning.
                    <br />
                    Use the live search bar or risk level filter controls on the right to inspect specific entries or export your ledger to CSV.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search city, merchant, item..."
                      className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-slate-900"
                    />
                  </div>

                  <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg text-xs">
                    {(['ALL', 'Safe', 'Medium', 'Critical'] as const).map((lvl) => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setRiskFilter(lvl)}
                        className={`px-2.5 py-1 font-medium rounded-md cursor-pointer ${
                          riskFilter === lvl
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {filteredLedger.length === 0 ? (
                <div className="py-14 px-6 text-center space-y-3">
                  <p className="text-xs text-slate-500">
                    Your transaction ledger is currently empty (no pre-stored sample data). Click below to record a real transaction and evaluate it with the AI Fraud Detection Engine.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsLogModalOpen(true)}
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 cursor-pointer"
                  >
                    + Log First Transaction
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-medium">
                        <th className="py-3 px-6">Date · Time · Location</th>
                        <th className="py-3 px-4">Merchant & Description</th>
                        <th className="py-3 px-4">Device & Account</th>
                        <th className="py-3 px-4">Explainable AI (XAI) Assessment</th>
                        <th className="py-3 px-4 text-right">Cyber Risk Score</th>
                        <th className="py-3 px-6 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredLedger.map((txn) => (
                        <tr key={txn.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3.5 px-6 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                            <div>{txn.date}</div>
                            <div className="text-slate-500">
                              {txn.time} · {txn.location}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-900">{txn.merchant}</div>
                            <div className="text-slate-500">{txn.description}</div>
                          </td>
                          <td className="py-3.5 px-4 text-slate-600 whitespace-nowrap">
                            <div>{txn.device}</div>
                            <div className="text-slate-400">{txn.account}</div>
                          </td>
                          <td className="py-3.5 px-4 max-w-md">
                            <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                              {txn.xaiReasons.map((r, idx) => (
                                <li key={idx}>{r}</li>
                              ))}
                            </ul>
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums whitespace-nowrap">
                            <span
                              className={`font-bold inline-flex items-center gap-1 justify-end ${
                                txn.riskScore >= 71
                                  ? 'text-red-700'
                                  : txn.riskScore >= 31
                                  ? 'text-amber-700'
                                  : 'text-emerald-700'
                              }`}
                            >
                              {txn.riskScore >= 71 ? (
                                <ShieldAlert className="w-3.5 h-3.5" />
                              ) : (
                                <ShieldCheck className="w-3.5 h-3.5" />
                              )}
                              <span>
                                {txn.riskScore} = {txn.riskLevel}
                              </span>
                            </span>
                          </td>
                          <td
                            className={`py-3.5 px-6 text-right font-mono tabular-nums font-semibold whitespace-nowrap ${
                              txn.type === TransactionType.INCOME
                                ? 'text-emerald-700'
                                : 'text-slate-900'
                            }`}
                          >
                            {txn.type === TransactionType.INCOME
                              ? formatMoney(txn.amount, true)
                              : formatMoney(-txn.amount, true)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>
        )}

        {/* VIEW 2: FRAUD DETECTION ENGINE, DIGITAL TWIN, XAI & MERCHANT VERIFICATION */}
        {activeView === 'fraud-twin' && (
          <FraudTwinView
            user={session.user}
            accessToken={session.accessToken}
            workspace={workspace}
            onUpdateWorkspace={setWorkspace}
            formatMoney={formatMoney}
          />
        )}

        {/* VIEW 3: THREAT SCANNERS (PHISHING SMS, FAKE QR, UPI COLLECT, OCR RECEIPT) */}
        {activeView === 'scanners' && (
          <ThreatScannersView
            accessToken={session.accessToken}
            workspace={workspace}
            onUpdateWorkspace={setWorkspace}
          />
        )}

        {/* VIEW 4: IDENTITY & ACCESS (BEHAVIORAL BIOMETRICS, DEVICE FINGERPRINTING, IMPOSSIBLE TRAVEL, SESSION HIJACK, BRUTE FORCE) */}
        {activeView === 'identity' && (
          <IdentityAccessView
            session={session}
            workspace={workspace}
            onUpdateWorkspace={setWorkspace}
            onUpdateTokens={(accessToken, refreshToken) => {
              const updated = { ...session, accessToken, refreshToken };
              setSession(updated);
              sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(updated));
            }}
          />
        )}

        {/* VIEW 5: PRIVACY VAULT (AES-256) & FORENSIC AUDIT TRAIL */}
        {activeView === 'privacy-audit' && (
          <PrivacyAuditView
            accessToken={session.accessToken}
            activeOtpCode={activeOtpCode}
            workspace={workspace}
            onUpdateWorkspace={setWorkspace}
          />
        )}
      </main>

      {/* Global Slide-Over Drawer: Feature 13 — AI Scam Chatbot */}
      <ScamChatbotDrawer
        isOpen={isChatbotOpen}
        onClose={() => setIsChatbotOpen(false)}
        accessToken={session.accessToken}
        onUpdateWorkspace={setWorkspace}
      />

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white px-6 py-4 mt-12">
        <div className="max-w-[1380px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <div>
            SpendVista · Real-Time 2FA Authenticated Workspace · Zero Pre-Stored Sample Data
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setIsChatbotOpen(true)}
              className="hover:text-slate-900 underline underline-offset-2 cursor-pointer"
            >
              Open AI Scam Chatbot
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={handleSignOut}
              className="hover:text-red-700 underline underline-offset-2 cursor-pointer"
            >
              Sign Out ({session.user.email})
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
