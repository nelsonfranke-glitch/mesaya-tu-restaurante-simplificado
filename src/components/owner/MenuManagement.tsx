import { useApp } from '@/context/AppContext';
import { MenuCategory } from '@/types';
import { useState } from 'react';
import { ChefHat, Hand } from 'lucide-react';

const categoryLabels: Record<MenuCategory, string> = {
  entradas: 'Entradas',
  principales: 'Principales',
  postres: 'Postres',
  bebidas: 'Bebidas',
};

const MenuManagement = () => {
  const { menu, toggleMenuItemKitchen } = useApp();
  const [filter, setFilter] = useState<MenuCategory | 'all'>('all');

  const filtered = filter === 'all' ? menu : menu.filter(m => m.category === filter);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-xl text-foreground">Gestión de Menú</h2>
        <button className="touch-target px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity">
          + Agregar plato
        </button>
      </div>

      <div className="flex gap-1 mb-4 overflow-x-auto">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === 'all' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
        >
          Todos
        </button>
        {Object.entries(categoryLabels).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setFilter(key as MenuCategory)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap transition-colors ${filter === key ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.map(item => (
          <div key={item.id} className="p-4 rounded-lg bg-card border border-border flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="font-medium text-foreground">{item.name}</div>
              <div className="text-xs text-muted-foreground">{categoryLabels[item.category]} {item.description && `— ${item.description}`}</div>
            </div>
            <button
              onClick={() => toggleMenuItemKitchen(item.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors whitespace-nowrap ${
                item.goesToKitchen
                  ? 'bg-table-cooking/15 text-table-cooking'
                  : 'bg-muted text-muted-foreground'
              }`}
            >
              {item.goesToKitchen ? (
                <><ChefHat className="w-3.5 h-3.5" /> Va a cocina</>
              ) : (
                <><Hand className="w-3.5 h-3.5" /> Mozo entrega</>
              )}
            </button>
            <div className="font-display font-semibold text-foreground">${item.price.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MenuManagement;
