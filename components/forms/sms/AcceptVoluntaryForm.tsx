"use client";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useAcceptVoluntaryReport } from "@/actions/sms/reporte_voluntario/actions";
import { Separator } from "@/components/ui/separator";
import { useCompanyStore } from "@/stores/CompanyStore";
import { VoluntaryReportResource } from "@/.gen/api/types.gen";
import { useGetEmployeesByCompany } from "@/hooks/sistema/empleados/useGetEmployees";
import { useGetJobTitles } from "@/hooks/sistema/cargo/useGetJobTitles";
import { Loader2 } from "lucide-react";

interface FormProps {
  onClose: () => void;
  initialData: VoluntaryReportResource;
}

export function AcceptVoluntaryReport({ onClose, initialData }: FormProps) {
  const { acceptVoluntaryReport } = useAcceptVoluntaryReport();
  const { selectedCompany, selectedStation } = useCompanyStore();
  const { data: employees, isLoading: isLoadingEmployees } = useGetEmployeesByCompany(selectedCompany?.slug);
  const { data: jobTitles, isLoading: isLoadingJobTitles } = useGetJobTitles(selectedCompany?.slug);
  const FormSchema = z.object({
    report_number: z
      .string({
        required_error: "El número de reporte es requerido.", // Mensaje si el campo está ausente
      })
      .min(1, { message: "El número de reporte no puede estar vacío." }) // Mensaje si es una cadena vacía
      .refine((val) => !isNaN(Number(val)), {
        message: "El valor debe ser un número.", // Mensaje si no es un número
      }),
    referred_to_employee_dni: z
      .string({ required_error: "Seleccione a quién se remite." })
      .min(1, { message: "Seleccione a quién se remite." }),
    referred_to_job_title_id: z
      .string({ required_error: "Seleccione el cargo." })
      .min(1, { message: "Seleccione el cargo." }),
  });

  type FormSchemaType = z.infer<typeof FormSchema>;

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      report_number: "",
      referred_to_employee_dni: "",
      referred_to_job_title_id: "",
    },
  });
  const onSubmit = async (data: FormSchemaType) => {
    const referredEmployee = employees?.find((e) => e.dni === data.referred_to_employee_dni);
    const referredJobTitle = jobTitles?.find((j) => j.id.toString() === data.referred_to_job_title_id);

    const value = {
      company: selectedCompany!.slug,
      id: initialData.id.toString(),
      data: {
        ...initialData,
        report_number: data.report_number,
        referred_to_name: referredEmployee
          ? `${referredEmployee.first_name} ${referredEmployee.last_name}`
          : "",
        referred_to_position: referredJobTitle?.name ?? "",
        image: undefined,
        document: undefined,
        status: "ABIERTO",
        location_id: selectedStation,
      },
    };
    try {
      await acceptVoluntaryReport.mutateAsync(value);
    } catch (error) {
      console.error("Error al aceptar el reporte:", error);
    }

    onClose();
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col space-y-3 "
      >
        <FormLabel className="text-lg text-center">
          Aceptacion de Reporte
        </FormLabel>

        <FormField
          control={form.control}
          name="report_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código del Reporte Voluntario</FormLabel>
              <FormControl>
                <Input placeholder="" {...field} maxLength={4} />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="referred_to_employee_dni"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Remitido a (Nombre/Apellido)</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isLoadingEmployees}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        isLoadingEmployees ? "Cargando..." : "Seleccione a quién se remite"
                      }
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {employees?.map((employee) => (
                    <SelectItem key={employee.id} value={employee.dni}>
                      {employee.first_name} {employee.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="referred_to_job_title_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Cargo de a quién se remite</FormLabel>
              <Select
                onValueChange={field.onChange}
                value={field.value}
                disabled={isLoadingJobTitles}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={isLoadingJobTitles ? "Cargando..." : "Seleccione un cargo"}
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {jobTitles?.map((jobTitle) => (
                    <SelectItem key={jobTitle.id} value={jobTitle.id.toString()}>
                      {jobTitle.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />

        <div className="flex justify-between items-center gap-x-4">
          <Separator className="flex-1" />
          <p className="text-muted-foreground">SIGEAC</p>
          <Separator className="flex-1" />
        </div>
        <Button disabled={acceptVoluntaryReport.isPending}>
          {acceptVoluntaryReport.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            "Aceptar"
          )}
        </Button>
      </form>
    </Form>
  );
}
