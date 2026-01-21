import React, { useState, useEffect, useRef } from 'react';
import { X, TrendingUp, TrendingDown, CheckCircle, Search, User, AlertTriangle } from 'lucide-react';
import { Customer, Transaction } from '../types';
import { calculateAging } from '../services/dataService';

interface QuickTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  customers: Customer[];
  onConfirm: (customerId: string, transaction: Omit<Transaction, 'id'>) => void;
}

export const QuickTransactionModal: React.FC<QuickTransactionModalProps> = ({ 
  isOpen, 
  onClose, 
  customers, 
  onConfirm 
}) => {
  const [customerId, setCustomerId] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'CREDIT' | 'PAYMENT'>('CREDIT');
  const [description, setDescription] = useState('');
  
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Reset state when opening
  useEffect(() => {
    if (isOpen) {
      setCustomerId('');
      setCustomerSearch('');
      setAmount('');
      setType('CREDIT');
      setDescription('');
      setShowSuggestions(false);
    }
  }, [isOpen]);

  // Handle outside click for suggestions
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const selectedCustomer = customers.find(c => c.id === customerId);
  let creditStatus = null;
  if (selectedCustomer) {
      const { overdue } = calculateAging(selectedCustomer.transactions);
      creditStatus = overdue > 0 ? 'RISK' : 'SAFE';
  }

  const handleSelectCustomer = (customer: Customer) => {
    setCustomerId(customer.id);
    setCustomerSearch(customer.name);
    setShowSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !amount) return;

    onConfirm(customerId, {
      amount: Number(amount),
      type,
      description: description || (type === 'CREDIT' ? 'Compra a crédito' : 'Abono a cuenta'),
      date: new Date().toISOString()
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-dark-card w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Registrar Movimiento</h3>
            <button onClick={onClose} className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                <X size={20} />
            </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* Transaction Type Switch */}
            <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
                <button 
                    type="button"
                    onClick={() => setType('CREDIT')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${type === 'CREDIT' ? 'bg-white dark:bg-slate-700 text-primary-600 dark:text-white shadow-sm' : 'text-slate-400'}`}
                >
                    <TrendingUp size={16} /> Fiado (Venta)
                </button>
                <button 
                    type="button"
                    onClick={() => setType('PAYMENT')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-bold rounded-lg transition-all ${type === 'PAYMENT' ? 'bg-white dark:bg-slate-700 text-emerald-600 dark:text-white shadow-sm' : 'text-slate-400'}`}
                >
                    <TrendingDown size={16} /> Abono (Pago)
                </button>
            </div>

            {/* Customer Search Autocomplete */}
            <div className="relative" ref={searchContainerRef}>
                <div className={`bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 transition-colors ${creditStatus === 'RISK' ? 'bg-red-50 dark:bg-red-900/10 border-red-200' : creditStatus === 'SAFE' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200' : ''}`}>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 mb-1">Cliente</label>
                  <div className="flex items-center gap-2">
                      <Search size={16} className="text-slate-400" />
                      <input 
                        type="text"
                        className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white font-medium p-1"
                        placeholder="Buscar cliente..."
                        value={customerSearch}
                        onChange={(e) => {
                            setCustomerSearch(e.target.value);
                            setCustomerId(''); // Clear ID on type to ensure valid selection
                            setShowSuggestions(true);
                        }}
                        onFocus={() => setShowSuggestions(true)}
                        required
                      />
                  </div>
                  {/* Status Badge */}
                  {selectedCustomer && (
                     <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-700/50 flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                        {creditStatus === 'SAFE' ? (
                            <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                <CheckCircle size={12} /> CONFIABLE
                            </span>
                        ) : (
                            <span className="bg-red-100 text-red-800 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                <AlertTriangle size={12} /> MOROSO (Vencido)
                            </span>
                        )}
                        <span className="text-xs text-slate-400">
                           {creditStatus === 'SAFE' ? 'Puede recibir crédito' : 'Tiene saldos vencidos'}
                        </span>
                     </div>
                  )}
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && customerSearch && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 max-h-48 overflow-y-auto z-50">
                        {filteredCustomers.length > 0 ? (
                            filteredCustomers.map(c => (
                                <div 
                                    key={c.id}
                                    onClick={() => handleSelectCustomer(c)}
                                    className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer flex items-center gap-3 border-b border-slate-50 dark:border-slate-700/50 last:border-0"
                                >
                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                        <User size={14} />
                                    </div>
                                    <span className="text-slate-900 dark:text-white font-medium">{c.name}</span>
                                </div>
                            ))
                        ) : (
                            <div className="p-4 text-center text-slate-400 text-sm">No se encontraron clientes</div>
                        )}
                    </div>
                )}
            </div>

            {/* Amount Input */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 relative">
               <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 mb-1">Monto</label>
               <div className="relative">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input 
                        type="number" 
                        step="0.01" 
                        min="0.01"
                        required
                        className="w-full pl-6 pr-4 py-1 bg-transparent border-none text-2xl font-bold text-slate-900 dark:text-white outline-none placeholder:text-slate-300"
                        placeholder="0.00"
                        value={amount}
                        onChange={e => setAmount(e.target.value)}
                    />
               </div>
            </div>

            {/* Description Input */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase ml-1 mb-1">Nota</label>
              <input 
                type="text" 
                className="w-full p-1 bg-transparent border-none outline-none text-slate-900 dark:text-white" 
                placeholder="Descripción (opcional)" 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
              />
            </div>

            <div className="pt-2">
                <button 
                    type="submit" 
                    className={`w-full py-4 rounded-xl font-bold text-white shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2 ${type === 'CREDIT' ? 'bg-primary-600 shadow-primary-600/30' : 'bg-emerald-600 shadow-emerald-600/30'}`}
                >
                    <CheckCircle size={20} />
                    Confirmar {type === 'CREDIT' ? 'Fiado' : 'Abono'}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};