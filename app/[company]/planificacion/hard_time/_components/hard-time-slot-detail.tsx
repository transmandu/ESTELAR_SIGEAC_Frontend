'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import SectionHeader from '@/components/layout/SectionHeader';
import LoadingPage from '@/components/misc/LoadingPage';
import { Badge } from '@/components/ui/badge';
import { useGetHardTimeComponentDetail } from '@/hooks/planificacion/hard_time/useGetHardTimeComponentDetail';
import { useGetMaintenanceAircrafts } from '@/hooks/planificacion/useGetMaintenanceAircrafts';
import { useCompanyStore } from '@/stores/CompanyStore';
import { HardTimeIntervalResource } from '@api/types';
import { Loader2, Puzzle } from 'lucide-react';
import { ComplianceDialog } from './hard-time-dashboard/compliance-dialog';
import { IntervalDialog } from './hard-time-dashboard/interval-dialog';
import { UninstallComponentDialog } from './hard-time-dashboard/uninstall-component-dialog';
import { HardTimeDetailView } from './hard-time-detail-view';
import { computeIntervalMetrics, STATUS_ORDER } from './hard-time-shared';
import { InstallDialog } from './install-dialog';

export function HardTimeSlotDetail({ slotId }: { slotId: number }) {
  const router = useRouter();
  const { selectedCompany } = useCompanyStore();

  const { data: component, isFetching } = useGetHardTimeComponentDetail(slotId);
  const { data: aircraftList = [], isLoading: isAircraftLoading } = useGetMaintenanceAircrafts(selectedCompany?.slug);

  const [isInstallOpen, setIsInstallOpen] = useState(false);
  const [isUninstallOpen, setIsUninstallOpen] = useState(false);
  const [isIntervalDialogOpen, setIsIntervalDialogOpen] = useState(false);
  const [editingInterval, setEditingInterval] = useState<HardTimeIntervalResource | null>(null);
  const [isComplianceDialogOpen, setIsComplianceDialogOpen] = useState(false);

  const aircraft = useMemo(
    () => aircraftList.find((item) => item.id === component?.aircraft_id) ?? null,
    [aircraftList, component?.aircraft_id],
  );

  const averages = aircraft?.last_average_metric ?? null;

  // Preselect the interval closest to (or past) its limit when registering a compliance
  const complianceDefaultIntervalId = useMemo(() => {
    const installation = component?.active_installation;
    const intervals = (component?.installed_part?.intervals ?? []).filter((i) => i.is_active);
    if (!installation || intervals.length === 0) return null;
    const fh = aircraft?.flight_hours;
    const fc = aircraft?.flight_cycles;
    if (fh == null || fc == null) return intervals[0].id;

    let bestId = intervals[0].id;
    let bestRank = -1;
    for (const interval of intervals) {
      const enriched = computeIntervalMetrics(interval, installation, fh, fc);
      const rank = STATUS_ORDER[enriched.status];
      if (rank > bestRank) {
        bestRank = rank;
        bestId = interval.id;
      }
    }
    return bestId;
  }, [component, aircraft]);

  const goBack = () => router.back();

  const openCreateInterval = () => {
    if (!component?.installed_part_id) return;
    setEditingInterval(null);
    setIsIntervalDialogOpen(true);
  };

  const openEditInterval = (interval: HardTimeIntervalResource) => {
    setEditingInterval(interval);
    setIsIntervalDialogOpen(true);
  };

  if (isAircraftLoading) return <LoadingPage />;

  return (
    <>
      <main className="container space-y-4 p-4 lg:p-8">
        <SectionHeader
          size="md"
          title={component?.position ?? 'Detalle de posición'}
          subtitle={component ? (component.batch?.name ?? component.description ?? undefined) : undefined}
          titleIcon={
            <div className="rounded-lg border border-border/60 bg-muted/25 p-2">
              <Puzzle className="size-5 text-primary" />
            </div>
          }
          onBack={goBack}
          actions={
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {component?.category?.ata_chapter && (
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
          }
        />

        <HardTimeDetailView
          componentId={slotId}
          averageDailyFH={averages?.average_daily_flight_hours ?? null}
          averageDailyFC={averages?.average_daily_flight_cycles ?? null}
          aircraftFlightHours={aircraft?.flight_hours ?? null}
          aircraftFlightCycles={aircraft?.flight_cycles ?? null}
          onBack={goBack}
          onInstall={() => setIsInstallOpen(true)}
          onUninstall={() => setIsUninstallOpen(true)}
          onCreateInterval={openCreateInterval}
          onEditInterval={openEditInterval}
          onRegisterCompliance={() => setIsComplianceDialogOpen(true)}
        />
      </main>

      <InstallDialog
        open={isInstallOpen}
        onOpenChange={setIsInstallOpen}
        componentId={slotId}
        aircraft={aircraft}
        defaultPartNumber={component?.part_number ?? ''}
        slotBatchId={component?.batch?.id ?? null}
        slotLabel={component?.position}
        componentLabel={component?.batch?.name ?? component?.description ?? undefined}
      />

      <UninstallComponentDialog
        open={isUninstallOpen}
        onOpenChange={setIsUninstallOpen}
        component={component ?? null}
        aircraft={aircraft}
      />

      <IntervalDialog
        open={isIntervalDialogOpen}
        onOpenChange={(open) => {
          setIsIntervalDialogOpen(open);
          if (!open) setEditingInterval(null);
        }}
        partId={component?.installed_part_id ?? 0}
        componentId={slotId}
        aircraftId={component?.aircraft_id ?? null}
        interval={editingInterval}
      />

      <ComplianceDialog
        open={isComplianceDialogOpen}
        onOpenChange={setIsComplianceDialogOpen}
        componentId={component?.installed_part_id ?? null}
        aircraft={aircraft}
        intervals={component?.installed_part?.intervals ?? []}
        defaultIntervalId={complianceDefaultIntervalId}
      />
    </>
  );
}
