import { useApp } from '@/context/AppContext';
import { AlertTriangle, Edit3, Plus, Minus } from 'lucide-react';
import { useState } from 'react';

const InventoryManagement = () => {
  const { ingredients, addIngredient, updateIngredient, adjustIngredientStock } = useApp();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [stockQty, setStockQty] = useState<string>('');
  const [minThreshold, setMinThreshold] = useState<string>('');

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setUnit('');
    setStockQty('');
    setMinThreshold('');
  };

  const openNew = () => {
    resetForm();
    setIsAdding(true);
  };

  const openEdit = (id: string) => {
    const ing = ingredients.find(i => i.id === id);
    if (!ing) return;
    setIsAdding(false);
    setEditingId(id);
    setName(ing.name);
    setUnit(ing.unit);
    setStockQty(String(ing.stockQty));
    setMinThreshold(String(ing.minThreshold));
  };

  const handleSave = () => {
    if (!name.trim() || !unit.trim()) return;
    const parsedStock = Number(stockQty) || 0;
    const parsedMin = Number(minThreshold) || 0;

    if (editingId) {
      updateIngredient(editingId, {
        name: name.trim(),
        unit: unit.trim(),
        stockQty: parsedStock,
        minThreshold: parsedMin,
      });
    } else {
      addIngredient({
        name: name.trim(),
        unit: unit.trim(),
        stockQty: parsedStock,
        minThreshold: parsedMin,
      });
    }

    setIsAdding(false);
    resetForm();
  };

  const cancelEdit = () => {
    resetForm();
  };

  const cancelAdd = () => {
    setIsAdding(false);
    resetForm();
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-xl text-foreground">Inventario</h2>
        <button
          onClick={openNew}
          className="touch-target px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          + Agregar ingrediente
        </button>
      </div>

      {isAdding && (
        <div className="mb-6 p-4 rounded-lg border border-border bg-card space-y-3">
          <h3 className="font-display font-semibold text-base text-foreground">
            Nuevo ingrediente
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Nombre</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground"
                placeholder="Ej: Milanesa de ternera"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Unidad</label>
              <input
                value={unit}
                onChange={e => setUnit(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground"
                placeholder="Ej: kg, unidades, litros"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Stock actual</label>
              <input
                type="number"
                value={stockQty}
                onChange={e => setStockQty(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground"
              />
            </div>
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Stock mínimo</label>
              <input
                type="number"
                value={minThreshold}
                onChange={e => setMinThreshold(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={cancelAdd}
              className="px-3 py-2 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
            >
              Guardar
            </button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {ingredients.map(ing => {
          const low = ing.stockQty < ing.minThreshold;
          const isInlineEditing = editingId === ing.id;
          return (
            <div
              key={ing.id}
              className={`p-4 rounded-lg border ${
                low ? 'bg-destructive/5 border-destructive/30' : 'bg-card border-border'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {low && <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />}
                  <div className="min-w-0">
                    <div className="font-medium text-foreground truncate">{ing.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Mínimo: {ing.minThreshold} {ing.unit}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className={`font-display font-semibold ${low ? 'text-destructive' : 'text-foreground'}`}>
                    {ing.stockQty} {ing.unit}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => adjustIngredientStock(ing.id, -1)}
                      className="w-7 h-7 rounded-md border border-border bg-background flex items-center justify-center text-xs text-muted-foreground hover:bg-muted"
                      title="Ajustar -1"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => adjustIngredientStock(ing.id, 1)}
                      className="w-7 h-7 rounded-md border border-border bg-background flex items-center justify-center text-xs text-muted-foreground hover:bg-muted"
                      title="Ajustar +1"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => (isInlineEditing ? cancelEdit() : openEdit(ing.id))}
                      className="ml-1 px-2 py-1 rounded-md border border-border bg-background text-[11px] text-muted-foreground flex items-center gap-1 hover:bg-muted"
                    >
                      <Edit3 className="w-3 h-3" />
                      {isInlineEditing ? 'Cerrar' : 'Editar'}
                    </button>
                  </div>
                </div>
              </div>

              {isInlineEditing && (
                <div className="mt-4 pt-4 border-t border-border space-y-3">
                  <h3 className="font-display font-semibold text-sm text-foreground">
                    Editar ingrediente
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Nombre</label>
                      <input
                        value={name}
                        onChange={e => setName(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Unidad</label>
                      <input
                        value={unit}
                        onChange={e => setUnit(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Stock actual</label>
                      <input
                        type="number"
                        value={stockQty}
                        onChange={e => setStockQty(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-muted-foreground mb-1">Stock mínimo</label>
                      <input
                        type="number"
                        value={minThreshold}
                        onChange={e => setMinThreshold(e.target.value)}
                        className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      onClick={cancelEdit}
                      className="px-3 py-2 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InventoryManagement;
