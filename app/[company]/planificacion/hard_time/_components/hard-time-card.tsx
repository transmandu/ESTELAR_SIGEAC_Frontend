'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { HardTimeAlertLevel, HardTimeIntervalWithMetrics } from '@/types';
import { AircraftComponentSlotResource } from '@api/types';
import Link from 'next/link';
import {
  CircleOff,
  ClockArrowUp,
  GripHorizontal,
  ListPlus,
  MapPinned,
  PackageMinus,
  PackagePlus,
  Unplug,
} from 'lucide-react';
import { useMemo } from 'react';
import {
  AlertBadge,
  computeIntervalMetrics,
  LEVEL_CONFIG,
  METRIC_ICONS,
  METRIC_LABELS,
  METRIC_UNITS,
  STATUS_ORDER,
} from './hard-time-shared';
import { PendingInstallationRequest } from './pending-installation-request';

interface HardTimeCardProps {
  component: AircraftComponentSlotResource;
  href: string;
  averageDailyFH?: number | null;
  averageDailyFC?: number | null;
  aircraftFlightHours?: number | null;
  aircraftFlightCycles?: number | null;
  onInstall?: () => void;
  onUninstall?: () => void;
  onCreateInterval?: () => void;
  onCancelRequest?: () => void;
  isCancellingRequest?: boolean;
}

// ── Connector strip: visual "plug" interface between slot and part ──────────

function ConnectorInterface({ active, status }: { active: boolean; status?: HardTimeAlertLevel }) {
  const dotColor = !active
    ? 'bg-sky-400/60'
    : status === 'OVERDUE'
      ? 'bg-red-500'
      : status === 'WARNING'
        ? 'bg-amber-500'
        : 'bg-emerald-500';
  return (
    <div className="flex items-center gap-1.5 px-4 py-2">
      <div className="h-px flex-1 bg-border/60" />
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className={cn('h-2 w-2 rounded-full', dotColor)} />
        ))}
      </div>
      <div className="h-px flex-1 bg-border/60" />
    </div>
  );
}

// ── Slot header: the fixed receptacle identity ──────────────────────────────

function SlotIdentity({
  position,
  ataChapter,
  isEmpty,
}: {
  position: string;
  ataChapter?: string;
  isEmpty: boolean;
}) {
  return (
    <div className="flex items-center gap-2.5 px-5 pt-4">
      <div
        className={cn(
          'flex h-8 w-8 shrink-0 items-center justify-center rounded-md border',
          isEmpty
            ? 'border-sky-500/20 bg-sky-500/10'
            : 'border-border/60 bg-muted/30',
        )}
      >
        <MapPinned className={cn('h-4 w-4', isEmpty ? 'text-sky-600' : 'text-muted-foreground')} />
      </div>
      <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
        <div className="flex min-w-0 items-baseline gap-2">
          <p className="shrink-0 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Posición</p>
          <span className="truncate font-mono text-base font-semibold text-foreground">{position}</span>
        </div>
        {ataChapter && (
          <span className="shrink-0 whitespace-nowrap rounded border border-border/60 bg-muted/30 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
            ATA {ataChapter}
          </span>
        )}
      </div>
    </div>
  );
}

export function HardTimeCard({
  component,
  href,
  aircraftFlightHours,
  aircraftFlightCycles,
  onInstall,
  onUninstall,
  onCreateInterval,
  onCancelRequest,
  isCancellingRequest,
}: HardTimeCardProps) {
  const isVacant = !component.active_installation;
  const rawIntervals = component.installed_part?.intervals;
  const rawIntervalsCount = rawIntervals?.length ?? 0;
  const installation = component.active_installation;
  const pendingRequest = component.pending_installation_request;

  const intervals = useMemo(() => {
    if (!installation || aircraftFlightHours == null || aircraftFlightCycles == null) return [];
    return (rawIntervals ?? [])
      .filter((i) => i.is_active !== false)
      .map(
        (i): HardTimeIntervalWithMetrics =>
          computeIntervalMetrics(i, installation, aircraftFlightHours, aircraftFlightCycles),
      );
  }, [rawIntervals, installation, aircraftFlightHours, aircraftFlightCycles]);

  const componentStatus = useMemo(() => {
    return (intervals || []).reduce<HardTimeAlertLevel>(
      (worst, i) => (STATUS_ORDER[i.status] > STATUS_ORDER[worst] ? i.status : worst),
      'OK',
    );
  }, [intervals]);

  const cfg = LEVEL_CONFIG[componentStatus];
  const LevelIcon = cfg.icon;

  const statusCounts: Record<HardTimeAlertLevel, number> = { OK: 0, WARNING: 0, OVERDUE: 0 };
  intervals.forEach((i) => {
    statusCounts[i.status]++;
  });

  const shouldScrollMetrics = intervals.length > 2;

  const category = component.category;
  const componentTitle = component.batch?.name || component.description || 'Sin nombre';
  const hasInstalledPart = Boolean(
    component?.installed_part_id ?? component?.installed_part?.id ?? component?.active_installation,
  );
  const canCreateInterval = Boolean(onCreateInterval && hasInstalledPart);

  // ── VACANT SLOT ─────────────────────────────────────────────────────────────

  if (isVacant) {
    return (
      <Link
        href={href}
        className="group block cursor-pointer overflow-hidden rounded-lg border border-dashed border-sky-400/40 bg-sky-500/[0.03] transition-colors hover:border-sky-500/60 hover:bg-sky-500/[0.06]"
      >
        {/* Slot identity */}
        <SlotIdentity
          position={component.position}
          ataChapter={category?.ata_chapter}
          isEmpty
        />

        {/* Connector interface — inactive */}
        <ConnectorInterface active={false} />

        {/* Empty bay */}
        <div className="space-y-3.5 px-5 pb-4">
          {pendingRequest ? (
            <PendingInstallationRequest
              request={pendingRequest}
              position={component.position}
              componentName={component.batch?.name || component.description || undefined}
              onCancel={onCancelRequest}
              isCancelling={isCancellingRequest}
            />
          ) : (
            <div className="flex flex-col items-center gap-3 rounded-md border border-dashed border-sky-400/30 bg-background/50 px-4 py-6">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-sky-400/30 bg-sky-500/10">
                <Unplug className="h-4 w-4 text-sky-500/70" />
              </div>
              <div className="space-y-0.5 text-center">
                <p className="text-sm font-medium text-foreground">{componentTitle}</p>
                {component.part_number && (
                  <p className="font-mono text-[11px] text-muted-foreground">P/N esperado: {component.part_number}</p>
                )}
              </div>
              <p className="text-center text-xs leading-relaxed text-muted-foreground">
                Posición vacía — monta un componente<br />para activar el control hard time.
              </p>
              {!pendingRequest && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1.5 border-sky-500/30 px-3.5 text-xs text-sky-700 transition-transform hover:bg-sky-500/10 active:scale-[0.97] dark:text-sky-300"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInstall?.();
                  }}
                >
                  <PackagePlus className="h-3.5 w-3.5" />
                  Montar componente
                </Button>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Badge variant="outline" className="h-6 border-border/60 px-2.5 text-[11px] font-normal">
              {rawIntervalsCount} intervalo{rawIntervalsCount !== 1 && 's'}
            </Badge>
            <Badge
              variant="outline"
              className="h-6 gap-1 border-sky-500/20 bg-sky-500/10 px-2 text-[11px] text-sky-700 dark:text-sky-300"
            >
              <CircleOff className="h-3 w-3" />
              Vacío
            </Badge>
          </div>
        </div>
      </Link>
    );
  }

  // ── OCCUPIED SLOT ───────────────────────────────────────────────────────────

  return (
    <Link
      href={href}
      className={cn(
        'group block cursor-pointer overflow-hidden rounded-lg transition-colors hover:brightness-[0.99] dark:hover:brightness-110',
        cfg.cardBorder,
        cfg.cardBg,
      )}
    >
      {/* Slot identity */}
      <SlotIdentity
        position={component.position}
        ataChapter={category?.ata_chapter}
        isEmpty={false}
      />

      {/* Connector interface — active, status-colored */}
      <ConnectorInterface active status={componentStatus} />

      {/* Installed part — the pluggable module */}
      <div className="mx-4 mb-4 overflow-hidden rounded-md border border-border/60 bg-background/70">
        {/* Part header */}
        <div className="flex items-start justify-between gap-3 border-b border-border/40 px-4 py-3.5">
          <div className="flex min-w-0 items-start gap-3">
            <div
              className={cn(
                'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md',
                cfg.iconBg,
              )}
            >
              <LevelIcon className={cn('h-4 w-4', cfg.iconText)} />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm font-semibold leading-tight text-foreground">
                {componentTitle}
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                <span className="font-mono">
                  {installation ? 'P/N' : 'P/N esperado'}: {installation?.part_number ?? component.part_number ?? '—'}
                </span>
                {installation && (
                  <>
                    <span className="text-border">·</span>
                    <span className="font-mono">S/N: {installation.serial_number}</span>
                  </>
                )}
              </div>
              {component.batch?.name &&
                component.description &&
                component.batch.name !== component.description && (
                  <p className="truncate text-[11px] text-muted-foreground/70">{component.description}</p>
                )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {pendingRequest && (
              <Badge
                variant="outline"
                className="h-6 gap-1 border-amber-500/20 bg-amber-500/10 px-2 text-[11px] text-amber-600 dark:text-amber-400"
              >
                <ClockArrowUp className="h-3 w-3" />
                Pendiente
              </Badge>
            )}
            <AlertBadge status={componentStatus} size="small" />
          </div>
        </div>

        {/* Intervals section */}
        <div className="px-4 py-3.5">
          {intervals.length > 0 ? (
            <ScrollArea className={shouldScrollMetrics ? 'h-[190px] pr-3' : undefined}>
              <ScrollBar orientation="horizontal" />
              <div className="space-y-4">
                {intervals.map((interval, intervalIdx) => (
                  <div
                    key={`${interval.id ?? interval.task_description}-${intervalIdx}`}
                    className="space-y-2.5 border-b border-border/30 pb-3 last:border-b-0 last:pb-0"
                  >
                    <div className="flex items-center gap-2">
                      <GripHorizontal className="h-3.5 w-3.5 shrink-0 text-muted-foreground/40" />
                      <p className="break-words text-xs font-semibold leading-snug text-foreground">
                        {interval.task_description}
                      </p>
                    </div>
                    <div className="space-y-2 pl-[22px]">
                      {interval.metrics.map((metric, metricIdx) => {
                        const mCfg = LEVEL_CONFIG[metric.status];
                        const Icon = METRIC_ICONS[metric.type];
                        return (
                          <div
                            key={`${interval.task_description}-${metric.type}-${metricIdx}`}
                            className="space-y-1.5"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                <Icon className="h-3.5 w-3.5 shrink-0" />
                                {METRIC_LABELS[metric.type]}
                              </p>
                              {metric.remaining <= 0 ? (
                                <span className="text-[11px] font-semibold text-red-600 dark:text-red-400">
                                  VENCIDO
                                </span>
                              ) : (
                                <span className="font-mono text-[11px] font-medium text-muted-foreground">
                                  {metric.remaining.toFixed(1)} {METRIC_UNITS[metric.type]} rest.
                                </span>
                              )}
                            </div>
                            <Progress
                              value={Math.min(metric.percentage, 100)}
                              className="h-2"
                              indicatorClassName={mCfg.progressIndicator}
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : canCreateInterval ? (
            <button
              type="button"
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border/70 bg-background/50 py-3 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation();
                onCreateInterval?.();
              }}
            >
              <ListPlus className="h-4 w-4" />
              Sin intervalos — añadir uno
            </button>
          ) : null}
        </div>

        {/* Actions footer */}
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border/40 px-4 py-3">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
            <Badge variant="outline" className="h-6 shrink-0 border-border/60 px-2.5 text-[11px] font-normal">
              {intervals.length} intervalo{intervals.length !== 1 && 's'}
            </Badge>
            {intervals.length > 0 && (
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-medium">
                {statusCounts.OVERDUE > 0 && (
                  <span className="text-red-600 dark:text-red-400">
                    {statusCounts.OVERDUE} vencido{statusCounts.OVERDUE !== 1 && 's'}
                  </span>
                )}
                {statusCounts.WARNING > 0 && (
                  <span className="text-amber-600 dark:text-amber-400">
                    {statusCounts.WARNING} próximo{statusCounts.WARNING !== 1 && 's'}
                  </span>
                )}
                {statusCounts.OK > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    {statusCounts.OK} OK
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            {canCreateInterval && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 gap-1.5 px-2.5 text-xs text-muted-foreground transition-transform hover:text-foreground active:scale-[0.97]"
                onClick={(e) => {
                  e.stopPropagation();
                  onCreateInterval?.();
                }}
              >
                <ListPlus className="h-3.5 w-3.5" />
                Intervalo
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 border-amber-500/30 px-3 text-xs text-amber-600 transition-transform hover:bg-amber-500/10 active:scale-[0.97] dark:text-amber-400"
              onClick={(e) => {
                e.stopPropagation();
                onUninstall?.();
              }}
            >
              <PackageMinus className="h-3.5 w-3.5" />
              Desmontar
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}
