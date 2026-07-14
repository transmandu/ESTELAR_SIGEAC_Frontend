'use client';

import { useCreateInstallRequest } from '@/actions/planificacion/hard_time/actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { AircraftResource } from '@api/types';
import { AlertCircle, CalendarClock, CheckCircle2, Loader2, PenLine, Send } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ConfirmationField,
  FieldLabel,
  parseOptionalInteger,
  parseRequiredNumber,
  todayDate,
} from './install-form-shared';
import { usePaginatedWarehouseArticles } from './use-paginated-warehouse-articles';
import { WarehouseInventoryTable, type WarehouseRow } from './warehouse-inventory-table';

type WarehouseDraft = {
  article_id: string;
  serial_number: string;
  part_number: string;
  installed_at: string;
  component_hours_at_install: string;
  component_cycles_at_install: string;
};

interface WarehouseInstallFormProps {
  componentId: number | null;
  aircraft: AircraftResource | null;
  defaultPartNumber?: string;
  slotBatchId?: number | null;
  slotLabel?: string;
  componentLabel?: string;
  onSuccess: () => void;
}

export function WarehouseInstallForm({
  componentId,
  aircraft,
  defaultPartNumber,
  slotBatchId,
  slotLabel,
  componentLabel,
  onSuccess,
}: WarehouseInstallFormProps) {
  const createRequest = useCreateInstallRequest(componentId ?? 0, aircraft?.id ?? null);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  // Default filter: restrict inventory to the slot's expected batch/PN. Optional — the
  // user can turn it off to pick any compatible article.
  const canFilterBySlot = Boolean(slotBatchId || defaultPartNumber);
  const [filterBySlot, setFilterBySlot] = useState(canFilterBySlot);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const {
    data: paginated,
    isLoading: isWarehouseLoading,
    isError: isWarehouseError,
  } = usePaginatedWarehouseArticles({
    search: debouncedSearch || undefined,
    batchId: filterBySlot ? slotBatchId : undefined,
    partNumber: filterBySlot && !slotBatchId ? defaultPartNumber : undefined,
    page,
    perPage: 25,
  });

  const warehouseRows = useMemo(() => {
    return (paginated?.data ?? []).flatMap(({ articles, ...batch }) =>
      (articles ?? []).map((article) => ({ article, batch })),
    );
  }, [paginated]);

  const [warehouseErrorMessage, setWarehouseErrorMessage] = useState<string | null>(null);
  const [selectedWarehouseArticleId, setSelectedWarehouseArticleId] = useState<number | null>(null);
  const [draft, setDraft] = useState<WarehouseDraft>({
    article_id: '',
    serial_number: '',
    part_number: defaultPartNumber ?? '',
    installed_at: todayDate(),
    component_hours_at_install: '0',
    component_cycles_at_install: '0',
  });

  const selectedWarehouseRow = useMemo(
    () => warehouseRows.find((row) => row.article.id === selectedWarehouseArticleId) ?? null,
    [selectedWarehouseArticleId, warehouseRows],
  );

  // ---- reset on mount ----
  const wasOpenRef = useRef(false);
  useEffect(() => {
    if (wasOpenRef.current) return;
    wasOpenRef.current = true;

    setDraft({
      article_id: '',
      serial_number: '',
      part_number: defaultPartNumber ?? '',
      installed_at: todayDate(),
      component_hours_at_install: '0',
      component_cycles_at_install: '0',
    });
    setSelectedWarehouseArticleId(null);
    setWarehouseErrorMessage(null);
    setSearch('');
    setPage(1);
  }, [defaultPartNumber]);

  // ---- reset page when search or slot filter changes ----
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, filterBySlot]);

  // ---- warehouse article selection ----
  const handleWarehouseDetailFetch = async (row: WarehouseRow) => {
    setSelectedWarehouseArticleId(row.article.id);
    setWarehouseErrorMessage(null);

    setDraft((current) => ({
      ...current,
      article_id: String(row.article.id),
      serial_number: row.article.serial || '',
      part_number: row.article.part_number || defaultPartNumber || '',
      component_hours_at_install: String(row.article.aircraft_part?.total_flight_hours ?? 0),
      component_cycles_at_install: String(row.article.aircraft_part?.total_flight_cycles ?? 0),
    }));
  };

  // ---- submit ----
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!componentId) return;

    const articleId = parseOptionalInteger(draft.article_id);
    if (!articleId) return;

    await createRequest.mutateAsync({
      path: { id: componentId },
      body: {
        article_id: articleId,
        installed_at: draft.installed_at,
        component_hours_at_install: parseRequiredNumber(draft.component_hours_at_install),
        component_cycles_at_install: parseRequiredNumber(draft.component_cycles_at_install),
      },
    });
    onSuccess();
  };

  const aircraftFh = aircraft?.flight_hours ?? '—';
  const aircraftFc = aircraft?.flight_cycles ?? '—';

  const isSubmitDisabled = !componentId || createRequest.isPending || !draft.article_id || !draft.installed_at;

  return (
    <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-5 px-6 py-5">
          {/* Aircraft info bar */}
          <div className="flex items-center gap-3 rounded-lg border bg-sky-50 px-4 py-2.5 dark:bg-sky-950/20">
            <div className="flex h-6 w-6 items-center justify-center rounded border border-sky-200 bg-sky-500/10 dark:border-sky-800/40">
              <PenLine className="size-3 text-sky-600 dark:text-sky-400" />
            </div>
            <span className="text-[11px] font-bold uppercase tracking-widest text-sky-700 dark:text-sky-400">
              Aeronave
            </span>
            <span className="text-foreground/40">·</span>
            <span className="font-mono text-sm font-medium text-foreground">{aircraft?.acronym ?? '—'}</span>
            <div className="ml-auto flex items-center gap-4">
              {slotLabel ? (
                <div className="flex items-center gap-1.5">
                  <FieldLabel>Posición</FieldLabel>
                  <span className="font-mono text-xs font-medium text-foreground">{slotLabel}</span>
                </div>
              ) : null}
              {componentLabel ? (
                <div className="flex items-center gap-1.5">
                  <FieldLabel>Componente</FieldLabel>
                  <span className="text-xs font-medium text-foreground">{componentLabel}</span>
                </div>
              ) : null}
              <div className="flex items-center gap-1.5">
                <FieldLabel>FH</FieldLabel>
                <span className="font-mono text-xs font-medium text-foreground">{aircraftFh}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <FieldLabel>FC</FieldLabel>
                <span className="font-mono text-xs font-medium text-foreground">{aircraftFc}</span>
              </div>
            </div>
          </div>

          {canFilterBySlot && (
            <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-muted/15 px-4 py-2.5">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">Filtrar por componente de la posición</p>
                <p className="text-xs text-muted-foreground">
                  {slotBatchId
                    ? `Mostrando solo artículos del componente esperado${componentLabel ? ` (${componentLabel})` : ''}.`
                    : `Mostrando solo artículos con P/N esperado ${defaultPartNumber}.`}{' '}
                  Desactívalo para ver todo el inventario.
                </p>
              </div>
              <Switch checked={filterBySlot} onCheckedChange={setFilterBySlot} />
            </div>
          )}

          <WarehouseInventoryTable
            rows={warehouseRows}
            isLoading={isWarehouseLoading}
            isError={isWarehouseError}
            selectedArticleId={selectedWarehouseArticleId}
            onSelectRow={handleWarehouseDetailFetch}
            searchValue={search}
            onSearchChange={setSearch}
            pagination={paginated?.meta ?? undefined}
            onPageChange={setPage}
          />

          {warehouseErrorMessage ? (
            <Alert variant="default" className="border-amber-500/30 bg-amber-500/10">
              <AlertCircle className="size-4 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-amber-700 dark:text-amber-300">
                {warehouseErrorMessage}
              </AlertDescription>
            </Alert>
          ) : null}

          {selectedWarehouseRow ? (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-sky-200 bg-sky-50/60 px-4 py-2.5 dark:border-sky-800/40 dark:bg-sky-950/20">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="size-3.5 text-sky-600 dark:text-sky-400" />
                <FieldLabel>Seleccionado</FieldLabel>
              </div>
              <div className="flex items-center gap-1.5">
                <FieldLabel>Serial</FieldLabel>
                <span className="font-mono text-xs font-medium text-foreground">
                  {selectedWarehouseRow.article.serial}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <FieldLabel>P/N</FieldLabel>
                <span className="font-mono text-xs font-medium text-foreground">
                  {selectedWarehouseRow.article.part_number}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <FieldLabel>Batch</FieldLabel>
                <span className="text-xs text-foreground/80">{selectedWarehouseRow.batch.name}</span>
              </div>
            </div>
          ) : null}

          <div className="overflow-hidden rounded-lg border bg-background">
            <div className="flex items-center justify-between border-b bg-muted/20 px-4 py-2.5">
              <FieldLabel>Confirmación de solicitud</FieldLabel>
              <span className="text-[11px] text-muted-foreground">
                Ajusta si el valor real difiere del registrado en inventario
              </span>
            </div>

            <div className="grid gap-x-4 gap-y-4 p-4 md:grid-cols-2 xl:grid-cols-3">
              <ConfirmationField
                label="Serial Number"
                value={draft.serial_number}
                onChange={(value) => setDraft((d) => ({ ...d, serial_number: value }))}
                placeholder="SN-00000"
                disabled
                mono
              />
              <ConfirmationField
                label="Part Number"
                value={draft.part_number}
                onChange={(value) => setDraft((d) => ({ ...d, part_number: value }))}
                placeholder="P/N"
                disabled
                mono
              />
              <ConfirmationField
                label="Fecha de montaje"
                type="date"
                value={draft.installed_at}
                onChange={(value) => setDraft((d) => ({ ...d, installed_at: value }))}
                required
              />
              <ConfirmationField
                label="FH componente al montar"
                type="number"
                step="0.01"
                value={draft.component_hours_at_install}
                onChange={(value) => setDraft((d) => ({ ...d, component_hours_at_install: value }))}
                required
                mono
              />
              <ConfirmationField
                label="FC componente al montar"
                type="number"
                value={draft.component_cycles_at_install}
                onChange={(value) => setDraft((d) => ({ ...d, component_cycles_at_install: value }))}
                required
                mono
              />
            </div>
          </div>
        </div>
      </div>

      <DialogFooter className="border-t bg-muted/15 px-6 py-3 sm:justify-between">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <CalendarClock className="size-3.5" />
          La solicitud queda pendiente de aprobación por almacén.
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancelar
          </Button>
          <Button type="submit" className="gap-2" disabled={isSubmitDisabled}>
            {createRequest.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Enviando…
              </>
            ) : (
              <>
                <Send className="size-4" />
                Enviar solicitud
              </>
            )}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
