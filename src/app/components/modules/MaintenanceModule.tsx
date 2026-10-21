import { useState, useEffect } from 'react';
// Importaciones de Firebase
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
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
import { Badge } from '../ui/badge';
import { Plus, Wrench, Edit, Trash2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Auto {
  id: string;
  marca: string;
  modelo: string;
  placa: string;
}

interface MaintenanceDetail {
  detalle: string;
  monto: string;
  formaP: string;
}

interface MaintenanceData {
  id: string;
  fecha: string;
  km: string;
  placa: string;
  total: number;
  detalles: MaintenanceDetail[];
}

export function MaintenanceModule() {
  const [mantenimientos, setMantenimientos] = useState<MaintenanceData[]>([]);
  const [autos, setAutos] = useState<Auto[]>([]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingMaintenance, setEditingMaintenance] = useState<MaintenanceData | null>(null);

  // Filtros
  const [filterCarId, setFilterCarId] = useState<string>('all');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const getTodayString = () => new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    placa: '',
    fecha: getTodayString(),
    km: '',
    detalles: [] as MaintenanceDetail[]
  });

  const [currentDetail, setCurrentDetail] = useState<MaintenanceDetail>({
    detalle: '',
    monto: '',
    formaP: 'Efectivo'
  });

  useEffect(() => {
    const unsubAutos = onSnapshot(collection(db, 'autos'), (snap) => {
      setAutos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Auto)));
    });

    const unsubMantenimiento = onSnapshot(collection(db, 'mantenimiento'), (snap) => {
      setMantenimientos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceData)));
    });

    return () => {
      unsubAutos();
      unsubMantenimiento();
    };
  }, []);

  // Si el usuario cambia el filtro, lo regresamos a la página 1
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCarId]);

  const resetForm = () => {
    setFormData({
      placa: '',
      fecha: getTodayString(),
      km: '',
      detalles: []
    });
    setCurrentDetail({
      detalle: '',
      monto: '',
      formaP: 'Efectivo'
    });
    setEditingMaintenance(null);
  };

  const handleAddDetail = () => {
    if (!currentDetail.detalle || !currentDetail.monto || !currentDetail.formaP) {
      toast.error('Completa la descripción y el costo del detalle');
      return;
    }

    setFormData({
      ...formData,
      detalles: [...formData.detalles, currentDetail]
    });

    setCurrentDetail({
      detalle: '',
      monto: '',
      formaP: 'Efectivo'
    });
    toast.success('Servicio agregado a la lista');
  };

  const handleRemoveDetail = (index: number) => {
    setFormData({
      ...formData,
      detalles: formData.detalles.filter((_, i) => i !== index)
    });
  };

  const getTotalCost = (detalles: MaintenanceDetail[]) => {
    return detalles.reduce((sum, d) => sum + (parseFloat(d.monto) || 0), 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.placa || !formData.fecha) {
      toast.error('Por favor, selecciona un vehículo y una fecha');
      return;
    }

    if (formData.detalles.length === 0) {
      toast.error('Agrega al menos un servicio o repuesto a la lista');
      return;
    }

    const total = getTotalCost(formData.detalles);
    
    const datosGuardar = {
      placa: formData.placa,
      fecha: formData.fecha,
      km: formData.km.toString(),
      detalles: formData.detalles,
      total: total 
    };

    try {
      if (editingMaintenance) {
        await updateDoc(doc(db, 'mantenimiento', editingMaintenance.id), datosGuardar);
        toast.success('Mantenimiento actualizado correctamente');
      } else {
        await addDoc(collection(db, 'mantenimiento'), datosGuardar);
        toast.success('Mantenimiento registrado correctamente');
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error al guardar:", error);
      toast.error('Ocurrió un error al guardar el mantenimiento');
    }
  };

  const handleEdit = (m: MaintenanceData) => {
    setEditingMaintenance(m);
    setFormData({
      placa: m.placa || '',
      fecha: m.fecha || getTodayString(),
      km: m.km || '',
      detalles: m.detalles || []
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar todo el registro de mantenimiento?')) {
      try {
        await deleteDoc(doc(db, 'mantenimiento', id));
        toast.success('Registro eliminado correctamente');
      } catch (error) {
        console.error("Error al eliminar:", error);
        toast.error('Error al eliminar el registro');
      }
    }
  };

  // Filtrar y ordenar
  const filteredAndSortedMaintenance = mantenimientos
    .filter(m => filterCarId === 'all' || m.placa === filterCarId)
    .sort((a, b) => {
      return new Date(b.fecha.replace(/-/g, '\/')).getTime() - new Date(a.fecha.replace(/-/g, '\/')).getTime();
    });

  const totalPages = Math.ceil(filteredAndSortedMaintenance.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredAndSortedMaintenance.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Mantenimiento Taller</h2>
          <p className="text-muted-foreground">Historial y gastos de servicios mecánicos</p>
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
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingMaintenance ? 'Editar Registro de Taller' : 'Nuevo Registro de Taller'}
              </DialogTitle>
              <DialogDescription>
                Ingresa los datos generales y luego añade cada servicio realizado.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              <div className="grid grid-cols-2 gap-4">
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
                      {autos.map(car => (
                        <SelectItem key={car.id} value={car.id}>
                          {car.marca} {car.modelo} - {car.placa}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha">Fecha del Servicio *</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="km">Kilometraje (Opcional)</Label>
                <Input
                  id="km"
                  type="number"
                  value={formData.km}
                  onChange={(e) => setFormData({ ...formData, km: e.target.value })}
                  placeholder="Ej. 134000"
                />
              </div>

              <div className="border-t pt-4 space-y-4">
                <h3 className="font-semibold text-lg text-primary">Agregar Repuesto o Servicio</h3>

                <div className="grid grid-cols-1 gap-4 p-4 bg-muted/50 border rounded-lg">
                  <div className="space-y-2">
                    <Label htmlFor="detalleDescripcion">Descripción</Label>
                    <Textarea
                      id="detalleDescripcion"
                      value={currentDetail.detalle}
                      onChange={(e) => setCurrentDetail({ ...currentDetail, detalle: e.target.value })}
                      placeholder="Ej: Cambio de aceite y filtro, Cambio Bujía Iridian..."
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="detalleMonto">Costo (S/)</Label>
                      <Input
                        id="detalleMonto"
                        type="number"
                        step="0.01"
                        value={currentDetail.monto}
                        onChange={(e) => setCurrentDetail({ ...currentDetail, monto: e.target.value })}
                        placeholder="140"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="detalleFormaP">Método de Pago</Label>
                      <Select
                        value={currentDetail.formaP}
                        onValueChange={(value) => setCurrentDetail({ ...currentDetail, formaP: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Efectivo">Efectivo</SelectItem>
                          <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                          <SelectItem value="Yape">Yape</SelectItem>
                          <SelectItem value="Plin">Plin</SelectItem>
                          <SelectItem value="Transferencia">Transferencia</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button type="button" onClick={handleAddDetail} variant="secondary" className="w-full">
                    <Plus className="w-4 h-4 mr-2" />
                    Añadir a la lista
                  </Button>
                </div>

                {formData.detalles.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <Label>Servicios a registrar ({formData.detalles.length})</Label>
                    <div className="space-y-2">
                      {formData.detalles.map((item, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-card border rounded-lg">
                          <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium">{item.detalle}</p>
                            <div className="flex gap-4 text-xs text-muted-foreground">
                              <span className="font-bold text-primary">S/ {parseFloat(item.monto).toFixed(2)}</span>
                              <span>•</span>
                              <span>{item.formaP}</span>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRemoveDetail(index)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                      
                      <div className="p-3 bg-primary text-primary-foreground rounded-lg flex justify-between items-center mt-2">
                        <span className="font-semibold">Costo Total del Taller:</span>
                        <span className="text-lg font-bold">S/ {getTotalCost(formData.detalles).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <DialogFooter className="pt-4 border-t">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingMaintenance ? 'Guardar Cambios' : 'Registrar Mantenimiento Completo'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tarjeta de Filtro */}
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
                <TableHead>Kilometraje</TableHead>
                <TableHead>Detalle de Servicios</TableHead>
                <TableHead>Costo Total</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.map((m) => {
                const car = autos.find(c => c.id === m.placa);
                return (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {car ? `${car.marca} ${car.modelo} (${car.placa})` : 'Auto no encontrado'}
                    </TableCell>
                    <TableCell>
                      {m.fecha ? format(new Date(m.fecha.replace(/-/g, '\/')), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      {m.km ? `${parseInt(m.km).toLocaleString()} km` : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1 max-w-xs">
                        {m.detalles && m.detalles.length > 0 ? (
                          <>
                            <span className="text-sm truncate" title={m.detalles[0].detalle}>
                              • {m.detalles[0].detalle}
                            </span>
                            {m.detalles.length > 1 && (
                              <span className="text-xs text-muted-foreground italic">
                                + {m.detalles.length - 1} servicio(s) más
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-sm text-muted-foreground">Sin detalles</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-red-600">
                      S/ {m.total ? m.total.toFixed(2) : '0.00'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(m)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(m.id)}
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
          
          {filteredAndSortedMaintenance.length > 0 && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredAndSortedMaintenance.length)} de {filteredAndSortedMaintenance.length} registros
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
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
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage >= totalPages || totalPages === 0}
                >
                  Siguiente <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {filteredAndSortedMaintenance.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Wrench className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay mantenimientos encontrados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}