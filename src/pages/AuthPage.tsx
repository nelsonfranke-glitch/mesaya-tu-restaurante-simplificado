import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';
import { UserRole } from '@/types';
import { UtensilsCrossed, ChefHat, LayoutDashboard, Users } from 'lucide-react';
import { toast } from 'sonner';

const roles: { role: UserRole; label: string; icon: React.ReactNode }[] = [
  { role: 'owner', label: 'Dueño', icon: <LayoutDashboard className="w-5 h-5" /> },
  { role: 'manager', label: 'Encargado', icon: <Users className="w-5 h-5" /> },
  { role: 'waiter', label: 'Mozo', icon: <UtensilsCrossed className="w-5 h-5" /> },
  { role: 'kitchen', label: 'Cocina', icon: <ChefHat className="w-5 h-5" /> },
];

const AuthPage = () => {
  const { authError } = useApp();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('waiter');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name } },
        });
        if (signUpError) throw signUpError;

        const userId = signUpData.user?.id;
        if (!userId) throw new Error('No se pudo obtener el ID del usuario');

        // Try RPC first, fallback to direct inserts
        const { error: rpcError } = await supabase.rpc('handle_signup', {
          _name: name,
          _role: selectedRole,
        } as any);

        if (rpcError) {
          console.warn('handle_signup RPC failed, trying direct insert:', rpcError.message);

          // Fallback: insert profile directly
          const { error: profileError } = await supabase
            .from('profiles')
            .upsert({ id: userId, name, restaurant_id: null }, { onConflict: 'id' });

          if (profileError) {
            console.error('Profile insert failed:', profileError.message);
          }

          // Fallback: get or create restaurant
          const { data: restaurants } = await supabase
            .from('restaurants')
            .select('id')
            .limit(1);

          let restaurantId = restaurants?.[0]?.id;
          if (!restaurantId) {
            const { data: newRest } = await supabase
              .from('restaurants')
              .insert({ name: 'Mi Restaurante' })
              .select('id')
              .single();
            restaurantId = newRest?.id;
          }

          if (restaurantId) {
            await supabase
              .from('profiles')
              .update({ restaurant_id: restaurantId })
              .eq('id', userId);
          }

          // Fallback: insert role
          const { error: roleError } = await supabase
            .from('user_roles')
            .upsert({ user_id: userId, role: selectedRole }, { onConflict: 'user_id,role' } as any);

          if (roleError) {
            console.error('Role insert failed:', roleError.message);
          }
        }

        // Sign out after signup so user logs in fresh
        await supabase.auth.signOut();
        setIsSignUp(false);
        setPassword('');
        toast.success('¡Cuenta creada! Iniciá sesión con tus datos.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      toast.error(err.message || 'Error de autenticación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 text-center">
        <h1 className="text-5xl font-display font-bold text-primary tracking-tight">MesaYa</h1>
        <p className="text-muted-foreground mt-2 text-lg">Gestión de restaurante simple y rápida</p>
      </div>

      {authError && (
        <div className="w-full max-w-sm mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm text-center">
          {authError}
        </div>
      )}

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4">
        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="font-display font-semibold text-lg text-foreground text-center">
            {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
          </h2>

          {isSignUp && (
            <div>
              <label className="block text-xs text-muted-foreground mb-1">Nombre</label>
              <input
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm text-foreground"
                placeholder="Tu nombre"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm text-foreground"
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-xs text-muted-foreground mb-1">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md border border-border bg-background text-sm text-foreground"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          {isSignUp && (
            <div>
              <label className="block text-xs text-muted-foreground mb-1.5">Rol</label>
              <div className="grid grid-cols-2 gap-2">
                {roles.map(r => (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => setSelectedRole(r.role)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-md border text-sm font-medium transition-colors ${
                      selectedRole === r.role
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/40'
                    }`}
                  >
                    {r.icon}
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="touch-target w-full py-3 rounded-lg bg-primary text-primary-foreground font-display font-semibold text-base hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Cargando...' : isSignUp ? 'Crear cuenta' : 'Ingresar'}
          </button>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          {isSignUp ? '¿Ya tenés cuenta?' : '¿No tenés cuenta?'}{' '}
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary font-medium hover:underline"
          >
            {isSignUp ? 'Iniciar sesión' : 'Crear cuenta'}
          </button>
        </p>
      </form>
    </div>
  );
};

export default AuthPage;