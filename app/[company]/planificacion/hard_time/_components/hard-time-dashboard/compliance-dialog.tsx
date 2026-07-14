import { useRegisterHardTimeCompliance } from '@/actions/planificacion/hard_time/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { workOrdersIndexOptions } from '@api/queries';
import { AircraftResource, HardTimeIntervalResource, StoreComplianceRequest } from '@api/types';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CalendarClock, ClipboardCheck, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ComplianceFormState } from './types';
import { todayDate } from './utils';

type ComplianceDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  componentId: number | null;
  aircraft: AircraftResource | null;
  intervals: HardTimeIntervalResource[];
  defaultIntervalId?: number | null;
};

export function ComplianceDialog({
  open,
  onOpenChange,
  componentId,
  aircraft,
  intervals,
  defaultIntervalId,
}: ComplianceDialogProps) {
  const registerCompliance = useRegisterHardTimeCompliance(componentId ?? 0, aircraft?.id ?? null);

  const [workOrderSearch, setWorkOrderSearch] = useState('');
  const [debouncedWorkOrderSearch, setDebouncedWorkOrderSearch] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedWorkOrderSearch(workOrderSearch), 300);
    return () => clearTimeout(timer);
  }, [workOrderSearch]);

  const { data: workOrdersResponse, isLoading: isWorkOrdersLoading } = useQuery({
    ...workOrdersIndexOptions({
      query: {
        per_page: 25,
        aircraft_id: aircraft?.id ?? undefined,
        search: debouncedWorkOrderSearch.trim() || undefined,
      },
    }),
    enabled: open,
  });

  const workOrders = workOrdersResponse?.data ?? [];
  const [form, setForm] = useState<ComplianceFormState>({
    hard_time_interval_id: '',
    work_order_id: '',
    compliance_date: todayDate(),
    aircraft_hours_at_compliance: String(aircraft?.flight_hours ?? 0),
    aircraft_cycles_at_compliance: String(aircraft?.flight_cycles ?? 0),
    remarks: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        hard_time_interval_id:
          (defaultIntervalId ?? intervals.find((interval) => interval.is_active)?.id)?.toString() ?? '',
        work_order_id: '',
        compliance_date: todayDate(),
        aircraft_hours_at_compliance: String(aircraft?.flight_hours ?? 0),
        aircraft_cycles_at_compliance: String(aircraft?.flight_cycles ?? 0),
        remarks: '',
      });
      setWorkOrderSearch('');
      setDebouncedWorkOrderSearch('');
    }
  }, [aircraft, intervals, defaultIntervalId, open]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!componentId) return;

    const payload: StoreComplianceRequest = {
      hard_time_interval_id: Number(form.hard_time_interval_id),
      work_order_id: Number(form.work_order_id),
      compliance_date: form.compliance_date,
      aircraft_hours_at_compliance: Number(form.aircraft_hours_at_compliance),
      aircraft_cycles_at_compliance: Number(form.aircraft_cycles_at_compliance),
      remarks: form.remarks.trim() || undefined,
    };

    await registerCompliance.mutateAsync(payload);
    onOpenChange(false);
  };

  const selectedInterval = intervals.find((interval) => interval.id === Number(form.hard_time_interval_id));
  const selectedWorkOrder = workOrders.find((workOrder) => workOrder.id === Number(form.work_order_id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Registrar cumplimiento</DialogTitle>
          <DialogDescription>
            Vincula intervalo, OT y lectura real de aeronave al momento del cumplimiento.
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
              <div className="mb-4 flex items-start gap-3">
                <div className="rounded-lg border border-border/60 bg-background p-2">
                  <ClipboardCheck className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Qué se cumplió</p>
                  <p className="text-xs text-muted-foreground">
                    Selecciona intervalo activo y orden de trabajo ejecutada.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Intervalo</label>
                  <Select
                    value={form.hard_time_interval_id}
                    onValueChange={(value) => setForm((current) => ({ ...current, hard_time_interval_id: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona intervalo" />
                    </SelectTrigger>
                    <SelectContent>
                      {intervals
                        .filter((interval) => interval.is_active)
                        .map((interval) => (
                          <SelectItem key={interval.id} value={String(interval.id)}>
                            {interval.task_description}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Orden de trabajo</label>
                  <Input
                    value={workOrderSearch}
                    onChange={(event) => setWorkOrderSearch(event.target.value)}
                    placeholder="Buscar por número de OT…"
                  />
                  <Select
                    value={form.work_order_id}
                    onValueChange={(value) => setForm((current) => ({ ...current, work_order_id: value }))}
                    disabled={isWorkOrdersLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isWorkOrdersLoading ? 'Cargando…' : 'Selecciona OT'} />
                    </SelectTrigger>
                    <SelectContent>
                      {workOrders.length === 0 && (
                        <div className="px-3 py-2 text-xs text-muted-foreground">Sin resultados para esta aeronave</div>
                      )}
                      {workOrders.map((workOrder) => (
                        <SelectItem key={workOrder.id} value={String(workOrder.id)}>
                          {workOrder.order_number}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Intervalo elegido</p>
                  <p className="text-sm font-medium text-foreground">
                    {selectedInterval?.task_description ?? 'Sin seleccionar'}
                  </p>
                </div>
                <div className="rounded-lg border border-border/60 bg-background px-3 py-2">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Orden de trabajo</p>
                  <p className="font-mono text-sm font-medium text-foreground">
                    {selectedWorkOrder?.order_number ?? 'Sin seleccionar'}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
              <div className="mb-4 flex items-start gap-3">
                <div className="rounded-lg border border-border/60 bg-background p-2">
                  <CalendarClock className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Lectura al cumplimiento</p>
                  <p className="text-xs text-muted-foreground">
                    Registra fecha y lectura real de aeronave cuando se ejecutó trabajo.
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fecha</label>
                  <Input
                    type="date"
                    value={form.compliance_date}
                    onChange={(event) => setForm((current) => ({ ...current, compliance_date: event.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">FH aeronave</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.aircraft_hours_at_compliance}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, aircraft_hours_at_compliance: event.target.value }))
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">FC aeronave</label>
                  <Input
                    type="number"
                    value={form.aircraft_cycles_at_compliance}
                    onChange={(event) =>
                      setForm((current) => ({ ...current, aircraft_cycles_at_compliance: event.target.value }))
                    }
                    required
                  />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border/60 bg-muted/15 p-4">
              <div className="mb-4 flex items-start gap-3">
                <div className="rounded-lg border border-border/60 bg-background p-2">
                  <AlertCircle className="size-4 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Observaciones</p>
                  <p className="text-xs text-muted-foreground">
                    Anota aclaratorias, hallazgos o contexto adicional del trabajo.
                  </p>
                </div>
              </div>
              <Textarea
                value={form.remarks}
                onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))}
                rows={4}
                placeholder="Opcional"
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!componentId || !form.hard_time_interval_id || !form.work_order_id || registerCompliance.isPending}
            >
              {registerCompliance.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Registrar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
