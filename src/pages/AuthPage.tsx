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

const formatErrorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== 'object') return fallback;

  const maybeError = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
  };

  return [maybeError.message, maybeError.details, maybeError.hint, maybeError.code]
    .filter(Boolean)
    .join(' · ') || fallback;
};

const AuthPage = () => {
  const { authError } = useApp();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('waiter');
  const [loading, setLoading] = useState(false);

  const getRestaurantIdForSignup = async () => {
    const { data, error } = await supabase.from('restaurants').select('id').limit(1);

    if (error) {
      throw new Error(`No se pudo obtener el restaurante: ${formatErrorMessage(error, 'Error al buscar restaurante')}`);
    }

    const restaurantId = data?.[0]?.id;
    if (!restaurantId) {
      throw new Error('No hay ningún restaurante configurado para asignar al usuario.');
    }

    return restaurantId;
  };

  const validateUserSetup = async (userId: string) => {
    const [{ data: profile, error: profileError }, { data: roleRows, error: roleError }] = await Promise.all([
      supabase.from('profiles').select('id, restaurant_id').eq('id', userId).maybeSingle(),
      supabase.from('user_roles').select('role').eq('user_id', userId),
    ]);

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('[SIGNUP] Error checking profile:', {
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        code: profileError.code,
      });
    }

    if (roleError) {
      console.error('[SIGNUP] Error checking role:', {
        message: roleError.message,
        details: roleError.details,
        hint: roleError.hint,
        code: roleError.code,
      });
    }

    return {
      hasProfile: Boolean(profile),
      hasRole: Boolean(roleRows?.length),
      restaurantId: profile?.restaurant_id ?? null,
    };
  };

  const createUserSetupFallback = async (userId: string, userName: string, role: UserRole) => {
    console.warn('[SIGNUP] Running direct insert fallback for profile/role', { userId, role });

    const restaurantId = await getRestaurantIdForSignup();

    const { error: profileError } = await supabase.from('profiles').upsert(
      {
        id: userId,
        name: userName,
        restaurant_id: restaurantId,
      },
      { onConflict: 'id' }
    );

    if (profileError) {
      console.error('[SIGNUP] Profile fallback failed:', {
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        code: profileError.code,
      });
      throw new Error(`Error al crear el perfil: ${formatErrorMessage(profileError, 'No se pudo crear el perfil')}`);
    }

    const { error: roleError } = await supabase.from('user_roles').upsert(
      {
        user_id: userId,
        role,
      },
      { onConflict: 'user_id,role' } as never
    );

    if (roleError) {
      console.error('[SIGNUP] Role fallback failed:', {
        message: roleError.message,
        details: roleError.details,
        hint: roleError.hint,
        code: roleError.code,
      });
      throw new Error(`Error al asignar el rol: ${formatErrorMessage(roleError, 'No se pudo asignar el rol')}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const trimmedName = name.trim();
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { name: trimmedName } },
        });

        if (signUpError) {
          throw new Error(`Error al registrar la cuenta: ${formatErrorMessage(signUpError, 'No se pudo registrar la cuenta')}`);
        }

        const userId = signUpData.user?.id;
        if (!userId) {
          throw new Error('No se pudo obtener el ID del usuario después del registro.');
        }

        console.log('[SIGNUP] User created successfully:', {
          userId,
          email,
          role: selectedRole,
          hasSession: Boolean(signUpData.session),
        });

        let setupMode: 'rpc' | 'fallback' = 'rpc';
        const { data: rpcData, error: rpcError } = await supabase.rpc('handle_signup', {
          _name: trimmedName,
          _role: selectedRole,
          _user_id: userId,
        } as never);
        if (rpcError) {
          console.error('[SIGNUP] handle_signup RPC FAILED:', {
            message: rpcError.message,
            details: rpcError.details,
            hint: rpcError.hint,
            code: rpcError.code,
            userId,
            email,
            role: selectedRole,
          });
          setupMode = 'fallback';
          await createUserSetupFallback(userId, trimmedName, selectedRole);
        } else {
          console.log('[SIGNUP] handle_signup RPC SUCCEEDED:', rpcData);
          const setupState = await validateUserSetup(userId);

          if (!setupState.hasProfile || !setupState.hasRole || !setupState.restaurantId) {
            console.warn('[SIGNUP] RPC finished but setup is incomplete, switching to fallback:', setupState);
            setupMode = 'fallback';
            await createUserSetupFallback(userId, trimmedName, selectedRole);
          }
        }

        const finalSetup = await validateUserSetup(userId);
        if (!finalSetup.hasProfile || !finalSetup.hasRole || !finalSetup.restaurantId) {
          throw new Error('No se pudo completar la configuración del usuario luego del registro.');
        }

        console.log('[SIGNUP] Registration completed:', {
          userId,
          setupMode,
          finalSetup,
        });

        await supabase.auth.signOut();
        setIsSignUp(false);
        setPassword('');
        setName('');
        toast.success('¡Cuenta creada! Ahora podés iniciar sesión.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
          throw new Error(`Error al iniciar sesión: ${formatErrorMessage(error, 'No se pudo iniciar sesión')}`);
        }

        console.log('[LOGIN] Login succeeded for:', email);
      }
    } catch (err) {
      console.error('Auth error:', err);
      toast.error(formatErrorMessage(err, 'Error de autenticación'));
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
