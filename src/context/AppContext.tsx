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
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
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

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o;
      const updated = { ...o, status };
      if (status === 'en_preparacion') updateTableStatus(o.tableId, 'cooking');
      if (status === 'listo') {
        updateTableStatus(o.tableId, 'ready');
        addNotification(`¡Pedido de ${o.tableName} listo!`);
      }
      if (status === 'pagado') updateTableStatus(o.tableId, 'free');
      return updated;
    }));
  };

  const addNotification = (msg: string) => setNotifications(prev => [...prev, msg]);
  const clearNotification = (index: number) => setNotifications(prev => prev.filter((_, i) => i !== index));

  return (
    <AppContext.Provider value={{
      currentUser, tables, menu, orders, ingredients, notifications,
      login, logout, updateTableStatus, addOrder, updateOrderStatus, addNotification, clearNotification,
    }}>
      {children}
    </AppContext.Provider>
  );
};
