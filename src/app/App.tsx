import { ThemeProvider } from 'next-themes';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AlertsProvider } from './contexts/AlertsContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Toaster } from './components/ui/sonner';

function AppContent() {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? (
    <AlertsProvider>
      <Dashboard />
    </AlertsProvider>
  ) : (
    <Login />
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <div className="size-full">
          <AppContent />
          <Toaster />
        </div>
      </AuthProvider>
    </ThemeProvider>
  );
}