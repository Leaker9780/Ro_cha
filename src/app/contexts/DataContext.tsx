import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Car {
  id: string;
  brand: string;
  model: string;
  year: number;
  plate: string;
  color: string;
  status: 'available' | 'rented' | 'maintenance';
  dailyRate: number;
  imageUrl?: string;
}

export interface Client {
  id: string;
  name: string;
  dni: string;
  phone: string;
  email: string;
  address: string;
}

export interface Rental {
  id: string;
  carId: string;
  clientId: string;
  startDate: string;
  endDate: string;
  totalAmount: number;
  status: 'active' | 'completed' | 'cancelled';
  paymentStatus: 'pending' | 'partial' | 'paid';
}

export interface MaintenanceDetail {
  description: string;
  cost: number;
  paymentMethod: string;
}

export interface Maintenance {
  id: string;
  carId: string;
  type: string;
  date: string;
  nextDate?: string;
  status: 'scheduled' | 'completed';
  details: MaintenanceDetail[];
}

export interface SOAT {
  id: string;
  carId: string;
  issueDate: string;
  expiryDate: string;
  cost: number;
  insuranceCompany: string;
}

export interface GPS {
  id: string;
  carId: string;
  date: string;
  dayOfWeek: string;
  movementTime: number;
  kilometers: number;
}

export interface Insurance {
  id: string;
  carId: string;
  date: string;
  concept: string;
  paymentMethod: string;
  amount: number;
  expiryDate: string;
  comments: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string;
  relatedId?: string;
}

interface DataContextType {
  cars: Car[];
  clients: Client[];
  rentals: Rental[];
  maintenance: Maintenance[];
  soats: SOAT[];
  transactions: Transaction[];
  gpsData: GPS[];
  insurances: Insurance[];
  addCar: (car: Omit<Car, 'id'>) => void;
  updateCar: (id: string, car: Partial<Car>) => void;
  deleteCar: (id: string) => void;
  addClient: (client: Omit<Client, 'id'>) => void;
  updateClient: (id: string, client: Partial<Client>) => void;
  deleteClient: (id: string) => void;
  addRental: (rental: Omit<Rental, 'id'>) => void;
  updateRental: (id: string, rental: Partial<Rental>) => void;
  deleteRental: (id: string) => void;
  addMaintenance: (maintenance: Omit<Maintenance, 'id'>) => void;
  updateMaintenance: (id: string, maintenance: Partial<Maintenance>) => void;
  deleteMaintenance: (id: string) => void;
  addSOAT: (soat: Omit<SOAT, 'id'>) => void;
  updateSOAT: (id: string, soat: Partial<SOAT>) => void;
  deleteSOAT: (id: string) => void;
  addTransaction: (transaction: Omit<Transaction, 'id'>) => void;
  deleteTransaction: (id: string) => void;
  addGPS: (gps: Omit<GPS, 'id'>) => void;
  updateGPS: (id: string, gps: Partial<GPS>) => void;
  deleteGPS: (id: string) => void;
  addInsurance: (insurance: Omit<Insurance, 'id'>) => void;
  updateInsurance: (id: string, insurance: Partial<Insurance>) => void;
  deleteInsurance: (id: string) => void;
  getUpcomingSOATExpirations: () => Array<{ soat: SOAT; car: Car; daysUntilExpiry: number }>;
  getUpcomingMaintenance: () => Array<{ maintenance: Maintenance; car: Car; daysUntilDue: number }>;
  getUpcomingInsuranceExpirations: () => Array<{ insurance: Insurance; car: Car; daysUntilExpiry: number }>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const DEMO_CARS: Car[] = [
  { id: '1', brand: 'Toyota', model: 'Corolla', year: 2022, plate: 'ABC-123', color: 'Blanco', status: 'available', dailyRate: 120 },
  { id: '2', brand: 'Hyundai', model: 'Accent', year: 2021, plate: 'DEF-456', color: 'Negro', status: 'rented', dailyRate: 100 },
  { id: '3', brand: 'Nissan', model: 'Versa', year: 2023, plate: 'GHI-789', color: 'Gris', status: 'available', dailyRate: 110 },
];

const DEMO_CLIENTS: Client[] = [
  { id: '1', name: 'Juan Pérez', dni: '12345678', phone: '987654321', email: 'juan@email.com', address: 'Av. Principal 123' },
  { id: '2', name: 'Ana García', dni: '87654321', phone: '912345678', email: 'ana@email.com', address: 'Calle Secundaria 456' },
];

export function DataProvider({ children }: { children: ReactNode }) {
  const [cars, setCars] = useState<Car[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);
  const [maintenance, setMaintenance] = useState<Maintenance[]>([]);
  const [soats, setSOATs] = useState<SOAT[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [gpsData, setGPSData] = useState<GPS[]>([]);
  const [insurances, setInsurances] = useState<Insurance[]>([]);

  useEffect(() => {
    const savedCars = localStorage.getItem('rocha_cars');
    const savedClients = localStorage.getItem('rocha_clients');
    const savedRentals = localStorage.getItem('rocha_rentals');
    const savedMaintenance = localStorage.getItem('rocha_maintenance');
    const savedSOATs = localStorage.getItem('rocha_soats');
    const savedTransactions = localStorage.getItem('rocha_transactions');
    const savedGPS = localStorage.getItem('rocha_gps');
    const savedInsurances = localStorage.getItem('rocha_insurances');

    setCars(savedCars ? JSON.parse(savedCars) : DEMO_CARS);
    setClients(savedClients ? JSON.parse(savedClients) : DEMO_CLIENTS);
    setRentals(savedRentals ? JSON.parse(savedRentals) : []);
    setMaintenance(savedMaintenance ? JSON.parse(savedMaintenance) : []);
    setSOATs(savedSOATs ? JSON.parse(savedSOATs) : []);
    setTransactions(savedTransactions ? JSON.parse(savedTransactions) : []);
    setGPSData(savedGPS ? JSON.parse(savedGPS) : []);
    setInsurances(savedInsurances ? JSON.parse(savedInsurances) : []);
  }, []);

  useEffect(() => {
    localStorage.setItem('rocha_cars', JSON.stringify(cars));
  }, [cars]);

  useEffect(() => {
    localStorage.setItem('rocha_clients', JSON.stringify(clients));
  }, [clients]);

  useEffect(() => {
    localStorage.setItem('rocha_rentals', JSON.stringify(rentals));
  }, [rentals]);

  useEffect(() => {
    localStorage.setItem('rocha_maintenance', JSON.stringify(maintenance));
  }, [maintenance]);

  useEffect(() => {
    localStorage.setItem('rocha_soats', JSON.stringify(soats));
  }, [soats]);

  useEffect(() => {
    localStorage.setItem('rocha_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    localStorage.setItem('rocha_gps', JSON.stringify(gpsData));
  }, [gpsData]);

  useEffect(() => {
    localStorage.setItem('rocha_insurances', JSON.stringify(insurances));
  }, [insurances]);

  const addCar = (car: Omit<Car, 'id'>) => {
    const newCar = { ...car, id: Date.now().toString() };
    setCars([...cars, newCar]);
  };

  const updateCar = (id: string, carUpdate: Partial<Car>) => {
    setCars(cars.map(car => car.id === id ? { ...car, ...carUpdate } : car));
  };

  const deleteCar = (id: string) => {
    setCars(cars.filter(car => car.id !== id));
  };

  const addClient = (client: Omit<Client, 'id'>) => {
    const newClient = { ...client, id: Date.now().toString() };
    setClients([...clients, newClient]);
  };

  const updateClient = (id: string, clientUpdate: Partial<Client>) => {
    setClients(clients.map(client => client.id === id ? { ...client, ...clientUpdate } : client));
  };

  const deleteClient = (id: string) => {
    setClients(clients.filter(client => client.id !== id));
  };

  const addRental = (rental: Omit<Rental, 'id'>) => {
    const newRental = { ...rental, id: Date.now().toString() };
    setRentals([...rentals, newRental]);
    updateCar(rental.carId, { status: 'rented' });
  };

  const updateRental = (id: string, rentalUpdate: Partial<Rental>) => {
    setRentals(rentals.map(rental => rental.id === id ? { ...rental, ...rentalUpdate } : rental));
  };

  const deleteRental = (id: string) => {
    setRentals(rentals.filter(rental => rental.id !== id));
  };

  const addMaintenance = (maintenanceItem: Omit<Maintenance, 'id'>) => {
    const newMaintenance = { ...maintenanceItem, id: Date.now().toString() };
    setMaintenance([...maintenance, newMaintenance]);
    if (maintenanceItem.status === 'scheduled') {
      updateCar(maintenanceItem.carId, { status: 'maintenance' });
    }
  };

  const updateMaintenance = (id: string, maintenanceUpdate: Partial<Maintenance>) => {
    setMaintenance(maintenance.map(m => m.id === id ? { ...m, ...maintenanceUpdate } : m));
  };

  const deleteMaintenance = (id: string) => {
    setMaintenance(maintenance.filter(m => m.id !== id));
  };

  const addSOAT = (soat: Omit<SOAT, 'id'>) => {
    const newSOAT = { ...soat, id: Date.now().toString() };
    setSOATs([...soats, newSOAT]);
  };

  const updateSOAT = (id: string, soatUpdate: Partial<SOAT>) => {
    setSOATs(soats.map(s => s.id === id ? { ...s, ...soatUpdate } : s));
  };

  const deleteSOAT = (id: string) => {
    setSOATs(soats.filter(s => s.id !== id));
  };

  const addTransaction = (transaction: Omit<Transaction, 'id'>) => {
    const newTransaction = { ...transaction, id: Date.now().toString() };
    setTransactions([...transactions, newTransaction]);
  };

  const deleteTransaction = (id: string) => {
    setTransactions(transactions.filter(t => t.id !== id));
  };

  const addGPS = (gps: Omit<GPS, 'id'>) => {
    const newGPS = { ...gps, id: Date.now().toString() };
    setGPSData([...gpsData, newGPS]);
  };

  const updateGPS = (id: string, gpsUpdate: Partial<GPS>) => {
    setGPSData(gpsData.map(g => g.id === id ? { ...g, ...gpsUpdate } : g));
  };

  const deleteGPS = (id: string) => {
    setGPSData(gpsData.filter(g => g.id !== id));
  };

  const addInsurance = (insurance: Omit<Insurance, 'id'>) => {
    const newInsurance = { ...insurance, id: Date.now().toString() };
    setInsurances([...insurances, newInsurance]);
  };

  const updateInsurance = (id: string, insuranceUpdate: Partial<Insurance>) => {
    setInsurances(insurances.map(i => i.id === id ? { ...i, ...insuranceUpdate } : i));
  };

  const deleteInsurance = (id: string) => {
    setInsurances(insurances.filter(i => i.id !== id));
  };

  const getUpcomingSOATExpirations = () => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    return soats
      .map(soat => {
        const expiryDate = new Date(soat.expiryDate);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
        const car = cars.find(c => c.id === soat.carId);
        return { soat, car: car!, daysUntilExpiry };
      })
      .filter(item => item.car && item.daysUntilExpiry <= 30 && item.daysUntilExpiry > 0)
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  };

  const getUpcomingMaintenance = () => {
    const today = new Date();

    return maintenance
      .filter(m => m.nextDate && m.status === 'completed')
      .map(m => {
        const nextDate = new Date(m.nextDate!);
        const daysUntilDue = Math.ceil((nextDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
        const car = cars.find(c => c.id === m.carId);
        return { maintenance: m, car: car!, daysUntilDue };
      })
      .filter(item => item.car && item.daysUntilDue <= 30 && item.daysUntilDue > 0)
      .sort((a, b) => a.daysUntilDue - b.daysUntilDue);
  };

  const getUpcomingInsuranceExpirations = () => {
    const today = new Date();

    return insurances
      .map(insurance => {
        const expiryDate = new Date(insurance.expiryDate);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
        const car = cars.find(c => c.id === insurance.carId);
        return { insurance, car: car!, daysUntilExpiry };
      })
      .filter(item => item.car && item.daysUntilExpiry <= 30 && item.daysUntilExpiry > 0)
      .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);
  };

  return (
    <DataContext.Provider value={{
      cars,
      clients,
      rentals,
      maintenance,
      soats,
      transactions,
      gpsData,
      insurances,
      addCar,
      updateCar,
      deleteCar,
      addClient,
      updateClient,
      deleteClient,
      addRental,
      updateRental,
      deleteRental,
      addMaintenance,
      updateMaintenance,
      deleteMaintenance,
      addSOAT,
      updateSOAT,
      deleteSOAT,
      addTransaction,
      deleteTransaction,
      addGPS,
      updateGPS,
      deleteGPS,
      addInsurance,
      updateInsurance,
      deleteInsurance,
      getUpcomingSOATExpirations,
      getUpcomingMaintenance,
      getUpcomingInsuranceExpirations,
    }}>
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
}
