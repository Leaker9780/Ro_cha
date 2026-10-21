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
  CardContent,
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
import { Plus, TrendingUp, TrendingDown, DollarSign, Trash2, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface UnifiedTransaction {
  id: string;
  type: 'income' | 'expense';
  category: string;
  amount: number;
  description: string;
  date: string;
  dbCollection: 'pagos' | 'egreso';
}

export function TransactionsModule() {
  const [ingresos, setIngresos] = useState<UnifiedTransaction[]>([]);
  const [egresos, setEgresos] = useState<UnifiedTransaction[]>([]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<UnifiedTransaction | null>(null);
  
  // Filtros
  const [filterType, setFilterType] = useState<'all' | 'income' | 'expense'>('all');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const getTodayString = () => new Date().toISOString().split('T')[0];

  const [formData, setFormData] = useState({
    type: 'income' as 'income' | 'expense',
    category: '',
    amount: '',
    description: '',
    date: getTodayString()
  });

  useEffect(() => {
    const unsubPagos = onSnapshot(collection(db, 'pagos'), (snap) => {
      const pagosData = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: 'income' as const,
          amount: parseFloat(data.pago_realizado || data.importe_pago || '0'),
          date: data.fechaPago || '',
          category: data.metodo_pago || 'Ingreso',
          description: data.comentario || 'Pago de Alquiler',
          dbCollection: 'pagos' as const
        };
      });
      setIngresos(pagosData);
    });

    const unsubEgreso = onSnapshot(collection(db, 'egreso'), (snap) => {
      const egresoData = snap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          type: 'expense' as const,
          amount: parseFloat(data.egreSo || '0'),
          date: data.fecha || '',
          category: data.medio || 'Egreso',
          description: data.concepto || '',
          dbCollection: 'egreso' as const
        };
      });
      setEgresos(egresoData);
    });

    return () => {
      unsubPagos();
      unsubEgreso();
    };
  }, []);

  // Reiniciar paginación al cambiar cualquier filtro
  useEffect(() => {
    setCurrentPage(1);
  }, [filterType, filterStartDate, filterEndDate]);

  const resetForm = () => {
    setFormData({
      type: 'income',
      category: '',
      amount: '',
      description: '',
      date: getTodayString()
    });
    setEditingTransaction(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const amountNumber = parseFloat(formData.amount);

    if (!formData.category || isNaN(amountNumber) || amountNumber <= 0 || !formData.date) {
      toast.error('Por favor, completa todos los campos correctamente');
      return;
    }

    try {
      if (editingTransaction) {
        const docRef = doc(db, editingTransaction.dbCollection, editingTransaction.id);
        
        if (editingTransaction.dbCollection === 'pagos') {
          await updateDoc(docRef, {
            fechaPago: formData.date,
            pago_realizado: amountNumber.toString(),
            importe_pago: amountNumber.toString(),
            metodo_pago: formData.category,
            comentario: formData.description
          });
        } else {
          await updateDoc(docRef, {
            fecha: formData.date,
            egreSo: amountNumber.toString(),
            medio: formData.category,
            concepto: formData.description
          });
        }
        toast.success('Transacción actualizada correctamente');

      } else {
        if (formData.type === 'income') {
          const nuevoPago = {
            fechaPago: formData.date,
            pago_realizado: amountNumber.toString(),
            importe_pago: amountNumber.toString(),
            metodo_pago: formData.category,
            comentario: formData.description,
            deuda: "0",
            diaPago: "",
            idAlquiler: "Agregado Manualmente",
            verificar: "Manual"
          };
          await addDoc(collection(db, 'pagos'), nuevoPago);
        } else {
          const nuevoEgreso = {
            fecha: formData.date,
            egreSo: amountNumber.toString(),
            medio: formData.category,
            concepto: formData.description,
            egreDo: "0",
            tc: "",
            comentario: ""
          };
          await addDoc(collection(db, 'egreso'), nuevoEgreso);
        }
        toast.success('Transacción registrada correctamente');
      }

      setIsDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error guardando transacción:", error);
      toast.error("Ocurrió un error al guardar");
    }
  };

  const handleEdit = (t: UnifiedTransaction) => {
    setEditingTransaction(t);
    setFormData({
      type: t.type,
      category: t.category,
      amount: t.amount.toString(),
      description: t.description,
      date: t.date
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (t: UnifiedTransaction) => {
    if (confirm('¿Estás seguro de eliminar esta transacción?')) {
      try {
        await deleteDoc(doc(db, t.dbCollection, t.id));
        toast.success('Transacción eliminada correctamente');
      } catch (error) {
        console.error("Error al eliminar:", error);
        toast.error('Error al eliminar');
      }
    }
  };

  const allTransactions = [...ingresos, ...egresos];

  // 1. PRIMERO FILTRAMOS POR FECHA
  const dateFilteredTransactions = allTransactions.filter(t => {
    const tDate = new Date(t.date ? t.date.replace(/-/g, '\/') : 0).getTime();
    const startDate = filterStartDate ? new Date(filterStartDate.replace(/-/g, '\/')).getTime() : 0;
    const endDate = filterEndDate ? new Date(filterEndDate.replace(/-/g, '\/')).getTime() : Infinity;
    
    return (!filterStartDate || tDate >= startDate) && (!filterEndDate || tDate <= endDate);
  });

  // 2. CALCULAMOS LOS TOTALES USANDO SOLO LAS TRANSACCIONES FILTRADAS POR FECHA
  const totalIncome = dateFilteredTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = dateFilteredTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0);
  const balance = totalIncome - totalExpense;

  // 3. LUEGO FILTRAMOS POR TIPO Y ORDENAMOS PARA LA TABLA
  const finalFilteredTransactions = dateFilteredTransactions
    .filter(t => filterType === 'all' ? true : t.type === filterType)
    .sort((a, b) => {
      const dateA = new Date(a.date ? a.date.replace(/-/g, '\/') : 0).getTime();
      const dateB = new Date(b.date ? b.date.replace(/-/g, '\/') : 0).getTime();
      return dateB - dateA;
    });

  const totalPages = Math.ceil(finalFilteredTransactions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = finalFilteredTransactions.slice(startIndex, startIndex + itemsPerPage);

  const incomeCategories = ['Transferencia', 'Efectivo', 'Yape', 'Plin', 'Tarjeta'];
  const expenseCategories = ['Mantenimiento', 'SOAT', 'Combustible', 'Limpieza', 'Seguro', 'Impuestos', 'Otros gastos', 'HABERES'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Ingresos y Egresos</h2>
          <p className="text-muted-foreground">Control financiero del negocio</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Nueva Transacción
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingTransaction ? 'Editar Transacción' : 'Registrar Transacción'}</DialogTitle>
              <DialogDescription>
                Completa la información financiera
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'income' | 'expense') => {
                    if (!editingTransaction) {
                      setFormData({ ...formData, type: value, category: '' });
                    }
                  }}
                  disabled={!!editingTransaction}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Ingreso</SelectItem>
                    <SelectItem value="expense">Egreso</SelectItem>
                  </SelectContent>
                </Select>
                {editingTransaction && (
                  <p className="text-xs text-muted-foreground">No puedes cambiar el tipo (Ingreso/Egreso) al editar.</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">{formData.type === 'income' ? 'Medio de Pago' : 'Categoría'}</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona..." />
                  </SelectTrigger>
                  <SelectContent>
                    {(formData.type === 'income' ? incomeCategories : expenseCategories).map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Monto (S/)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="Ej. 150.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción / Concepto</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Detalles de la transacción..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <DialogFooter className="pt-4">
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editingTransaction ? 'Actualizar' : 'Registrar'}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tarjetas de Resumen Dinámicas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Ingresos
            </CardTitle>
            <TrendingUp className="w-5 h-5 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">S/ {totalIncome.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Egresos
            </CardTitle>
            <TrendingDown className="w-5 h-5 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">S/ {totalExpense.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Balance General
            </CardTitle>
            <DollarSign className="w-5 h-5 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
              S/ {balance.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sección de Filtros (NUEVA) */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <Label>Tipo de Transacción</Label>
              <div className="flex gap-2">
                <Button
                  variant={filterType === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('all')}
                  className="flex-1"
                >
                  Todas
                </Button>
                <Button
                  variant={filterType === 'income' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('income')}
                  className={filterType === 'income' ? 'bg-green-600 hover:bg-green-700 flex-1' : 'flex-1'}
                >
                  Ingresos
                </Button>
                <Button
                  variant={filterType === 'expense' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setFilterType('expense')}
                  className={filterType === 'expense' ? 'bg-red-600 hover:bg-red-700 flex-1' : 'flex-1'}
                >
                  Egresos
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="filterStartDate">Desde la Fecha</Label>
              <Input
                id="filterStartDate"
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filterEndDate">Hasta la Fecha</Label>
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

      {/* Transactions Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoría / Medio</TableHead>
                <TableHead>Concepto / Detalle</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell>
                    {transaction.date ? format(new Date(transaction.date.replace(/-/g, '\/')), 'dd/MM/yyyy') : '-'}
                  </TableCell>
                  <TableCell>
                    {transaction.type === 'income' ? (
                      <Badge className="bg-green-500">Ingreso</Badge>
                    ) : (
                      <Badge className="bg-red-500">Egreso</Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{transaction.category}</TableCell>
                  <TableCell className="max-w-xs truncate" title={transaction.description}>
                    {transaction.description || '-'}
                  </TableCell>
                  <TableCell className={`text-right font-bold ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'} S/ {transaction.amount.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(transaction)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(transaction)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {finalFilteredTransactions.length > 0 && (
            <div className="flex items-center justify-between px-4 py-4 border-t">
              <div className="text-sm text-muted-foreground">
                Mostrando {startIndex + 1} a {Math.min(startIndex + itemsPerPage, finalFilteredTransactions.length)} de {finalFilteredTransactions.length} transacciones
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

          {finalFilteredTransactions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <DollarSign className="w-12 h-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay transacciones en este rango de fechas</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}