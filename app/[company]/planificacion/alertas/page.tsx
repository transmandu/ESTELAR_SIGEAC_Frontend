'use client';

import { ContentLayout } from '@/components/layout/ContentLayout';
import LoadingPage from '@/components/misc/LoadingPage';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetMaintenanceAircrafts } from '@/hooks/planificacion/useGetMaintenanceAircrafts';
import {
  PlanificationAlertItemType,
  PlanificationAlertMetric,
  PlanificationAlertStatus,
  useGetPlanificationAlerts,
} from '@/hooks/planificacion/useGetPlanificationAlerts';
import { cn } from '@/lib/utils';
import { useCompanyStore } from '@/stores/CompanyStore';
import { PlanificationAlertResource } from '@api/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type { LucideIcon } from 'lucide-react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Gauge,
  Plane,
  Search,
  ShieldCheck,
  Siren,
  TriangleAlert,
  Wrench,
} from 'lucide-react';
import Link from 'next/link';
import { useDeferredValue, useMemo, useState } from 'react';
import { AlertBadge } from '../control_mantenimiento/_components/control-grid-shared';
import SectionHeader from '@/components/layout/SectionHeader';

const LEVEL_CONFIG: Record<
  PlanificationAlertStatus,
  {
    icon: LucideIcon;
    cardBg: string;
    iconBg: string;
    iconText: string;
    label: string;
    helpText: string;
  }
> = {
  OVERDUE: {
    icon: TriangleAlert,
    cardBg: 'bg-red-600 text-white hover:bg-red-700',
    iconBg: 'bg-white/15',
    iconText: 'text-white',
    label: 'Vencidos',
    helpText: 'Requieren atención inmediata',
  },
  WARNING: {
    icon: AlertTriangle,
    cardBg: 'bg-amber-600 text-white hover:bg-amber-700',
    iconBg: 'bg-white/15',
    iconText: 'text-white',
    label: 'Próximos',
    helpText: 'Entraron en ventana de atención',
  },
  OK: {
    icon: ShieldCheck,
    cardBg: 'bg-emerald-600 text-white hover:bg-emerald-700',
    iconBg: 'bg-white/15',
    iconText: 'text-white',
    label: 'En tiempo',
    helpText: 'Sin riesgo inmediato',
  },
};

const ITEM_TYPE_CONFIG: Record<
  PlanificationAlertItemType,
  {
    label: string;
    className: string;
    icon: typeof Wrench;
  }
> = {
  maintenance_control: {
    label: 'Control',
    className: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
    icon: Wrench,
  },
  hard_time: {
    label: 'Hard Time',
    className: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
    icon: Gauge,
  },
  directive: {
    label: 'Directiva',
    className: 'border-violet-500/30 bg-violet-500/10 text-violet-700 dark:text-violet-300',
    icon: FileText,
  },
};

const GOVERNING_METRIC_CONFIG: Record<
  PlanificationAlertMetric,
  {
    label: string;
    icon: typeof Calendar;
  }
> = {
  CALENDAR: { label: 'Calendario', icon: Calendar },
  FH: { label: 'Flight Hours', icon: Clock },
  FC: { label: 'Flight Cycles', icon: Gauge },
};

function formatAlertDate(value: string | null) {
  if (!value) return 'Sin proyección';

  return format(new Date(`${value}T00:00:00`), 'dd MMM yyyy', { locale: es });
}

function formatRemainingValue(alert: PlanificationAlertResource) {
  const metric_name = alert.earliest_due_metric;
  const metric =
    metric_name === 'CALENDAR'
      ? alert.metrics.calendar
      : metric_name === 'FH'
        ? alert.metrics.flight_hours
        : alert.metrics.flight_cycles;

  if (metric.remaining === null) {
    return 'N/A';
  }

  if (metric_name === 'CALENDAR') {
    return `${metric.remaining} días`;
  }

  const suffix = metric_name === 'FH' ? 'FH' : 'FC';
  return `${metric.remaining.toFixed(2)} ${suffix}`;
}

const TOTAL_SUMMARY_CONFIG = {
  icon: Siren,
  cardBg: 'bg-primary hover:bg-primary/90',
  iconBg: 'bg-white/15',
  iconText: 'text-white',
  label: 'Total',
};

function SummaryTile({
  label,
  value,
  active,
  onClick,
  icon: Icon,
  cardBg,
  iconBg,
  iconText,
  code,
}: {
  code: string;
  label: string;
  value: number;
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  cardBg: string;
  iconBg: string;
  iconText: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'group inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-semibold text-white',
        'transition-transform duration-150 ease-out active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
        cardBg,
        active
          ? [
              'ring-2 ring-offset-2',
              {
                'ring-primary': code === 'all',
                'ring-emerald-600': code === 'OK',
                'ring-amber-600': code === 'WARNING',
                'ring-red-600': code === 'OVERDUE',
              },
            ]
          : null,
      )}
    >
      <span className={cn('flex h-6 w-6 shrink-0 items-center justify-center rounded-full', iconBg, iconText)}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="inline-flex items-center justify-center rounded-full bg-white/20 px-2 text-sm font-semibold tabular-nums text-white">
        {value}
      </span>
      <span className="whitespace-nowrap text-[10px] uppercase tracking-[0.2em] text-white/80">{label}</span>
    </button>
  );
}

function SummarySkeleton() {
  return (
    <div className="flex flex-wrap gap-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="inline-flex items-center gap-2 rounded-full bg-slate-200/80 px-3 py-1.5 text-sm font-semibold text-transparent shadow-sm dark:bg-slate-800/80"
        >
          <Skeleton className="h-6 w-6 rounded-full" />
          <Skeleton className="h-5 w-10 rounded-full" />
          <Skeleton className="h-4 w-16 rounded-full" />
        </div>
      ))}
    </div>
  );
}

function TableSkeleton() {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <Skeleton className="h-5 w-52" />
        <Skeleton className="h-4 w-80" />
      </CardHeader>
      <CardContent className="space-y-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="grid gap-3 rounded-lg border border-border/60 p-3 md:grid-cols-8">
            {Array.from({ length: 8 }).map((__, cellIndex) => (
              <Skeleton key={cellIndex} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function AlertQueueTable({ alerts }: { alerts: PlanificationAlertResource[] }) {
  return (
    <div className="relative overflow-x-auto">
      <table className="w-full min-w-[1080px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="border-b border-border/60 [&>th]:sticky [&>th]:top-0 [&>th]:z-10 [&>th]:border-b [&>th]:border-border/60 [&>th]:bg-background">
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Estado
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Tipo
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Aeronave
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Identificador
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Descripción
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Métrica determinante
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Fecha proyectada
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Restante
            </th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((alert) => {
            const itemType = ITEM_TYPE_CONFIG[alert.item_type as PlanificationAlertItemType];
            const metric = GOVERNING_METRIC_CONFIG[alert.earliest_due_metric as PlanificationAlertMetric];
            const MetricIcon = metric.icon;
            const ItemTypeIcon = itemType.icon;

            return (
              <tr
                key={`${alert.item_type}-${alert.item_identifier}-${alert.aircraft?.id}`}
                className={cn(
                  'border-b border-border/50 transition-colors hover:bg-muted/40',
                  alert.status === 'OVERDUE' && 'bg-red-500/[0.04] dark:bg-red-950/20',
                )}
              >
                <td className="px-4 py-3 align-top whitespace-nowrap">
                  <AlertBadge status={alert.status} size="small" />
                </td>
                <td className="px-4 py-3 align-top whitespace-nowrap">
                  <Badge variant="outline" className={`gap-1 ${itemType.className}`}>
                    <ItemTypeIcon className="h-3 w-3" />
                    {itemType.label}
                  </Badge>
                </td>
                <td className="px-4 py-3 align-top whitespace-nowrap">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-mono text-sm font-semibold text-foreground">
                      <Plane className="h-3.5 w-3.5 text-muted-foreground" />
                      {alert.aircraft?.acronym ?? 'Sin sigla'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {alert.aircraft?.model ?? 'Modelo no disponible'}
                      {alert.aircraft?.serial ? ` · S/N ${alert.aircraft?.serial}` : ''}
                    </p>
                  </div>
                </td>
                <td className="px-4 py-3 align-top whitespace-nowrap font-mono text-xs font-semibold text-foreground">
                  {alert.item_identifier}
                </td>
                <td className="px-4 py-3 align-top">
                  <p className="max-w-sm text-sm text-foreground">{alert.description || 'Sin descripción'}</p>
                </td>
                <td className="px-4 py-3 align-top whitespace-nowrap">
                  <div className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-muted/20 px-2 py-1 text-xs font-medium text-foreground">
                    <MetricIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    {metric.label}
                  </div>
                </td>
                <td className="px-4 py-3 align-top font-mono text-xs text-foreground whitespace-nowrap">
                  {formatAlertDate(alert.earliest_due_date)}
                </td>
                <td className="px-4 py-3 align-top whitespace-nowrap">
                  <span
                    className={cn(
                      'font-mono text-sm font-semibold tabular-nums',
                      alert.status === 'OVERDUE'
                        ? 'text-red-600 dark:text-red-400'
                        : alert.status === 'WARNING'
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-foreground',
                    )}
                  >
                    {formatRemainingValue(alert)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function PlanificationAlertsDashboardPage() {
  const { selectedCompany } = useCompanyStore();
  const [selectedAircraftId, setSelectedAircraftId] = useState<'all' | number>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | PlanificationAlertStatus>('all');
  const [itemTypeFilter, setItemTypeFilter] = useState<'all' | PlanificationAlertItemType>('all');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());

  const { data: aircraft = [], isLoading: isAircraftLoading } = useGetMaintenanceAircrafts(selectedCompany?.slug);

  const {
    data: alertsResponse,
    isLoading: isAlertsLoading,
    isError,
    error,
  } = useGetPlanificationAlerts({
    aircraft_id: selectedAircraftId === 'all' ? undefined : selectedAircraftId,
    item_type: itemTypeFilter === 'all' ? undefined : itemTypeFilter,
    status: statusFilter === 'all' ? undefined : statusFilter,
  });

  const alertRows = useMemo(() => alertsResponse?.data ?? [], [alertsResponse]);
  const summary = alertsResponse?.summary;

  const filteredRows = useMemo(() => {
    return alertRows.filter((row) => {
      const matchesSearch =
        deferredQuery.length === 0 ||
        row.item_identifier.toLowerCase().includes(deferredQuery) ||
        row.description?.toLowerCase().includes(deferredQuery) ||
        row.aircraft?.acronym?.toLowerCase().includes(deferredQuery) ||
        row.aircraft?.serial?.toLowerCase().includes(deferredQuery);

      return matchesSearch;
    });
  }, [alertRows, deferredQuery]);

  const selectedAircraftLabel = useMemo(() => {
    if (selectedAircraftId === 'all') return 'Toda la flota';
    const match = aircraft.find((item) => item.id === selectedAircraftId);
    return match ? `${match.acronym} · ${match.serial}` : 'Aeronave';
  }, [aircraft, selectedAircraftId]);

  if (isAircraftLoading) return <LoadingPage />;

  return (
    <ContentLayout>
      <main className="max-w-[2080px] space-y-5 p-4 lg:p-6">
        <SectionHeader
          size="md"
          title="Alertas de Planificación"
          subtitle="Controles, hard time y directivas en orden de prioridad."
          backHref={`/${selectedCompany?.slug}/planificacion`}
          titleIcon={
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 text-destructive transition-colors group-hover:bg-destructive/20">
              <Siren className="h-5 w-5 text-destructive" />
            </div>
          }
          actions={
            <Badge variant="outline" className="border-primary/30 font-medium text-primary">
              {selectedAircraftLabel}
            </Badge>
          }
        />

        {isAlertsLoading ? (
          <SummarySkeleton />
        ) : (
          <div className="flex flex-wrap gap-2">
            <SummaryTile
              label={LEVEL_CONFIG.OVERDUE.label}
              value={summary?.overdue ?? 0}
              code={statusFilter}
              active={statusFilter === 'OVERDUE'}
              onClick={() => setStatusFilter((prev) => (prev === 'OVERDUE' ? 'all' : 'OVERDUE'))}
              icon={LEVEL_CONFIG.OVERDUE.icon}
              cardBg={LEVEL_CONFIG.OVERDUE.cardBg}
              iconBg={LEVEL_CONFIG.OVERDUE.iconBg}
              iconText={LEVEL_CONFIG.OVERDUE.iconText}
            />
            <SummaryTile
              label={LEVEL_CONFIG.WARNING.label}
              value={summary?.warning ?? 0}
              code={statusFilter}
              active={statusFilter === 'WARNING'}
              onClick={() => setStatusFilter((prev) => (prev === 'WARNING' ? 'all' : 'WARNING'))}
              icon={LEVEL_CONFIG.WARNING.icon}
              cardBg={LEVEL_CONFIG.WARNING.cardBg}
              iconBg={LEVEL_CONFIG.WARNING.iconBg}
              iconText={LEVEL_CONFIG.WARNING.iconText}
            />
            <SummaryTile
              label={LEVEL_CONFIG.OK.label}
              value={summary?.ok ?? 0}
              code={statusFilter}
              active={statusFilter === 'OK'}
              onClick={() => setStatusFilter((prev) => (prev === 'OK' ? 'all' : 'OK'))}
              icon={LEVEL_CONFIG.OK.icon}
              cardBg={LEVEL_CONFIG.OK.cardBg}
              iconBg={LEVEL_CONFIG.OK.iconBg}
              iconText={LEVEL_CONFIG.OK.iconText}
            />
            <SummaryTile
              label={TOTAL_SUMMARY_CONFIG.label}
              value={summary?.total ?? 0}
              code={statusFilter}
              active={statusFilter === 'all'}
              onClick={() => setStatusFilter('all')}
              icon={TOTAL_SUMMARY_CONFIG.icon}
              cardBg={TOTAL_SUMMARY_CONFIG.cardBg}
              iconBg={TOTAL_SUMMARY_CONFIG.iconBg}
              iconText={TOTAL_SUMMARY_CONFIG.iconText}
            />
          </div>
        )}

        <div className="flex flex-col gap-3 rounded-lg border border-border/60 bg-background p-3 lg:flex-row lg:items-center">
          <div className="flex flex-1 flex-wrap gap-2">
            <Select
              value={selectedAircraftId === 'all' ? 'all' : String(selectedAircraftId)}
              onValueChange={(value) => setSelectedAircraftId(value === 'all' ? 'all' : Number(value))}
            >
              <SelectTrigger className="h-9 w-full sm:w-[220px]">
                <Plane className="h-3.5 w-3.5 text-muted-foreground" />
                <SelectValue placeholder="Aeronave" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toda la flota</SelectItem>
                {aircraft.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.acronym} · {item.serial}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={itemTypeFilter}
              onValueChange={(value) => setItemTypeFilter(value as 'all' | PlanificationAlertItemType)}
            >
              <SelectTrigger className="h-9 w-full sm:w-[200px]">
                <SelectValue placeholder="Tipo de ítem" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="maintenance_control">Control de mantenimiento</SelectItem>
                <SelectItem value="hard_time">Hard time</SelectItem>
                <SelectItem value="directive">Directiva</SelectItem>
              </SelectContent>
            </Select>

            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as 'all' | PlanificationAlertStatus)}
            >
              <SelectTrigger className="h-9 w-full sm:w-[160px]">
                <SelectValue placeholder="Severidad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="OVERDUE">Vencido</SelectItem>
                <SelectItem value="WARNING">Próximo</SelectItem>
                <SelectItem value="OK">En tiempo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="relative lg:w-80">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar identificador, descripción o aeronave"
              className="h-9 pl-9"
            />
          </div>
        </div>

        {isAlertsLoading ? (
          <TableSkeleton />
        ) : isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No se pudieron cargar las alertas</AlertTitle>
            <AlertDescription>
              {error instanceof Error ? error.message : 'Ocurrió un error inesperado al consultar la cola unificada.'}
            </AlertDescription>
          </Alert>
        ) : filteredRows.length === 0 ? (
          <Card className="border-dashed border-border/70">
            <CardContent className="flex flex-col items-center justify-center gap-2 py-12 text-center">
              <Siren className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">No hay alertas para los filtros actuales.</p>
              <p className="max-w-lg text-sm text-muted-foreground">
                {alertRows.length === 0
                  ? 'Backend no devolvió ítems para la combinación seleccionada. El resumen superior se mantiene visible.'
                  : 'La cola sí contiene ítems, pero ninguno coincide con la búsqueda de texto actual.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-base">Cola priorizada</CardTitle>
                  <CardDescription>Orden: severidad, fecha, restante, aeronave.</CardDescription>
                </div>
                <Badge variant="outline" className="font-mono text-xs">
                  {filteredRows.length} / {summary?.total ?? 0}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <AlertQueueTable alerts={filteredRows} />
            </CardContent>
          </Card>
        )}
      </main>
    </ContentLayout>
  );
}
