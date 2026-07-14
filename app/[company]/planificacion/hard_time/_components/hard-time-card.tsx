'use client';

import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { HardTimeAlertLevel, HardTimeIntervalWithMetrics } from '@/types';
import { AircraftComponentSlotResource } from '@api/types';
import Link from 'next/link';
import { ClockArrowUp, ListPlus, MapPinned, PackageMinus, PackagePlus, ScanLine } from 'lucide-react';
import { useMemo } from 'react';
import {
  AlertBadge,
  computeIntervalMetrics,
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

// ── Independent slot-state styling ───────────────────────────────────────────
// Deliberately separate from LEVEL_CONFIG (hard-time-shared.tsx): the slot card
// reads as a physical bay readout, not an alert panel, so it keeps its own
// minimal accent language — a top rail + a compact mono status tag.

const SLOT_STATE_STYLE: Record<HardTimeAlertLevel, { rail: string; bar: string }> = {
  OVERDUE: { rail: 'bg-rose-500', bar: 'bg-rose-500' },
  WARNING: { rail: 'bg-amber-500', bar: 'bg-amber-500' },
  OK: { rail: 'bg-teal-500', bar: 'bg-teal-500' },
};

const VACANT_RAIL = 'bg-slate-300 dark:bg-slate-700';

// ── Bay label: the fixed receptacle identity, read left→right like a manifest row ──

function BayLabel({
  position,
  ataChapter,
  rightSlot,
}: {
  position: string;
  ataChapter?: string;
  rightSlot: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-1.5">
        <MapPinned className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
        <span className="truncate font-mono text-sm font-bold tracking-tight text-foreground">{position}</span>
        {ataChapter && (
          <span className="shrink-0 font-mono text-[10px] text-muted-foreground/60">·ATA {ataChapter}</span>
        )}
      </div>
      {rightSlot}
    </div>
  );
}

// ── Stretched link: a real <a> so ctrl/cmd/middle-click "open in new tab" work,
// laid under the card content instead of wrapping it — nested <button> inside <a>
// is invalid HTML and made click routing unreliable, so buttons live as siblings
// stacked above this overlay instead of descendants of it. ────────────────────

function CardLinkOverlay({ href, label }: { href: string; label: string }) {
  return <Link href={href} aria-label={label} className="absolute inset-0 z-0 rounded-lg" />;
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

  const state = SLOT_STATE_STYLE[componentStatus];

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
      <div className="group relative block overflow-hidden rounded-lg border border-border/60 bg-background transition-colors hover:border-border">
        <CardLinkOverlay href={href} label={`Ver posición ${component.position}, vacía`} />

        <div className="pointer-events-none relative">
          <div className={cn('h-[3px] w-full', VACANT_RAIL)} />

          <BayLabel
            position={component.position}
            ataChapter={category?.ata_chapter}
            rightSlot={
              <span className="shrink-0 font-mono text-[10px] font-semibold tracking-wide text-muted-foreground/60">
                VACÍO
              </span>
            }
          />

          <div className="border-t border-dashed border-border/60 px-4 py-4">
            {pendingRequest ? (
              <div className="pointer-events-auto">
                <PendingInstallationRequest
                  request={pendingRequest}
                  position={component.position}
                  componentName={component.batch?.name || component.description || undefined}
                  onCancel={onCancelRequest}
                  isCancelling={isCancellingRequest}
                />
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-dashed border-border/70 text-muted-foreground/50">
                  <ScanLine className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground/80">{componentTitle}</p>
                  {component.part_number ? (
                    <p className="truncate font-mono text-[11px] text-muted-foreground">
                      P/N esperado: {component.part_number}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground">Sin componente instalado</p>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="pointer-events-auto relative z-10 h-8 shrink-0 gap-1.5 px-3 text-xs transition-transform active:scale-[0.97]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onInstall?.();
                  }}
                >
                  <PackagePlus className="h-3.5 w-3.5" />
                  Montar
                </Button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border/40 px-4 py-2">
            <span className="font-mono text-[10px] text-muted-foreground/60">
              {rawIntervalsCount} intervalo{rawIntervalsCount !== 1 && 's'} configurado{rawIntervalsCount !== 1 && 's'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ── OCCUPIED SLOT ───────────────────────────────────────────────────────────

  return (
    <div className="group relative block overflow-hidden rounded-lg border border-border/60 bg-background transition-colors hover:border-border">
      <CardLinkOverlay href={href} label={`Ver posición ${component.position}, ${componentTitle}`} />

      <div className="pointer-events-none relative">
        <div className={cn('h-[3px] w-full', state.rail)} />

        <BayLabel
          position={component.position}
          ataChapter={category?.ata_chapter}
          rightSlot={
            <span className="flex shrink-0 items-center gap-1.5">
              {pendingRequest && (
                <ClockArrowUp className="h-3.5 w-3.5 text-amber-500" aria-label="Solicitud pendiente" />
              )}
              <AlertBadge status={componentStatus} size="small" />
            </span>
          }
        />

        {/* Installed part */}
        <div className="border-t border-border/60 px-4 py-3">
          <p className="truncate text-sm font-semibold leading-tight text-foreground">{componentTitle}</p>
          <div className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-muted-foreground">
            <span className="font-mono">
              {installation ? 'P/N' : 'P/N esperado'}: {installation?.part_number ?? component.part_number ?? '—'}
            </span>
            {installation && (
              <>
                <span className="text-border">/</span>
                <span className="font-mono">S/N: {installation.serial_number}</span>
              </>
            )}
          </div>
          {component.batch?.name && component.description && component.batch.name !== component.description && (
            <p className="mt-0.5 truncate text-[11px] text-muted-foreground/70">{component.description}</p>
          )}
        </div>

        {/* Intervals section */}
        <div className="border-t border-border/40 px-4 py-3">
          {intervals.length > 0 ? (
            <ScrollArea className={cn('pointer-events-auto relative z-10', shouldScrollMetrics && 'h-[190px] pr-3')}>
              <ScrollBar orientation="horizontal" />
              <div className="space-y-3.5">
                {intervals.map((interval, intervalIdx) => (
                  <div key={`${interval.id ?? interval.task_description}-${intervalIdx}`} className="space-y-2">
                    <p className="truncate text-[11px] font-medium leading-snug text-foreground/80">
                      {interval.task_description}
                    </p>
                    <div className="space-y-1.5">
                      {interval.metrics.map((metric, metricIdx) => {
                        const mStyle = SLOT_STATE_STYLE[metric.status];
                        const Icon = METRIC_ICONS[metric.type];
                        return (
                          <div
                            key={`${interval.task_description}-${metric.type}-${metricIdx}`}
                            className="grid grid-cols-[16px_44px_1fr_auto] items-center gap-2"
                          >
                            <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
                            <span className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                              {METRIC_LABELS[metric.type]}
                            </span>
                            <Progress
                              value={Math.min(metric.percentage, 100)}
                              className="h-1.5 bg-muted"
                              indicatorClassName={mStyle.bar}
                            />
                            {metric.remaining <= 0 ? (
                              <span className="whitespace-nowrap font-mono text-[10px] font-semibold text-rose-600 dark:text-rose-400">
                                VENCIDO
                              </span>
                            ) : (
                              <span className="whitespace-nowrap font-mono text-[10px] text-muted-foreground">
                                {metric.remaining.toFixed(1)} {METRIC_UNITS[metric.type]}
                              </span>
                            )}
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
              className="pointer-events-auto relative z-10 flex w-full items-center justify-center gap-1.5 rounded-md border border-dashed border-border/70 py-3 text-xs text-muted-foreground transition-colors hover:border-border hover:text-foreground"
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
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 border-t border-border/40 px-4 py-2.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px] text-muted-foreground/70">
            <span>
              {intervals.length} intervalo{intervals.length !== 1 && 's'}
            </span>
            {intervals.length > 0 && (
              <>
                {statusCounts.OVERDUE > 0 && (
                  <span className="text-rose-600 dark:text-rose-400">
                    · {statusCounts.OVERDUE} vencido{statusCounts.OVERDUE !== 1 && 's'}
                  </span>
                )}
                {statusCounts.WARNING > 0 && (
                  <span className="text-amber-600 dark:text-amber-400">
                    · {statusCounts.WARNING} próximo{statusCounts.WARNING !== 1 && 's'}
                  </span>
                )}
                {statusCounts.OK > 0 && (
                  <span className="text-teal-600 dark:text-teal-400">· {statusCounts.OK} OK</span>
                )}
              </>
            )}
          </div>
          <div
            className="pointer-events-auto relative z-10 ml-auto flex shrink-0 items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            {canCreateInterval && (
              <Button
                type="button"
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
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5 px-3 text-xs transition-transform active:scale-[0.97]"
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
    </div>
  );
}
