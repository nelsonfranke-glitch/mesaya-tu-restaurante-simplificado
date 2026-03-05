import { useApp } from '@/context/AppContext';
import { RestaurantTable, TableStatus } from '@/types';
import { Users } from 'lucide-react';

const statusConfig: Record<TableStatus, { label: string; className: string }> = {
  free: { label: 'Libre', className: 'bg-table-free/20 border-table-free text-foreground' },
  occupied: { label: 'Ocupada', className: 'bg-table-occupied/20 border-table-occupied text-foreground' },
  cooking: { label: 'En preparación', className: 'bg-table-cooking/20 border-table-cooking text-foreground' },
  ready: { label: 'Plato listo', className: 'bg-table-ready/20 border-table-ready text-foreground animate-pulse-soft' },
  bill_requested: { label: 'Cuenta solicitada', className: 'bg-primary/20 border-primary text-foreground' },
};

interface Props {
  onSelectTable: (table: RestaurantTable) => void;
}

const TableMap = ({ onSelectTable }: Props) => {
  const { tables, getReadyItemsCount } = useApp();

  return (
    <div className="flex-1 p-4">
      <h2 className="font-display font-semibold text-lg mb-4 text-foreground">Mesas</h2>
      <div className="flex flex-wrap gap-3 mb-4">
        {Object.entries(statusConfig).map(([key, { label, className }]) => (
          <div key={key} className="flex items-center gap-1.5">
            <div className={`w-3 h-3 rounded-full border-2 ${className}`} />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {tables.map(table => {
          const config = statusConfig[table.status];
          const readyCount = getReadyItemsCount(table.id);
          return (
            <button
              key={table.id}
              onClick={() => onSelectTable(table)}
              className={`touch-target relative p-4 rounded-lg border-2 transition-all duration-200 hover:shadow-md hover:scale-[1.02] active:scale-[0.98] ${config.className}`}
            >
              {readyCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[22px] h-[22px] rounded-full bg-orange-500 text-white text-[11px] font-bold flex items-center justify-center px-1 shadow-md">
                  {readyCount}
                </span>
              )}
              <div className="font-display font-semibold text-base">{table.name}</div>
              <div className="flex items-center gap-1 mt-1">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">{table.capacity}</span>
              </div>
              <div className="text-xs mt-2 font-medium">{config.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TableMap;
