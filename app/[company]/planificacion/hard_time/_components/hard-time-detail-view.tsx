'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useGetHardTimeComponentDetail } from '@/hooks/planificacion/hard_time/useGetHardTimeComponentDetail';
import { formatDate, formatNumber } from '@/lib/helpers/format';
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  ClipboardCheck,
  ClipboardPlus,
  Component,
  Gauge,
  Layers3,
  Loader2,
  PackageCheck,
  PackageMinus,
  PackagePlus,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useDeleteHardTimeComponent, useToggleHardTimeInterval } from '@/actions/planificacion/hard_time/actions';
import { useState } from 'react';
import { HardTimeIntervalResource } from '@api/types';
import { HardTimeIntervalCard } from './hard-time-interval-card';
import { AlertBadge, computeComponentStatus, computeIntervalMetrics, LEVEL_CONFIG } from './hard-time-shared';
import { ComplianceHistoryDialog } from './hard-time-dashboard/compliance-history-dialog';

interface HardTimeDetailViewProps {
  componentId: number;
  averageDailyFH?: number | null;
  averageDailyFC?: number | null;
  aircraftFlightHours?: number | null;
  aircraftFlightCycles?: number | null;
  onBack: () => void;
  onInstall?: () => void;
  onUninstall?: () => void;
  onCreateInterval?: () => void;
  onEditInterval?: (interval: HardTimeIntervalResource) => void;
  onRegisterCompliance?: () => void;
}

function DetailStat({
  label,
  value,
  icon: Icon,
  mono = false,
}: {
  label: string;
  value: string;
  icon: typeof Gauge;
  mono?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-background px-3 py-3">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        <div className="flex h-6 w-6 items-center justify-center rounded-md border border-border/60 bg-muted/30">
          <Icon className="size-3.5" />
        </div>
        <span>{label}</span>
      </div>
      <p className={`mt-2 text-sm font-medium text-foreground ${mono ? 'font-mono' : ''}`}>{value}</p>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-5">
      <Card className="border-border/60">
        <CardHeader className="space-y-5">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-8 w-32" />
          </div>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-9 w-36" />
              <Skeleton className="h-6 w-24" />
            </div>
            <Skeleton className="h-7 w-72" />
            <Skeleton className="h-4 w-96 max-w-full" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-20 w-full" />
              ))}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-8">
          <Card className="border-border/60">
            <CardHeader className="border-b border-border/60 py-3">
              <Skeleton className="h-5 w-48" />
            </CardHeader>
            <CardContent className="grid gap-4 p-4 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-48 w-full" />
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4 lg:col-span-4">
          <Skeleton className="h-52 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      </div>
    </div>
  );
}

export function HardTimeDetailView({
  componentId,
  averageDailyFH,
  averageDailyFC,
  aircraftFlightHours,
  aircraftFlightCycles,
  onBack,
  onInstall,
  onUninstall,
  onCreateInterval,
  onEditInterval,
  onRegisterCompliance,
}: HardTimeDetailViewProps) {
  const {
    data: component,
    isLoading,
    isError,
    isFetching,
    refetch,
  } = useGetHardTimeComponentDetail(componentId);

  const [historyInterval, setHistoryInterval] = useState<HardTimeIntervalResource | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const deleteComponent = useDeleteHardTimeComponent(component?.aircraft_id ?? null);
  const toggleInterval = useToggleHardTimeInterval(componentId, component?.aircraft_id ?? null);

  const handleToggleInterval = (interval: HardTimeIntervalResource) => {
    toggleInterval.mutate({ path: { id: interval.id } });
  };

  const handleDelete = async () => {
    await deleteComponent.mutateAsync({ path: { id: componentId } });
    setIsDeleteConfirmOpen(false);
    onBack();
  };

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" className="gap-2 px-0 text-muted-foreground hover:bg-transparent" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Volver a componentes
        </Button>
        <Card className="border-border/60">
          <CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 py-10 text-center">
            <AlertCircle className="size-5 text-muted-foreground" />
            <div className="space-y-1">
              <p className="text-sm font-semibold">No se pudo cargar detalle.</p>
              <p className="text-sm text-muted-foreground">Puedes volver o reintentar consulta.</p>
            </div>
            <Button variant="outline" onClick={() => refetch()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!component) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" className="gap-2 px-0 text-muted-foreground hover:bg-transparent" onClick={onBack}>
          <ArrowLeft className="size-4" />
          Volver a componentes
        </Button>
        <Card className="border-border/60">
          <CardContent className="flex min-h-40 flex-col items-center justify-center gap-3 py-10 text-center">
            <p className="text-sm font-semibold">No se encontró componente.</p>
            <Button variant="outline" onClick={() => refetch()}>
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const status = aircraftFlightHours != null && aircraftFlightCycles != null
    ? computeComponentStatus(component, aircraftFlightHours, aircraftFlightCycles)
    : 'OK';
  const cfg = LEVEL_CONFIG[status];
  const StatusIcon = cfg.icon;
  const intervals = component.installed_part?.intervals ?? [];
  const activeIntervals = intervals.filter((interval) => interval.is_active);
  const inactiveIntervals = intervals.filter((interval) => !interval.is_active);
  const installation = component.active_installation;
  const isSlotEmpty =
    !installation && !component.pending_installation_request && (component.installations ?? []).length === 0;
  const componentTitle = component.batch?.name || component.description || 'Sin nombre';
  const enrichedIntervals =
    installation != null && aircraftFlightHours != null && aircraftFlightCycles != null
      ? activeIntervals.map((interval) =>
          computeIntervalMetrics(interval, installation, aircraftFlightHours, aircraftFlightCycles),
        )
      : [];
  const overdueCount = enrichedIntervals.filter((interval) => interval.status === 'OVERDUE').length;
  const warningCount = enrichedIntervals.filter((interval) => interval.status === 'WARNING').length;
  const healthyCount = enrichedIntervals.filter((interval) => interval.status === 'OK').length;
  return (
    <div className="mx-auto max-w-7xl space-y-5">
      <Card className={`overflow-hidden border-border/60 ${cfg.cardBorder} ${cfg.cardBg}`}>
        <div className="flex flex-col gap-3 border-b border-border/60 bg-background/60 px-5 py-3 lg:flex-row lg:items-center lg:justify-between">
          <Button
            variant="ghost"
            className="h-8 w-fit gap-2 rounded-md border border-transparent px-2 text-muted-foreground hover:border-border/60 hover:bg-background"
            onClick={onBack}
          >
            <ArrowLeft className="size-4" />
            Volver a componentes
          </Button>
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            <Badge variant="outline" className="h-6 gap-1 rounded-md border-border/60 bg-background px-2 font-mono">
              <Component className="size-3.5" />
              {component.position}
            </Badge>
            {component.category?.ata_chapter && (
              <Badge variant="outline" className="h-6 rounded-md border-border/60 bg-background px-2 font-mono">
                ATA {component.category.ata_chapter}
              </Badge>
            )}
            {isFetching && (
              <span className="inline-flex h-6 items-center gap-1 rounded-md border border-border/60 bg-background px-2">
                <Loader2 className="size-3 animate-spin" />
                Actualizando
              </span>
            )}
          </div>
        </div>

        <CardHeader className="gap-5 px-5 py-5">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className={`flex h-10 w-10 items-center justify-center rounded-lg border ${cfg.iconBg}`}>
                  <StatusIcon className={`h-5 w-5 ${cfg.iconText}`} />
                </div>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xl font-semibold tracking-tight text-foreground">{componentTitle}</p>
                    <AlertBadge status={status} size="medium" />
                  </div>
                  <div className="space-y-1">
                    {component.batch?.name && component.description && component.batch.name !== component.description && (
                      <p className="text-sm text-muted-foreground">{component.description}</p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Vista técnica de componente hard time con foco en estado, trazabilidad y acción rápida.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <DetailStat
                  label={installation ? 'P/N instalado' : 'P/N esperado'}
                  value={installation?.part_number ?? component.part_number ?? '—'}
                  icon={PackageCheck}
                  mono
                />
                <DetailStat label="Serial" value={installation?.serial_number ?? '—'} icon={Layers3} mono />
                <DetailStat label="Instalado" value={formatDate(installation?.installed_at)} icon={CalendarClock} />
                <DetailStat label="FH instalación" value={formatNumber(installation?.aircraft_hours_at_install, 2)} icon={Gauge} mono />
              </div>
            </div>

            <div className="xl:max-w-[320px] xl:min-w-[320px]">
              <div className="space-y-2 rounded-lg border border-border/50 bg-muted/10 p-2.5">
                <div className="px-2 pb-1">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Comandos rápidos
                  </p>
                </div>

                <div className="grid gap-1.5">
                  {installation ? (
                    <Button
                      variant="ghost"
                      className="h-11 justify-start gap-3 rounded-md border border-transparent px-3 hover:border-border/60 hover:bg-background"
                      onClick={onCreateInterval}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background">
                        <ClipboardPlus className="size-4 text-muted-foreground" />
                      </span>
                      <span className="flex flex-col items-start leading-none">
                        <span className="text-sm font-medium text-foreground">Nuevo intervalo</span>
                        <span className="text-[11px] text-muted-foreground">Agregar control hard time</span>
                      </span>
                    </Button>
                  ) : (
                    <TooltipProvider>
                      <Tooltip delayDuration={80}>
                        <TooltipTrigger asChild>
                          <span className="block">
                            <Button
                              variant="ghost"
                              className="h-11 w-full justify-start gap-3 rounded-md border border-transparent px-3"
                              disabled
                            >
                              <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background">
                                <ClipboardPlus className="size-4 text-muted-foreground" />
                              </span>
                              <span className="flex flex-col items-start leading-none">
                                <span className="text-sm font-medium text-foreground">Nuevo intervalo</span>
                                <span className="text-[11px] text-muted-foreground">Requiere parte montada</span>
                              </span>
                            </Button>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="left">Monta una parte antes de crear intervalos</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}

                  {!installation ? (
                    <Button
                      variant="ghost"
                      className="h-11 justify-start gap-3 rounded-md border border-transparent px-3 hover:border-border/60 hover:bg-background"
                      onClick={onInstall}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background">
                        <PackagePlus className="size-4 text-muted-foreground" />
                      </span>
                      <span className="flex flex-col items-start leading-none">
                        <span className="text-sm font-medium text-foreground">Montar componente</span>
                        <span className="text-[11px] text-muted-foreground">Manual o desde almacén</span>
                      </span>
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      className="h-11 justify-start gap-3 rounded-md border border-transparent px-3 hover:border-border/60 hover:bg-background"
                      onClick={onUninstall}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background">
                        <PackageMinus className="size-4 text-muted-foreground" />
                      </span>
                      <span className="flex flex-col items-start leading-none">
                        <span className="text-sm font-medium text-foreground">Desmontar componente</span>
                        <span className="text-[11px] text-muted-foreground">Retirar instalación actual</span>
                      </span>
                    </Button>
                  )}

                  <Button
                    variant="ghost"
                    className="h-11 justify-start gap-3 rounded-md border border-transparent px-3 hover:border-border/60 hover:bg-background"
                    onClick={onRegisterCompliance}
                    disabled={!installation}
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background">
                      <ClipboardCheck className="size-4 text-muted-foreground" />
                    </span>
                    <span className="flex flex-col items-start leading-none">
                      <span className="text-sm font-medium text-foreground">Registrar cumplimiento</span>
                      <span className="text-[11px] text-muted-foreground">Actualizar último cumplimiento</span>
                    </span>
                  </Button>

                  {isSlotEmpty && (
                    <Button
                      variant="ghost"
                      className="h-11 justify-start gap-3 rounded-md border border-transparent px-3 hover:border-destructive/40 hover:bg-destructive/5"
                      onClick={() => setIsDeleteConfirmOpen(true)}
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-background">
                        <Trash2 className="size-4 text-destructive" />
                      </span>
                      <span className="flex flex-col items-start leading-none">
                        <span className="text-sm font-medium text-destructive">Eliminar posición</span>
                        <span className="text-[11px] text-muted-foreground">Sin historial ni parte montada</span>
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-5">
        <div className="space-y-5">
          <Card className="overflow-hidden border-border/60 bg-background">
            <div className="flex flex-col gap-3 border-b border-border/60 px-5 py-3 md:flex-row md:items-center md:justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Plataforma de intervalos
                </p>
                <p className="text-sm font-medium text-foreground">
                  {activeIntervals.length} intervalo{activeIntervals.length !== 1 && 's'} activo
                  {activeIntervals.length !== 1 && 's'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/20 px-2 py-1">
                  <ShieldAlert className="size-3.5" />
                  {overdueCount} vencido{overdueCount !== 1 && 's'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/20 px-2 py-1">
                  <CalendarClock className="size-3.5" />
                  {warningCount} próximo{warningCount !== 1 && 's'}
                </span>
                <span className="inline-flex items-center gap-1 rounded-md border border-border/60 bg-muted/20 px-2 py-1">
                  <PackageCheck className="size-3.5" />
                  {healthyCount} en tiempo
                </span>
              </div>
            </div>

            <CardContent className="p-4">
              {activeIntervals.length === 0 ? (
                <div className="flex min-h-40 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/70 bg-muted/10 py-10 text-center">
                  <p className="text-sm font-semibold">Sin intervalos configurados</p>
                  <p className="text-sm text-muted-foreground">
                    Componente no tiene intervalos activos para mostrar.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
                  {activeIntervals.map((interval) => (
                    <HardTimeIntervalCard
                      key={interval.id}
                      interval={interval}
                      installation={installation}
                      aircraftFlightHours={aircraftFlightHours}
                      aircraftFlightCycles={aircraftFlightCycles}
                      averageDailyFH={averageDailyFH}
                      averageDailyFC={averageDailyFC}
                      onViewHistory={() => setHistoryInterval(interval)}
                      onEdit={onEditInterval ? () => onEditInterval(interval) : undefined}
                      onToggle={() => handleToggleInterval(interval)}
                      isToggling={toggleInterval.isPending}
                    />
                  ))}
                </div>
              )}

              {inactiveIntervals.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-border/40 pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Intervalos inactivos
                  </p>
                  <div className="space-y-1.5">
                    {inactiveIntervals.map((interval) => (
                      <div
                        key={interval.id}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-muted/10 px-3 py-2"
                      >
                        <p className="text-sm text-muted-foreground">{interval.task_description}</p>
                        <div className="flex items-center gap-0.5">
                          {onEditInterval && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                              onClick={() => onEditInterval(interval)}
                            >
                              Editar
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                            onClick={() => handleToggleInterval(interval)}
                            disabled={toggleInterval.isPending}
                          >
                            Activar
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar posición</DialogTitle>
            <DialogDescription>
              Se eliminará la posición <span className="font-mono font-medium">{component.position}</span> (
              {componentTitle}). Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleteComponent.isPending}>
              {deleteComponent.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ComplianceHistoryDialog
        open={historyInterval !== null}
        onOpenChange={(open) => { if (!open) setHistoryInterval(null); }}
        interval={historyInterval}
        intervalId={historyInterval?.id ?? null}
      />
    </div>
  );
}
