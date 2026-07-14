'use client';

import Link from 'next/link';
import { useDeferredValue, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';

import { ContentLayout } from '@/components/layout/ContentLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useGetHardTimeTraceability } from '@/hooks/planificacion/hard_time/useGetHardTimeTraceability';
import { useCompanyStore } from '@/stores/CompanyStore';

function formatDate(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleDateString();
}

function formatNumber(value?: number | null, digits = 1) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toLocaleString(undefined, { maximumFractionDigits: digits });
}

export function HardTimeTraceabilityClient() {
  const { selectedCompany } = useCompanyStore();
  const [serialNumber, setSerialNumber] = useState('');
  const deferredSerialNumber = useDeferredValue(serialNumber);
  const { data, isFetching } = useGetHardTimeTraceability(deferredSerialNumber);

  const items = data?.data ?? [];
  const canSearch = serialNumber.trim().length >= 2;

  return (
    <ContentLayout title="Trazabilidad Hard Time">
      <main className="max-w-[1680px] space-y-6 p-4 lg:p-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-xl font-semibold">Trazabilidad por serial</h1>
            <p className="text-sm text-muted-foreground">
              Busca historial completo de componente entre aeronaves de compañía.
            </p>
          </div>

          <Button asChild variant="outline" className="gap-2">
            <Link href={`/${selectedCompany?.slug}/planificacion/hard_time`}>
              <ArrowLeft className="size-4" />
              Volver
            </Link>
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Buscar serial</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative max-w-xl">
              <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
              <Input
                value={serialNumber}
                onChange={(event) => setSerialNumber(event.target.value)}
                className="pl-10"
                placeholder="Ej: ENG-001"
              />
            </div>

            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Badge variant="outline">{items.length} registro(s)</Badge>
              {isFetching && <span>Buscando…</span>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Aeronave</TableHead>
                  <TableHead>Posición / parte</TableHead>
                  <TableHead>Serial / PN</TableHead>
                  <TableHead>Montado</TableHead>
                  <TableHead>Desmontado</TableHead>
                  <TableHead>FH / FC montaje</TableHead>
                  <TableHead>Cumplimientos</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.length > 0 ? (
                  items.map((record) => (
                    <TableRow key={record.installation.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{record.slot.aircraft?.acronym ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">
                            {record.slot.aircraft?.model ?? record.slot.aircraft?.serial ?? '—'}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{record.slot.position ?? '—'}</p>
                          <p className="text-xs text-muted-foreground">{record.slot.description ?? '—'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-0.5 font-mono text-xs">
                          <p>{record.installation.serial_number ?? '—'}</p>
                          <p className="text-muted-foreground">{record.installation.part_number ?? '—'}</p>
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(record.installation.installed_at)}</TableCell>
                      <TableCell>{formatDate(record.installation.removed_at)}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {formatNumber(record.installation.component_hours_at_install, 2)} /{' '}
                        {formatNumber(record.installation.component_cycles_at_install, 0)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div>{record.compliances_count}</div>
                          {record.compliances?.slice(0, 2).map((compliance) => (
                            <div key={compliance.id} className="text-xs text-muted-foreground">
                              {formatDate(compliance.compliance_date)} ·{' '}
                              {compliance.work_order?.order_number ?? 'Sin OT'}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : isFetching && canSearch ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      Buscando trazabilidad...
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      {!canSearch
                        ? 'Escribe al menos 2 caracteres para buscar.'
                        : 'No se encontraron resultados.'}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </ContentLayout>
  );
}
