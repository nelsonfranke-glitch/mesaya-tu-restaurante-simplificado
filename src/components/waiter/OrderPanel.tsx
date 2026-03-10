import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { RestaurantTable, MenuItem, OrderItem, MenuCategory } from '@/types';
import { ArrowLeft, Minus, Plus, Send, MessageSquare, Receipt, PlusCircle, Check, ChefHat, Hand, AlertTriangle, Clock } from 'lucide-react';
import BillModal from '@/components/waiter/BillModal';

const categories: { key: MenuCategory; label: string }[] = [
  { key: 'entradas', label: 'Entradas' },
  { key: 'principales', label: 'Principales' },
  { key: 'postres', label: 'Postres' },
  { key: 'bebidas', label: 'Bebidas' },
];

interface Props {
  table: RestaurantTable;
  onBack: () => void;
}

const deliveryBadge = (item: OrderItem, onToggle: () => void) => {
  const s = item.deliveryStatus;
  switch (s) {
    case 'nuevo':
      return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1 bg-table-occupied/20 text-table-occupied">
          <Clock className="w-3 h-3" /> Nuevo
        </span>
      );
    case 'en_preparacion':
      return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1 bg-table-cooking/20 text-table-cooking">
          <ChefHat className="w-3 h-3" /> Preparando
        </span>
      );
    case 'para_entregar':
      return (
        <button
          onClick={onToggle}
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1 bg-orange-500/20 text-orange-500 transition-colors hover:bg-orange-500/30"
        >
          <Hand className="w-3 h-3" /> Para entregar
        </button>
      );
    case 'entregado':
      return (
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex items-center gap-1 bg-table-ready/20 text-table-ready">
          <Check className="w-3 h-3" /> Entregado
        </span>
      );
  }
};

const OrderPanel = ({ table, onBack }: Props) => {
  const { menu, addOrder, addItemsToTable, currentUser, orders, updateItemDeliveryStatus } = useApp();
  const [activeCategory, setActiveCategory] = useState<MenuCategory>('entradas');
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showBill, setShowBill] = useState(false);

  const tableOrders = orders.filter(o => o.tableId === table.id && o.status !== 'pagado');
  const hasActiveOrders = tableOrders.length > 0;
  const isFreeTable = table.status === 'free';
  const isBillRequested = table.status === 'bill_requested';

  const allOrderedItems = tableOrders.flatMap(o => o.items);
  const runningTotal = allOrderedItems.reduce((sum, oi) => sum + oi.menuItem.price * oi.quantity, 0);
  const newItemsTotal = orderItems.reduce((sum, oi) => sum + oi.menuItem.price * oi.quantity, 0);

  // Count items ready to deliver
  const readyCount = allOrderedItems.filter(i => i.deliveryStatus === 'para_entregar').length;

  const addItem = (item: MenuItem) => {
    setOrderItems(prev => {
      const existing = prev.find(oi => oi.menuItem.id === item.id);
      if (existing) {
        return prev.map(oi => oi.menuItem.id === item.id ? { ...oi, quantity: oi.quantity + 1 } : oi);
      }
      return [...prev, {
        id: `new-${Date.now()}-${item.id}`,
        menuItem: item,
        quantity: 1,
        notes: '',
        deliveryStatus: item.goesToKitchen ? 'nuevo' as const : 'para_entregar' as const,
      }];
    });
  };

  const updateQty = (itemId: string, delta: number) => {
    setOrderItems(prev => prev
      .map(oi => oi.menuItem.id === itemId ? { ...oi, quantity: Math.max(0, oi.quantity + delta) } : oi)
      .filter(oi => oi.quantity > 0)
    );
  };

  const updateNote = (itemId: string, notes: string) => {
    setOrderItems(prev => prev.map(oi => oi.menuItem.id === itemId ? { ...oi, notes } : oi));
  };

  const sendOrder = () => {
    if (orderItems.length === 0) return;
    if (isFreeTable && !hasActiveOrders) {
      addOrder({
        id: `o-${Date.now()}`,
        tableId: table.id,
        tableName: table.name,
        waiterId: currentUser?.id || '',
        waiterName: currentUser?.name || '',
        items: orderItems,
        status: 'nuevo',
        createdAt: new Date(),
      });
    } else {
      addItemsToTable(table.id, orderItems);
    }
    setOrderItems([]);
    setSent(true);
    setTimeout(() => {
      setSent(false);
      setShowMenu(false);
    }, 1500);
  };

  if (sent) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-table-ready/20 flex items-center justify-center mx-auto mb-4">
            <Send className="w-8 h-8 text-table-ready" />
          </div>
          <h3 className="font-display font-semibold text-xl text-foreground">¡Pedido enviado!</h3>
          <p className="text-muted-foreground mt-1">{table.name} — enviado a cocina</p>
        </div>
      </div>
    );
  }

  const shouldShowMenu = isFreeTable && !hasActiveOrders || showMenu;

  if (shouldShowMenu) {
    return <MenuView
      table={table}
      onBack={() => { setShowMenu(false); if (isFreeTable) onBack(); }}
      menu={menu}
      activeCategory={activeCategory}
      setActiveCategory={setActiveCategory}
      orderItems={orderItems}
      addItem={addItem}
      updateQty={updateQty}
      updateNote={updateNote}
      editingNoteId={editingNoteId}
      setEditingNoteId={setEditingNoteId}
      newItemsTotal={newItemsTotal}
      sendOrder={sendOrder}
    />;
  }

  // Active table view
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-3 px-4 pt-4 pb-2 border-b border-border">
        <button onClick={onBack} className="touch-target p-2 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex-1">
          <h2 className="font-display font-semibold text-lg text-foreground">{table.name}</h2>
          <p className="text-xs text-muted-foreground">{table.capacity} personas • {tableOrders.length} pedido(s) activo(s)</p>
        </div>
      </div>

      {/* Banner: items ready to deliver */}
      {readyCount > 0 && (
        <div className="mx-4 mt-3 px-4 py-3 rounded-lg bg-orange-500/15 border border-orange-500/30 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0" />
          <span className="text-sm font-semibold text-orange-500">
            ⚠️ Tenés {readyCount} plato{readyCount > 1 ? 's' : ''} listo{readyCount > 1 ? 's' : ''} para llevar
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tableOrders.map(order => (
          <div key={order.id} className="rounded-lg border border-border bg-card p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">
                {order.createdAt.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {order.items.map(item => (
              <div key={item.id} className="flex items-center justify-between py-1.5 gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-sm text-foreground">
                    <span className="font-semibold text-primary mr-1">×{item.quantity}</span>
                    {item.menuItem.name}
                  </span>
                </div>

                {deliveryBadge(item, () => {
                  if (item.deliveryStatus === 'para_entregar') {
                    updateItemDeliveryStatus(order.id, item.id, 'entregado');
                  }
                })}

                <span className="text-sm font-display text-foreground whitespace-nowrap">
                  ${(item.menuItem.price * item.quantity).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Running total + actions */}
      <div className="p-4 border-t border-border space-y-3 bg-card">
        <div className="flex justify-between items-center">
          <span className="font-display font-semibold text-foreground">Total acumulado</span>
          <span className="font-display font-bold text-2xl text-primary">${runningTotal.toLocaleString()}</span>
        </div>

        {!isBillRequested ? (
          <div className="flex gap-2">
            <button
              onClick={() => setShowMenu(true)}
              className="touch-target flex-1 py-4 rounded-lg bg-primary text-primary-foreground font-display font-semibold text-base transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <PlusCircle className="w-5 h-5" />
              Agregar más items
            </button>
            <button
              onClick={() => setShowBill(true)}
              className="touch-target flex-1 py-4 rounded-lg border-2 border-primary text-primary font-display font-semibold text-base transition-all hover:bg-primary/10 active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Receipt className="w-5 h-5" />
              Solicitar cuenta
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowBill(true)}
            className="touch-target w-full py-4 rounded-lg bg-table-ready text-primary-foreground font-display font-semibold text-lg transition-all hover:opacity-90 active:scale-[0.98] flex items-center justify-center gap-2"
          >
            <Receipt className="w-5 h-5" />
            Ver cuenta y cobrar
          </button>
        )}
      </div>


      {showBill && (
        <BillModal
          table={table}
          orders={tableOrders}
          total={runningTotal}
          onClose={() => setShowBill(false)}
          onConfirm={() => {
            setShowBill(false);
            onBack();
          }}
        />
      )}
    </div>
  );
};

// Extracted menu selection view
const MenuView = ({ table, onBack, menu, activeCategory, setActiveCategory, orderItems, addItem, updateQty, updateNote, editingNoteId, setEditingNoteId, newItemsTotal, sendOrder }: {
  table: RestaurantTable;
  onBack: () => void;
  menu: MenuItem[];
  activeCategory: MenuCategory;
  setActiveCategory: (c: MenuCategory) => void;
  orderItems: OrderItem[];
  addItem: (item: MenuItem) => void;
  updateQty: (id: string, delta: number) => void;
  updateNote: (id: string, notes: string) => void;
  editingNoteId: string | null;
  setEditingNoteId: (id: string | null) => void;
  newItemsTotal: number;
  sendOrder: () => void;
}) => {
  const filteredMenu = menu.filter(m => m.category === activeCategory);

  return (
    <div className="flex-1 flex flex-col lg:flex-row">
      <div className="flex-1 flex flex-col">
        <div className="flex items-center gap-3 px-4 pt-4 pb-2">
          <button onClick={onBack} className="touch-target p-2 rounded-lg hover:bg-muted transition-colors">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h2 className="font-display font-semibold text-lg text-foreground">{table.name}</h2>
            <p className="text-xs text-muted-foreground">Agregar ítems</p>
          </div>
        </div>

        <div className="flex gap-1 px-4 overflow-x-auto pb-2">
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`touch-target px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeCategory === cat.key
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {filteredMenu.map(item => {
              const inOrder = orderItems.find(oi => oi.menuItem.id === item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => addItem(item)}
                  className={`touch-target text-left p-4 rounded-lg border transition-all duration-150 active:scale-[0.97] ${
                    inOrder ? 'border-primary bg-primary/5' : 'border-border bg-card hover:border-primary/40'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium text-foreground flex items-center gap-1.5">
                        {item.name}
                        {!item.goesToKitchen && (
                          <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">Mozo</span>
                        )}
                      </div>
                      {item.description && <div className="text-xs text-muted-foreground mt-0.5">{item.description}</div>}
                    </div>
                    <div className="text-right ml-2">
                      <div className="font-display font-semibold text-foreground">${item.price.toLocaleString()}</div>
                      {inOrder && <div className="text-xs font-medium text-primary mt-0.5">×{inOrder.quantity}</div>}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Order summary sidebar */}
      <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-border bg-card flex flex-col">
        <div className="p-4 border-b border-border">
          <h3 className="font-display font-semibold text-foreground">Nuevos ítems</h3>
          <p className="text-xs text-muted-foreground">{orderItems.length} ítems</p>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {orderItems.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">Tocá un plato para agregar</p>
          ) : (
            orderItems.map(oi => (
              <div key={oi.id} className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-foreground flex-1">
                    {oi.menuItem.name}
                    {!oi.menuItem.goesToKitchen && (
                      <span className="ml-1.5 text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded-full">Mozo</span>
                    )}
                  </span>
                  <span className="text-sm font-display font-semibold text-foreground ml-2">
                    ${(oi.menuItem.price * oi.quantity).toLocaleString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => updateQty(oi.menuItem.id, -1)} className="w-8 h-8 rounded-md bg-card border border-border flex items-center justify-center hover:bg-muted">
                    <Minus className="w-4 h-4 text-foreground" />
                  </button>
                  <span className="text-sm font-medium text-foreground w-6 text-center">{oi.quantity}</span>
                  <button onClick={() => updateQty(oi.menuItem.id, 1)} className="w-8 h-8 rounded-md bg-card border border-border flex items-center justify-center hover:bg-muted">
                    <Plus className="w-4 h-4 text-foreground" />
                  </button>
                  <button
                    onClick={() => setEditingNoteId(editingNoteId === oi.menuItem.id ? null : oi.menuItem.id)}
                    className={`ml-auto w-8 h-8 rounded-md flex items-center justify-center ${oi.notes ? 'bg-warning/20 text-warning' : 'bg-card border border-border text-muted-foreground hover:text-foreground'}`}
                  >
                    <MessageSquare className="w-4 h-4" />
                  </button>
                </div>
                {editingNoteId === oi.menuItem.id && (
                  <input
                    autoFocus
                    value={oi.notes || ''}
                    onChange={e => updateNote(oi.menuItem.id, e.target.value)}
                    placeholder="Ej: sin sal, bien cocido..."
                    className="mt-2 w-full text-sm px-3 py-2 rounded-md bg-card border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-border space-y-3">
          <div className="flex justify-between items-center">
            <span className="font-display font-semibold text-foreground">Total nuevos</span>
            <span className="font-display font-bold text-xl text-primary">${newItemsTotal.toLocaleString()}</span>
          </div>
          <button
            onClick={sendOrder}
            disabled={orderItems.length === 0}
            className="touch-target w-full py-4 rounded-lg bg-primary text-primary-foreground font-display font-semibold text-lg transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            Enviar a cocina
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderPanel;
