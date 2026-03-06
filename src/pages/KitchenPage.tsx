import { useApp } from '@/context/AppContext';
import { ItemDeliveryStatus } from '@/types';
import { Clock, AlertTriangle, LogOut, CheckCircle2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

const itemStatusConfig: Record<string, { label: string; bgClass: string; next: ItemDeliveryStatus | null }> = {
  nuevo: { label: 'Nuevo', bgClass: 'bg-destructive', next: 'en_preparacion' },
  en_preparacion: { label: 'En preparación', bgClass: 'bg-[hsl(210,80%,50%)]', next: 'para_entregar' },
  para_entregar: { label: '✅ Listo', bgClass: 'bg-[hsl(142,70%,40%)]', next: null },
};

const getElapsed = (date: Date) => Math.floor((Date.now() - date.getTime()) / 60000);

const formatElapsed = (mins: number) => mins < 1 ? '<1 min' : `${mins} min`;

const getTimerStyle = (mins: number) => {
  if (mins >= 15) return { color: 'hsl(0,80%,55%)', urgent: true };
  if (mins >= 8) return { color: 'hsl(30,90%,55%)', urgent: false };
  return { color: 'hsl(0,0%,85%)', urgent: false };
};

const KitchenPage = () => {
  const { orders, updateKitchenItemStatus, logout, currentUser } = useApp();
  const [now, setNow] = useState(Date.now());
  const [completedOrders, setCompletedOrders] = useState<Set<string>>(new Set());
  const prevOrderCount = useRef(0);

  // Tick every 15s to update timers
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(interval);
  }, []);

  // Filter to active kitchen orders
  const activeOrders = orders
    .filter(o => ['nuevo', 'en_preparacion', 'listo'].includes(o.status))
    .map(o => ({ ...o, items: o.items.filter(item => item.menuItem.goesToKitchen) }))
    .filter(o => o.items.length > 0)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  // Detect completed orders (all items listo) and fade them out
  useEffect(() => {
    const newCompleted = new Set<string>();
    activeOrders.forEach(order => {
      const allListo = order.items.every(i => i.deliveryStatus === 'para_entregar' || i.deliveryStatus === 'entregado');
      if (allListo) newCompleted.add(order.id);
    });
    if (newCompleted.size > 0) {
      setCompletedOrders(newCompleted);
    }
  }, [orders]);

  // Count excluding completed
  const visibleOrders = activeOrders.filter(o => !completedOrders.has(o.id) || 
    // Show completed briefly
    true
  );

  const nonCompletedCount = activeOrders.filter(o => 
    !o.items.every(i => i.deliveryStatus === 'para_entregar' || i.deliveryStatus === 'entregado')
  ).length;

  return (
    <div className="min-h-screen bg-[hsl(220,15%,6%)] text-foreground flex flex-col">
      {/* Header */}
      <header className="px-5 py-4 flex items-center justify-between border-b border-[hsl(220,15%,16%)] bg-[hsl(220,15%,8%)]">
        <div>
          <h1 className="font-display font-bold text-3xl text-primary">🔥 Cocina</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{currentUser?.name}</p>
        </div>
        <div className="flex items-center gap-5">
          <div className="text-center">
            <div className="text-3xl font-display font-bold text-primary">{nonCompletedCount}</div>
            <div className="text-xs text-muted-foreground">pedidos activos</div>
          </div>
          <button onClick={logout} className="p-3 rounded-xl hover:bg-[hsl(220,15%,14%)] transition-colors">
            <LogOut className="w-6 h-6 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Orders Grid */}
      <div className="flex-1 p-4 overflow-y-auto">
        {activeOrders.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-3xl text-[hsl(220,10%,30%)] font-display">Sin pedidos activos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {activeOrders.map(order => {
              const mins = getElapsed(order.createdAt);
              const timer = getTimerStyle(mins);
              const allListo = order.items.every(i => i.deliveryStatus === 'para_entregar' || i.deliveryStatus === 'entregado');

              const borderColor = mins >= 15
                ? 'border-destructive'
                : allListo
                  ? 'border-[hsl(142,70%,40%)]'
                  : 'border-[hsl(220,15%,22%)]';

              return (
                <div
                  key={order.id}
                  className={`rounded-2xl border-2 ${borderColor} bg-[hsl(220,15%,10%)] flex flex-col transition-all duration-500 ${
                    mins >= 15 && !allListo ? 'animate-pulse' : ''
                  } ${allListo ? 'opacity-60' : ''}`}
                  style={allListo ? { transition: 'opacity 3s ease-out' } : undefined}
                >
                  {/* Card Header */}
                  <div className="px-5 py-4 border-b border-[hsl(220,15%,16%)] flex items-center justify-between">
                    <div>
                      <div className="font-display font-bold text-white" style={{ fontSize: '28px' }}>{order.tableName}</div>
                      <div className="text-sm text-[hsl(220,10%,70%)]">Mozo: {order.waiterName}</div>
                    </div>
                    <div className="flex items-center gap-2" style={{ color: timer.color }}>
                      {mins >= 8 && <AlertTriangle className="w-6 h-6" />}
                      <Clock className="w-5 h-5" />
                      <span className="font-display font-bold text-xl">{formatElapsed(mins)}</span>
                    </div>
                  </div>

                  {/* Completed Banner */}
                  {allListo && (
                    <div className="px-5 py-3 bg-[hsl(142,70%,35%)] flex items-center gap-2">
                      <CheckCircle2 className="w-6 h-6 text-white" />
                      <span className="font-display font-bold text-lg text-white">✓ Pedido completo</span>
                    </div>
                  )}

                  {/* Items */}
                  <div className="flex-1 px-4 py-3 space-y-2">
                    {order.items.map(item => {
                      const status = itemStatusConfig[item.deliveryStatus] || itemStatusConfig.nuevo;
                      const isListo = item.deliveryStatus === 'para_entregar';

                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 rounded-xl bg-[hsl(220,15%,13%)] px-4 py-3"
                        >
                          {/* Quantity */}
                          <span className="font-display font-bold text-primary shrink-0" style={{ fontSize: '28px' }}>
                            {item.quantity}
                          </span>

                          {/* Item info */}
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate text-white" style={{ fontSize: '22px' }}>
                              {item.menuItem.name}
                            </div>
                            {item.notes && (
                              <div className="text-base italic text-[hsl(45,90%,55%)] mt-0.5">
                                ⚠ {item.notes}
                              </div>
                            )}
                          </div>

                          {/* Status Button */}
                          {status.next ? (
                            <button
                              onClick={() => updateKitchenItemStatus(order.id, item.id)}
                              className={`${status.bgClass} text-white font-display font-bold text-base px-5 py-3 rounded-xl transition-all hover:opacity-85 active:scale-95 shrink-0`}
                            >
                              {status.label}
                            </button>
                          ) : (
                            <span className={`${status.bgClass} text-white font-display font-bold text-base px-5 py-3 rounded-xl shrink-0 opacity-70`}>
                              {status.label}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
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
