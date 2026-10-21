import { useState, useEffect } from 'react';
// Importaciones de Firebase
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Car, Users, FileText, TrendingUp, AlertCircle, DollarSign, Wrench } from 'lucide-react';
import { Button } from '../ui/button';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Progress } from '../ui/progress';
import { differenceInDays, format } from 'date-fns';

interface DashboardHomeProps {
  onNavigate: (module: string) => void;
}

// Interfaces de BD
interface AutoData { id: string; marca: string; modelo: string; placa: string; status?: string; }
interface ChoferData { id: string; Nombre: string; }
interface AlquilerData { id: string; fechaFin: string; }
interface IngresoData { id: string; pago_realizado: string; fechaPago: string; }
interface EgresoData { id: string; egreSo: string; fecha: string; }
interface SOATData { id: string; placa: string; cobertura: string; aseguradora: string; }
interface MantenimientoData { id: string; placa: string; nextDate?: string; tipo?: string; detalles?: any[]; }

export function DashboardHome({ onNavigate }: DashboardHomeProps) {
  const [autos, setAutos] = useState<AutoData[]>([]);
  const [choferes, setChoferes] = useState<ChoferData[]>([]);
  const [alquileres, setAlquileres] = useState<AlquilerData[]>([]);
  const [ingresos, setIngresos] = useState<IngresoData[]>([]);
  const [egresos, setEgresos] = useState<EgresoData[]>([]);
  const [soats, setSoats] = useState<SOATData[]>([]);
  const [mantenimientos, setMantenimientos] = useState<MantenimientoData[]>([]);

  // Conexión masiva a Firestore en tiempo real
  useEffect(() => {
    const unsubAutos = onSnapshot(collection(db, 'autos'), snap => 
      setAutos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AutoData))));
    
    const unsubChoferes = onSnapshot(collection(db, 'choferes'), snap => 
      setChoferes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChoferData))));
    
    const unsubAlquileres = onSnapshot(collection(db, 'alquileres'), snap => 
      setAlquileres(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AlquilerData))));
      
    const unsubPagos = onSnapshot(collection(db, 'pagos'), snap => 
      setIngresos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as IngresoData))));
      
    const unsubEgresos = onSnapshot(collection(db, 'egreso'), snap => 
      setEgresos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as EgresoData))));
      
    const unsubSoat = onSnapshot(collection(db, 'soat'), snap => 
      setSoats(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SOATData))));
      
    const unsubMantenimiento = onSnapshot(collection(db, 'mantenimiento'), snap => 
      setMantenimientos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MantenimientoData))));

    return () => {
      unsubAutos(); unsubChoferes(); unsubAlquileres();
      unsubPagos(); unsubEgresos(); unsubSoat(); unsubMantenimiento();
    };
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // --- CÁLCULO DE ESTADÍSTICAS ---
  // Calculamos los alquileres activos (aquellos cuya fechaFin no ha pasado)
  const activeRentals = alquileres.filter(rental => {
    if (!rental.fechaFin) return true; // Si no tiene fin, sigue activo
    const endDate = new Date(rental.fechaFin.replace(/-/g, '\/'));
    return endDate >= today;
  }).length;

  // Calculamos ingresos y egresos solo del MES ACTUAL
  const monthlyIncome = ingresos.filter(t => {
    if (!t.fechaPago) return false;
    const date = new Date(t.fechaPago.replace(/-/g, '\/'));
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  }).reduce((sum, t) => sum + parseFloat(t.pago_realizado || '0'), 0);

  const monthlyExpenses = egresos.filter(t => {
    if (!t.fecha) return false;
    const date = new Date(t.fecha.replace(/-/g, '\/'));
    return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
  }).reduce((sum, t) => sum + parseFloat(t.egreSo || '0'), 0);

  // Autos disponibles (En tu base de datos antigua a veces no había status, así que improvisamos)
  // Si un auto no tiene status, asumimos que está disponible.
  const availableCars = autos.filter(car => !car.status || car.status === 'available').length;
  const rentedCars = autos.filter(car => car.status === 'rented').length;
  const maintenanceCars = autos.filter(car => car.status === 'maintenance').length;

  const stats = [
    {
      title: 'Total Autos',
      value: autos.length,
      icon: Car,
      description: `${availableCars} disponibles, ${rentedCars} alquilados`,
      color: 'text-blue-500'
    },
    {
      title: 'Choferes',
      value: choferes.length,
      icon: Users,
      description: 'Conductores registrados',
      color: 'text-green-500'
    },
    {
      title: 'Alquileres Activos',
      value: activeRentals,
      icon: FileText,
      description: `De ${alquileres.length} contratos totales`,
      color: 'text-purple-500'
    },
    {
      title: 'Ingreso del Mes',
      value: `S/ ${monthlyIncome.toFixed(2)}`,
      icon: TrendingUp,
      description: `Gastos: S/ ${monthlyExpenses.toFixed(2)}`,
      color: 'text-emerald-500'
    }
  ];

  // --- CÁLCULO DE ALERTAS (Con Filtro de Historial) ---
  const latestSoatsByCar = new Map<string, number>();
  soats.forEach(soat => {
    if (!soat.cobertura) return;
    const fechas = soat.cobertura.split(' - ');
    if (fechas.length < 2) return;
    const [d, m, y] = fechas[1].split('/');
    const endTimestamp = new Date(`${y}-${m}-${d}T00:00:00`).getTime();
    if (!latestSoatsByCar.has(soat.placa) || endTimestamp > (latestSoatsByCar.get(soat.placa) || 0)) {
      latestSoatsByCar.set(soat.placa, endTimestamp);
    }
  });

  const upcomingSOAT = soats.map(soat => {
    const car = autos.find(c => c.id === soat.placa);
    if (!car || !soat.cobertura) return null;
    const fechas = soat.cobertura.split(' - ');
    if (fechas.length < 2) return null;

    const [d, m, y] = fechas[1].split('/');
    const expiry = new Date(`${y}-${m}-${d}T00:00:00`);
    
    // Ignoramos si es un SOAT viejo
    if (expiry.getTime() < (latestSoatsByCar.get(soat.placa) || 0)) return null;

    const daysUntilExpiry = differenceInDays(expiry, today);
    if (daysUntilExpiry <= 30) {
      return { soat: { ...soat, expiryDate: expiry }, car, daysUntilExpiry };
    }
    return null;
  }).filter(Boolean).sort((a: any, b: any) => a.daysUntilExpiry - b.daysUntilExpiry);

  const upcomingMaintenance = mantenimientos.map(m => {
    if (!m.nextDate) return null; 
    const car = autos.find(c => c.id === m.placa);
    if (!car) return null;

    const expiry = new Date(`${m.nextDate}T00:00:00`);
    const daysUntilDue = differenceInDays(expiry, today);
    if (daysUntilDue <= 30) {
      return { maintenance: m, car, daysUntilDue };
    }
    return null;
  }).filter(Boolean).sort((a: any, b: any) => a.daysUntilDue - b.daysUntilDue);


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Bienvenido al Panel de Control</h2>
        <p className="text-muted-foreground">Resumen general de RO&CHA</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <Icon className={`w-5 h-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Alerts Section */}
      {(upcomingSOAT.length > 0 || upcomingMaintenance.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          
          {/* SOAT Alerts Preview */}
          {upcomingSOAT.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-orange-500" />
                  SOAT Próximos a Vencer
                </CardTitle>
                <CardDescription>
                  {upcomingSOAT.length} vehículo(s) con SOAT por renovar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingSOAT.slice(0, 3).map(({ soat, car, daysUntilExpiry }: any) => (
                  <Alert key={soat.id} variant={daysUntilExpiry <= 7 ? 'destructive' : 'default'}>
                    <div className="flex justify-between items-start w-full">
                      <div>
                        <AlertTitle className="text-sm">
                          {car.marca} {car.modelo} - {car.placa}
                        </AlertTitle>
                        <AlertDescription className="text-xs font-medium mt-1">
                          {daysUntilExpiry < 0 ? `${Math.abs(daysUntilExpiry)} día(s) vencido` : `Vence en ${daysUntilExpiry} día(s)`}
                        </AlertDescription>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onNavigate('soat')}
                      >
                        Ver
                      </Button>
                    </div>
                  </Alert>
                ))}
                {upcomingSOAT.length > 3 && (
                  <Button variant="link" onClick={() => onNavigate('alerts')} className="w-full">
                    Ver todas las alertas
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Maintenance Alerts Preview */}
          {upcomingMaintenance.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-blue-500" />
                  Mantenimientos Programados
                </CardTitle>
                <CardDescription>
                  {upcomingMaintenance.length} mantenimiento(s) próximos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingMaintenance.slice(0, 3).map(({ maintenance, car, daysUntilDue }: any) => (
                  <Alert key={maintenance.id}>
                    <div className="flex justify-between items-start w-full">
                      <div>
                        <AlertTitle className="text-sm">
                          {car.marca} {car.modelo} - {car.placa}
                        </AlertTitle>
                        <AlertDescription className="text-xs mt-1">
                          {maintenance.detalles && maintenance.detalles.length > 0 ? maintenance.detalles[0].detalle : 'Taller'} en {daysUntilDue} día(s)
                        </AlertDescription>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onNavigate('maintenance')}
                      >
                        Ver
                      </Button>
                    </div>
                  </Alert>
                ))}
                {upcomingMaintenance.length > 3 && (
                  <Button variant="link" onClick={() => onNavigate('alerts')} className="w-full">
                    Ver todas las alertas
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Fleet Status */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de la Flota</CardTitle>
          <CardDescription>Distribución de vehículos ({autos.length} en total)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm">Disponibles</span>
              <span className="text-sm font-medium">{availableCars}</span>
            </div>
            <Progress value={autos.length > 0 ? (availableCars / autos.length) * 100 : 0} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm">Alquilados</span>
              <span className="text-sm font-medium">{rentedCars}</span>
            </div>
            <Progress value={autos.length > 0 ? (rentedCars / autos.length) * 100 : 0} className="h-2" />
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span className="text-sm">En Mantenimiento</span>
              <span className="text-sm font-medium">{maintenanceCars}</span>
            </div>
            <Progress
              value={autos.length > 0 ? (maintenanceCars / autos.length) * 100 : 0}
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button onClick={() => onNavigate('cars')} variant="outline" className="h-20 flex-col gap-2">
            <Car className="w-6 h-6" />
            <span className="text-xs">Nuevo Auto</span>
          </Button>
          <Button onClick={() => onNavigate('choferes')} variant="outline" className="h-20 flex-col gap-2">
            <Users className="w-6 h-6" />
            <span className="text-xs">Nuevo Chofer</span>
          </Button>
          <Button onClick={() => onNavigate('rentals')} variant="outline" className="h-20 flex-col gap-2">
            <FileText className="w-6 h-6" />
            <span className="text-xs">Nuevo Alquiler</span>
          </Button>
          <Button onClick={() => onNavigate('transactions')} variant="outline" className="h-20 flex-col gap-2">
            <DollarSign className="w-6 h-6" />
            <span className="text-xs">Finanzas</span>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}