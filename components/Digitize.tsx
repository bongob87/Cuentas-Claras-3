import React, { useState } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import { Upload, Loader2, CheckCircle, AlertCircle, ScanLine, X, FileText, FileSpreadsheet, Image as ImageIcon, ArrowRight, Trash2 } from 'lucide-react';
import { Customer } from '../types';

interface ImportedItem {
  id: string;
  customerName: string;
  amount: number;
  type: 'CREDIT' | 'PAYMENT';
  description: string;
  status: 'PENDING' | 'MATCHED' | 'NEW';
  originalName?: string; // To track if user edited the name
}

interface DigitizeProps {
  customers: Customer[];
  onImport: (items: ImportedItem[]) => void;
}

export const Digitize: React.FC<DigitizeProps> = ({ customers, onImport }) => {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [results, setResults] = useState<ImportedItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      setResults([]);
      setError(null);

      // Create preview for images
      if (selectedFile.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setPreviewUrl(reader.result as string);
        };
        reader.readAsDataURL(selectedFile);
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const getFileIcon = () => {
    if (!file) return <Upload size={40} />;
    if (file.type.startsWith('image/')) return <ImageIcon size={48} className="text-purple-500" />;
    if (file.type.includes('pdf')) return <FileText size={48} className="text-red-500" />;
    if (file.type.includes('csv') || file.type.includes('sheet') || file.type.includes('excel')) return <FileSpreadsheet size={48} className="text-emerald-500" />;
    return <FileText size={48} className="text-slate-500" />;
  };

  const analyzeFile = async () => {
    if (!file) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });
      let parts: any[] = [];
      const promptText = `
        Analiza este archivo que contiene información de cuentas por cobrar (fiado/créditos).
        Puede ser una imagen de una libreta manuscrita, un documento PDF escaneado o un archivo de texto/CSV.
        
        Extrae una lista estructurada de las transacciones encontradas.
        
        Reglas de extracción:
        1. customerName: El nombre del cliente.
        2. amount: El monto monetario (número).
        3. type: 'PAYMENT' (si dice abono, pago, resta, o tiene signo negativo en contexto de deuda) o 'CREDIT' (venta, fiado, deuda, suma). Ante la duda, asume 'CREDIT'.
        4. description: El nombre del producto o una nota descriptiva (ej. "Abono", "Refrescos"). Si no hay, usa "Importado".

        Devuelve un JSON válido.
      `;

      // Handling logic based on file type
      if (file.type === 'text/csv' || file.type === 'text/plain') {
         // Text based files
         const textContent = await file.text();
         parts = [{ text: textContent }, { text: promptText }];
      } else {
         // Binary files (Image, PDF)
         // Convert to Base64
         const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => {
                const result = reader.result as string;
                // Remove Data URL prefix (e.g. "data:image/jpeg;base64,")
                const base64 = result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = reject;
         });
         
         parts = [
            { inlineData: { mimeType: file.type, data: base64Data } },
            { text: promptText }
         ];
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: { parts },
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                customerName: { type: Type.STRING },
                amount: { type: Type.NUMBER },
                type: { type: Type.STRING, enum: ['CREDIT', 'PAYMENT'] },
                description: { type: Type.STRING }
              },
              required: ['customerName', 'amount', 'type']
            }
          }
        }
      });

      if (response.text) {
        const rawData = JSON.parse(response.text);
        
        // Process data to match against existing customers
        const processed: ImportedItem[] = rawData.map((item: any, index: number) => {
            // Simple fuzzy match simulation (exact or contains)
            const matchedCustomer = customers.find(c => 
                c.name.toLowerCase() === item.customerName.toLowerCase() || 
                c.name.toLowerCase().includes(item.customerName.toLowerCase())
            );

            return {
                id: `import-${Date.now()}-${index}`,
                customerName: matchedCustomer ? matchedCustomer.name : item.customerName,
                amount: item.amount,
                type: item.type === 'PAYMENT' ? 'PAYMENT' : 'CREDIT',
                description: item.description || 'Importado de archivo',
                status: matchedCustomer ? 'MATCHED' : 'NEW'
            };
        });
        
        setResults(processed);
      } else {
          throw new Error("No se pudo extraer texto del archivo.");
      }

    } catch (err) {
      console.error(err);
      setError("Ocurrió un error al analizar el archivo. Asegúrate de que el formato sea compatible (Imagen, PDF, CSV) y el contenido sea legible.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleUpdateItem = (id: string, field: keyof ImportedItem, value: any) => {
    setResults(prev => prev.map(item => {
        if (item.id === id) {
            const updated = { ...item, [field]: value };
            // Re-check matching if name changes
            if (field === 'customerName') {
                const matchedCustomer = customers.find(c => c.name.toLowerCase() === (value as string).toLowerCase());
                updated.status = matchedCustomer ? 'MATCHED' : 'NEW';
            }
            return updated;
        }
        return item;
    }));
  };

  const handleRemoveItem = (id: string) => {
    setResults(prev => prev.filter(item => item.id !== id));
  };

  const handleImportConfirm = () => {
    setShowSuccessModal(true);
  };

  const handleFinalizeImport = () => {
    if (results.length > 0) {
        onImport(results);
        setFile(null);
        setPreviewUrl(null);
        setResults([]);
        setShowSuccessModal(false);
    }
  };

  const handleUndoImport = () => {
      setShowSuccessModal(false);
  };

  const clearFile = () => {
      setFile(null);
      setPreviewUrl(null);
      setResults([]);
      setError(null);
  };

  return (
    <div className="animate-in fade-in duration-300 pb-safe">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Digitalizar</h2>
        <p className="text-slate-500 dark:text-slate-400 text-sm">
          Toma una foto o sube un archivo para agregar transacciones automáticamente.
        </p>
      </div>

      {!file ? (
        <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-3xl p-8 text-center bg-white dark:bg-slate-800/30 transition-colors active:bg-slate-50">
          <input 
            type="file" 
            accept="image/*,.pdf,.csv,.txt" 
            onChange={handleFileChange} 
            className="hidden" 
            id="file-upload" 
          />
          <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
            <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-full flex items-center justify-center mb-4 text-primary-600 dark:text-primary-400">
              <Upload size={32} />
            </div>
            <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200 mb-1">Subir Archivo</h3>
            <p className="text-slate-400 text-xs max-w-xs mx-auto mb-4">
              Foto, PDF, CSV
            </p>
            <span className="px-4 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900 rounded-lg text-sm font-bold">Seleccionar</span>
          </label>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-4">
            <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm bg-white dark:bg-dark-card flex items-center justify-center min-h-[250px]">
                {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full object-contain max-h-[350px]" />
                ) : (
                    <div className="flex flex-col items-center p-8 text-center">
                        {getFileIcon()}
                        <p className="font-bold text-slate-700 dark:text-white mt-4 text-base line-clamp-1 px-4">{file.name}</p>
                        <p className="text-slate-500 text-xs mt-1 uppercase">{file.type || 'Archivo'}</p>
                    </div>
                )}
                
                <button 
                    onClick={clearFile} 
                    className="absolute top-4 right-4 p-2 bg-black/60 text-white rounded-full backdrop-blur-sm"
                >
                    <X size={20} />
                </button>
            </div>
            
            {!results.length && !isAnalyzing && (
                <button 
                    onClick={analyzeFile}
                    className="w-full py-4 bg-primary-600 hover:bg-primary-700 text-white rounded-2xl font-bold text-lg shadow-lg shadow-primary-600/30 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                    <ScanLine />
                    Analizar Ahora
                </button>
            )}

            {isAnalyzing && (
                <div className="p-8 bg-white dark:bg-dark-card rounded-3xl border border-slate-200 dark:border-slate-800 text-center shadow-lg">
                    <Loader2 className="animate-spin mx-auto text-primary-600 mb-4" size={40} />
                    <h4 className="font-bold text-slate-800 dark:text-white mb-1">Analizando...</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Por favor espera un momento.</p>
                </div>
            )}
            
            {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl flex items-center gap-3 text-sm font-medium">
                    <AlertCircle size={24} className="shrink-0" />
                    <p>{error}</p>
                </div>
            )}
          </div>

          <div className="space-y-4">
            {results.length > 0 && (
                <>
                    <div className="flex items-center justify-between px-1">
                        <h3 className="font-bold text-lg text-slate-900 dark:text-white">Resultados ({results.length})</h3>
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Verificar datos</span>
                    </div>

                    <div className="space-y-3 pb-20">
                        {results.map((item) => (
                            <div key={item.id} className="bg-white dark:bg-dark-card p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm relative group">
                                <button 
                                    onClick={() => handleRemoveItem(item.id)}
                                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 shadow-md"
                                >
                                    <X size={14} />
                                </button>

                                <div className="grid grid-cols-2 gap-3 mb-3">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Cliente</label>
                                        <div className="flex items-center gap-2 mt-1">
                                            <input 
                                                type="text" 
                                                value={item.customerName}
                                                onChange={(e) => handleUpdateItem(item.id, 'customerName', e.target.value)}
                                                className="w-full bg-transparent border-b border-slate-100 dark:border-slate-700 focus:border-primary-500 outline-none text-slate-900 dark:text-white font-bold text-sm pb-1"
                                            />
                                        </div>
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded mt-1.5 inline-block font-bold ${
                                            item.status === 'MATCHED' 
                                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' 
                                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        }`}>
                                            {item.status === 'MATCHED' ? 'EXISTENTE' : 'NUEVO'}
                                        </span>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Monto</label>
                                        <input 
                                            type="number" 
                                            value={item.amount}
                                            onChange={(e) => handleUpdateItem(item.id, 'amount', parseFloat(e.target.value))}
                                            className="w-full mt-1 bg-transparent border-b border-slate-100 dark:border-slate-700 focus:border-primary-500 outline-none text-slate-900 dark:text-white font-bold text-lg pb-1"
                                        />
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <select 
                                        value={item.type}
                                        onChange={(e) => handleUpdateItem(item.id, 'type', e.target.value)}
                                        className="text-xs font-bold bg-slate-100 dark:bg-slate-700 border-none rounded-lg px-2 py-2 text-slate-700 dark:text-slate-200"
                                    >
                                        <option value="CREDIT">FIADO</option>
                                        <option value="PAYMENT">PAGO</option>
                                    </select>
                                    <input 
                                        type="text" 
                                        value={item.description}
                                        onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)}
                                        className="flex-1 text-xs text-slate-500 bg-transparent border-none outline-none text-right"
                                        placeholder="Descripción..."
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="fixed bottom-20 left-4 right-4 z-30 max-w-lg mx-auto">
                        <button 
                            onClick={handleImportConfirm}
                            className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold shadow-xl shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 active:scale-95"
                        >
                            <CheckCircle size={20} />
                            Confirmar {results.length} Importaciones
                        </button>
                    </div>
                </>
            )}
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white dark:bg-dark-card w-full max-w-sm rounded-3xl p-6 shadow-2xl text-center animate-in zoom-in-95 border border-slate-100 dark:border-slate-800">
                  <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={32} />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                      ¡Importación Exitosa!
                  </h3>
                  <p className="text-slate-500 dark:text-slate-400 mb-6">
                      Clientes y Balances Importados Correctamente
                  </p>
                  <div className="flex gap-3">
                      <button 
                        onClick={handleUndoImport}
                        className="flex-1 py-3 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                      >
                        Deshacer
                      </button>
                      <button 
                        onClick={handleFinalizeImport}
                        className="flex-1 py-3 rounded-xl font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-600/30 transition-colors"
                      >
                        Aceptar
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
