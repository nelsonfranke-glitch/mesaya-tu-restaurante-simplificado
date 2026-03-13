import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session } from '@supabase/supabase-js';
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
  MenuCategory,
} from '@/types';

/* ───────── helpers: DB row → App type ───────── */

const mapTable = (r: any): RestaurantTable => ({
  id: r.id, name: r.name, capacity: r.capacity, status: r.status as TableStatus,
});

const mapMenuItem = (r: any): MenuItem => ({
  id: r.id, name: r.name, category: r.category as MenuCategory,
  price: Number(r.price), description: r.description || undefined,
  photo: r.photo || undefined, goesToKitchen: r.goes_to_kitchen,
});

const mapOrderItem = (r: any): OrderItem => ({
  id: r.id,
  menuItem: {
    id: r.menu_item_id || r.id,
    name: r.menu_item_name,
    category: r.menu_item_category as MenuCategory,
    price: Number(r.menu_item_price),
    goesToKitchen: r.menu_item_goes_to_kitchen,
  },
  quantity: r.quantity,
  notes: r.notes || undefined,
  deliveryStatus: r.delivery_status as ItemDeliveryStatus,
});

const mapOrder = (row: any, items: any[]): Order => ({
  id: row.id, tableId: row.table_id, tableName: row.table_name,
  waiterId: row.waiter_id || '', waiterName: row.waiter_name || '',
  items: items.map(mapOrderItem),
  status: row.status as OrderStatus,
  createdAt: new Date(row.created_at),
  paymentType: (row.payment_type as PaymentType) || undefined,
  billRequestedAt: row.bill_requested_at ? new Date(row.bill_requested_at) : undefined,
});

const mapIngredient = (r: any): Ingredient => ({
  id: r.id, name: r.name, unit: r.unit,
  stockQty: Number(r.stock_qty), minThreshold: Number(r.min_threshold),
});

const mapRecipe = (r: any): Recipe => ({
  menuItemId: r.menu_item_id, ingredientId: r.ingredient_id, quantity: Number(r.quantity),
});

/* ───────── sounds ───────── */

const playNotificationSound = () => {
  try {
    const ctx = new AudioContext(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination); osc.frequency.value = 880; osc.type = 'sine';
    gain.gain.value = 0.3; osc.start();
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3); osc.stop(ctx.currentTime + 0.3);
  } catch { /* silent */ }
};

const playKitchenNewOrderSound = () => {
  try {
    const ctx = new AudioContext(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination); osc.frequency.value = 523; osc.type = 'square';
    gain.gain.value = 0.25; osc.start();
    setTimeout(() => { osc.frequency.value = 659; }, 150);
    setTimeout(() => { osc.frequency.value = 784; }, 300);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5); osc.stop(ctx.currentTime + 0.5);
  } catch { /* silent */ }
};

const showBrowserNotification = (msg: string) => {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification('MesaYa', { body: msg, icon: '/favicon.ico' });
  } else if ('Notification' in window && Notification.permission !== 'denied') {
    Notification.requestPermission();
  }
};

/* ───────── Context interface ───────── */

interface AppState {
  session: Session | null;
  currentUser: User | null;
  loading: boolean;
  authError: string | null;
  tables: RestaurantTable[];
  menu: MenuItem[];
  orders: Order[];
  ingredients: Ingredient[];
  recipes: Recipe[];
  notifications: string[];
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
  upsertRecipeForMenuItem: (menuItemId: string, lines: { ingredientId: string; quantity: number }[]) => void;
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

/* ───────── Provider ───────── */

export const AppProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [restaurantId, setRestaurantId] = useState<string | null>(null);

  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [menu, setMenu] = useState<MenuItem[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [notifications, setNotifications] = useState<string[]>([]);

  const prevOrderIdsRef = useRef<Set<string>>(new Set());

  /* ── Fetch helpers ── */

  const fetchTables = useCallback(async (rid: string) => {
    const { data } = await supabase.from('restaurant_tables').select('*').eq('restaurant_id', rid);
    if (data) setTables(data.map(mapTable));
  }, []);

  const fetchMenu = useCallback(async (rid: string) => {
    const { data } = await supabase.from('menu_items').select('*').eq('restaurant_id', rid);
    if (data) setMenu(data.map(mapMenuItem));
  }, []);

  const fetchOrders = useCallback(async (rid: string) => {
    const { data: orderRows } = await supabase
      .from('orders').select('*').eq('restaurant_id', rid).neq('status', 'pagado')
      .order('created_at', { ascending: true });
    if (!orderRows) return;

    const orderIds = orderRows.map(o => o.id);
    let itemRows: any[] = [];
    if (orderIds.length > 0) {
      const { data } = await supabase.from('order_items').select('*').in('order_id', orderIds);
      if (data) itemRows = data;
    }

    const mapped = orderRows.map(o => mapOrder(o, itemRows.filter(i => i.order_id === o.id)));

    // Detect new kitchen orders for sound
    const newIds = new Set(mapped.map(o => o.id));
    const prev = prevOrderIdsRef.current;
    mapped.forEach(o => {
      if (!prev.has(o.id) && prev.size > 0) {
        const hasKitchen = o.items.some(i => i.menuItem.goesToKitchen);
        if (hasKitchen) playKitchenNewOrderSound();
      }
    });
    prevOrderIdsRef.current = newIds;

    setOrders(mapped);
  }, []);

  const fetchIngredients = useCallback(async (rid: string) => {
    const { data } = await supabase.from('ingredients').select('*').eq('restaurant_id', rid);
    if (data) setIngredients(data.map(mapIngredient));
  }, []);

  const fetchRecipes = useCallback(async (rid: string) => {
    const { data } = await supabase.from('recipes').select('*');
    if (data) setRecipes(data.map(mapRecipe));
  }, []);

  const fetchAll = useCallback(async (rid: string) => {
    await Promise.all([fetchTables(rid), fetchMenu(rid), fetchOrders(rid), fetchIngredients(rid), fetchRecipes(rid)]);
  }, [fetchTables, fetchMenu, fetchOrders, fetchIngredients, fetchRecipes]);

  /* ── Auth ── */

  useEffect(() => {
    // Timeout fallback: if loading is still true after 5s, force it off
    const timeoutId = setTimeout(() => {
      setLoading(prev => {
        if (prev) console.warn('Auth init timed out, forcing login screen');
        return false;
      });
    }, 5000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, sess) => {
      setSession(sess);
      if (sess?.user) {
        try {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', sess.user.id).single();
          const { data: roleRows } = await supabase.from('user_roles').select('role').eq('user_id', sess.user.id);

          if (profile && roleRows && roleRows.length > 0) {
            const role = roleRows[0].role as UserRole;
            const rid = profile.restaurant_id as string;
            setRestaurantId(rid);
            setCurrentUser({
              id: sess.user.id,
              name: profile.name,
              role,
              restaurantId: rid,
            });
            await fetchAll(rid);
          } else {
            setCurrentUser(null);
            setRestaurantId(null);
          }
        } catch (err) {
          console.error('Error fetching profile/roles:', err);
          setCurrentUser(null);
          setRestaurantId(null);
        }
      } else {
        setCurrentUser(null);
        setRestaurantId(null);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      if (!s) setLoading(false);
    });

    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [fetchAll]);

  /* ── Realtime ── */

  useEffect(() => {
    if (!restaurantId) return;

    const channel = supabase
      .channel('realtime-all')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurant_tables' }, () => {
        fetchTables(restaurantId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders(restaurantId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'order_items' }, (payload) => {
        fetchOrders(restaurantId);
        fetchTables(restaurantId); // trigger may have updated table status

        // Notify waiter when item becomes ready
        if (payload.eventType === 'UPDATE' && payload.new && payload.old) {
          const oldStatus = (payload.old as any).delivery_status;
          const newStatus = (payload.new as any).delivery_status;
          if (oldStatus === 'en_preparacion' && newStatus === 'para_entregar') {
            const msg = '¡Plato listo para servir!';
            setNotifications(prev => [...prev, msg]);
            playNotificationSound();
            showBrowserNotification(msg);
          }
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'menu_items' }, () => {
        fetchMenu(restaurantId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, () => {
        fetchIngredients(restaurantId);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' }, () => {
        fetchRecipes(restaurantId);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [restaurantId, fetchTables, fetchMenu, fetchOrders, fetchIngredients, fetchRecipes]);

  /* ── Mutations ── */

  const logout = () => { supabase.auth.signOut(); };

  const updateTableStatus = (tableId: string, status: TableStatus) => {
    supabase.from('restaurant_tables').update({ status }).eq('id', tableId).then();
  };

  const addOrder = (order: Order) => {
    if (!restaurantId || !currentUser) return;
    (async () => {
      const { data } = await supabase.from('orders').insert({
        restaurant_id: restaurantId,
        table_id: order.tableId,
        table_name: order.tableName,
        waiter_id: currentUser.id,
        waiter_name: currentUser.name,
        status: 'nuevo',
      } as any).select().single();
      if (!data) return;
      const items = order.items.map(i => ({
        order_id: data.id,
        menu_item_id: i.menuItem.id,
        menu_item_name: i.menuItem.name,
        menu_item_price: i.menuItem.price,
        menu_item_category: i.menuItem.category,
        menu_item_goes_to_kitchen: i.menuItem.goesToKitchen,
        quantity: i.quantity,
        notes: i.notes || null,
        delivery_status: i.menuItem.goesToKitchen ? 'nuevo' : 'para_entregar',
      }));
      await supabase.from('order_items').insert(items as any);
    })();
  };

  const addItemsToTable = (tableId: string, items: OrderItem[]) => {
    if (!restaurantId || !currentUser) return;
    const table = tables.find(t => t.id === tableId);
    if (!table) return;
    (async () => {
      const { data } = await supabase.from('orders').insert({
        restaurant_id: restaurantId,
        table_id: tableId,
        table_name: table.name,
        waiter_id: currentUser.id,
        waiter_name: currentUser.name,
        status: 'nuevo',
      } as any).select().single();
      if (!data) return;
      const rows = items.map(i => ({
        order_id: data.id,
        menu_item_id: i.menuItem.id,
        menu_item_name: i.menuItem.name,
        menu_item_price: i.menuItem.price,
        menu_item_category: i.menuItem.category,
        menu_item_goes_to_kitchen: i.menuItem.goesToKitchen,
        quantity: i.quantity,
        notes: i.notes || null,
        delivery_status: i.menuItem.goesToKitchen ? 'nuevo' : 'para_entregar',
      }));
      await supabase.from('order_items').insert(rows as any);
    })();
  };

  const updateKitchenItemStatus = (orderId: string, itemId: string) => {
    const order = orders.find(o => o.id === orderId);
    const item = order?.items.find(i => i.id === itemId);
    if (!item) return;
    let nextStatus: ItemDeliveryStatus | null = null;
    if (item.deliveryStatus === 'nuevo') nextStatus = 'en_preparacion';
    else if (item.deliveryStatus === 'en_preparacion') nextStatus = 'para_entregar';
    if (!nextStatus) return;
    supabase.from('order_items').update({ delivery_status: nextStatus } as any).eq('id', itemId).then();
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    supabase.from('orders').update({ status } as any).eq('id', orderId).then();
    if (status === 'listo') {
      // Mark all kitchen items as para_entregar
      const order = orders.find(o => o.id === orderId);
      if (order) {
        order.items.forEach(item => {
          if (item.menuItem.goesToKitchen && item.deliveryStatus !== 'entregado') {
            supabase.from('order_items').update({ delivery_status: 'para_entregar' } as any).eq('id', item.id).then();
          }
        });
      }
    }
  };

  const updateItemDeliveryStatus = (orderId: string, itemId: string, status: ItemDeliveryStatus) => {
    supabase.from('order_items').update({ delivery_status: status } as any).eq('id', itemId).then();
  };

  const requestBill = (tableId: string, paymentType: PaymentType) => {
    supabase.from('restaurant_tables').update({ status: 'bill_requested' } as any).eq('id', tableId).then();
    const now = new Date().toISOString();
    orders.filter(o => o.tableId === tableId && o.status !== 'pagado').forEach(o => {
      supabase.from('orders').update({
        status: 'entregado',
        payment_type: paymentType,
        bill_requested_at: now,
      } as any).eq('id', o.id).then();
    });
    if (paymentType === 'tarjeta') {
      const tableName = tables.find(t => t.id === tableId)?.name ?? `Mesa`;
      const msg = `Cuenta solicitada en ${tableName} (Tarjeta / Factura)`;
      setNotifications(prev => [...prev, msg]);
      playNotificationSound();
      showBrowserNotification(msg);
    }
  };

  const markPaid = (tableId: string) => {
    orders.filter(o => o.tableId === tableId && o.status !== 'pagado').forEach(o => {
      supabase.from('orders').update({ status: 'pagado' } as any).eq('id', o.id).then();
    });
    supabase.from('restaurant_tables').update({ status: 'free' } as any).eq('id', tableId).then();
  };

  const toggleMenuItemKitchen = (menuItemId: string) => {
    const item = menu.find(m => m.id === menuItemId);
    if (!item) return;
    supabase.from('menu_items').update({ goes_to_kitchen: !item.goesToKitchen } as any).eq('id', menuItemId).then();
  };

  const addMenuItem = (item: MenuItem) => {
    if (!restaurantId) return;
    supabase.from('menu_items').insert({
      restaurant_id: restaurantId,
      name: item.name,
      category: item.category,
      price: item.price,
      description: item.description || null,
      goes_to_kitchen: item.goesToKitchen,
    } as any).then();
  };

  const updateMenuItem = (id: string, data: Partial<Omit<MenuItem, 'id'>>) => {
    const mapped: any = {};
    if (data.name !== undefined) mapped.name = data.name;
    if (data.category !== undefined) mapped.category = data.category;
    if (data.price !== undefined) mapped.price = data.price;
    if (data.description !== undefined) mapped.description = data.description;
    if (data.goesToKitchen !== undefined) mapped.goes_to_kitchen = data.goesToKitchen;
    supabase.from('menu_items').update(mapped).eq('id', id).then();
  };

  const addIngredient = (data: Omit<Ingredient, 'id'>) => {
    if (!restaurantId) return;
    supabase.from('ingredients').insert({
      restaurant_id: restaurantId,
      name: data.name,
      unit: data.unit,
      stock_qty: data.stockQty,
      min_threshold: data.minThreshold,
    } as any).then();
  };

  const updateIngredient = (id: string, data: Partial<Omit<Ingredient, 'id'>>) => {
    const mapped: any = {};
    if (data.name !== undefined) mapped.name = data.name;
    if (data.unit !== undefined) mapped.unit = data.unit;
    if (data.stockQty !== undefined) mapped.stock_qty = data.stockQty;
    if (data.minThreshold !== undefined) mapped.min_threshold = data.minThreshold;
    supabase.from('ingredients').update(mapped).eq('id', id).then();
  };

  const adjustIngredientStock = (id: string, delta: number) => {
    const ing = ingredients.find(i => i.id === id);
    if (!ing) return;
    const newQty = Math.max(0, ing.stockQty + delta);
    supabase.from('ingredients').update({ stock_qty: newQty } as any).eq('id', id).then();
  };

  const upsertRecipeForMenuItem = (menuItemId: string, lines: { ingredientId: string; quantity: number }[]) => {
    (async () => {
      // Delete existing recipes for this menu item
      await supabase.from('recipes').delete().eq('menu_item_id', menuItemId);
      const validLines = lines.filter(l => l.ingredientId && l.quantity > 0);
      if (validLines.length > 0) {
        await supabase.from('recipes').insert(
          validLines.map(l => ({
            menu_item_id: menuItemId,
            ingredient_id: l.ingredientId,
            quantity: l.quantity,
          })) as any
        );
      }
    })();
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
      session,
      currentUser,
      loading,
      tables, menu, orders, ingredients, recipes, notifications,
      logout,
      updateTableStatus, addMenuItem, updateMenuItem,
      addOrder, addItemsToTable,
      updateOrderStatus, updateItemDeliveryStatus, updateKitchenItemStatus,
      toggleMenuItemKitchen,
      addIngredient, updateIngredient, adjustIngredientStock,
      upsertRecipeForMenuItem,
      requestBill, markPaid,
      addNotification, clearNotification, getReadyItemsCount,
    }}>
      {children}
    </AppContext.Provider>
  );
};
