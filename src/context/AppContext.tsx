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

// Play a short notification beep
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
    // Set initial deliveryStatus based on goesToKitchen
    const itemsWithStatus = order.items.map(item => ({
      ...item,
      deliveryStatus: item.menuItem.goesToKitchen ? 'nuevo' as const : 'para_entregar' as const,
    }));
    setOrders(prev => [...prev, { ...order, items: itemsWithStatus }]);
    updateTableStatus(order.tableId, 'occupied');
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
    setOrders(prev => [...prev, newOrder]);
    updateTableStatus(tableId, 'occupied');
  };

  // Kitchen changes ORDER status and updates per-item deliveryStatus
  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;

      let updatedItems = o.items;

      if (status === 'en_preparacion') {
        // Mark kitchen items as en_preparacion
        updatedItems = o.items.map(item =>
          item.menuItem.goesToKitchen && item.deliveryStatus === 'nuevo'
            ? { ...item, deliveryStatus: 'en_preparacion' as const }
            : item
        );
      }

      if (status === 'listo') {
        // Kitchen marks done → items become "para_entregar" for waiter
        updatedItems = o.items.map(item =>
          item.menuItem.goesToKitchen && item.deliveryStatus !== 'entregado'
            ? { ...item, deliveryStatus: 'para_entregar' as const }
            : item
        );
        // Notifications
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
      return { ...o, items: o.items.map(item => item.id === itemId ? { ...item, deliveryStatus: status } : item) };
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
      updateOrderStatus, updateItemDeliveryStatus, toggleMenuItemKitchen,
      requestBill, markPaid, addNotification, clearNotification, getReadyItemsCount,
    }}>
      {children}
    </AppContext.Provider>
  );
};
