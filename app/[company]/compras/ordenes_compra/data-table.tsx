'use client';

import {
  ColumnDef,
  ColumnFiltersState,
  ExpandedState,
  flexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  Row,
  SortingState,
  useReactTable,
} from '@tanstack/react-table';

import { DataTablePagination } from '@/components/tables/DataTablePagination';
import { DataTableViewOptions } from '@/components/tables/DataTableViewOptions';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { PurchaseOrder } from '@/types';
import { Fragment, useState } from 'react';

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

function POSubRow({ row }: { row: Row<PurchaseOrder> }) {
  const articles = row.original.article_purchase_order;

  return (
    <div className="border-t bg-muted/20 px-6 py-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        Artículos
      </p>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Batch
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Part Number
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                ALT P/N
              </TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Qty
              </TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Unit Price
              </TableHead>
              <TableHead className="text-right text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Total
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {articles.map((article) => {
              const lineTotal = Number(article.unit_price) * Number(article.quantity);
              return (
                <TableRow key={article.id} className="hover:bg-muted/10">
                  <TableCell className="py-2 text-sm text-muted-foreground">
                    {article.batch?.name ?? '—'}
                  </TableCell>
                  <TableCell className="py-2 font-mono text-sm font-medium">
                    {article.article_part_number}
                  </TableCell>
                  <TableCell className="py-2 font-mono text-sm text-muted-foreground">
                    {article.article_alt_part_number ?? '—'}
                  </TableCell>
                  <TableCell className="py-2 text-right text-sm">
                    {article.quantity}
                  </TableCell>
                  <TableCell className="py-2 text-right text-sm">
                    {moneyFormatter.format(Number(article.unit_price))}
                  </TableCell>
                  <TableCell className="py-2 text-right text-sm font-medium">
                    {moneyFormatter.format(lineTotal)}
                  </TableCell>
                </TableRow>
              );
            })}
            <TableRow className="border-t hover:bg-transparent">
              <TableCell
                colSpan={5}
                className="py-2 text-right text-[11px] font-semibold uppercase tracking-widest text-muted-foreground"
              >
                Subtotal
              </TableCell>
              <TableCell className="py-2 text-right text-sm font-semibold">
                {moneyFormatter.format(Number(row.original.sub_total))}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

interface DataTableProps<TValue> {
  columns: ColumnDef<PurchaseOrder, TValue>[];
  data: PurchaseOrder[];
}

export function DataTable<TValue>({ columns, data }: DataTableProps<TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [expanded, setExpanded] = useState<ExpandedState>({});

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, expanded },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onExpandedChange: setExpanded,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  return (
    <>
      <div className="flex items-center justify-between py-4">
        <p className="text-sm text-muted-foreground">
          {table.getFilteredRowModel().rows.length} resultado(s)
        </p>
        <DataTableViewOptions table={table} />
      </div>

      <div className="rounded-md border">
        <ScrollArea className="w-full">
          <div className="min-w-[820px]">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id} className="whitespace-nowrap">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <Fragment key={row.id}>
                      <TableRow
                        data-state={row.getIsSelected() && 'selected'}
                        className={cn('hover:bg-muted/40 transition-colors', row.getIsExpanded() && 'bg-muted/10')}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id} className="align-middle">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        ))}
                      </TableRow>
                      {row.getIsExpanded() && (
                        <TableRow className="hover:bg-transparent">
                          <TableCell colSpan={columns.length} className="p-0">
                            <POSubRow row={row} />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                      No se ha encontrado ningún resultado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      </div>

      <div className="mt-4">
        <DataTablePagination table={table} />
      </div>
    </>
  );
}
