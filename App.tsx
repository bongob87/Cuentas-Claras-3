import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { Customers } from './components/Customers';
import { Reports } from './components/Reports';
import { Digitize } from './components/Digitize';
import { AuthScreen } from './components/AuthScreen';
import { QuickTransactionModal } from './components/QuickTransactionModal';
import { AddCustomerModal } from './components/AddCustomerModal';
import { Settings } from './components/Settings';
import { Tab, Customer, Transaction } from './types';
import { 
  subscribeToCustomers, 
  saveCustomerToDb, 
  addTransactionToDb, 
  getFinancialSummary, 
  subscribeToAuth, 
  logout, 
  User, 
  checkBackgroundNotifications,
  sendLocalNotification
} from './services/dataService';
import { generateId } from './utils';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const [activeTab, setActiveTab] = useState<Tab>(Tab.DASHBOARD);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isQuickTxOpen, setIsQuickTxOpen] = useState(false);
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);

  // 1. Auth Subscription
  useEffect(() => {
    const unsubscribe = subscribeToAuth((currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Data Subscription & Background Checks
  useEffect(() => {
    if (!user) {
        setCustomers([]);
        return;
    }

    setDataLoading(true);
    // Check system preference for dark mode
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setIsDarkMode(true);
    }

    // Run Daily/Weekly Notification Checks
    checkBackgroundNotifications(user.currentStoreId);

    const unsubscribe = subscribeToCustomers(user.currentStoreId, (data) => {
      setCustomers(data);
      setDataLoading(false);
    });
    return () => unsubscribe();
  }, [user]);

  // 3. Offline/Online Status Listeners
  useEffect(() => {
      const handleOffline = () => {
          if (user?.notificationSettings.appUpdates) {
             sendLocalNotification('Sin Conexión', 'Modo sin conexión: se sincronizará al estar en línea');
          }
      };
      
      const handleOnline = () => {
           // Optional: notify back online
      };

      window.addEventListener('offline', handleOffline);
      window.addEventListener('online', handleOnline);

      return () => {
          window.removeEventListener('offline', handleOffline);
          window.removeEventListener('online', handleOnline);
      };
  }, [user]);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  const handleLogout = async () => {
      try {
          await logout();
      } catch (error) {
          console.error("Error logging out", error);
      }
  };

  const handleAddCustomer = async (newCustomerData: Omit<Customer, 'id' | 'createdAt' | 'transactions' | 'avatarUrl'> & { avatarUrl?: string }) => {
    if (!user) return;
    const newCustomer: Customer = {
      ...newCustomerData,
      id: generateId(),
      createdAt: new Date().toISOString(),
      avatarUrl: newCustomerData.avatarUrl || `https://picsum.photos/200/200?random=${Math.floor(Math.random() * 1000)}`,
      transactions: []
    };
    
    // Save to the current store
    await saveCustomerToDb(user.currentStoreId, newCustomer);
  };

  const handleAddTransaction = async (customerId: string, transactionData: Omit<Transaction, 'id'>) => {
    if (!user) return;
    const transaction: Transaction = {
      ...transactionData,
      id: generateId()
    };
    // Save to the current store
    await addTransactionToDb(user.currentStoreId, customerId, transaction);
  };

  const handleBatchImport = async (items: any[]) => {
    if (!user) return;
    
    for (const item of items) {
        let targetCustomer = customers.find(c => c.name.toLowerCase() === item.customerName.toLowerCase());
        
        let customerId = targetCustomer?.id;

        if (!targetCustomer) {
            // Create new customer
            const newCustomer: Customer = {
                id: generateId(),
                name: item.customerName,
                createdAt: new Date().toISOString(),
                avatarUrl: `https://picsum.photos/200/200?random=${Math.floor(Math.random() * 1000)}`,
                transactions: [],
                address: 'Importado de libreta'
            };
            await saveCustomerToDb(user.currentStoreId, newCustomer);
            customerId = newCustomer.id;
        }

        if (customerId) {
           await addTransactionToDb(user.currentStoreId, customerId, {
                id: generateId(),
                amount: item.amount,
                type: item.type,
                date: new Date().toISOString(),
                description: item.description
           });
        }
    }

    setActiveTab(Tab.CUSTOMERS);
  };

  const summary = getFinancialSummary(customers);

  if (authLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 dark:bg-dark-bg text-slate-900 dark:text-white">
        <Loader2 className="w-12 h-12 text-primary-600 animate-spin mb-4" />
      </div>
    );
  }

  if (!user) {
      return <AuthScreen />;
  }

  return (
    <Layout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      isDarkMode={isDarkMode}
      toggleTheme={toggleTheme}
      onLogout={handleLogout}
    >
      {activeTab === Tab.DASHBOARD && (
        <Dashboard 
            summary={summary} 
            setTab={setActiveTab} 
            onQuickAction={() => setIsQuickTxOpen(true)}
            onAddCustomer={() => setIsAddCustomerOpen(true)}
        />
      )}
      {activeTab === Tab.CUSTOMERS && (
        <Customers 
          customers={customers} 
          onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
          onAddTransaction={handleAddTransaction}
          onQuickAction={() => setIsQuickTxOpen(true)}
        />
      )}
      {activeTab === Tab.REPORTS && <Reports customers={customers} user={user} />}
      {activeTab === Tab.DIGITIZE && (
        <Digitize customers={customers} onImport={handleBatchImport} />
      )}
      {activeTab === Tab.SETTINGS && (
        <Settings user={user} onLogout={handleLogout} />
      )}

      <QuickTransactionModal 
        isOpen={isQuickTxOpen}
        onClose={() => setIsQuickTxOpen(false)}
        customers={customers}
        onConfirm={handleAddTransaction}
      />

      <AddCustomerModal 
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onSave={handleAddCustomer}
      />
    </Layout>
  );
}
