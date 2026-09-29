import React, { useState } from 'react';
import { Upload, ShieldCheck, AlertTriangle } from 'lucide-react';
import { UserRealtimeWorkspace } from '../types';

interface Props {
  accessToken: string;
  workspace: UserRealtimeWorkspace;
  onUpdateWorkspace: (next: UserRealtimeWorkspace) => void;
}

export const ThreatScannersView: React.FC<Props> = ({
  accessToken,
  workspace,
  onUpdateWorkspace,
}) => {
  // 1. Phishing SMS & Email Scanner State (starts clean; stores only when used)
  const [phishingInput, setPhishingInput] = useState('');
  const [phishingLoading, setPhishingLoading] = useState(false);

  // 2. Fake QR Code & UPI Collect Verifier State
  const [qrMerchant, setQrMerchant] = useState('');
  const [qrUpiId, setQrUpiId] = useState('');
  const [qrAmount, setQrAmount] = useState('');
  const [qrPayload, setQrPayload] = useState('');
  const [isCollectRequest, setIsCollectRequest] = useState(false);
  const [qrLoading, setQrLoading] = useState(false);

  // 3. OCR Receipt & Invoice Scanner State
  const [invoiceText, setInvoiceText] = useState('');
  const [receiptImageBase64, setReceiptImageBase64] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [receiptLoading, setReceiptLoading] = useState(false);

  const handleScanPhishing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phishingInput.trim()) return;
    setPhishingLoading(true);
    try {
      const res = await fetch('/api/ai/scan-phishing', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ message: phishingInput }),
      });
      const data = await res.json();
      if (res.ok && data.workspace) {
        onUpdateWorkspace(data.workspace);
        setPhishingInput('');
      }
    } finally {
      setPhishingLoading(false);
    }
  };

  const handleVerifyQr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrMerchant.trim() || !qrUpiId.trim()) return;
    setQrLoading(true);
    try {
      const res = await fetch('/api/ai/verify-qr', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          rawPayload:
            qrPayload.trim() ||
            `upi://pay?pa=${qrUpiId.trim()}&pn=${encodeURIComponent(
              qrMerchant.trim()
            )}&am=${Number(qrAmount) || 0}`,
          merchantName: qrMerchant.trim(),
          upiId: qrUpiId.trim(),
          amount: Number(qrAmount) || 0,
          isCollectRequest,
        }),
      });
      const data = await res.json();
      if (res.ok && data.workspace) {
        onUpdateWorkspace(data.workspace);
        setQrMerchant('');
        setQrUpiId('');
        setQrAmount('');
        setQrPayload('');
      }
    } finally {
      setQrLoading(false);
    }
  };

  const handleReceiptImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setReceiptFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const resultStr = String(reader.result || '');
      const base64Part = resultStr.split(',')[1] || '';
      setReceiptImageBase64(base64Part);
    };
    reader.readAsDataURL(file);
  };

  const handleScanReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceText.trim() && !receiptImageBase64) return;
    setReceiptLoading(true);
    try {
      const res = await fetch('/api/ai/scan-receipt', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          invoiceText,
          imageBase64: receiptImageBase64,
          mimeType: 'image/png',
        }),
      });
      const data = await res.json();
      if (res.ok && data.workspace) {
        onUpdateWorkspace(data.workspace);
        setInvoiceText('');
        setReceiptImageBase64('');
        setReceiptFileName('');
      }
    } finally {
      setReceiptLoading(false);
    }
  };

  const latestPhishing = workspace.phishingScans[0] || null;
  const latestQr = workspace.qrScans[0] || null;
  const latestReceipt = workspace.receiptScans[0] || null;

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section 1: AI Phishing SMS & Email Scanner (Feature 3) */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-4 space-y-1.5">
              <div className="text-xs text-slate-500">Feature 03 · NLP Message Threat Scanner</div>
              <h2 className="text-base font-semibold text-slate-900">
                AI Phishing SMS & Email Scanner
              </h2>
              {/* Mandatory Two-Line Description */}
              <p className="text-xs text-slate-600 leading-relaxed">
                Inspects pasted SMS and email messages in real time to detect fake banking links, malicious domains, urgent scam coercion, and PAN/KYC suspension fraud.
                <br />
                Scan results are stored in your security history and logged to your forensic audit trail only when you run a message scan.
              </p>
            </div>

            <form onSubmit={handleScanPhishing} className="space-y-3">
              <textarea
                rows={4}
                value={phishingInput}
                onChange={(e) => setPhishingInput(e.target.value)}
                placeholder="Paste any suspicious bank SMS, KYC link message, or email text here to scan..."
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-slate-900"
                required
              />
              <button
                type="submit"
                disabled={phishingLoading}
                className="w-full py-2.5 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                {phishingLoading
                  ? 'Scanning Message with AI Engine...'
                  : 'Scan Message & Save Result'}
              </button>
            </form>

            {latestPhishing ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <span className="font-semibold text-slate-900">{latestPhishing.verdict}</span>
                  <span
                    className={`font-mono font-bold tabular-nums ${
                      latestPhishing.riskScore >= 71
                        ? 'text-red-700'
                        : latestPhishing.riskScore >= 31
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    Risk Score: {latestPhishing.riskScore}/100 ({latestPhishing.riskLevel})
                  </span>
                </div>

                <div>
                  <div className="font-medium text-slate-700 mb-1">
                    Detected Indicators ({latestPhishing.time}):
                  </div>
                  <ul className="space-y-1 text-slate-600 list-disc pl-4">
                    {latestPhishing.detectedIndicators.map((ind, i) => (
                      <li key={i}>{ind}</li>
                    ))}
                  </ul>
                </div>

                <div className="flex items-center justify-between pt-1 text-slate-600">
                  <span>Extracted Domains:</span>
                  <span className="font-mono text-red-700 font-medium">
                    {latestPhishing.maliciousDomains.join(', ')}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-200 text-slate-800 font-medium">
                  Recommendation: {latestPhishing.recommendation}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                No SMS or email scans stored yet. Paste a message above and click Scan to record your first phishing analysis.
              </div>
            )}
          </div>
        </section>

        {/* Section 2: Fake QR Code Verification & UPI Collect Request Analyzer (Features 4 & 14) */}
        <section className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col justify-between space-y-5">
          <div className="space-y-4">
            <div className="border-b border-slate-200 pb-4 space-y-1.5">
              <div className="text-xs text-slate-500">
                Features 04 & 14 · UPI QR Integrity & Collect Pull Analyzer
              </div>
              <h2 className="text-base font-semibold text-slate-900">
                Fake QR Code Verification & UPI Collect Request Analyzer
              </h2>
              {/* Mandatory Two-Line Description */}
              <p className="text-xs text-slate-600 leading-relaxed">
                Verifies merchant VPA identity, inspects UPI QR strings for payment redirection or duplicate overlay scams, and calculates scam probability for incoming UPI Collect requests.
                <br />
                Each verified QR or Collect check is saved to your scan log and automatically updates your Trusted Merchant Registry.
              </p>
            </div>

            <form onSubmit={handleVerifyQr} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Merchant Name</label>
                  <input
                    type="text"
                    value={qrMerchant}
                    onChange={(e) => setQrMerchant(e.target.value)}
                    placeholder="e.g., Unknown Merchant"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">
                    Merchant UPI ID (VPA)
                  </label>
                  <input
                    type="text"
                    value={qrUpiId}
                    onChange={(e) => setQrUpiId(e.target.value)}
                    placeholder="e.g., prize.claim@ybl"
                    className="w-full px-3 py-2 font-mono bg-white border border-slate-200 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Amount (₹ INR)</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={qrAmount}
                    onChange={(e) => setQrAmount(e.target.value)}
                    placeholder="e.g., 49999"
                    className="w-full px-3 py-2 font-mono tabular-nums bg-white border border-slate-200 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">
                  QR Code Payload String (Optional — auto-constructed if blank)
                </label>
                <input
                  type="text"
                  value={qrPayload}
                  onChange={(e) => setQrPayload(e.target.value)}
                  placeholder="upi://pay?pa=...&pn=...&am=..."
                  className="w-full px-3 py-2 font-mono bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                <label className="inline-flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCollectRequest}
                    onChange={(e) => setIsCollectRequest(e.target.checked)}
                    className="rounded border-slate-300 text-slate-900"
                  />
                  <span>This is an incoming UPI Collect Request (Pulls funds)</span>
                </label>
                <button
                  type="submit"
                  disabled={qrLoading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                >
                  {qrLoading ? 'Verifying QR...' : 'Verify QR / Collect & Save'}
                </button>
              </div>
            </form>

            {latestQr ? (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
                  <span className="font-semibold text-slate-900">{latestQr.verdict}</span>
                  <span
                    className={`font-mono font-bold tabular-nums ${
                      latestQr.scamProbability >= 70
                        ? 'text-red-700'
                        : latestQr.scamProbability >= 35
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }`}
                  >
                    Scam Probability: {latestQr.scamProbability}%
                  </span>
                </div>

                <div className="flex items-center gap-4 text-slate-600">
                  <span>
                    Merchant Trust:{' '}
                    <strong
                      className={
                        latestQr.merchantTrustStatus === 'Verified'
                          ? 'text-emerald-700'
                          : latestQr.merchantTrustStatus === 'Dangerous'
                          ? 'text-red-700'
                          : 'text-amber-700'
                      }
                    >
                      {latestQr.merchantTrustStatus}
                    </strong>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    QR Integrity: <strong className="text-slate-900">{latestQr.qrIntegrity}</strong>
                  </span>
                </div>

                <ul className="space-y-1 text-slate-600 list-disc pl-4">
                  {latestQr.xaiReasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>

                <div className="pt-2 border-t border-slate-200 text-slate-800 font-medium">
                  Safety Guidance: {latestQr.recommendation}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500">
                No QR codes or UPI collect requests verified yet. Enter a merchant VPA and amount above to run a real-time check.
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Section 3: OCR Receipt & Invoice Scanner (Feature 10) */}
      <section className="bg-white border border-slate-200 rounded-xl p-6 space-y-5">
        <div className="border-b border-slate-200 pb-4 space-y-1.5">
          <div className="text-xs text-slate-500">
            Feature 10 · Document Forensics & Multimodal OCR Scanner
          </div>
          <h2 className="text-base font-semibold text-slate-900">
            OCR Receipt & Invoice Scanner
          </h2>
          {/* Mandatory Two-Line Description */}
          <p className="text-xs text-slate-600 leading-relaxed">
            Extracts structured billing information (Vendor, GSTIN, Invoice Number, Date, and Total Amount) from uploaded receipt images or invoice text while detecting edited bills, fake GST numbers, and hidden phishing URLs.
            <br />
            Automatically cross-checks every scanned invoice number against your previously scanned receipts to prevent duplicate reimbursement fraud.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <form onSubmit={handleScanReceipt} className="lg:col-span-6 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Paste Receipt / GST Invoice Text (or Upload Receipt Image Below)
              </label>
              <textarea
                rows={5}
                value={invoiceText}
                onChange={(e) => setInvoiceText(e.target.value)}
                placeholder={
                  'Example:\nVENDOR: Metro Digital Retail\nGSTIN: 33AABCU9603R1ZM\nINVOICE NO: INV-2026-101\nAMOUNT: ₹4290'
                }
                className="w-full p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:border-slate-900"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <label className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 cursor-pointer">
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {receiptFileName ? `Selected: ${receiptFileName}` : 'Upload Receipt Image'}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleReceiptImageUpload}
                  className="hidden"
                />
              </label>

              <button
                type="submit"
                disabled={receiptLoading}
                className="px-5 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                {receiptLoading ? 'Running OCR & GST Verification...' : 'Scan Receipt & Save'}
              </button>
            </div>
          </form>

          <div className="lg:col-span-6">
            {latestReceipt ? (
              <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4 text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    {latestReceipt.tamperingDetected || latestReceipt.duplicateReimbursement ? (
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    ) : (
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    )}
                    <span className="font-semibold text-slate-900">
                      {latestReceipt.tamperingDetected
                        ? 'Invoice Tampering / Fake GST Detected'
                        : latestReceipt.duplicateReimbursement
                        ? 'Duplicate Reimbursement Flagged'
                        : 'Authentic GST Invoice Verified'}
                    </span>
                  </div>
                  <span
                    className={`font-mono font-bold tabular-nums ${
                      latestReceipt.authenticityScore >= 80
                        ? 'text-emerald-700'
                        : latestReceipt.authenticityScore >= 50
                        ? 'text-amber-700'
                        : 'text-red-700'
                    }`}
                  >
                    Authenticity: {latestReceipt.authenticityScore}/100
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-3 border-b border-slate-200">
                  <div>
                    <div className="text-slate-500">Merchant</div>
                    <div className="font-semibold text-slate-900 mt-0.5 truncate">
                      {latestReceipt.merchantName}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">GSTIN</div>
                    <div className="font-mono font-semibold text-slate-900 mt-0.5">
                      {latestReceipt.gstNumber}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Invoice #</div>
                    <div className="font-mono font-semibold text-slate-900 mt-0.5">
                      {latestReceipt.invoiceNumber}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Total Amount</div>
                    <div className="font-mono font-semibold text-slate-900 mt-0.5 tabular-nums">
                      ₹{Number(latestReceipt.totalAmount).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="font-medium text-slate-700 mb-1">Forensic OCR Findings:</div>
                  <ul className="space-y-1 text-slate-600 list-disc pl-4">
                    {latestReceipt.findings.map((f, i) => (
                      <li key={i}>{f}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
                No receipts or invoices scanned yet. Paste invoice details or upload an image on the left to extract fields and check for GST tampering or duplicate reimbursement.
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};
