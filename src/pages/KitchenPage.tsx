import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { ItemDeliveryStatus } from '@/types';
import { Clock, LogOut } from 'lucide-react';

type KitchenItemVisual = {
  label: string;
  bgClass: string;
  textClass: string;
  next: ItemDeliveryStatus | null;
};

const statusColors: Record<string, string> = {
  nuevo: 'border-table-occupied',
  en_preparacion: 'border-table-cooking',
  listo: 'border-table-ready',
};

const getItemVisual = (status: ItemDeliveryStatus): KitchenItemVisual => {
  switch (status) {
    case 'nuevo':
      return {
        label: 'Nuevo',
        bgClass: 'bg-destructive',
        textClass: 'text-destructive-foreground',
        next: 'en_preparacion',
      };
    case 'en_preparacion':
      return {
        label: 'En preparación',
        bgClass: 'bg-info',
        textClass: 'text-info-foreground',
        next: 'para_entregar',
      };
    case 'para_entregar':
    case 'entregado':
    default:
      return {
        label: 'Listo',
        bgClass: 'bg-success',
        textClass: 'text-success-foreground',
        next: null,
      };
  }
};

const getElapsedInfo = (date: Date) => {
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  const label = mins < 1 ? '<1 min' : `${mins} min`;

  if (mins <= 7) {
    return {
      label,
      chipClass: 'bg-[hsl(220,15%,16%)] text-[hsl(220,10%,85%)]',
      cardUrgencyClass: '',
    };
  }

  if (mins <= 14) {
    return {
      label: `⚠️ ${label}`,
      chipClass: 'bg-orange-500/10 border border-orange-500/40 text-orange-400',
      cardUrgencyClass: '',
    };
  }

  return {
    label: `⚠️ ${label}`,
    chipClass: 'bg-red-500/10 border border-red-500/50 text-red-400',
    cardUrgencyClass: 'border-red-500 animate-pulse-soft',
  };
};

const playKitchenNewOrderSound = () => {
  try {
    const ctx = new AudioContext();
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gain = ctx.createGain();

    osc1.type = 'square';
    osc2.type = 'triangle';
    osc1.frequency.value = 660;
    osc2.frequency.value = 990;

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);

    gain.gain.value = 0.25;

    const now = ctx.currentTime;
    osc1.start(now);
    osc2.start(now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc1.stop(now + 0.4);
    osc2.stop(now + 0.4);
  } catch {
    // silent fallback
  }
};

const KitchenPage = () => {
  const { orders, updateItemDeliveryStatus, logout, currentUser } = useApp();

  const [hiddenOrderIds, setHiddenOrderIds] = useState<string[]>([]);
  const [fadingOrderIds, setFadingOrderIds] = useState<string[]>([]);
  const scheduledHideRef = useRef<Set<string>>(new Set());
  const prevKitchenOrderIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  // Kitchen only sees orders that need attention, filtered to only kitchen items
  const kitchenOrders = orders
    .filter(o => ['nuevo', 'en_preparacion', 'listo'].includes(o.status))
    .map(o => ({ ...o, items: o.items.filter(item => item.menuItem.goesToKitchen) }))
    .filter(o => o.items.length > 0)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

  const activeOrders = kitchenOrders.filter(o => !hiddenOrderIds.includes(o.id));

  // Detect new kitchen orders to play sound
  useEffect(() => {
    const currentIds = new Set(kitchenOrders.map(o => o.id));
    const prevIds = prevKitchenOrderIdsRef.current;

    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      prevKitchenOrderIdsRef.current = currentIds;
      return;
    }

    kitchenOrders.forEach(order => {
      if (!prevIds.has(order.id)) {
        playKitchenNewOrderSound();
      }
    });

    prevKitchenOrderIdsRef.current = currentIds;
  }, [kitchenOrders]);

  // When all items of an order are ready, show banner and fade out after 3s
  useEffect(() => {
    kitchenOrders.forEach(order => {
      const allItemsReady =
        order.items.length > 0 &&
        order.items.every(item => item.deliveryStatus === 'para_entregar' || item.deliveryStatus === 'entregado');

      if (allItemsReady && !scheduledHideRef.current.has(order.id)) {
        scheduledHideRef.current.add(order.id);
        setFadingOrderIds(prev => (prev.includes(order.id) ? prev : [...prev, order.id]));

        setTimeout(() => {
          setHiddenOrderIds(prev => (prev.includes(order.id) ? prev : [...prev, order.id]));
        }, 3000);
      }
    });
  }, [kitchenOrders]);

  return (
    <div className="min-h-screen bg-[hsl(220,15%,8%)] text-[hsl(0,0%,95%)] flex flex-col">
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

      <div className="flex-1 p-4 overflow-y-auto">
        {activeOrders.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-2xl text-[hsl(220,10%,35%)] font-display">Sin pedidos activos</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {activeOrders.map(order => {
              const elapsedInfo = getElapsedInfo(order.createdAt);
              const allItemsReady =
                order.items.length > 0 &&
                order.items.every(item => item.deliveryStatus === 'para_entregar' || item.deliveryStatus === 'entregado');
              return (
                <div
                  key={order.id}
                  className={`rounded-2xl border-2 ${
                    statusColors[order.status] || 'border-border'
                  } ${elapsedInfo.cardUrgencyClass} bg-[hsl(220,15%,12%)] flex flex-col shadow-lg transition-all duration-300 ${
                    fadingOrderIds.includes(order.id) ? 'animate-kitchen-fade-out-soft' : ''
                  }`}
                >
                  <div className="px-5 py-4 border-b border-[hsl(220,15%,18%)] flex items-center justify-between">
                    <div>
                      <div className="font-display font-bold text-3xl tracking-tight">{order.tableName}</div>
                      <div className="text-sm text-[hsl(220,10%,55%)] mt-1">Mozo: {order.waiterName}</div>
                    </div>
                    <div
                      className={`flex items-center gap-2 text-xs font-semibold rounded-full px-3 py-1 ${elapsedInfo.chipClass}`}
                    >
                      <Clock className="w-4 h-4" />
                      <span className="text-base font-semibold leading-none">{elapsedInfo.label}</span>
                    </div>
                  </div>

                  <div className="flex-1 px-5 py-4 space-y-4">
                    {order.items.map(item => (
                      <div key={item.id} className="rounded-lg bg-[hsl(220,15%,16%)] px-4 py-3">
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center justify-center min-w-[56px]">
                            <span className="font-display font-black text-orange-400 text-4xl leading-none">
                              {item.quantity}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-2xl font-semibold leading-snug">
                              {item.menuItem.name}
                            </div>
                            {item.notes && (
                              <div className="mt-1 text-base text-yellow-300 italic">
                                {item.notes}
                              </div>
                            )}
                            <div className="mt-3">
                              {(() => {
                                const visual = getItemVisual(item.deliveryStatus);
                                const isDisabled = visual.next === null;
                                return (
                                  <button
                                    disabled={isDisabled}
                                    onClick={() => {
                                      if (!visual.next) return;
                                      updateItemDeliveryStatus(order.id, item.id, visual.next);
                                    }}
                                    className={`touch-target inline-flex items-center justify-center px-4 py-2.5 rounded-full font-display text-lg font-semibold transition-all w-full ${
                                      visual.bgClass
                                    } ${visual.textClass} ${
                                      isDisabled
                                        ? 'opacity-70 cursor-default'
                                        : 'hover:brightness-110 active:scale-[0.97]'
                                    }`}
                                  >
                                    {visual.label}
                                  </button>
                                );
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {allItemsReady && (
                    <div className="px-5 py-3 border-t border-[hsl(150,55%,35%)] bg-[hsl(150,55%,18%)]">
                      <div className="text-center text-lg font-display font-semibold text-[hsl(150,55%,75%)]">
                        ✓ Pedido completo
                      </div>
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
