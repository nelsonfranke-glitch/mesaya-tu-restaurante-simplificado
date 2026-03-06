import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import {
  User,
  UserRole,
  RestaurantTable,
  MenuItem,
  Order,
  OrderItem,
  Ingredient,
  TableStatus,
  OrderStatus,
  ItemDeliveryStatus,
  Recipe,
  PaymentType,
} from '@/types';
import { mockTables, mockMenu, mockOrders, mockIngredients } from '@/data/mock';

interface AppState {
  currentUser: User | null;
  tables: RestaurantTable[];
  menu: MenuItem[];
  orders: Order[];
  ingredients: Ingredient[];
  recipes: Recipe[];
  notifications: string[];
  login: (role: UserRole) => void;
  logout: () => void;
  updateTableStatus: (tableId: string, status: TableStatus) => void;
  addMenuItem: (item: MenuItem) => void;
  updateMenuItem: (id: string, data: Partial<Omit<MenuItem, 'id'>>) => void;
  addOrder: (order: Order) => void;
  addItemsToTable: (tableId: string, items: OrderItem[]) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateItemDeliveryStatus: (orderId: string, itemId: string, status: ItemDeliveryStatus) => void;
  updateKitchenItemStatus: (orderId: string, itemId: string) => void;
  toggleMenuItemKitchen: (menuItemId: string) => void;
  addIngredient: (data: Omit<Ingredient, 'id'>) => void;
  updateIngredient: (id: string, data: Partial<Omit<Ingredient, 'id'>>) => void;
  adjustIngredientStock: (id: string, delta: number) => void;
  upsertRecipeForMenuItem: (
    menuItemId: string,
    lines: { ingredientId: string; quantity: number }[],
  ) => void;
  requestBill: (tableId: string, paymentType: PaymentType) => void;
  markPaid: (tableId: string) => void;
  addNotification: (msg: string) => void;
  clearNotification: (index: number) => void;
  getReadyItemsCount: (tableId: string) => number;
}

const AppContext = createContext<AppState | null>(null);

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be inside AppProvider');
  return ctx;
};

const demoUsers: Record<UserRole, User> = {
  owner: { id: 'u1', name: 'Roberto (Dueño)', role: 'owner', restaurantId: 'r1' },
  manager: { id: 'u2', name: 'Ana (Encargada)', role: 'manager', restaurantId: 'r1' },
  waiter: { id: 'u3', name: 'Carlos (Mozo)', role: 'waiter', restaurantId: 'r1' },
  kitchen: { id: 'u4', name: 'Diego (Cocina)', role: 'kitchen', restaurantId: 'r1' },
};

// Play a short notification beep (waiter)
const playNotificationSound = () => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    osc.type = 'sine';
    gain.gain.value = 0.3;
    osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.stop(ctx.currentTime + 0.3);
  } catch { /* silent fallback */ }
};

// Play a distinct sound for kitchen new order
const playKitchenNewOrderSound = () => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 523;
    osc.type = 'square';
    gain.gain.value = 0.25;
    osc.start();
    // Two-tone alert
    setTimeout(() => { osc.frequency.value = 659; }, 150);
    setTimeout(() => { osc.frequency.value = 784; }, 300);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.stop(ctx.currentTime + 0.5);
  } catch { /* silent fallback */ }
};

const showBrowserNotification = (msg: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('MesaYa', { body: msg, icon: '/favicon.ico' });
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
};

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tables, setTables] = useState<RestaurantTable[]>(mockTables);
  const [menu, setMenu] = useState<MenuItem[]>(mockMenu);
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [ingredients, setIngredients] = useState<Ingredient[]>(mockIngredients);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);

  const login = (role: UserRole) => setCurrentUser(demoUsers[role]);
  const logout = () => setCurrentUser(null);

  const updateTableStatus = (tableId: string, status: TableStatus) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, status } : t));
  };

  const deriveTableStatusFromOrders = (
    tableId: string,
    ordersForAllTables: Order[],
    currentStatus: TableStatus,
  ): TableStatus => {
    // Si la mesa tiene la cuenta solicitada, mantenemos el estado hasta que se cobre
    if (currentStatus === 'bill_requested') return currentStatus;

    const tableOrders = ordersForAllTables.filter(
      o => o.tableId === tableId && o.status !== 'pagado',
    );

    if (tableOrders.length === 0) {
      return 'free';
    }

    const items = tableOrders.flatMap(o => o.items);
    if (items.length === 0) {
      return 'occupied_waiting';
    }

    const hasEnPreparacion = items.some(i => i.deliveryStatus === 'en_preparacion');
    const hasParaEntregar = items.some(i => i.deliveryStatus === 'para_entregar');
    const allEntregado = items.every(i => i.deliveryStatus === 'entregado');

    if (hasEnPreparacion) return 'cooking';
    if (hasParaEntregar) return 'ready';
    if (allEntregado) return 'occupied_all_served';

    return 'occupied_waiting';
  };

  const syncAllTableStatuses = (allOrders: Order[]) => {
    setTables(prev =>
      prev.map(table => ({
        ...table,
        status: deriveTableStatusFromOrders(table.id, allOrders, table.status),
      })),
    );
  };

  const consumeIngredientsForItems = (items: OrderItem[]) => {
    if (recipes.length === 0) return;

    setIngredients(prev => {
      const byId = new Map(prev.map(ing => [ing.id, { ...ing }]));

      items.forEach(orderItem => {
        const itemRecipes = recipes.filter(r => r.menuItemId === orderItem.menuItem.id);
        if (itemRecipes.length === 0) return;

        itemRecipes.forEach(r => {
          const ing = byId.get(r.ingredientId);
          if (!ing) return;
          const total = r.quantity * orderItem.quantity;
          ing.stockQty = Math.max(0, ing.stockQty - total);
          byId.set(ing.id, ing);
        });
      });

      return Array.from(byId.values());
    });
  };

  const addOrder = (order: Order) => {
    const itemsWithStatus = order.items.map(item => ({
      ...item,
      deliveryStatus: item.menuItem.goesToKitchen ? 'nuevo' as const : 'para_entregar' as const,
    }));
    const hasKitchenItems = itemsWithStatus.some(i => i.menuItem.goesToKitchen);
    setOrders(prev => {
      const next = [...prev, { ...order, items: itemsWithStatus }];
      syncAllTableStatuses(next);
      return next;
    });
    consumeIngredientsForItems(itemsWithStatus);
    if (hasKitchenItems) playKitchenNewOrderSound();
  };

  const addItemsToTable = (tableId: string, items: OrderItem[]) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    const itemsWithStatus = items.map(item => ({
      ...item,
      deliveryStatus: item.menuItem.goesToKitchen ? 'nuevo' as const : 'para_entregar' as const,
    }));
    const newOrder: Order = {
      id: `o-${Date.now()}`,
      tableId,
      tableName: table.name,
      waiterId: currentUser?.id || '',
      waiterName: currentUser?.name || '',
      items: itemsWithStatus,
      status: 'nuevo',
      createdAt: new Date(),
    };
    const hasKitchenItems = itemsWithStatus.some(i => i.menuItem.goesToKitchen);
    setOrders(prev => {
      const next = [...prev, newOrder];
      syncAllTableStatuses(next);
      return next;
    });
    consumeIngredientsForItems(itemsWithStatus);
    if (hasKitchenItems) playKitchenNewOrderSound();
  };

  // Kitchen advances a single item: nuevo → en_preparacion → para_entregar (listo)
  const updateKitchenItemStatus = (orderId: string, itemId: string) => {
    setOrders(prev => {
      const next = prev.map(o => {
        if (o.id !== orderId) return o;
        const updatedItems = o.items.map(item => {
          if (item.id !== itemId || !item.menuItem.goesToKitchen) return item;
          if (item.deliveryStatus === 'nuevo') return { ...item, deliveryStatus: 'en_preparacion' as const };
          if (item.deliveryStatus === 'en_preparacion') return { ...item, deliveryStatus: 'para_entregar' as const };
          return item;
        });

        // Derivar estado de la orden según ítems de cocina
        const kitchenItems = updatedItems.filter(i => i.menuItem.goesToKitchen);
        const allDone = kitchenItems.every(
          i => i.deliveryStatus === 'para_entregar' || i.deliveryStatus === 'entregado',
        );
        const newStatus = allDone
          ? ('listo' as const)
          : kitchenItems.some(
              i =>
                i.deliveryStatus === 'en_preparacion' ||
                i.deliveryStatus === 'para_entregar',
            )
          ? ('en_preparacion' as const)
          : o.status;

        // Notificar mozo cuando un ítem pasa a "para_entregar"
        const justBecameListo = updatedItems.some((item, idx) =>
          item.deliveryStatus === 'para_entregar' &&
          o.items[idx].deliveryStatus === 'en_preparacion',
        );
        if (justBecameListo) {
          const msg = `¡Plato de ${o.tableName} listo para servir!`;
          addNotification(msg);
          playNotificationSound();
          showBrowserNotification(msg);
        }

        return { ...o, status: newStatus, items: updatedItems };
      });

      syncAllTableStatuses(next);
      return next;
    });
  };

  // Legacy: update entire order status
  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(prev => {
      const next = prev.map(o => {
        if (o.id !== orderId) return o;
        let updatedItems = o.items;
        if (status === 'listo') {
          updatedItems = o.items.map(item =>
            item.menuItem.goesToKitchen && item.deliveryStatus !== 'entregado'
              ? ({ ...item, deliveryStatus: 'para_entregar' as const })
              : item,
          );
          const msg = `¡Pedido de ${o.tableName} listo para servir!`;
          addNotification(msg);
          playNotificationSound();
          showBrowserNotification(msg);
        }
        return { ...o, status, items: updatedItems };
      });

      syncAllTableStatuses(next);
      return next;
    });
  };

  const requestBill = (tableId: string, paymentType: PaymentType) => {
    updateTableStatus(tableId, 'bill_requested');
    const requestedAt = new Date();
    const waiterId = currentUser?.id || '';
    const waiterName = currentUser?.name || '';

    setOrders(prev =>
      prev.map(o => {
        if (o.tableId === tableId && o.status !== 'pagado') {
          return {
            ...o,
            status: 'entregado' as OrderStatus,
            paymentType,
            billRequestedAt: requestedAt,
            waiterId: o.waiterId || waiterId,
            waiterName: o.waiterName || waiterName,
          };
        }
        return o;
      }),
    );

    if (paymentType === 'tarjeta') {
      const tableName = tables.find(t => t.id === tableId)?.name ?? `Mesa ${tableId}`;
      const msg = `Cuenta solicitada en ${tableName} (Tarjeta / Factura)`;
      addNotification(msg);
      playNotificationSound();
      showBrowserNotification(msg);
    }
  };

  const markPaid = (tableId: string) => {
    updateTableStatus(tableId, 'free');
    setOrders(prev => {
      const next = prev.map(o => {
        if (o.tableId === tableId && o.status !== 'pagado') {
          return { ...o, status: 'pagado' as OrderStatus };
        }
        return o;
      });

      syncAllTableStatuses(next);
      return next;
    });
  };

  const updateItemDeliveryStatus = (orderId: string, itemId: string, status: ItemDeliveryStatus) => {
    setOrders(prev => {
      const next = prev.map(o => {
        if (o.id !== orderId) return o;

        const orderBefore = o;
        const itemBefore = orderBefore.items.find(item => item.id === itemId);

        const updatedItems = orderBefore.items.map(item =>
          item.id === itemId ? { ...item, deliveryStatus: status } : item,
        );

        const updatedOrder = { ...orderBefore, items: updatedItems };

        // Cuando un ítem de cocina pasa a "para_entregar", notificar al mozo
        if (
          itemBefore &&
          itemBefore.menuItem.goesToKitchen &&
          itemBefore.deliveryStatus !== 'para_entregar' &&
          status === 'para_entregar'
        ) {
          const msg = `¡Pedido de ${orderBefore.tableName} tiene platos listos para servir!`;
          addNotification(msg);
          playNotificationSound();
          showBrowserNotification(msg);
        }

        return updatedOrder;
      });

      // Recalcular estados de mesas según ítems
      syncAllTableStatuses(next);

      // Si ya no quedan ítems "para_entregar" en ninguna mesa, limpiar badge de notificaciones
      const hasPendingDeliveries = next
        .filter(o => o.status !== 'pagado')
        .some(o => o.items.some(item => item.deliveryStatus === 'para_entregar'));

      if (!hasPendingDeliveries) {
        setNotifications([]);
      }

      return next;
    });
  };

  const toggleMenuItemKitchen = (menuItemId: string) => {
    setMenu(prev => prev.map(m => m.id === menuItemId ? { ...m, goesToKitchen: !m.goesToKitchen } : m));
  };

  const addMenuItem = (item: MenuItem) => {
    setMenu(prev => [...prev, item]);
  };

  const updateMenuItem = (id: string, data: Partial<Omit<MenuItem, 'id'>>) => {
    setMenu(prev =>
      prev.map(item => (item.id === id ? { ...item, ...data } : item)),
    );
  };

  const addIngredient = (data: Omit<Ingredient, 'id'>) => {
    const id = `ing-${Date.now()}`;
    setIngredients(prev => [...prev, { ...data, id }]);
  };

  const updateIngredient = (id: string, data: Partial<Omit<Ingredient, 'id'>>) => {
    setIngredients(prev =>
      prev.map(ing => (ing.id === id ? { ...ing, ...data } : ing)),
    );
  };

  const adjustIngredientStock = (id: string, delta: number) => {
    setIngredients(prev =>
      prev.map(ing =>
        ing.id === id
          ? { ...ing, stockQty: Math.max(0, ing.stockQty + delta) }
          : ing,
      ),
    );
  };

  const upsertRecipeForMenuItem = (
    menuItemId: string,
    lines: { ingredientId: string; quantity: number }[],
  ) => {
    setRecipes(prev => {
      const without = prev.filter(r => r.menuItemId !== menuItemId);
      const nextLines: Recipe[] = lines
        .filter(l => l.ingredientId && l.quantity > 0)
        .map(l => ({
          menuItemId,
          ingredientId: l.ingredientId,
          quantity: l.quantity,
        }));
      return [...without, ...nextLines];
    });
  };

  const addNotification = (msg: string) => setNotifications(prev => [...prev, msg]);
  const clearNotification = (index: number) => setNotifications(prev => prev.filter((_, i) => i !== index));

  const getReadyItemsCount = useCallback((tableId: string) => {
    return orders
      .filter(o => o.tableId === tableId && o.status !== 'pagado')
      .flatMap(o => o.items)
      .filter(item => item.deliveryStatus === 'para_entregar')
      .length;
  }, [orders]);

  return (
    <AppContext.Provider value={{
      currentUser,
      tables,
      menu,
      orders,
      ingredients,
      recipes,
      notifications,
      login,
      logout,
      updateTableStatus,
      addMenuItem,
      updateMenuItem,
      addOrder,
      addItemsToTable,
      updateOrderStatus,
      updateItemDeliveryStatus,
      updateKitchenItemStatus,
      toggleMenuItemKitchen,
      addIngredient,
      updateIngredient,
      adjustIngredientStock,
      upsertRecipeForMenuItem,
      requestBill,
      markPaid,
      addNotification,
      clearNotification,
      getReadyItemsCount,
    }}>
      {children}
    </AppContext.Provider>
  );
};
