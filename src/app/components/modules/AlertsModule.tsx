import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { cn, safeFormatDate } from '../ui/utils';
import {
  AlertCircle,
  Shield,
  ShieldAlert,
  Wrench,
  CheckCircle,
  ShieldCheck,
  Calendar,
  Clock,
  ChevronRight
} from 'lucide-react';
import { useAlerts } from '../../contexts/AlertsContext';

interface AlertsModuleProps {
  onNavigate?: (module: string) => void;
}

export function AlertsModule({ onNavigate }: AlertsModuleProps) {
  const { upcomingSOAT, upcomingInsurance, upcomingMaintenance, totalAlertsCount } = useAlerts();
  const hasAlerts = totalAlertsCount > 0;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h2 className="text-2xl font-bold">Centro de Alertas</h2>
          {totalAlertsCount > 0 && (
            <Badge variant="destructive" className="font-bold text-xs px-2.5 py-0.5">
              {totalAlertsCount} {totalAlertsCount === 1 ? 'alerta activa' : 'alertas activas'}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-1">Notificaciones y recordatorios importantes</p>
      </div>

      {!hasAlerts ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CheckCircle className="w-16 h-16 text-green-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">Todo está en orden</h3>
            <p className="text-muted-foreground">No hay alertas pendientes en este momento</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Alertas SOAT */}
          {upcomingSOAT.length > 0 && (
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20">
                      <ShieldAlert className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">SOAT Próximos a Vencer</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {upcomingSOAT.length} {upcomingSOAT.length === 1 ? 'vehículo requiere' : 'vehículos requieren'} renovación de SOAT
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-orange-200 bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/60 text-xs font-semibold px-2.5 py-0.5 shrink-0"
                  >
                    {upcomingSOAT.length} {upcomingSOAT.length === 1 ? 'alerta' : 'alertas'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-0">
                {upcomingSOAT.map(({ soat, car, daysUntilExpiry }: any) => {
                  const isExpired = daysUntilExpiry < 0;
                  const isUrgent = daysUntilExpiry >= 0 && daysUntilExpiry <= 7;

                  return (
                    <div
                      key={soat.id}
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all duration-150",
                        isExpired
                          ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10"
                          : isUrgent
                          ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/10"
                          : "bg-muted/30 border-border/70 hover:border-border hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={cn(
                            "p-2 rounded-lg shrink-0 mt-0.5",
                            isExpired
                              ? "bg-red-500/15 text-red-600 dark:text-red-400"
                              : isUrgent
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                          )}
                        >
                          <Shield className="w-5 h-5" />
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-background border border-border tracking-wider text-foreground shadow-2xs">
                              {car.placa}
                            </span>
                            <span className="font-semibold text-sm text-foreground">
                              {car.marca} {car.modelo}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span className="flex items-center gap-1 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground/80" />
                              Vence: {safeFormatDate(soat.expiryDate)}
                            </span>
                            {soat.aseguradora && (
                              <>
                                <span className="text-muted-foreground/40">•</span>
                                <span>Aseguradora: <strong className="text-foreground/80">{soat.aseguradora}</strong></span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 sm:shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
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

                        {onNavigate && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onNavigate('soat')}
                            className="h-8 px-3 text-xs gap-1 font-medium hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
                          >
                            <span>Gestionar SOAT</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Alertas Seguros */}
          {upcomingInsurance.length > 0 && (
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Seguros Próximos a Vencer</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {upcomingInsurance.length} {upcomingInsurance.length === 1 ? 'seguro requiere' : 'seguros requieren'} renovación
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-purple-200 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/60 text-xs font-semibold px-2.5 py-0.5 shrink-0"
                  >
                    {upcomingInsurance.length} {upcomingInsurance.length === 1 ? 'alerta' : 'alertas'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-0">
                {upcomingInsurance.map(({ insurance, car, daysUntilExpiry }: any) => {
                  const isExpired = daysUntilExpiry < 0;
                  const isUrgent = daysUntilExpiry >= 0 && daysUntilExpiry <= 7;

                  return (
                    <div
                      key={insurance.id}
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all duration-150",
                        isExpired
                          ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10"
                          : isUrgent
                          ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/10"
                          : "bg-muted/30 border-border/70 hover:border-border hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={cn(
                            "p-2 rounded-lg shrink-0 mt-0.5",
                            isExpired
                              ? "bg-red-500/15 text-red-600 dark:text-red-400"
                              : isUrgent
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "bg-purple-500/15 text-purple-600 dark:text-purple-400"
                          )}
                        >
                          <ShieldCheck className="w-5 h-5" />
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-background border border-border tracking-wider text-foreground shadow-2xs">
                              {car.placa}
                            </span>
                            <span className="font-semibold text-sm text-foreground">
                              {car.marca} {car.modelo}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span>Concepto: <strong className="text-foreground/80">{insurance.concepto}</strong></span>
                            <span className="text-muted-foreground/40">•</span>
                            <span className="flex items-center gap-1 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground/80" />
                              Vence: {safeFormatDate(insurance.expiryDate)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 sm:shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
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

                        {onNavigate && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onNavigate('insurance')}
                            className="h-8 px-3 text-xs gap-1 font-medium hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
                          >
                            <span>Gestionar Seguro</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Alertas Mantenimiento */}
          {upcomingMaintenance.length > 0 && (
            <Card className="border-border/80 shadow-xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                      <Wrench className="w-5 h-5" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">Mantenimientos Programados</CardTitle>
                      <CardDescription className="text-xs mt-0.5">
                        {upcomingMaintenance.length} {upcomingMaintenance.length === 1 ? 'mantenimiento próximo' : 'mantenimientos próximos'}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className="border-blue-200 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/60 text-xs font-semibold px-2.5 py-0.5 shrink-0"
                  >
                    {upcomingMaintenance.length} {upcomingMaintenance.length === 1 ? 'pendiente' : 'pendientes'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 pt-0">
                {upcomingMaintenance.map(({ maintenance, car, daysUntilDue }: any) => {
                  const isOverdue = daysUntilDue < 0;
                  const isUrgent = daysUntilDue >= 0 && daysUntilDue <= 7;

                  return (
                    <div
                      key={maintenance.id}
                      className={cn(
                        "flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border transition-all duration-150",
                        isOverdue
                          ? "bg-red-500/5 border-red-500/20 hover:border-red-500/40 hover:bg-red-500/10"
                          : isUrgent
                          ? "bg-amber-500/5 border-amber-500/20 hover:border-amber-500/40 hover:bg-amber-500/10"
                          : "bg-muted/30 border-border/70 hover:border-border hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div
                          className={cn(
                            "p-2 rounded-lg shrink-0 mt-0.5",
                            isOverdue
                              ? "bg-red-500/15 text-red-600 dark:text-red-400"
                              : isUrgent
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                          )}
                        >
                          <Wrench className="w-5 h-5" />
                        </div>

                        <div className="min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-background border border-border tracking-wider text-foreground shadow-2xs">
                              {car.placa}
                            </span>
                            <span className="font-semibold text-sm text-foreground">
                              {car.marca} {car.modelo}
                            </span>
                          </div>

                          <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                            <span>
                              {maintenance.detalles && maintenance.detalles.length > 0
                                ? maintenance.detalles[0].detalle
                                : 'Mantenimiento Programado'}
                            </span>
                            <span className="text-muted-foreground/40">•</span>
                            <span className="flex items-center gap-1 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground/80" />
                              Programado: {safeFormatDate(maintenance.expiryDate || maintenance.nextDate)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5 sm:shrink-0 justify-between sm:justify-end border-t sm:border-t-0 pt-2 sm:pt-0 border-border/40">
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

                        {onNavigate && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onNavigate('maintenance')}
                            className="h-8 px-3 text-xs gap-1 font-medium hover:bg-primary hover:text-primary-foreground transition-colors shrink-0"
                          >
                            <span>Gestionar Taller</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Resumen Final */}
          <Card className="bg-muted/50">
            <CardContent className="pt-6">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold text-orange-600">{upcomingSOAT.length}</div>
                  <div className="text-sm text-muted-foreground">SOAT por renovar</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-purple-600">{upcomingInsurance.length}</div>
                  <div className="text-sm text-muted-foreground">Seguros por renovar</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-blue-600">{upcomingMaintenance.length}</div>
                  <div className="text-sm text-muted-foreground">Mantenimientos próximos</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}