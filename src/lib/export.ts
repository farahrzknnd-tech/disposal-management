import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface ExportColumn<T> {
  header: string;
  accessor: (row: T) => string | number;
}

export function exportToExcel<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
  sheetName?: string
): void {
  const rows = data.map((row) => {
    const obj: Record<string, string | number> = {};
    columns.forEach((col) => {
      obj[col.header] = col.accessor(row);
    });
    return obj;
  });

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName || "Sheet1");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToPDF<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
  title: string
): void {
  exportToPDFProfessional(data, columns, filename, title);
}

export function exportToPDFProfessional<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
  title: string,
  subtitle?: string,
  summaryRows?: string[][]
): void {
  const doc = new jsPDF({ orientation: "landscape" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(title, pageWidth / 2, 15, { align: "center" });

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, pageWidth / 2, 22, { align: "center" });
  }

  doc.setFontSize(8);
  doc.text(
    `Dicetak: ${new Date().toLocaleString("id-ID")}`,
    pageWidth / 2,
    28,
    { align: "center" }
  );

  const head = [columns.map((c) => c.header)];
  const body = data.map((row) => columns.map((c) => String(c.accessor(row))));

  autoTable(doc, {
    head,
    body,
    startY: 32,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [250, 204, 21], textColor: 30 },
    alternateRowStyles: { fillColor: [250, 250, 250] },
  });

  if (summaryRows && summaryRows.length > 0) {
    const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
    autoTable(doc, {
      body: summaryRows,
      startY: finalY + 2,
      styles: { fontSize: 9, cellPadding: 2, fontStyle: "bold" },
      columnStyles: { 0: { fontStyle: "bold" } },
    });
  }

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.text("Created by Farah Ananda", pageWidth / 2, doc.internal.pageSize.getHeight() - 5, {
    align: "center",
  });

  doc.save(`${filename}.pdf`);
}

export function exportToCSV<T>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string
): void {
  const header = columns.map((c) => c.header).join(",");
  const rows = data.map((row) =>
    columns.map((c) => {
      const val = String(c.accessor(row));
      return val.includes(",") ? `"${val}"` : val;
    }).join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function printData<T>(
  data: T[],
  columns: ExportColumn<T>[],
  title: string
): void {
  const win = window.open("", "_blank");
  if (!win) return;

  const head = columns.map((c) => `<th>${c.header}</th>`).join("");
  const body = data
    .map(
      (row) =>
        `<tr>${columns.map((c) => `<td>${c.accessor(row)}</td>`).join("")}</tr>`
    )
    .join("");

  win.document.write(`
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: Inter, sans-serif; padding: 20px; padding: 20px; }
        h1 { text-align: center; margin-bottom: 5px; }
        .meta { text-align: center; font-size: 12px; color: #666; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        th { background: #FACC15; padding: 8px; text-align: left; font-size: 12px; }
        td { padding: 6px 8px; border-bottom: 1px solid #eee; font-size: 12px; }
        tr:nth-child(even) { background: #f9f9f9; }
        .footer { text-align: center; margin-top: 20px; font-size: 10px; color: #999; font-style: italic; }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <div class="meta">Dicetak: ${new Date().toLocaleString("id-ID")}</div>
      <table>
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
      <div class="footer">Created by Farah Ananda</div>
    </body>
    </html>
  `);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 300);
}
