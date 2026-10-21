import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import {
  LayoutDashboard,
  Car,
  Users,
  FileText,
  Wrench,
  Shield,
  DollarSign,
  Bell,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Navigation,
  ShieldCheck
} from 'lucide-react';
import { useTheme } from 'next-themes';
import { DashboardHome } from './modules/DashboardHome';
import { CarsModule } from './modules/CarsModule';
import { ChoferesModule } from './modules/ChoferesModule';
import { RentalsModule } from './modules/RentalsModule';
import { MaintenanceModule } from './modules/MaintenanceModule';
import { SOATModule } from './modules/SOATModule';
import { TransactionsModule } from './modules/TransactionsModule';
import { AlertsModule } from './modules/AlertsModule';
import { GPSModule } from './modules/GPSModule';
import { InsuranceModule } from './modules/InsuranceModule';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Badge } from './ui/badge';
import { useAlerts } from '../contexts/AlertsContext';

type Module =
  | 'home'
  | 'cars'
  | 'choferes'
  | 'rentals'
  | 'maintenance'
  | 'soat'
  | 'insurance'
  | 'gps'
  | 'transactions'
  | 'alerts';

const menuItems = [
  { id: 'home' as Module, icon: LayoutDashboard, label: 'Dashboard' },
  { id: 'cars' as Module, icon: Car, label: 'Autos' },
  { id: 'choferes' as Module, icon: Users, label: 'Choferes' },
  { id: 'rentals' as Module, icon: FileText, label: 'Alquileres' },
  { id: 'maintenance' as Module, icon: Wrench, label: 'Mantenimiento' },
  { id: 'soat' as Module, icon: Shield, label: 'SOAT' },
  { id: 'insurance' as Module, icon: ShieldCheck, label: 'Seguros' },
  { id: 'gps' as Module, icon: Navigation, label: 'GPS' },
  { id: 'transactions' as Module, icon: DollarSign, label: 'Finanzas' },
  { id: 'alerts' as Module, icon: Bell, label: 'Alertas' },
];

export function Dashboard() {
  const [currentModule, setCurrentModule] = useState<Module>('home');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const { theme, setTheme } = useTheme();
  const { totalAlertsCount } = useAlerts();

  const handleNavigate = (module: string) => {
    setCurrentModule(module as Module);
  };

  const renderModule = () => {
    switch (currentModule) {
      case 'home':
        return <DashboardHome onNavigate={handleNavigate} />;
      case 'cars':
        return <CarsModule />;
      case 'choferes':
        return <ChoferesModule />;
      case 'rentals':
        return <RentalsModule />;
      case 'maintenance':
        return <MaintenanceModule />;
      case 'soat':
        return <SOATModule />;
      case 'insurance':
        return <InsuranceModule />;
      case 'gps':
        return <GPSModule />;
      case 'transactions':
        return <TransactionsModule />;
      case 'alerts':
        return <AlertsModule onNavigate={handleNavigate} />;
      default:
        return <DashboardHome onNavigate={handleNavigate} />;
    }
  };

  return (
    <div className="h-screen flex overflow-hidden bg-background">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-0'
        } bg-card border-r border-border transition-all duration-300 overflow-hidden flex flex-col`}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Car className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-bold text-lg">RO&CHA</h1>
              <p className="text-xs text-muted-foreground">Administración</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentModule === item.id;
            return (
              <Button
                key={item.id}
                variant={isActive ? 'default' : 'ghost'}
                className={`w-full justify-start ${isActive ? '' : 'hover:bg-accent'}`}
                onClick={() => setCurrentModule(item.id)}
              >
                <Icon className="w-4 h-4 mr-3 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.id === 'alerts' && totalAlertsCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="ml-auto text-xs font-bold px-2 py-0.5 min-w-5 h-5 flex items-center justify-center rounded-full shadow-2xs shrink-0"
                  >
                    {totalAlertsCount}
                  </Badge>
                )}
              </Button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className="bg-primary text-primary-foreground">
                {user?.name.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="font-medium text-sm truncate">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={logout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            Cerrar Sesión
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-card border-b border-border flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <h2 className="font-semibold text-xl">
              {menuItems.find(item => item.id === currentModule)?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative text-muted-foreground hover:text-foreground"
              onClick={() => handleNavigate('alerts')}
              title={totalAlertsCount > 0 ? `${totalAlertsCount} alertas pendientes` : 'Alertas'}
            >
              <Bell className="w-5 h-5" />
              {totalAlertsCount > 0 && (
                <span className="absolute top-1.5 right-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white shadow-xs animate-pulse">
                  {totalAlertsCount}
                </span>
              )}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </Button>
          </div>
        </header>

        {/* Content Area */}
        <main className="flex-1 overflow-auto p-6">
          {renderModule()}
        </main>
      </div>
    </div>
  );
}
