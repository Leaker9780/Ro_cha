export interface Car {
  id: string;
  marca: string;
  modelo: string;
  año: number;
  placa: string;
  color: string;
  status: 'available' | 'rented' | 'maintenance';
  gas: string;
  kilometraje: number;
  comentarios?: string;
  mantenimiento?: string;
}

export interface Alquiler {
  id: string;
  idAuto: string;
  idChofer: string;
  fechaInicio: string;
  fechaFin: string;
  garantia: string;
  importe: string;
  comentarios?: string;
  estado?: 'activo' | 'finalizado';
  metodoPago?: string;
}

export interface Chofer {
  id: string;
  Nombre: string;
  DNI?: string;
  telefono?: string;
  carnet_conducir?: string;
}
