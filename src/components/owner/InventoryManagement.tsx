import { useApp } from '@/context/AppContext';
import { AlertTriangle } from 'lucide-react';

const InventoryManagement = () => {
  const { ingredients } = useApp();

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-xl text-foreground">Inventario</h2>
        <button className="touch-target px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
          + Agregar ingrediente
        </button>
      </div>

      <div className="space-y-2">
        {ingredients.map(ing => {
          const low = ing.stockQty < ing.minThreshold;
          return (
            <div
              key={ing.id}
              className={`p-4 rounded-lg border flex items-center justify-between ${
                low ? 'bg-destructive/5 border-destructive/30' : 'bg-card border-border'
              }`}
            >
              <div className="flex items-center gap-3 flex-1">
                {low && <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />}
                <div>
                  <div className="font-medium text-foreground">{ing.name}</div>
                  <div className="text-xs text-muted-foreground">Mínimo: {ing.minThreshold} {ing.unit}</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`font-display font-semibold ${low ? 'text-destructive' : 'text-foreground'}`}>
                  {ing.stockQty} {ing.unit}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InventoryManagement;
