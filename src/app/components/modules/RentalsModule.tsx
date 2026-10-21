import { useState, useEffect } from 'react';
// Importamos Firebase
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table';
import { Plus, FileText, Edit, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

// 1. Definimos las interfaces exactas
interface Auto {
  id: string;
  marca: string;
  modelo: string;
  placa: string;
  kilometraje: number; // Que usabas como tarifa
  status: string;
}

interface Chofer {
  id: string;
  Nombre: string;
  DNI: string;
}

interface Alquiler {
  id: string;
  idAuto: string;
  idChofer: string;
  fechaInicio: string;
  fechaFin: string;
  garantia: string;
  importe: string;
  comentarios: string;
}

export function RentalsModule() {
  // Estados para almacenar las 3 colecciones
  const [alquileres, setAlquileres] = useState<Alquiler[]>([]);
  const [autos, setAutos] = useState<Auto[]>([]);
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRental, setEditingRental] = useState<Alquiler | null>(null);

  // 2. Mapeo exacto a tu Firestore
  const [formData, setFormData] = useState({
    idAuto: '',
    idChofer: '',
    fechaInicio: '',
    fechaFin: '',
    garantia: '',
    importe: '',
    comentarios: ''
  });

  // 3. Traemos los datos de las 3 colecciones en tiempo real
  useEffect(() => {
    const unsubAutos = onSnapshot(collection(db, 'autos'), (snap) => {
      setAutos(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Auto)));
    });

    const unsubChoferes = onSnapshot(collection(db, 'choferes'), (snap) => {
      setChoferes(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chofer)));
    });

    const unsubAlquileres = onSnapshot(collection(db, 'alquileres'), (snap) => {
      setAlquileres(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Alquiler)));
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
      fechaInicio: '',
      fechaFin: '',
      garantia: '',
      importe: '',
      comentarios: ''
    });
    setEditingRental(null);
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
        await updateDoc(docRef, formData);
        toast.success('Alquiler actualizado correctamente');
      } else {
        const alquileresRef = collection(db, 'alquileres');
        await addDoc(alquileresRef, formData);
        toast.success('Alquiler registrado correctamente');
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error al guardar:", error);
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
      comentarios: alquiler.comentarios || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este contrato de alquiler?')) {
      try {
        await deleteDoc(doc(db, 'alquileres', id));
        toast.success('Alquiler eliminado correctamente');
      } catch (error) {
        console.error("Error al eliminar:", error);
        toast.error('Error al eliminar el alquiler');
      }
    }
  };

  // Función segura para formatear fechas que podrían venir vacías
  const formatDateSafe = (dateString: string) => {
    if (!dateString) return 'Activo';
    try {
      // Reemplazamos los guiones por barras para evitar bugs de zona horaria en JavaScript
      return format(new Date(dateString.replace(/-/g, '\/')), 'dd/MM/yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Alquileres</h2>
          <p className="text-muted-foreground">Administra los contratos de alquiler</p>
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
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingRental ? 'Editar Alquiler' : 'Registrar Nuevo Alquiler'}</DialogTitle>
              <DialogDescription>
                Completa la información del contrato
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              
              {/* Desplegable de Autos */}
              <div className="space-y-2">
                <Label htmlFor="idAuto">Vehículo *</Label>
                <Select
                  value={formData.idAuto}
                  onValueChange={(value) => setFormData({ ...formData, idAuto: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un auto" />
                  </SelectTrigger>
                  <SelectContent>
                    {autos.map(auto => (
                      <SelectItem key={auto.id} value={auto.id}>
                        {auto.marca} {auto.modelo} - {auto.placa} 
                        {auto.kilometraje ? ` (S/ ${auto.kilometraje}/día)` : ''}
                      </SelectItem>
                    ))}
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
                        {chofer.Nombre} - {chofer.DNI}
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
                  <Label htmlFor="importe">Importe (S/) *</Label>
                  <Input
                    id="importe"
                    type="number"
                    value={formData.importe}
                    onChange={(e) => setFormData({ ...formData, importe: e.target.value })}
                    placeholder="Ej. 85"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="garantia">Garantía (S/)</Label>
                  <Input
                    id="garantia"
                    type="number"
                    value={formData.garantia}
                    onChange={(e) => setFormData({ ...formData, garantia: e.target.value })}
                    placeholder="Ej. 1000"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comentarios">Comentarios</Label>
                <Input
                  id="comentarios"
                  value={formData.comentarios}
                  onChange={(e) => setFormData({ ...formData, comentarios: e.target.value })}
                  placeholder="Observaciones del contrato..."
                />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editingRental ? 'Actualizar' : 'Registrar'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehículo</TableHead>
                <TableHead>Chofer</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead>Importe</TableHead>
                <TableHead>Garantía</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alquileres.map((alquiler) => {
                // Buscamos la información del auto y chofer usando los IDs guardados
                const autoInfo = autos.find(a => a.id === alquiler.idAuto);
                const choferInfo = choferes.find(c => c.id === alquiler.idChofer);

                return (
                  <TableRow key={alquiler.id}>
                    <TableCell className="font-medium">
                      {autoInfo ? `${autoInfo.marca} ${autoInfo.modelo} (${autoInfo.placa})` : 'Auto no encontrado'}
                    </TableCell>
                    <TableCell>
                      {choferInfo ? choferInfo.Nombre : 'Chofer no encontrado'}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div className="flex flex-col">
                        <span>Inicio: {formatDateSafe(alquiler.fechaInicio)}</span>
                        <span className="text-muted-foreground">Fin: {formatDateSafe(alquiler.fechaFin)}</span>
                      </div>
                    </TableCell>
                    <TableCell className="font-bold">
                      {alquiler.importe ? `S/ ${alquiler.importe}` : '-'}
                    </TableCell>
                    <TableCell>
                      {alquiler.garantia ? `S/ ${alquiler.garantia}` : '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(alquiler)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(alquiler.id)}
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
          
          {alquileres.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay alquileres registrados</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}