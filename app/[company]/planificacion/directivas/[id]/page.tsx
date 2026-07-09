'use client';

import CreateAirworthinessDirectiveApplicabilityDialog from '@/components/dialogs/planificacion/directivas/CreateAirworthinessDirectiveApplicabilityDialog';
import CreateAirworthinessDirectiveComplianceControlDialog from '@/components/dialogs/planificacion/directivas/CreateAirworthinessDirectiveComplianceControlDialog';
import CreateAirworthinessDirectiveComplianceExecutionDialog from '@/components/dialogs/planificacion/directivas/CreateAirworthinessDirectiveComplianceExecutionDialog';
import EditAirworthinessDirectiveDialog from '@/components/dialogs/planificacion/directivas/EditAirworthinessDirectiveDialog';
import ViewAirworthinessDirectivePdfDialog from '@/components/dialogs/planificacion/directivas/ViewAirworthinessDirectivePdfDialog';
import { ContentLayout } from '@/components/layout/ContentLayout';
import LoadingPage from '@/components/misc/LoadingPage';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  useDeleteAirworthinessDirectiveApplicability,
  useGetAirworthinessDirectiveApplicabilities,
  useGetAirworthinessDirectiveComplianceControls,
  useGetAirworthinessDirectiveComplianceRecords,
  useGetAirworthinessDirectiveDetail,
} from '@/hooks/planificacion/directivas/queries';
import { formatDate } from '@/lib/helpers/format';
import { useDebouncedInput } from '@/lib/useDebounce';
import { cn } from '@/lib/utils';
import { useCompanyStore } from '@/stores/CompanyStore';
import { AlertCircle, ArrowLeft, CheckCheck, Pencil, Plus, RotateCcw, Search, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import type {
  AirworthinessDirectiveApplicabilityResource,
  AirworthinessDirectiveComplianceControlResource,
} from '@api/types';

const getComplianceStatusBadgeClass = (status: string) => {
  const normalized = status.toLowerCase();

  if (normalized.includes('overdue') || normalized.includes('venc')) {
    return 'border-red-500/30 bg-red-500/10 text-red-700';
  }

  if (normalized.includes('upcoming') || normalized.includes('proxim')) {
    return 'border-amber-500/30 bg-amber-500/10 text-amber-700';
  }

  if (normalized.includes('closed') || normalized.includes('cerr')) {
    return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700';
  }

  return 'border-slate-500/30 bg-slate-500/10 text-slate-700';
};

const EmptyTab = ({ title, description }: { title: string; description: string }) => (
  <div className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center bg-background">
    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded border border-dashed border-border bg-muted/30 text-muted-foreground">
      <AlertCircle className="size-5" />
    </div>
    <div className="mt-2 space-y-1.5">
      <p className="font-medium text-foreground">{title}</p>
      <p className="max-w-xl text-sm text-foreground/80">{description}</p>
    </div>
  </div>
);

const InlineMetric = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="min-w-0">
    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
    <p className="mt-1 text-sm font-semibold text-foreground truncate">{value}</p>
  </div>
);

const TabSummaryPill = ({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: React.ReactNode;
  tone?: 'default' | 'warning' | 'danger' | 'success' | 'info';
}) => {
  const toneClass = {
    default: 'border-border bg-muted/30 text-foreground',
    warning: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
    danger: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400',
    success: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    info: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-400',
  }[tone];

  return (
    <div className={cn('flex items-center gap-1.5 rounded-full border px-2.5 py-1', toneClass)}>
      <span className="text-[10px] font-semibold uppercase tracking-widest opacity-80">{label}</span>
      <span className="text-xs font-semibold">{value}</span>
    </div>
  );
};

const SectionCard = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('overflow-hidden rounded-lg border bg-background', className)}>
    <div className="p-5">{children}</div>
  </div>
);

export default function AirworthinessDirectiveDetailPage() {
  const complianceListPerPage = 10;
  const { id } = useParams<{ id: string }>();
  const directiveId = Number(id);
  const { selectedCompany } = useCompanyStore();
  const [controlSearch, setControlSearch] = useState('');
  const [controlSearchInput, setControlSearchInput] = useDebouncedInput('', setControlSearch, 350);
  const [controlSort, setControlSort] = useState<'newest' | 'oldest'>('oldest');
  const [controlPage, setControlPage] = useState(1);
  const [executionSearch, setExecutionSearch] = useState('');
  const [executionSearchInput, setExecutionSearchInput] = useDebouncedInput('', setExecutionSearch, 350);
  const [executionAircraftFilter, setExecutionAircraftFilter] = useState('all');
  const [executionSort, setExecutionSort] = useState<'newest' | 'oldest' | 'aircraft'>('newest');
  const [executionPage, setExecutionPage] = useState(1);

  const {
    data: directiveResponse,
    isLoading,
    isError,
  } = useGetAirworthinessDirectiveDetail(Number.isFinite(directiveId) ? directiveId : undefined);
  const { data: applicabilitiesResponse, isLoading: isApplicabilitiesLoading } =
    useGetAirworthinessDirectiveApplicabilities(Number.isFinite(directiveId) ? directiveId : undefined);
  const { data: controlsResponse, isLoading: isControlsLoading } = useGetAirworthinessDirectiveComplianceControls(
    Number.isFinite(directiveId) ? directiveId : undefined,
    {
      search: controlSearch || undefined,
      order_by: controlSort,
      page: controlPage,
      per_page: complianceListPerPage,
    },
  );
  const { data: recordsResponse, isLoading: isRecordsLoading } = useGetAirworthinessDirectiveComplianceRecords(
    Number.isFinite(directiveId) ? directiveId : undefined,
    {
      search: executionSearch || undefined,
      aircraft_id: executionAircraftFilter !== 'all' ? Number(executionAircraftFilter) : undefined,
      order_by: executionSort,
      page: executionPage,
      per_page: complianceListPerPage,
    },
  );

  const directive = directiveResponse?.data;
  const summary = directive?.summary;
  const applicabilities = useMemo(() => applicabilitiesResponse?.data ?? [], [applicabilitiesResponse?.data]);
  const controls = useMemo(() => controlsResponse?.data ?? [], [controlsResponse?.data]);
  const records = useMemo(() => recordsResponse?.data ?? [], [recordsResponse?.data]);

  const applicableAircraft = useMemo(() => applicabilities.filter((item) => item.is_applicable), [applicabilities]);

  const aircraftLabelByApplicabilityId = useMemo(() => {
    const map = new Map<number, string>();

    for (const item of applicabilities) {
      map.set(item.id, item.aircraft?.acronym ?? `#${item.aircraft_id}`);
    }

    return map;
  }, [applicabilities]);

  const executionAircraftOptions = useMemo(() => {
    const uniqueAircraft = new Map<string, { value: string; label: string }>();

    records.forEach((record) => {
      const value = String(record.aircraft_id);
      if (!uniqueAircraft.has(value)) {
        uniqueAircraft.set(value, {
          value,
          label: record.aircraft?.acronym ?? `#${record.aircraft_id}`,
        });
      }
    });

    return Array.from(uniqueAircraft.values()).sort((left, right) => left.label.localeCompare(right.label));
  }, [records]);

  const resetControlFilters = () => {
    setControlSearchInput('');
    setControlSort('oldest');
    setControlPage(1);
  };

  const resetExecutionFilters = () => {
    setExecutionSearchInput('');
    setExecutionAircraftFilter('all');
    setExecutionSort('newest');
    setExecutionPage(1);
  };

  const [isCreateApplicabilityOpen, setIsCreateApplicabilityOpen] = useState(false);
  const [applicabilityToEdit, setApplicabilityToEdit] = useState<
    AirworthinessDirectiveApplicabilityResource | undefined
  >();
  const [applicabilityToDelete, setApplicabilityToDelete] = useState<
    AirworthinessDirectiveApplicabilityResource | undefined
  >();
  const [controlToEdit, setControlToEdit] = useState<AirworthinessDirectiveComplianceControlResource | undefined>();
  const [isControlDialogOpen, setIsControlDialogOpen] = useState(false);
  const [executionControl, setExecutionControl] = useState<
    AirworthinessDirectiveComplianceControlResource | undefined
  >();
  const [isExecutionDialogOpen, setIsExecutionDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isEditDirectiveOpen, setIsEditDirectiveOpen] = useState(false);

  const deleteApplicability = useDeleteAirworthinessDirectiveApplicability(
    Number.isFinite(directiveId) ? directiveId : undefined,
  );
  const existingAircraftIds = useMemo(() => {
    const result = new Set<number>();

    for (const item of applicabilities) {
      const aircraftId = item.aircraft?.id ?? item.aircraft_id;
      if (Number.isFinite(aircraftId)) {
        result.add(aircraftId);
      }
    }

    return Array.from(result);
  }, [applicabilities]);

  const openCreateApplicability = () => {
    setApplicabilityToEdit(undefined);
    setIsCreateApplicabilityOpen(true);
  };

  const openEditApplicability = (applicability: AirworthinessDirectiveApplicabilityResource) => {
    setApplicabilityToEdit(applicability);
    setIsCreateApplicabilityOpen(true);
  };

  const closeApplicabilityDialog = (open: boolean) => {
    setIsCreateApplicabilityOpen(open);
    if (!open) {
      setApplicabilityToEdit(undefined);
    }
  };

  const openDeleteApplicability = (applicability: AirworthinessDirectiveApplicabilityResource) => {
    setApplicabilityToDelete(applicability);
    setIsDeleteDialogOpen(true);
  };

  const openControlDialog = (control?: AirworthinessDirectiveComplianceControlResource) => {
    setControlToEdit(control);
    setIsControlDialogOpen(true);
  };

  const closeControlDialog = (open: boolean) => {
    setIsControlDialogOpen(open);
    if (!open) {
      setControlToEdit(undefined);
    }
  };

  const openExecutionDialog = (control: AirworthinessDirectiveComplianceControlResource) => {
    setExecutionControl(control);
    setIsExecutionDialogOpen(true);
  };

  const closeExecutionDialog = (open: boolean) => {
    setIsExecutionDialogOpen(open);
    if (!open) {
      setExecutionControl(undefined);
    }
  };

  const closeDeleteApplicabilityDialog = (open: boolean) => {
    setIsDeleteDialogOpen(open);
    if (!open) {
      setApplicabilityToDelete(undefined);
    }
  };

  const handleDeleteApplicability = async () => {
    if (!applicabilityToDelete) return;

    await deleteApplicability.mutateAsync({
      path: { directiveId, applicabilityId: applicabilityToDelete.id },
    });

    if (applicabilityToEdit?.id === applicabilityToDelete.id) {
      setApplicabilityToEdit(undefined);
      setIsCreateApplicabilityOpen(false);
    }

    setApplicabilityToDelete(undefined);
    setIsDeleteDialogOpen(false);
  };

  const hasControlFilters = Boolean(controlSearchInput || controlSort !== 'oldest' || controlPage > 1);
  const hasExecutionFilters = Boolean(
    executionSearchInput || executionAircraftFilter !== 'all' || executionSort !== 'newest' || executionPage > 1,
  );

  if (isLoading) return <LoadingPage />;

  if (isError || !directive) {
    return (
      <ContentLayout title="Directiva de Aeronavegabilidad">
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>No se pudo cargar la directiva solicitada.</AlertDescription>
        </Alert>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout title={directive.ad_number}>
      <div className="space-y-4 py-4">
        <section className="overflow-hidden rounded-lg border bg-background">
          <div className="flex flex-col gap-3 px-4 py-3 sm:px-5">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0 space-y-2">
                <Link href={`/${selectedCompany?.slug}/planificacion/directivas`} className="inline-flex">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="-ml-2 gap-1.5 px-2 text-xs text-muted-foreground hover:bg-transparent"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Volver
                  </Button>
                </Link>

                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-semibold tracking-[0.08em]">{directive.ad_number}</h1>
                  <Badge
                    variant="outline"
                    className="border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300 text-[10px] px-2 py-0 leading-4"
                  >
                    {directive.authority}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2 py-0 leading-4 ${
                      directive.is_recurring
                        ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                        : 'border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {directive.is_recurring ? 'Recurrente' : 'Única'}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`text-[10px] px-2 py-0 leading-4 ${
                      (summary?.has_pdf_document ?? Boolean(directive.pdf_document_url))
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                        : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                    }`}
                  >
                    {(summary?.has_pdf_document ?? Boolean(directive.pdf_document_url))
                      ? 'PDF disponible'
                      : 'PDF pendiente'}
                  </Badge>
                </div>

                {directive.subject_description && (
                  <p className="max-w-3xl text-xs leading-relaxed text-foreground/70">
                    {directive.subject_description}
                  </p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <ViewAirworthinessDirectivePdfDialog
                  adNumber={directive.ad_number}
                  pdfUrl={directive.pdf_document_url}
                />
                <Button size="sm" variant="outline" onClick={() => setIsEditDirectiveOpen(true)}>
                  <Pencil className="mr-1.5 h-3.5 w-3.5" />
                  Editar
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t pt-3 text-xs text-muted-foreground">
              <span>
                Emisión: <strong className="text-foreground">{formatDate(directive.issue_date)}</strong>
              </span>
              <span>
                Vigencia: <strong className="text-foreground">{formatDate(directive.effective_date)}</strong>
              </span>
            </div>
          </div>

          <div className="grid gap-px bg-border md:grid-cols-2 border-t">
            <div className="bg-background px-4 py-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Cobertura de flota
              </p>
              <div className="flex flex-wrap gap-2">
                <TabSummaryPill label="Evaluadas" value={summary?.total_aircraft_evaluated ?? 0} />
                <TabSummaryPill label="Aplican" value={summary?.total_applicable_aircraft ?? 0} tone="success" />
                <TabSummaryPill label="No aplican" value={summary?.total_non_applicable_aircraft ?? 0} />
                <TabSummaryPill label="Pend. config" value={summary?.pending_configuration_count ?? 0} tone="warning" />
              </div>
            </div>
            <div className="bg-background px-4 py-3">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Seguimiento de cumplimiento
              </p>
              <div className="flex flex-wrap gap-2">
                <TabSummaryPill label="Abiertos" value={summary?.total_open_controls ?? 0} tone="warning" />
                <TabSummaryPill label="Cerrados" value={summary?.total_closed_controls ?? 0} tone="success" />
                <TabSummaryPill label="Recurrentes" value={summary?.total_recurrent_controls ?? 0} />
                <TabSummaryPill label="Vencidas" value={summary?.overdue_count ?? 0} tone="danger" />
              </div>
            </div>
          </div>
        </section>

        <Tabs defaultValue="applicability" className="space-y-4">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-2 rounded-lg border bg-muted/20 p-2">
            <TabsTrigger
              value="applicability"
              className="rounded px-4 py-2 text-[11px] font-semibold uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Aplicabilidad
            </TabsTrigger>
            <TabsTrigger
              value="control"
              className="rounded px-4 py-2 text-[11px] font-semibold uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Control
            </TabsTrigger>
            <TabsTrigger
              value="executions"
              className="rounded px-4 py-2 text-[11px] font-semibold uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              Ejecuciones
            </TabsTrigger>
          </TabsList>

          <TabsContent value="applicability" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <TabSummaryPill label="Evaluadas" value={summary?.total_aircraft_evaluated ?? 0} />
                <TabSummaryPill label="Aplicables" value={summary?.total_applicable_aircraft ?? 0} tone="success" />
                {!!summary?.pending_configuration_count && (
                  <TabSummaryPill label="Pend. config." value={summary?.pending_configuration_count} tone="warning" />
                )}
              </div>
              <Button size="sm" onClick={openCreateApplicability}>
                <Plus className="mr-2 h-4 w-4" />
                Nueva aplicabilidad
              </Button>
            </div>

            <CreateAirworthinessDirectiveApplicabilityDialog
              directiveId={directiveId}
              existingAircraftIds={existingAircraftIds}
              applicability={applicabilityToEdit}
              open={isCreateApplicabilityOpen}
              onOpenChange={closeApplicabilityDialog}
            />

            {isApplicabilitiesLoading ? (
              <LoadingPage />
            ) : applicabilities.length === 0 ? (
              <EmptyTab
                title="Sin aplicabilidades"
                description="Esta directiva todavía no tiene aeronaves evaluadas en aplicabilidad."
              />
            ) : (
              <div className="space-y-1.5">
                {applicabilities.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 rounded-lg border bg-background px-4 py-2.5 transition-colors hover:bg-muted/20"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="text-sm font-semibold whitespace-nowrap">
                        {item.aircraft?.acronym ?? `#${item.aircraft_id}`}
                      </span>
                      {item.is_applicable ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 text-[10px] px-2 py-0 leading-4"
                        >
                          Aplica
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-slate-500/30 bg-slate-500/10 text-slate-700 text-[10px] px-2 py-0 leading-4"
                        >
                          No aplica
                        </Badge>
                      )}
                      <span className="hidden sm:block text-xs text-muted-foreground truncate">
                        {item.aircraft?.aircraft_type?.full_name ?? item.aircraft?.model ?? ''}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {item.non_applicability_reason || '—'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => openEditApplicability(item)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="sr-only">Editar</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-7"
                        onClick={() => openDeleteApplicability(item)}
                        disabled={deleteApplicability.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="sr-only">Eliminar</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <AlertDialog open={isDeleteDialogOpen} onOpenChange={closeDeleteApplicabilityDialog}>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Eliminar aplicabilidad</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta acción no se puede deshacer. La aplicabilidad de{' '}
                    {applicabilityToDelete?.aircraft?.acronym ?? applicabilityToDelete?.aircraft_id} será eliminada.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleteApplicability.isPending}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteApplicability} disabled={deleteApplicability.isPending}>
                    {deleteApplicability.isPending ? 'Eliminando...' : 'Eliminar'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </TabsContent>

          <TabsContent value="control" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <TabSummaryPill label="Abiertos" value={summary?.total_open_controls ?? 0} tone="warning" />
                <TabSummaryPill label="Cerrados" value={summary?.total_closed_controls ?? 0} tone="success" />
                <TabSummaryPill label="Vencidas" value={summary?.overdue_count ?? 0} tone="danger" />
              </div>
              <Button size="sm" onClick={() => openControlDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo control
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <Input
                value={controlSearchInput}
                onChange={(event) => {
                  setControlSearchInput(event.target.value);
                  setControlPage(1);
                }}
                placeholder="Buscar por descripción"
                className="h-8 min-w-0 flex-1 border-0 bg-transparent px-0 text-sm shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0"
              />
              <Select
                value={controlSort}
                onValueChange={(value) => {
                  setControlSort(value as 'newest' | 'oldest');
                  setControlPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-auto gap-1 border-0 bg-background px-2.5 text-xs font-medium shadow-none">
                  <SelectValue placeholder="Ordenar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oldest">Vence primero</SelectItem>
                  <SelectItem value="newest">Vence después</SelectItem>
                </SelectContent>
              </Select>
              {hasControlFilters ? (
                <Button variant="ghost" size="icon" className="size-7 shrink-0" onClick={resetControlFilters}>
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span className="sr-only">Limpiar filtros</span>
                </Button>
              ) : null}
            </div>

            {isControlsLoading ? (
              <LoadingPage />
            ) : controls.length === 0 ? (
              <EmptyTab
                title="Sin controles"
                description="Esta directiva todavía no tiene controles de cumplimiento registrados."
              />
            ) : (
              <div className="space-y-1.5">
                {controls.map((control) => (
                  <div
                    key={control.id}
                    className="rounded-lg border bg-background px-4 py-2.5 transition-colors hover:bg-muted/20"
                  >
                    <div className="flex items-start gap-4">
                      <div className="min-w-0 flex-1 space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold">
                            {control.description || (
                              <span className="italic text-muted-foreground">Sin descripción</span>
                            )}
                          </p>
                          <Badge
                            variant="outline"
                            className={cn(
                              'text-[10px] px-2 py-0 leading-4',
                              getComplianceStatusBadgeClass(control.compliance_status),
                            )}
                          >
                            {control.compliance_status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                          <span>
                            Vence:{' '}
                            <strong className="text-foreground">{formatDate(control.calendar_due_date ?? null)}</strong>
                          </span>
                          <span className="text-border/50">|</span>
                          <span>
                            FH: <strong className="text-foreground">{control.flight_hours_due ?? '—'}</strong>
                          </span>
                          <span className="text-border/50">|</span>
                          <span>
                            FC: <strong className="text-foreground">{control.cycles_due ?? '—'}</strong>
                          </span>
                          {(control.recurrence_interval_days ||
                            control.recurrence_interval_hours ||
                            control.recurrence_interval_cycles) && (
                            <>
                              <span className="text-border/50">|</span>
                              <span className="text-muted-foreground/60">Rec:</span>
                              {control.recurrence_interval_days && (
                                <span>
                                  <strong className="text-foreground">{control.recurrence_interval_days}</strong>d
                                </span>
                              )}
                              {control.recurrence_interval_hours && (
                                <span>
                                  <strong className="text-foreground">{control.recurrence_interval_hours}</strong>h
                                </span>
                              )}
                              {control.recurrence_interval_cycles && (
                                <span>
                                  <strong className="text-foreground">{control.recurrence_interval_cycles}</strong>fc
                                </span>
                              )}
                            </>
                          )}
                        </div>
                        {control.aircraft_statuses && control.aircraft_statuses.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {control.aircraft_statuses.map((aircraftStatus) => (
                              <Badge
                                key={aircraftStatus.applicability_id}
                                variant="outline"
                                title={[
                                  aircraftStatus.next_calendar_due_date &&
                                    `Vence: ${formatDate(aircraftStatus.next_calendar_due_date)}`,
                                  aircraftStatus.next_flight_hours_due != null &&
                                    `FH: ${aircraftStatus.next_flight_hours_due}`,
                                  aircraftStatus.next_cycles_due != null && `FC: ${aircraftStatus.next_cycles_due}`,
                                  aircraftStatus.last_execution_date &&
                                    `Última ejecución: ${formatDate(aircraftStatus.last_execution_date)}`,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                                className={cn(
                                  'gap-1 text-[10px] px-1.5 py-0 leading-4',
                                  getComplianceStatusBadgeClass(aircraftStatus.urgency),
                                )}
                              >
                                {aircraftLabelByApplicabilityId.get(aircraftStatus.applicability_id) ??
                                  `#${aircraftStatus.aircraft_id}`}
                                <span className="text-[9px] opacity-70">{aircraftStatus.status}</span>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => openControlDialog(control)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => openExecutionDialog(control)}
                          disabled={applicableAircraft.length === 0}
                        >
                          <CheckCheck className="h-3.5 w-3.5" />
                          <span className="sr-only">Registrar cumplimiento</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setControlPage((current) => Math.max(1, current - 1))}
                disabled={controlPage === 1 || isControlsLoading}
              >
                Anterior
              </Button>
              <span className="text-sm text-muted-foreground">Página {controlPage}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setControlPage((current) => current + 1)}
                disabled={controls.length < complianceListPerPage || isControlsLoading}
              >
                Siguiente
              </Button>
            </div>

            {isControlsLoading ? null : (
              <>
                <CreateAirworthinessDirectiveComplianceControlDialog
                  directiveId={directiveId}
                  control={controlToEdit}
                  open={isControlDialogOpen}
                  onOpenChange={closeControlDialog}
                />

                {executionControl && (
                  <CreateAirworthinessDirectiveComplianceExecutionDialog
                    directiveId={directiveId}
                    applicabilities={applicabilities}
                    control={executionControl}
                    open={isExecutionDialogOpen}
                    onOpenChange={closeExecutionDialog}
                  />
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="executions" className="space-y-4">
            {isRecordsLoading ? (
              <LoadingPage />
            ) : (
              <div className="space-y-4">
                <SectionCard>
                  <div className="space-y-4">
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                          Ejecuciones registradas
                        </p>
                        <p className="mt-1 text-sm text-muted-foreground">
                          Historial operativo por aeronave, OT e inspector.
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <TabSummaryPill label="Registros" value={records.length} />
                        <TabSummaryPill label="Aeronaves" value={executionAircraftOptions.length || '—'} tone="info" />
                      </div>
                    </div>

                    <div className="grid gap-3 rounded-3xl border border-border/70 bg-muted/20 p-3 lg:grid-cols-[minmax(0,1.25fr)_220px_220px_auto]">
                      <div className="relative">
                        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          value={executionSearchInput}
                          onChange={(event) => {
                            setExecutionSearchInput(event.target.value);
                            setExecutionPage(1);
                          }}
                          placeholder="Buscar por OT, inspector, aeronave u observación"
                          className="border-background bg-background pl-10"
                        />
                      </div>

                      <Select
                        value={executionAircraftFilter}
                        onValueChange={(value) => {
                          setExecutionAircraftFilter(value);
                          setExecutionPage(1);
                        }}
                      >
                        <SelectTrigger className="border-background bg-background">
                          <SelectValue placeholder="Filtrar por aeronave" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todas las aeronaves</SelectItem>
                          {executionAircraftOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={executionSort}
                        onValueChange={(value) => {
                          setExecutionSort(value as 'newest' | 'oldest' | 'aircraft');
                          setExecutionPage(1);
                        }}
                      >
                        <SelectTrigger className="border-background bg-background">
                          <SelectValue placeholder="Ordenar por" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="newest">Fecha más reciente</SelectItem>
                          <SelectItem value="oldest">Fecha más antigua</SelectItem>
                          <SelectItem value="aircraft">Aeronave</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex justify-end">
                        {hasExecutionFilters ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={resetExecutionFilters}
                          >
                            <RotateCcw className="h-4 w-4" />
                            Limpiar filtros
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </SectionCard>

                {records.length === 0 ? (
                  <EmptyTab
                    title="Sin coincidencias"
                    description="No hay ejecuciones que coincidan con los filtros actuales."
                  />
                ) : (
                  <div className="space-y-3">
                    {records.map((item) => (
                      <SectionCard key={item.id} className="transition-colors hover:bg-muted/20">
                        <div className="space-y-4">
                          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-base font-semibold">
                                  {item.aircraft?.acronym ?? `#${item.aircraft_id}`}
                                </p>
                                <Badge variant="outline" className="border-slate-500/30 bg-slate-500/10 text-slate-700">
                                  OT {item.work_order_number}
                                </Badge>
                              </div>
                              <p className="mt-2 text-sm text-muted-foreground">
                                {item.remarks || 'Sin observación registrada para esta ejecución.'}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-border/70 bg-muted/20 px-3 py-2 text-sm font-medium text-foreground">
                              {formatDate(item.execution_date)}
                            </div>
                          </div>

                          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-4">
                            <InlineMetric label="Fecha" value={formatDate(item.execution_date)} />
                            <InlineMetric label="FH" value={item.flight_hours_at_execution ?? '—'} />
                            <InlineMetric label="FC" value={item.cycles_at_execution ?? '—'} />
                            <InlineMetric label="Inspector" value={item.inspector_license_signature} />
                          </div>
                        </div>
                      </SectionCard>
                    ))}
                  </div>
                )}

                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setExecutionPage((current) => Math.max(1, current - 1))}
                    disabled={executionPage === 1 || isRecordsLoading}
                  >
                    Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground">Página {executionPage}</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setExecutionPage((current) => current + 1)}
                    disabled={records.length < complianceListPerPage || isRecordsLoading}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <EditAirworthinessDirectiveDialog
        directive={directive}
        open={isEditDirectiveOpen}
        onOpenChange={setIsEditDirectiveOpen}
      />
    </ContentLayout>
  );
}
