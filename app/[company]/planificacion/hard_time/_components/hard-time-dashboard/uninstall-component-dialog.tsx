import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useUninstallHardTimeComponent } from '@/actions/planificacion/hard_time/actions';
import { useGetConditions } from '@/hooks/administracion/useGetConditions';
import { UninstallFormState } from './types';
import { todayDate } from './utils';
import { AircraftComponentSlotResource, AircraftResource, UninstallComponentRequest } from '@api/types';

type UninstallComponentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  component: AircraftComponentSlotResource | null | undefined;
  aircraft: AircraftResource | null;
};

export function UninstallComponentDialog({ open, onOpenChange, component, aircraft }: UninstallComponentDialogProps) {
  const uninstallComponent = useUninstallHardTimeComponent(component?.id ?? 0, aircraft?.id ?? null);
  const { data: conditions, isLoading: isLoadingConditions } = useGetConditions();

  const installedArticleId = component?.installed_part?.article_id;
  const needsCondition = !installedArticleId;

  const [form, setForm] = useState<UninstallFormState>({
    removed_at: todayDate(),
    aircraft_hours_at_removal: String(aircraft?.flight_hours ?? 0),
    aircraft_cycles_at_removal: String(aircraft?.flight_cycles ?? 0),
    removal_reason: '',
    remarks: '',
    condition_id: '',
  });

  useEffect(() => {
    if (open) {
      setForm({
        removed_at: todayDate(),
        aircraft_hours_at_removal: String(aircraft?.flight_hours ?? 0),
        aircraft_cycles_at_removal: String(aircraft?.flight_cycles ?? 0),
        removal_reason: '',
        remarks: '',
        condition_id: '',
      });
    }
  }, [aircraft, open]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!component) return;

    const payload: UninstallComponentRequest = {
      aircraft_part_id: component.installed_part_id!,
      removed_at: form.removed_at,
      aircraft_hours_at_removal: Number(form.aircraft_hours_at_removal),
      aircraft_cycles_at_removal: Number(form.aircraft_cycles_at_removal),
      removal_reason: form.removal_reason.trim(),
      remarks: form.remarks.trim() || undefined,
      condition_id: form.condition_id ? Number(form.condition_id) : undefined,
    };

    await uninstallComponent.mutateAsync(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Desmontar componente</DialogTitle>
          <DialogDescription>Cierra instalación activa de posición seleccionada.</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha desmontaje</label>
              <Input
                type="date"
                value={form.removed_at}
                onChange={(event) => setForm((current) => ({ ...current, removed_at: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Razón</label>
              <Input
                value={form.removal_reason}
                onChange={(event) => setForm((current) => ({ ...current, removal_reason: event.target.value }))}
                placeholder="Hard Time, Defecto, Oportunidad"
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">FH aeronave al desmontar</label>
              <Input
                type="number"
                step="0.01"
                value={form.aircraft_hours_at_removal}
                onChange={(event) =>
                  setForm((current) => ({ ...current, aircraft_hours_at_removal: event.target.value }))
                }
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">FC aeronave al desmontar</label>
              <Input
                type="number"
                value={form.aircraft_cycles_at_removal}
                onChange={(event) =>
                  setForm((current) => ({ ...current, aircraft_cycles_at_removal: event.target.value }))
                }
                required
              />
            </div>
          </div>

          {needsCondition && (
            <div className="space-y-2 rounded-lg border bg-muted/20 p-4">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Condición del componente
              </label>
              <p className="text-xs text-muted-foreground">
                Este componente no tiene artículo asociado. Se creará uno en inventario con la condición seleccionada.
              </p>
              <Select
                value={form.condition_id}
                onValueChange={(value) => setForm((current) => ({ ...current, condition_id: value }))}
                disabled={isLoadingConditions}
              >
                <SelectTrigger>
                  <SelectValue placeholder={isLoadingConditions ? 'Cargando...' : 'Selecciona una condición'} />
                </SelectTrigger>
                <SelectContent>
                  {conditions?.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium">Observaciones</label>
            <Textarea
              value={form.remarks}
              onChange={(event) => setForm((current) => ({ ...current, remarks: event.target.value }))}
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!component || uninstallComponent.isPending || (needsCondition && !form.condition_id)}
            >
              {uninstallComponent.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              Desmontar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
