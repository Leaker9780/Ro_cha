import { useState, useEffect } from 'react';
// Importaciones de Firebase
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Card,
  CardContent
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table';
// Agregamos ChevronLeft y ChevronRight para los botones de paginación
import { Plus, Navigation, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface Auto {
  id: string;
  marca: string;
  modelo: string;
  placa: string;
}

interface GPSData {
  id: string;
  adicional: number;
  diaGps: string;
  fecha: string;
  kilome: number;
  placa: string; 
  tiempMov: string;
}

export function GPSModule() {
  const [gpsList, setGpsList] = useState<GPSData[]>([]);
  const [autos, setAutos] = useState<Auto[]>([]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGPS, setEditingGPS] = useState<GPSData | null>(null);
  const [filterCarId, setFilterCarId] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // ESTADOS PARA LA PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 30; // Aquí defines cuántos quieres ver por página

  const getTodayString = () => new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    placa: '', 
    fecha: getTodayString(),
    tiempMov: '',
    kilome: 0
  });

  useEffect(() => {
    const unsubAutos = onSnapshot(collection(db, 'autos'), (snap) => {
      setAutos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Auto)));
    });

    const unsubGps = onSnapshot(collection(db, 'gps'), (snap) => {
      setGpsList(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as GPSData)));
    });

    return () => {
      unsubAutos();
      unsubGps();
    };
  }, []);

  // Si el usuario cambia los filtros, lo regresamos a la página 1
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCarId, filterStartDate, filterEndDate]);

  const resetForm = () => {
    setFormData({
      placa: '',
      fecha: getTodayString(),
      tiempMov: '',
      kilome: 0
    });
    setEditingGPS(null);
  };

  const getDayOfWeek = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString.replace(/-/g, '\/'));
    const day = format(date, 'EEEE', { locale: es });
    return day.charAt(0).toUpperCase() + day.slice(1); 
  };

  const calcularAdicional = (kilometraje: number) => {
    if (kilometraje < 210) return 0;
    const cobroExtra = Math.floor((kilometraje - 200) / 10) * 5;
    return Math.max(0, cobroExtra); 
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.placa || !formData.fecha) {
      toast.error('Por favor, completa los campos obligatorios');
      return;
    }

    const diaGps = getDayOfWeek(formData.fecha);
    const adicional = calcularAdicional(formData.kilome);

    const datosGuardar = {
      ...formData,
      diaGps,
      adicional
    };

    try {
      if (editingGPS) {
        await updateDoc(doc(db, 'gps', editingGPS.id), datosGuardar);
        toast.success('Registro GPS actualizado correctamente');
      } else {
        await addDoc(collection(db, 'gps'), datosGuardar);
        toast.success('Registro GPS agregado correctamente');
      }
      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error al guardar GPS:", error);
      toast.error('Ocurrió un error al guardar el registro');
    }
  };

  const handleEdit = (gps: GPSData) => {
    setEditingGPS(gps);
    setFormData({
      placa: gps.placa || '',
      fecha: gps.fecha || getTodayString(),
      tiempMov: gps.tiempMov || '',
      kilome: gps.kilome || 0
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este registro?')) {
      try {
        await deleteDoc(doc(db, 'gps', id));
        toast.success('Registro eliminado correctamente');
      } catch (error) {
        console.error("Error al eliminar:", error);
        toast.error('Error al eliminar el registro');
      }
    }
  };

  // Filtrado y ordenamiento general
  const filteredAndSortedGPSData = gpsList
    .filter(gps => {
      const carMatch = filterCarId === 'all' || gps.placa === filterCarId;
      const gpsDate = new Date(gps.fecha.replace(/-/g, '\/')).getTime();
      const startDate = filterStartDate ? new Date(filterStartDate.replace(/-/g, '\/')).getTime() : 0;
      const endDate = filterEndDate ? new Date(filterEndDate.replace(/-/g, '\/')).getTime() : Infinity;
      const startMatch = !filterStartDate || gpsDate >= startDate;
      const endMatch = !filterEndDate || gpsDate <= endDate;
      
      return carMatch && startMatch && endMatch;
    })
    .sort((a, b) => 
      new Date(b.fecha.replace(/-/g, '\/')).getTime() - new Date(a.fecha.replace(/-/g, '\/')).getTime()
    );

  // LÓGICA DE PAGINACIÓN
  const totalPages = Math.ceil(filteredAndSortedGPSData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  // Extraemos solo los 30 elementos de la página actual
  const currentItems = filteredAndSortedGPSData.slice(startIndex, startIndex + itemsPerPage);

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Seguimiento GPS</h2>
          <p className="text-muted-foreground">Control de movimiento y kilometraje</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Registro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingGPS ? 'Editar Registro GPS' : 'Nuevo Registro GPS'}</DialogTitle>
              <DialogDescription>
                Completa la información del seguimiento
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="placa">Vehículo *</Label>
                <Select
                  value={formData.placa}
                  onValueChange={(value) => setFormData({ ...formData, placa: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un auto" />
                  </SelectTrigger>
                  <SelectContent>
                    {autos.map(auto => (
                      <SelectItem key={auto.id} value={auto.id}>
                        {auto.marca} {auto.modelo} - {auto.placa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                />
                {formData.fecha && (
                  <p className="text-sm text-muted-foreground">
                    Día detectado: <span className="font-medium text-primary">{getDayOfWeek(formData.fecha)}</span>
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="tiempMov">Tiempo de Movimiento</Label>
                <Input
                  id="tiempMov"
                  type="text"
                  value={formData.tiempMov}
                  onChange={(e) => setFormData({ ...formData, tiempMov: e.target.value })}
                  placeholder="Ej. 3 h 27 min 24 s"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="kilome">Kilometraje Recorrido (km)</Label>
                <Input
                  id="kilome"
                  type="number"
                  step="0.1"
                  value={formData.kilome}
                  onChange={(e) => setFormData({ ...formData, kilome: parseFloat(e.target.value) || 0 })}
                  placeholder="Ej. 215.5"
                />
              </div>

              <div className="p-3 bg-muted rounded-lg flex justify-between items-center">
                <span className="text-sm font-medium">Cobro Adicional Generado:</span>
                <span className="text-lg font-bold text-orange-500">
                  S/ {calcularAdicional(formData.kilome).toFixed(2)}
                </span>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingGPS ? 'Actualizar' : 'Registrar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="filterCar">Filtrar por Vehículo</Label>
              <Select value={filterCarId} onValueChange={setFilterCarId}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los vehículos</SelectItem>
                  {autos.map(auto => (
                    <SelectItem key={auto.id} value={auto.id}>
                      {auto.marca} {auto.modelo} - {auto.placa}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filterStartDate">Desde</Label>
              <Input
                id="filterStartDate"
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filterEndDate">Hasta</Label>
              <Input
                id="filterEndDate"
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehículo</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Día</TableHead>
                <TableHead>Tiempo Mov.</TableHead>
                <TableHead>Kilometraje</TableHead>
                <TableHead>Adicional</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Iteramos sobre currentItems en lugar de toda la lista */}
              {currentItems.map((gps) => {
                const auto = autos.find(a => a.id === gps.placa);
                return (
                  <TableRow key={gps.id}>
                    <TableCell className="font-medium">
                      {auto ? `${auto.marca} ${auto.modelo} (${auto.placa})` : 'Auto no encontrado'}
                    </TableCell>
                    <TableCell>
                      {gps.fecha ? format(new Date(gps.fecha.replace(/-/g, '\/')), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell className="capitalize">{gps.diaGps}</TableCell>
                    <TableCell>{gps.tiempMov}</TableCell>
                    <TableCell>{gps.kilome.toFixed(1)} km</TableCell>
                    <TableCell className="font-bold text-orange-600">
                      {gps.adicional > 0 ? `+ S/ ${gps.adicional}` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(gps)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(gps.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {/* CONTROLES DE PAGINACIÓN */}
          {filteredAndSortedGPSData.length > 0 && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredAndSortedGPSData.length)} de {filteredAndSortedGPSData.length} registros
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                </Button>
                <div className="text-sm font-medium">
                  Página {currentPage} de {totalPages || 1}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleNextPage}
                  disabled={currentPage >= totalPages || totalPages === 0}
                >
                  Siguiente <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {filteredAndSortedGPSData.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Navigation className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay registros GPS</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}