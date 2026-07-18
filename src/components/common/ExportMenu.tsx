import { FileSpreadsheet, FileText, Printer, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { exportToExcel, exportToPDF, printData, type ExportColumn } from '@/lib/export';

interface ExportMenuProps<T> {
  data: T[];
  columns: ExportColumn<T>[];
  filename: string;
  title: string;
  sheetName?: string;
  disabled?: boolean;
}

export function ExportMenu<T>({
  data,
  columns,
  filename,
  title,
  sheetName,
  disabled,
}: ExportMenuProps<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Export
          <ChevronDown className="ml-1 h-3.5 w-3.5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => exportToExcel(data, columns, filename, sheetName)}>
          <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => exportToPDF(data, columns, filename, title)}>
          <FileText className="mr-2 h-4 w-4" /> Export PDF
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => printData(data, columns, title)}>
          <Printer className="mr-2 h-4 w-4" /> Print
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
