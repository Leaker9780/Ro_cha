import ExcelJS from 'exceljs';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { safeFormatDate } from '../components/ui/utils';
import { differenceInDays } from 'date-fns';

// =============================================================================
// INTERFACES
// =============================================================================

export interface AutoDoc {
  id: string;
  placa?: string;
  marca?: string;
  modelo?: string;
  año?: string | number;
  color?: string;
  status?: string;
  kilometraje?: string | number;
  gas?: string;
  comentarios?: string;
}

export interface ChoferDoc {
  id: string;
  Nombre?: string;
  DNI?: string;
  telefono?: string;
  carnet_conducir?: string;
}

export interface AlquilerDoc {
  id: string;
  idAuto?: string;
  idChofer?: string;
  fechaInicio?: string;
  fechaFin?: string;
  importe?: string | number;
  garantia?: string | number;
  estado?: string;
  comentarios?: string;
}

export interface PagoDoc {
  id: string;
  pago_realizado?: string | number;
  importe_pago?: string | number;
  fechaPago?: string;
  metodo_pago?: string;
  comentario?: string;
}

export interface EgresoDoc {
  id: string;
  egreSo?: string | number;
  fecha?: string;
  medio?: string;
  categoria?: string;
  concepto?: string;
}

export interface SoatDoc {
  id: string;
  placa?: string;
  aseguradora?: string;
  cobertura?: string;
  monto?: string | number;
}

export interface SeguroDoc {
  id: string;
  placa?: string;
  concepto?: string;
  comentario?: string;
  monto?: string | number;
}

export interface MantenimientoDoc {
  id: string;
  placa?: string;
  fecha?: string;
  km?: string | number;
  detalles?: Array<{ detalle?: string }>;
  nextDate?: string;
  total?: string | number;
  tipo?: string;
}

export interface ReportRawData {
  autos: AutoDoc[];
  choferes: ChoferDoc[];
  alquileres: AlquilerDoc[];
  pagos: PagoDoc[];
  egresos: EgresoDoc[];
  soats: SoatDoc[];
  seguros: SeguroDoc[];
  mantenimientos: MantenimientoDoc[];
}

// =============================================================================
// SANITIZACIÓN & DEFENSAS DE SEGURIDAD (CWE-1236 Formula Injection)
// =============================================================================

/**
 * Sanitiza valores de celdas para prevenir inyecciones de fórmulas (CWE-1236)
 * Neutraliza caracteres gatillo: '=', '+', '-', '@', '\t', '\r' anteponiendo una comilla simple
 */
export function sanitizeCellValue(val: unknown): string | number | boolean {
  if (val === null || val === undefined) return '-';
  if (typeof val === 'number') {
    return isNaN(val) ? 0 : val;
  }
  if (typeof val === 'boolean') return val;

  const rawStr = String(val);
  const trimmed = rawStr.trim();
  if (trimmed === '') return '-';

  // Neutralizar fórmulas dinámicas (CWE-1236)
  if (/^[=+\-@\t\r]/.test(rawStr) || /^[=+\-@]/.test(trimmed)) {
    return `'${trimmed}`;
  }
  return trimmed;
}

/**
 * Parser defensivo de fechas para evitar TypeErrors en runtime
 */
export function parseSafeDate(val: unknown): Date | null {
  if (!val) return null;
  if (val instanceof Date) return isNaN(val.getTime()) ? null : val;
  if (typeof val === 'object' && 'seconds' in (val as Record<string, unknown>)) {
    return new Date(Number((val as { seconds: number }).seconds) * 1000);
  }
  if (typeof val === 'string') {
    // Si contiene formato DD/MM/YYYY
    const ddmmyyyyMatch = val.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (ddmmyyyyMatch) {
      const d = new Date(Number(ddmmyyyyMatch[3]), Number(ddmmyyyyMatch[2]) - 1, Number(ddmmyyyyMatch[1]));
      return isNaN(d.getTime()) ? null : d;
    }
    const d = new Date(val.replace(/-/g, '/'));
    return isNaN(d.getTime()) ? null : d;
  }
  if (typeof val === 'number') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

/**
 * Busca un vehículo por id o por placa de forma resiliente
 */
export function findVehicle(autos: AutoDoc[], query?: string): AutoDoc | undefined {
  if (!query) return undefined;
  return autos.find(c => c.id === query || c.placa === query);
}

// =============================================================================
// EXTRACCIÓN DE DATOS (I/O)
// =============================================================================

export async function fetchReportData(): Promise<ReportRawData> {
  const [
    autosSnap,
    choferesSnap,
    alquileresSnap,
    pagosSnap,
    egresoSnap,
    soatSnap,
    segurosSnap,
    mantenimientoSnap
  ] = await Promise.all([
    getDocs(collection(db, 'autos')),
    getDocs(collection(db, 'choferes')),
    getDocs(collection(db, 'alquileres')),
    getDocs(collection(db, 'pagos')),
    getDocs(collection(db, 'egreso')),
    getDocs(collection(db, 'soat')),
    getDocs(collection(db, 'seguros')),
    getDocs(collection(db, 'mantenimiento'))
  ]);

  return {
    autos: autosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AutoDoc)),
    choferes: choferesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChoferDoc)),
    alquileres: alquileresSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AlquilerDoc)),
    pagos: pagosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as PagoDoc)),
    egresos: egresoSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as EgresoDoc)),
    soats: soatSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SoatDoc)),
    seguros: segurosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SeguroDoc)),
    mantenimientos: mantenimientoSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MantenimientoDoc))
  };
}

// =============================================================================
// CONSTRUCTOR DEL LIBRO DE EXCEL (LÓGICA PURA TESTEABLE)
// =============================================================================

export async function buildGeneralExcelWorkbook(
  data: ReportRawData,
  today: Date = new Date()
): Promise<ExcelJS.Workbook> {
  const { autos, choferes, alquileres, pagos, egresos, soats, seguros, mantenimientos } = data;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'RO&CHA Sistema de Gestión';
  workbook.lastModifiedBy = 'RO&CHA Admin';
  workbook.created = today;
  workbook.modified = today;

  // Normalizar hoy a medianoche
  const todayMidnight = new Date(today);
  todayMidnight.setHours(0, 0, 0, 0);
  const currentMonth = todayMidnight.getMonth();
  const currentYear = todayMidnight.getFullYear();

  // Estilos reutilizables
  const headerFill: ExcelJS.FillPattern = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E293B' } // Slate-800
  };

  const headerFont: Partial<ExcelJS.Font> = {
    name: 'Segoe UI',
    color: { argb: 'FFFFFFFF' },
    bold: true,
    size: 11
  };

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
  };

  // Cálculos de Alquileres
  const activeRentals = alquileres.filter(rental => {
    if (rental.estado === 'finalizado') return false;
    if (!rental.fechaFin) return true;
    const endDate = parseSafeDate(rental.fechaFin);
    return endDate ? endDate >= todayMidnight : true;
  });

  // Cálculos Financieros
  let totalIngresosMes = 0;
  let totalIngresosHistorico = 0;
  pagos.forEach(p => {
    const rawVal = p.pago_realizado ?? p.importe_pago;
    const amount = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal || '0')) || 0;
    totalIngresosHistorico += amount;
    const d = parseSafeDate(p.fechaPago);
    if (d && d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      totalIngresosMes += amount;
    }
  });

  let totalEgresosMes = 0;
  let totalEgresosHistorico = 0;
  egresos.forEach(e => {
    const rawVal = e.egreSo;
    const amount = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal || '0')) || 0;
    totalEgresosHistorico += amount;
    const d = parseSafeDate(e.fecha);
    if (d && d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
      totalEgresosMes += amount;
    }
  });

  // Estado de Autos
  const availableCars = autos.filter(c => !c.status || c.status === 'available');
  const rentedCars = autos.filter(c => c.status === 'rented');
  const maintenanceCars = autos.filter(c => c.status === 'maintenance');

  // Procesar Alertas SOAT
  const latestSoatsByCar = new Map<string, number>();
  soats.forEach(s => {
    if (!s.cobertura || !s.placa) return;
    const fechas = s.cobertura.split(' - ');
    if (fechas.length < 2) return;
    const endParsed = parseSafeDate(fechas[1].trim());
    if (!endParsed) return;
    const endTs = endParsed.getTime();
    const curr = latestSoatsByCar.get(s.placa);
    if (!curr || endTs > curr) {
      latestSoatsByCar.set(s.placa, endTs);
    }
  });

  let soatAlertsCount = 0;
  latestSoatsByCar.forEach(endTs => {
    const days = differenceInDays(new Date(endTs), todayMidnight);
    if (days <= 30) soatAlertsCount++;
  });

  // Procesar Alertas Seguros
  const latestInsuranceByCar = new Map<string, number>();
  seguros.forEach(s => {
    if (!s.comentario || !s.placa) return;
    const match = s.comentario.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (!match) return;
    const endParsed = parseSafeDate(`${match[1]}/${match[2]}/${match[3]}`);
    if (!endParsed) return;
    const endTs = endParsed.getTime();
    const curr = latestInsuranceByCar.get(s.placa);
    if (!curr || endTs > curr) {
      latestInsuranceByCar.set(s.placa, endTs);
    }
  });

  let insuranceAlertsCount = 0;
  latestInsuranceByCar.forEach(endTs => {
    const days = differenceInDays(new Date(endTs), todayMidnight);
    if (days <= 30) insuranceAlertsCount++;
  });

  // Procesar Alertas Mantenimientos
  let maintenanceAlertsCount = 0;
  mantenimientos.forEach(m => {
    if (!m.nextDate) return;
    const nextD = parseSafeDate(m.nextDate);
    if (!nextD) return;
    const days = differenceInDays(nextD, todayMidnight);
    if (days <= 7) maintenanceAlertsCount++;
  });

  const totalAlerts = soatAlertsCount + insuranceAlertsCount + maintenanceAlertsCount;

  // =========================================================================
  // HOJA 1: RESUMEN EJECUTIVO (DASHBOARD)
  // =========================================================================
  const wsResumen = workbook.addWorksheet('Resumen Ejecutivo', { views: [{ showGridLines: true }] });
  wsResumen.columns = [
    { width: 4 },
    { width: 34 },
    { width: 24 },
    { width: 32 }
  ];

  // Título principal
  wsResumen.mergeCells('B2:D2');
  const titleCell = wsResumen.getCell('B2');
  titleCell.value = 'RO&CHA - REPORTE GENERAL EJECUTIVO';
  titleCell.font = { name: 'Segoe UI', size: 16, bold: true, color: { argb: 'FF0F172A' } };
  wsResumen.getRow(2).height = 30;

  wsResumen.getCell('B3').value = `Fecha de Generación: ${safeFormatDate(today, 'dd/MM/yyyy HH:mm')}`;
  wsResumen.getCell('B3').font = { name: 'Segoe UI', size: 10, italic: true, color: { argb: 'FF64748B' } };

  // Sección Métricas Clave
  const section1 = wsResumen.getCell('B5');
  section1.value = 'MÉTRICAS PRINCIPALES';
  section1.font = { name: 'Segoe UI', size: 12, bold: true, color: { argb: 'FF1E293B' } };

  const kpis = [
    ['Total Vehículos en Flota', autos.length, 'Unidades registradas'],
    ['Vehículos Disponibles', availableCars.length, 'Listos para alquiler'],
    ['Vehículos Alquilados', rentedCars.length, 'En servicio activo'],
    ['Vehículos en Mantenimiento', maintenanceCars.length, 'En taller / revisión'],
    ['Conductores Registrados', choferes.length, 'Padrón de choferes'],
    ['Alquileres / Contratos Activos', activeRentals.length, `De ${alquileres.length} contratos totales`],
    ['Ingresos del Mes', totalIngresosMes, `Histórico acumulado: S/ ${totalIngresosHistorico.toFixed(2)}`],
    ['Egresos del Mes', totalEgresosMes, `Histórico acumulado: S/ ${totalEgresosHistorico.toFixed(2)}`],
    ['Balance Neto del Mes', totalIngresosMes - totalEgresosMes, 'Ingresos - Egresos del mes en curso'],
    ['Alertas Totales Críticas / Próximas', totalAlerts, `${soatAlertsCount} SOAT, ${insuranceAlertsCount} Seguros, ${maintenanceAlertsCount} Mant.`]
  ];

  const headerRowKpi = wsResumen.getRow(6);
  headerRowKpi.values = ['', 'Indicador', 'Valor', 'Detalle'];
  headerRowKpi.height = 24;
  ['B6', 'C6', 'D6'].forEach(cellRef => {
    const c = wsResumen.getCell(cellRef);
    c.fill = headerFill;
    c.font = headerFont;
    c.alignment = { vertical: 'middle', horizontal: 'center' };
    c.border = thinBorder;
  });

  kpis.forEach((kpi, idx) => {
    const rowNum = 7 + idx;
    const r = wsResumen.getRow(rowNum);
    r.height = 20;
    r.values = ['', sanitizeCellValue(kpi[0]), kpi[1], sanitizeCellValue(kpi[2])];

    const cVal = wsResumen.getCell(`C${rowNum}`);
    if (typeof kpi[1] === 'number' && idx >= 6 && idx <= 8) {
      cVal.numFmt = '"S/ "#,##0.00';
    }

    ['B', 'C', 'D'].forEach(col => {
      const cell = wsResumen.getCell(`${col}${rowNum}`);
      cell.border = thinBorder;
      cell.font = { name: 'Segoe UI', size: 10 };
      cell.alignment = { vertical: 'middle' };
    });
    cVal.alignment = { vertical: 'middle', horizontal: typeof kpi[1] === 'number' ? 'right' : 'center' };
  });

  // =========================================================================
  // HOJA 2: FLOTA DE VEHÍCULOS
  // =========================================================================
  const wsAutos = workbook.addWorksheet('Flota de Vehículos', { views: [{ showGridLines: true }] });
  wsAutos.columns = [
    { header: 'Placa', key: 'placa', width: 14 },
    { header: 'Marca', key: 'marca', width: 18 },
    { header: 'Modelo', key: 'modelo', width: 18 },
    { header: 'Año', key: 'año', width: 10 },
    { header: 'Color', key: 'color', width: 14 },
    { header: 'Estado', key: 'status', width: 18 },
    { header: 'Kilometraje', key: 'kilometraje', width: 14 },
    { header: 'Gas / Combustible', key: 'gas', width: 18 },
    { header: 'Comentarios', key: 'comentarios', width: 30 }
  ];

  autos.forEach(auto => {
    const statusLabel =
      auto.status === 'rented' ? 'Alquilado' :
      auto.status === 'maintenance' ? 'En Mantenimiento' : 'Disponible';

    const km = typeof auto.kilometraje === 'number'
      ? auto.kilometraje
      : parseInt(String(auto.kilometraje || '0'), 10) || 0;

    wsAutos.addRow({
      placa: sanitizeCellValue(auto.placa),
      marca: sanitizeCellValue(auto.marca),
      modelo: sanitizeCellValue(auto.modelo),
      año: sanitizeCellValue(auto.año),
      color: sanitizeCellValue(auto.color),
      status: statusLabel,
      kilometraje: km,
      gas: sanitizeCellValue(auto.gas),
      comentarios: sanitizeCellValue(auto.comentarios)
    });
  });

  // =========================================================================
  // HOJA 3: CONDUCTORES
  // =========================================================================
  const wsChoferes = workbook.addWorksheet('Conductores', { views: [{ showGridLines: true }] });
  wsChoferes.columns = [
    { header: 'Nombre Completo', key: 'nombre', width: 30 },
    { header: 'DNI', key: 'dni', width: 14 },
    { header: 'Teléfono', key: 'telefono', width: 16 },
    { header: 'Brevete / Licencia', key: 'brevete', width: 18 },
    { header: 'Vehículo Asignado', key: 'auto', width: 26 },
    { header: 'Estado Alquiler', key: 'estado', width: 16 }
  ];

  choferes.forEach(chofer => {
    const rental = alquileres.find(a => (a.idChofer === chofer.id || a.idChofer === chofer.Nombre) && a.estado !== 'finalizado');
    const car = rental ? findVehicle(autos, rental.idAuto) : undefined;
    const autoStr = car ? `${car.placa} - ${car.marca} ${car.modelo}` : rental ? rental.idAuto || 'Asignado' : 'Sin Auto Asignado';

    wsChoferes.addRow({
      nombre: sanitizeCellValue(chofer.Nombre),
      dni: sanitizeCellValue(chofer.DNI),
      telefono: sanitizeCellValue(chofer.telefono),
      brevete: sanitizeCellValue(chofer.carnet_conducir),
      auto: sanitizeCellValue(autoStr),
      estado: rental ? 'Activo' : 'Disponible'
    });
  });

  // =========================================================================
  // HOJA 4: ALQUILERES / CONTRATOS
  // =========================================================================
  const wsAlquileres = workbook.addWorksheet('Alquileres', { views: [{ showGridLines: true }] });
  wsAlquileres.columns = [
    { header: 'ID Contrato', key: 'id', width: 16 },
    { header: 'Vehículo', key: 'auto', width: 24 },
    { header: 'Conductor', key: 'chofer', width: 28 },
    { header: 'Fecha Inicio', key: 'inicio', width: 14 },
    { header: 'Fecha Fin', key: 'fin', width: 14 },
    { header: 'Importe (S/)', key: 'importe', width: 14 },
    { header: 'Garantía (S/)', key: 'garantia', width: 14 },
    { header: 'Estado', key: 'estado', width: 16 },
    { header: 'Comentarios', key: 'comentarios', width: 30 }
  ];

  alquileres.forEach(a => {
    const car = findVehicle(autos, a.idAuto);
    const chofer = choferes.find(c => c.id === a.idChofer || c.Nombre === a.idChofer);

    const autoStr = car ? `${car.placa} - ${car.marca}` : a.idAuto || '-';
    const choferStr = chofer ? chofer.Nombre || '-' : a.idChofer || '-';

    const safeId = String(a.id || '').substring(0, 8) || '-';

    const row = wsAlquileres.addRow({
      id: sanitizeCellValue(safeId),
      auto: sanitizeCellValue(autoStr),
      chofer: sanitizeCellValue(choferStr),
      inicio: safeFormatDate(a.fechaInicio, 'dd/MM/yyyy'),
      fin: safeFormatDate(a.fechaFin, 'dd/MM/yyyy'),
      importe: typeof a.importe === 'number' ? a.importe : parseFloat(String(a.importe || '0')) || 0,
      garantia: typeof a.garantia === 'number' ? a.garantia : parseFloat(String(a.garantia || '0')) || 0,
      estado: a.estado === 'finalizado' ? 'Finalizado' : 'Activo',
      comentarios: sanitizeCellValue(a.comentarios)
    });

    row.getCell('importe').numFmt = '"S/ "#,##0.00';
    row.getCell('garantia').numFmt = '"S/ "#,##0.00';
  });

  // =========================================================================
  // HOJA 5: SOAT Y SEGUROS
  // =========================================================================
  const wsDoc = workbook.addWorksheet('SOAT y Seguros', { views: [{ showGridLines: true }] });
  wsDoc.columns = [
    { header: 'Tipo Documento', key: 'tipo', width: 16 },
    { header: 'Vehículo', key: 'auto', width: 26 },
    { header: 'Aseguradora / Entidad', key: 'entidad', width: 24 },
    { header: 'Vigencia / Cobertura', key: 'cobertura', width: 30 },
    { header: 'Fecha de Vencimiento', key: 'vence', width: 20 },
    { header: 'Días Restantes', key: 'dias', width: 14 },
    { header: 'Estado', key: 'estado', width: 18 },
    { header: 'Costo (S/)', key: 'monto', width: 14 }
  ];

  // SOAT
  soats.forEach(s => {
    const car = findVehicle(autos, s.placa);
    const autoStr = car ? `${car.placa} - ${car.marca} ${car.modelo}` : s.placa || '-';

    let expiryStr = '-';
    let diasStr = '-';
    let estadoStr = 'Sin Fecha';

    if (s.cobertura) {
      const fechas = s.cobertura.split(' - ');
      if (fechas.length >= 2) {
        const endParsed = parseSafeDate(fechas[1].trim());
        if (endParsed) {
          expiryStr = safeFormatDate(endParsed, 'dd/MM/yyyy');
          const days = differenceInDays(endParsed, todayMidnight);
          diasStr = `${days} días`;
          estadoStr = days < 0 ? 'Vencido' : days <= 30 ? 'Próximo a Vencer' : 'Vigente';
        }
      }
    }

    const row = wsDoc.addRow({
      tipo: 'SOAT',
      auto: sanitizeCellValue(autoStr),
      entidad: sanitizeCellValue(s.aseguradora || 'SOAT'),
      cobertura: sanitizeCellValue(s.cobertura),
      vence: expiryStr,
      dias: diasStr,
      estado: estadoStr,
      monto: typeof s.monto === 'number' ? s.monto : parseFloat(String(s.monto || '0')) || 0
    });
    row.getCell('monto').numFmt = '"S/ "#,##0.00';
  });

  // Seguros
  seguros.forEach(s => {
    const car = findVehicle(autos, s.placa);
    const autoStr = car ? `${car.placa} - ${car.marca} ${car.modelo}` : s.placa || '-';

    let expiryStr = '-';
    let diasStr = '-';
    let estadoStr = 'Sin Fecha';

    if (s.comentario) {
      const match = s.comentario.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
      if (match) {
        const endParsed = parseSafeDate(`${match[1]}/${match[2]}/${match[3]}`);
        if (endParsed) {
          expiryStr = safeFormatDate(endParsed, 'dd/MM/yyyy');
          const days = differenceInDays(endParsed, todayMidnight);
          diasStr = `${days} días`;
          estadoStr = days < 0 ? 'Vencido' : days <= 30 ? 'Próximo a Vencer' : 'Vigente';
        }
      }
    }

    // CORRECCIÓN: Leer el costo real de seguro s.monto
    const seguroMonto = typeof s.monto === 'number' ? s.monto : parseFloat(String(s.monto || '0')) || 0;

    const row = wsDoc.addRow({
      tipo: 'Seguro',
      auto: sanitizeCellValue(autoStr),
      entidad: sanitizeCellValue(s.concepto || 'Póliza'),
      cobertura: sanitizeCellValue(s.comentario),
      vence: expiryStr,
      dias: diasStr,
      estado: estadoStr,
      monto: seguroMonto
    });
    row.getCell('monto').numFmt = '"S/ "#,##0.00';
  });

  // =========================================================================
  // HOJA 6: MANTENIMIENTOS
  // =========================================================================
  const wsMantenimiento = workbook.addWorksheet('Mantenimientos', { views: [{ showGridLines: true }] });
  wsMantenimiento.columns = [
    { header: 'Fecha', key: 'fecha', width: 14 },
    { header: 'Vehículo', key: 'auto', width: 26 },
    { header: 'Kilometraje', key: 'km', width: 14 },
    { header: 'Detalles / Trabajos', key: 'detalles', width: 36 },
    { header: 'Próxima Fecha', key: 'proxima', width: 14 },
    { header: 'Total (S/)', key: 'total', width: 16 }
  ];

  mantenimientos.forEach(m => {
    const car = findVehicle(autos, m.placa);
    const autoStr = car ? `${car.placa} - ${car.marca} ${car.modelo}` : m.placa || '-';
    const detallesStr = m.detalles && m.detalles.length > 0
      ? m.detalles.map((d: { detalle?: string }) => d.detalle).filter(Boolean).join(', ')
      : m.tipo || 'Mantenimiento General';

    const row = wsMantenimiento.addRow({
      fecha: safeFormatDate(m.fecha, 'dd/MM/yyyy'),
      auto: sanitizeCellValue(autoStr),
      km: typeof m.km === 'number' ? m.km : parseInt(String(m.km || '0'), 10) || 0,
      detalles: sanitizeCellValue(detallesStr),
      proxima: safeFormatDate(m.nextDate, 'dd/MM/yyyy'),
      total: typeof m.total === 'number' ? m.total : parseFloat(String(m.total || '0')) || 0
    });
    row.getCell('total').numFmt = '"S/ "#,##0.00';
  });

  // =========================================================================
  // HOJA 7: FINANZAS (LIBRO UNIFICADO CRONOLÓGICO)
  // =========================================================================
  const wsFinanzas = workbook.addWorksheet('Finanzas', { views: [{ showGridLines: true }] });
  wsFinanzas.columns = [
    { header: 'Fecha', key: 'fecha', width: 14 },
    { header: 'Tipo', key: 'tipo', width: 14 },
    { header: 'Concepto / Detalle', key: 'concepto', width: 36 },
    { header: 'Medio / Método', key: 'medio', width: 18 },
    { header: 'Monto (S/)', key: 'monto', width: 16 }
  ];

  // Unificar y ordenar cronológicamente
  type Movimiento = {
    dateObj: Date | null;
    fechaFormatted: string;
    tipo: 'Ingreso' | 'Egreso';
    concepto: string;
    medio: string;
    monto: number;
  };

  const movimientos: Movimiento[] = [];

  pagos.forEach(p => {
    const d = parseSafeDate(p.fechaPago);
    const rawVal = p.pago_realizado ?? p.importe_pago;
    const monto = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal || '0')) || 0;
    movimientos.push({
      dateObj: d,
      fechaFormatted: safeFormatDate(p.fechaPago, 'dd/MM/yyyy'),
      tipo: 'Ingreso',
      concepto: p.comentario || 'Pago de Alquiler',
      medio: p.metodo_pago || 'Transferencia',
      monto
    });
  });

  egresos.forEach(e => {
    const d = parseSafeDate(e.fecha);
    const rawVal = e.egreSo;
    const monto = typeof rawVal === 'number' ? rawVal : parseFloat(String(rawVal || '0')) || 0;
    movimientos.push({
      dateObj: d,
      fechaFormatted: safeFormatDate(e.fecha, 'dd/MM/yyyy'),
      tipo: 'Egreso',
      concepto: e.concepto || 'Gasto Operativo',
      medio: e.medio || e.categoria || 'Efectivo',
      monto
    });
  });

  // Ordenar de más reciente a más antiguo
  movimientos.sort((a, b) => {
    const timeA = a.dateObj ? a.dateObj.getTime() : 0;
    const timeB = b.dateObj ? b.dateObj.getTime() : 0;
    return timeB - timeA;
  });

  movimientos.forEach(m => {
    const row = wsFinanzas.addRow({
      fecha: m.fechaFormatted,
      tipo: m.tipo,
      concepto: sanitizeCellValue(m.concepto),
      medio: sanitizeCellValue(m.medio),
      monto: m.monto
    });

    const montoCell = row.getCell('monto');
    montoCell.numFmt = '"S/ "#,##0.00';
    if (m.tipo === 'Egreso') {
      montoCell.font = { name: 'Segoe UI', color: { argb: 'FFE11D48' } }; // Rose/Red
    } else {
      montoCell.font = { name: 'Segoe UI', color: { argb: 'FF059669' } }; // Emerald/Green
    }
  });

  // =========================================================================
  // APLICAR ESTILOS GLOBALES A TODAS LAS HOJAS
  // =========================================================================
  const allSheets = [wsAutos, wsChoferes, wsAlquileres, wsDoc, wsMantenimiento, wsFinanzas];
  allSheets.forEach(ws => {
    const header = ws.getRow(1);
    header.height = 24;
    header.eachCell(cell => {
      cell.fill = headerFill;
      cell.font = headerFont;
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = thinBorder;
    });

    ws.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        row.eachCell(cell => {
          cell.border = thinBorder;
          if (!cell.alignment) {
            cell.alignment = { vertical: 'middle' };
          }
        });
      }
    });
  });

  return workbook;
}

// =============================================================================
// DESCARGA EN NAVEGADOR (BLOB)
// =============================================================================

export async function downloadWorkbookBlob(workbook: ExcelJS.Workbook, filename: string): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  // Evitar condición de carrera en Chromium/Firefox demorando la revocación
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
  }, 1000);
}

// =============================================================================
// ORQUESTADOR PRINCIPAL
// =============================================================================

export async function exportGeneralExcelReport(): Promise<void> {
  const data = await fetchReportData();
  const today = new Date();
  const workbook = await buildGeneralExcelWorkbook(data, today);
  const fileNameDate = safeFormatDate(today, 'yyyy-MM-dd');
  await downloadWorkbookBlob(workbook, `Reporte_General_RO_CHA_${fileNameDate}.xlsx`);
}
