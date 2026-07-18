import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { useState } from "react";
import { Search, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DataTableProps<T> {
  columns: ColumnDef<T, unknown>[];
  data: T[];
  searchPlaceholder?: string;
  searchKeys?: (keyof T)[];
  toolbar?: React.ReactNode;
  emptyComponent?: React.ReactNode;
}

export function DataTable<T>({
  columns,
  data,
  searchPlaceholder = "Cari...",
  searchKeys,
  toolbar,
  emptyComponent,
}: DataTableProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn: (row, _columnId, filterValue: string) => {
      if (!filterValue) return true;
      const lower = filterValue.toLowerCase();
      if (searchKeys && searchKeys.length > 0) {
        return searchKeys.some((key) => {
          const val = row.original[key];
          return val != null && String(val).toLowerCase().includes(lower);
        });
      }
      return Object.values(row.original as Record<string, unknown>).some(
        (v) => v != null && String(v).toLowerCase().includes(lower)
      );
    },
  });

  const rows = table.getRowModel().rows;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="pl-8"
          />
        </div>
        {toolbar}
      </div>
      <div className="rounded-md border">
        <div className="relative overflow-x-auto overscroll-x-contain [-webkit-overflow-scrolling:touch]">
          <table className="w-full min-w-max text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b bg-muted/50">
                  {headerGroup.headers.map((header) => {
                    const isActionsColumn = header.column.id === "actions";
                    return (
                    <th
                      key={header.id}
                      className={cn(
                        "h-10 px-3 text-left font-medium text-muted-foreground whitespace-nowrap",
                        header.column.getCanSort() && "cursor-pointer select-none hover:bg-muted",
                        isActionsColumn &&
                          "sticky right-0 z-20 border-l bg-muted/95 shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)] backdrop-blur-sm"
                      )}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      {flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((row) => (
                  <tr key={row.id} className="group border-b transition-colors hover:bg-muted/30">
                    {row.getVisibleCells().map((cell) => {
                      const isActionsColumn = cell.column.id === "actions";
                      return (
                        <td
                          key={cell.id}
                          className={cn(
                            "px-3 py-2.5 whitespace-nowrap",
                            isActionsColumn &&
                              "sticky right-0 z-10 border-l bg-background shadow-[-8px_0_12px_-12px_rgba(15,23,42,0.45)] group-hover:bg-muted/30"
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      );
                    })}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length} className="py-8 text-center text-muted-foreground">
                    {emptyComponent ?? "Tidak ada data."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {rows.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Menampilkan {pagination.pageIndex * pagination.pageSize + 1}–
            {Math.min((pagination.pageIndex + 1) * pagination.pageSize, data.length)} dari {data.length} data
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" onClick={() => table.setPageIndex(0)} disabled={!table.getCanPreviousPage()}>
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={() => table.setPageIndex(table.getPageCount() - 1)} disabled={!table.getCanNextPage()}>
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
