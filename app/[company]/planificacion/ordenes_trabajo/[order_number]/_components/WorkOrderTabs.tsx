'use client';

import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  NonRoutineTaskResource,
  WorkOrderResource,
} from '@api/types';
import { sumBy } from 'es-toolkit';
import { Layers, Settings2, ShieldCheck, Wrench } from 'lucide-react';
import { useMemo, useState } from 'react';
import { NonRoutineTasksList } from './NoRoutineTasksList';
import { ComponentsTabContent } from './ComponentsTabContent';
import { ControlsTabContent } from './ControlsTabContent';
import { DirectivesTabContent } from './DirectivesTabContent';

interface WorkOrderTabsProps {
  workOrder: WorkOrderResource;
  orderNumber: string;
  onBulkComplete: () => void;
}

export function WorkOrderTabs({ workOrder, orderNumber, onBulkComplete }: WorkOrderTabsProps) {
  const [activeTab, setActiveTab] = useState('controles');

  const isWorkOrderClosed = workOrder.status === 'CERRADO';
  const items = useMemo(() => workOrder.items ?? [], [workOrder.items]);
  const componentItems = useMemo(() => workOrder.component_items ?? [], [workOrder.component_items]);
  const directiveItems = useMemo(() => workOrder.directive_items ?? [], [workOrder.directive_items]);
  const pendingTasksCount = useMemo(
    () => sumBy(items, (item) => (item.tasks ?? []).filter((task) => !task.review_by).length),
    [items],
  );
  const nonRoutineTasks: NonRoutineTaskResource[] = useMemo(
    () =>
      items
        .flatMap((item) => item.tasks ?? [])
        .flatMap((task) => task.non_routine_tasks ?? []),
    [items],
  );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="h-9">
        <TabsTrigger value="controles" className="gap-1.5 text-xs">
          <Settings2 className="size-3" />
          Controles
          <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] tabular-nums">
            {items.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="componentes" className="gap-1.5 text-xs">
          <Layers className="size-3" />
          Componentes
          <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] tabular-nums">
            {componentItems.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="directivas" className="gap-1.5 text-xs">
          <ShieldCheck className="size-3" />
          Directivas
          <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] tabular-nums">
            {directiveItems.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="norutinarias" className="gap-1.5 text-xs">
          <Wrench className="size-3" />
          No Rutinarias
          <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px] tabular-nums">
            {nonRoutineTasks.length}
          </Badge>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="controles" className="mt-4">
        <section className="overflow-hidden rounded-lg border bg-background">
          <ControlsTabContent items={items} orderNumber={orderNumber} pendingTasksCount={pendingTasksCount} onBulkComplete={onBulkComplete} isWorkOrderClosed={isWorkOrderClosed} />
        </section>
      </TabsContent>

      <TabsContent value="componentes" className="mt-4">
        <section className="overflow-hidden rounded-lg border bg-background">
          <ComponentsTabContent items={componentItems} />
        </section>
      </TabsContent>

      <TabsContent value="directivas" className="mt-4">
        <section className="overflow-hidden rounded-lg border bg-background">
          <DirectivesTabContent items={directiveItems} />
        </section>
      </TabsContent>

      <TabsContent value="norutinarias" className="mt-4">
        <section className="overflow-hidden rounded-lg border bg-background">
          <div className="p-5">
            <NonRoutineTasksList tasks={nonRoutineTasks} orderNumber={orderNumber} />
          </div>
        </section>
      </TabsContent>
    </Tabs>
  );
}
