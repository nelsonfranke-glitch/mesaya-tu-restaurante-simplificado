import { useApp } from '@/context/AppContext';
import { RestaurantTable, Order } from '@/types';
import { X, Printer, CreditCard } from 'lucide-react';

interface Props {
  table: RestaurantTable;
  orders: Order[];
  total: number;
  onClose: () => void;
  onConfirm: () => void;
}

const BillModal = ({ table, orders, total, onClose, onConfirm }: Props) => {
  const { requestBill, markPaid } = useApp();

  // Group all items across orders by menuItem id
  const grouped: Record<string, { name: string; price: number; quantity: number }> = {};
  orders.forEach(o => {
    o.items.forEach(item => {
      const key = item.menuItem.id;
      if (grouped[key]) {
        grouped[key].quantity += item.quantity;
      } else {
        grouped[key] = { name: item.menuItem.name, price: item.menuItem.price, quantity: item.quantity };
      }
    });
  });
  const items = Object.values(grouped);
  const now = new Date();

  const handleConfirm = () => {
    requestBill(table.id);
    markPaid(table.id);
    onConfirm();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white text-black w-full max-w-sm rounded-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Ticket header */}
        <div className="flex items-center justify-between px-4 pt-4">
          <span className="text-xs text-gray-400">Vista previa del ticket</span>
          <button onClick={onClose} className="p-1 rounded hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {/* Ticket body - print-friendly */}
        <div className="flex-1 overflow-y-auto px-6 py-4" id="bill-ticket">
          <div className="text-center mb-4">
            <h2 className="font-display font-bold text-xl">MesaYa</h2>
            <p className="text-xs text-gray-500 mt-1">
              {table.name} — {now.toLocaleDateString('es-AR')} {now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
            </p>
          </div>

          <div className="border-t border-dashed border-gray-300 my-3" />

          <div className="space-y-1.5">
            {items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>
                  <span className="font-medium">{item.quantity}×</span> {item.name}
                </span>
                <span className="font-display tabular-nums">${(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-dashed border-gray-300 my-3" />

          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span className="font-display tabular-nums">${total.toLocaleString()}</span>
          </div>

          <div className="border-t border-gray-300 my-2" />

          <div className="flex justify-between items-baseline">
            <span className="font-display font-bold text-lg">TOTAL</span>
            <span className="font-display font-bold text-2xl">${total.toLocaleString()}</span>
          </div>

          <div className="text-center mt-4">
            <p className="text-[10px] text-gray-400">¡Gracias por su visita!</p>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-200 space-y-2">
          <button
            onClick={() => window.print()}
            className="w-full py-3 rounded-lg border border-gray-300 text-gray-700 font-medium text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Imprimir ticket
          </button>
          <button
            onClick={handleConfirm}
            className="touch-target w-full py-4 rounded-lg bg-emerald-600 text-white font-display font-semibold text-lg flex items-center justify-center gap-2 hover:bg-emerald-700 transition-colors active:scale-[0.98]"
          >
            <CreditCard className="w-5 h-5" />
            Confirmar cobro
          </button>
        </div>
      </div>
    </div>
  );
};

export default BillModal;
