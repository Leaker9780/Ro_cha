import { useState, useEffect } from 'react';
// Importaciones de Firebase
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Badge } from '../ui/badge';
import { AlertCircle, Shield, Wrench, CheckCircle, ShieldCheck } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';

// 1. Interfaces basadas en tu Firestore
interface Auto {
  id: string;
  marca: string;
  modelo: string;
  placa: string;
}

interface SOATData {
  id: string;
  placa: string;
  aseguradora: string;
  cobertura: string;
}

interface SeguroData {
  id: string;
  placa: string;
  concepto: string;
  comentario: string;
}

interface MantenimientoData {
  id: string;
  placa: string;
  tipo?: string;
  nextDate?: string; 
  detalles?: any[];
}

export function AlertsModule() {
  const [autos, setAutos] = useState<Auto[]>([]);
  const [soats, setSoats] = useState<SOATData[]>([]);
  const [seguros, setSeguros] = useState<SeguroData[]>([]);
  const [mantenimientos, setMantenimientos] = useState<MantenimientoData[]>([]);

  // 2. Traemos TODA la data en tiempo real
  useEffect(() => {
    const unsubAutos = onSnapshot(collection(db, 'autos'), (snap) => 
      setAutos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Auto)))
    );
    const unsubSoats = onSnapshot(collection(db, 'soat'), (snap) => 
      setSoats(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SOATData)))
    );
    const unsubSeguros = onSnapshot(collection(db, 'seguros'), (snap) => 
      setSeguros(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SeguroData)))
    );
    const unsubMantenimiento = onSnapshot(collection(db, 'mantenimiento'), (snap) => 
      setMantenimientos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MantenimientoData)))
    );

    return () => {
      unsubAutos();
      unsubSoats();
      unsubSeguros();
      unsubMantenimiento();
    };
  }, []);

  // Configuramos "hoy" a la medianoche para cálculos exactos
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ==========================================
  // 3. LÓGICA DE ALERTAS SOAT (Con Historial Inteligente)
  // ==========================================
  const latestSoatsByCar = new Map<string, number>();
  
  // Encontramos el SOAT más reciente por cada auto
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
    const endTimestamp = expiry.getTime();

    // Si el SOAT evaluado no es el más reciente de este carro, lo IGNORAMOS
    if (endTimestamp < (latestSoatsByCar.get(soat.placa) || 0)) {
      return null;
    }

    const daysUntilExpiry = differenceInDays(expiry, today);

    // Solo mostramos alertas si faltan 30 días o menos
    if (daysUntilExpiry <= 30) {
      return { soat: { ...soat, expiryDate: expiry }, car, daysUntilExpiry };
    }
    return null;
  }).filter(Boolean).sort((a: any, b: any) => a.daysUntilExpiry - b.daysUntilExpiry);


  // ==========================================
  // 4. LÓGICA DE ALERTAS SEGUROS (Con Historial Inteligente)
  // ==========================================
  const latestSegurosByCar = new Map<string, number>();

  // Encontramos el Seguro más reciente por cada auto
  seguros.forEach(seguro => {
    if (!seguro.comentario) return;
    const dateMatch = seguro.comentario.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!dateMatch) return;
    const endTimestamp = new Date(`${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}T00:00:00`).getTime();

    if (!latestSegurosByCar.has(seguro.placa) || endTimestamp > (latestSegurosByCar.get(seguro.placa) || 0)) {
      latestSegurosByCar.set(seguro.placa, endTimestamp);
    }
  });

  const upcomingInsurance = seguros.map(seguro => {
    const car = autos.find(c => c.id === seguro.placa);
    if (!car || !seguro.comentario) return null;

    const dateMatch = seguro.comentario.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    if (!dateMatch) return null;

    const expiry = new Date(`${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}T00:00:00`);
    const endTimestamp = expiry.getTime();

    // Si el Seguro evaluado no es el más reciente de este carro, lo IGNORAMOS
    if (endTimestamp < (latestSegurosByCar.get(seguro.placa) || 0)) {
      return null;
    }

    const daysUntilExpiry = differenceInDays(expiry, today);

    if (daysUntilExpiry <= 30) {
      return { insurance: { ...seguro, expiryDate: expiry }, car, daysUntilExpiry };
    }
    return null;
  }).filter(Boolean).sort((a: any, b: any) => a.daysUntilExpiry - b.daysUntilExpiry);


  // ==========================================
  // 5. LÓGICA DE ALERTAS MANTENIMIENTO
  // ==========================================
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

  const hasAlerts = upcomingSOAT.length > 0 || upcomingMaintenance.length > 0 || upcomingInsurance.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Centro de Alertas</h2>
        <p className="text-muted-foreground">Notificaciones y recordatorios importantes</p>
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
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Shield className="w-6 h-6 text-orange-500" />
                  <div>
                    <CardTitle>SOAT Próximos a Vencer</CardTitle>
                    <CardDescription>
                      {upcomingSOAT.length} vehículo(s) requieren renovación de SOAT
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingSOAT.map(({ soat, car, daysUntilExpiry }: any) => (
                  <Alert
                    key={soat.id}
                    variant={daysUntilExpiry <= 7 ? 'destructive' : 'default'}
                    className="border-l-4 border-l-orange-500"
                  >
                    <AlertCircle className="h-5 w-5" />
                    <div className="flex-1">
                      <AlertTitle className="flex items-center gap-2">
                        {car.marca} {car.modelo} - {car.placa}
                        {daysUntilExpiry <= 7 && (
                          <Badge variant="destructive">Urgente</Badge>
                        )}
                      </AlertTitle>
                      <AlertDescription className="mt-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Vence el:</span>
                          <span className="font-medium">
                            {format(new Date(soat.expiryDate), 'dd/MM/yyyy')}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Días restantes:</span>
                          <span className={`font-bold ${daysUntilExpiry < 0 ? 'text-red-600' : 'text-orange-600'}`}>
                            {daysUntilExpiry < 0 ? `${Math.abs(daysUntilExpiry)} día(s) vencido` : `${daysUntilExpiry} día(s)`}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Aseguradora:</span>
                          <span>{soat.aseguradora}</span>
                        </div>
                      </AlertDescription>
                    </div>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Alertas Seguros */}
          {upcomingInsurance.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-6 h-6 text-purple-500" />
                  <div>
                    <CardTitle>Seguros Próximos a Vencer</CardTitle>
                    <CardDescription>
                      {upcomingInsurance.length} seguro(s) requieren renovación
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingInsurance.map(({ insurance, car, daysUntilExpiry }: any) => (
                  <Alert
                    key={insurance.id}
                    variant={daysUntilExpiry <= 7 ? 'destructive' : 'default'}
                    className="border-l-4 border-l-purple-500"
                  >
                    <AlertCircle className="h-5 w-5 text-purple-500" />
                    <div className="flex-1">
                      <AlertTitle className="flex items-center gap-2">
                        {car.marca} {car.modelo} - {car.placa}
                        {daysUntilExpiry <= 7 && (
                          <Badge variant="destructive">Urgente</Badge>
                        )}
                      </AlertTitle>
                      <AlertDescription className="mt-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Concepto:</span>
                          <span className="font-medium">{insurance.concepto}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Vence el:</span>
                          <span className="font-medium">
                            {format(new Date(insurance.expiryDate), 'dd/MM/yyyy')}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Días restantes:</span>
                          <span className={`font-bold ${daysUntilExpiry < 0 ? 'text-red-600' : 'text-purple-600'}`}>
                            {daysUntilExpiry < 0 ? `${Math.abs(daysUntilExpiry)} día(s) vencido` : `${daysUntilExpiry} día(s)`}
                          </span>
                        </div>
                      </AlertDescription>
                    </div>
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Alertas Mantenimiento */}
          {upcomingMaintenance.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Wrench className="w-6 h-6 text-blue-500" />
                  <div>
                    <CardTitle>Mantenimientos Programados</CardTitle>
                    <CardDescription>
                      {upcomingMaintenance.length} mantenimiento(s) próximos
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingMaintenance.map(({ maintenance, car, daysUntilDue }: any) => (
                  <Alert key={maintenance.id} className="border-l-4 border-l-blue-500">
                    <AlertCircle className="h-5 w-5 text-blue-500" />
                    <div className="flex-1">
                      <AlertTitle className="flex items-center gap-2">
                        {car.marca} {car.modelo} - {car.placa}
                        {daysUntilDue <= 7 && (
                          <Badge className="bg-blue-500">Próximamente</Badge>
                        )}
                      </AlertTitle>
                      <AlertDescription className="mt-2 space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>Detalle:</span>
                          <span className="font-medium">
                            {maintenance.detalles && maintenance.detalles.length > 0 
                              ? maintenance.detalles[0].detalle 
                              : 'Mantenimiento Programado'}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Fecha programada:</span>
                          <span className="font-medium">
                            {format(new Date(maintenance.nextDate), 'dd/MM/yyyy')}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Días restantes:</span>
                          <span className="font-bold text-blue-600">
                            {daysUntilDue} día(s)
                          </span>
                        </div>
                      </AlertDescription>
                    </div>
                  </Alert>
                ))}
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