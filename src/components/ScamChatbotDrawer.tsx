import React, { useState } from 'react';
import { X, Send, ShieldAlert } from 'lucide-react';
import { UserRealtimeWorkspace } from '../types';

interface ScamAnalysisResponse {
  reply: string;
  scamProbability: number;
  verdict: string;
  dimensionAnalysis: {
    merchantAnalysis: string;
    amountAnalysis: string;
    qrAnalysis: string;
    urlAnalysis: string;
    senderAnalysis: string;
  };
  safetyRecommendation: string;
}

interface Props {
  isOpen: boolean;
  onClose: () => void;
  accessToken: string;
  onUpdateWorkspace: (next: UserRealtimeWorkspace) => void;
}

export const ScamChatbotDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  accessToken,
  onUpdateWorkspace,
}) => {
  const [question, setQuestion] = useState('Is this UPI request safe?');
  const [merchant, setMerchant] = useState('');
  const [amount, setAmount] = useState('');
  const [qr, setQr] = useState('');
  const [url, setUrl] = useState('');
  const [sender, setSender] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScamAnalysisResponse | null>(null);

  if (!isOpen) return null;

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await fetch('/api/ai/scam-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ question, merchant, amount, qr, url, sender }),
      });
      const data = await response.json();
      setResult(data);
      if (data.workspace) {
        onUpdateWorkspace(data.workspace);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40">
      <div className="w-full max-w-xl bg-white h-full border-l border-slate-200 flex flex-col justify-between overflow-y-auto">
        <div>
          <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between sticky top-0 bg-white z-10">
            <div className="space-y-1 pr-4">
              <div className="text-xs text-slate-500">Feature 13 · Interactive Scam Analyst</div>
              <h2 className="text-base font-semibold text-slate-900">
                AI Scam Chatbot & UPI Safety Advisor
              </h2>
              {/* Mandatory Two-Line Description */}
              <p className="text-xs text-slate-600 leading-relaxed">
                Answers questions like "Is this UPI request safe?" by simultaneously inspecting the Merchant, Amount, QR payload, URL, and Sender.
                <br />
                Calculates a real-time scam probability percentage and logs the consultation in your forensic audit trail only when submitted.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
              aria-label="Close AI Scam Chatbot"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-6">
            <form onSubmit={handleAnalyze} className="space-y-3 border-b border-slate-200 pb-6">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Your Question to AI Security Analyst
                </label>
                <input
                  type="text"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Is this UPI request safe?"
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Merchant Name
                  </label>
                  <input
                    type="text"
                    value={merchant}
                    onChange={(e) => setMerchant(e.target.value)}
                    placeholder="e.g., Unknown Merchant"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Amount (₹ INR)
                  </label>
                  <input
                    type="text"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g., 49999"
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Sender / VPA
                  </label>
                  <input
                    type="text"
                    value={sender}
                    onChange={(e) => setSender(e.target.value)}
                    placeholder="e.g., prize.claim@ybl"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Suspicious URL
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="e.g., https://example-verify-portal.org"
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  QR Code / UPI String
                </label>
                <input
                  type="text"
                  value={qr}
                  onChange={(e) => setQr(e.target.value)}
                  placeholder="upi://pay?pa=..."
                  className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-slate-200 rounded-lg"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {loading ? 'Analyzing 5 Threat Dimensions...' : 'Analyze Request Safety'}
                </span>
              </button>
            </form>

            {result ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">{result.verdict}</span>
                    <span
                      className={`text-sm font-mono font-bold tabular-nums ${
                        result.scamProbability >= 70
                          ? 'text-red-700'
                          : result.scamProbability >= 35
                          ? 'text-amber-700'
                          : 'text-emerald-700'
                      }`}
                    >
                      {result.scamProbability}% Scam Risk
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed">{result.reply}</p>
                </div>

                <div className="border border-slate-200 rounded-xl divide-y divide-slate-200 text-xs">
                  <div className="p-3">
                    <div className="font-semibold text-slate-900">1. Merchant Analysis</div>
                    <div className="text-slate-600 mt-0.5">
                      {result.dimensionAnalysis.merchantAnalysis}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-slate-900">2. Amount Analysis</div>
                    <div className="text-slate-600 mt-0.5">
                      {result.dimensionAnalysis.amountAnalysis}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-slate-900">3. QR Payload Analysis</div>
                    <div className="text-slate-600 mt-0.5">
                      {result.dimensionAnalysis.qrAnalysis}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-slate-900">4. URL Analysis</div>
                    <div className="text-slate-600 mt-0.5">
                      {result.dimensionAnalysis.urlAnalysis}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="font-semibold text-slate-900">5. Sender Analysis</div>
                    <div className="text-slate-600 mt-0.5">
                      {result.dimensionAnalysis.senderAnalysis}
                    </div>
                  </div>
                </div>

                <div className="p-4 border border-slate-900 bg-slate-900 text-white rounded-xl text-xs space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Cyber Safety Recommendation</span>
                  </div>
                  <p className="text-slate-200 leading-relaxed">{result.safetyRecommendation}</p>
                </div>
              </div>
            ) : (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
                Enter your question and any payment details above to run a live AI safety assessment.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
