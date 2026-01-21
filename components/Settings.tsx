import React, { useState } from 'react';
import { User, joinStore, updateNotificationSettings, requestNotificationPermission } from '../services/dataService';
import { LogOut, Copy, Check, Users, Store, ArrowRight, Loader2, Bell, Smartphone, DollarSign, Calendar, RefreshCw } from 'lucide-react';
import { NotificationSettings } from '../types';

interface SettingsProps {
  user: User;
  onLogout: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ user, onLogout }) => {
  const [joinStoreId, setJoinStoreId] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [copied, setCopied] = useState(false);

  const notifications = user.notificationSettings;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(user.currentStoreId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinStoreId.trim()) return;

    setIsJoining(true);
    try {
        await joinStore(joinStoreId.trim());
        setJoinStoreId('');
    } catch (e) {
        console.error(e);
    } finally {
        setIsJoining(false);
    }
  };

  const toggleNotification = async (key: keyof NotificationSettings) => {
      // If enabling globally, request permission first
      if (key === 'enabled' && !notifications.enabled) {
          const granted = await requestNotificationPermission();
          if (!granted) {
              alert("Debes permitir las notificaciones en tu navegador para activar esta función.");
              return;
          }
      }

      const newSettings = {
          ...notifications,
          [key]: !notifications[key]
      };
      await updateNotificationSettings(newSettings);
  };

  return (
    <div className="animate-in fade-in duration-300 pb-safe space-y-6">
       
       <div className="flex items-center gap-2 mb-2">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Perfil y Ajustes</h2>
       </div>

       {/* Profile Card */}
       <div className="bg-white dark:bg-dark-card rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 flex items-center gap-4">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center shrink-0">
               {user.photoURL ? (
                   <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
               ) : (
                   <span className="text-2xl font-bold text-primary-600 dark:text-primary-400">{user.email?.charAt(0).toUpperCase()}</span>
               )}
            </div>
            <div className="min-w-0">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">{user.displayName || 'Usuario'}</h3>
                <p className="text-sm text-slate-500 truncate">{user.email}</p>
            </div>
       </div>

       {/* Notification Settings */}
       <div className="bg-white dark:bg-dark-card rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
           <div className="flex items-center gap-2 mb-4">
               <Bell size={20} className="text-primary-600 dark:text-primary-400" />
               <h3 className="font-bold text-lg text-slate-900 dark:text-white">Notificaciones</h3>
           </div>
           
           <div className="space-y-4">
               {/* Global Toggle */}
               <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                   <div>
                       <p className="font-bold text-slate-900 dark:text-white">Activar Notificaciones</p>
                       <p className="text-xs text-slate-500">Recibe alertas importantes de tu negocio</p>
                   </div>
                   <button 
                       onClick={() => toggleNotification('enabled')}
                       className={`w-12 h-7 rounded-full transition-colors relative ${notifications.enabled ? 'bg-primary-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                   >
                       <div className={`w-5 h-5 bg-white rounded-full shadow-sm absolute top-1 transition-transform ${notifications.enabled ? 'left-6' : 'left-1'}`}></div>
                   </button>
               </div>

               {notifications.enabled && (
                   <div className="space-y-4 animate-in slide-in-from-top-2">
                       <ToggleOption 
                            icon={Calendar}
                            label="Recordatorios Diarios"
                            sublabel="Vencimientos hoy, atrasos y cobros para mañana"
                            checked={notifications.dailyReminders}
                            onChange={() => toggleNotification('dailyReminders')}
                       />
                       <ToggleOption 
                            icon={DollarSign}
                            label="Confirmación de Pagos"
                            sublabel="Avisos de pago registrado y balance en cero"
                            checked={notifications.payments}
                            onChange={() => toggleNotification('payments')}
                       />
                       <ToggleOption 
                            icon={Store}
                            label="Reportes Semanales"
                            sublabel="Resumen de cobros y nuevos clientes"
                            checked={notifications.weeklyReports}
                            onChange={() => toggleNotification('weeklyReports')}
                       />
                       <ToggleOption 
                            icon={RefreshCw}
                            label="Estado del Sistema"
                            sublabel="Avisos de modo sin conexión y sincronización"
                            checked={notifications.appUpdates}
                            onChange={() => toggleNotification('appUpdates')}
                       />
                   </div>
               )}
           </div>
       </div>

       {/* Store Sharing Section */}
       <div className="bg-gradient-to-br from-slate-900 to-slate-800 dark:from-slate-800 dark:to-black text-white rounded-3xl p-6 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 p-6 opacity-10">
                <Store size={100} />
            </div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-2 bg-white/10 rounded-lg">
                        <Users size={20} className="text-primary-400" />
                    </div>
                    <div>
                        <h4 className="font-bold text-lg leading-tight">{user.storeName || 'Tu Tienda'}</h4>
                        <p className="text-xs text-slate-400">Comparte este código para colaborar</p>
                    </div>
                </div>

                <div className="bg-white/10 rounded-xl p-4 flex items-center justify-between gap-3 border border-white/10 backdrop-blur-sm">
                    <code className="font-mono text-lg font-bold tracking-wider text-primary-300 truncate">
                        {user.currentStoreId}
                    </code>
                    <button 
                        onClick={handleCopyCode}
                        className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                        title="Copiar código"
                    >
                        {copied ? <Check size={20} className="text-emerald-400" /> : <Copy size={20} />}
                    </button>
                </div>
            </div>
       </div>

       {/* Join Store Section */}
       <div className="bg-white dark:bg-dark-card rounded-3xl p-6 shadow-sm border border-slate-100 dark:border-slate-800">
            <h4 className="font-bold text-slate-900 dark:text-white mb-2">Unirse a otra tienda</h4>
            <p className="text-sm text-slate-500 mb-4">
                Ingresa el código de otra tienda para gestionar sus cuentas.
            </p>
            
            <form onSubmit={handleJoinStore} className="flex gap-2">
                <input 
                    type="text" 
                    placeholder="Código de tienda (ej. store-xyz123)"
                    value={joinStoreId}
                    onChange={(e) => setJoinStoreId(e.target.value)}
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button 
                    type="submit"
                    disabled={isJoining || !joinStoreId}
                    className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-4 rounded-xl font-bold shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95"
                >
                    {isJoining ? <Loader2 className="animate-spin" size={20} /> : <ArrowRight size={20} />}
                </button>
            </form>
       </div>

       {/* Logout Button */}
       <button 
            onClick={onLogout}
            className="w-full p-4 flex items-center justify-center gap-2 text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/10 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-2xl transition-colors"
       >
            <LogOut size={20} />
            Cerrar Sesión
       </button>

       <div className="text-center text-xs text-slate-400 pt-4">
          Cuentas Claras v1.0.0
       </div>
    </div>
  );
};

const ToggleOption = ({ icon: Icon, label, sublabel, checked, onChange }: any) => (
    <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500">
                <Icon size={18} />
            </div>
            <div>
                <p className="font-bold text-sm text-slate-900 dark:text-white">{label}</p>
                <p className="text-[10px] text-slate-500 max-w-[200px] leading-tight">{sublabel}</p>
            </div>
        </div>
        <button 
            onClick={onChange}
            className={`w-10 h-6 rounded-full transition-colors relative ${checked ? 'bg-primary-600' : 'bg-slate-200 dark:bg-slate-700'}`}
        >
            <div className={`w-4 h-4 bg-white rounded-full shadow-sm absolute top-1 transition-transform ${checked ? 'left-5' : 'left-1'}`}></div>
        </button>
    </div>
);
