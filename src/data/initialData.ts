import { UserRealtimeWorkspace } from '../types';

export const EXPENSE_CATEGORIES = [
  'Groceries & Dining',
  'Electronics & Retail',
  'Utilities & Broadband',
  'Transport & Fuel',
  'Housing & Society',
  'Healthcare & Pharmacy',
  'Investments & SIP',
  'Direct UPI Transfer',
];

export const INCOME_CATEGORIES = [
  'Monthly Salary Credit',
  'Consulting & Freelance',
  'Dividends & Interest',
  'Reimbursement Credit',
];

export const ACCOUNTS = [
  'Primary Savings Account',
  'Primary UPI Handle',
  'Corporate Credit Line',
];

export function createEmptyWorkspace(): UserRealtimeWorkspace {
  return {
    transactions: [],
    devices: [],
    loginActivity: [],
    merchants: [],
    vaultItems: [],
    auditLogs: [],
    threats: [],
    phishingScans: [],
    qrScans: [],
    receiptScans: [],
    accountFrozen: false,
    lastCloudBackup: null,
  };
}
