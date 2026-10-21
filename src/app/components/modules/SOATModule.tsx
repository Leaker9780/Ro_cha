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
import { Badge } from '../ui/badge';
import { Plus, Shield, AlertCircle, Edit, Trash2, ChevronLeft, ChevronRight, Archive } from 'lucide-react';
import { toast } from 'sonner';
import { differenceInDays, format } from 'date-fns';

// 1. Interfaces
interface Auto {
  id: string;
  marca: string;
  modelo: string;
  placa: string;
}

interface SOATData {
  id: string;
  aseguradora: string;
  cobertura: string;
  comentario: string;
  concepto: string;
  fecha: string;
  forma: string;
  medio: string;
  monto: string;
  placa: string; 
  isArchived?: boolean; // Etiqueta virtual para saber si es un SOAT viejo
}

export function SOATModule() {
  const [soats, setSoats] = useState<SOATData[]>([]);
  const [autos, setAutos] = useState<Auto[]>([]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSOAT, setEditingSOAT] = useState<SOATData | null>(null);

  // Estados para filtro y paginación
  const [filterCarId, setFilterCarId] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; 

  const getTodayString = () => new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    placa: '',
    aseguradora: '',
    fechaTramite: getTodayString(),
    fechaInicio: '',
    fechaFin: '',
    monto: '',
    forma: 'Tarjeta',
    medio: '',
    comentario: ''
  });

  // 3. Conexión a Firestore
  useEffect(() => {
    const unsubAutos = onSnapshot(collection(db, 'autos'), (snap) => {
      setAutos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Auto)));
    });

    const unsubSoat = onSnapshot(collection(db, 'soat'), (snap) => {
      // Extraemos todos los datos
      const rawSoats = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SOATData));
      
      // LÓGICA DE HISTORIAL: Agrupamos por placa para encontrar el más reciente
      const latestSoatsByCar = new Map<string, number>();
      
      // Encontramos la fecha de fin más reciente para cada placa
      rawSoats.forEach(soat => {
        if (!soat.cobertura) return;
        const fechas = soat.cobertura.split(' - ');
        if (fechas.length < 2) return;
        
        // Decodificamos la fecha fin "DD/MM/YYYY" a timestamp
        const [d, m, y] = fechas[1].split('/');
        const endTimestamp = new Date(`${y}-${m}-${d}T00:00:00`).getTime();
        
        if (!latestSoatsByCar.has(soat.placa) || endTimestamp > (latestSoatsByCar.get(soat.placa) || 0)) {
          latestSoatsByCar.set(soat.placa, endTimestamp);
        }
      });

      // Marcamos los SOATs viejos como "archivados"
      const processedSoats = rawSoats.map(soat => {
        if (!soat.cobertura) return { ...soat, isArchived: true };
        const fechas = soat.cobertura.split(' - ');
        if (fechas.length < 2) return { ...soat, isArchived: true };
        
        const [d, m, y] = fechas[1].split('/');
        const endTimestamp = new Date(`${y}-${m}-${d}T00:00:00`).getTime();
        
        // Si su fecha fin no es la más reciente de ese auto, es un SOAT viejo
        const isArchived = endTimestamp < (latestSoatsByCar.get(soat.placa) || 0);
        
        return { ...soat, isArchived };
      });

      setSoats(processedSoats);
    });

    return () => {
      unsubAutos();
      unsubSoat();
    };
  }, []);

  // Reiniciar página al cambiar filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [filterCarId]);

  const resetForm = () => {
    setFormData({
      placa: '',
      aseguradora: '',
      fechaTramite: getTodayString(),
      fechaInicio: '',
      fechaFin: '',
      monto: '',
      forma: 'Tarjeta',
      medio: '',
      comentario: ''
    });
    setEditingSOAT(null);
  };

  const formatearFechaParaBD = (fechaStr: string) => {
    if (!fechaStr) return '';
    const [y, m, d] = fechaStr.split('-');
    return `${d}/${m}/${y}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.placa || !formData.aseguradora || !formData.fechaInicio || !formData.fechaFin) {
      toast.error('Por favor, completa los campos obligatorios del SOAT');
      return;
    }

    const coberturaArmada = `${formatearFechaParaBD(formData.fechaInicio)} - ${formatearFechaParaBD(formData.fechaFin)}`;

    const datosGuardar = {
      placa: formData.placa,
      aseguradora: formData.aseguradora,
      fecha: formData.fechaTramite,
      cobertura: coberturaArmada,
      monto: formData.monto.toString(),
      concepto: 'Soat',
      forma: formData.forma,
      medio: formData.medio,
      comentario: formData.comentario
    };

    try {
      if (editingSOAT) {
        await updateDoc(doc(db, 'soat', editingSOAT.id), datosGuardar);
        toast.success('SOAT actualizado correctamente');
      } else {
        await addDoc(collection(db, 'soat'), datosGuardar);
        toast.success('SOAT registrado correctamente');
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error al guardar SOAT:", error);
      toast.error('Ocurrió un error al guardar el seguro');
    }
  };

  const decodificarFechaParaInput = (fechaBD: string) => {
    if (!fechaBD) return '';
    const [d, m, y] = fechaBD.split('/');
    return `${y}-${m}-${d}`;
  };

  const handleEdit = (soat: SOATData) => {
    setEditingSOAT(soat);
    const fechas = soat.cobertura ? soat.cobertura.split(' - ') : ['', ''];
    
    setFormData({
      placa: soat.placa || '',
      aseguradora: soat.aseguradora || '',
      fechaTramite: soat.fecha || getTodayString(),
      fechaInicio: decodificarFechaParaInput(fechas[0]),
      fechaFin: decodificarFechaParaInput(fechas[1]),
      monto: soat.monto || '',
      forma: soat.forma || 'Tarjeta',
      medio: soat.medio || '',
      comentario: soat.comentario || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este SOAT?')) {
      try {
        await deleteDoc(doc(db, 'soat', id));
        toast.success('SOAT eliminado correctamente');
      } catch (error) {
        console.error("Error al eliminar:", error);
        toast.error('Error al eliminar el SOAT');
      }
    }
  };

  const getExpiryStatus = (cobertura: string, isArchived?: boolean) => {
    if (!cobertura) return { badge: <Badge className="bg-gray-500">Sin datos</Badge>, days: 0 };
    
    // Si el sistema lo marcó como viejo, mostramos el badge de Archivado en lugar de la alerta
    if (isArchived) {
      return { 
        badge: <Badge variant="secondary" className="bg-gray-200 text-gray-700 hover:bg-gray-300">Archivado</Badge>, 
        days: 0 
      };
    }

    const fechas = cobertura.split(' - ');
    if (fechas.length < 2) return { badge: <Badge className="bg-gray-500">Error</Badge>, days: 0 };

    const fechaFinISO = decodificarFechaParaInput(fechas[1]);
    const end = new Date(fechaFinISO.replace(/-/g, '\/'));
    const today = new Date();
    
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const days = differenceInDays(end, today);

    if (days < 0) {
      return { badge: <Badge className="bg-red-500">Vencido</Badge>, days };
    } else if (days <= 7) {
      return { badge: <Badge className="bg-orange-500">Por vencer</Badge>, days };
    } else if (days <= 30) {
      return { badge: <Badge className="bg-yellow-500">Próximo</Badge>, days };
    } else {
      return { badge: <Badge className="bg-green-500">Vigente</Badge>, days };
    }
  };

  // Filtrado, Ordenamiento (los vigentes primero, luego los archivados)
  const filteredAndSortedSoats = soats
    .filter(s => filterCarId === 'all' || s.placa === filterCarId)
    .sort((a, b) => {
      // Primero ordenamos para que los Archivados vayan al final de la lista
      if (a.isArchived !== b.isArchived) {
        return a.isArchived ? 1 : -1;
      }
      // Luego ordenamos por fecha de trámite
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });

  const totalPages = Math.ceil(filteredAndSortedSoats.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredAndSortedSoats.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de SOAT</h2>
          <p className="text-muted-foreground">Control de seguros obligatorios e historial</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Registrar SOAT
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingSOAT ? 'Editar SOAT' : 'Registrar SOAT'}</DialogTitle>
              <DialogDescription>
                Completa la información del seguro y el pago
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
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
                <Label htmlFor="aseguradora">Compañía de Seguros *</Label>
                <Select
                  value={formData.aseguradora}
                  onValueChange={(value) => setFormData({ ...formData, aseguradora: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona la aseguradora" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MAPFRE">MAPFRE</SelectItem>
                    <SelectItem value="Rímac Seguros">Rímac Seguros</SelectItem>
                    <SelectItem value="Pacífico Seguros">Pacífico Seguros</SelectItem>
                    <SelectItem value="La Positiva">La Positiva</SelectItem>
                    <SelectItem value="Interseguro">Interseguro</SelectItem>
                    <SelectItem value="Protecta">Protecta</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fechaInicio">Inicio Cobertura *</Label>
                  <Input
                    id="fechaInicio"
                    type="date"
                    value={formData.fechaInicio}
                    onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaFin">Fin Cobertura *</Label>
                  <Input
                    id="fechaFin"
                    type="date"
                    value={formData.fechaFin}
                    onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-2">
                  <Label htmlFor="monto">Costo (S/)</Label>
                  <Input
                    id="monto"
                    type="number"
                    step="0.01"
                    value={formData.monto}
                    onChange={(e) => setFormData({ ...formData, monto: e.target.value })}
                    placeholder="Ej. 68"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaTramite">Fecha de Trámite</Label>
                  <Input
                    id="fechaTramite"
                    type="date"
                    value={formData.fechaTramite}
                    onChange={(e) => setFormData({ ...formData, fechaTramite: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="forma">Forma de Pago</Label>
                  <Select
                    value={formData.forma}
                    onValueChange={(value) => setFormData({ ...formData, forma: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Tarjeta">Tarjeta</SelectItem>
                      <SelectItem value="Efectivo">Efectivo</SelectItem>
                      <SelectItem value="Transferencia">Transferencia</SelectItem>
                      <SelectItem value="Yape/Plin">Yape/Plin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="medio">Medio/Banco</Label>
                  <Input
                    id="medio"
                    value={formData.medio}
                    onChange={(e) => setFormData({ ...formData, medio: e.target.value.toUpperCase() })}
                    placeholder="Ej. BCP LRA"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comentario">Comentarios</Label>
                <Input
                  id="comentario"
                  value={formData.comentario}
                  onChange={(e) => setFormData({ ...formData, comentario: e.target.value })}
                  placeholder="Ej. STARGAIZER - HYUNDAI"
                />
              </div>

              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editingSOAT ? 'Actualizar' : 'Registrar'}</Button>
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
                <TableHead>Aseguradora</TableHead>
                <TableHead>Cobertura</TableHead>
                <TableHead>Días Restantes</TableHead>
                <TableHead>Costo y Pago</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.map((soat) => {
                const autoInfo = autos.find(c => c.id === soat.placa);
                const { badge, days } = getExpiryStatus(soat.cobertura, soat.isArchived);
                
                return (
                  <TableRow key={soat.id} className={soat.isArchived ? "opacity-60 bg-muted/30" : ""}>
                    <TableCell className="font-medium">
                      <div className="flex flex-col">
                        <span>{autoInfo ? `${autoInfo.marca} ${autoInfo.modelo} (${autoInfo.placa})` : 'Auto no encontrado'}</span>
                        {soat.isArchived && <span className="text-xs text-muted-foreground flex items-center"><Archive className="w-3 h-3 mr-1"/> Historial</span>}
                      </div>
                    </TableCell>
                    <TableCell>{soat.aseguradora}</TableCell>
                    <TableCell className="text-sm">
                      {soat.cobertura || '-'}
                    </TableCell>
                    <TableCell>
                      {soat.isArchived ? (
                        <span className="text-muted-foreground">-</span>
                      ) : days < 0 ? (
                        <span className="text-red-500 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-4 h-4" />
                          {Math.abs(days)} vencidos
                        </span>
                      ) : days <= 30 ? (
                        <span className="text-orange-500 flex items-center gap-1 font-medium">
                          <AlertCircle className="w-4 h-4" />
                          {days} días
                        </span>
                      ) : (
                        <span>{days} días</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-bold">S/ {soat.monto || '0.00'}</span>
                        {soat.medio && <span className="text-xs text-muted-foreground">{soat.forma} - {soat.medio}</span>}
                      </div>
                    </TableCell>
                    <TableCell>{badge}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(soat)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(soat.id)}
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
          {filteredAndSortedSoats.length > 0 && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, filteredAndSortedSoats.length)} de {filteredAndSortedSoats.length} SOATs
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

          {filteredAndSortedSoats.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Shield className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay SOATs en este filtro</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}