import { useApp } from '@/context/AppContext';
import { MenuCategory, MenuItem } from '@/types';
import { useState } from 'react';
import { ChefHat, Hand, Plus, X } from 'lucide-react';

const categoryLabels: Record<MenuCategory, string> = {
  entradas: 'Entradas',
  principales: 'Principales',
  postres: 'Postres',
  bebidas: 'Bebidas',
};

const MenuManagement = () => {
  const {
    menu,
    ingredients,
    recipes,
    toggleMenuItemKitchen,
    addMenuItem,
    updateMenuItem,
    upsertRecipeForMenuItem,
  } = useApp();
  const [filter, setFilter] = useState<MenuCategory | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<MenuCategory>('entradas');
  const [price, setPrice] = useState<string>('');
  const [description, setDescription] = useState('');
  const [goesToKitchen, setGoesToKitchen] = useState(true);
  const [recipeLines, setRecipeLines] = useState<{ ingredientId: string; quantity: number }[]>([]);

  const filtered = filter === 'all' ? menu : menu.filter(m => m.category === filter);

  const resetForm = () => {
    setEditingItem(null);
    setName('');
    setCategory('entradas');
    setPrice('');
    setDescription('');
    setGoesToKitchen(true);
    setRecipeLines([]);
  };

  const openNew = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (item: MenuItem) => {
    setEditingItem(item);
    setName(item.name);
    setCategory(item.category);
    setPrice(String(item.price));
    setDescription(item.description || '');
    setGoesToKitchen(item.goesToKitchen);
    const lines = recipes
      .filter(r => r.menuItemId === item.id)
      .map(r => ({ ingredientId: r.ingredientId, quantity: r.quantity }));
    setRecipeLines(lines);
    setShowForm(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const parsedPrice = Number(price) || 0;
    const id = editingItem?.id ?? `m-${Date.now()}`;

    if (editingItem) {
      updateMenuItem(id, {
        name: name.trim(),
        category,
        price: parsedPrice,
        description: description.trim() || undefined,
        goesToKitchen,
      });
    } else {
      addMenuItem({
        id,
        name: name.trim(),
        category,
        price: parsedPrice,
        description: description.trim() || undefined,
        goesToKitchen,
      });
    }

    const normalizedLines = recipeLines.filter(
      l => l.ingredientId && l.quantity > 0,
    );
    upsertRecipeForMenuItem(id, normalizedLines);

    setShowForm(false);
    resetForm();
  };

  const addRecipeLine = () => {
    if (ingredients.length === 0) return;
    setRecipeLines(prev => [
      ...prev,
      { ingredientId: ingredients[0].id, quantity: 0 },
    ]);
  };

  const updateRecipeLine = (
    index: number,
    field: 'ingredientId' | 'quantity',
    value: string,
  ) => {
    setRecipeLines(prev =>
      prev.map((line, i) =>
        i === index
          ? {
              ...line,
              [field]:
                field === 'quantity' ? Number(value) || 0 : value,
            }
          : line,
      ),
    );
  };

  const removeRecipeLine = (index: number) => {
    setRecipeLines(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-semibold text-xl text-foreground">Gestión de Menú</h2>
        <button
          onClick={openNew}
          className="touch-target px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
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
              <div className="text-xs text-muted-foreground">
                {categoryLabels[item.category]} {item.description && `— ${item.description}`}
              </div>
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
            <div className="flex flex-col items-end gap-1">
              <div className="font-display font-semibold text-foreground">
                ${item.price.toLocaleString()}
              </div>
              <button
                onClick={() => openEdit(item)}
                className="px-2 py-1 rounded-md border border-border text-[11px] text-muted-foreground hover:bg-muted"
              >
                Editar
              </button>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-2xl bg-card border border-border shadow-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-semibold text-lg text-foreground">
                {editingItem ? 'Editar plato' : 'Nuevo plato'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="p-1.5 rounded-md hover:bg-muted"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Nombre</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground"
                  placeholder="Ej: Milanesa napolitana"
                />
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Categoría</label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value as MenuCategory)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground"
                >
                  {Object.entries(categoryLabels).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Precio</label>
                <input
                  type="number"
                  value={price}
                  onChange={e => setPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs text-muted-foreground mb-1">Descripción</label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm text-foreground resize-none"
                  rows={2}
                  placeholder="Ej: Con papas fritas"
                />
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setGoesToKitchen(v => !v)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 ${
                    goesToKitchen
                      ? 'bg-table-cooking/15 text-table-cooking'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {goesToKitchen ? (
                    <>
                      <ChefHat className="w-3.5 h-3.5" /> Va a cocina
                    </>
                  ) : (
                    <>
                      <Hand className="w-3.5 h-3.5" /> Mozo entrega
                    </>
                  )}
                </button>
                <span className="text-[11px] text-muted-foreground">
                  Define si este plato aparece en la vista de cocina.
                </span>
              </div>
            </div>

            <div className="border-t border-border pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium text-foreground">Receta (consumo de inventario)</h4>
                <button
                  type="button"
                  onClick={addRecipeLine}
                  disabled={ingredients.length === 0}
                  className="px-2 py-1 rounded-md border border-border text-[11px] text-muted-foreground hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  + Agregar ingrediente
                </button>
              </div>
              {ingredients.length === 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Primero cargá ingredientes en la sección de Inventario para poder armar recetas.
                </p>
              )}
              {recipeLines.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {recipeLines.map((line, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <select
                        value={line.ingredientId}
                        onChange={e =>
                          updateRecipeLine(idx, 'ingredientId', e.target.value)
                        }
                        className="flex-1 px-2 py-1.5 rounded-md border border-border bg-background text-xs text-foreground"
                      >
                        {ingredients.map(ing => (
                          <option key={ing.id} value={ing.id}>
                            {ing.name} ({ing.unit})
                          </option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={line.quantity}
                        onChange={e =>
                          updateRecipeLine(idx, 'quantity', e.target.value)
                        }
                        className="w-24 px-2 py-1.5 rounded-md border border-border bg-background text-xs text-foreground"
                        placeholder="Cant."
                      />
                      <button
                        type="button"
                        onClick={() => removeRecipeLine(idx)}
                        className="p-1 rounded-md hover:bg-muted"
                      >
                        <X className="w-3 h-3 text-muted-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-3 py-2 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
              >
                Guardar plato
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MenuManagement;
