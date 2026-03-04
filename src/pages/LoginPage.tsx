import { useApp } from '@/context/AppContext';
import { UserRole } from '@/types';
import { UtensilsCrossed, ChefHat, LayoutDashboard, Users } from 'lucide-react';

const roles: { role: UserRole; label: string; desc: string; icon: React.ReactNode }[] = [
  { role: 'owner', label: 'Dueño', desc: 'Dashboard completo, configuración', icon: <LayoutDashboard className="w-8 h-8" /> },
  { role: 'manager', label: 'Encargado', desc: 'Gestión de mesas y pedidos', icon: <Users className="w-8 h-8" /> },
  { role: 'waiter', label: 'Mozo', desc: 'Mesas y toma de pedidos', icon: <UtensilsCrossed className="w-8 h-8" /> },
  { role: 'kitchen', label: 'Cocina', desc: 'Pantalla de pedidos', icon: <ChefHat className="w-8 h-8" /> },
];

const LoginPage = () => {
  const { login } = useApp();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      <div className="mb-10 text-center">
        <h1 className="text-5xl font-display font-bold text-primary tracking-tight">MesaYa</h1>
        <p className="text-muted-foreground mt-2 text-lg">Gestión de restaurante simple y rápida</p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-lg">
        {roles.map(({ role, label, desc, icon }) => (
          <button
            key={role}
            onClick={() => login(role)}
            className="touch-target flex flex-col items-center gap-3 p-6 rounded-lg bg-card border border-border hover:border-primary hover:shadow-lg transition-all duration-200 group"
          >
            <div className="text-primary group-hover:scale-110 transition-transform">{icon}</div>
            <span className="font-display font-semibold text-lg text-foreground">{label}</span>
            <span className="text-sm text-muted-foreground text-center">{desc}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground mt-8">Demo — seleccioná un rol para ingresar</p>
    </div>
  );
};

export default LoginPage;
