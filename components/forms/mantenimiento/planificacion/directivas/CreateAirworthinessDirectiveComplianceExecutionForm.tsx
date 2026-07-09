'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Save } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { FormDatePickerField } from '@/components/forms/FormDatePickerField';
import { FormNumericField } from '@/components/forms/FormNumericField';
import { FormTextField } from '@/components/forms/FormTextField';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useCreateAirworthinessDirectiveComplianceExecution } from '@/hooks/planificacion/directivas/queries';
import type {
  AirworthinessDirectiveApplicabilityResource,
  AirworthinessDirectiveComplianceControlResource,
} from '@api/types';

const complianceExecutionSchema = z.object({
  applicability_id: z.string().min(1, 'Debes seleccionar una aeronave'),
  work_order_number: z.string().trim().min(1, 'La orden de trabajo es obligatoria'),
  execution_date: z.string().min(1, 'La fecha de ejecución es obligatoria'),
  flight_hours_at_execution: z.number().min(0, 'Debe ser mayor o igual a 0').nullable().optional(),
  cycles_at_execution: z.number().min(0, 'Debe ser mayor o igual a 0').nullable().optional(),
  inspector_license_signature: z.string().trim().min(1, 'La firma o licencia del inspector es obligatoria'),
  remarks: z.string().trim().optional(),
});

type ComplianceExecutionFormValues = z.infer<typeof complianceExecutionSchema>;

interface CreateAirworthinessDirectiveComplianceExecutionFormProps {
  directiveId: number;
  applicabilities: AirworthinessDirectiveApplicabilityResource[];
  control: AirworthinessDirectiveComplianceControlResource;
  onSuccess: () => void;
}

export default function CreateAirworthinessDirectiveComplianceExecutionForm({
  directiveId,
  applicabilities,
  control,
  onSuccess,
}: CreateAirworthinessDirectiveComplianceExecutionFormProps) {
  const createExecution = useCreateAirworthinessDirectiveComplianceExecution(directiveId);
  const applicableAircraft = applicabilities.filter((item) => item.is_applicable);

  const form = useForm<ComplianceExecutionFormValues>({
    resolver: zodResolver(complianceExecutionSchema),
    defaultValues: {
      applicability_id: '',
      work_order_number: '',
      execution_date: '',
      flight_hours_at_execution: null,
      cycles_at_execution: null,
      inspector_license_signature: '',
      remarks: '',
    },
  });

  useEffect(() => {
    form.reset({
      applicability_id: '',
      work_order_number: '',
      execution_date: '',
      flight_hours_at_execution: null,
      cycles_at_execution: null,
      inspector_license_signature: '',
      remarks: '',
    });
  }, [control.id, form]);

  const selectedApplicabilityId = form.watch('applicability_id');
  const selectedAircraftStatus = control.aircraft_statuses?.find(
    (status) => String(status.applicability_id) === selectedApplicabilityId,
  );

  const onSubmit = async (values: ComplianceExecutionFormValues) => {
    await createExecution.mutateAsync({
      path: {
        directiveId,
        controlId: Number(control.id),
      },
      body: {
        applicability_id: Number(values.applicability_id),
        work_order_number: values.work_order_number,
        execution_date: values.execution_date,
        flight_hours_at_execution: values.flight_hours_at_execution ?? null,
        cycles_at_execution: values.cycles_at_execution ?? null,
        inspector_license_signature: values.inspector_license_signature,
        remarks: values.remarks || null,
      },
    });

    onSuccess();
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <div className="rounded-2xl border bg-muted/30 p-4">
          <p className="text-sm font-medium">{control.description || 'Control sin descripción'}</p>
          <p className="text-xs text-muted-foreground">
            {selectedAircraftStatus
              ? `Estado de esta aeronave: ${selectedAircraftStatus.status}`
              : `Estado agregado del control: ${control.compliance_status}`}
          </p>
        </div>

        <FormField
          control={form.control}
          name="applicability_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aeronave</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione aeronave" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {applicableAircraft.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {item.aircraft?.acronym ?? `#${item.aircraft_id}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 md:grid-cols-2">
          <FormTextField
            control={form.control}
            name="work_order_number"
            label="Orden de trabajo"
            inputProps={{ placeholder: 'OT-0001' }}
          />

          <FormDatePickerField
            control={form.control}
            name="execution_date"
            label="Fecha de ejecución"
            placeholder="Seleccione fecha"
            valueType="string"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <FormNumericField
            control={form.control}
            name="flight_hours_at_execution"
            label="FH al ejecutar"
            inputProps={{ thousandSeparator: '', decimalSeparator: '.', decimalScale: 2, placeholder: '0.00' }}
          />

          <FormNumericField
            control={form.control}
            name="cycles_at_execution"
            label="FC al ejecutar"
            inputProps={{ thousandSeparator: '', decimalSeparator: '.', decimalScale: 0, placeholder: '0' }}
          />
        </div>

        <FormTextField
          control={form.control}
          name="inspector_license_signature"
          label="Firma o licencia del inspector"
          inputProps={{ placeholder: 'LIC-12345' }}
        />

        <FormField
          control={form.control}
          name="remarks"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observaciones</FormLabel>
              <FormControl>
                <Textarea placeholder="Agrega observaciones si aplica" className="min-h-24" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end">
          <Button type="submit" className="gap-2" disabled={createExecution.isPending}>
            {createExecution.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Registrar cumplimiento
          </Button>
        </div>
      </form>
    </Form>
  );
}