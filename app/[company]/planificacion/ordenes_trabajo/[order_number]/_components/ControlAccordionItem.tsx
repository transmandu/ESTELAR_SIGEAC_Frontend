import { AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { WorkOrderItemResource, WorkOrderItemTaskResource } from '@api/types';
import { Check, Layers, Settings2, Wrench } from 'lucide-react';
import { CompleteTaskDialog } from '@/components/dialogs/mantenimiento/ordenes_trabajo/CompleteTaskDialog';
import { NonRoutineTaskFormDialog } from '@/components/misc/NonRoutineTaskFormDialog';
import { useState } from 'react';
import { formatDate } from './WorkOrderHelpers';

const TASK_STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  COMPLETADO: {
    label: 'Completado',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  CERRADO: {
    label: 'Cerrado',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
  },
  PENDIENTE: {
    label: 'Pendiente',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400',
  },
  ABIERTO: {
    label: 'Abierto',
    className: 'border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-400',
  },
};

const fallbackStatus = { label: 'Sin estado', className: 'border-border bg-muted/20 text-muted-foreground' };

export function ControlAccordionItem({
  item,
  orderNumber,
  filteredTasks,
  isWorkOrderClosed,
}: {
  item: WorkOrderItemResource;
  orderNumber: string;
  filteredTasks?: WorkOrderItemTaskResource[];
  isWorkOrderClosed?: boolean;
}) {
  const control = item.maintenance_control;
  const tasks = filteredTasks ?? item.tasks ?? [];
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTask, setActiveTask] = useState<WorkOrderItemTaskResource | null>(null);
  const [nrtTaskId, setNrtTaskId] = useState<number | null>(null);

  const openCompleteDialog = (task: WorkOrderItemTaskResource) => {
    setActiveTask(task);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setActiveTask(null);
  };

  return (
    <AccordionItem value={`control-${item.id}`}>
      <AccordionTrigger className="px-5 py-3 hover:no-underline hover:bg-muted/10 [&[data-state=open]]:bg-muted/10">
        <div className="flex flex-1 items-center gap-3 text-left">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded border bg-muted/30">
            <Settings2 className="size-3 text-muted-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {control?.title ?? `Control #${item.maintenance_control_id}`}
            </p>
            {control?.manual_reference && (
              <p className="font-mono text-[11px] text-muted-foreground">{control.manual_reference}</p>
            )}
          </div>
          <Badge variant="outline" className="mr-2 shrink-0 gap-1 text-[11px] tabular-nums">
            <Layers className="size-2.5" />
            {tasks.length}
          </Badge>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-1 pt-0">
        {tasks.length === 0 ? (
          <p className="px-5 pb-3 ml-10 text-xs text-muted-foreground">Sin task cards.</p>
        ) : (
          <div className="ml-5 mr-5 overflow-hidden rounded-md border">
            {tasks.map((task, idx) => {
              const taskStatusRaw = (task.review_by ? 'COMPLETADO' : 'PENDIENTE').toUpperCase();
              const taskStatusCfg = TASK_STATUS_CONFIG[taskStatusRaw] ?? fallbackStatus;
              const hasPendingNrt = (task.non_routine_tasks ?? []).some((nrt) => nrt.status !== 'CLOSED');

              return (
                <div
                  key={task.id}
                  className={cn(
                    'group flex items-center gap-3 px-3 py-2 transition-colors hover:bg-muted/10',
                    idx !== 0 && 'border-t border-border/50',
                  )}
                >
                  <span className="w-5 shrink-0 text-center font-mono text-[11px] text-muted-foreground/50">
                    {idx + 1}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px]">{task.task?.description ?? `Task #${task.task_id}`}</p>
                    {(task.task?.old_task || task.task?.new_task) && (
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                        {task.task?.old_task && <span>Old Task Card: {task.task.old_task}</span>}
                        {task.task?.new_task && <span>New Task Card: {task.task.new_task}</span>}
                      </div>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {task.inspection_date && <span>Inspección: {formatDate(task.inspection_date)}</span>}
                      {task.review_by && <span>Revisado por: {task.review_by}</span>}
                    </div>
                  </div>

                  {task.task?.manual_reference && (
                    <span className="hidden shrink-0 font-mono text-[11px] text-muted-foreground sm:inline">
                      {task.task.manual_reference}
                    </span>
                  )}

                  <div className="flex shrink-0 items-center gap-1">
                            <TooltipProvider>
                              <Tooltip delayDuration={100}>
                                <TooltipTrigger asChild>
                                  <span tabIndex={0}>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-6 w-6 text-muted-foreground hover:text-foreground relative"
                                      disabled={isWorkOrderClosed}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setNrtTaskId(task.id);
                                      }}
                                    >
                                      <Wrench className="size-3" />
                                      {(task.non_routine_tasks?.length ?? 0) > 0 && (
                                        <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-amber-500 px-1 text-[8px] font-semibold text-white leading-none">
                                          {task.non_routine_tasks?.length}
                                        </span>
                                      )}
                                    </Button>
                                  </span>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  {isWorkOrderClosed ? 'La orden de trabajo está cerrada' : 'Tareas no rutinarias'}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                    {!task.review_by ? (
                      <TooltipProvider>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-foreground"
                              disabled={hasPendingNrt}
                              onClick={(e) => {
                                e.stopPropagation();
                                openCompleteDialog(task);
                              }}
                            >
                              <Check className="size-3" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {hasPendingNrt ? 'Complete las tareas no rutinarias primero' : 'Completar task'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : null}
                  </div>

                  <Badge
                    variant="outline"
                    className={cn(
                      'shrink-0 cursor-pointer text-[10px] transition-colors hover:opacity-80',
                      taskStatusCfg.className,
                    )}
                  >
                    {taskStatusCfg.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )}
      </AccordionContent>

      <CompleteTaskDialog
        open={dialogOpen}
        task={activeTask}
        orderNumber={orderNumber}
        onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}
      />

      <NonRoutineTaskFormDialog
        workOrderItemTaskId={nrtTaskId ?? 0}
        isOpen={nrtTaskId !== null}
        onOpenChange={(open) => { if (!open) setNrtTaskId(null); }}
        orderNumber={orderNumber}
        isWorkOrderClosed={isWorkOrderClosed}
      />
    </AccordionItem>
  );
}
