import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { User, UserRole, RestaurantTable, MenuItem, Order, OrderItem, Ingredient, TableStatus, OrderStatus, ItemDeliveryStatus } from '@/types';
import { mockTables, mockMenu, mockOrders, mockIngredients } from '@/data/mock';

interface AppState {
  currentUser: User | null;
  tables: RestaurantTable[];
  menu: MenuItem[];
  orders: Order[];
  ingredients: Ingredient[];
  notifications: string[];
  login: (role: UserRole) => void;
  logout: () => void;
  updateTableStatus: (tableId: string, status: TableStatus) => void;
  addOrder: (order: Order) => void;
  addItemsToTable: (tableId: string, items: OrderItem[]) => void;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  updateItemDeliveryStatus: (orderId: string, itemId: string, status: ItemDeliveryStatus) => void;
  updateKitchenItemStatus: (orderId: string, itemId: string) => void;
  toggleMenuItemKitchen: (menuItemId: string) => void;
  requestBill: (tableId: string) => void;
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
  const [ingredients] = useState<Ingredient[]>(mockIngredients);
  const [notifications, setNotifications] = useState<string[]>([]);

  const login = (role: UserRole) => setCurrentUser(demoUsers[role]);
  const logout = () => setCurrentUser(null);

  const updateTableStatus = (tableId: string, status: TableStatus) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, status } : t));
  };

  const addOrder = (order: Order) => {
    const itemsWithStatus = order.items.map(item => ({
      ...item,
      deliveryStatus: item.menuItem.goesToKitchen ? 'nuevo' as const : 'para_entregar' as const,
    }));
    const hasKitchenItems = itemsWithStatus.some(i => i.menuItem.goesToKitchen);
    setOrders(prev => [...prev, { ...order, items: itemsWithStatus }]);
    updateTableStatus(order.tableId, 'occupied');
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
    setOrders(prev => [...prev, newOrder]);
    updateTableStatus(tableId, 'occupied');
    if (hasKitchenItems) playKitchenNewOrderSound();
  };

  // Kitchen advances a single item: nuevo → en_preparacion → para_entregar (listo)
  const updateKitchenItemStatus = (orderId: string, itemId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const updatedItems = o.items.map(item => {
        if (item.id !== itemId || !item.menuItem.goesToKitchen) return item;
        if (item.deliveryStatus === 'nuevo') return { ...item, deliveryStatus: 'en_preparacion' as const };
        if (item.deliveryStatus === 'en_preparacion') return { ...item, deliveryStatus: 'para_entregar' as const };
        return item;
      });

      // Derive order status from items
      const kitchenItems = updatedItems.filter(i => i.menuItem.goesToKitchen);
      const allDone = kitchenItems.every(i => i.deliveryStatus === 'para_entregar' || i.deliveryStatus === 'entregado');
      const newStatus = allDone ? 'listo' as const : kitchenItems.some(i => i.deliveryStatus === 'en_preparacion' || i.deliveryStatus === 'para_entregar') ? 'en_preparacion' as const : o.status;

      // Notify waiter when item becomes listo
      const justBecameListo = updatedItems.some((item, idx) =>
        item.deliveryStatus === 'para_entregar' && o.items[idx].deliveryStatus === 'en_preparacion'
      );
      if (justBecameListo) {
        const msg = `¡Plato de ${o.tableName} listo para servir!`;
        addNotification(msg);
        playNotificationSound();
        showBrowserNotification(msg);
      }

      return { ...o, status: newStatus, items: updatedItems };
    }));
  };

  // Legacy: update entire order status
  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      let updatedItems = o.items;
      if (status === 'listo') {
        updatedItems = o.items.map(item =>
          item.menuItem.goesToKitchen && item.deliveryStatus !== 'entregado'
            ? { ...item, deliveryStatus: 'para_entregar' as const }
            : item
        );
        const msg = `¡Pedido de ${o.tableName} listo para servir!`;
        addNotification(msg);
        playNotificationSound();
        showBrowserNotification(msg);
      }
      return { ...o, status, items: updatedItems };
    }));
  };

  const requestBill = (tableId: string) => {
    updateTableStatus(tableId, 'bill_requested');
    setOrders(prev => prev.map(o => {
      if (o.tableId === tableId && o.status !== 'pagado') {
        return { ...o, status: 'entregado' as OrderStatus };
      }
      return o;
    }));
  };

  const markPaid = (tableId: string) => {
    updateTableStatus(tableId, 'free');
    setOrders(prev => prev.map(o => {
      if (o.tableId === tableId && o.status !== 'pagado') {
        return { ...o, status: 'pagado' as OrderStatus };
      }
      return o;
    }));
  };

  const updateItemDeliveryStatus = (orderId: string, itemId: string, status: ItemDeliveryStatus) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;

      const orderBefore = o;
      const itemBefore = orderBefore.items.find(item => item.id === itemId);

      const updatedItems = orderBefore.items.map(item =>
        item.id === itemId ? { ...item, deliveryStatus: status } : item,
      );

      const updatedOrder = { ...orderBefore, items: updatedItems };

      // When a kitchen item becomes "para_entregar", notify waiter
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
    }));
  };

  const toggleMenuItemKitchen = (menuItemId: string) => {
    setMenu(prev => prev.map(m => m.id === menuItemId ? { ...m, goesToKitchen: !m.goesToKitchen } : m));
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
      currentUser, tables, menu, orders, ingredients, notifications,
      login, logout, updateTableStatus, addOrder, addItemsToTable,
      updateOrderStatus, updateItemDeliveryStatus, updateKitchenItemStatus, toggleMenuItemKitchen,
      requestBill, markPaid, addNotification, clearNotification, getReadyItemsCount,
    }}>
      {children}
    </AppContext.Provider>
  );
};
