import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeCellValue,
  parseSafeDate,
  findVehicle,
  buildGeneralExcelWorkbook
} from '../src/app/utils/exportReport';
import type { ReportRawData, AutoDoc } from '../src/app/utils/exportReport';

describe('General Excel Report - Security & Logic Tests', () => {
  describe('CWE-1236 Formula Injection Defense (sanitizeCellValue)', () => {
    it('should neutralize formula trigger characters with leading single quote', () => {
      assert.equal(sanitizeCellValue('=SUM(A1:A10)'), "'=SUM(A1:A10)");
      assert.equal(sanitizeCellValue('+12345'), "'+12345");
      assert.equal(sanitizeCellValue('-100'), "'-100");
      assert.equal(sanitizeCellValue('@cmd|calc'), "'@cmd|calc");
      assert.equal(sanitizeCellValue('\tTAB_INJECT'), "'TAB_INJECT");
      assert.equal(sanitizeCellValue('\rCR_INJECT'), "'CR_INJECT");
    });

    it('should preserve regular string values without leading formula characters', () => {
      assert.equal(sanitizeCellValue('Toyota Yaris'), 'Toyota Yaris');
      assert.equal(sanitizeCellValue('ABC-123'), 'ABC-123');
      assert.equal(sanitizeCellValue('Juan Pérez'), 'Juan Pérez');
    });

    it('should handle numbers, booleans, and nullish values safely', () => {
      assert.equal(sanitizeCellValue(150.5), 150.5);
      assert.equal(sanitizeCellValue(0), 0);
      assert.equal(sanitizeCellValue(true), true);
      assert.equal(sanitizeCellValue(false), false);
      assert.equal(sanitizeCellValue(null), '-');
      assert.equal(sanitizeCellValue(undefined), '-');
      assert.equal(sanitizeCellValue('   '), '-');
    });
  });

  describe('Defensive Date Parsing (parseSafeDate)', () => {
    it('should parse DD/MM/YYYY formatted strings', () => {
      const parsed = parseSafeDate('15/10/2026');
      assert.ok(parsed instanceof Date);
      assert.equal(parsed.getDate(), 15);
      assert.equal(parsed.getMonth(), 9); // 0-indexed month
      assert.equal(parsed.getFullYear(), 2026);
    });

    it('should parse YYYY-MM-DD and ISO strings', () => {
      const parsed = parseSafeDate('2026-10-21');
      assert.ok(parsed instanceof Date);
      assert.equal(parsed.getFullYear(), 2026);
      assert.equal(parsed.getMonth(), 9);
      assert.equal(parsed.getDate(), 21);
    });

    it('should handle Firestore timestamp objects ({ seconds })', () => {
      const parsed = parseSafeDate({ seconds: 1761000000 });
      assert.ok(parsed instanceof Date);
      assert.ok(!isNaN(parsed.getTime()));
    });

    it('should return null on invalid date strings or corrupted types without throwing', () => {
      assert.equal(parseSafeDate(null), null);
      assert.equal(parseSafeDate(undefined), null);
      assert.equal(parseSafeDate('invalid-date'), null);
      assert.equal(parseSafeDate({}), null);
    });
  });

  describe('Vehicle Lookup (findVehicle)', () => {
    const autos: AutoDoc[] = [
      { id: 'doc-auto-1', placa: 'ABC-123', marca: 'Toyota', modelo: 'Yaris' },
      { id: 'doc-auto-2', placa: 'XYZ-789', marca: 'Hyundai', modelo: 'Elantra' }
    ];

    it('should find vehicle by document id', () => {
      const found = findVehicle(autos, 'doc-auto-1');
      assert.ok(found);
      assert.equal(found?.placa, 'ABC-123');
    });

    it('should find vehicle by license plate fallback', () => {
      const found = findVehicle(autos, 'XYZ-789');
      assert.ok(found);
      assert.equal(found?.id, 'doc-auto-2');
    });

    it('should return undefined when query is empty or not found', () => {
      assert.equal(findVehicle(autos, undefined), undefined);
      assert.equal(findVehicle(autos, 'NON-EXISTENT'), undefined);
    });
  });

  describe('Excel Workbook Generator (buildGeneralExcelWorkbook)', () => {
    it('should generate all 7 sheets with empty dataset without throwing', async () => {
      const emptyData: ReportRawData = {
        autos: [],
        choferes: [],
        alquileres: [],
        pagos: [],
        egresos: [],
        soats: [],
        seguros: [],
        mantenimientos: []
      };

      const wb = await buildGeneralExcelWorkbook(emptyData, new Date('2026-10-21T12:00:00Z'));
      assert.ok(wb);

      const sheetNames = wb.worksheets.map(ws => ws.name);
      assert.deepEqual(sheetNames, [
        'Resumen Ejecutivo',
        'Flota de Vehículos',
        'Conductores',
        'Alquileres',
        'SOAT y Seguros',
        'Mantenimientos',
        'Finanzas'
      ]);

      // Check header in Sheet 1
      const wsResumen = wb.getWorksheet('Resumen Ejecutivo');
      assert.ok(wsResumen);
      assert.equal(wsResumen.getCell('B2').value, 'RO&CHA - REPORTE GENERAL EJECUTIVO');
    });

    it('should correctly extract real seguro.monto and not hardcode to 0', async () => {
      const data: ReportRawData = {
        autos: [{ id: 'a1', placa: 'PLK-999', marca: 'Kia', modelo: 'Soluto' }],
        choferes: [],
        alquileres: [],
        pagos: [],
        egresos: [],
        soats: [],
        seguros: [
          {
            id: 'seg1',
            placa: 'PLK-999',
            concepto: 'Seguro Todo Riesgo Rimac',
            comentario: 'Póliza vigente hasta 30/11/2026',
            monto: '1850.50'
          }
        ],
        mantenimientos: []
      };

      const wb = await buildGeneralExcelWorkbook(data, new Date('2026-10-21T12:00:00Z'));
      const wsSeguros = wb.getWorksheet('SOAT y Seguros');
      assert.ok(wsSeguros);

      // Row 2 is the first data row (Row 1 is headers)
      const dataRow = wsSeguros.getRow(2);
      assert.equal(dataRow.getCell(1).value, 'Seguro');
      assert.equal(dataRow.getCell(8).value, 1850.5); // Must equal actual parsed cost!
    });

    it('should sort financial entries chronologically and calculate net balance', async () => {
      const data: ReportRawData = {
        autos: [],
        choferes: [],
        alquileres: [],
        pagos: [
          { id: 'p1', pago_realizado: '500.00', fechaPago: '2026-10-10', comentario: 'Pago semana 1' },
          { id: 'p2', pago_realizado: '600.00', fechaPago: '2026-10-20', comentario: 'Pago semana 2' }
        ],
        egresos: [
          { id: 'e1', egreSo: '150.00', fecha: '2026-10-15', concepto: 'Cambio de aceite' }
        ],
        soats: [],
        seguros: [],
        mantenimientos: []
      };

      const wb = await buildGeneralExcelWorkbook(data, new Date('2026-10-21T12:00:00Z'));
      const wsFinanzas = wb.getWorksheet('Finanzas');
      assert.ok(wsFinanzas);

      // Row 2 should be the most recent date: 20/10/2026 (p2)
      assert.equal(wsFinanzas.getRow(2).getCell(1).value, '20/10/2026');
      assert.equal(wsFinanzas.getRow(2).getCell(2).value, 'Ingreso');
      assert.equal(wsFinanzas.getRow(2).getCell(5).value, 600);

      // Row 3 should be 15/10/2026 (e1)
      assert.equal(wsFinanzas.getRow(3).getCell(1).value, '15/10/2026');
      assert.equal(wsFinanzas.getRow(3).getCell(2).value, 'Egreso');
      assert.equal(wsFinanzas.getRow(3).getCell(5).value, 150);

      // Row 4 should be 10/10/2026 (p1)
      assert.equal(wsFinanzas.getRow(4).getCell(1).value, '10/10/2026');
      assert.equal(wsFinanzas.getRow(4).getCell(2).value, 'Ingreso');
      assert.equal(wsFinanzas.getRow(4).getCell(5).value, 500);

      // Executive summary net balance: (500 + 600) - 150 = 950
      const wsResumen = wb.getWorksheet('Resumen Ejecutivo');
      assert.ok(wsResumen);
      // Row 15 is Balance Neto del Mes
      assert.equal(wsResumen.getCell('C15').value, 950);
    });
  });
});
