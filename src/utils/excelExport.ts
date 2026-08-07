// src/utils/excelExport.ts
import * as ExcelJS from "exceljs";

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
  numFmt?: string;
}

export interface LowValueRule {
  key: string;
  threshold: number;
  belowIsLow?: boolean;
}

export interface ExportOptions {
  title: string;
  subtitle?: string;
  columns: ExportColumn[];
  rows: Record<string, any>[];
  summaryRow?: Record<string, any>;
  statsLine?: string;
  filename: string;
  sheetName?: string;
  lowValueRule?: LowValueRule;
}

const FONT = "Arial";
const HEADER_FILL = "FF1F4E78";
const SUMMARY_FILL = "FF2E7D32";
const ALT_FILL = "FFF2F6FA";
const LOW_FILL = "FFFDEAEA";
const BORDER_COLOR = "FFB7B7B7";

function borderAll() {
  const side: Partial<ExcelJS.Border> = {
    style: "thin",
    color: { argb: BORDER_COLOR },
  };
  return { top: side, left: side, bottom: side, right: side };
}

export async function exportStyledExcel(opts: ExportOptions) {
  const {
    title,
    subtitle,
    columns,
    rows,
    summaryRow,
    statsLine,
    filename,
    sheetName = "Report",
    lowValueRule,
  } = opts;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  const colCount = columns.length;

  // Title
  ws.mergeCells(1, 1, 1, colCount);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { name: FONT, size: 14, bold: true, color: { argb: "FF1F4E78" } };
  titleCell.alignment = { horizontal: "center", vertical: "middle" };

  let headerRowIndex = 3;
  if (subtitle) {
    ws.mergeCells(2, 1, 2, colCount);
    const subCell = ws.getCell(2, 1);
    subCell.value = subtitle;
    subCell.font = { name: FONT, size: 10, italic: true, color: { argb: "FF595959" } };
    subCell.alignment = { horizontal: "center", vertical: "middle" };
    headerRowIndex = 4;
  }

  // Header row
  const headerRow = ws.getRow(headerRowIndex);
  columns.forEach((col, i) => {
    const cell = headerRow.getCell(i + 1);
    cell.value = col.header;
    cell.font = { name: FONT, size: 11, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: HEADER_FILL } };
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = borderAll();
  });
  headerRow.height = 22;

  // Data rows
  const firstDataRow = headerRowIndex + 1;
  rows.forEach((rowData, idx) => {
    const r = ws.getRow(firstDataRow + idx);
    columns.forEach((col, i) => {
      const cell = r.getCell(i + 1);
      cell.value = rowData[col.key];
      cell.font = { name: FONT, size: 10 };
      cell.alignment = { horizontal: i === 1 ? "left" : "center", vertical: "middle" };
      cell.border = borderAll();
      if (col.numFmt) cell.numFmt = col.numFmt;
      if (idx % 2 === 1) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: ALT_FILL } };
      }
    });

    if (lowValueRule) {
      const val = rowData[lowValueRule.key];
      const belowIsLow = lowValueRule.belowIsLow !== false;
      const isLow = belowIsLow ? val < lowValueRule.threshold : val > lowValueRule.threshold;
      if (isLow) {
        columns.forEach((_, i) => {
          r.getCell(i + 1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: LOW_FILL } };
        });
      }
    }
  });

  const lastDataRow = firstDataRow + rows.length - 1;

  // Grand Total
  if (summaryRow) {
    const sRowIndex = lastDataRow + 2;
    const sRow = ws.getRow(sRowIndex);
    columns.forEach((col, i) => {
      const cell = sRow.getCell(i + 1);
      cell.value = summaryRow[col.key] ?? "";
      cell.font = { name: FONT, size: 10, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: SUMMARY_FILL } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = borderAll();
      if (col.numFmt) cell.numFmt = col.numFmt;
    });

    if (statsLine) {
      const statsRowIndex = sRowIndex + 1;
      ws.mergeCells(statsRowIndex, 1, statsRowIndex, colCount);
      const statsCell = ws.getCell(statsRowIndex, 1);
      statsCell.value = statsLine;
      statsCell.font = { name: FONT, size: 9, italic: true, color: { argb: "FF595959" } };
      statsCell.alignment = { horizontal: "left", vertical: "middle" };
    }
  }

  // Column widths + freeze pane
  columns.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width || 16;
  });
  ws.views = [{ state: "frozen", ySplit: headerRowIndex }];

  // Download
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}