import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppProvider, useApp } from "@/context/AppContext";
import LoginPage from "@/pages/LoginPage";
import WaiterPage from "@/pages/WaiterPage";
import KitchenPage from "@/pages/KitchenPage";
import DashboardPage from "@/pages/DashboardPage";

const queryClient = new QueryClient();

const AppRouter = () => {
  const { currentUser } = useApp();

  if (!currentUser) return <LoginPage />;

  switch (currentUser.role) {
    case 'kitchen':
      return <KitchenPage />;
    case 'owner':
    case 'manager':
      return <DashboardPage />;
    case 'waiter':
      return <WaiterPage />;
    default:
      return <LoginPage />;
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
