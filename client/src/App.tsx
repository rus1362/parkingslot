import { Switch, Route, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/sidebar";

// Pages
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Reservations from "@/pages/reservations";
import Users from "@/pages/admin/users";
import Analytics from "@/pages/admin/analytics";
import Settings from "@/pages/admin/settings";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ children, adminOnly = false }: { children: React.ReactNode; adminOnly?: boolean }) {
  const { user, isAdmin } = useAuth();
  
  if (!user) {
    return <Redirect to="/login" />;
  }
  
  if (adminOnly && !isAdmin()) {
    return <Redirect to="/dashboard" />;
  }
  
  return <>{children}</>;
}

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      {children}
    </div>
  );
}

function Router() {
  const { user } = useAuth();

  return (
    <Switch>
      <Route path="/login">
        <Login />
      </Route>
      
      <Route path="/">
        {user ? <Redirect to="/dashboard" /> : <Redirect to="/login" />}
      </Route>
      
      <Route path="/dashboard">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Dashboard />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/reservations">
        <ProtectedRoute>
          <AuthenticatedLayout>
            <Reservations />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/users">
        <ProtectedRoute adminOnly>
          <AuthenticatedLayout>
            <Users />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/analytics">
        <ProtectedRoute adminOnly>
          <AuthenticatedLayout>
            <Analytics />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      
      <Route path="/admin/settings">
        <ProtectedRoute adminOnly>
          <AuthenticatedLayout>
            <Settings />
          </AuthenticatedLayout>
        </ProtectedRoute>
      </Route>
      
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
