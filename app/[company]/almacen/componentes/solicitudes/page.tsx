'use client';

import { ContentLayout } from '@/components/layout/ContentLayout';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetInstallRequests } from '@/hooks/planificacion/hard_time/useGetInstallRequests';
import { useApproveInstallRequest, useRejectInstallRequest } from '@/actions/planificacion/hard_time/actions';
import { formatDate } from '@/lib/helpers/format';
import { HardTimeInstallationRequestResource } from '@api/types';
import {
  CheckCircle2,
  Clock,
  Plane,
  SearchCheck,
  XCircle,
  ClipboardList,
  Wrench,
  Hash,
  MapPin,
  Package,
  ArrowDown,
  ArrowRight,
  PackageSearch,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

const STATUS_CONFIG: Record<string, { icon: typeof Clock; label: string; badgeClass: string; accentClass: string }> = {
  pending: {
    icon: Clock,
    label: 'Pendiente',
    badgeClass: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    accentClass: 'border-l-amber-500 bg-amber-500/[0.03]',
  },
  approved: {
    icon: CheckCircle2,
    label: 'Aprobado',
    badgeClass: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
    accentClass: 'border-l-emerald-500 bg-emerald-500/[0.03]',
  },
  rejected: {
    icon: XCircle,
    label: 'Rechazado',
    badgeClass: 'bg-red-500/10 text-red-600 border-red-500/20',
    accentClass: 'border-l-red-500 bg-red-500/[0.03]',
  },
};

function RequestCardSkeleton() {
  return (
    <div className="rounded-lg border border-border/60 border-l-4 border-l-muted bg-background">
      <div className="flex items-center justify-between px-4 pt-3">
        <Skeleton className="h-5 w-28" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-md" />
          <Skeleton className="h-8 w-20 rounded-md" />
        </div>
      </div>
      <div className="mx-4 mt-3 border-t border-border/40" />
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-0 px-4 py-3">
        <div className="rounded-lg border border-border/60 p-3">
          <Skeleton className="h-3 w-40" />
          <div className="mt-2 space-y-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <div className="flex items-center justify-center px-2">
          <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <div className="rounded-lg border border-border/60 p-3">
          <Skeleton className="h-3 w-32" />
          <div className="mt-2 space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
      <div className="mx-4 border-t border-border/40" />
      <div className="px-4 pt-2.5 pb-3">
        <Skeleton className="h-3 w-28" />
        <div className="mt-2 grid grid-cols-4 gap-3">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

function RequestCard({
  request,
  onApprove,
  onReject,
}: {
  request: HardTimeInstallationRequestResource;
  onApprove: (id: number) => void;
  onReject: (id: number) => void;
}) {
  const cfg = STATUS_CONFIG[request.status] ?? STATUS_CONFIG.pending;
  const StatusIcon = cfg.icon;
  const slot = request.aircraft_slot;
  const batch = slot?.batch;

  return (
    <div className={cn('rounded-lg border border-border/60', cfg.accentClass, 'border-l-4')}>
      {/* ── Header ── */}
      <div className="flex flex-col gap-3 px-4 pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-semibold text-foreground">Solicitud #{request.id}</span>
          <Badge variant="outline" className={`h-5 gap-1 px-1.5 text-[10px] ${cfg.badgeClass}`}>
            <StatusIcon className="size-3" />
            {cfg.label}
          </Badge>
        </div>

        {request.status === 'pending' && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 border-red-500/30 text-[11px] text-red-600 hover:bg-red-500/10"
              onClick={() => onReject(request.id)}
            >
              <XCircle className="size-3.5" />
              Rechazar
            </Button>
            <Button
              size="sm"
              className="h-8 gap-1 text-[11px]"
              onClick={() => onApprove(request.id)}
            >
              <CheckCircle2 className="size-3.5" />
              Aprobar
            </Button>
          </div>
        )}
      </div>

      {/* ── Flow: Almacén → Slot (side by side on desktop) ── */}
      <div className="mx-4 mt-3 border-t border-border/40" />
      <div className="grid grid-cols-1 gap-0 px-4 py-3 sm:grid-cols-[1fr_auto_1fr] sm:items-start">
        {/* ── Left: Artículo desde almacén ── */}
        <div className="rounded-lg border border-border/60 bg-muted/[0.06] p-3">
          <div className="flex items-center gap-1.5">
            <PackageSearch className="size-3 text-muted-foreground" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Artículo a extraer del almacén
            </p>
          </div>
          <div className="mt-2 space-y-1.5">
            <p className="font-mono text-sm font-semibold text-foreground">{slot?.part_number ?? '—'}</p>
            {slot?.description && (
              <p className="text-[13px] leading-snug text-foreground/80">{slot.description}</p>
            )}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-0.5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Hash className="size-3 shrink-0" />
                Artículo <span className="font-mono font-medium text-foreground">#{request.article_id}</span>
              </span>
              {batch && (
                <span className="flex items-center gap-1">
                  <Package className="size-3 shrink-0" />
                  Lote <span className="font-mono font-medium text-foreground">{batch.slug || batch.name}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Arrow connector ── */}
        <div className="flex items-center justify-center py-2 sm:px-2 sm:py-0">
          <div className="flex items-center justify-center rounded-full border border-border/60 bg-muted/30 p-1">
            <ArrowDown className="size-4 text-muted-foreground sm:hidden" />
            <ArrowRight className="hidden size-4 text-muted-foreground sm:block" />
          </div>
        </div>

        {/* ── Right: Slot de destino ── */}
        <div className="rounded-lg border border-border/60 bg-muted/[0.06] p-3">
          <div className="flex items-center gap-1.5">
            <Wrench className="size-3 text-muted-foreground" />
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Posición de destino en aeronave
            </p>
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs">
              <Plane className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="font-medium text-foreground">{slot?.aircraft?.acronym ?? '—'}</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="font-medium text-foreground">{slot?.position ?? '—'}</span>
            </div>
            {slot?.category && (
              <div className="pt-0.5">
                <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  {slot.category.name} {slot.category.ata_chapter ? `· ATA ${slot.category.ata_chapter}` : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Installation details ── */}
      <div className="mx-4 mt-3 border-t border-border/40" />
      <div className="px-4 pt-2.5 pb-3">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          Datos de instalación
        </p>
        <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Fecha instalación
            </p>
            <p className="text-sm font-medium text-foreground">{formatDate(request.installed_at)}</p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">FH al montar</p>
            <p className="font-mono text-sm font-medium text-foreground">
              {request.component_hours_at_install?.toLocaleString() ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">FC al montar</p>
            <p className="font-mono text-sm font-medium text-foreground">
              {request.component_cycles_at_install?.toLocaleString() ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Solicitado</p>
            <p className="text-sm font-medium text-foreground">
              {request.created_at ? formatDate(request.created_at) : '—'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Resolution reason (conditional) ── */}
      {request.resolution_reason && (
        <>
          <div className="mx-4 border-t border-border/40" />
          <div className="px-4 pb-3 pt-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Motivo de resolución
            </p>
            <p className="mt-0.5 text-xs text-foreground/80">{request.resolution_reason}</p>
          </div>
        </>
      )}
    </div>
  );
}

export default function SolicitudesInstalacionPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const { data: requests = [], isLoading, isError, refetch } = useGetInstallRequests(
    statusFilter === 'all' ? undefined : statusFilter,
  );

  const approveMutation = useApproveInstallRequest(0, null);
  const rejectMutation = useRejectInstallRequest(0, null);

  const handleApprove = (id: number) => {
    approveMutation.mutate({ path: { id } }, { onSuccess: () => refetch() });
  };

  const handleReject = (id: number) => {
    rejectMutation.mutate({ path: { id } }, { onSuccess: () => refetch() });
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <ContentLayout>
      <main className="max-w-5xl">
        <Card className="border-border/60">
          <CardHeader className="flex flex-col gap-3 border-b border-border/60 bg-muted/15 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-0.5">
              <h2 className="text-base font-semibold">Solicitudes de Instalación Hard Time</h2>
              <p className="text-xs text-muted-foreground">
                Revisa y procesa las solicitudes de instalación desde almacén.
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map((filter) => (
                <Button
                  key={filter}
                  variant={statusFilter === filter ? 'default' : 'outline'}
                  size="sm"
                  className="h-7 text-[11px]"
                  onClick={() => setStatusFilter(filter)}
                >
                  {filter === 'all'
                    ? 'Todas'
                    : filter === 'pending'
                      ? 'Pendientes'
                      : filter === 'approved'
                        ? 'Aprobadas'
                        : 'Rechazadas'}
                </Button>
              ))}
            </div>
          </CardHeader>

          <CardContent className="p-4">
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <RequestCardSkeleton key={i} />
                ))}
              </div>
            ) : isError ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center">
                <SearchCheck className="size-5 text-muted-foreground" />
                <p className="text-sm font-semibold">No se pudieron cargar las solicitudes</p>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  Reintentar
                </Button>
              </div>
            ) : requests.length === 0 ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center">
                <ClipboardList className="size-5 text-muted-foreground" />
                <p className="text-sm font-semibold">
                  {statusFilter === 'pending' ? 'No hay solicitudes pendientes' : 'No hay solicitudes'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {statusFilter === 'pending'
                    ? 'Todas las solicitudes han sido procesadas.'
                    : 'Cambia el filtro para ver otras solicitudes.'}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {statusFilter === 'pending' && pendingCount > 0 && (
                  <div className="flex items-center gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2">
                    <Clock className="size-3.5 text-amber-600" />
                    <p className="text-xs text-amber-700 dark:text-amber-400">
                      {pendingCount} solicitud{pendingCount !== 1 && 'es'} pendiente{pendingCount !== 1 && 's'} de
                      aprobación
                    </p>
                  </div>
                )}
                {requests.map((request) => (
                  <RequestCard
                    key={request.id}
                    request={request}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </ContentLayout>
  );
}
