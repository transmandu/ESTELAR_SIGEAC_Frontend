'use client';

import { useQuery } from '@tanstack/react-query';
import { Loader2, PackageSearch, PackageX, Search, Wrench } from 'lucide-react';
import { use, useDeferredValue, useEffect, useState } from 'react';

import { ContentLayout } from '@/components/layout/ContentLayout';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { articleListOptions } from '@api/queries';

import { columns } from './columns';
import { DataTable } from './data-table';

function StatsBar({ total }: { total: number }) {
  if (total === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant="outline" className="h-6 gap-1.5 border-border/60 px-2 font-mono text-[11px]">
        <PackageX className="size-3 text-muted-foreground" />
        {total} desmontado{total !== 1 && 's'}
      </Badge>
    </div>
  );
}

const DismountedPage = (props: PageProps<'/[company]/almacen/componentes/desmontados'>) => {
  const searchParams = use(props.searchParams);
  const highlightArticleId = String(searchParams.article_id ?? '') || null;

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(20);

  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    setPage(1);
  }, [deferredSearch, perPage]);

  const { data, isLoading, isError, isFetching, refetch } = useQuery(
    articleListOptions({
      query: {
        status: 'DISMOUNTED',
        page,
        per_page: perPage,
        search: deferredSearch.trim() || null,
      },
    }),
  );

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const total = meta?.total ?? 0;

  return (
    <ContentLayout>
      <div className="mx-auto flex w-full max-w-[1680px] flex-col gap-5">
        {/* Header */}
        <div className="flex flex-col gap-4 rounded-lg border bg-background p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
              <Wrench className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-0.5">
              <p className="text-sm font-medium text-foreground">Inventario de componentes removidos de aeronaves</p>
              <p className="text-xs text-muted-foreground">
                Busca por serial, part number o descripción para localizar componentes.
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Serial, P/N o descripción..."
              className="h-9 pl-9"
            />
            {isFetching && !isLoading && (
              <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Stats + Table */}
        {isLoading ? (
          <div className="flex h-[320px] items-center justify-center rounded-lg border bg-background">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Cargando componentes desmontados...</p>
            </div>
          </div>
        ) : isError ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-lg border bg-background p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-red-500/20 bg-red-500/5">
              <PackageSearch className="size-6 text-red-500/70" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Error al cargar componentes</p>
              <p className="text-xs text-muted-foreground">
                No se pudieron obtener los datos. Reintenta o contacta al administrador.
              </p>
            </div>
            <button
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
            >
              <Loader2 className="size-3.5" />
              Reintentar
            </button>
          </div>
        ) : rows.length === 0 && deferredSearch.trim() ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-lg border bg-background p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-muted/10">
              <Search className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Sin resultados</p>
              <p className="text-xs text-muted-foreground">
                No se encontraron componentes que coincidan con &ldquo;{deferredSearch.trim()}&rdquo;.
              </p>
            </div>
            <button
              onClick={() => setSearch('')}
              className="inline-flex items-center gap-1.5 rounded-md border border-border/60 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/30 hover:text-foreground"
            >
              Limpiar búsqueda
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-lg border bg-background p-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border/60 bg-muted/10">
              <PackageX className="size-5 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-foreground">Sin componentes desmontados</p>
              <p className="text-xs text-muted-foreground">No hay componentes en estado desmontado en este momento.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <StatsBar total={total} />
            <DataTable
              columns={columns}
              data={rows}
              page={meta?.current_page ?? 1}
              lastPage={meta?.last_page ?? 1}
              perPage={meta?.per_page ?? perPage}
              total={total}
              onPageChange={setPage}
              onPerPageChange={setPerPage}
              highlightId={highlightArticleId ? Number(highlightArticleId) : null}
            />
          </div>
        )}
      </div>
    </ContentLayout>
  );
};

export default DismountedPage;
