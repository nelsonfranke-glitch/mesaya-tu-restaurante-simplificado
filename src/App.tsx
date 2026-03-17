import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider, useApp } from "@/context/AppContext";
import AuthPage from "@/pages/AuthPage";
import WaiterPage from "@/pages/WaiterPage";
import KitchenPage from "@/pages/KitchenPage";
import DashboardPage from "@/pages/DashboardPage";

const queryClient = new QueryClient();

const AppRouter = () => {
  const { currentUser, loading } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-3xl font-display font-bold text-primary mb-2">MesaYa</h1>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!currentUser) return <AuthPage />;

  // User logged in but has no role assigned yet
  if (!currentUser.role) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 text-center">
        <h1 className="text-3xl font-display font-bold text-primary mb-4">MesaYa</h1>
        <div className="bg-card border border-border rounded-lg p-8 max-w-sm space-y-4">
          <p className="text-foreground text-base">
            Tu cuenta está pendiente de activación. El encargado te asignará un rol pronto.
          </p>
          <button
            onClick={() => { supabase.auth.signOut(); }}
            className="w-full py-2.5 rounded-lg border border-border text-muted-foreground hover:bg-muted transition-colors text-sm font-medium"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    );
  }

  switch (currentUser.role) {
    case 'kitchen':
      return <KitchenPage />;
    case 'owner':
    case 'manager':
      return <DashboardPage />;
    case 'waiter':
      return <WaiterPage />;
    default:
      return <AuthPage />;
  }
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
