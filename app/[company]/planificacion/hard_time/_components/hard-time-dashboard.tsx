'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { AlertCircle, Plus, SearchCheck, Wrench } from 'lucide-react';

import { ContentLayout } from '@/components/layout/ContentLayout';
import SectionHeader from '@/components/layout/SectionHeader';
import LoadingPage from '@/components/misc/LoadingPage';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { HardTimeCardSkeletonGrid } from './hard-time-card-skeleton';
import { useGetMaintenanceAircrafts } from '@/hooks/planificacion/useGetMaintenanceAircrafts';
import { useGetHardTimeCategories } from '@/hooks/planificacion/hard_time/useGetHardTimeCategories';
import { useGetHardTimeComponents } from '@/hooks/planificacion/hard_time/useGetHardTimeComponents';
import { useCompanyStore } from '@/stores/CompanyStore';
import { AircraftAverageSummaryCard } from '../../control_mantenimiento/_components/aircraft-average-summary-card';
import { AircraftSelector } from '../../control_mantenimiento/_components/aircraft-selector';
import { HardTimeCategorySidebar } from './hard-time-category-sidebar';
import { SectionEmpty } from './hard-time-dashboard/section-empty';
import { CreateComponentDialog } from './hard-time-dashboard/create-component-dialog';
import { UninstallComponentDialog } from './hard-time-dashboard/uninstall-component-dialog';
import { IntervalDialog } from './hard-time-dashboard/interval-dialog';
import { InstallDialog } from './install-dialog';
import { useCancelInstallationRequest } from '@/actions/planificacion/hard_time/actions';
import { AircraftComponentSlotResource, HardTimeIntervalResource } from '@api/types';

export function HardTimeDashboard() {
  const { selectedCompany } = useCompanyStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedAircraftId, setSelectedAircraftId] = useState<number | null>(() => {
    const param = Number(searchParams.get('aircraft'));
    return Number.isInteger(param) && param > 0 ? param : null;
  });
  const initialCategoryCode = searchParams.get('ata');

  const updateSearchParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null) params.delete(key);
        else params.set(key, value);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname, searchParams],
  );
  const [isCreateComponentOpen, setIsCreateComponentOpen] = useState(false);
  const [createComponentDefaultCategory, setCreateComponentDefaultCategory] = useState<string | null>(null);
  const [installTargetComponent, setInstallTargetComponent] = useState<AircraftComponentSlotResource | null>(null);
  const [uninstallingComponent, setUninstallingComponent] = useState<AircraftComponentSlotResource | null>(null);
  const [isIntervalDialogOpen, setIsIntervalDialogOpen] = useState(false);
  const [editingInterval, setEditingInterval] = useState<HardTimeIntervalResource | null>(null);
  const [intervalTargetComponent, setIntervalTargetComponent] = useState<AircraftComponentSlotResource | null>(null);

  const { data: aircraft = [], isLoading: isAircraftLoading } = useGetMaintenanceAircrafts(selectedCompany?.slug);
  const { data: categories = [] } = useGetHardTimeCategories();
  const {
    data: groupsResponse,
    isLoading: isComponentsLoading,
    isError: isComponentsError,
  } = useGetHardTimeComponents(selectedAircraftId);

  const selectedAircraft = useMemo(
    () => aircraft.find((item) => item.id === selectedAircraftId) ?? null,
    [aircraft, selectedAircraftId],
  );

  const componentsList = useMemo(() => groupsResponse?.data ?? [], [groupsResponse]);

  const categoryGroups = useMemo(() => {
    const map = Map.groupBy(componentsList, (comp) => comp?.category?.code ?? comp?.category_code ?? 'uncategorized');
    return Array.from(map.values());
  }, [componentsList]);

  const cancelRequestMutation = useCancelInstallationRequest();
  const averages = selectedAircraft?.last_average_metric ?? null;

  const installingComponentPartNumber = installTargetComponent?.part_number ?? '';

  const handleSelectAircraft = (id: number) => {
    setSelectedAircraftId(id);
    updateSearchParams({ aircraft: String(id) });
  };

  const openInstall = (component: AircraftComponentSlotResource) => {
    setInstallTargetComponent(component);
  };

  const openUninstall = (component: AircraftComponentSlotResource) => {
    setUninstallingComponent(component);
  };

  const openCreateInterval = (component: AircraftComponentSlotResource) => {
    // Only allow creating intervals when the component has an installed part
    const hasInstalledPart = Boolean(component?.installed_part_id ?? component?.installed_part?.id);
    if (!hasInstalledPart) return;

    setIntervalTargetComponent(component);
    setEditingInterval(null);
    setIsIntervalDialogOpen(true);
  };

  const handleCancelRequest = (component: AircraftComponentSlotResource) => {
    const requestId = component.pending_installation_request?.id;
    if (!requestId) return;
    cancelRequestMutation.mutate({
      path: { id: requestId },
      body: { resolution_reason: 'Cancelado por planificación' },
    });
  };

  const openCreateComponent = (categoryCode: string | null = null) => {
    setCreateComponentDefaultCategory(categoryCode);
    setIsCreateComponentOpen(true);
  };

  if (isAircraftLoading) return <LoadingPage />;

  return (
    <ContentLayout title="Control Hard Time">
      <main className="max-w-[2080px] p-4 lg:p-6">
        <div className="space-y-4">
          <SectionHeader
            size="xl"
            title="Control Hard Time"
            subtitle="Seguimiento de componentes limitados por horas, ciclos y calendario."
            titleIcon={
              <div className="rounded-xl border border-border/60 bg-muted/25 p-3">
                <Wrench className="size-5 text-primary" />
              </div>
            }
            actions={
              <>
                <Button asChild variant="outline" className="gap-2">
                  <Link href={`/${selectedCompany?.slug}/planificacion/hard_time/trazabilidad`}>
                    <SearchCheck className="size-4" />
                    Trazabilidad
                  </Link>
                </Button>
                <Button className="gap-2" onClick={() => openCreateComponent(null)} disabled={!selectedAircraftId}>
                  <Plus className="size-4" />
                  Nueva posición
                </Button>
              </>
            }
          />

          <AircraftSelector
            aircraft={aircraft}
            selectedAircraftId={selectedAircraftId}
            onSelectAircraft={handleSelectAircraft}
          />

          {!selectedAircraftId ? (
            <SectionEmpty
              title="Selecciona aeronave"
              description="Escoge aeronave para cargar componentes controlados, intervalos y cumplimientos Hard Time."
            />
          ) : (
            <>
              <AircraftAverageSummaryCard averages={averages} />

              {isComponentsError ? (
                <Alert variant="destructive">
                  <AlertCircle className="size-4" />
                  <AlertDescription>No se pudieron cargar los componentes Hard Time.</AlertDescription>
                </Alert>
              ) : isComponentsLoading ? (
                <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
                  <aside className="space-y-2 rounded-xl border border-border/60 bg-background p-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-[60px] animate-pulse rounded-xl border border-border/60 bg-muted/20" />
                    ))}
                  </aside>
                  <div className="overflow-hidden rounded-xl border border-border/60 bg-background p-4">
                    <HardTimeCardSkeletonGrid count={6} />
                  </div>
                </div>
              ) : categories.length === 0 ? (
                <SectionEmpty
                  title="Sin capítulos ATA disponibles"
                  description="No hay capítulos ATA configurados. Contacta al administrador."
                />
              ) : (
                <HardTimeCategorySidebar
                  categories={categories}
                  categoryGroups={categoryGroups}
                  averages={averages}
                  aircraftFlightHours={selectedAircraft?.flight_hours ?? null}
                  aircraftFlightCycles={selectedAircraft?.flight_cycles ?? null}
                  componentHref={(component) => `/${selectedCompany?.slug}/planificacion/hard_time/slots/${component.id}`}
                  initialCategoryCode={initialCategoryCode}
                  onCategoryChange={(code) => updateSearchParams({ ata: code })}
                  onInstallComponent={openInstall}
                  onUninstallComponent={openUninstall}
                  onCreateIntervalForComponent={openCreateInterval}
                  onCreateComponentInAta={(code) => openCreateComponent(code)}
                  onCancelRequest={handleCancelRequest}
                  isCancellingRequest={cancelRequestMutation.isPending}
                />
              )}
            </>
          )}
        </div>
      </main>

      <CreateComponentDialog
        open={isCreateComponentOpen}
        onOpenChange={(open) => {
          setIsCreateComponentOpen(open);
          if (!open) setCreateComponentDefaultCategory(null);
        }}
        aircraftId={selectedAircraftId}
        categories={categories}
        defaultCategoryCode={createComponentDefaultCategory}
      />

      <InstallDialog
        open={installTargetComponent !== null}
        onOpenChange={(open) => {
          if (!open) setInstallTargetComponent(null);
        }}
        componentId={installTargetComponent?.id ?? null}
        aircraft={selectedAircraft}
        defaultPartNumber={installingComponentPartNumber}
        slotBatchId={installTargetComponent?.batch?.id ?? null}
        slotLabel={installTargetComponent?.position}
        componentLabel={installTargetComponent?.batch?.name ?? installTargetComponent?.description ?? undefined}
      />

      <UninstallComponentDialog
        open={uninstallingComponent !== null}
        onOpenChange={(open) => {
          if (!open) setUninstallingComponent(null);
        }}
        component={uninstallingComponent ?? null}
        aircraft={selectedAircraft}
      />

      <IntervalDialog
        open={isIntervalDialogOpen}
        onOpenChange={(open) => {
          setIsIntervalDialogOpen(open);
          if (!open) {
            setEditingInterval(null);
            setIntervalTargetComponent(null);
          }
        }}
        partId={intervalTargetComponent?.installed_part_id ?? 0}
        componentId={intervalTargetComponent?.id ?? null}
        aircraftId={selectedAircraftId}
        interval={editingInterval}
      />
    </ContentLayout>
  );
}
