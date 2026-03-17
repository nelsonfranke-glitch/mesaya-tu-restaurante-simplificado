import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';

const formatErrorMessage = (error: unknown, fallback: string) => {
  if (!error || typeof error !== 'object') return fallback;
  const maybeError = error as { message?: string; details?: string; hint?: string; code?: string };
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
  const [loading, setLoading] = useState(false);

  const getRestaurantIdForSignup = async () => {
    const { data, error } = await supabase.from('restaurants').select('id').limit(1);
    if (error) throw new Error(`No se pudo obtener el restaurante: ${formatErrorMessage(error, 'Error al buscar restaurante')}`);
    const restaurantId = data?.[0]?.id;
    if (!restaurantId) throw new Error('No hay ningún restaurante configurado para asignar al usuario.');
    return restaurantId;
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

        if (signUpError) throw new Error(`Error al registrar: ${formatErrorMessage(signUpError, 'No se pudo registrar')}`);

        const userId = signUpData.user?.id;
        if (!userId) throw new Error('No se pudo obtener el ID del usuario.');

        // Create profile only (no role) — role will be assigned by manager
        try {
          const restaurantId = await getRestaurantIdForSignup();
          await supabase.from('profiles').upsert(
            { id: userId, name: trimmedName, restaurant_id: restaurantId },
            { onConflict: 'id' }
          );
        } catch (profileErr) {
          console.error('[SIGNUP] Profile creation failed:', profileErr);
        }

        await supabase.auth.signOut();
        setIsSignUp(false);
        setPassword('');
        setName('');
        toast.success('¡Cuenta creada! Ahora podés iniciar sesión.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw new Error(`Error al iniciar sesión: ${formatErrorMessage(error, 'No se pudo iniciar sesión')}`);
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
