'use client';

import SectionHeader from '@/components/layout/SectionHeader';
import LoadingPage from '@/components/misc/LoadingPage';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useGetMaintenanceAircrafts } from '@/hooks/planificacion/useGetMaintenanceAircrafts';
import {
  PlanificationAlertItemType,
  PlanificationAlertStatus,
  useGetPlanificationAlerts,
} from '@/hooks/planificacion/useGetPlanificationAlerts';
import { useCompanyStore } from '@/stores/CompanyStore';
import { AlertCircle, Calendar, LayoutList } from 'lucide-react';
import { useTheme } from 'next-themes';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { AlertCalendar } from './_components/alert-calendar';

function CalendarSkeleton() {
  return (
    <Card className="border-border/60">
      <CardContent className="py-12">
        <Skeleton className="h-[600px] w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

function getCurrentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
  };
}

export default function PlanificationAlertsCalendarPage() {
  const { selectedCompany } = useCompanyStore();
  const { theme } = useTheme();
  const [selectedAircraftId, setSelectedAircraftId] = useState<'all' | number>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | PlanificationAlertStatus>('all');
  const [itemTypeFilter, setItemTypeFilter] = useState<'all' | PlanificationAlertItemType>('all');
  const [dateRange, setDateRange] = useState(getCurrentMonthRange);
  const [rangeReady, setRangeReady] = useState(true);

  const { data: aircraft = [], isLoading: isAircraftLoading } = useGetMaintenanceAircrafts(selectedCompany?.slug);

  const handleRangeUpdate = useCallback((range: { start: string; end: string }) => {
    setDateRange(range);
    setRangeReady(true);
  }, []);

  const {
    data: alertsResponse,
    isLoading: isAlertsLoading,
    isError,
    error,
  } = useGetPlanificationAlerts(
    {
      aircraft_id: selectedAircraftId === 'all' ? undefined : selectedAircraftId,
      item_type: itemTypeFilter === 'all' ? undefined : itemTypeFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
      start_date: dateRange?.start,
      end_date: dateRange?.end,
    },
    { enabled: rangeReady, keepPreviousData: true },
  );

  const alerts = alertsResponse?.data ?? [];

  if (isAircraftLoading) return <LoadingPage />;

  return (
    <main className="container space-y-5 p-4 lg:p-6">
      {/* Header */}
      <SectionHeader
        size="md"
        title="Calendario de Alertas"
        subtitle="Vista calendario de controles, hard time y directivas con fecha proyectada."
        titleIcon={
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-destructive/20 bg-destructive/10 text-destructive transition-colors group-hover:bg-destructive/20">
            <Calendar className="h-5 w-5 text-destructive" />
          </div>
        }
        actions={
          <Link
            href={`/${selectedCompany?.slug}/planificacion/alertas`}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium text-foreground hover:bg-muted/50 transition-colors"
          >
            <LayoutList className="h-4 w-4" />
            Vista de tabla
          </Link>
        }
      />

      {/* Filters */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          <Select
            value={selectedAircraftId === 'all' ? 'all' : String(selectedAircraftId)}
            onValueChange={(value) => setSelectedAircraftId(value === 'all' ? 'all' : Number(value))}
          >
            <SelectTrigger>
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
            <SelectTrigger>
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
            <SelectTrigger>
              <SelectValue placeholder="Severidad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="OVERDUE">Vencido</SelectItem>
              <SelectItem value="WARNING">Próximo</SelectItem>
              <SelectItem value="OK">En tiempo</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Calendar */}
      {isAlertsLoading ? (
        <CalendarSkeleton />
      ) : isError ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No se pudieron cargar las alertas</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'Ocurrió un error inesperado al consultar las alertas.'}
          </AlertDescription>
        </Alert>
      ) : (
        <Card className="border-border/60">
          <CardContent className="pt-6">
            <AlertCalendar
              alerts={alerts}
              theme={theme === 'dark' ? 'dark' : 'light'}
              onRangeUpdate={handleRangeUpdate}
            />
          </CardContent>
        </Card>
      )}
    </main>
  );
}
