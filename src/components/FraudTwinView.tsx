import React, { useState, useMemo } from 'react';
import { ShieldAlert, ShieldCheck, Plus, Trash2 } from 'lucide-react';
import {
  MerchantTrustRecord,
  RiskLevel,
  Transaction,
  TransactionType,
  UserProfile,
  UserRealtimeWorkspace,
} from '../types';
import { ACCOUNTS, EXPENSE_CATEGORIES } from '../data/initialData';

interface Props {
  user: UserProfile;
  accessToken: string;
  workspace: UserRealtimeWorkspace;
  onUpdateWorkspace: (next: UserRealtimeWorkspace) => void;
  formatMoney: (inrAmount: number, showSign?: boolean) => string;
}

export const FraudTwinView: React.FC<Props> = ({
  user,
  accessToken,
  workspace,
  onUpdateWorkspace,
  formatMoney,
}) => {
  // Real-time form inputs (no pre-stored mock results; user enters and runs)
  const [simAmount, setSimAmount] = useState('');
  const [simLocation, setSimLocation] = useState(user.homeCity || 'Chennai');
  const [simMerchant, setSimMerchant] = useState('');
  const [simDevice, setSimDevice] = useState('Authenticated Browser Session (Trusted)');
  const [simTime, setSimTime] = useState(() =>
    new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  );
  const [simCategory, setSimCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [analyzing, setAnalyzing] = useState(false);

  const [lastEvaluation, setLastEvaluation] = useState<{
    riskScore: number;
    riskLevel: RiskLevel;
    verdict: string;
    xaiReasons: string[];
    twinDeviationPercent: number;
    factorScores: {
      amountAnomaly: number;
      locationRisk: number;
      deviceRisk: number;
      merchantRisk: number;
      timeRisk: number;
      behaviorRisk: number;
    };
  } | null>(null);

  // Merchant registration state
  const [newMerchantName, setNewMerchantName] = useState('');
  const [newMerchantVpa, setNewMerchantVpa] = useState('');
  const [newMerchantStatus, setNewMerchantStatus] =
    useState<MerchantTrustRecord['status']>('Verified');
  const [savingMerchant, setSavingMerchant] = useState(false);

  // Real-Time Digital Twin learned strictly from the user's own stored transactions
  const digitalTwinMetrics = useMemo(() => {
    const expenses = workspace.transactions.filter(
      (t) => t.type === TransactionType.EXPENSE
    );
    const incomes = workspace.transactions.filter(
      (t) => t.type === TransactionType.INCOME
    );
    if (expenses.length === 0) {
      return {
        hasData: false,
        spendRange: 'No expenses logged yet',
        averageSpend: 0,
        favoriteMerchants: [] as string[],
        salaryTiming:
          incomes.length > 0
            ? `Recorded on ${incomes[0].date} (${formatMoney(incomes[0].amount)})`
            : 'Log a salary/income entry to train timing',
        frequency: '0 transactions recorded',
      };
    }

    const amounts = expenses.map((e) => e.amount);
    const minAmt = Math.min(...amounts);
    const maxAmt = Math.max(...amounts);
    const avgAmt = Math.round(amounts.reduce((a, b) => a + b, 0) / amounts.length);
    const merchantsList = Array.from(new Set(expenses.map((e) => e.merchant))).slice(0, 5);

    return {
      hasData: true,
      spendRange: `${formatMoney(minAmt)} – ${formatMoney(maxAmt)}`,
      averageSpend: avgAmt,
      favoriteMerchants: merchantsList,
      salaryTiming:
        incomes.length > 0
          ? `Recorded on ${incomes[0].date} (${formatMoney(incomes[0].amount)})`
          : 'No salary credit recorded yet',
      frequency: `${expenses.length} expense transaction(s) analyzed in real time`,
    };
  }, [workspace.transactions, formatMoney]);

  const handleEvaluateAndSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(simAmount);
    if (isNaN(amt) || amt <= 0 || !simMerchant.trim()) return;

    setAnalyzing(true);
    try {
      const res = await fetch('/api/data/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          description: `${simCategory} at ${simMerchant.trim()}`,
          merchant: simMerchant.trim(),
          category: simCategory,
          account: ACCOUNTS[1],
          location: simLocation.trim() || user.homeCity,
          device: simDevice,
          time: simTime,
          type: TransactionType.EXPENSE,
          amount: amt,
        }),
      });
      const data = await res.json();
      if (res.ok && data.workspace) {
        onUpdateWorkspace(data.workspace);
        setLastEvaluation(data.aiEvaluation);
        setSimAmount('');
        setSimMerchant('');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDeleteTxn = async (id: string) => {
    const res = await fetch(`/api/data/transactions/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const data = await res.json();
    if (res.ok && data.workspace) {
      onUpdateWorkspace(data.workspace);
    }
  };

  const handleAddMerchantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMerchantName.trim() || !newMerchantVpa.trim()) return;
    setSavingMerchant(true);
    try {
      const res = await fetch('/api/data/merchants', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          merchant: newMerchantName.trim(),
          upiId: newMerchantVpa.trim(),
          status: newMerchantStatus,
        }),
      });
      const data = await res.json();
      if (res.ok && data.workspace) {
        onUpdateWorkspace(data.workspace);
        setNewMerchantName('');
        setNewMerchantVpa('');
      }
    } finally {
      setSavingMerchant(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Section 1: Secure Digital Twin (Feature 11) */}
        <section className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-4 space-y-1.5">
              <div className="text-xs text-slate-500">
                Feature 11 · Real-Time Behavioral Baseline Model
              </div>
              <h2 className="text-base font-semibold text-slate-900">
                Secure Digital Twin
              </h2>
              {/* Mandatory Two-Line Description */}
              <p className="text-xs text-slate-600 leading-relaxed">
                Continuously learns your normal spending range, home city, favorite merchants, and transaction timing directly from the real transactions you log.
                <br />
                Whenever a new transaction deviates from this learned Digital Twin profile, the AI immediately flags the anomaly and elevates the risk score.
              </p>
            </div>

            <div className="divide-y divide-slate-200 text-xs">
              <div className="py-3 first:pt-0">
                <div className="text-slate-500">Baseline Home City</div>
                <div className="font-semibold text-slate-900 mt-0.5">{user.homeCity}</div>
              </div>
              <div className="py-3">
                <div className="text-slate-500">Learned Spending Range & Average</div>
                <div className="font-mono font-semibold text-slate-900 mt-0.5 tabular-nums">
                  {digitalTwinMetrics.hasData
                    ? `${digitalTwinMetrics.spendRange} (Avg: ${formatMoney(
                        digitalTwinMetrics.averageSpend
                      )})`
                    : 'Awaiting your first logged expense to compute range'}
                </div>
              </div>
              <div className="py-3">
                <div className="text-slate-500">Learned Salary & Income Timing</div>
                <div className="font-medium text-slate-900 mt-0.5">
                  {digitalTwinMetrics.salaryTiming}
                </div>
              </div>
              <div className="py-3">
                <div className="text-slate-500">Favorite Merchants (From Your Usage)</div>
                <div className="font-medium text-slate-900 mt-0.5">
                  {digitalTwinMetrics.favoriteMerchants.length > 0
                    ? digitalTwinMetrics.favoriteMerchants.join(' · ')
                    : 'No merchants recorded yet'}
                </div>
              </div>
              <div className="py-3 last:pb-0">
                <div className="text-slate-500">Real-Time Sample Size</div>
                <div className="font-mono text-slate-900 mt-0.5">
                  {digitalTwinMetrics.frequency}
                </div>
              </div>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-600">
            Zero sample data is pre-loaded. Your Digital Twin updates automatically every time you record a transaction.
          </div>
        </section>

        {/* Section 2: AI Fraud Detection Engine + Dynamic Cyber Risk Score + Explainable AI (Features 1, 2, 12) */}
        <section className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-6 space-y-5">
          <div className="border-b border-slate-200 pb-4 space-y-1.5">
            <div className="text-xs text-slate-500">
              Features 01, 02 & 12 · Machine Learning Anomaly Scoring & Explainable AI (XAI)
            </div>
            <h2 className="text-base font-semibold text-slate-900">
              AI Fraud Detection Engine & Dynamic Cyber Risk Score (0–100)
            </h2>
            {/* Mandatory Two-Line Description */}
            <p className="text-xs text-slate-600 leading-relaxed">
              Evaluates every real-time transaction across six risk factors (amount, location, device, merchant, login time, and behavior) to output a 0–100 score (Safe ≤ 30, Medium 31–70, Critical 71–100).
              <br />
              Provides human-readable Explainable AI (XAI) reasons for every score and stores the evaluated entry in your persistent ledger only when submitted.
            </p>
          </div>

          <form onSubmit={handleEvaluateAndSaveTransaction} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Transaction Amount (₹ INR)
                </label>
                <input
                  type="number"
                  min="1"
                  step="any"
                  value={simAmount}
                  onChange={(e) => setSimAmount(e.target.value)}
                  placeholder="e.g., 650 or 30000"
                  className="w-full px-3 py-2 font-mono tabular-nums bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Transaction City / Location
                </label>
                <input
                  type="text"
                  value={simLocation}
                  onChange={(e) => setSimLocation(e.target.value)}
                  placeholder="e.g., Chennai or Delhi"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Time (24h)</label>
                <input
                  type="time"
                  value={simTime}
                  onChange={(e) => setSimTime(e.target.value)}
                  className="w-full px-3 py-2 font-mono bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  Merchant Counterparty
                </label>
                <input
                  type="text"
                  value={simMerchant}
                  onChange={(e) => setSimMerchant(e.target.value)}
                  placeholder="e.g., Metro Store or Unknown Shop"
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                  required
                />
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={simCategory}
                  onChange={(e) => setSimCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                >
                  {EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block font-medium text-slate-700 mb-1">Device Context</label>
                <select
                  value={simDevice}
                  onChange={(e) => setSimDevice(e.target.value)}
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

            <button
              type="submit"
              disabled={analyzing}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
            >
              {analyzing
                ? 'Evaluating with AI Engine & Saving to Ledger...'
                : 'Analyze with AI Fraud Engine & Save Transaction'}
            </button>
          </form>

          {/* Latest Explainable AI (XAI) Evaluation Result */}
          {lastEvaluation ? (
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  {lastEvaluation.riskScore >= 71 ? (
                    <ShieldAlert className="w-4 h-4 text-red-600" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  )}
                  <span className="font-semibold text-slate-900">{lastEvaluation.verdict}</span>
                </div>
                <span
                  className={`font-mono font-bold text-sm tabular-nums ${
                    lastEvaluation.riskScore >= 71
                      ? 'text-red-700'
                      : lastEvaluation.riskScore >= 31
                      ? 'text-amber-700'
                      : 'text-emerald-700'
                  }`}
                >
                  Score: {lastEvaluation.riskScore}/100 = {lastEvaluation.riskLevel}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-center font-mono tabular-nums">
                <div className="p-2 bg-white border border-slate-200 rounded">
                  <div className="text-[11px] text-slate-500 font-sans">Amount</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {lastEvaluation.factorScores.amountAnomaly}/100
                  </div>
                </div>
                <div className="p-2 bg-white border border-slate-200 rounded">
                  <div className="text-[11px] text-slate-500 font-sans">Location</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {lastEvaluation.factorScores.locationRisk}/100
                  </div>
                </div>
                <div className="p-2 bg-white border border-slate-200 rounded">
                  <div className="text-[11px] text-slate-500 font-sans">Device</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {lastEvaluation.factorScores.deviceRisk}/100
                  </div>
                </div>
                <div className="p-2 bg-white border border-slate-200 rounded">
                  <div className="text-[11px] text-slate-500 font-sans">Merchant</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {lastEvaluation.factorScores.merchantRisk}/100
                  </div>
                </div>
                <div className="p-2 bg-white border border-slate-200 rounded">
                  <div className="text-[11px] text-slate-500 font-sans">Login Time</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {lastEvaluation.factorScores.timeRisk}/100
                  </div>
                </div>
                <div className="p-2 bg-white border border-slate-200 rounded">
                  <div className="text-[11px] text-slate-500 font-sans">Behavior</div>
                  <div className="font-semibold text-slate-900 mt-0.5">
                    {lastEvaluation.factorScores.behaviorRisk}/100
                  </div>
                </div>
              </div>

              <div>
                <div className="font-semibold text-slate-900 mb-1">
                  Explainable AI (XAI) Reasoning:
                </div>
                <ul className="list-disc pl-4 space-y-1 text-slate-700">
                  {lastEvaluation.xaiReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
              Submit a real transaction above to compute its live 0–100 Dynamic Cyber Risk Score and view the Explainable AI (XAI) breakdown.
            </div>
          )}
        </section>
      </div>

      {/* Section 3: Merchant Trust Verification (Feature 15) */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 space-y-1.5">
          <div className="text-xs text-slate-500">Feature 15 · Counterparty Reputation Registry</div>
          <h2 className="text-base font-semibold text-slate-900">
            Merchant Trust Verification
          </h2>
          {/* Mandatory Two-Line Description */}
          <p className="text-xs text-slate-600 leading-relaxed">
            Maintains a user-specific database of merchants classified as Verified, Unknown, or Dangerous based on your real QR scans and logged transactions.
            <br />
            New merchants are recorded automatically when you verify a QR code, log a transaction, or manually register a counterparty below.
          </p>
        </div>

        {workspace.merchants.length === 0 ? (
          <div className="py-10 px-6 text-center text-xs text-slate-500">
            No merchants stored yet. Log a transaction, scan a QR code, or add a merchant below to populate your real-time registry.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-medium">
                  <th className="py-3 px-6">Merchant</th>
                  <th className="py-3 px-4">UPI VPA / Handle</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Trust Score</th>
                  <th className="py-3 px-6 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {workspace.merchants.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80">
                    <td className="py-3 px-6 font-semibold text-slate-900">{m.merchant}</td>
                    <td className="py-3 px-4 font-mono text-slate-600">{m.upiId}</td>
                    <td className="py-3 px-4 text-slate-600">{m.category}</td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-800">
                      {m.trustScore}/100
                    </td>
                    <td
                      className={`py-3 px-6 text-right font-semibold ${
                        m.status === 'Verified'
                          ? 'text-emerald-700'
                          : m.status === 'Dangerous'
                          ? 'text-red-700'
                          : 'text-amber-700'
                      }`}
                    >
                      {m.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <form
          onSubmit={handleAddMerchantSubmit}
          className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center gap-3 text-xs"
        >
          <input
            type="text"
            value={newMerchantName}
            onChange={(e) => setNewMerchantName(e.target.value)}
            placeholder="Merchant Name (e.g., Metro Retail)"
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
            required
          />
          <input
            type="text"
            value={newMerchantVpa}
            onChange={(e) => setNewMerchantVpa(e.target.value)}
            placeholder="UPI ID (e.g., metroretail@upi)"
            className="px-3 py-1.5 font-mono bg-white border border-slate-200 rounded-lg"
            required
          />
          <select
            value={newMerchantStatus}
            onChange={(e) =>
              setNewMerchantStatus(e.target.value as MerchantTrustRecord['status'])
            }
            className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg"
          >
            <option value="Verified">Verified</option>
            <option value="Unknown">Unknown</option>
            <option value="Dangerous">Dangerous</option>
          </select>
          <button
            type="submit"
            disabled={savingMerchant}
            className="px-3.5 py-1.5 font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{savingMerchant ? 'Saving...' : 'Store Merchant'}</span>
          </button>
        </form>
      </section>

      {/* Section 4: Explainable AI (XAI) Transaction History */}
      <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 space-y-1.5">
          <div className="text-xs text-slate-500">Feature 12 · Explainable AI Audit Ledger</div>
          <h2 className="text-base font-semibold text-slate-900">
            Recorded Transactions & Explainable AI (XAI) Verdicts
          </h2>
          {/* Mandatory Two-Line Description */}
          <p className="text-xs text-slate-600 leading-relaxed">
            Displays all financial transactions you have logged along with the specific Explainable AI (XAI) reasons behind each transaction’s risk score.
            <br />
            Instead of an opaque alert, XAI states the exact anomaly multiplier, merchant trust state, and login hour deviation for full transparency.
          </p>
        </div>

        {workspace.transactions.length === 0 ? (
          <div className="py-12 px-6 text-center text-xs text-slate-500">
            No transactions stored yet. Use the AI Fraud Detection form above or the top bar "Log Transaction" button to record your first entry.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-slate-500 font-medium">
                  <th className="py-3 px-6">Date · Time · City</th>
                  <th className="py-3 px-4">Merchant & Description</th>
                  <th className="py-3 px-4">Explainable AI (XAI) Verdict</th>
                  <th className="py-3 px-4 text-right">Cyber Risk Score</th>
                  <th className="py-3 px-4 text-right">Amount</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {workspace.transactions.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-6 font-mono tabular-nums text-slate-600 whitespace-nowrap">
                      <div>{t.date}</div>
                      <div className="text-slate-500">
                        {t.time} · {t.location}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-900">{t.merchant}</div>
                      <div className="text-slate-500">{t.description}</div>
                    </td>
                    <td className="py-3.5 px-4 max-w-md">
                      <ul className="list-disc pl-4 space-y-0.5 text-slate-600">
                        {t.xaiReasons.map((r, i) => (
                          <li key={i}>{r}</li>
                        ))}
                      </ul>
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-mono tabular-nums font-bold whitespace-nowrap ${
                        t.riskScore >= 71
                          ? 'text-red-700'
                          : t.riskScore >= 31
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {t.riskScore} = {t.riskLevel}
                    </td>
                    <td
                      className={`py-3.5 px-4 text-right font-mono tabular-nums font-semibold whitespace-nowrap ${
                        t.type === TransactionType.INCOME ? 'text-emerald-700' : 'text-slate-900'
                      }`}
                    >
                      {t.type === TransactionType.INCOME
                        ? formatMoney(t.amount, true)
                        : formatMoney(-t.amount, true)}
                    </td>
                    <td className="py-3.5 px-6 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleDeleteTxn(t.id)}
                        className="p-1 text-slate-400 hover:text-red-700 rounded cursor-pointer"
                        title="Delete transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
