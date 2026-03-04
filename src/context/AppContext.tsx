import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, UserRole, RestaurantTable, MenuItem, Order, OrderItem, Ingredient, TableStatus, OrderStatus } from '@/types';
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
  requestBill: (tableId: string) => void;
  markPaid: (tableId: string) => void;
  addNotification: (msg: string) => void;
  clearNotification: (index: number) => void;
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

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tables, setTables] = useState<RestaurantTable[]>(mockTables);
  const [menu] = useState<MenuItem[]>(mockMenu);
  const [orders, setOrders] = useState<Order[]>(mockOrders);
  const [ingredients] = useState<Ingredient[]>(mockIngredients);
  const [notifications, setNotifications] = useState<string[]>([]);

  const login = (role: UserRole) => setCurrentUser(demoUsers[role]);
  const logout = () => setCurrentUser(null);

  const updateTableStatus = (tableId: string, status: TableStatus) => {
    setTables(prev => prev.map(t => t.id === tableId ? { ...t, status } : t));
  };

  const addOrder = (order: Order) => {
    setOrders(prev => [...prev, order]);
    updateTableStatus(order.tableId, 'occupied');
  };

  // Add more items to an existing table (creates a new order linked to same table)
  const addItemsToTable = (tableId: string, items: OrderItem[]) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    const newOrder: Order = {
      id: `o-${Date.now()}`,
      tableId,
      tableName: table.name,
      waiterId: currentUser?.id || '',
      waiterName: currentUser?.name || '',
      items,
      status: 'nuevo',
      createdAt: new Date(),
    };
    setOrders(prev => [...prev, newOrder]);
    // Table goes back to occupied when new items are added
    updateTableStatus(tableId, 'occupied');
  };

  // Kitchen only changes ORDER status, never table status
  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const updated = { ...o, status };
      // When kitchen marks order as "listo", notify waiter but DON'T change table
      if (status === 'listo') {
        addNotification(`¡Pedido de ${o.tableName} listo para servir!`);
      }
      return updated;
    }));
  };

  // Waiter requests bill - changes table status
  const requestBill = (tableId: string) => {
    updateTableStatus(tableId, 'bill_requested');
    // Mark all active orders for this table as "entregado" 
    setOrders(prev => prev.map(o => {
      if (o.tableId === tableId && o.status !== 'pagado') {
        return { ...o, status: 'entregado' as OrderStatus };
      }
      return o;
    }));
  };

  // Waiter marks as paid - frees table
  const markPaid = (tableId: string) => {
    updateTableStatus(tableId, 'free');
    setOrders(prev => prev.map(o => {
      if (o.tableId === tableId && o.status !== 'pagado') {
        return { ...o, status: 'pagado' as OrderStatus };
      }
      return o;
    }));
  };

  const addNotification = (msg: string) => setNotifications(prev => [...prev, msg]);
  const clearNotification = (index: number) => setNotifications(prev => prev.filter((_, i) => i !== index));

  return (
    <AppContext.Provider value={{
      currentUser, tables, menu, orders, ingredients, notifications,
      login, logout, updateTableStatus, addOrder, addItemsToTable,
      updateOrderStatus, requestBill, markPaid, addNotification, clearNotification,
    }}>
      {children}
    </AppContext.Provider>
  );
};
