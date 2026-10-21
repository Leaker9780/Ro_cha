import { useState, useEffect } from 'react';
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../ui/table';
import { Plus, Edit, Trash2, User, Phone, BadgeCheck } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '../ui/avatar';

// 1. Definimos la interfaz con los campos exactos de tu Firebase
interface Chofer {
  id: string;
  Nombre: string;
  DNI: string;
  carnet_conducir: string;
  comentario: string;
  direccion: string;
  fecha: string;
  telefono: string;
  tipoLicen: string;
}

export function ChoferesModule() {
  const [choferes, setChoferes] = useState<Chofer[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingChofer, setEditingChofer] = useState<Chofer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const getTodayString = () => new Date().toISOString().split('T')[0];

  // 2. Estado del formulario mapeado exactamente a Firestore
  const [formData, setFormData] = useState({
    Nombre: '',
    DNI: '',
    telefono: '',
    direccion: '',
    carnet_conducir: '',
    tipoLicen: '',
    comentario: '',
    fecha: getTodayString()
  });

  // 3. Conexión en tiempo real a la colección 'choferes'
  useEffect(() => {
    const choferesRef = collection(db, 'choferes');

    const unsubscribe = onSnapshot(choferesRef, (snapshot) => {
      const choferesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      })) as Chofer[];

      setChoferes(choferesData);
    }, (error) => {
      console.error("Error obteniendo los choferes:", error);
      toast.error('Error al cargar la base de datos');
    });

    return () => unsubscribe();
  }, []);

  const resetForm = () => {
    setFormData({
      Nombre: '',
      DNI: '',
      telefono: '',
      direccion: '',
      carnet_conducir: '',
      tipoLicen: '',
      comentario: '',
      fecha: getTodayString()
    });
    setEditingChofer(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.Nombre || !formData.DNI || !formData.telefono || !formData.carnet_conducir) {
      toast.error('Por favor, completa los campos obligatorios');
      return;
    }

    try {
      if (editingChofer) {
        const docRef = doc(db, 'choferes', editingChofer.id);
        await updateDoc(docRef, formData);
        toast.success('Chofer actualizado correctamente');
      } else {
        const choferesRef = collection(db, 'choferes');
        await addDoc(choferesRef, formData);
        toast.success('Chofer agregado correctamente');
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error al guardar:", error);
      toast.error('Ocurrió un error al guardar el chofer');
    }
  };

  const handleEdit = (chofer: Chofer) => {
    setEditingChofer(chofer);
    setFormData({
      Nombre: chofer.Nombre || '',
      DNI: chofer.DNI || '',
      telefono: chofer.telefono || '',
      direccion: chofer.direccion || '',
      carnet_conducir: chofer.carnet_conducir || '',
      tipoLicen: chofer.tipoLicen || '',
      comentario: chofer.comentario || '',
      fecha: chofer.fecha || getTodayString()
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este chofer?')) {
      try {
        const docRef = doc(db, 'choferes', id);
        await deleteDoc(docRef);
        toast.success('Chofer eliminado correctamente');
      } catch (error) {
        console.error("Error al eliminar:", error);
        toast.error('Error al eliminar el chofer');
      }
    }
  };

  // 4. Buscador protegido para evitar caídas por datos undefined
  const filteredChoferes = choferes.filter(chofer => {
    const search = searchTerm.toLowerCase();
    const nombreMatch = (chofer.Nombre || '').toLowerCase().includes(search);
    const dniMatch = (chofer.DNI || '').includes(search);
    const carnetMatch = (chofer.carnet_conducir || '').toLowerCase().includes(search);
    return nombreMatch || dniMatch || carnetMatch;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gestión de Choferes</h2>
          <p className="text-muted-foreground">Administra el registro del personal de conducción</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Agregar Chofer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingChofer ? 'Editar Chofer' : 'Agregar Nuevo Chofer'}</DialogTitle>
              <DialogDescription>
                Completa la información del conductor
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="Nombre">Nombre Completo *</Label>
                <Input
                  id="Nombre"
                  value={formData.Nombre}
                  onChange={(e) => setFormData({ ...formData, Nombre: e.target.value })}
                  placeholder="Ej. Pedro Jean Pierre..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="DNI">DNI *</Label>
                  <Input
                    id="DNI"
                    value={formData.DNI}
                    onChange={(e) => setFormData({ ...formData, DNI: e.target.value })}
                    placeholder="12345678"
                    maxLength={8}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono *</Label>
                  <Input
                    id="telefono"
                    value={formData.telefono}
                    onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                    placeholder="987654321"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="carnet_conducir">Carnet de Conducir *</Label>
                  <Input
                    id="carnet_conducir"
                    value={formData.carnet_conducir}
                    onChange={(e) => setFormData({ ...formData, carnet_conducir: e.target.value.toUpperCase() })}
                    placeholder="Q12345678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipoLicen">Tipo de Licencia</Label>
                  <Input
                    id="tipoLicen"
                    value={formData.tipoLicen}
                    onChange={(e) => setFormData({ ...formData, tipoLicen: e.target.value.toUpperCase() })}
                    placeholder="A2A, A2B..."
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={formData.direccion}
                  onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
                  placeholder="Av. Principal 123"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="comentario">Comentarios</Label>
                <Input
                  id="comentario"
                  value={formData.comentario}
                  onChange={(e) => setFormData({ ...formData, comentario: e.target.value })}
                  placeholder="CJZ550..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha de Registro</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">
                  {editingChofer ? 'Actualizar' : 'Agregar'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-4">
        <Input
          placeholder="Buscar por nombre, DNI o carnet..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-md"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Chofer</TableHead>
                <TableHead>Licencia</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredChoferes.map((chofer) => (
                <TableRow key={chofer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {chofer.Nombre ? chofer.Nombre.charAt(0) : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{chofer.Nombre}</div>
                        <div className="text-xs text-muted-foreground">
                          DNI: {chofer.DNI}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{chofer.carnet_conducir}</span>
                      {chofer.tipoLicen && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <BadgeCheck className="w-3 h-3" />
                          Clase {chofer.tipoLicen}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Phone className="w-3 h-3 text-muted-foreground" />
                      {chofer.telefono || '-'}
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {chofer.direccion || '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(chofer)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(chofer.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredChoferes.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <User className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchTerm ? 'No se encontraron choferes' : 'No hay choferes registrados'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}