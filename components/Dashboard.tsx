import React from 'react';
import { FinancialSummary, Tab } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { TrendingUp, Clock, ArrowUpRight, ArrowDownLeft, Plus, UserPlus, CheckCircle, AlertTriangle } from 'lucide-react';
import { formatCurrency } from '../utils';

interface DashboardProps {
  summary: FinancialSummary;
  setTab: (tab: Tab) => void;
  onQuickAction: () => void;
  onAddCustomer: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ summary, setTab, onQuickAction, onAddCustomer }) => {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Main Hero Card */}
      <div className="bg-dark-bg dark:bg-slate-800 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl ring-1 ring-white/10">
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total Por Cobrar</p>
            <div className="p-2 bg-white/10 rounded-full backdrop-blur-sm">
                <TrendingUp size={20} className="text-emerald-400" />
            </div>
          </div>
          <h2 className="text-4xl font-bold mb-4 tracking-tight">{formatCurrency(summary.totalReceivable)}</h2>
          <div className="flex items-center gap-4 text-sm font-medium">
             <span className="text-slate-400 text-xs">Balance general de la tienda</span>
          </div>
        </div>
        
        {/* Background Decorations */}
        <div className="absolute -right-6 -bottom-10 opacity-10">
            <TrendingUp size={180} />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <button 
            onClick={onQuickAction}
            className="p-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl shadow-lg shadow-primary-600/20 transition-all active:scale-95 flex flex-col items-center justify-center gap-2"
        >
            <div className="p-2 bg-white/20 rounded-full">
                <Plus size={24} />
            </div>
            <span className="font-bold text-sm">Nuevo Movimiento</span>
        </button>
        <button 
            onClick={onAddCustomer}
            className="p-4 bg-white dark:bg-dark-card hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-white rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 transition-all active:scale-95 flex flex-col items-center justify-center gap-2"
        >
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-full">
                <UserPlus size={24} className="text-primary-600 dark:text-primary-400" />
            </div>
            <span className="font-bold text-sm">Agregar Cliente</span>
        </button>
      </div>

      {/* Stats Row - Current vs Overdue */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white dark:bg-dark-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2 text-emerald-600">
                <CheckCircle size={18} />
                <span className="text-xs font-bold uppercase">Corriente</span>
            </div>
            <p className="text-xl font-bold text-emerald-600 dark:text-emerald-400 truncate">
               {formatCurrency(summary.currentDebt)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Menos de 30 días</p>
        </div>
        <div className="bg-white dark:bg-dark-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
            <div className="flex items-center gap-2 mb-2 text-red-500">
                <AlertTriangle size={18} />
                <span className="text-xs font-bold uppercase">Vencido</span>
            </div>
            <p className="text-xl font-bold text-red-500 dark:text-red-400 truncate">
               {formatCurrency(summary.overdueDebt)}
            </p>
            <p className="text-[10px] text-slate-400 mt-1">Más de 30 días</p>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
                <Clock size={20} className="text-slate-400" />
                Actividad Reciente
            </h3>
        </div>
        <div className="bg-white dark:bg-dark-card rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {summary.recentActivity.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">No hay actividad reciente.</div>
            ) : (
                summary.recentActivity.map((activity) => (
                    <div key={activity.id} className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${activity.type === 'CREDIT' ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'}`}>
                                {activity.type === 'CREDIT' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                            </div>
                            <div>
                                <p className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">{activity.customerName}</p>
                                <p className="text-xs text-slate-400">
                                    {format(new Date(activity.date), "d MMM, h:mm aa", { locale: es })}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`block font-bold text-sm ${activity.type === 'CREDIT' ? 'text-slate-900 dark:text-white' : 'text-emerald-600'}`}>
                                {activity.type === 'CREDIT' ? '+' : '-'} {formatCurrency(activity.amount)}
                            </span>
                            <span className="text-[10px] uppercase font-bold text-slate-300">{activity.type === 'CREDIT' ? 'Cargo' : 'Abono'}</span>
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
};