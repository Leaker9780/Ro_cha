import { useState, useEffect } from 'react';
// Importaciones de Firebase
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import {
  Car,
  Users,
  FileText,
  TrendingUp,
  AlertCircle,
  DollarSign,
  Wrench,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Clock,
  Calendar,
  ChevronRight,
  Bell,
  FileSpreadsheet,
  Loader2
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { cn, safeFormatDate } from '../ui/utils';
import { useAlerts } from '../../contexts/AlertsContext';
import { toast } from 'sonner';

interface DashboardHomeProps {
  onNavigate: (module: string) => void;
}

// Interfaces de BD
interface AutoData { id: string; marca: string; modelo: string; placa: string; status?: string; }
interface ChoferData { id: string; Nombre: string; }
interface AlquilerData { id: string; fechaFin: string; estado?: string; }
interface IngresoData { id: string; pago_realizado: string; fechaPago: string; }
interface EgresoData { id: string; egreSo: string; fecha: string; }

export function DashboardHome({ onNavigate }: DashboardHomeProps) {
  const [autos, setAutos] = useState<AutoData[]>([]);
  const [choferes, setChoferes] = useState<ChoferData[]>([]);
  const [alquileres, setAlquileres] = useState<AlquilerData[]>([]);
  const [ingresos, setIngresos] = useState<IngresoData[]>([]);
  const [egresos, setEgresos] = useState<EgresoData[]>([]);

  const { upcomingSOAT, upcomingInsurance, upcomingMaintenance, totalAlertsCount } = useAlerts();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      toast.info('Generando reporte general de Excel...', { duration: 3000 });
      const { exportGeneralExcelReport } = await import('../../utils/exportReport');
      await exportGeneralExcelReport();
      toast.success('Reporte general descargado con éxito');
    } catch (error) {
      console.error('Error al generar el reporte Excel:', error);
      toast.error('Ocurrió un error al generar el reporte general');
    } finally {
      setIsExporting(false);
    }
  };

  // Conexión a Firestore en tiempo real para métricas de gestión
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

    return () => {
      unsubAutos(); unsubChoferes(); unsubAlquileres();
      unsubPagos(); unsubEgresos();
    };
  }, []);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // --- CÁLCULO DE ESTADÍSTICAS ---
  // Calculamos los alquileres activos (aquellos cuya fechaFin no ha pasado y no estén finalizados)
  const activeRentals = alquileres.filter(rental => {
    if (rental.estado === 'finalizado') return false;
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold mb-1">Bienvenido al Panel de Control</h2>
          <p className="text-muted-foreground">Resumen general de RO&CHA</p>
        </div>
        <Button
          onClick={handleExportExcel}
          disabled={isExporting}
          className="gap-2 shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-xs transition-all self-start sm:self-auto cursor-pointer"
        >
          {isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Generando Reporte...</span>
            </>
          ) : (
            <>
              <FileSpreadsheet className="w-4 h-4" />
              <span>Descargar Reporte Excel</span>
            </>
          )}
        </Button>
      </div>

      {/* Alert Callout Banner */}
      {totalAlertsCount > 0 && (
        <div
          onClick={() => onNavigate('alerts')}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl border border-amber-300/80 bg-amber-500/10 hover:bg-amber-500/15 dark:border-amber-800/80 dark:bg-amber-950/25 dark:hover:bg-amber-950/35 cursor-pointer transition-all shadow-xs group"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 shrink-0">
              <Bell className="w-5 h-5 animate-bounce" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-sm text-foreground">
                  Atención: {totalAlertsCount} {totalAlertsCount === 1 ? 'alerta activa requiere' : 'alertas activas requieren'} tu revisión
                </p>
                <Badge variant="destructive" className="font-bold text-xs px-2 py-0.5 shrink-0">
                  {totalAlertsCount} {totalAlertsCount === 1 ? 'pendiente' : 'pendientes'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                {[
                  upcomingSOAT.length > 0 && `${upcomingSOAT.length} SOAT`,
                  upcomingInsurance.length > 0 && `${upcomingInsurance.length} ${upcomingInsurance.length === 1 ? 'seguro' : 'seguros'}`,
                  upcomingMaintenance.length > 0 && `${upcomingMaintenance.length} ${upcomingMaintenance.length === 1 ? 'mantenimiento' : 'mantenimientos'}`
                ]
                  .filter(Boolean)
                  .join(' • ')}{' '}
                por vencer o regularizar
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-300 group-hover:translate-x-0.5 transition-transform shrink-0">
            <span>Ver Centro de Alertas</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      )}

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
      {totalAlertsCount > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <h3 className="text-lg font-bold text-foreground">Alertas Activas</h3>
              <Badge variant="destructive" className="font-bold text-xs px-2 py-0.5">
                {totalAlertsCount} {totalAlertsCount === 1 ? 'alerta' : 'alertas'}
              </Badge>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onNavigate('alerts')}
              className="text-xs gap-1.5 h-8 font-medium"
            >
              <span>Ver todas las alertas ({totalAlertsCount})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          <div
            className={cn(
              "grid grid-cols-1 gap-4",
              [upcomingSOAT.length > 0, upcomingInsurance.length > 0, upcomingMaintenance.length > 0].filter(Boolean).length === 1
                ? "w-full"
                : [upcomingSOAT.length > 0, upcomingInsurance.length > 0, upcomingMaintenance.length > 0].filter(Boolean).length === 2
                ? "lg:grid-cols-2"
                : "lg:grid-cols-3"
            )}
          >
            {/* SOAT Alerts Preview */}
            {upcomingSOAT.length > 0 && (
              <Card className="border-border/80 shadow-xs flex flex-col justify-between">
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                          <ShieldAlert className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold leading-tight">
                            SOAT Próximos a Vencer
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            {upcomingSOAT.length} {upcomingSOAT.length === 1 ? 'vehículo requiere' : 'vehículos requieren'} renovación
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-orange-200 bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/60 text-xs font-semibold px-2 py-0.5 shrink-0"
                      >
                        {upcomingSOAT.length} {upcomingSOAT.length === 1 ? 'alerta' : 'alertas'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2.5 pt-0">
                    {upcomingSOAT.slice(0, 3).map(({ soat, car, daysUntilExpiry }: any) => {
                      const isExpired = daysUntilExpiry < 0;
                      const isUrgent = daysUntilExpiry >= 0 && daysUntilExpiry <= 7;

                      return (
                        <div
                          key={soat.id}
                          className={cn(
                            "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all duration-150",
                            isExpired
                              ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10"
                              : isUrgent
                              ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/10"
                              : "bg-muted/30 border-border/70 hover:border-border hover:bg-muted/50"
                          )}
                        >
                          {/* Auto & Info */}
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div
                              className={cn(
                                "p-1.5 rounded-lg shrink-0 mt-0.5",
                                isExpired
                                ? "bg-red-500/15 text-red-600 dark:text-red-400"
                                : isUrgent
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                              )}
                            >
                              <Shield className="w-4 h-4" />
                            </div>

                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-background border border-border tracking-wider text-foreground shadow-2xs">
                                  {car.placa}
                                </span>
                                <span className="font-semibold text-sm text-foreground truncate" title={`${car.marca} ${car.modelo}`}>
                                  {car.marca} {car.modelo}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                <span className="flex items-center gap-1 font-medium">
                                  <Calendar className="w-3.5 h-3.5 text-muted-foreground/80" />
                                  {safeFormatDate(soat.expiryDate)}
                                </span>
                                {soat.aseguradora && (
                                  <>
                                    <span className="text-muted-foreground/40">•</span>
                                    <span className="text-muted-foreground truncate max-w-[150px]" title={soat.aseguradora}>
                                      {soat.aseguradora}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Status badge & action */}
                          <div className="flex items-center gap-2 sm:shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
                            {isExpired ? (
                              <Badge variant="destructive" className="font-semibold text-xs px-2.5 py-0.5 gap-1 shrink-0">
                                <AlertCircle className="w-3 h-3" />
                                {Math.abs(daysUntilExpiry)} {Math.abs(daysUntilExpiry) === 1 ? 'día vencido' : 'días vencidos'}
                              </Badge>
                            ) : isUrgent ? (
                              <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs px-2.5 py-0.5 gap-1 shrink-0 border-0">
                                <Clock className="w-3 h-3" />
                                {daysUntilExpiry === 0 ? 'Vence hoy' : `Vence en ${daysUntilExpiry} d`}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="font-medium text-xs px-2.5 py-0.5 gap-1 shrink-0 border border-border/60">
                                <Calendar className="w-3 h-3" />
                                {daysUntilExpiry} días
                              </Badge>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onNavigate('soat')}
                              className="h-8 px-3 text-xs gap-1 font-medium hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
                            >
                              <span>Gestionar</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </div>

                {upcomingSOAT.length > 3 && (
                  <div className="p-4 pt-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate('alerts')}
                      className="w-full text-xs text-muted-foreground hover:text-foreground justify-center gap-1.5 h-8 border border-dashed border-border/80 hover:border-border"
                    >
                      <span>Ver todas las alertas de SOAT ({upcomingSOAT.length})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </Card>
            )}

            {/* Insurance Alerts Preview */}
            {upcomingInsurance.length > 0 && (
              <Card className="border-border/80 shadow-xs flex flex-col justify-between">
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                          <ShieldCheck className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold leading-tight">
                            Seguros Próximos a Vencer
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            {upcomingInsurance.length} {upcomingInsurance.length === 1 ? 'seguro requiere' : 'seguros requieren'} renovación
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-purple-200 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/60 text-xs font-semibold px-2 py-0.5 shrink-0"
                      >
                        {upcomingInsurance.length} {upcomingInsurance.length === 1 ? 'alerta' : 'alertas'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2.5 pt-0">
                    {upcomingInsurance.slice(0, 3).map(({ insurance, car, daysUntilExpiry }: any) => {
                      const isExpired = daysUntilExpiry < 0;
                      const isUrgent = daysUntilExpiry >= 0 && daysUntilExpiry <= 7;

                      return (
                        <div
                          key={insurance.id}
                          className={cn(
                            "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all duration-150",
                            isExpired
                              ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10"
                              : isUrgent
                              ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/10"
                              : "bg-muted/30 border-border/70 hover:border-border hover:bg-muted/50"
                          )}
                        >
                          {/* Auto & Info */}
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div
                              className={cn(
                                "p-1.5 rounded-lg shrink-0 mt-0.5",
                                isExpired
                                  ? "bg-red-500/15 text-red-600 dark:text-red-400"
                                  : isUrgent
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                  : "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                              )}
                            >
                              <ShieldCheck className="w-4 h-4" />
                            </div>

                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-background border border-border tracking-wider text-foreground shadow-2xs">
                                  {car.placa}
                                </span>
                                <span className="font-semibold text-sm text-foreground truncate" title={`${car.marca} ${car.modelo}`}>
                                  {car.marca} {car.modelo}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                <span className="truncate max-w-[150px]" title={insurance.concepto}>
                                  {insurance.concepto}
                                </span>
                                <span className="text-muted-foreground/40">•</span>
                                <span className="flex items-center gap-1 font-medium">
                                  <Calendar className="w-3.5 h-3.5 text-muted-foreground/80" />
                                  {safeFormatDate(insurance.expiryDate)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Status badge & action */}
                          <div className="flex items-center gap-2 sm:shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
                            {isExpired ? (
                              <Badge variant="destructive" className="font-semibold text-xs px-2.5 py-0.5 gap-1 shrink-0">
                                <AlertCircle className="w-3 h-3" />
                                {Math.abs(daysUntilExpiry)} {Math.abs(daysUntilExpiry) === 1 ? 'día vencido' : 'días vencidos'}
                              </Badge>
                            ) : isUrgent ? (
                              <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs px-2.5 py-0.5 gap-1 shrink-0 border-0">
                                <Clock className="w-3 h-3" />
                                {daysUntilExpiry === 0 ? 'Vence hoy' : `Vence en ${daysUntilExpiry} d`}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="font-medium text-xs px-2.5 py-0.5 gap-1 shrink-0 border border-border/60">
                                <Calendar className="w-3 h-3" />
                                {daysUntilExpiry} días
                              </Badge>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onNavigate('insurance')}
                              className="h-8 px-3 text-xs gap-1 font-medium hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
                            >
                              <span>Gestionar</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </div>

                {upcomingInsurance.length > 3 && (
                  <div className="p-4 pt-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate('alerts')}
                      className="w-full text-xs text-muted-foreground hover:text-foreground justify-center gap-1.5 h-8 border border-dashed border-border/80 hover:border-border"
                    >
                      <span>Ver todos los seguros ({upcomingInsurance.length})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </Card>
            )}

            {/* Maintenance Alerts Preview */}
            {upcomingMaintenance.length > 0 && (
              <Card className="border-border/80 shadow-xs flex flex-col justify-between">
                <div>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                          <Wrench className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-base font-semibold leading-tight">
                            Mantenimientos Programados
                          </CardTitle>
                          <CardDescription className="text-xs mt-0.5">
                            {upcomingMaintenance.length} {upcomingMaintenance.length === 1 ? 'mantenimiento próximo' : 'mantenimientos próximos'}
                          </CardDescription>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className="border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60 text-xs font-semibold px-2 py-0.5 shrink-0"
                      >
                        {upcomingMaintenance.length} {upcomingMaintenance.length === 1 ? 'pendiente' : 'pendientes'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2.5 pt-0">
                    {upcomingMaintenance.slice(0, 3).map(({ maintenance, car, daysUntilDue }: any) => {
                      const isOverdue = daysUntilDue < 0;
                      const isUrgent = daysUntilDue >= 0 && daysUntilDue <= 7;

                      return (
                        <div
                          key={maintenance.id}
                          className={cn(
                            "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl border transition-all duration-150",
                            isOverdue
                              ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10"
                              : isUrgent
                              ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/10"
                              : "bg-muted/30 border-border/70 hover:border-border hover:bg-muted/50"
                          )}
                        >
                          {/* Auto & Info */}
                          <div className="flex items-start gap-2.5 min-w-0">
                            <div
                              className={cn(
                                "p-1.5 rounded-lg shrink-0 mt-0.5",
                                isOverdue
                                  ? "bg-red-500/15 text-red-600 dark:text-red-400"
                                  : isUrgent
                                  ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                  : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                              )}
                            >
                              <Wrench className="w-4 h-4" />
                            </div>

                            <div className="min-w-0 space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-background border border-border tracking-wider text-foreground shadow-2xs">
                                  {car.placa}
                                </span>
                                <span className="font-semibold text-sm text-foreground truncate" title={`${car.marca} ${car.modelo}`}>
                                  {car.marca} {car.modelo}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                                <span
                                  className="truncate max-w-[160px]"
                                  title={
                                    maintenance.detalles && maintenance.detalles.length > 0
                                      ? maintenance.detalles[0].detalle
                                      : 'Mantenimiento Preventivo'
                                  }
                                >
                                  {maintenance.detalles && maintenance.detalles.length > 0
                                    ? maintenance.detalles[0].detalle
                                    : 'Mantenimiento Preventivo'}
                                </span>
                                <span className="text-muted-foreground/40">•</span>
                                <span className="flex items-center gap-1 font-medium">
                                  <Calendar className="w-3.5 h-3.5 text-muted-foreground/80" />
                                  {safeFormatDate(maintenance.expiryDate || maintenance.nextDate)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Status badge & action */}
                          <div className="flex items-center gap-2 sm:shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
                            {isOverdue ? (
                              <Badge variant="destructive" className="font-semibold text-xs px-2.5 py-0.5 gap-1 shrink-0">
                                <AlertCircle className="w-3 h-3" />
                                {Math.abs(daysUntilDue)} {Math.abs(daysUntilDue) === 1 ? 'día vencido' : 'días vencidos'}
                              </Badge>
                            ) : isUrgent ? (
                              <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs px-2.5 py-0.5 gap-1 shrink-0 border-0">
                                <Clock className="w-3 h-3" />
                                {daysUntilDue === 0 ? 'Hoy' : `En ${daysUntilDue} d`}
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="font-medium text-xs px-2.5 py-0.5 gap-1 shrink-0 border border-border/60">
                                <Calendar className="w-3 h-3" />
                                {daysUntilDue} días
                              </Badge>
                            )}

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onNavigate('maintenance')}
                              className="h-8 px-3 text-xs gap-1 font-medium hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
                            >
                              <span>Gestionar</span>
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </div>

                {upcomingMaintenance.length > 3 && (
                  <div className="p-4 pt-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onNavigate('alerts')}
                      className="w-full text-xs text-muted-foreground hover:text-foreground justify-center gap-1.5 h-8 border border-dashed border-border/80 hover:border-border"
                    >
                      <span>Ver todos los mantenimientos ({upcomingMaintenance.length})</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </Card>
            )}
          </div>
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