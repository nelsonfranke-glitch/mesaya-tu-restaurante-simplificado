import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { RestaurantTable, Order, MenuCategory, PaymentType } from '@/types';
import { X, Printer, CreditCard, CheckCircle2 } from 'lucide-react';

interface Props {
  table: RestaurantTable;
  orders: Order[];
  total: number;
  onClose: () => void;
  onConfirm: () => void;
}

const categoryLabels: Record<MenuCategory, string> = {
  entradas: 'Entradas',
  principales: 'Principales',
  postres: 'Postres',
  bebidas: 'Bebidas',
};

const categoryOrder: MenuCategory[] = ['entradas', 'principales', 'postres', 'bebidas'];

const BillModal = ({ table, orders, total, onClose, onConfirm }: Props) => {
  const { markPaid, currentUser } = useApp();
  const [confirmed, setConfirmed] = useState(false);

  // Group items by category then by menuItem id
  const grouped: Record<MenuCategory, { name: string; price: number; quantity: number }[]> = {
    entradas: [], principales: [], postres: [], bebidas: [],
  };

  const seen: Record<string, { cat: MenuCategory; idx: number }> = {};
  orders.forEach(o => {
    o.items.forEach(item => {
      const key = item.menuItem.id;
      const cat = item.menuItem.category;
      if (seen[key]) {
        grouped[seen[key].cat][seen[key].idx].quantity += item.quantity;
      } else {
        const idx = grouped[cat].length;
        grouped[cat].push({ name: item.menuItem.name, price: item.menuItem.price, quantity: item.quantity });
        seen[key] = { cat, idx };
      }
    });
  });

  const now = new Date();
  const currentPaymentType: PaymentType | undefined = orders.find(o => o.paymentType)?.paymentType;
  const isTarjeta = currentPaymentType === 'tarjeta';
  const isWaiter = currentUser?.role === 'waiter';
  const canConfirm = isWaiter ? !isTarjeta : true;
  const waiterBlocked = isWaiter && isTarjeta;

  const handlePrint = () => {
    window.print();
  };

  const handleConfirm = () => {
    markPaid(table.id);
    setConfirmed(true);
    setTimeout(() => {
      onConfirm();
    }, 1500);
  };

  if (confirmed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center max-w-xs w-full">
          <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900">✓ Cuenta cobrada</h3>
          <p className="text-gray-500 mt-2 text-sm">{table.name} — Mesa liberada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white text-black w-full max-w-sm rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal top bar - hidden in print */}
        <div className="flex items-center justify-between px-4 pt-4 print:hidden">
          <span className="text-xs text-gray-400">Vista previa del ticket</span>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Ticket body - print-friendly */}
        <div className="flex-1 overflow-y-auto px-6 py-4 print:px-2 print:py-1" id="bill-ticket">
          {/* Restaurant name */}
          <div className="text-center mb-3">
            <h2 className="font-bold text-2xl text-orange-600 print:text-black" style={{ fontSize: '24px' }}>
              MesaYa
            </h2>
            <p className="text-xs text-gray-500 mt-1.5" style={{ fontSize: '12px' }}>
              {table.name} — {now.toLocaleDateString('es-AR')} {now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-gray-300 my-3" />

          {/* Items grouped by category */}
          <div className="space-y-3">
            {categoryOrder.map(cat => {
              const items = grouped[cat];
              if (items.length === 0) return null;
              return (
                <div key={cat}>
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    {categoryLabels[cat]}
                  </div>
                  {items.map((item, i) => (
                    <div key={i} className="flex justify-between items-baseline py-0.5" style={{ fontSize: '13px' }}>
                      <span className="flex-1">
                        <span className="font-semibold">{item.quantity}×</span>{' '}
                        {item.name}
                        {item.quantity > 1 && (
                          <span className="text-gray-400 ml-1 text-[11px]">
                            @${item.price.toLocaleString()}
                          </span>
                        )}
                      </span>
                      <span className="font-semibold tabular-nums ml-3">
                        ${(item.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>

          {/* Divider */}
          <div className="border-t border-dashed border-gray-300 my-3" />

          {/* Subtotal */}
          <div className="flex justify-between text-sm text-gray-500">
            <span>Subtotal</span>
            <span className="tabular-nums">${total.toLocaleString()}</span>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-400 my-2" />

          {/* Total */}
          <div className="flex justify-between items-baseline">
            <span className="font-bold text-lg">TOTAL</span>
            <span className="font-bold text-2xl text-orange-600 print:text-black tabular-nums">
              ${total.toLocaleString()}
            </span>
          </div>

          {/* Footer */}
          <div className="text-center mt-4">
            <p className="text-[10px] text-gray-400">¡Gracias por su visita!</p>
          </div>
        </div>

        {/* Action buttons - hidden in print */}
        <div className="p-4 border-t border-gray-200 space-y-2 print:hidden">
          <button
            onClick={handlePrint}
            className="w-full py-3 rounded-xl border border-gray-300 text-gray-700 font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            Imprimir
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canConfirm}
            className="w-full py-4 rounded-xl bg-emerald-600 text-white font-bold text-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CreditCard className="w-5 h-5" />
            {canConfirm ? 'Confirmar cobro' : 'A la espera de encargado'}
          </button>
          {waiterBlocked && (
            <p className="mt-1 text-[11px] text-center text-gray-500">
              Encargado notificado para cobrar esta mesa.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default BillModal;
