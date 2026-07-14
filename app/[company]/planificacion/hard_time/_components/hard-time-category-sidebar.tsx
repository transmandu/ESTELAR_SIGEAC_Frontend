'use client';

import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { AircraftComponentSlotResource, HardTimeCategoryResource } from '@api/types';
import { AlertTriangle, Boxes, PackageOpen, PlusCircle, Search, ShieldCheck, TriangleAlert, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { HardTimeCard } from './hard-time-card';
import { computeComponentStatus } from './hard-time-shared';
import { cn } from '@/lib/utils';

interface HardTimeCategorySidebarProps {
  categories: HardTimeCategoryResource[];
  categoryGroups: AircraftComponentSlotResource[][];
  averages: { average_daily_flight_hours?: number | null; average_daily_flight_cycles?: number | null } | null;
  aircraftFlightHours?: number | null;
  aircraftFlightCycles?: number | null;
  componentHref: (component: AircraftComponentSlotResource) => string;
  initialCategoryCode?: string | null;
  onCategoryChange?: (code: string) => void;
  onInstallComponent: (component: AircraftComponentSlotResource) => void;
  onUninstallComponent: (component: AircraftComponentSlotResource) => void;
  onCreateIntervalForComponent: (component: AircraftComponentSlotResource) => void;
  onCreateComponentInAta: (categoryCode: string) => void;
  onCancelRequest?: (component: AircraftComponentSlotResource) => void;
  isCancellingRequest?: boolean;
}

type CategoryStats = {
  total: number;
  mounted: number;
  vacant: number;
  overdue: number;
  warning: number;
};

type CategoryEntry = {
  category: HardTimeCategoryResource;
  components: AircraftComponentSlotResource[];
  stats: CategoryStats;
};

function computeStats(
  components: AircraftComponentSlotResource[],
  aircraftFH: number | null,
  aircraftFC: number | null,
): CategoryStats {
  const stats: CategoryStats = { total: components.length, mounted: 0, vacant: 0, overdue: 0, warning: 0 };
  for (const c of components) {
    if (c.active_installation) stats.mounted++;
    else stats.vacant++;
    if (aircraftFH != null && aircraftFC != null) {
      const status = computeComponentStatus(c, aircraftFH, aircraftFC);
      if (status === 'OVERDUE') stats.overdue++;
      else if (status === 'WARNING') stats.warning++;
    }
  }
  return stats;
}

export function HardTimeCategorySidebar({
  categories,
  categoryGroups,
  averages,
  aircraftFlightHours,
  aircraftFlightCycles,
  componentHref,
  initialCategoryCode,
  onCategoryChange,
  onInstallComponent,
  onUninstallComponent,
  onCreateIntervalForComponent,
  onCreateComponentInAta,
  onCancelRequest,
  isCancellingRequest,
}: HardTimeCategorySidebarProps) {
  const [searchTerm, setSearchTerm] = useState('');

  const entries = useMemo<CategoryEntry[]>(() => {
    const componentsByCode = new Map<string, AircraftComponentSlotResource[]>();
    for (const group of categoryGroups) {
      const code = group[0]?.category?.code;
      if (code) componentsByCode.set(code, group);
    }

    return categories
      .map((category) => {
        const components = componentsByCode.get(category.code) ?? [];
        return {
          category,
          components,
          stats: computeStats(components, aircraftFlightHours ?? null, aircraftFlightCycles ?? null),
        };
      })
      .sort((a, b) => {
        if (b.stats.total !== a.stats.total) return b.stats.total - a.stats.total;
        return a.category.code.localeCompare(b.category.code, undefined, { numeric: true });
      });
  }, [categories, categoryGroups, aircraftFlightHours, aircraftFlightCycles]);

  const [selectedCategoryCode, setSelectedCategoryCode] = useState<string>(
    initialCategoryCode && entries.some((entry) => entry.category.code === initialCategoryCode)
      ? initialCategoryCode
      : (entries[0]?.category.code ?? ''),
  );

  const selectCategory = (code: string) => {
    setSelectedCategoryCode(code);
    onCategoryChange?.(code);
  };

  useEffect(() => {
    if (!entries.length) return;
    setSelectedCategoryCode((current) =>
      entries.some((entry) => entry.category.code === current) ? current : entries[0].category.code,
    );
  }, [entries]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredEntries = useMemo(() => {
    if (!normalizedSearch) return entries;
    return entries.filter(
      (entry) =>
        entry.category.code.toLowerCase().includes(normalizedSearch) ||
        entry.category.name.toLowerCase().includes(normalizedSearch) ||
        (entry.category.ata_chapter ?? '').toLowerCase().includes(normalizedSearch),
    );
  }, [entries, normalizedSearch]);

  const selectedEntry = useMemo(
    () => entries.find((entry) => entry.category.code === selectedCategoryCode) ?? entries[0],
    [entries, selectedCategoryCode],
  );

  const averageDailyFH = averages?.average_daily_flight_hours ?? null;
  const averageDailyFC = averages?.average_daily_flight_cycles ?? null;
  const selectedCategory = selectedEntry?.category;
  const selectedComponents = selectedEntry?.components;
  const stats = selectedEntry?.stats ?? { total: 0, mounted: 0, vacant: 0, overdue: 0, warning: 0 };

  const sortedComponents = useMemo(() => {
    const statusRank: Record<string, number> = { OVERDUE: 0, WARNING: 1, OK: 2 };
    const fh = aircraftFlightHours ?? 0;
    const fc = aircraftFlightCycles ?? 0;
    return [...selectedComponents].sort((a, b) => {
      const aVacant = a.active_installation ? 0 : 1;
      const bVacant = b.active_installation ? 0 : 1;
      if (aVacant !== bVacant) return aVacant - bVacant;
      const aStatus = computeComponentStatus(a, fh, fc);
      const bStatus = computeComponentStatus(b, fh, fc);
      const aRank = statusRank[aStatus] ?? 2;
      const bRank = statusRank[bStatus] ?? 2;
      if (aRank !== bRank) return aRank - bRank;
      return a.position.localeCompare(b.position);
    });
  }, [selectedComponents, aircraftFlightHours, aircraftFlightCycles]);

  return (
    <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
      <aside className="flex max-h-[calc(100vh-12rem)] flex-col overflow-hidden rounded-xl border border-border/60 bg-background">
        <div className="space-y-3.5 border-b border-border/60 bg-muted/15 px-4 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Capítulos ATA</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {entries.length} en total · {selectedCategory?.code ?? '—'}
            </p>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Buscar ATA o nombre"
              className="h-9 pl-9 pr-9 text-sm"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-1.5 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2">
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-8 text-center">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-muted/20">
                <Search className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-xs font-medium text-foreground">Sin resultados</p>
              <p className="text-[11px] text-muted-foreground">
                No se encontraron ATA que coincidan con “{searchTerm}”.
              </p>
            </div>
          ) : (
            <ul className="space-y-1">
              {filteredEntries.map((entry) => {
                const isActive = entry.category.code === selectedCategoryCode;
                const isEmpty = entry.stats.total === 0;
                return (
                  <li key={entry.category.code}>
                    <button
                      type="button"
                      className={`group flex w-full items-start justify-between gap-2 rounded-lg border px-3 py-2.5 text-left transition-colors ${
                        isActive
                          ? 'border-primary/20 bg-primary text-white'
                          : 'border-transparent hover:border-border/60 hover:bg-muted/20'
                      }`}
                      onClick={() => selectCategory(entry.category.code)}
                      aria-pressed={isActive}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="leading-none font-mono text-sm font-semibold text-foreground group-aria-pressed:text-white">
                            {entry.category.code}
                          </span>
                          {entry.stats.overdue > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-600 dark:text-red-400 group-aria-pressed:bg-white rounded-full px-1">
                              <TriangleAlert className="h-2.5 w-2.5" />
                              {entry.stats.overdue}
                            </span>
                          )}
                          {entry.stats.warning > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400 group-aria-pressed:bg-white rounded-full px-1">
                              <AlertTriangle className="h-2.5 w-2.5" />
                              {entry.stats.warning}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground group-aria-pressed:text-white">
                          {entry.category.name}
                        </p>
                      </div>
                      {entry.stats.total !== 0 && (
                        <Badge
                          variant="outline"
                          className={cn(
                            'shrink-0 self-start font-mono text-[10px] group-aria-pressed:bg-white',
                            isEmpty ? 'border-dashed border-border/50 text-muted-foreground' : 'border-border/70',
                          )}
                        >
                          {entry.stats.total}
                        </Badge>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </aside>
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-border/60 bg-background">
          <div className="flex flex-col gap-3 border-b border-border/60 bg-sky-500/[0.04] px-5 py-3 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Capítulo ATA
              </p>
              <h2 className="truncate text-base font-semibold tracking-tight text-foreground">
                {selectedCategory?.name ?? '—'}
              </h2>
              <p className="font-mono text-xs text-muted-foreground">{selectedCategory?.code ?? ''}</p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Badge variant="outline" className="h-6 gap-1 border-border/60 px-2 font-mono text-[11px]">
                <Boxes className="h-3 w-3 text-muted-foreground" />
                {stats.total} slot{stats.total !== 1 && 's'}
              </Badge>
              {stats.mounted > 0 && (
                <Badge
                  variant="outline"
                  className="h-6 gap-1 border-emerald-500/30 bg-emerald-500/10 px-2 font-mono text-[11px] text-emerald-700 dark:text-emerald-400"
                >
                  <ShieldCheck className="h-3 w-3" />
                  {stats.mounted} montado{stats.mounted !== 1 && 's'}
                </Badge>
              )}
              {stats.vacant > 0 && (
                <Badge
                  variant="outline"
                  className="h-6 gap-1 border-sky-500/30 bg-sky-500/10 px-2 font-mono text-[11px] text-sky-700 dark:text-sky-300"
                >
                  <PackageOpen className="h-3 w-3" />
                  {stats.vacant} vacío{stats.vacant !== 1 && 's'}
                </Badge>
              )}
              {stats.warning > 0 && (
                <Badge
                  variant="outline"
                  className="h-6 gap-1 border-amber-500/30 bg-amber-500/10 px-2 font-mono text-[11px] text-amber-600 dark:text-amber-400"
                >
                  <AlertTriangle className="h-3 w-3" />
                  {stats.warning} próximo{stats.warning !== 1 && 's'}
                </Badge>
              )}
              {stats.overdue > 0 && (
                <Badge
                  variant="outline"
                  className="h-6 gap-1 border-red-500/30 bg-red-500/10 px-2 font-mono text-[11px] text-red-600 dark:text-red-400"
                >
                  <TriangleAlert className="h-3 w-3" />
                  {stats.overdue} vencido{stats.overdue !== 1 && 's'}
                </Badge>
              )}
            </div>
          </div>

          <div className="p-4">
            {sortedComponents.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border/60 bg-muted/10 px-6 py-10 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background">
                  <PackageOpen className="h-5 w-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground">Sin componentes en este ATA</p>
                <p className="max-w-xs text-xs text-muted-foreground">
                  Registra un componente controlado o importa la estructura INAC para poblar este capítulo.
                </p>
                {selectedCategory?.code && (
                  <button
                    type="button"
                    onClick={() => onCreateComponentInAta(selectedCategory.code)}
                    className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-[11px] font-medium text-sky-700 transition-colors hover:bg-sky-500/15 dark:text-sky-300"
                  >
                    <PlusCircle className="h-3.5 w-3.5" />
                    Crear componente en {selectedCategory.code}
                  </button>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-1 min-[1500px]:grid-cols-2 min-[1900px]:grid-cols-3">
                {sortedComponents.map((component) => (
                  <HardTimeCard
                    key={component.id}
                    component={component}
                    href={componentHref(component)}
                    averageDailyFH={averageDailyFH}
                    averageDailyFC={averageDailyFC}
                    aircraftFlightHours={aircraftFlightHours}
                    aircraftFlightCycles={aircraftFlightCycles}
                    onInstall={() => onInstallComponent(component)}
                    onUninstall={() => onUninstallComponent(component)}
                    onCreateInterval={() => onCreateIntervalForComponent(component)}
                    onCancelRequest={() => onCancelRequest?.(component)}
                    isCancellingRequest={isCancellingRequest}
                  />
                ))}
                {selectedCategory?.code && (
                  <button
                    type="button"
                    onClick={() => onCreateComponentInAta(selectedCategory.code)}
                    className="group flex min-h-[148px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border/60 bg-muted/5 p-4 text-center transition-colors hover:border-sky-500/40 hover:bg-sky-500/[0.04]"
                    aria-label={`Crear componente en ATA ${selectedCategory.code}`}
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background transition-colors group-hover:border-sky-500/40 group-hover:bg-sky-500/10">
                      <PlusCircle className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-sky-700 dark:group-hover:text-sky-300" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-foreground/90 group-hover:text-foreground">
                        Nueva posición
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        en <span className="font-mono text-foreground/80">{selectedCategory.code}</span>
                        {selectedCategory.name && (
                          <>
                            {' · '}
                            <span className="truncate">{selectedCategory.name}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
