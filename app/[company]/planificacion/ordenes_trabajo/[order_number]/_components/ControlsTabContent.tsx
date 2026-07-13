'use client';

import { Accordion } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WorkOrderItemResource, WorkOrderItemTaskResource } from '@api/types';
import { Check, Search, Settings2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ControlAccordionItem } from './ControlAccordionItem';

interface ControlsTabContentProps {
  items: WorkOrderItemResource[];
  orderNumber: string;
  pendingTasksCount: number;
  onBulkComplete: () => void;
  isWorkOrderClosed?: boolean;
}

export function ControlsTabContent({ items, orderNumber, pendingTasksCount, onBulkComplete, isWorkOrderClosed }: ControlsTabContentProps) {
  const [search, setSearch] = useState('');

  const filteredData = useMemo(() => {
    if (!search.trim()) {
      return items.map((item) => ({ item, filteredTasks: undefined as WorkOrderItemTaskResource[] | undefined }));
    }
    const q = search.toLowerCase();
    return items
      .map((item) => {
        const control = item.maintenance_control;
        if (control?.title?.toLowerCase().includes(q) || control?.manual_reference?.toLowerCase().includes(q)) {
          return { item, filteredTasks: undefined as WorkOrderItemTaskResource[] | undefined };
        }
        const matchingTasks = (item.tasks ?? []).filter((task) => {
          if (task.task?.description?.toLowerCase().includes(q)) return true;
          if (task.task?.old_task?.toLowerCase().includes(q)) return true;
          if (task.task?.new_task?.toLowerCase().includes(q)) return true;
          if (task.task?.manual_reference?.toLowerCase().includes(q)) return true;
          return false;
        });
        if (matchingTasks.length > 0) {
          return { item, filteredTasks: matchingTasks };
        }
        return null;
      })
      .filter(Boolean) as { item: WorkOrderItemResource; filteredTasks: WorkOrderItemTaskResource[] | undefined }[];
  }, [items, search]);

  const totalFilteredTasks = filteredData.reduce(
    (acc, { item, filteredTasks }) => acc + (filteredTasks ?? item.tasks ?? []).length,
    0,
  );

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 border-b px-5 py-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar controles o tareas..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-9 pr-4 text-sm"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-7 gap-1.5 text-[11px]"
          onClick={onBulkComplete}
          disabled={pendingTasksCount === 0}
        >
          <Check className="size-3" />
          Completar por lote
        </Button>
      </div>

      {filteredData.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1.5 py-12 text-muted-foreground">
          <Settings2 className="size-7 opacity-20" />
          <p className="text-sm">
            {search
              ? 'No se encontraron controles con ese término de búsqueda.'
              : 'No hay controles asociados a esta orden.'}
          </p>
        </div>
      ) : (
        <div className="max-h-[680px] overflow-y-auto">
          <div className="px-5 pb-2 text-xs text-muted-foreground">
            {filteredData.length} control{filteredData.length !== 1 ? 'es' : ''} · {totalFilteredTasks} task card
            {totalFilteredTasks !== 1 ? 's' : ''}
          </div>
          <Accordion type="multiple">
            {filteredData.map(({ item, filteredTasks }) => (
              <ControlAccordionItem key={item.id} item={item} orderNumber={orderNumber} filteredTasks={filteredTasks} isWorkOrderClosed={isWorkOrderClosed} />
            ))}
          </Accordion>
        </div>
      )}
    </div>
  );
}
