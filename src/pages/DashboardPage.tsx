import { useApp } from '@/context/AppContext';
import { LogOut, DollarSign, ShoppingBag, Clock, Grid3X3, AlertTriangle, UtensilsCrossed, Settings, Receipt } from 'lucide-react';
import { useState } from 'react';
import MenuManagement from '@/components/owner/MenuManagement';
import InventoryManagement from '@/components/owner/InventoryManagement';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import BillModal from '@/components/waiter/BillModal';

const hourlyData = [
  { hour: '11h', pedidos: 3 },
  { hour: '12h', pedidos: 8 },
  { hour: '13h', pedidos: 12 },
  { hour: '14h', pedidos: 10 },
  { hour: '15h', pedidos: 4 },
  { hour: '19h', pedidos: 6 },
  { hour: '20h', pedidos: 14 },
  { hour: '21h', pedidos: 11 },
  { hour: '22h', pedidos: 7 },
  { hour: '23h', pedidos: 3 },
];

type Tab = 'dashboard' | 'menu' | 'inventory';

const DashboardPage = () => {
  const { currentUser, logout, orders, tables, menu, ingredients } = useApp();
  const [activeTab, setActiveTab] = useState<Tab>('dashboard');
  const [selectedBillTableId, setSelectedBillTableId] = useState<string | null>(null);

  const totalOrders = orders.length;
  const cookedOrders = orders.filter(
    o => o.status === 'listo' || o.status === 'entregado' || o.status === 'pagado',
  );
  const paidOrders = orders.filter(o => o.status === 'pagado');
  const totalSales = paidOrders.reduce(
    (sum, o) =>
      sum +
      o.items.reduce((s, i) => s + i.menuItem.price * i.quantity, 0),
    0,
  );
  const activeTables = tables.filter(t => t.status !== 'free').length;
  const avgPrepTime = 22;
  const lowStock = ingredients.filter(i => i.stockQty < i.minThreshold);
  const pendingBillsCount = tables.filter(t => t.status === 'bill_requested').length;

  const pendingBills = tables
    .filter(t => t.status === 'bill_requested')
    .map(table => {
      const tableOrders = orders.filter(o => o.tableId === table.id && o.status !== 'pagado');
      if (tableOrders.length === 0) return null;
      const baseOrder = tableOrders.reduce((acc: typeof tableOrders[0] | null, o) => {
        if (!acc) return o;
        const accTime = acc.billRequestedAt ?? acc.createdAt;
        const oTime = o.billRequestedAt ?? o.createdAt;
        return oTime < accTime ? o : acc;
      }, null as typeof tableOrders[0] | null);
      if (!baseOrder) return null;
      const requestedAt = baseOrder.billRequestedAt ?? baseOrder.createdAt;
      const now = Date.now();
      const diffMin = Math.floor((now - requestedAt.getTime()) / 60000);
      let timerClass = 'bg-emerald-500/15 text-emerald-500 border border-emerald-500/40';
      let timerLabel = `${diffMin} min`;
      if (diffMin < 0) {
        timerLabel = '0 min';
      } else if (diffMin >= 6 && diffMin <= 10) {
        timerClass = 'bg-orange-500/15 text-orange-500 border border-orange-500/40';
        timerLabel = `⚠️ ${diffMin} min`;
      } else if (diffMin > 10) {
        timerClass = 'bg-red-500/15 text-red-400 border border-red-500/50 animate-pulse-soft';
        timerLabel = `⚠️ ${diffMin} min`;
      }
      const paymentType = baseOrder.paymentType ?? 'sin_especificar';
      return {
        table,
        waiterName: baseOrder.waiterName,
        paymentType,
        requestedAt,
        diffMin,
        timerClass,
        timerLabel,
      };
    })
    .filter((x): x is NonNullable<typeof x> => !!x);

  // Top dishes
  const dishCount: Record<string, { name: string; count: number }> = {};
  orders.forEach(o => o.items.forEach(i => {
    const key = i.menuItem.id;
    if (!dishCount[key]) dishCount[key] = { name: i.menuItem.name, count: 0 };
    dishCount[key].count += i.quantity;
  }));
  const topDishes = Object.values(dishCount).sort((a, b) => b.count - a.count).slice(0, 5);

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'dashboard', label: 'Dashboard', icon: <Grid3X3 className="w-4 h-4" /> },
    { key: 'menu', label: 'Menú', icon: <UtensilsCrossed className="w-4 h-4" /> },
    { key: 'inventory', label: 'Inventario', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div>
          <h1 className="font-display font-bold text-xl text-primary">MesaYa</h1>
          <p className="text-xs text-muted-foreground">{currentUser?.name}</p>
        </div>
        <div className="flex items-center gap-3">
          {(currentUser?.role === 'manager' || currentUser?.role === 'owner') && (
            <div className="relative flex items-center">
              <Receipt className="w-5 h-5 text-muted-foreground" />
              {pendingBillsCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] rounded-full bg-orange-500 text-white text-[10px] font-bold flex items-center justify-center px-1 shadow-md">
                  {pendingBillsCount}
                </span>
              )}
            </div>
          )}
          <button onClick={logout} className="touch-target p-2 rounded-lg hover:bg-muted transition-colors">
            <LogOut className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-1 px-4 pt-3 bg-card border-b border-border overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`touch-target flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-background text-foreground border border-border border-b-background -mb-px'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex-1 p-4 overflow-y-auto">
        {activeTab === 'dashboard' && (
          <div className="max-w-5xl mx-auto space-y-6">
            <h2 className="font-display font-semibold text-xl text-foreground">Resumen de hoy</h2>

            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                {
                  icon: <DollarSign className="w-5 h-5" />,
                  label: 'Ventas cobradas',
                  value: `$${totalSales.toLocaleString()}`,
                  color: 'text-success',
                },
                {
                  icon: <ShoppingBag className="w-5 h-5" />,
                  label: 'Pedidos totales',
                  value: totalOrders.toString(),
                  color: 'text-info',
                },
                {
                  icon: <Clock className="w-5 h-5" />,
                  label: 'Pedidos cocinados',
                  value: cookedOrders.length.toString(),
                  color: 'text-warning',
                },
                {
                  icon: <Grid3X3 className="w-5 h-5" />,
                  label: 'Mesas activas',
                  value: `${activeTables}/${tables.length}`,
                  color: 'text-primary',
                },
              ].map((kpi, i) => (
                <div key={i} className="p-4 rounded-lg bg-card border border-border">
                  <div className={`mb-2 ${kpi.color}`}>{kpi.icon}</div>
                  <div className="font-display font-bold text-2xl text-foreground">{kpi.value}</div>
                  <div className="text-xs text-muted-foreground">{kpi.label}</div>
                </div>
              ))}
            </div>

            {/* Low stock alerts */}
            {lowStock.length > 0 && (
              <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-5 h-5 text-destructive" />
                  <span className="font-display font-semibold text-foreground">Stock bajo</span>
                </div>
                <div className="space-y-1">
                  {lowStock.map(ing => (
                    <div key={ing.id} className="text-sm text-foreground">
                      <span className="font-medium">{ing.name}</span>: {ing.stockQty} {ing.unit} (mín: {ing.minThreshold})
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(currentUser?.role === 'manager' || currentUser?.role === 'owner') && pendingBills.length > 0 && (
              <div className="p-4 rounded-lg bg-card border border-border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-display font-semibold text-foreground">Cuentas pendientes de cobro</h3>
                  <span className="text-xs text-muted-foreground">{pendingBills.length} mesa(s)</span>
                </div>
                <div className="space-y-2">
                  {pendingBills.map(entry => (
                    <div
                      key={entry.table.id}
                      className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-md border px-3 py-2 ${
                        entry.paymentType === 'tarjeta'
                          ? 'border-orange-500 bg-orange-500/5'
                          : 'border-border bg-background/60'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-foreground">
                            {entry.table.name}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            Mozo: {entry.waiterName || '—'}
                          </span>
                          {entry.paymentType === 'tarjeta' && (
                            <span className="text-[11px] text-orange-500 font-semibold">
                              Requiere encargado
                            </span>
                          )}
                        </div>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {entry.paymentType === 'efectivo' && '💵 Efectivo'}
                          {entry.paymentType === 'tarjeta' && '💳 Tarjeta / Factura'}
                          {entry.paymentType === 'sin_especificar' && '📋 Sin especificar'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 sm:justify-end">
                        <span
                          className={`text-[11px] font-medium px-2 py-1 rounded-full ${entry.timerClass}`}
                        >
                          ⏱ {entry.timerLabel}
                        </span>
                        <button
                          onClick={() => setSelectedBillTableId(entry.table.id)}
                          className="px-2 py-1 rounded-md border border-border text-[11px] text-muted-foreground hover:bg-muted"
                        >
                          Ver ticket
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Top dishes */}
              <div className="p-4 rounded-lg bg-card border border-border">
                <h3 className="font-display font-semibold text-foreground mb-3">Top 5 platos hoy</h3>
                <div className="space-y-2">
                  {topDishes.map((dish, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                        <span className="text-sm text-foreground">{dish.name}</span>
                      </div>
                      <span className="text-sm font-medium text-muted-foreground">{dish.count} uds</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Chart */}
              <div className="p-4 rounded-lg bg-card border border-border">
                <h3 className="font-display font-semibold text-foreground mb-3">Pedidos por hora</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(30,15%,88%)" />
                    <XAxis dataKey="hour" tick={{ fontSize: 12, fill: 'hsl(20,10%,48%)' }} />
                    <YAxis tick={{ fontSize: 12, fill: 'hsl(20,10%,48%)' }} />
                    <Tooltip />
                    <Bar dataKey="pedidos" fill="hsl(18,76%,52%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'menu' && <MenuManagement />}
        {activeTab === 'inventory' && <InventoryManagement />}
      </div>

      {selectedBillTableId && (() => {
        const table = tables.find(t => t.id === selectedBillTableId);
        if (!table) return null;
        const tableOrders = orders.filter(o => o.tableId === table.id && o.status !== 'pagado');
        const total = tableOrders.reduce(
          (sum, o) =>
            sum +
            o.items.reduce((s, i) => s + i.menuItem.price * i.quantity, 0),
          0,
        );
        if (tableOrders.length === 0) return null;
        return (
          <BillModal
            table={table}
            orders={tableOrders}
            total={total}
            onClose={() => setSelectedBillTableId(null)}
            onConfirm={() => setSelectedBillTableId(null)}
          />
        );
      })()}
    </div>
  );
};

export default DashboardPage;
