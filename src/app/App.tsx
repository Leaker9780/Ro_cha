import { ThemeProvider } from 'next-themes';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { DataProvider } from './contexts/DataContext';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Toaster } from './components/ui/sonner';

function AppContent() {
  const { isAuthenticated } = useAuth();

  return isAuthenticated ? <Dashboard /> : <Login />;
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <AuthProvider>
        <DataProvider>
          <div className="size-full">
            <AppContent />
            <Toaster />
          </div>
        </DataProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}