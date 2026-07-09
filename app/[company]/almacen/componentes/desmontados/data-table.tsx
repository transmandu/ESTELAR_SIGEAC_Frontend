'use client';

import { ColumnDef, flexRender, getCoreRowModel, useReactTable } from '@tanstack/react-table';
import { ChevronFirst, ChevronLast, ChevronLeftIcon, ChevronRightIcon } from 'lucide-react';
import { useCallback } from 'react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { ArticleListItemResource } from '@api/types';

interface DataTableProps {
  columns: ColumnDef<ArticleListItemResource>[];
  data: ArticleListItemResource[];
  page: number;
  lastPage: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
  highlightId?: number | null;
}

export function DataTable({
  columns,
  data,
  page,
  lastPage,
  perPage,
  total,
  onPageChange,
  onPerPageChange,
  highlightId,
}: DataTableProps) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    pageCount: lastPage,
  });

  const canPrev = page > 1;
  const canNext = page < lastPage;

  const highlightedRowRef = useCallback((el: HTMLTableRowElement | null) => {
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-hidden rounded-lg border bg-background">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-b bg-muted/15 hover:bg-muted/15">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="h-10 px-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row, rowIdx) => {
                const isHighlighted = highlightId != null && row.original.id === highlightId;
                return (
                  <TableRow
                    key={row.id}
                    ref={isHighlighted ? highlightedRowRef : undefined}
                    className={cn(
                      rowIdx % 2 === 0 ? 'bg-background hover:bg-muted/20' : 'bg-muted/5 hover:bg-muted/20',
                      isHighlighted && 'bg-amber-500/10 hover:bg-amber-500/15 ring-1 ring-inset ring-amber-500/40',
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="px-4 py-2.5 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <p className="text-sm font-medium text-foreground">Sin resultados</p>
                    <p className="text-xs text-muted-foreground">No hay componentes desmontados que mostrar.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col items-center justify-between gap-3 px-1 sm:flex-row">
        <p className="text-xs text-muted-foreground">
          {total > 0 ? (
            <>
              Página <span className="font-medium text-foreground">{page}</span> de{' '}
              <span className="font-medium text-foreground">{lastPage}</span>
              {' · '}
              <span className="font-medium text-foreground">{total}</span> registro{total !== 1 && 's'}
            </>
          ) : (
            'Sin resultados'
          )}
        </p>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Por página</span>
            <Select value={`${perPage}`} onValueChange={(v) => onPerPageChange(Number(v))}>
              <SelectTrigger className="h-8 w-[72px] text-xs">
                <SelectValue placeholder={perPage} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 50].map((n) => (
                  <SelectItem key={n} value={`${n}`}>
                    {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 sm:flex"
              onClick={() => onPageChange(1)}
              disabled={!canPrev}
            >
              <ChevronFirst className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange(page - 1)}
              disabled={!canPrev}
            >
              <ChevronLeftIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange(page + 1)}
              disabled={!canNext}
            >
              <ChevronRightIcon className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 sm:flex"
              onClick={() => onPageChange(lastPage)}
              disabled={!canNext}
            >
              <ChevronLast className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
