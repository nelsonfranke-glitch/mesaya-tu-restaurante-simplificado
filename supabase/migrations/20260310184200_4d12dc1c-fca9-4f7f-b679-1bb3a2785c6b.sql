
-- Enums
CREATE TYPE public.app_role AS ENUM ('owner', 'manager', 'waiter', 'kitchen');
CREATE TYPE public.table_status AS ENUM ('free', 'occupied_waiting', 'cooking', 'ready', 'occupied_all_served', 'bill_requested');
CREATE TYPE public.menu_category AS ENUM ('entradas', 'principales', 'postres', 'bebidas');
CREATE TYPE public.order_status AS ENUM ('nuevo', 'en_preparacion', 'listo', 'entregado', 'pagado');
CREATE TYPE public.item_delivery_status AS ENUM ('nuevo', 'en_preparacion', 'para_entregar', 'entregado');
CREATE TYPE public.payment_type_enum AS ENUM ('efectivo', 'tarjeta', 'sin_especificar');

-- Tables
CREATE TABLE public.restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  restaurant_id UUID REFERENCES public.restaurants(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE(user_id, role)
);

CREATE TABLE public.restaurant_tables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  capacity INT NOT NULL DEFAULT 4,
  status public.table_status NOT NULL DEFAULT 'free',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.menu_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category public.menu_category NOT NULL DEFAULT 'principales',
  price NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  photo TEXT,
  goes_to_kitchen BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  table_id UUID NOT NULL REFERENCES public.restaurant_tables(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL DEFAULT '',
  waiter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  waiter_name TEXT NOT NULL DEFAULT '',
  status public.order_status NOT NULL DEFAULT 'nuevo',
  payment_type public.payment_type_enum DEFAULT 'sin_especificar',
  bill_requested_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  menu_item_name TEXT NOT NULL,
  menu_item_price NUMERIC NOT NULL,
  menu_item_category public.menu_category NOT NULL,
  menu_item_goes_to_kitchen BOOLEAN NOT NULL DEFAULT true,
  quantity INT NOT NULL DEFAULT 1,
  notes TEXT,
  delivery_status public.item_delivery_status NOT NULL DEFAULT 'nuevo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.ingredients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID NOT NULL REFERENCES public.restaurants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  unit TEXT NOT NULL,
  stock_qty NUMERIC NOT NULL DEFAULT 0,
  min_threshold NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  ingredient_id UUID NOT NULL REFERENCES public.ingredients(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 0,
  UNIQUE(menu_item_id, ingredient_id)
);

-- Enable RLS
ALTER TABLE public.restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Security definer functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;

CREATE OR REPLACE FUNCTION public.get_user_restaurant_id(_user_id UUID)
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT restaurant_id FROM public.profiles WHERE id = _user_id $$;

-- Signup helper
CREATE OR REPLACE FUNCTION public.handle_signup(_name TEXT, _role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _restaurant_id UUID;
BEGIN
  SELECT id INTO _restaurant_id FROM public.restaurants LIMIT 1;
  IF _restaurant_id IS NULL THEN
    INSERT INTO public.restaurants (name) VALUES ('Mi Restaurante') RETURNING id INTO _restaurant_id;
  END IF;
  INSERT INTO public.profiles (id, name, restaurant_id) VALUES (auth.uid(), _name, _restaurant_id)
    ON CONFLICT (id) DO UPDATE SET name = _name, restaurant_id = _restaurant_id;
  INSERT INTO public.user_roles (user_id, role) VALUES (auth.uid(), _role)
    ON CONFLICT (user_id, role) DO NOTHING;
END;
$$;
GRANT EXECUTE ON FUNCTION public.handle_signup TO authenticated;

-- Table status sync trigger
CREATE OR REPLACE FUNCTION public.compute_and_set_table_status(_table_id UUID)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _current public.table_status;
  _new public.table_status;
  _cnt INT;
  _has_en_prep BOOLEAN;
  _has_ready BOOLEAN;
  _all_served BOOLEAN;
  _has_items BOOLEAN;
BEGIN
  SELECT status INTO _current FROM public.restaurant_tables WHERE id = _table_id;
  IF _current = 'bill_requested' THEN RETURN; END IF;

  SELECT
    COUNT(DISTINCT o.id)::int,
    COALESCE(bool_or(oi.delivery_status = 'en_preparacion'), false),
    COALESCE(bool_or(oi.delivery_status = 'para_entregar'), false),
    CASE WHEN COUNT(oi.id) = 0 THEN false ELSE COALESCE(bool_and(oi.delivery_status = 'entregado'), false) END,
    COUNT(oi.id) > 0
  INTO _cnt, _has_en_prep, _has_ready, _all_served, _has_items
  FROM public.orders o
  LEFT JOIN public.order_items oi ON oi.order_id = o.id
  WHERE o.table_id = _table_id AND o.status != 'pagado';

  IF _cnt = 0 THEN _new := 'free';
  ELSIF NOT _has_items THEN _new := 'occupied_waiting';
  ELSIF _has_en_prep THEN _new := 'cooking';
  ELSIF _has_ready THEN _new := 'ready';
  ELSIF _all_served THEN _new := 'occupied_all_served';
  ELSE _new := 'occupied_waiting';
  END IF;

  IF _new IS DISTINCT FROM _current THEN
    UPDATE public.restaurant_tables SET status = _new WHERE id = _table_id;
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_sync_status_from_items()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE _tid UUID;
BEGIN
  SELECT table_id INTO _tid FROM public.orders WHERE id = COALESCE(NEW.order_id, OLD.order_id);
  IF _tid IS NOT NULL THEN PERFORM public.compute_and_set_table_status(_tid); END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION public.trigger_sync_status_from_orders()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  PERFORM public.compute_and_set_table_status(COALESCE(NEW.table_id, OLD.table_id));
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER sync_table_status_items AFTER INSERT OR UPDATE OR DELETE ON public.order_items
  FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_status_from_items();

CREATE TRIGGER sync_table_status_orders AFTER UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.trigger_sync_status_from_orders();

-- RLS Policies
CREATE POLICY "select_restaurant" ON public.restaurants FOR SELECT TO authenticated
  USING (id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "select_profiles" ON public.profiles FOR SELECT TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id(auth.uid()));
CREATE POLICY "insert_profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE POLICY "update_profile" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

CREATE POLICY "select_roles" ON public.user_roles FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = user_roles.user_id AND p.restaurant_id = public.get_user_restaurant_id(auth.uid())));
CREATE POLICY "insert_own_role" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "crud_tables" ON public.restaurant_tables FOR ALL TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id(auth.uid()))
  WITH CHECK (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "crud_menu" ON public.menu_items FOR ALL TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id(auth.uid()))
  WITH CHECK (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "crud_orders" ON public.orders FOR ALL TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id(auth.uid()))
  WITH CHECK (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "crud_order_items" ON public.order_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.restaurant_id = public.get_user_restaurant_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND o.restaurant_id = public.get_user_restaurant_id(auth.uid())));

CREATE POLICY "crud_ingredients" ON public.ingredients FOR ALL TO authenticated
  USING (restaurant_id = public.get_user_restaurant_id(auth.uid()))
  WITH CHECK (restaurant_id = public.get_user_restaurant_id(auth.uid()));

CREATE POLICY "crud_recipes" ON public.recipes FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.menu_items mi WHERE mi.id = recipes.menu_item_id AND mi.restaurant_id = public.get_user_restaurant_id(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.menu_items mi WHERE mi.id = recipes.menu_item_id AND mi.restaurant_id = public.get_user_restaurant_id(auth.uid())));

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.restaurant_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.order_items;

-- Seed data
INSERT INTO public.restaurants (id, name) VALUES ('00000000-0000-0000-0000-000000000001', 'Mi Restaurante');

INSERT INTO public.restaurant_tables (restaurant_id, name, capacity) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Mesa 1', 2),
  ('00000000-0000-0000-0000-000000000001', 'Mesa 2', 4),
  ('00000000-0000-0000-0000-000000000001', 'Mesa 3', 4),
  ('00000000-0000-0000-0000-000000000001', 'Mesa 4', 6),
  ('00000000-0000-0000-0000-000000000001', 'Mesa 5', 2),
  ('00000000-0000-0000-0000-000000000001', 'Mesa 6', 8),
  ('00000000-0000-0000-0000-000000000001', 'Mesa 7', 4),
  ('00000000-0000-0000-0000-000000000001', 'Mesa 8', 2),
  ('00000000-0000-0000-0000-000000000001', 'Barra 1', 1),
  ('00000000-0000-0000-0000-000000000001', 'Barra 2', 1),
  ('00000000-0000-0000-0000-000000000001', 'Terraza 1', 4),
  ('00000000-0000-0000-0000-000000000001', 'Terraza 2', 6);

INSERT INTO public.menu_items (restaurant_id, name, category, price, description, goes_to_kitchen) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Empanadas (x3)', 'entradas', 1800, 'Carne cortada a cuchillo', true),
  ('00000000-0000-0000-0000-000000000001', 'Provoleta', 'entradas', 2200, 'Con orégano y aceite de oliva', true),
  ('00000000-0000-0000-0000-000000000001', 'Bruschetta', 'entradas', 1500, 'Tomate, albahaca y ajo', true),
  ('00000000-0000-0000-0000-000000000001', 'Tabla de fiambres', 'entradas', 3500, 'Jamón, queso, aceitunas', true),
  ('00000000-0000-0000-0000-000000000001', 'Milanesa napolitana', 'principales', 4200, 'Con papas fritas', true),
  ('00000000-0000-0000-0000-000000000001', 'Bife de chorizo', 'principales', 5800, '400g con guarnición', true),
  ('00000000-0000-0000-0000-000000000001', 'Pastas del día', 'principales', 3800, 'Consultar variedad', true),
  ('00000000-0000-0000-0000-000000000001', 'Pollo a la parrilla', 'principales', 3500, 'Con ensalada mixta', true),
  ('00000000-0000-0000-0000-000000000001', 'Suprema maryland', 'principales', 4000, 'Con banana y choclo', true),
  ('00000000-0000-0000-0000-000000000001', 'Flan casero', 'postres', 1200, 'Con dulce de leche y crema', true),
  ('00000000-0000-0000-0000-000000000001', 'Tiramisú', 'postres', 1800, 'Receta italiana', true),
  ('00000000-0000-0000-0000-000000000001', 'Panqueques', 'postres', 1500, 'Con dulce de leche', true),
  ('00000000-0000-0000-0000-000000000001', 'Coca-Cola', 'bebidas', 800, NULL, false),
  ('00000000-0000-0000-0000-000000000001', 'Agua mineral', 'bebidas', 600, NULL, false),
  ('00000000-0000-0000-0000-000000000001', 'Cerveza artesanal', 'bebidas', 1200, NULL, false),
  ('00000000-0000-0000-0000-000000000001', 'Vino Malbec (copa)', 'bebidas', 1500, NULL, false),
  ('00000000-0000-0000-0000-000000000001', 'Limonada', 'bebidas', 900, NULL, false);

INSERT INTO public.ingredients (restaurant_id, name, unit, stock_qty, min_threshold) VALUES
  ('00000000-0000-0000-0000-000000000001', 'Milanesa de ternera', 'unidades', 15, 5),
  ('00000000-0000-0000-0000-000000000001', 'Salsa de tomate', 'litros', 3, 2),
  ('00000000-0000-0000-0000-000000000001', 'Queso mozzarella', 'kg', 1.5, 2),
  ('00000000-0000-0000-0000-000000000001', 'Papas', 'kg', 20, 5),
  ('00000000-0000-0000-0000-000000000001', 'Bife de chorizo', 'unidades', 8, 4),
  ('00000000-0000-0000-0000-000000000001', 'Pollo', 'kg', 6, 3),
  ('00000000-0000-0000-0000-000000000001', 'Cerveza artesanal', 'litros', 25, 10),
  ('00000000-0000-0000-0000-000000000001', 'Vino Malbec', 'litros', 12, 5),
  ('00000000-0000-0000-0000-000000000001', 'Dulce de leche', 'kg', 0.8, 1),
  ('00000000-0000-0000-0000-000000000001', 'Huevos', 'unidades', 30, 12);
