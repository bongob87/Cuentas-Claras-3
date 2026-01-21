import React, { useState, useMemo, useEffect } from 'react';
import { Customer, Transaction, UserLog } from '../types';
import { calculateAging, getUserLogs, User } from '../services/dataService';
import { formatCurrency } from '../utils';
import { 
  Users, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Clock,
  Filter,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  X
} from 'lucide-react';
import { 
  isAfter, 
  isSameMonth, 
  format 
} from 'date-fns';
import { es } from 'date-fns/locale';

const subDays = (date: Date, days: number) => {
  const result = new Date(date);
  result.setDate(result.getDate() - days);
  return result;
};

interface ReportsProps {
  customers: Customer[];
  user?: User | null; // Pass user to fetch logs
}

export const Reports: React.FC<ReportsProps> = ({ customers, user }) => {
  const [paymentFilter, setPaymentFilter] = useState<'15' | '30' | '60' | 'ALL'>('30');
  const [ledgerTimeframe, setLedgerTimeframe] = useState<'30' | 'ALL'>('30');
  const [showLogs, setShowLogs] = useState(false);
  const [logs, setLogs] = useState<UserLog[]>([]);

  useEffect(() => {
    if (showLogs && user) {
        setLogs(getUserLogs(user.currentStoreId));
    }
  }, [showLogs, user]);

  // --- Calculations ---

  const summaryData = useMemo(() => {
    let totalOwed = 0;
    let totalOverdue = 0;
    let activeClients = 0;
    
    // Risk Categories
    let reliable = 0;   
    let mediumRisk = 0; 
    let highRisk = 0;   

    // Transaction Lists for other calcs
    const allTransactions: (Transaction & { customerName: string })[] = [];

    customers.forEach(c => {
      const { total, overdue } = calculateAging(c.transactions);
      
      if (total > 0.01) {
        totalOwed += total;
        totalOverdue += overdue;
        activeClients++;

        if (overdue <= 0) {
          reliable++;
        } else if (overdue < total * 0.5) {
          mediumRisk++;
        } else {
          highRisk++;
        }
      }

      c.transactions.forEach(t => {
        allTransactions.push({
          ...t,
          customerName: c.name
        });
      });
    });

    return { 
      totalOwed, 
      totalOverdue, 
      activeClients, 
      reliable, 
      mediumRisk, 
      highRisk,
      allTransactions: allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    };
  }, [customers]);

  const paymentsTotal = useMemo(() => {
    const now = new Date();
    let cutoffDate = new Date(0); 
    
    if (paymentFilter !== 'ALL') {
      cutoffDate = subDays(now, parseInt(paymentFilter));
    }

    return summaryData.allTransactions
      .filter(t => t.type === 'PAYMENT' && isAfter(new Date(t.date), cutoffDate))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [summaryData.allTransactions, paymentFilter]);

  const creditsThisMonth = useMemo(() => {
    const now = new Date();
    return summaryData.allTransactions
      .filter(t => t.type === 'CREDIT' && isSameMonth(new Date(t.date), now))
      .reduce((sum, t) => sum + t.amount, 0);
  }, [summaryData.allTransactions]);

  const ledgerData = useMemo(() => {
    if (ledgerTimeframe === 'ALL') return summaryData.allTransactions;
    
    const cutoffDate = subDays(new Date(), 30);
    return summaryData.allTransactions.filter(t => isAfter(new Date(t.date), cutoffDate));
  }, [summaryData.allTransactions, ledgerTimeframe]);

  return (
    <div className="animate-in fade-in duration-300 pb-safe space-y-6 relative">
       
       <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Reportes</h2>
          <button 
             onClick={() => setShowLogs(true)}
             className="text-xs font-bold text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-3 py-2 rounded-xl flex items-center gap-1.5"
          >
             <FileText size={16} />
             Bitácora
          </button>
       </div>

       {/* Top Stats Grid */}
       <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          
          {/* Total Owed */}
          <div className="bg-white dark:bg-dark-card p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
             <div className="absolute top-0 right-0 p-4 opacity-5">
                <DollarSign size={80} className="text-slate-900 dark:text-white" />
             </div>
             <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Total por Cobrar</p>
             <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{formatCurrency(summaryData.totalOwed)}</h3>
             <div className="mt-4 flex items-center gap-2">
                <Users size={16} className="text-slate-400" />
                <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
                  {summaryData.activeClients} Clientes Activos
                </span>
             </div>
          </div>

          {/* Risk Breakdown */}
          <div className="bg-white dark:bg-dark-card p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between">
             <div className="flex justify-between items-start mb-2">
               <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Salud de Cartera</p>
             </div>
             <div className="space-y-3">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Confiables</span>
                   </div>
                   <span className="font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-md text-sm">{summaryData.reliable}</span>
                </div>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Riesgo Medio</span>
                   </div>
                   <span className="font-bold text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded-md text-sm">{summaryData.mediumRisk}</span>
                </div>
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Alto Riesgo</span>
                   </div>
                   <span className="font-bold text-red-600 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-md text-sm">{summaryData.highRisk}</span>
                </div>
             </div>
          </div>

          {/* Overdue */}
          <div className="bg-red-50 dark:bg-red-900/10 p-5 rounded-3xl border border-red-100 dark:border-red-900/30 shadow-sm">
             <div className="flex items-center gap-2 mb-2">
                <AlertTriangle size={18} className="text-red-500" />
                <p className="text-xs font-bold text-red-400 uppercase tracking-wider">Vencido (+30 días)</p>
             </div>
             <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">{formatCurrency(summaryData.totalOverdue)}</h3>
          </div>

          {/* New Credits */}
          <div className="bg-blue-50 dark:bg-blue-900/10 p-5 rounded-3xl border border-blue-100 dark:border-blue-900/30 shadow-sm">
             <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={18} className="text-blue-500" />
                <p className="text-xs font-bold text-blue-400 uppercase tracking-wider">Fiado este Mes</p>
             </div>
             <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400">{formatCurrency(creditsThisMonth)}</h3>
          </div>
       </div>

       {/* Payments Filter Box */}
       <div className="bg-white dark:bg-dark-card p-5 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                  <TrendingDown size={20} className="text-emerald-500" />
                  <span className="font-bold text-slate-900 dark:text-white">Pagos Recibidos</span>
              </div>
              <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
                  {(['15', '30', '60', 'ALL'] as const).map((period) => (
                      <button
                        key={period}
                        onClick={() => setPaymentFilter(period)}
                        className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                            paymentFilter === period 
                            ? 'bg-white dark:bg-slate-600 text-emerald-600 dark:text-white shadow-sm' 
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        {period === 'ALL' ? 'Hist' : `${period}d`}
                      </button>
                  ))}
              </div>
          </div>
          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(paymentsTotal)}</p>
          <p className="text-xs text-slate-400 mt-1">
              Total abonado en {paymentFilter === 'ALL' ? 'el historial' : `los últimos ${paymentFilter} días`}
          </p>
       </div>

       {/* Ledger Table */}
       <div className="bg-white dark:bg-dark-card rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/20">
             <h3 className="font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock size={18} className="text-slate-400" />
                Historial General
             </h3>
             <button 
                onClick={() => setLedgerTimeframe(ledgerTimeframe === '30' ? 'ALL' : '30')}
                className="flex items-center gap-1 text-xs font-bold text-primary-600 bg-primary-50 dark:bg-primary-900/20 px-2 py-1 rounded-lg"
             >
                <Filter size={12} />
                {ledgerTimeframe === '30' ? 'Últimos 30 días' : 'Todo el historial'}
             </button>
          </div>
          
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
             {ledgerData.length === 0 ? (
                 <div className="p-8 text-center text-slate-400 text-sm">
                     No hay movimientos en este periodo.
                 </div>
             ) : (
                 ledgerData.map((t) => (
                    <div key={t.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-3 overflow-hidden">
                            <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                                t.type === 'CREDIT' 
                                ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' 
                                : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                            }`}>
                                {t.type === 'CREDIT' ? <ArrowUpRight size={20} /> : <ArrowDownLeft size={20} />}
                            </div>
                            <div className="min-w-0">
                                <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{t.customerName}</p>
                                <p className="text-xs text-slate-500 truncate">{t.description}</p>
                            </div>
                        </div>
                        <div className="text-right shrink-0 ml-2">
                            <span className={`block font-bold ${
                                t.type === 'CREDIT' ? 'text-slate-900 dark:text-white' : 'text-emerald-600'
                            }`}>
                                {t.type === 'CREDIT' ? '+' : '-'} {formatCurrency(t.amount)}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                                {format(new Date(t.date), "d MMM", { locale: es })}
                            </span>
                        </div>
                    </div>
                 ))
             )}
          </div>
       </div>

       {/* LOGS MODAL */}
       {showLogs && (
           <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
              <div className="bg-white dark:bg-dark-card w-full sm:max-w-xl h-[80vh] sm:h-auto sm:max-h-[80vh] rounded-t-3xl sm:rounded-3xl shadow-2xl animate-in slide-in-from-bottom duration-300 flex flex-col">
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-slate-900 dark:text-white">Bitácora de Usuario</h3>
                      <button onClick={() => setShowLogs(false)} className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                          <X size={20} className="text-slate-500" />
                      </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 space-y-3">
                      {logs.length === 0 ? (
                          <div className="text-center py-10 text-slate-400">No hay registros de actividad.</div>
                      ) : (
                          logs.map(log => (
                              <div key={log.id} className="text-sm border-b border-slate-50 dark:border-slate-800/50 pb-3 last:border-0">
                                  <div className="flex justify-between items-start mb-1">
                                      <span className="font-bold text-xs uppercase text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                                          {log.action.replace('_', ' ')}
                                      </span>
                                      <span className="text-xs text-slate-400">
                                          {format(new Date(log.timestamp), "d MMM yyyy, h:mm aa", { locale: es })}
                                      </span>
                                  </div>
                                  <p className="text-slate-800 dark:text-slate-200 font-medium">{log.details}</p>
                                  {log.duration && (
                                      <p className="text-xs text-slate-400 mt-0.5">Duración: {log.duration}</p>
                                  )}
                              </div>
                          ))
                      )}
                  </div>
              </div>
           </div>
       )}

    </div>
  );
};
