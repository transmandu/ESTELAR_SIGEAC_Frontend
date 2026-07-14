'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { addDays, format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarClock, FileText, History, Pencil, Power } from 'lucide-react';
import { HardTimeInstallationResource, HardTimeIntervalResource } from '@api/types';
import { AlertBadge, computeIntervalMetrics, LEVEL_CONFIG, METRIC_ICONS, METRIC_LABELS, METRIC_UNITS } from './hard-time-shared';

interface HardTimeIntervalCardProps {
  interval: HardTimeIntervalResource;
  installation?: HardTimeInstallationResource | null;
  aircraftFlightHours?: number | null;
  aircraftFlightCycles?: number | null;
  averageDailyFH?: number | null;
  averageDailyFC?: number | null;
  onViewHistory?: () => void;
  onEdit?: () => void;
  onToggle?: () => void;
  isToggling?: boolean;
}

export function HardTimeIntervalCard({
  interval,
  installation,
  aircraftFlightHours,
  aircraftFlightCycles,
  averageDailyFH,
  averageDailyFC,
  onViewHistory,
  onEdit,
  onToggle,
  isToggling,
}: HardTimeIntervalCardProps) {
  const enriched = useMemo(() => {
    if (!installation || aircraftFlightHours == null || aircraftFlightCycles == null) return null;
    return computeIntervalMetrics(interval, installation, aircraftFlightHours, aircraftFlightCycles);
  }, [interval, installation, aircraftFlightHours, aircraftFlightCycles]);

  const status = enriched?.status ?? 'OK';
  const cfg = LEVEL_CONFIG[status];
  const metrics = enriched?.metrics ?? [];

  const formatMetricValue = (value: number, type: keyof typeof METRIC_UNITS) =>
    value.toLocaleString(undefined, {
      minimumFractionDigits: type === 'FH' ? 1 : 0,
      maximumFractionDigits: type === 'FH' ? 1 : 0,
    });

  // Compute overall estimated date: pick the earliest across all metrics
  const estimatedDate = (() => {
    const dates: Date[] = [];
    for (const m of metrics) {
      if (m.remaining <= 0) continue;
      if (m.type === 'FH' && averageDailyFH && averageDailyFH > 0) {
        dates.push(addDays(new Date(), Math.ceil(m.remaining / averageDailyFH)));
      } else if (m.type === 'FC' && averageDailyFC && averageDailyFC > 0) {
        dates.push(addDays(new Date(), Math.ceil(m.remaining / averageDailyFC)));
      } else if (m.type === 'DAYS') {
        dates.push(addDays(new Date(), Math.ceil(m.remaining)));
      }
    }
    if (dates.length === 0) return null;
    return dates.sort((a, b) => a.getTime() - b.getTime())[0];
  })();

  return (
    <Card className={`overflow-hidden ${cfg.cardBorder} ${cfg.cardBg}`}>
      <CardHeader className="px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold leading-snug text-foreground">{interval.task_description}</p>
          <AlertBadge status={status} size="small" />
        </div>
      </CardHeader>

      <CardContent className="space-y-3 px-4 pb-4 pt-0">
        {metrics.map((metric) => {
          const mCfg = LEVEL_CONFIG[metric.status];
          const Icon = METRIC_ICONS[metric.type];

          return (
            <div key={metric.type} className="space-y-1.5">
              <p className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                <Icon className="h-3 w-3 shrink-0" />
                {METRIC_LABELS[metric.type]}
              </p>
              <p className="font-mono text-sm font-semibold tabular-nums">
                <span className={mCfg.iconText}>{formatMetricValue(metric.consumed, metric.type)}</span>
                <span className="text-muted-foreground">/{formatMetricValue(metric.interval, metric.type)}</span>
                <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                  {METRIC_UNITS[metric.type]}
                </span>
              </p>
              <Progress
                value={Math.min(metric.percentage, 100)}
                className="h-1.5"
                indicatorClassName={mCfg.progressIndicator}
              />
              <p className="font-mono text-[11px] text-muted-foreground">
                ({formatMetricValue(metric.remaining, metric.type)} {METRIC_UNITS[metric.type]} rest.)
              </p>
            </div>
          );
        })}

        {metrics.length === 0 && (
          <div className="rounded-md border border-dashed border-border/50 py-2.5 text-center">
            <p className="text-[11px] text-muted-foreground">Sin métricas</p>
          </div>
        )}

        <div className="space-y-1.5 border-t border-border/30 pt-2.5">
          {estimatedDate ? (
            <div className="flex items-center gap-1.5 text-[11px]">
              <CalendarClock className="h-3 w-3 shrink-0 text-muted-foreground" />
              <span className="text-muted-foreground">Est:</span>
              <span className="font-mono font-medium">{format(estimatedDate, 'dd MMM yy', { locale: es })}</span>
            </div>
          ) : metrics.length > 0 && metrics.every((m) => m.remaining <= 0) ? (
            <div className="flex items-center gap-1.5 text-[11px]">
              <CalendarClock className="h-3 w-3 shrink-0 text-red-500" />
              <span className="font-semibold text-red-600 dark:text-red-400">Vencido</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
              <CalendarClock className="h-3 w-3 shrink-0" />
              <span>Sin datos</span>
            </div>
          )}

          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <FileText className="h-3 w-3 shrink-0" />
                <span>Últ. cumplimiento:</span>
                <span className="font-mono font-medium">
                  {interval.last_compliance
                    ? format(new Date(interval.last_compliance.compliance_date), 'dd MMM yy', { locale: es })
                    : '—'}
                </span>
              </div>
              {interval.last_compliance?.work_order && (
                <p className="pl-[18px] font-mono text-[10px] text-muted-foreground/70">
                  WO {interval.last_compliance.work_order.order_number}
                </p>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              {onEdit && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={onEdit}
                >
                  <Pencil className="size-3" />
                  Editar
                </Button>
              )}
              {onToggle && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={onToggle}
                  disabled={isToggling}
                >
                  <Power className="size-3" />
                  {interval.is_active ? 'Desactivar' : 'Activar'}
                </Button>
              )}
              {onViewHistory && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2 text-[11px] text-muted-foreground hover:text-foreground"
                  onClick={onViewHistory}
                >
                  <History className="size-3" />
                  Historial
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
