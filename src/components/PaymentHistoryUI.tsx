import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';

interface Transaction {
  id: string;
  timestamp: string;
  amount: number;
  merchantName: string;
  description: string;
  merchantMcc: string;
}

interface PaymentHistoryUIProps {
  onBack: () => void;
  accountId: string;
}

export default function PaymentHistoryUI({ onBack, accountId }: PaymentHistoryUIProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await api.get(`/api/transactions?accountId=${accountId}&limit=50`);
        if (res.ok) {
          const result = await res.json();
          setTransactions(result.data);
        }
      } catch (err) {
        console.error('Failed to fetch transactions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [accountId]);

  const getIconForMcc = (mcc: string) => {
    const code = parseInt(mcc);
    if (code >= 5812 && code <= 5814) return 'restaurant';
    if (code >= 4000 && code <= 4799) return 'flight';
    if (code >= 8200 && code <= 8299) return 'school';
    if (code >= 5000 && code <= 5999) return 'shopping_bag';
    if (code >= 4800 && code <= 4999) return 'bolt';
    return 'payments';
  };

  const getColorForMcc = (mcc: string) => {
    const code = parseInt(mcc);
    if (code >= 5812 && code <= 5814) return 'bg-orange-100 text-orange-600';
    if (code >= 4000 && code <= 4799) return 'bg-blue-100 text-blue-600';
    if (code >= 8200 && code <= 8299) return 'bg-purple-100 text-purple-600';
    if (code >= 5000 && code <= 5999) return 'bg-pink-100 text-pink-600';
    if (code >= 4800 && code <= 4999) return 'bg-yellow-100 text-yellow-600';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="absolute inset-0 bg-surface text-on-surface z-[150] flex flex-col font-body bg-gray-50 max-h-[100dvh]">
      {/* Header */}
      <div className="bg-[#2f66ee] text-white px-4 py-4 flex items-center justify-between shadow-sm sticky top-0 z-10 shrink-0">
        <button onClick={onBack} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
          <span className="material-symbols-outlined font-bold text-xl">arrow_back_ios_new</span>
        </button>
        <h1 className="font-bold text-lg font-headline flex-1 text-center pr-8 whitespace-nowrap">Payment History</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-10">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-4">
            <div className="w-10 h-10 border-4 border-blue-100 border-t-[#2f66ee] rounded-full animate-spin"></div>
            <p className="text-gray-400 font-bold text-sm">Loading history...</p>
          </div>
        ) : transactions.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center gap-4">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-300">
              <span className="material-symbols-outlined text-4xl">history</span>
            </div>
            <p className="text-gray-400 font-bold">No transactions found.</p>
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-3">
            {transactions.map((txn) => (
              <div key={txn.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex items-center gap-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${getColorForMcc(txn.merchantMcc || '')}`}>
                  <span className="material-symbols-outlined">{getIconForMcc(txn.merchantMcc || '')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h3 className="font-bold text-gray-800 text-[15px] truncate">{txn.merchantName || 'Unknown Merchant'}</h3>
                    <span className="text-red-500 font-black text-[15px] whitespace-nowrap">-{txn.amount.toLocaleString('vi-VN')}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className="text-gray-400 text-[12px] truncate">{txn.description || 'No description'}</p>
                    <p className="text-gray-400 text-[11px] font-medium ml-2">{new Date(txn.timestamp).toLocaleDateString('vi-VN')}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
