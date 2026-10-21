import { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

import { Car } from '../../types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '../ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter
} from '../ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import { Badge } from '../ui/badge';
import { Plus, Edit, Trash2, Car as CarIcon } from 'lucide-react';
import { toast } from 'sonner';

export function CarsModule() {
  const [cars, setCars] = useState<Car[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCar, setEditingCar] = useState<Car | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // 1. Manejamos la fecha directamente como texto (YYYY-MM-DD)
  const getTodayString = () => new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    marca: '',
    modelo: '',
    año: new Date().getFullYear(),
    placa: '',
    color: '',
    status: 'available' as Car['status'],
    gas: '',
    kilometraje: 0,
    comentarios: '',
    mantenimiento: getTodayString() // Inicializado como texto
  });

  useEffect(() => {
    const carsRef = collection(db, 'autos');

    const unsubscribe = onSnapshot(carsRef, (snapshot) => {
      const carsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Car[];

      setCars(carsData);
    }, (error) => {
      console.error("Error obteniendo los autos:", error);
      toast.error('Error al cargar la base de datos');
    });

    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setFormData({
      marca: '',
      modelo: '',
      año: new Date().getFullYear(),
      placa: '',
      color: '',
      status: 'available',
      gas: '',
      kilometraje: 0,
      comentarios: '',
      mantenimiento: getTodayString()
    });
    setEditingCar(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 2. CORREGIDO: Se quitó fecha_mantenimiento, se permite kilometraje 0 y comentarios vacíos
    if (!formData.marca || !formData.modelo || !formData.placa || !formData.color || !formData.gas || !formData.mantenimiento) {
      toast.error('Por favor, completa los campos obligatorios');
      return;
    }

    try {
      if (editingCar) {
        const carDocRef = doc(db, 'autos', editingCar.id);
        await updateDoc(carDocRef, formData);
        toast.success('Auto actualizado correctamente');
      } else {
        const carsRef = collection(db, 'autos');
        await addDoc(carsRef, formData);
        toast.success('Auto agregado correctamente');
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error al guardar:", error);
      toast.error('Ocurrió un error al guardar el auto en la base de datos');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este auto? Esta acción no se puede deshacer.')) {
      try {
        const carDocRef = doc(db, 'autos', id);
        await deleteDoc(carDocRef);
        toast.success('Auto eliminado correctamente');
      } catch (error) {
        console.error("Error al eliminar:", error);
        toast.error('Error al eliminar el auto');
      }
    }
  };

  const handleEdit = (car: Car) => {
    setEditingCar(car);
    setFormData({
      marca: car.marca || '',
      modelo: car.modelo || '',
      año: car.año || new Date().getFullYear(),
      placa: car.placa || '',
      color: car.color || '',
      status: car.status || 'available',
      gas: car.gas || '',
      kilometraje: Number(car.kilometraje) || 0, // Por si viene como texto vacío desde Firebase
      comentarios: car.comentarios || '',
      mantenimiento: car.mantenimiento || getTodayString() // Si no tiene fecha, le pone la de hoy
    });
    setIsDialogOpen(true);
  };

  const filteredCars = cars.filter(car =>
    (car.marca || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (car.modelo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (car.placa || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: Car['status']) => {
    switch (status) {
      case 'available':
        return <Badge className="bg-green-500">Disponible</Badge>;
      case 'rented':
        return <Badge className="bg-blue-500">Alquilado</Badge>;
      case 'maintenance':
        return <Badge className="bg-orange-500">Mantenimiento</Badge>;
      default:
        return <Badge className="bg-gray-500">Desconocido</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Autos</h2>
          <p className="text-muted-foreground">Administra la flota de vehículos</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Auto
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingCar ? 'Editar Auto' : 'Agregar Nuevo Auto'}</DialogTitle>
              <DialogDescription>
                Completa la información del vehículo
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="marca">Marca</Label>
                  <Input
                    id="marca"
                    value={formData.marca}
                    onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                    placeholder="Toyota"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="modelo">Modelo</Label>
                  <Input
                    id="modelo"
                    value={formData.modelo}
                    onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                    placeholder="Corolla"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="año">Año</Label>
                  <Input
                    id="año"
                    type="number"
                    value={formData.año}
                    onChange={(e) => setFormData({ ...formData, año: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="placa">Placa</Label>
                  <Input
                    id="placa"
                    value={formData.placa}
                    onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                    placeholder="ABC-123"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="Blanco"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: Car['status']) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="available">Disponible</SelectItem>
                    <SelectItem value="rented">Alquilado</SelectItem>
                    <SelectItem value="maintenance">Mantenimiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="gas">Tipo de Combustible</Label>
                <Input
                  id="gas"
                  value={formData.gas}
                  onChange={(e) => setFormData({ ...formData, gas: e.target.value })}
                  placeholder="Gasolina, GNV, GLP..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kilometraje">Kilometraje</Label>
                <Input
                  id="kilometraje"
                  type="number"
                  value={formData.kilometraje}
                  onChange={(e) => setFormData({ ...formData, kilometraje: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comentarios">Comentarios</Label>
                <Input
                  id="comentarios"
                  value={formData.comentarios}
                  onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                  placeholder="Observaciones sobre el vehículo (Opcional)"
                />
              </div>
              <div className="space-y-2">
                {/* 3. CORREGIDO: Etiqueta visual actualizada, y el value maneja texto directamente */}
                <Label htmlFor="mantenimiento">Fecha de Ingreso</Label>
                <Input
                  id="mantenimiento"
                  type="date"
                  value={formData.mantenimiento}
                  onChange={(e) => setFormData({ ...formData, mantenimiento: e.target.value })}
                />
              </div>  
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingCar ? 'Actualizar' : 'Agregar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Buscar por marca, modelo o placa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCars.map((car) => (
          <Card key={car.id}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <CarIcon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">
                      {car.marca} {car.modelo}
                    </CardTitle>
                    <CardDescription>{car.año} • {car.placa}</CardDescription>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Color:</span>
                  <span className="text-sm font-medium">{car.color}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Combustible:</span>
                  <span className="text-sm font-medium">{car.gas}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Estado:</span>
                  {getStatusBadge(car.status)}
                </div>
                
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(car)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(car.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCars.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <CarIcon className="w-12 h-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">
              {searchTerm ? 'No se encontraron autos' : 'No hay autos registrados'}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}