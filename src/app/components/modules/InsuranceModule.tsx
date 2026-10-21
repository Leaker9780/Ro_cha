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
import { Plus, ShieldCheck, AlertCircle, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format, differenceInDays } from 'date-fns';

// 1. Interfaces adaptadas a tu Firestore
interface Auto {
  id: string;
  marca: string;
  modelo: string;
  placa: string;
}

interface SeguroData {
  id: string;
  placa: string; // Guarda el ID del Auto
  concepto: string;
  fecha: string;
  formaP: string;
  monto: string;
  comentario: string; // Aquí se suele poner "FIN DD/MM/YYYY"
}

export function InsuranceModule() {
  const [seguros, setSeguros] = useState<SeguroData[]>([]);
  const [autos, setAutos] = useState<Auto[]>([]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSeguro, setEditingSeguro] = useState<SeguroData | null>(null);

  // Filtros y Paginación
  const [filterCarId, setFilterCarId] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const getTodayString = () => new Date().toISOString().split('T')[0];

  // 2. Estado del formulario mapeado a tu estructura
  const [formData, setFormData] = useState({
    placa: '',
    fecha: getTodayString(),
    concepto: '',
    formaP: '',
    monto: '',
    comentario: ''
  });

  // 3. Conexión a Firestore
  useEffect(() => {
    const unsubAutos = onSnapshot(collection(db, 'autos'), (snap) => {
      setAutos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Auto)));
    });

    const unsubSeguros = onSnapshot(collection(db, 'seguros'), (snap) => {
      setSeguros(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SeguroData)));
    });

    return () => {
      unsubAutos();
      unsubSeguros();
    };
  }, []);

  // Regresar a página 1 al filtrar
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCarId]);

  const resetForm = () => {
    setFormData({
      placa: '',
      fecha: getTodayString(),
      concepto: '',
      formaP: '',
      monto: '',
      comentario: ''
    });
    setEditingSeguro(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.placa || !formData.concepto || !formData.monto) {
      toast.error('Por favor, completa el vehículo, concepto y monto');
      return;
    }

    const datosGuardar = {
      placa: formData.placa,
      fecha: formData.fecha,
      concepto: formData.concepto,
      formaP: formData.formaP,
      monto: formData.monto.toString(), // Forzar a texto como en tu BD
      comentario: formData.comentario
    };

    try {
      if (editingSeguro) {
        await updateDoc(doc(db, 'seguros', editingSeguro.id), datosGuardar);
        toast.success('Seguro actualizado correctamente');
      } else {
        await addDoc(collection(db, 'seguros'), datosGuardar);
        toast.success('Seguro registrado correctamente');
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error al guardar:", error);
      toast.error('Ocurrió un error al guardar el seguro');
    }
  };

  const handleEdit = (seguro: SeguroData) => {
    setEditingSeguro(seguro);
    setFormData({
      placa: seguro.placa || '',
      fecha: seguro.fecha || getTodayString(),
      concepto: seguro.concepto || '',
      formaP: seguro.formaP || '',
      monto: seguro.monto || '',
      comentario: seguro.comentario || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este seguro?')) {
      try {
        await deleteDoc(doc(db, 'seguros', id));
        toast.success('Seguro eliminado correctamente');
      } catch (error) {
        console.error("Error al eliminar:", error);
        toast.error('Error al eliminar el seguro');
      }
    }
  };

  // Función para extraer la fecha del texto "FIN 18/08/2026" y calcular los días
  const getExpiryStatus = (comentario: string) => {
    if (!comentario) return { badge: <Badge className="bg-gray-500">Sin fecha</Badge>, days: 0, hasDate: false };
    
    // Buscamos algo parecido a una fecha DD/MM/YYYY en el texto
    const dateMatch = comentario.match(/(\d{2})\/(\d{2})\/(\d{4})/);
    
    if (!dateMatch) return { badge: <Badge className="bg-gray-500">Sin fecha</Badge>, days: 0, hasDate: false };

    // Construimos la fecha válida para JavaScript (YYYY-MM-DD)
    const expiryDate = new Date(`${dateMatch[3]}-${dateMatch[2]}-${dateMatch[1]}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days = differenceInDays(expiryDate, today);

    if (days < 0) {
      return { badge: <Badge className="bg-red-500">Vencido</Badge>, days, hasDate: true };
    } else if (days <= 7) {
      return { badge: <Badge className="bg-orange-500">Por vencer</Badge>, days, hasDate: true };
    } else if (days <= 30) {
      return { badge: <Badge className="bg-yellow-500">Próximo</Badge>, days, hasDate: true };
    } else {
      return { badge: <Badge className="bg-green-500">Vigente</Badge>, days, hasDate: true };
    }
  };

  // Filtrado y Ordenamiento
  const filteredAndSortedSeguros = seguros
    .filter(s => filterCarId === 'all' || s.placa === filterCarId)
    .sort((a, b) => new Date(b.fecha.replace(/-/g, '\/')).getTime() - new Date(a.fecha.replace(/-/g, '\/')).getTime());

  // Paginación
  const totalPages = Math.ceil(filteredAndSortedSeguros.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredAndSortedSeguros.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Seguros Vehiculares</h2>
          <p className="text-muted-foreground">Control de pólizas y GPS</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Seguro
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSeguro ? 'Editar Seguro' : 'Registrar Nuevo Seguro'}</DialogTitle>
              <DialogDescription>
                Completa la información de la póliza
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
                    {autos.map(car => (
                      <SelectItem key={car.id} value={car.id}>
                        {car.marca} {car.modelo} - {car.placa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="concepto">Concepto *</Label>
                <Select
                  value={formData.concepto}
                  onValueChange={(value) => setFormData({ ...formData, concepto: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Ej. Seguro Pacífico, Seguro GPS..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Seguro Todo Riesgo">Seguro Todo Riesgo</SelectItem>
                    <SelectItem value="Seguro Pacífico">Seguro Pacífico</SelectItem>
                    <SelectItem value="Seguro Rímac">Seguro Rímac</SelectItem>
                    <SelectItem value="Seguro Mapfre">Seguro Mapfre</SelectItem>
                    <SelectItem value="Seguro GPS">Seguro GPS</SelectItem>
                    <SelectItem value="Seguro Contra Terceros">Seguro Contra Terceros</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="monto">Monto (S/) *</Label>
                  <Input
                    id="monto"
                    type="number"
                    step="0.01"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                    placeholder="Ej. 37.79"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fecha">Fecha del Pago</Label>
                  <Input
                    id="fecha"
                    type="date"
                    value={formData.fecha}
                    onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="formaP">Método de Pago</Label>
                <Input
                  id="formaP"
                  value={formData.formaP}
                  onChange={(e) => setFormData({ ...formData, formaP: e.target.value.toUpperCase() })}
                  placeholder="Ej. VISA BCP, EFECTIVO, YAPE..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="comentario">Comentarios (Vencimiento)</Label>
                <Textarea
                  id="comentario"
                  value={formData.comentario}
                  onChange={(e) => setFormData({ ...formData, comentario: e.target.value.toUpperCase() })}
                  placeholder="Ej. FIN 18/08/2026"
                  rows={2}
                />
                <p className="text-xs text-muted-foreground">
                  Si incluyes una fecha como DD/MM/YYYY, el sistema calculará los días automáticamente.
                </p>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingSeguro ? 'Actualizar' : 'Registrar'}
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehículo</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead>Monto / Pago</TableHead>
                <TableHead>Fecha Trámite</TableHead>
                <TableHead>Días Restantes</TableHead>
                <TableHead>Comentarios</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.map((seguro) => {
                const car = autos.find(c => c.id === seguro.placa);
                const { badge, days, hasDate } = getExpiryStatus(seguro.comentario);
                
                return (
                  <TableRow key={seguro.id}>
                    <TableCell className="font-medium">
                      {car ? `${car.marca} ${car.modelo} (${car.placa})` : 'Auto no encontrado'}
                    </TableCell>
                    <TableCell>{seguro.concepto}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold">S/ {seguro.monto}</span>
                        {seguro.formaP && <span className="text-xs text-muted-foreground">{seguro.formaP}</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      {seguro.fecha ? format(new Date(seguro.fecha.replace(/-/g, '\/')), 'dd/MM/yyyy') : '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        {badge}
                        {hasDate && (
                          <span className={`text-xs font-medium ${days < 0 ? 'text-red-500' : 'text-muted-foreground'}`}>
                            {days < 0 ? `${Math.abs(days)} días vencido` : `${days} días`}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {seguro.comentario || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(seguro)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(seguro.id)}
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

          {filteredAndSortedSeguros.length > 0 && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredAndSortedSeguros.length)} de {filteredAndSortedSeguros.length} seguros
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

          {filteredAndSortedSeguros.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <ShieldCheck className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay seguros registrados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}