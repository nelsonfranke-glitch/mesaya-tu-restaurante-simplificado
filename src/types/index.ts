export type UserRole = 'owner' | 'manager' | 'waiter' | 'kitchen';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  restaurantId: string;
}

export type TableStatus = 'free' | 'occupied' | 'cooking' | 'ready' | 'bill_requested';

export interface RestaurantTable {
  id: string;
  name: string;
  capacity: number;
  status: TableStatus;
}

export type MenuCategory = 'entradas' | 'principales' | 'postres' | 'bebidas';

export interface MenuItem {
  id: string;
  name: string;
  category: MenuCategory;
  price: number;
  description?: string;
  photo?: string;
}

export interface OrderItem {
  id: string;
  menuItem: MenuItem;
  quantity: number;
  notes?: string;
}

export type OrderStatus = 'nuevo' | 'en_preparacion' | 'listo' | 'pagado' | 'entregado';

export interface Order {
  id: string;
  tableId: string;
  tableName: string;
  waiterId: string;
  waiterName: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: Date;
}

export interface Ingredient {
  id: string;
  name: string;
  unit: string;
  stockQty: number;
  minThreshold: number;
}

export interface Recipe {
  menuItemId: string;
  ingredientId: string;
  quantity: number;
}
