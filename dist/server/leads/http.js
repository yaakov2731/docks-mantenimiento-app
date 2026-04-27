"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const exceljs_1 = __importDefault(require("exceljs"));
const db_1 = require("../db");
const env_1 = require("../_core/env");
const trpc_1 = require("../_core/trpc");
const JWT_SECRET = (0, env_1.readEnv)('SESSION_SECRET') ?? 'dev-secret-change-me';
const ESTADOS = {
    nuevo: 'Nuevo',
    contactado: 'Contactado',
    visito: 'Visitó',
    cerrado: 'Cerrado',
    descartado: 'Descartado',
};
const DARK = 'FF1E1812';
const AMBER = 'FFC87C2A';
const AMBER2 = 'FFFEF4E8';
const WHITE = 'FFFFFFFF';
const GREEN = 'FF16A34A';
const GRN_BG = 'FFF0FFF4';
const BORDER = 'FFE5D5C0';
const solid = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const thinBorder = (argb) => ({ style: 'thin', color: { argb } });
const router = (0, express_1.Router)();
router.get('/leads/export', async (req, res) => {
    const token = req.cookies?.[trpc_1.JWT_COOKIE];
    if (!token) {
        res.status(401).json({ error: 'No autenticado' });
        return;
    }
    try {
        jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch {
        res.status(401).json({ error: 'Token inválido' });
        return;
    }
    try {
        const leads = await (0, db_1.getLeads)();
        const wb = new exceljs_1.default.Workbook();
        wb.creator = 'Docks del Puerto';
        const ws = wb.addWorksheet('Leads de Alquiler', {
            pageSetup: {
                paperSize: 9,
                orientation: 'portrait',
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0,
                margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
            },
        });
        const COLS = 10;
        ws.columns = [
            { width: 5 },
            { width: 22 },
            { width: 14 },
            { width: 16 },
            { width: 13 },
            { width: 12 },
            { width: 15 },
            { width: 15 },
            { width: 11 },
            { width: 12 },
        ];
        // Row 1: Título
        ws.mergeCells(1, 1, 1, COLS);
        ws.getRow(1).height = 40;
        const title = ws.getCell('A1');
        title.value = 'DOCKS DEL PUERTO';
        title.font = { name: 'Arial', size: 18, bold: true, color: { argb: WHITE } };
        title.fill = solid(DARK);
        title.alignment = { horizontal: 'center', vertical: 'middle' };
        // Row 2: Subtítulo
        ws.mergeCells(2, 1, 2, COLS);
        ws.getRow(2).height = 22;
        const sub = ws.getCell('A2');
        const fecha = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: 'long', year: 'numeric' });
        sub.value = `Leads de Alquiler   ·   ${fecha}`;
        sub.font = { name: 'Arial', size: 10, color: { argb: WHITE } };
        sub.fill = solid(AMBER);
        sub.alignment = { horizontal: 'center', vertical: 'middle' };
        // Row 3: Spacer
        ws.getRow(3).height = 6;
        // Row 4: Encabezados
        const HEADERS = ['#', 'Nombre', 'Teléfono', 'Rubro', 'Tipo Local', 'Estado', 'Turno', 'Asignado A', 'Fecha', 'Contactado ✓'];
        const hr = ws.getRow(4);
        hr.height = 24;
        HEADERS.forEach((h, i) => {
            const cell = hr.getCell(i + 1);
            cell.value = h;
            cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: WHITE } };
            cell.fill = solid(AMBER);
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = { bottom: { style: 'medium', color: { argb: DARK } } };
        });
        // Filas de datos
        leads.forEach((l, i) => {
            const contactado = ['contactado', 'visito', 'cerrado'].includes(l.estado);
            const turno = l.turnoFecha ? `${l.turnoFecha}${l.turnoHora ? ' ' + l.turnoHora : ''}` : '';
            const fechaLead = l.createdAt ? new Date(l.createdAt).toLocaleDateString('es-AR') : '';
            const values = [
                l.id,
                l.nombre,
                l.telefono ?? '',
                l.rubro ?? '',
                l.tipoLocal ?? '',
                ESTADOS[l.estado] ?? l.estado,
                turno,
                l.asignadoA ?? '',
                fechaLead,
                contactado ? '✓' : '',
            ];
            const row = ws.getRow(i + 5);
            row.height = 18;
            const bg = i % 2 === 0 ? AMBER2 : WHITE;
            values.forEach((v, j) => {
                const cell = row.getCell(j + 1);
                cell.value = v;
                const isCheck = j === 9;
                cell.fill = solid(isCheck && contactado ? GRN_BG : bg);
                cell.font = isCheck && contactado
                    ? { name: 'Arial', size: 12, bold: true, color: { argb: GREEN } }
                    : { name: 'Arial', size: 9 };
                cell.alignment = { horizontal: isCheck || j === 0 ? 'center' : 'left', vertical: 'middle' };
                cell.border = {
                    bottom: thinBorder(BORDER),
                    ...(j < 9 ? { right: thinBorder(BORDER) } : {}),
                };
            });
        });
        ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 4, topLeftCell: 'A5', activeCell: 'A5' }];
        ws.pageSetup.printArea = `A1:J${leads.length + 4}`;
        const buffer = await wb.xlsx.writeBuffer();
        const filename = `Leads-Docks-${new Date().toLocaleDateString('es-AR').replace(/\//g, '-')}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(Buffer.from(buffer));
    }
    catch (err) {
        console.error('[leads/export]', err);
        res.status(500).json({ error: String(err) });
    }
});
exports.default = router;
