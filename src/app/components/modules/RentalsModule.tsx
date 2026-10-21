import { useState, useEffect } from 'react';
// Firebase
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

import { Car, Alquiler, Chofer } from '../../types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table';
import { Badge } from '../ui/badge';
import { 
  Plus, 
  FileText, 
  Edit, 
  Trash2, 
  CheckCircle2, 
  RotateCcw, 
  Search, 
  DollarSign,
  Car as CarIcon
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

export function RentalsModule() {
  const [alquileres, setAlquileres] = useState<Alquiler[]>([]);
  const [autos, setAutos] = useState<Car[]>([]);
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRental, setEditingRental] = useState<Alquiler | null>(null);

  // Filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'activo' | 'finalizado'>('all');

  const getTodayString = () => new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    idAuto: '',
    idChofer: '',
    fechaInicio: getTodayString(),
    fechaFin: '',
    garantia: '',
    importe: '',
    comentarios: '',
    metodoPago: 'Efectivo',
    registrarPagoFinanzas: true
  });

  // Conexión en tiempo real a las colecciones
  useEffect(() => {
    const unsubAutos = onSnapshot(collection(db, 'autos'), (snap) => {
      setAutos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Car)));
    });

    const unsubChoferes = onSnapshot(collection(db, 'choferes'), (snap) => {
      setChoferes(snap.docs.map(d => ({ id: d.id, ...d.data() } as Chofer)));
    });

    const unsubAlquileres = onSnapshot(collection(db, 'alquileres'), (snap) => {
      setAlquileres(snap.docs.map(d => ({ id: d.id, ...d.data() } as Alquiler)));
    });

    return () => {
      unsubAutos();
      unsubChoferes();
      unsubAlquileres();
    };
  }, []);

  const resetForm = () => {
    setFormData({
      idAuto: '',
      idChofer: '',
      fechaInicio: getTodayString(),
      fechaFin: '',
      garantia: '',
      importe: '',
      comentarios: '',
      metodoPago: 'Efectivo',
      registrarPagoFinanzas: true
    });
    setEditingRental(null);
  };

  const handleSelectAuto = (autoId: string) => {
    const selectedCar = autos.find(a => a.id === autoId);
    setFormData(prev => ({
      ...prev,
      idAuto: autoId,
      // Si el importe está vacío y el auto tiene tarifa diaria configurada, la sugerimos
      importe: prev.importe || (selectedCar?.kilometraje ? String(selectedCar.kilometraje) : '')
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.idAuto || !formData.idChofer || !formData.fechaInicio || !formData.importe) {
      toast.error('Por favor, completa los campos obligatorios (Auto, Chofer, Fecha e Importe)');
      return;
    }

    try {
      if (editingRental) {
        const docRef = doc(db, 'alquileres', editingRental.id);
        await updateDoc(docRef, {
          idAuto: formData.idAuto,
          idChofer: formData.idChofer,
          fechaInicio: formData.fechaInicio,
          fechaFin: formData.fechaFin,
          garantia: formData.garantia,
          importe: formData.importe,
          comentarios: formData.comentarios,
          metodoPago: formData.metodoPago
        });

        // Si cambió el auto asignado en el contrato:
        if (editingRental.idAuto !== formData.idAuto) {
          if (editingRental.idAuto) {
            await updateDoc(doc(db, 'autos', editingRental.idAuto), { status: 'available' });
          }
          await updateDoc(doc(db, 'autos', formData.idAuto), { status: 'rented' });
        }

        toast.success('Alquiler actualizado correctamente');
      } else {
        const alquileresRef = collection(db, 'alquileres');
        const nuevoAlquiler = {
          idAuto: formData.idAuto,
          idChofer: formData.idChofer,
          fechaInicio: formData.fechaInicio,
          fechaFin: formData.fechaFin,
          garantia: formData.garantia,
          importe: formData.importe,
          comentarios: formData.comentarios,
          metodoPago: formData.metodoPago,
          estado: 'activo'
        };

        const newDocRef = await addDoc(alquileresRef, nuevoAlquiler);

        // 1. Automatización: Cambiar estado del auto a 'rented'
        await updateDoc(doc(db, 'autos', formData.idAuto), { status: 'rented' });

        // 2. Automatización: Asentar cobro en la colección de finanzas 'pagos'
        if (formData.registrarPagoFinanzas && parseFloat(formData.importe) > 0) {
          const autoInfo = autos.find(a => a.id === formData.idAuto);
          const choferInfo = choferes.find(c => c.id === formData.idChofer);
          const autoDesc = autoInfo ? `${autoInfo.marca} ${autoInfo.modelo} (${autoInfo.placa})` : 'Vehículo';
          const choferDesc = choferInfo ? ` - Chofer: ${choferInfo.Nombre}` : '';

          const nuevoPago = {
            fechaPago: formData.fechaInicio || getTodayString(),
            pago_realizado: formData.importe.toString(),
            importe_pago: formData.importe.toString(),
            metodo_pago: formData.metodoPago || 'Efectivo',
            comentario: `Alquiler: ${autoDesc}${choferDesc}`,
            deuda: "0",
            diaPago: "",
            idAlquiler: newDocRef.id,
            idAuto: formData.idAuto,
            verificar: "Automático (Alquiler)"
          };
          await addDoc(collection(db, 'pagos'), nuevoPago);

          // Si hay garantía registrada, también se asienta en finanzas
          if (parseFloat(formData.garantia) > 0) {
            const pagoGarantia = {
              fechaPago: formData.fechaInicio || getTodayString(),
              pago_realizado: formData.garantia.toString(),
              importe_pago: formData.garantia.toString(),
              metodo_pago: formData.metodoPago || 'Efectivo',
              comentario: `Garantía (depósito): ${autoDesc}${choferDesc}`,
              deuda: "0",
              diaPago: "",
              idAlquiler: newDocRef.id,
              idAuto: formData.idAuto,
              verificar: "Automático (Garantía)"
            };
            await addDoc(collection(db, 'pagos'), pagoGarantia);
          }
        }

        toast.success('Alquiler registrado, vehículo marcado como Alquilado y cobro asentado en Finanzas');
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error al guardar alquiler:", error);
      toast.error('Ocurrió un error al guardar el alquiler');
    }
  };

  const handleEdit = (alquiler: Alquiler) => {
    setEditingRental(alquiler);
    setFormData({
      idAuto: alquiler.idAuto || '',
      idChofer: alquiler.idChofer || '',
      fechaInicio: alquiler.fechaInicio || '',
      fechaFin: alquiler.fechaFin || '',
      garantia: alquiler.garantia || '',
      importe: alquiler.importe || '',
      comentarios: alquiler.comentarios || '',
      metodoPago: alquiler.metodoPago || 'Efectivo',
      registrarPagoFinanzas: false // En edición no duplicamos el pago
    });
    setIsDialogOpen(true);
  };

  // Finalizar contrato y devolver el auto
  const handleFinalize = async (alquiler: Alquiler) => {
    if (confirm('¿Deseas finalizar este contrato y marcar el vehículo como Disponible?')) {
      try {
        const today = getTodayString();
        await updateDoc(doc(db, 'alquileres', alquiler.id), {
          estado: 'finalizado',
          fechaFin: alquiler.fechaFin || today
        });

        if (alquiler.idAuto) {
          await updateDoc(doc(db, 'autos', alquiler.idAuto), { status: 'available' });
        }

        toast.success('Contrato finalizado con éxito. El auto ahora está Disponible.');
      } catch (error) {
        console.error("Error al finalizar alquiler:", error);
        toast.error('No se pudo finalizar el contrato');
      }
    }
  };

  // Reactivar un contrato finalizado
  const handleReactivate = async (alquiler: Alquiler) => {
    if (confirm('¿Deseas reactivar este contrato y marcar el vehículo como Alquilado?')) {
      try {
        await updateDoc(doc(db, 'alquileres', alquiler.id), {
          estado: 'activo'
        });

        if (alquiler.idAuto) {
          await updateDoc(doc(db, 'autos', alquiler.idAuto), { status: 'rented' });
        }

        toast.success('Contrato reactivado. Vehículo marcado como Alquilado.');
      } catch (error) {
        console.error("Error al reactivar alquiler:", error);
        toast.error('No se pudo reactivar el contrato');
      }
    }
  };

  // Eliminar contrato
  const handleDelete = async (alquiler: Alquiler) => {
    if (confirm('¿Estás seguro de eliminar este contrato de alquiler? Si estaba activo, el auto quedará disponible.')) {
      try {
        await deleteDoc(doc(db, 'alquileres', alquiler.id));

        // Si el alquiler estaba activo, liberamos el auto
        if (alquiler.estado !== 'finalizado' && alquiler.idAuto) {
          await updateDoc(doc(db, 'autos', alquiler.idAuto), { status: 'available' });
        }

        toast.success('Alquiler eliminado y auto liberado');
      } catch (error) {
        console.error("Error al eliminar:", error);
        toast.error('Error al eliminar el alquiler');
      }
    }
  };

  const formatDateSafe = (dateString: string) => {
    if (!dateString) return 'En curso';
    try {
      return format(new Date(dateString.replace(/-/g, '/')), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  // Filtrado de alquileres
  const filteredAlquileres = alquileres.filter(alquiler => {
    const autoInfo = autos.find(a => a.id === alquiler.idAuto);
    const choferInfo = choferes.find(c => c.id === alquiler.idChofer);
    const matchSearch = 
      (autoInfo?.marca || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (autoInfo?.modelo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (autoInfo?.placa || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (choferInfo?.Nombre || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (alquiler.comentarios || '').toLowerCase().includes(searchTerm.toLowerCase());

    const isActivo = alquiler.estado !== 'finalizado';
    const matchStatus = 
      statusFilter === 'all' ? true :
      statusFilter === 'activo' ? isActivo :
      !isActivo;

    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Alquileres</h2>
          <p className="text-muted-foreground">Administra contratos, disponibilidad de flota y finanzas conectadas</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Alquiler
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingRental ? 'Editar Alquiler' : 'Registrar Nuevo Alquiler'}</DialogTitle>
              <DialogDescription>
                Asigna el vehículo, chofer y detalles financieros del contrato
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Desplegable de Autos con estado visible */}
              <div className="space-y-2">
                <Label htmlFor="idAuto">Vehículo *</Label>
                <Select
                  value={formData.idAuto}
                  onValueChange={handleSelectAuto}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un vehículo" />
                  </SelectTrigger>
                  <SelectContent>
                    {autos.map(auto => {
                      const isUnavailable = (auto.status === 'rented' || auto.status === 'maintenance') && auto.id !== formData.idAuto;
                      return (
                        <SelectItem key={auto.id} value={auto.id} disabled={isUnavailable}>
                          {auto.marca} {auto.modelo} ({auto.placa})
                          {auto.status === 'rented' ? ' — [Alquilado]' : auto.status === 'maintenance' ? ' — [Mantenimiento]' : ' — [Disponible]'}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Desplegable de Choferes */}
              <div className="space-y-2">
                <Label htmlFor="idChofer">Chofer *</Label>
                <Select
                  value={formData.idChofer}
                  onValueChange={(value) => setFormData({ ...formData, idChofer: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un chofer" />
                  </SelectTrigger>
                  <SelectContent>
                    {choferes.map(chofer => (
                      <SelectItem key={chofer.id} value={chofer.id}>
                        {chofer.Nombre} {chofer.DNI ? `(DNI: ${chofer.DNI})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fechaInicio">Fecha Inicio *</Label>
                  <Input
                    id="fechaInicio"
                    type="date"
                    value={formData.fechaInicio}
                    onChange={(e) => setFormData({ ...formData, fechaInicio: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fechaFin">Fecha Fin</Label>
                  <Input
                    id="fechaFin"
                    type="date"
                    value={formData.fechaFin}
                    onChange={(e) => setFormData({ ...formData, fechaFin: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="importe">Importe Alquiler (S/) *</Label>
                  <Input
                    id="importe"
                    type="number"
                    step="0.01"
                    value={formData.importe}
                    onChange={(e) => setFormData({ ...formData, importe: e.target.value })}
                    placeholder="Ej. 120"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="garantia">Garantía (S/)</Label>
                  <Input
                    id="garantia"
                    type="number"
                    step="0.01"
                    value={formData.garantia}
                    onChange={(e) => setFormData({ ...formData, garantia: e.target.value })}
                    placeholder="Ej. 1000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="metodoPago">Método de Pago</Label>
                <Select
                  value={formData.metodoPago}
                  onValueChange={(value) => setFormData({ ...formData, metodoPago: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona medio de pago" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Efectivo">Efectivo</SelectItem>
                    <SelectItem value="Transferencia">Transferencia Bancaria</SelectItem>
                    <SelectItem value="Yape / Plin">Yape / Plin</SelectItem>
                    <SelectItem value="Tarjeta">Tarjeta de Crédito / Débito</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {!editingRental && (
                <div className="flex items-center space-x-2 pt-1 border-t">
                  <Checkbox
                    id="registrarPagoFinanzas"
                    checked={formData.registrarPagoFinanzas}
                    onCheckedChange={(checked) => setFormData({ ...formData, registrarPagoFinanzas: !!checked })}
                  />
                  <Label htmlFor="registrarPagoFinanzas" className="text-sm font-medium cursor-pointer">
                    Registrar cobro automáticamente en Finanzas (Caja)
                  </Label>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="comentarios">Comentarios / Observaciones</Label>
                <Input
                  id="comentarios"
                  value={formData.comentarios}
                  onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                  placeholder="Detalles del contrato, kilometraje inicial..."
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editingRental ? 'Actualizar' : 'Registrar Contrato'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por auto, placa, chofer o comentarios..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant={statusFilter === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('all')}
          >
            Todos ({alquileres.length})
          </Button>
          <Button
            variant={statusFilter === 'activo' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('activo')}
          >
            Activos ({alquileres.filter(a => a.estado !== 'finalizado').length})
          </Button>
          <Button
            variant={statusFilter === 'finalizado' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter('finalizado')}
          >
            Finalizados ({alquileres.filter(a => a.estado === 'finalizado').length})
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehículo</TableHead>
                <TableHead>Chofer</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Importe</TableHead>
                <TableHead>Garantía</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredAlquileres.map((alquiler) => {
                const autoInfo = autos.find(a => a.id === alquiler.idAuto);
                const choferInfo = choferes.find(c => c.id === alquiler.idChofer);
                const isActivo = alquiler.estado !== 'finalizado';

                return (
                  <TableRow key={alquiler.id}>
                    <TableCell className="font-medium">
                      {autoInfo ? (
                        <div>
                          <div className="font-semibold">{autoInfo.marca} {autoInfo.modelo}</div>
                          <span className="text-xs text-muted-foreground font-mono">{autoInfo.placa}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Auto no encontrado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {choferInfo ? (
                        <div>
                          <div>{choferInfo.Nombre}</div>
                          {choferInfo.DNI && <span className="text-xs text-muted-foreground">DNI: {choferInfo.DNI}</span>}
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">Chofer no encontrado</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {isActivo ? (
                        <Badge className="bg-emerald-600 hover:bg-emerald-700">Activo</Badge>
                      ) : (
                        <Badge variant="secondary">Finalizado</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col">
                        <span>Desde: {formatDateSafe(alquiler.fechaInicio)}</span>
                        <span className="text-muted-foreground">Hasta: {formatDateSafe(alquiler.fechaFin)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold text-emerald-600 dark:text-emerald-400">
                      {alquiler.importe ? `S/ ${parseFloat(alquiler.importe).toFixed(2)}` : '-'}
                    </TableCell>
                    <TableCell>
                      {alquiler.garantia && parseFloat(alquiler.garantia) > 0 ? (
                        <span className="text-sm font-medium">S/ ${parseFloat(alquiler.garantia).toFixed(2)}</span>
                      ) : (
                        <span className="text-muted-foreground text-xs">Sin garantía</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {isActivo ? (
                          <Button
                            variant="outline"
                            size="sm"
                            title="Finalizar alquiler y liberar vehículo"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                            onClick={() => handleFinalize(alquiler)}
                          >
                            <CheckCircle2 className="w-4 h-4 mr-1" />
                            <span className="hidden md:inline text-xs">Devolver</span>
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            title="Reactivar contrato"
                            onClick={() => handleReactivate(alquiler)}
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          title="Editar alquiler"
                          onClick={() => handleEdit(alquiler)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          title="Eliminar alquiler"
                          className="text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(alquiler)}
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
          
          {filteredAlquileres.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== 'all' ? 'No se encontraron alquileres con esos criterios' : 'No hay alquileres registrados'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}