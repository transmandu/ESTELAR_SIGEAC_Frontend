'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import {
  useCreateNonRoutineTaskMutation,
  useUpdateNonRoutineTaskMutation,
} from '@/hooks/planificacion/useNonRoutineTasks';
import { NonRoutineTaskResource, NonRoutineTasksStoreData, NonRoutineTasksUpdateData } from '@api/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

const formSchema = z.object({
  finding: z.string().min(1, 'El hallazgo es requerido'),
  work_to_perform: z.string().min(1, 'El trabajo a realizar es requerido'),
  remarks: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface NonRoutineTaskFormDialogProps {
  workOrderItemTaskId: number;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  task?: NonRoutineTaskResource | null;
  orderNumber?: string;
  isWorkOrderClosed?: boolean;
}

export function NonRoutineTaskFormDialog({
  workOrderItemTaskId,
  isOpen,
  onOpenChange,
  task = null,
  orderNumber,
  isWorkOrderClosed,
}: NonRoutineTaskFormDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const createMutation = useCreateNonRoutineTaskMutation(orderNumber);
  const updateMutation = useUpdateNonRoutineTaskMutation(workOrderItemTaskId);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      finding: task?.finding || '',
      work_to_perform: task?.work_to_perform || '',
      remarks: task?.remarks || '',
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      if (task) {
        // Edit mode
        const payload: NonRoutineTasksUpdateData['body'] = {
          finding: values.finding,
          work_to_perform: values.work_to_perform,
          remarks: values.remarks || undefined,
        };
        await updateMutation.mutateAsync({
          path: { id: task.id },
          body: payload,
        });
        toast.success('Tarea no rutinaria actualizada');
      } else {
        // Create mode
        const payload: NonRoutineTasksStoreData['body'] = {
          work_order_item_task_id: workOrderItemTaskId,
          finding: values.finding,
          work_to_perform: values.work_to_perform,
          remarks: values.remarks || undefined,
        };
        await createMutation.mutateAsync({
          body: payload,
        });
        toast.success('Tarea no rutinaria creada');
      }
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      const message = error.response?.data?.message || 'Ocurrió un error';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{task ? 'Editar Tarea No Rutinaria' : 'Nueva Tarea No Rutinaria'}</DialogTitle>
          <DialogDescription>
            {task
              ? 'Actualice el hallazgo, trabajo a realizar y observaciones.'
              : 'Cree una nueva tarea no rutinaria para esta task card.'}
          </DialogDescription>
        </DialogHeader>

        {isWorkOrderClosed && !task ? (
          <div className="rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20 px-4 py-3 text-sm text-red-700 dark:text-red-400">
            No se pueden crear tareas no rutinarias porque la orden de trabajo está cerrada.
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="finding"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hallazgo</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Describa el hallazgo..." className="resize-none" rows={3} {...field} disabled={isWorkOrderClosed} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="work_to_perform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Trabajo a Realizar</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describa el trabajo a realizar..."
                        className="resize-none"
                        rows={3}
                        {...field}
                        disabled={isWorkOrderClosed}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="remarks"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observaciones (Opcional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Agregue observaciones..." className="resize-none" rows={2} {...field} disabled={isWorkOrderClosed} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || isWorkOrderClosed}>
                  {isSubmitting ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
