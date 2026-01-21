import React, { useState } from 'react';
import { X, User, Phone, MapPin, Camera } from 'lucide-react';
import { Customer } from '../types';

interface AddCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (customer: Omit<Customer, 'id' | 'createdAt' | 'transactions' | 'avatarUrl'> & { avatarUrl?: string }) => void;
}

export const AddCustomerModal: React.FC<AddCustomerModalProps> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) return;

    onSave({
      name,
      phone,
      address,
      avatarUrl: imagePreview || undefined
    });
    
    // Reset form
    setName('');
    setPhone('');
    setAddress('');
    setImagePreview(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-dark-card w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom duration-300">
        <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Nuevo Cliente</h3>
            <button onClick={onClose} className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                <X size={20} />
            </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
            {/* Image Upload */}
            <div className="flex justify-center mb-6">
                <div className="relative">
                    <div className="w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center overflow-hidden border-2 border-dashed border-slate-300 dark:border-slate-600">
                        {imagePreview ? (
                            <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                        ) : (
                            <User size={32} className="text-slate-400" />
                        )}
                    </div>
                    <label className="absolute bottom-0 right-0 p-2 bg-primary-600 rounded-full text-white shadow-lg cursor-pointer hover:bg-primary-700 transition-colors">
                        <Camera size={16} />
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                    </label>
                </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
              <User size={20} className="text-slate-400 ml-2" />
              <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Nombre y Apellidos <span className="text-red-500">*</span></label>
                  <input required type="text" className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white font-medium" placeholder="Ej. Juan Pérez" value={name} onChange={e => setName(e.target.value)} />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
              <Phone size={20} className="text-slate-400 ml-2" />
              <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Teléfono <span className="text-red-500">*</span></label>
                  <input required type="tel" className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white font-medium" placeholder="Ej. 55 1234 5678" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
              <MapPin size={20} className="text-slate-400 ml-2" />
              <div className="flex-1">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase">Dirección</label>
                  <input type="text" className="w-full bg-transparent border-none outline-none text-slate-900 dark:text-white font-medium" placeholder="Ej. Av. Principal #123" value={address} onChange={e => setAddress(e.target.value)} />
              </div>
            </div>

          <div className="mt-8 pt-4">
            <button type="submit" className="w-full py-4 rounded-xl bg-primary-600 text-white hover:bg-primary-700 font-bold shadow-lg shadow-primary-600/20">Guardar Cliente</button>
          </div>
        </form>
      </div>
    </div>
  );
};