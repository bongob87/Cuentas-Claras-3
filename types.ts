
export interface Transaction {
  id: string;
  amount: number;
  type: 'CREDIT' | 'PAYMENT';
  date: string; // ISO string
  description?: string;
}

export interface Customer {
  id: string;
  name: string;
  address?: string;
  phone?: string;
  createdAt: string;
  avatarUrl?: string;
  transactions: Transaction[];
}

export interface FinancialSummary {
  totalReceivable: number;
  currentDebt: number; // < 30 days
  overdueDebt: number; // > 30 days
  activeCustomers: number;
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  customerId: string;
  customerName: string;
  type: 'CREDIT' | 'PAYMENT';
  amount: number;
  date: string;
}

export interface NotificationSettings {
  enabled: boolean;
  dailyReminders: boolean; // Payments due, overdue, upcoming
  payments: boolean; // Confirmation, updated balance, zero balance
  weeklyReports: boolean; // Weekly summary
  appUpdates: boolean; // Sync/Offline status
}

export interface UserLog {
  id: string;
  timestamp: string;
  action: 'LOGIN' | 'LOGOUT' | 'CREATE_CUSTOMER' | 'ADD_TRANSACTION' | 'UPDATE_SETTINGS' | 'SYSTEM';
  details: string;
  duration?: string; // For sessions
}

export enum Tab {
  DASHBOARD = 'dashboard',
  CUSTOMERS = 'customers',
  REPORTS = 'reports',
  DIGITIZE = 'digitize',
  SETTINGS = 'settings'
}
