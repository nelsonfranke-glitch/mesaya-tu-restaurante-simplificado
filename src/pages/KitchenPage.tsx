import { useApp } from '@/context/AppContext';
import { Order, OrderStatus } from '@/types';
import { Clock, LogOut } from 'lucide-react';

const statusFlow: Record<OrderStatus, { next: OrderStatus | null; label: string; btnClass: string }> = {
  nuevo: { next: 'en_preparacion', label: 'Preparar', btnClass: 'bg-table-cooking text-primary-foreground' },
  en_preparacion: { next: 'listo', label: 'Listo', btnClass: 'bg-table-ready text-primary-foreground' },
  listo: { next: null, label: 'Entregado', btnClass: 'opacity-50' },
  pagado: { next: null, label: 'Pagado', btnClass: 'opacity-30' },
};

const statusColors: Record<OrderStatus, string> = {
  nuevo: 'border-table-occupied',
  en_preparacion: 'border-table-cooking',
  listo: 'border-table-ready',
  pagado: 'border-table-free',
};

const elapsed = (date: Date) => {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  return mins < 1 ? '<1 min' : `${mins} min`;
};

const KitchenPage = () => {
  const { orders, updateOrderStatus, logout, currentUser } = useApp();

  const activeOrders = orders
    .filter(o => o.status !== 'pagado')
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  return (
    <div className="min-h-screen bg-[hsl(220,15%,8%)] text-[hsl(0,0%,95%)] flex flex-col">
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-[hsl(220,15%,18%)]">
        <div>
          <h1 className="font-display font-bold text-2xl text-primary">MesaYa</h1>
          <p className="text-xs text-[hsl(220,10%,55%)]">Cocina — {currentUser?.name}</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[hsl(220,10%,55%)]">{activeOrders.length} pedidos activos</span>
          <button onClick={logout} className="touch-target p-2 rounded-lg hover:bg-[hsl(220,15%,16%)] transition-colors">
            <LogOut className="w-5 h-5 text-[hsl(220,10%,55%)]" />
          </button>
        </div>
      </header>

      {/* Orders grid */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeOrders.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-2xl text-[hsl(220,10%,35%)] font-display">Sin pedidos activos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeOrders.map(order => {
              const flow = statusFlow[order.status];
              return (
                <div
                  key={order.id}
                  className={`rounded-xl border-2 ${statusColors[order.status]} bg-[hsl(220,15%,12%)] flex flex-col`}
                >
                  {/* Card header */}
                  <div className="px-4 py-3 border-b border-[hsl(220,15%,18%)] flex items-center justify-between">
                    <div>
                      <div className="font-display font-bold text-xl">{order.tableName}</div>
                      <div className="text-xs text-[hsl(220,10%,55%)]">Mozo: {order.waiterName}</div>
                    </div>
                    <div className="flex items-center gap-1 text-[hsl(220,10%,55%)]">
                      <Clock className="w-4 h-4" />
                      <span className="text-sm font-medium">{elapsed(order.createdAt)}</span>
                    </div>
                  </div>

                  {/* Items */}
                  <div className="flex-1 px-4 py-3 space-y-2">
                    {order.items.map(item => (
                      <div key={item.id}>
                        <div className="flex justify-between">
                          <span className="text-base font-medium">
                            <span className="text-primary font-bold mr-1">×{item.quantity}</span>
                            {item.menuItem.name}
                          </span>
                        </div>
                        {item.notes && (
                          <div className="text-sm text-table-occupied ml-6 italic">⚠ {item.notes}</div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Action */}
                  {flow.next && (
                    <div className="p-3 border-t border-[hsl(220,15%,18%)]">
                      <button
                        onClick={() => updateOrderStatus(order.id, flow.next!)}
                        className={`touch-target w-full py-3 rounded-lg font-display font-semibold text-lg transition-all hover:opacity-90 active:scale-[0.97] ${flow.btnClass}`}
                      >
                        {flow.label}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default KitchenPage;
