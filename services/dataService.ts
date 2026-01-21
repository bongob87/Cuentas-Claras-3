
import { Customer, Transaction, FinancialSummary, ActivityItem, NotificationSettings, UserLog } from '../types';
import { differenceInDays, format, isWithinInterval, addDays, isSameDay } from 'date-fns';
import { es } from 'date-fns/locale';
import { formatCurrency } from '../utils';

// --- MOCK TYPES ---
export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  currentStoreId: string; 
  storeName?: string;
  notificationSettings: NotificationSettings;
}

// --- MOCK STATE ---
let currentUser: User | null = null;
let authListeners: ((user: User | null) => void)[] = [];
const STORAGE_KEY_PREFIX = 'cuentas_claras_';
let sessionStartTime: number | null = null;

// --- NOTIFICATION HELPERS ---

const DEFAULT_NOTIFICATIONS: NotificationSettings = {
  enabled: true,
  dailyReminders: true,
  payments: true,
  weeklyReports: true,
  appUpdates: true
};

export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) return false;
  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const sendLocalNotification = (title: string, body: string) => {
  if (!currentUser?.notificationSettings.enabled) return;
  if (!('Notification' in window)) return;
  
  if (Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/icon.png', // Assuming pwa icon exists, or browser default
      badge: '/badge.png'
    });
  }
};

// --- LOGGING SYSTEM ---

export const logUserAction = (
  action: UserLog['action'], 
  details: string, 
  duration?: string
) => {
  if (!currentUser) return;
  
  const log: UserLog = {
    id: Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    action,
    details,
    duration
  };

  const key = STORAGE_KEY_PREFIX + currentUser.currentStoreId + '_logs';
  const existingLogsStr = localStorage.getItem(key);
  const logs: UserLog[] = existingLogsStr ? JSON.parse(existingLogsStr) : [];
  
  logs.unshift(log); // Add to beginning
  // Keep last 1000 logs
  if (logs.length > 1000) logs.length = 1000;
  
  localStorage.setItem(key, JSON.stringify(logs));
};

export const getUserLogs = (storeId: string): UserLog[] => {
  const key = STORAGE_KEY_PREFIX + storeId + '_logs';
  const json = localStorage.getItem(key);
  return json ? JSON.parse(json) : [];
};

// --- AUTH OPERATIONS ---

const saveUserToStorage = (user: User) => {
    localStorage.setItem(STORAGE_KEY_PREFIX + 'user', JSON.stringify(user));
};

try {
  const savedUser = localStorage.getItem(STORAGE_KEY_PREFIX + 'user');
  if (savedUser) {
      currentUser = JSON.parse(savedUser);
      // Migration: Add settings if missing
      if (!currentUser.notificationSettings) {
          currentUser.notificationSettings = DEFAULT_NOTIFICATIONS;
          saveUserToStorage(currentUser);
      }
      if (!currentUser.currentStoreId) {
          currentUser.currentStoreId = currentUser.uid; 
          saveUserToStorage(currentUser);
      }
      sessionStartTime = Date.now();
  }
} catch (e) {
  console.error("Error restoring session", e);
}

const notifyAuthListeners = () => {
  authListeners.forEach(l => l(currentUser));
};

export const updateNotificationSettings = async (settings: NotificationSettings) => {
    if (!currentUser) return;
    currentUser = { ...currentUser, notificationSettings: settings };
    saveUserToStorage(currentUser);
    notifyAuthListeners();
    logUserAction('UPDATE_SETTINGS', 'Actualizó preferencias de notificaciones');
};

export const login = async (email, password) => {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const uid = 'user-' + email.split('@')[0];
  let storeId = uid;

  const existingUserStr = localStorage.getItem(STORAGE_KEY_PREFIX + 'user');
  let existingStoreName = 'Mi Tienda';
  let existingSettings = DEFAULT_NOTIFICATIONS;

  if (existingUserStr) {
      const existingUser = JSON.parse(existingUserStr);
      if (existingUser.uid === uid) {
        if (existingUser.storeName) existingStoreName = existingUser.storeName;
        if (existingUser.notificationSettings) existingSettings = existingUser.notificationSettings;
      }
  }

  currentUser = {
      uid: uid,
      email: email,
      displayName: email.split('@')[0],
      photoURL: null,
      currentStoreId: storeId,
      storeName: existingStoreName,
      notificationSettings: existingSettings
  };
  
  sessionStartTime = Date.now();
  saveUserToStorage(currentUser);
  notifyAuthListeners();
  logUserAction('LOGIN', `Inicio de sesión exitoso: ${email}`);
  return currentUser;
};

export const loginWithGoogle = async () => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const uid = 'google-' + Math.random().toString(36).substr(2, 9);
  
  currentUser = {
      uid: uid,
      email: 'usuario.google@gmail.com',
      displayName: 'Usuario Google',
      photoURL: `https://ui-avatars.com/api/?name=Usuario+Google&background=0D8ABC&color=fff&size=128`,
      currentStoreId: uid, 
      storeName: 'Mi Tienda Google',
      notificationSettings: DEFAULT_NOTIFICATIONS
  };
  
  sessionStartTime = Date.now();
  saveUserToStorage(currentUser);
  notifyAuthListeners();
  logUserAction('LOGIN', 'Inicio de sesión con Google');
  return currentUser;
};

export const register = async (email, password, storeName) => {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const uid = 'user-' + email.split('@')[0];
  const storeId = 'store-' + Math.random().toString(36).substr(2, 8);

  currentUser = {
      uid: uid,
      email: email,
      displayName: email.split('@')[0],
      photoURL: null,
      currentStoreId: storeId,
      storeName: storeName || 'Mi Abarrotes',
      notificationSettings: DEFAULT_NOTIFICATIONS
  };
  
  sessionStartTime = Date.now();
  saveUserToStorage(currentUser);
  notifyAuthListeners();
  logUserAction('LOGIN', `Registro nuevo usuario: ${email}`);
  return currentUser;
};

export const logout = async () => {
  // Calculate session duration
  let durationStr = '0m';
  if (sessionStartTime) {
      const diffMs = Date.now() - sessionStartTime;
      const minutes = Math.floor(diffMs / 60000);
      durationStr = `${minutes}m`;
  }

  logUserAction('LOGOUT', 'Cierre de sesión', durationStr);

  await new Promise(resolve => setTimeout(resolve, 300));
  currentUser = null;
  sessionStartTime = null;
  localStorage.removeItem(STORAGE_KEY_PREFIX + 'user');
  notifyAuthListeners();
};

export const joinStore = async (storeId: string) => {
    if (!currentUser) return;
    await new Promise(resolve => setTimeout(resolve, 500));
    
    currentUser = {
        ...currentUser,
        currentStoreId: storeId,
        storeName: 'Tienda Compartida' 
    };
    saveUserToStorage(currentUser);
    notifyAuthListeners();
    logUserAction('UPDATE_SETTINGS', `Se unió a la tienda: ${storeId}`);
};

export const subscribeToAuth = (callback: (user: User | null) => void) => {
  authListeners.push(callback);
  callback(currentUser); 
  return () => {
    authListeners = authListeners.filter(l => l !== callback);
  };
};

// --- DATABASE OPERATIONS ---

let customerListeners: Record<string, ((customers: Customer[]) => void)[]> = {};

const getLocalCustomers = (storeId: string): Customer[] => {
    let key = STORAGE_KEY_PREFIX + 'store_' + storeId + '_customers';
    if (!localStorage.getItem(key)) {
         const oldKey = STORAGE_KEY_PREFIX + storeId + '_customers';
         const oldData = localStorage.getItem(oldKey);
         if (oldData) {
             localStorage.setItem(key, oldData);
             localStorage.removeItem(oldKey);
         }
    }
    const json = localStorage.getItem(key);
    return json ? JSON.parse(json) : [];
};

const saveLocalCustomers = (storeId: string, customers: Customer[]) => {
    const key = STORAGE_KEY_PREFIX + 'store_' + storeId + '_customers';
    localStorage.setItem(key, JSON.stringify(customers));
    notifyCustomerListeners(storeId, customers);
};

const notifyCustomerListeners = (storeId: string, customers: Customer[]) => {
    if (customerListeners[storeId]) {
        customerListeners[storeId].forEach(cb => cb(customers));
    }
};

export const subscribeToCustomers = (storeId: string, callback: (customers: Customer[]) => void) => {
  if (!storeId) {
    callback([]);
    return () => {};
  }
  if (!customerListeners[storeId]) customerListeners[storeId] = [];
  customerListeners[storeId].push(callback);
  callback(getLocalCustomers(storeId));
  return () => {
    if (customerListeners[storeId]) {
        customerListeners[storeId] = customerListeners[storeId].filter(cb => cb !== callback);
    }
  };
};

export const saveCustomerToDb = async (storeId: string, customer: Customer) => {
  if (!storeId) throw new Error("No store context");
  await new Promise(resolve => setTimeout(resolve, 300)); 
  
  const customers = getLocalCustomers(storeId);
  const index = customers.findIndex(c => c.id === customer.id);
  
  if (index >= 0) {
      customers[index] = customer;
  } else {
      customers.push(customer);
  }
  
  saveLocalCustomers(storeId, customers);
  logUserAction('CREATE_CUSTOMER', `Cliente guardado: ${customer.name}`);
};

export const addTransactionToDb = async (storeId: string, customerId: string, transaction: Transaction) => {
  if (!storeId) throw new Error("No store context");
  await new Promise(resolve => setTimeout(resolve, 300));
  
  const customers = getLocalCustomers(storeId);
  const customer = customers.find(c => c.id === customerId);
  
  if (customer) {
      if (!customer.transactions) customer.transactions = [];
      customer.transactions.push(transaction);
      saveLocalCustomers(storeId, customers);

      const typeLabel = transaction.type === 'CREDIT' ? 'Fiado' : 'Abono';
      logUserAction('ADD_TRANSACTION', `Nuevo ${typeLabel}: ${formatCurrency(transaction.amount)} - ${customer.name}`);

      // --- 2. PAYMENT CONFIRMATION & 3. ZERO BALANCE NOTIFICATIONS ---
      if (currentUser?.notificationSettings.payments && transaction.type === 'PAYMENT') {
          // Send Payment Confirmation
          const newBalance = calculateBalance(customer.transactions);
          
          sendLocalNotification(
              'Pago Registrado', 
              `Pago de ${formatCurrency(transaction.amount)} registrado exitosamente.\nSaldo actualizado de ${customer.name}: ${formatCurrency(newBalance)}`
          );

          // Check for Zero Balance
          if (newBalance <= 0) {
              sendLocalNotification(
                  '¡Deuda Saldada!', 
                  `${customer.name} ha pagado su deuda completa 🎉`
              );
          }
      }
  }
};


// --- BACKGROUND CHECKS (Simulated) ---

export const checkBackgroundNotifications = (storeId: string) => {
    if (!currentUser || !currentUser.notificationSettings.enabled) return;

    const customers = getLocalCustomers(storeId);
    const today = new Date();
    const lastCheckKey = 'last_daily_notification_check';
    const lastCheck = localStorage.getItem(lastCheckKey);
    
    // Only run once per day
    if (lastCheck && isSameDay(new Date(lastCheck), today)) {
        return; 
    }

    // --- 1. DAILY PAYMENT REMINDERS ---
    if (currentUser.notificationSettings.dailyReminders) {
        let overdueCount = 0;
        let dueTodayCount = 0; // Assuming "due today" means exactly 30 days old credit
        let overdueDaysMax = 0;
        let upcomingAmount = 0; // Credits created 29 days ago (due tomorrow)

        const tomorrow = addDays(today, 1);

        customers.forEach(c => {
            const { total, overdue } = calculateAging(c.transactions);
            if (total > 0) {
                if (overdue > 0) overdueCount++;
                
                // Check specific transactions for "Due Today" (30 days ago) or "Due Tomorrow" (29 days ago)
                c.transactions.forEach(t => {
                    if (t.type === 'CREDIT') {
                        const daysOld = differenceInDays(today, new Date(t.date));
                        if (daysOld === 30) dueTodayCount++;
                        if (daysOld === 29) upcomingAmount += t.amount;
                        if (daysOld > 30) {
                             if (daysOld > overdueDaysMax) overdueDaysMax = daysOld;
                        }
                    }
                });
            }
        });

        // Trigger notifications if relevant
        if (dueTodayCount > 0) {
            sendLocalNotification('Vencimientos de Hoy', `${dueTodayCount} clientes tienen créditos que vencen hoy.`);
        }
        if (overdueCount > 0) {
             sendLocalNotification('Cartera Vencida', `${overdueCount} clientes tienen ${overdueDaysMax} días o más de retraso.`);
        }
        if (upcomingAmount > 0) {
            sendLocalNotification('Cobros para Mañana', `Pagos próximos para mañana: ${formatCurrency(upcomingAmount)}`);
        }
    }

    // --- 4. WEEKLY SUMMARIES ---
    // Simple check: is today Monday?
    if (currentUser.notificationSettings.weeklyReports && today.getDay() === 1) { 
         // Calculate last week stats
         // Since today is Monday, we take previous week: [Today-7, Today-1]
         const startLastWeek = addDays(today, -7);
         startLastWeek.setHours(0, 0, 0, 0);

         const endLastWeek = addDays(today, -1);
         endLastWeek.setHours(23, 59, 59, 999);
         
         let collected = 0;
         let newClients = 0;
         let overdueAccounts = 0;

         customers.forEach(c => {
             // New clients
             if (isWithinInterval(new Date(c.createdAt), { start: startLastWeek, end: endLastWeek })) {
                 newClients++;
             }
             // Collected
             c.transactions.forEach(t => {
                 if (t.type === 'PAYMENT' && isWithinInterval(new Date(t.date), { start: startLastWeek, end: endLastWeek })) {
                     collected += t.amount;
                 }
             });
             // Overdue snapshot (current)
             if (calculateAging(c.transactions).overdue > 0) overdueAccounts++;
         });

         sendLocalNotification('Resumen Semanal', `Esta semana: ${formatCurrency(collected)} cobrados, ${newClients} nuevos clientes, ${overdueAccounts} cuentas vencidas.`);
    }

    // Update check time
    localStorage.setItem(lastCheckKey, today.toISOString());
};


// --- HELPERS (Calculations) ---

export const calculateBalance = (transactions: Transaction[]) => {
  return transactions.reduce((acc, t) => {
    return t.type === 'CREDIT' ? acc + t.amount : acc - t.amount;
  }, 0);
};

export const calculateAging = (transactions: Transaction[]) => {
  const totalBalance = calculateBalance(transactions);
  
  if (totalBalance <= 0) {
    return { current: 0, overdue: 0, total: totalBalance };
  }

  const now = new Date();
  const recentCredits = transactions
    .filter(t => t.type === 'CREDIT' && differenceInDays(now, new Date(t.date)) <= 30)
    .reduce((sum, t) => sum + t.amount, 0);

  let overdue = 0;
  let current = totalBalance;

  if (totalBalance > recentCredits) {
    overdue = totalBalance - recentCredits;
    current = recentCredits;
  }

  return { current, overdue, total: totalBalance };
};

export const getFinancialSummary = (customers: Customer[]): FinancialSummary => {
  let totalReceivable = 0;
  let currentDebt = 0;
  let overdueDebt = 0;
  const recentActivity: ActivityItem[] = [];

  customers.forEach(c => {
    const { current, overdue, total } = calculateAging(c.transactions);
    if (total > 0) {
        totalReceivable += total;
        currentDebt += current;
        overdueDebt += overdue;
    }

    // Collect recent activity
    c.transactions.forEach(t => {
      recentActivity.push({
        id: t.id,
        customerId: c.id,
        customerName: c.name,
        type: t.type,
        amount: t.amount,
        date: t.date
      });
    });
  });

  // Sort activity by date desc
  recentActivity.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return {
    totalReceivable,
    currentDebt,
    overdueDebt,
    activeCustomers: customers.filter(c => calculateBalance(c.transactions) > 0).length,
    recentActivity: recentActivity.slice(0, 10) // Top 10
  };
};
