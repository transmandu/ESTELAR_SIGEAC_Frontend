'use client';

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
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  maintenanceControlExecutionsIndexQueryKey,
  planificationWorkOrderConformityUploadMutation,
  workOrderBulkCompleteItemTasksMutation,
  workOrderCloseMutation,
  workOrdersShowQueryKey,
} from '@api/queries';
import { WorkOrderItemTaskResource, WorkOrderResource } from '@api/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, FileUp, Loader2, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';

type CompleteWorkOrderDialogProps = {
  open: boolean;
  workOrder?: WorkOrderResource;
  orderNumber: string;
  onOpenChange: (open: boolean) => void;
};

type PendingTaskWithContext = WorkOrderItemTaskResource & {
  controlId: number;
  controlTitle: string;
};

type PendingTaskFormValues = {
  review_by: string;
  inspection_date: string;
};

type CompleteWorkOrderFormValues = {
  entry_date: string;
  exit_date: string;
  bulk_review_by: string;
  bulk_inspection_date: string;
};

const todayDate = () => new Date().toISOString().slice(0, 10);

const hasCompleteValues = (values?: PendingTaskFormValues) =>
  Boolean(values?.review_by?.trim() && values?.inspection_date);

export function CompleteWorkOrderDialog({ open, workOrder, orderNumber, onOpenChange }: CompleteWorkOrderDialogProps) {
  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [taskValues, setTaskValues] = useState<Record<number, PendingTaskFormValues>>({});
  const [selectedTaskIds, setSelectedTaskIds] = useState<number[]>([]);
  const [csmFile, setCsmFile] = useState<File | null>(null);
  const csmInputRef = useRef<HTMLInputElement>(null);
  const { register, reset, handleSubmit, getValues } = useForm<CompleteWorkOrderFormValues>({
    defaultValues: {
      entry_date: workOrder?.entry_date ?? todayDate(),
      exit_date: workOrder?.exit_date ?? todayDate(),
      bulk_review_by: '',
      bulk_inspection_date: todayDate(),
    },
  });

  const csmPreviewUrl = useMemo(() => {
    if (!csmFile) return null;
    return URL.createObjectURL(csmFile);
  }, [csmFile]);

  useEffect(() => {
    return () => {
      if (csmPreviewUrl) URL.revokeObjectURL(csmPreviewUrl);
    };
  }, [csmPreviewUrl]);

  const handleCsmChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no debe superar los 10 MB.');
      return;
    }

    setCsmFile(file);
  }, []);

  const removeCsmFile = useCallback(() => {
    setCsmFile(null);
    if (csmInputRef.current) csmInputRef.current.value = '';
  }, []);

  const pendingTasks = useMemo<PendingTaskWithContext[]>(() => {
    const items = workOrder?.items ?? [];
    return items.flatMap((item) => {
      const controlTitle = item.maintenance_control?.title ?? `Control #${item.maintenance_control_id}`;
      return (item.tasks ?? [])
        .filter((task) => !task.review_by)
        .map((task) => ({
          ...task,
          controlId: item.maintenance_control_id,
          controlTitle,
        }));
    });
  }, [workOrder]);

  const groupTasksByControl = (tasks: PendingTaskWithContext[]) => {
    const groups = new Map<number, { controlId: number; controlTitle: string; tasks: PendingTaskWithContext[] }>();

    tasks.forEach((task) => {
      const current = groups.get(task.controlId);
      if (!current) {
        groups.set(task.controlId, {
          controlId: task.controlId,
          controlTitle: task.controlTitle,
          tasks: [task],
        });
        return;
      }

      current.tasks.push(task);
    });

    return Array.from(groups.values());
  };

  const unfilledPendingTasks = useMemo(
    () => pendingTasks.filter((task) => !hasCompleteValues(taskValues[task.id])),
    [pendingTasks, taskValues],
  );

  const filledPendingTasks = useMemo(
    () => pendingTasks.filter((task) => hasCompleteValues(taskValues[task.id])),
    [pendingTasks, taskValues],
  );

  const groupedUnfilledTasks = useMemo(() => groupTasksByControl(unfilledPendingTasks), [unfilledPendingTasks]);
  const groupedFilledTasks = useMemo(() => groupTasksByControl(filledPendingTasks), [filledPendingTasks]);

  useEffect(() => {
    if (!open) return;

    const nextValues: Record<number, PendingTaskFormValues> = {};
    pendingTasks.forEach((task) => {
      nextValues[task.id] = {
        review_by: task.review_by ?? '',
        inspection_date: task.inspection_date ?? todayDate(),
      };
    });

    setTaskValues(nextValues);
    setSelectedTaskIds([]);
    reset({
      entry_date: workOrder?.entry_date ?? todayDate(),
      exit_date: workOrder?.exit_date ?? todayDate(),
      bulk_review_by: '',
      bulk_inspection_date: todayDate(),
    });
    setCsmFile(null);
    if (csmInputRef.current) csmInputRef.current.value = '';
    setConfirmOpen(false);
  }, [open, pendingTasks, reset, workOrder?.entry_date, workOrder?.exit_date]);

  useEffect(() => {
    const unfilledIds = new Set(unfilledPendingTasks.map((task) => task.id));
    setSelectedTaskIds((prev) => prev.filter((taskId) => unfilledIds.has(taskId)));
  }, [unfilledPendingTasks]);

  const uploadConformityMutation = useMutation({
    ...planificationWorkOrderConformityUploadMutation(),
  });

  const closeWorkOrderMutation = useMutation({
    ...workOrderCloseMutation(),
    async onSuccess(data, variables, onMutateResult, context) {
      await Promise.all([
        context.client.invalidateQueries({ queryKey: workOrdersShowQueryKey({ path: { orderNumber } }) }),
        ...(workOrder?.aircraft_id
          ? [
              context.client.invalidateQueries({
                queryKey: maintenanceControlExecutionsIndexQueryKey({
                  query: { aircraft_id: workOrder.aircraft_id },
                }),
              }),
            ]
          : []),
      ]);

      toast.success('Orden de trabajo completada correctamente.');
      setConfirmOpen(false);
      onOpenChange(false);
    },
    onError(error) {
      const message = error.response?.data.message;
      toast.error(message || 'No se pudo completar la orden de trabajo.');
    },
  });

  const bulkCompleteMutation = useMutation({
    ...workOrderBulkCompleteItemTasksMutation(),
    async onSuccess(_data, _variables, _onMutateResult, context) {
      await context.client.invalidateQueries({ queryKey: workOrdersShowQueryKey({ path: { orderNumber } }) });
      toast.success('Tareas completadas correctamente.');
    },
    onError(error) {
      const message = error.response?.data.message;
      toast.error(message || 'No se pudieron completar las tareas.');
    },
  });

  const handleConfirmComplete = handleSubmit(async (values) => {
    await closeWorkOrderMutation.mutateAsync({
      path: {
        order_number: orderNumber,
      },
      body: {
        entry_date: values.entry_date,
        exit_date: values.exit_date,
      },
    });

    if (csmFile) {
      try {
        await uploadConformityMutation.mutateAsync({
          path: { order_number: orderNumber },
          body: { conformity_file: csmFile },
        });
        await queryClient.invalidateQueries({ queryKey: workOrdersShowQueryKey({ path: { orderNumber } }) });
        toast.success('Documento de conformidad cargado correctamente.');
      } catch {
        toast.error(
          'La orden se cerró, pero no se pudo subir el documento de conformidad. Puede reintentarlo desde el detalle de la orden.',
        );
      }
    }
  });

  const isSubmitting = closeWorkOrderMutation.isPending;
  const isBulkApplying = bulkCompleteMutation.isPending;

  const toggleTaskSelection = (taskId: number, checked: boolean) => {
    setSelectedTaskIds((prev) => {
      if (checked) return prev.includes(taskId) ? prev : [...prev, taskId];
      return prev.filter((id) => id !== taskId);
    });
  };

  const toggleControlSelection = (taskIds: number[], checked: boolean) => {
    setSelectedTaskIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        taskIds.forEach((id) => next.add(id));
      } else {
        taskIds.forEach((id) => next.delete(id));
      }
      return Array.from(next);
    });
  };

  const applyBulkToSelected = async () => {
    const values = getValues();

    if (selectedTaskIds.length === 0) {
      toast.error('Seleccione al menos una task card para aplicar el llenado.');
      return;
    }

    if (!values.bulk_review_by.trim() || !values.bulk_inspection_date) {
      toast.error('Indique revisado por y fecha para aplicar en lote.');
      return;
    }

    await bulkCompleteMutation.mutateAsync({
      path: { order_number: orderNumber },
      body: {
        review_by: values.bulk_review_by,
        inspection_date: values.bulk_inspection_date,
        items: selectedTaskIds,
      },
    });

    setSelectedTaskIds([]);
  };

  const hasInvalidPendingTask = pendingTasks.some((task) => {
    const values = taskValues[task.id];
    return !values?.review_by?.trim() || !values?.inspection_date;
  });

  const handleRequestComplete = () => {
    if (pendingTasks.length > 0 && hasInvalidPendingTask) {
      toast.error('Complete reviewer y fecha en todas las task cards pendientes.');
      return;
    }

    setConfirmOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col no-scrollbar">
          <DialogHeader>
            <DialogTitle>Completar orden de trabajo</DialogTitle>
            <DialogDescription>
              {pendingTasks.length > 0
                ? 'Debe completar las task cards pendientes antes de cerrar la orden.'
                : 'Todas las task cards han sido completadas. Adjunte el documento para cerrar la orden.'}
            </DialogDescription>
          </DialogHeader>

          {pendingTasks.length === 0 && (
            <div className="min-h-0 space-y-4 overflow-y-auto">
              <div className="flex items-start gap-2 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p>No hay task cards pendientes. La orden está lista para ser completada.</p>
              </div>

              <div className="space-y-3 rounded-md border p-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Documento
                </p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Fecha de Entrada</FieldLabel>
                    <Input type="date" {...register('entry_date')} />
                  </Field>
                  <Field>
                    <FieldLabel>Fecha de Salida</FieldLabel>
                    <Input type="date" {...register('exit_date')} />
                  </Field>
                </div>

                {!csmFile ? (
                  <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-muted-foreground/30 p-6 transition-colors hover:border-muted-foreground/50 hover:bg-muted/30">
                    <FileUp className="size-8 text-muted-foreground/60" />
                    <span className="text-sm font-medium text-muted-foreground">
                      Haga clic para seleccionar el archivo PDF
                    </span>
                    <span className="text-xs text-muted-foreground/60">PDF, máximo 10 MB</span>
                    <input
                      ref={csmInputRef}
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={handleCsmChange}
                    />
                  </label>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 rounded-md border bg-muted/20 px-3 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{csmFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(csmFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </div>
                      <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={removeCsmFile}>
                        <Trash2 className="size-4" />
                      </Button>
                    </div>

                    {csmPreviewUrl && (
                      <div className="overflow-hidden rounded-md border">
                        <iframe src={csmPreviewUrl} className="h-[400px] w-full" title="Vista previa del Documento" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {pendingTasks.length > 0 && (
            <div className="space-y-4 overflow-auto min-h-0 flex flex-col">
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 text-xs text-amber-700 dark:text-amber-300">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                <p>
                  Tiene {pendingTasks.length} task card{pendingTasks.length !== 1 ? 's' : ''} pendiente
                  {pendingTasks.length !== 1 ? 's' : ''}.
                </p>
              </div>

              <div className="space-y-3 rounded-md border bg-muted/20 p-3">
                <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Llenado masivo
                </p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field>
                    <FieldLabel>Revisado por</FieldLabel>
                    <Input {...register('bulk_review_by')} placeholder="Nombre del revisor" />
                  </Field>

                  <Field>
                    <FieldLabel>Fecha</FieldLabel>
                    <Input type="date" {...register('bulk_inspection_date')} />
                  </Field>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedTaskIds(unfilledPendingTasks.map((task) => task.id))}
                    disabled={unfilledPendingTasks.length === 0}
                  >
                    Seleccionar todas
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedTaskIds([])}
                    disabled={selectedTaskIds.length === 0}
                  >
                    Limpiar selección
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={applyBulkToSelected}
                    disabled={isBulkApplying}
                  >
                    {isBulkApplying ? (
                      <>
                        <Loader2 className="mr-1.5 size-3.5 animate-spin" />
                        Aplicando...
                      </>
                    ) : (
                      `Aplicar a seleccionadas (${selectedTaskIds.length})`
                    )}
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="space-y-3 rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      No rellenadas ({unfilledPendingTasks.length})
                    </p>
                  </div>

                  <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                    {groupedUnfilledTasks.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No hay task cards pendientes sin rellenar.</p>
                    ) : (
                      groupedUnfilledTasks.map((group) => {
                        const controlTaskIds = group.tasks.map((task) => task.id);
                        const allControlSelected =
                          controlTaskIds.length > 0 &&
                          controlTaskIds.every((taskId) => selectedTaskIds.includes(taskId));

                        return (
                          <div key={`left-${group.controlId}`} className="space-y-3 rounded-md border bg-muted/20 p-3">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                                {group.controlTitle}
                              </p>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => toggleControlSelection(controlTaskIds, !allControlSelected)}
                              >
                                {allControlSelected ? 'Quitar control' : 'Seleccionar control'}
                              </Button>
                            </div>

                            {group.tasks.map((task, idx) => (
                              <div key={task.id} className="rounded-md border bg-background p-3">
                                <div className="flex items-center gap-2">
                                  <Checkbox
                                    checked={selectedTaskIds.includes(task.id)}
                                    onCheckedChange={(checked) => toggleTaskSelection(task.id, !!checked)}
                                    aria-label={`Seleccionar task ${task.id}`}
                                  />
                                  <span className="text-sm font-medium">
                                    {idx + 1}. {task.task?.description ?? `Task #${task.task_id}`}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>

                <section className="space-y-3 rounded-md border p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                      Rellenadas ({filledPendingTasks.length})
                    </p>
                  </div>

                  <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                    {groupedFilledTasks.length === 0 ? (
                      <p className="text-xs text-muted-foreground">Aun no hay task cards rellenadas.</p>
                    ) : (
                      groupedFilledTasks.map((group) => (
                        <div key={`right-${group.controlId}`} className="space-y-3 rounded-md border bg-muted/20 p-3">
                          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                            {group.controlTitle}
                          </p>

                          {group.tasks.map((task, idx) => {
                            const values = taskValues[task.id];
                            return (
                              <div key={task.id} className="space-y-1 rounded-md border bg-background p-3">
                                <p className="text-sm font-medium">
                                  {idx + 1}. {task.task?.description ?? `Task #${task.task_id}`}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Revisado por: {values?.review_by ?? '—'}
                                </p>
                                <p className="text-xs text-muted-foreground">Fecha: {values?.inspection_date ?? '—'}</p>
                              </div>
                            );
                          })}
                        </div>
                      ))
                    )}
                  </div>
                </section>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Cancelar
            </Button>
            <Button type="button" onClick={handleRequestComplete} disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Procesando
                </>
              ) : (
                'Completar orden'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar cierre de orden</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción completará la orden de trabajo y no se podrá deshacer fácilmente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmComplete} disabled={isSubmitting}>
              {isSubmitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Confirmando
                </span>
              ) : (
                'Sí, completar orden'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
