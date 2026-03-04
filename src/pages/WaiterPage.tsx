import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import TableMap from '@/components/waiter/TableMap';
import OrderPanel from '@/components/waiter/OrderPanel';
import { RestaurantTable } from '@/types';
import { Bell, LogOut } from 'lucide-react';

const WaiterPage = () => {
  const { currentUser, logout, notifications, clearNotification } = useApp();
  const [selectedTable, setSelectedTable] = useState<RestaurantTable | null>(null);
  const [showNotif, setShowNotif] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 flex items-center justify-between sticky top-0 z-30">
        <div>
          <h1 className="font-display font-bold text-xl text-primary">MesaYa</h1>
          <p className="text-xs text-muted-foreground">{currentUser?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotif(!showNotif)}
            className="touch-target relative p-2 rounded-lg hover:bg-muted transition-colors"
          >
            <Bell className="w-5 h-5 text-foreground" />
            {notifications.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center animate-pulse-soft">
                {notifications.length}
              </span>
            )}
          </button>
          <button onClick={logout} className="touch-target p-2 rounded-lg hover:bg-muted transition-colors">
            <LogOut className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
      </header>

      {/* Notifications dropdown */}
      {showNotif && notifications.length > 0 && (
        <div className="absolute top-16 right-4 z-40 bg-card border border-border rounded-lg shadow-xl p-3 w-72">
          {notifications.map((n, i) => (
            <div key={i} className="flex items-center justify-between p-2 border-b border-border last:border-0">
              <span className="text-sm text-foreground">{n}</span>
              <button onClick={() => clearNotification(i)} className="text-xs text-muted-foreground hover:text-destructive">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {selectedTable ? (
          <OrderPanel table={selectedTable} onBack={() => setSelectedTable(null)} />
        ) : (
          <TableMap onSelectTable={setSelectedTable} />
        )}
      </div>
    </div>
  );
};

export default WaiterPage;
