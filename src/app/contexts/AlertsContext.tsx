import { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { differenceInDays } from 'date-fns';

export interface AlertCar {
  id: string;
  marca: string;
  modelo: string;
  placa: string;
}

export interface AlertSOATItem {
  soat: {
    id: string;
    placa: string;
    aseguradora: string;
    cobertura: string;
    expiryDate: Date;
  };
  car: AlertCar;
  daysUntilExpiry: number;
}

export interface AlertInsuranceItem {
  insurance: {
    id: string;
    placa: string;
    concepto: string;
    comentario: string;
    expiryDate: Date;
  };
  car: AlertCar;
  daysUntilExpiry: number;
}

export interface AlertMaintenanceItem {
  maintenance: {
    id: string;
    placa: string;
    tipo?: string;
    nextDate?: string;
    detalles?: any[];
    expiryDate: Date;
  };
  car: AlertCar;
  daysUntilDue: number;
}

interface RawSOAT {
  id: string;
  placa: string;
  aseguradora: string;
  cobertura: string;
}

interface RawSeguro {
  id: string;
  placa: string;
  concepto: string;
  comentario: string;
}

interface RawMantenimiento {
  id: string;
  placa: string;
  tipo?: string;
  nextDate?: string;
  detalles?: any[];
}

interface AlertsContextType {
  upcomingSOAT: AlertSOATItem[];
  upcomingInsurance: AlertInsuranceItem[];
  upcomingMaintenance: AlertMaintenanceItem[];
  totalAlertsCount: number;
  loading: boolean;
}

const AlertsContext = createContext<AlertsContextType | undefined>(undefined);

export function AlertsProvider({ children }: { children: ReactNode }) {
  const [autos, setAutos] = useState<AlertCar[]>([]);
  const [soats, setSoats] = useState<RawSOAT[]>([]);
  const [seguros, setSeguros] = useState<RawSeguro[]>([]);
  const [mantenimientos, setMantenimientos] = useState<RawMantenimiento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubAutos = onSnapshot(
      collection(db, 'autos'),
      (snap) => setAutos(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as AlertCar))),
      (err) => console.error('Error fetching autos for alerts:', err)
    );

    const unsubSoats = onSnapshot(
      collection(db, 'soat'),
      (snap) => setSoats(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as RawSOAT))),
      (err) => console.error('Error fetching soat for alerts:', err)
    );

    const unsubSeguros = onSnapshot(
      collection(db, 'seguros'),
      (snap) => setSeguros(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as RawSeguro))),
      (err) => console.error('Error fetching seguros for alerts:', err)
    );

    const unsubMantenimiento = onSnapshot(
      collection(db, 'mantenimiento'),
      (snap) => {
        setMantenimientos(snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as RawMantenimiento)));
        setLoading(false);
      },
      (err) => console.error('Error fetching mantenimiento for alerts:', err)
    );

    return () => {
      unsubAutos();
      unsubSoats();
      unsubSeguros();
      unsubMantenimiento();
    };
  }, []);

  const alertsData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. SOAT con deduplicación por auto
    const latestSoatsByCar = new Map<string, number>();
    soats.forEach((soat) => {
      if (!soat.cobertura) return;
      const fechas = soat.cobertura.split(' - ');
      if (fechas.length < 2) return;
      const parts = fechas[1].split('/').map(Number);
      if (parts.length < 3 || parts.some(isNaN)) return;
      const endTimestamp = new Date(parts[2], parts[1] - 1, parts[0]).getTime();
      if (!latestSoatsByCar.has(soat.placa) || endTimestamp > (latestSoatsByCar.get(soat.placa) || 0)) {
        latestSoatsByCar.set(soat.placa, endTimestamp);
      }
    });

    const upcomingSOAT: AlertSOATItem[] = soats
      .map((soat) => {
        const car = autos.find((c) => c.id === soat.placa);
        if (!car || !soat.cobertura) return null;
        const fechas = soat.cobertura.split(' - ');
        if (fechas.length < 2) return null;
        const parts = fechas[1].split('/').map(Number);
        if (parts.length < 3 || parts.some(isNaN)) return null;
        const expiry = new Date(parts[2], parts[1] - 1, parts[0]);
        const endTimestamp = expiry.getTime();

        if (endTimestamp < (latestSoatsByCar.get(soat.placa) || 0)) {
          return null;
        }

        const daysUntilExpiry = differenceInDays(expiry, today);
        if (daysUntilExpiry <= 30) {
          return { soat: { ...soat, expiryDate: expiry }, car, daysUntilExpiry };
        }
        return null;
      })
      .filter((item): item is AlertSOATItem => item !== null)
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    // 2. Seguros con deduplicación por auto
    const latestSegurosByCar = new Map<string, number>();
    seguros.forEach((seguro) => {
      if (!seguro.comentario) return;
      const dateMatch = seguro.comentario.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (!dateMatch) return;
      const endTimestamp = new Date(Number(dateMatch[3]), Number(dateMatch[2]) - 1, Number(dateMatch[1])).getTime();
      if (!latestSegurosByCar.has(seguro.placa) || endTimestamp > (latestSegurosByCar.get(seguro.placa) || 0)) {
        latestSegurosByCar.set(seguro.placa, endTimestamp);
      }
    });

    const upcomingInsurance: AlertInsuranceItem[] = seguros
      .map((seguro) => {
        const car = autos.find((c) => c.id === seguro.placa);
        if (!car || !seguro.comentario) return null;
        const dateMatch = seguro.comentario.match(/(\d{2})\/(\d{2})\/(\d{4})/);
        if (!dateMatch) return null;
        const expiry = new Date(Number(dateMatch[3]), Number(dateMatch[2]) - 1, Number(dateMatch[1]));
        const endTimestamp = expiry.getTime();

        if (endTimestamp < (latestSegurosByCar.get(seguro.placa) || 0)) {
          return null;
        }

        const daysUntilExpiry = differenceInDays(expiry, today);
        if (daysUntilExpiry <= 30) {
          return { insurance: { ...seguro, expiryDate: expiry }, car, daysUntilExpiry };
        }
        return null;
      })
      .filter((item): item is AlertInsuranceItem => item !== null)
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

    // 3. Mantenimientos
    const upcomingMaintenance: AlertMaintenanceItem[] = mantenimientos
      .map((m) => {
        if (!m.nextDate) return null;
        const car = autos.find((c) => c.id === m.placa);
        if (!car) return null;

        const parts = m.nextDate.includes('-')
          ? m.nextDate.split('-').map(Number)
          : m.nextDate.split('/').map(Number);
        const expiry =
          parts.length >= 3 && !parts.some(isNaN)
            ? m.nextDate.includes('-')
              ? new Date(parts[0], parts[1] - 1, parts[2])
              : new Date(parts[2], parts[1] - 1, parts[0])
            : new Date(`${m.nextDate}T00:00:00`);
        const daysUntilDue = differenceInDays(expiry, today);

        if (daysUntilDue <= 30) {
          return { maintenance: { ...m, expiryDate: expiry }, car, daysUntilDue };
        }
        return null;
      })
      .filter((item): item is AlertMaintenanceItem => item !== null)
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    const totalAlertsCount = upcomingSOAT.length + upcomingInsurance.length + upcomingMaintenance.length;

    return {
      upcomingSOAT,
      upcomingInsurance,
      upcomingMaintenance,
      totalAlertsCount
    };
  }, [autos, soats, seguros, mantenimientos]);

  return (
    <AlertsContext.Provider
      value={{
        ...alertsData,
        loading
      }}
    >
      {children}
    </AlertsContext.Provider>
  );
}

export function useAlerts() {
  const context = useContext(AlertsContext);
  if (!context) {
    throw new Error('useAlerts must be used within an AlertsProvider');
  }
  return context;
}
