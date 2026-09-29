export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE',
}

export enum CurrencyCode {
  INR = 'INR',
  USD = 'USD',
  EUR = 'EUR',
}

export type RiskLevel = 'Safe' | 'Medium' | 'Critical';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  homeCity: string;
  createdAt: string;
  twoFactorEnabled: boolean;
}

export interface AuthSession {
  user: UserProfile;
  accessToken: string;
  refreshToken: string;
  issuedAt: string;
  expiresIn: string;
}

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  description: string;
  merchant: string;
  category: string;
  account: string;
  location: string;
  device: string;
  type: TransactionType;
  amount: number; // Stored in INR (₹)
  riskScore: number; // 0 - 100
  riskLevel: RiskLevel;
  xaiReasons: string[];
  factorScores?: {
    amountAnomaly: number;
    locationRisk: number;
    deviceRisk: number;
    merchantRisk: number;
    timeRisk: number;
    behaviorRisk: number;
  };
  reconciled: boolean;
  flaggedFraud?: boolean;
}

export interface TrustedDevice {
  id: string;
  fingerprintHash: string;
  name: string;
  browser: string;
  os: string;
  resolution: string;
  timezone: string;
  ipPattern: string;
  trusted: boolean;
  lastActive: string;
  mfaRequired: boolean;
}

export interface LoginActivityEntry {
  id: string;
  timestampMs: number;
  time: string;
  location: string;
  ipAddress: string;
  device: string;
  status: 'Verified (2FA)' | 'Impossible Travel' | 'Unknown Device' | 'Blocked Brute Force';
  riskScore: number;
  details: string;
}

export interface MerchantTrustRecord {
  id: string;
  merchant: string;
  upiId: string;
  category: string;
  status: 'Verified' | 'Unknown' | 'Dangerous';
  trustScore: number;
  lastVerified: string;
}

export interface PrivacyVaultItem {
  id: string;
  label: string;
  fieldType: 'Account Number' | 'UPI ID' | 'PAN' | 'Aadhaar' | 'Card Details';
  maskedValue: string;
  ciphertextHex: string;
  ivHex: string;
  authTagHex: string;
  algorithm: 'AES-256-GCM';
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  time: string;
  event: string;
  actor: string;
  ipAddress: string;
  severity: 'Normal' | 'Security' | 'Critical';
  hash: string;
}

export interface ThreatEvent {
  id: string;
  time: string;
  module: string;
  title: string;
  severity: RiskLevel;
  riskScore: number;
  actionTaken: string;
}

export interface PhishingScanRecord {
  id: string;
  time: string;
  messageSnippet: string;
  riskScore: number;
  riskLevel: RiskLevel;
  verdict: string;
  detectedIndicators: string[];
  maliciousDomains: string[];
  recommendation: string;
}

export interface QrScanRecord {
  id: string;
  time: string;
  merchantName: string;
  upiId: string;
  amount: number;
  isCollectRequest: boolean;
  scamProbability: number;
  merchantTrustStatus: 'Verified' | 'Unknown' | 'Dangerous';
  qrIntegrity: string;
  verdict: string;
  xaiReasons: string[];
  recommendation: string;
}

export interface ReceiptScanRecord {
  id: string;
  time: string;
  merchantName: string;
  gstNumber: string;
  invoiceNumber: string;
  date: string;
  totalAmount: number;
  authenticityScore: number;
  tamperingDetected: boolean;
  duplicateReimbursement: boolean;
  hiddenPhishingUrls: string[];
  findings: string[];
}

export interface UserRealtimeWorkspace {
  transactions: Transaction[];
  devices: TrustedDevice[];
  loginActivity: LoginActivityEntry[];
  merchants: MerchantTrustRecord[];
  vaultItems: PrivacyVaultItem[];
  auditLogs: AuditLogEntry[];
  threats: ThreatEvent[];
  phishingScans: PhishingScanRecord[];
  qrScans: QrScanRecord[];
  receiptScans: ReceiptScanRecord[];
  accountFrozen: boolean;
  lastCloudBackup: string | null;
}

export type WorkspaceView =
  | 'dashboard'
  | 'fraud-twin'
  | 'scanners'
  | 'identity'
  | 'privacy-audit';
