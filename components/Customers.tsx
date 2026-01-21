import React, { useState } from 'react';
import { Customer, Transaction } from '../types';
import { calculateAging } from '../services/dataService';
import { formatCurrency } from '../utils';
import { Search, Plus, ArrowLeft, CheckCircle, AlertTriangle, ChevronRight, Wallet, Calendar, History, ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface CustomersProps {
  customers: Customer[];
  onOpenAddCustomer: () => void;
  onAddTransaction: (customerId: string, transaction: Omit<Transaction, 'id'>) => void;
  onQuickAction: () => void;
}

export const Customers: React.FC<CustomersProps> = ({ customers, onOpenAddCustomer, onAddTransaction, onQuickAction }) => {
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const activeCustomer = customers.find(c => c.id === selectedCustomerId);

  // Calculate Totals for Header
  const totalReceivable = customers.reduce((acc, c) => acc + calculateAging(c.transactions).total, 0);
  const totalOverdue = customers.reduce((acc, c) => acc + calculateAging(c.transactions).overdue, 0);

  if (selectedCustomerId && activeCustomer) {
    return (
      <CustomerDetail 
        customer={activeCustomer} 
        onBack={() => setSelectedCustomerId(null)}
        onAddTransaction={(t) => onAddTransaction(activeCustomer.id, t)}
      />
    );
  }

  // Sort customers alphabetically A-Z
  const sortedCustomers = [...customers].sort((a, b) => 
      a.name.localeCompare(b.name)
  );

  const filteredCustomers = sortedCustomers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone?.includes(searchTerm)
  );

  return (
    <div className="animate-in fade-in duration-300 relative h-full flex flex-col pb-safe">
      
      {/* Financial Summary Header - Compact */}
      <div className="mb-4 grid grid-cols-2 gap-3 shrink-0">
          <div className="bg-white dark:bg-dark-card p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center relative overflow-hidden">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total por Cobrar</span>
              <span className="text-lg font-bold text-slate-900 dark:text-white truncate">{formatCurrency(totalReceivable)}</span>
          </div>
          <div className="bg-white dark:bg-dark-card p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center relative overflow-hidden">
              <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider mb-0.5">Vencido (+30 días)</span>
              <span className="text-lg font-bold text-red-500 truncate">{formatCurrency(totalOverdue)}</span>
          </div>
      </div>

      {/* Search Header */}
      <div className="mb-4 sticky top-0 z-10 shrink-0">
        <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
            <input 
            type="text" 
            placeholder="Buscar por nombre o teléfono..." 
            className="w-full pl-11 pr-4 py-3 rounded-xl border-none bg-white dark:bg-dark-card text-slate-900 dark:text-white shadow-sm ring-1 ring-slate-200 dark:ring-slate-800 focus:ring-2 focus:ring-primary-500 outline-none transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
      </div>

      {/* Customer List - Cards View */}
      <div className="flex-1 overflow-y-auto pb-24 space-y-4">
        {filteredCustomers.length === 0 ? (
             <div className="text-center py-12 opacity-50">
                 <p>No se encontraron clientes.</p>
             </div>
        ) : (
            filteredCustomers.map(customer => {
            const { overdue, current, total } = calculateAging(customer.transactions);
            
            // Determine Risk Badge
            let statusConfig = { label: 'Sin Deuda', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' };
            if (total > 0) {
                if (overdue >= total * 0.5) {
                    statusConfig = { label: 'Alto Riesgo', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' };
                } else if (overdue > 0) {
                    statusConfig = { label: 'Riesgo Medio', color: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' };
                } else {
                    statusConfig = { label: 'Confiable', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' };
                }
            }

            // Find Last Payment
            const lastPayment = customer.transactions
                .filter(t => t.type === 'PAYMENT')
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

            // Find Oldest Credit (Approximation: Oldest transaction contributing to debt)
            const oldestCredit = customer.transactions
                .filter(t => t.type === 'CREDIT')
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())[0];

            return (
                <div 
                key={customer.id} 
                onClick={() => setSelectedCustomerId(customer.id)}
                className="bg-white dark:bg-dark-card rounded-2xl p-5 shadow-sm border border-slate-100 dark:border-slate-800 active:scale-[0.99] transition-all"
                >
                    <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                            <img src={customer.avatarUrl} alt={customer.name} className="w-12 h-12 rounded-full bg-slate-100 object-cover ring-2 ring-slate-50 dark:ring-slate-800" />
                            <div>
                                <h3 className="font-bold text-base text-slate-900 dark:text-white leading-tight">{customer.name}</h3>
                                <p className="text-xs text-slate-500 mt-0.5">{customer.phone || 'Sin teléfono'}</p>
                            </div>
                        </div>
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide ${statusConfig.color}`}>
                            {statusConfig.label}
                        </span>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4 py-4 border-t border-b border-slate-100 dark:border-slate-800/50">
                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Balance Total</p>
                            <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(total)}</p>
                        </div>
                        <div className="space-y-2">
                             <div className="flex justify-between items-center text-xs">
                                <span className="text-emerald-600 dark:text-emerald-400 font-medium">Corriente:</span>
                                <span className="font-bold text-emerald-700 dark:text-emerald-300">{formatCurrency(current)}</span>
                             </div>
                             <div className="flex justify-between items-center text-xs">
                                <span className="text-red-500 font-medium">Vencido:</span>
                                <span className="font-bold text-red-600 dark:text-red-400">{formatCurrency(overdue)}</span>
                             </div>
                        </div>
                    </div>

                    {/* Footer Info */}
                    <div className="flex justify-between items-center mt-3 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                             <History size={14} />
                             <span className="font-medium">Deuda + antigua:</span>
                             <span className="text-slate-700 dark:text-slate-200">
                                {oldestCredit && total > 0 
                                    ? format(new Date(oldestCredit.date), "d MMM yyyy", { locale: es }) 
                                    : '--'}
                             </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
                             <Calendar size={14} />
                             <span className="font-medium">Último Pago:</span>
                             <span className="text-slate-700 dark:text-slate-200">
                                {lastPayment 
                                    ? format(new Date(lastPayment.date), "d MMM", { locale: es }) 
                                    : '--'}
                             </span>
                        </div>
                    </div>
                </div>
            );
            })
        )}
      </div>

      {/* FAB - Add Customer */}
      <button 
        onClick={onOpenAddCustomer}
        className="fixed bottom-24 right-4 w-12 h-12 bg-slate-900 dark:bg-primary-600 text-white rounded-full shadow-lg shadow-slate-900/20 flex items-center justify-center transition-transform active:scale-90 z-30"
        title="Nuevo Cliente"
      >
        <Plus size={24} />
      </button>

    </div>
  );
};

const CustomerDetail: React.FC<{ 
  customer: Customer; 
  onBack: () => void;
  onAddTransaction: (t: Omit<Transaction, 'id'>) => void;
}> = ({ customer, onBack, onAddTransaction }) => {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [transactionType, setTransactionType] = useState<'CREDIT' | 'PAYMENT'>('CREDIT');

  const { overdue, total } = calculateAging(customer.transactions);
  
  const isCreditWorthy = overdue <= 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) return;
    
    onAddTransaction({
      amount: Number(amount),
      description: description || (transactionType === 'CREDIT' ? 'Compra a crédito' : 'Abono a cuenta'),
      type: transactionType,
      date: new Date().toISOString()
    });
    setAmount('');
    setDescription('');
  };

  const sortedTransactions = [...customer.transactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="animate-in slide-in-from-right duration-300 pb-safe">
      <button onClick={onBack} className="flex items-center gap-1 text-slate-500 font-medium mb-4 -ml-2 p-2 rounded-lg active:bg-slate-100 dark:active:bg-slate-800">
        <ArrowLeft size={20} />
        <span>Regresar</span>
      </button>

      <div className="flex flex-col gap-6">
        {/* Profile Card */}
        <div className="bg-white dark:bg-dark-card rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 text-center relative overflow-hidden">
             <div className={`absolute top-0 left-0 right-0 h-20 ${total > 0 && overdue > 0 ? 'bg-red-500' : 'bg-primary-600'}`}></div>
             <div className="relative z-10">
                <img src={customer.avatarUrl} alt={customer.name} className="w-20 h-20 rounded-full mx-auto mb-3 object-cover border-4 border-white dark:border-dark-card shadow-md" />
                <h2 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">{customer.name}</h2>
                <div className="flex justify-center items-center gap-2 mt-2">
                    {isCreditWorthy ? (
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <CheckCircle size={10} /> CONFIABLE
                        </span>
                    ) : (
                        <span className="bg-red-100 text-red-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <AlertTriangle size={10} /> MOROSO
                        </span>
                    )}
                </div>
             </div>
             <div className="mt-4 grid grid-cols-2 gap-4 border-t border-slate-100 dark:border-slate-800 pt-4">
                 <div>
                     <p className="text-xs text-slate-400 font-medium uppercase">Deuda Total</p>
                     <p className="text-xl font-bold text-slate-900 dark:text-white">{formatCurrency(total)}</p>
                 </div>
                 <div>
                     <p className="text-xs text-slate-400 font-medium uppercase">Vencido</p>
                     <p className={`text-xl font-bold ${overdue > 0 ? 'text-red-500' : 'text-slate-400'}`}>{formatCurrency(overdue)}</p>
                 </div>
             </div>
        </div>

        {/* Transaction Form */}
        <div className="bg-white dark:bg-dark-card rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800">
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 mb-4">
              <button 
                onClick={() => setTransactionType('CREDIT')}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${transactionType === 'CREDIT' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-white shadow-sm' : 'text-slate-400'}`}
              >
                Fiado
              </button>
              <button 
                onClick={() => setTransactionType('PAYMENT')}
                className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${transactionType === 'PAYMENT' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-white shadow-sm' : 'text-slate-400'}`}
              >
                Abono
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="relative">
                   <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</span>
                   <input 
                      type="number" 
                      step="0.01" 
                      min="0.01"
                      required
                      className="w-full pl-10 pr-4 py-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-none font-bold text-2xl text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none" 
                      placeholder="0.00"
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                    />
                </div>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border-none text-slate-900 dark:text-white focus:ring-2 focus:ring-primary-500 outline-none" 
                  placeholder="Nota (opcional)"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              <button type="submit" className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 ${transactionType === 'CREDIT' ? 'bg-primary-600 shadow-primary-600/30' : 'bg-emerald-600 shadow-emerald-600/30'}`}>
                {transactionType === 'CREDIT' ? 'Agregar Deuda' : 'Registrar Abono'}
              </button>
            </form>
        </div>

        {/* Ledger List */}
        <div>
            <h3 className="font-bold text-slate-900 dark:text-white mb-3 px-2">Movimientos</h3>
            <div className="bg-white dark:bg-dark-card rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
                {sortedTransactions.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-sm">Sin historial.</div>
                ) : (
                    sortedTransactions.map(t => (
                     <div key={t.id} className="p-4 flex justify-between items-center">
                       <div>
                         <p className="font-bold text-sm text-slate-800 dark:text-white">{t.description}</p>
                         <p className="text-xs text-slate-400">{format(new Date(t.date), "d MMM, h:mm aa", { locale: es })}</p>
                       </div>
                       <div className="text-right">
                         <span className={`block font-bold ${t.type === 'CREDIT' ? 'text-slate-800 dark:text-slate-200' : 'text-emerald-600'}`}>
                            {t.type === 'CREDIT' ? '' : '-'} {formatCurrency(t.amount)}
                         </span>
                         <span className="text-[10px] uppercase font-bold text-slate-300">{t.type === 'CREDIT' ? 'Cargo' : 'Abono'}</span>
                       </div>
                     </div>
                   ))
                )}
            </div>
        </div>
      </div>
    </div>
  );
};