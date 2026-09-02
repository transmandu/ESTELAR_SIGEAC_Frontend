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
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { useState } from "react";

import { useCreateObligatoryReport } from "@/actions/sms/reporte_obligatorio/actions";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCompanyStore } from "@/stores/CompanyStore";
import { ObligatoryReportResource } from "@/.gen/api/types.gen";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarIcon,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  FileIcon,
  FileText,
  ImageIcon,
  ListChecks,
  Loader2,
  MapPin,
  Paperclip,
  Plane,
  Send,
  ChevronRight,
} from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { useGetSmsStations } from "@/hooks/sms/useGetSmsStations";
import { useGetFindingLocations } from "@/hooks/sms/useGetFindingLocations";
import { useGetAircrafts } from "@/hooks/aerolinea/aeronaves/useGetAircrafts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CreateSmsStationForm } from "@/components/forms/sms/CreateSmsStationForm";
import { CreateFindingLocationForm } from "@/components/forms/sms/CreateFindingLocationForm";
import { Plus } from "lucide-react";

interface FormProps {
  isEditing?: boolean;
  initialData?: ObligatoryReportResource;
  onClose: () => void;
}

/* ── Section wrapper ── */
function Section({
  num,
  icon: Icon,
  title,
  children,
}: {
  num: string;
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative rounded-lg border border-border overflow-hidden mb-2.5 border-l-[3px] border-l-amber-500">
      <div className="flex items-center gap-0 bg-muted/40 border-b border-border">
        <div className="flex items-center justify-center w-10 h-full py-2 border-r border-border/60 bg-amber-500/5">
          <span className="font-mono text-[12px] font-bold text-amber-500 tabular-nums">{num}</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 flex-1">
          <Icon className="w-3 h-3 text-amber-600/70" />
          <span className="text-[10px] font-semibold tracking-[0.2em] uppercase text-muted-foreground">{title}</span>
        </div>
      </div>
      <div className="p-4 bg-background">{children}</div>
    </div>
  );
}

/* ── DatePicker field ── */
function DateField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: Date;
  onChange: (d: Date | undefined) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground block">
        {label}
      </span>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-between text-left font-normal h-9 text-sm border-border hover:border-amber-500/50 hover:bg-amber-500/5 transition-colors group",
              !value && "text-muted-foreground",
            )}
          >
            <span className="flex items-center gap-2">
              <CalendarIcon className="h-3.5 w-3.5 text-amber-500/70 group-hover:text-amber-500 transition-colors" />
              {value ? format(value, "PPP", { locale: es }) : "Seleccione fecha"}
            </span>
            <ChevronRight className="h-3 w-3 text-muted-foreground/50 rotate-90" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            mode="single"
            selected={value}
            onSelect={onChange}
            initialFocus
            startMonth={new Date(1980, 0)}
            endMonth={new Date(new Date().getFullYear(), 11)}
            captionLayout="dropdown"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function CreateGeneralObligatoryReportForm({
  onClose,
  isEditing,
  initialData,
}: FormProps) {
  const FormSchema = z
    .object({
      sms_station_id: z.number().optional(),
      sms_finding_location_id: z.number().optional(),
      incident_location_other: z.string().optional(),
      description: z
        .string()
        .min(3, { message: "La descripción debe tener al menos 3 caracteres" }),
      report_date: z
        .date()
        .refine((val) => !isNaN(val.getTime()), { message: "Fecha inválida" }),
      incident_date: z
        .date()
        .refine((val) => !isNaN(val.getTime()), { message: "Fecha inválida" }),
      pilot_id: z.string().optional(),
      copilot_id: z.string().optional(),
      aircraft_id: z.string().optional(),
      flight_number: z.string().optional(),
      airline_company_involved: z.string().optional(),
      flight_phases: z.array(z.string()).optional(),
      incidents: z.array(z.string()).optional(),
      other_incidents: z.preprocess(
        (val) => (val === null || val === undefined ? "" : val),
        z.string().optional()
      ),
      image: z
        .instanceof(File)
        .refine((file) => file.size <= 5 * 1024 * 1024, "Max 5MB")
        .refine(
          (file) => ["image/jpeg", "image/png"].includes(file.type),
          "Solo JPEG/PNG"
        )
        .optional(),
      document: z
        .instanceof(File)
        .refine((file) => file.size <= 5 * 1024 * 1024, "Máximo 5MB")
        .refine(
          (file) => file.type === "application/pdf",
          "Solo se permiten archivos PDF"
        )
        .optional(),
    })
    .refine(
      (data) => {
        const hasIncidents = data.incidents && data.incidents.length > 0;
        const hasOtherIncidents = data.other_incidents?.trim() !== "";
        return hasIncidents || hasOtherIncidents;
      },
      {
        message: "Debe proporcionar al menos un incidente o descripción",
        path: ["incidents"],
      }
    );

  type FormSchemaType = z.infer<typeof FormSchema>;

  const { createObligatoryReport } = useCreateObligatoryReport();
  const router = useRouter();
  const { company } = useParams<{ company: string }>();
  const { selectedCompany } = useCompanyStore();
  const { user } = useAuth();
  const shouldEnableField = user?.roles?.map((r) => r.name).some((role) =>
    ["SUPERUSER", "ANALISTA_SMS", "JEFE_SMS"].includes(role)
  ) ?? false;

  const companySlug = selectedCompany?.slug ?? company;
  const { data: stations, isLoading: isLoadingStations } = useGetSmsStations(companySlug);
  const { data: findingLocations, isLoading: isLoadingLocations } = useGetFindingLocations(companySlug);
  const { data: aircrafts, isLoading: isLoadingAircrafts } = useGetAircrafts(companySlug);
  const [openCreateStation, setOpenCreateStation] = useState(false);
  const [openCreateLocation, setOpenCreateLocation] = useState(false);

  const [showOtherInput, setShowOtherInput] = useState(
    initialData?.other_incidents ? true : false
  );

  const [open, setOpen] = useState(false);

  const [selectedValues, setSelectedValues] = useState<string[]>(() => {
    if (Array.isArray(initialData?.incidents)) {
      return (initialData.incidents as string[]).filter((v) => typeof v === "string");
    }
    return [];
  });

  const OPTIONS_LIST = [
    "La aereonave aterriza quedándose solo con el combustible de reserva o menos",
    "Incursion en pista o calle de rodaje ( RUNAWAY INCURSION-RI)",
    "Aproximacion no estabilizada por debajo de los 500 pies VRF o 1000 PIES IRF",
    "Despresurizacion",
    "Salida de pista - RUNAWAY INCURSION",
    "Derrame de combustible",
    "Error  de navegacion con desviacion significativa de la ruta",
    "Casi colision (RESOLUCION ACVSORY-RA)",
    "Despegue abortado(REJETED TAKE OFF-RTO)",
    "Falla de motor",
    "Tail Strike",
    "Impacto con aves",
    "Aterrizaje fuerte (HARD LANDING)",
    "Alerta de fuego o humo",
    "Wind Shear",
    "El avion es evacuado",
    "Fallo en los controles de vuelo",
    "Parametros de vuelo anormales",
  ];

  // Values must match ObligatoryReportDocumentService::PHASES on the backend.
  const FLIGHT_PHASE_OPTIONS: { value: string; label: string }[] = [
    { value: "RODAJE", label: "Rodaje" },
    { value: "DESPEGUE", label: "Despegue" },
    { value: "APROXIMACION", label: "Aproximación" },
    { value: "RODAJE_PISTA", label: "Rodaje en Pista" },
    { value: "CRUCERO", label: "Crucero" },
    { value: "REMOLQUE", label: "Remolque" },
    { value: "PARQUEO", label: "Parqueo" },
    { value: "DESCENSO", label: "Descenso" },
    { value: "ATERRIZAJE", label: "Aterrizaje" },
    { value: "MARCHA_ATRAS", label: "Marcha Atrás" },
    { value: "ASCENSO", label: "Ascenso" },
  ];

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      sms_station_id: (initialData as any)?.sms_station_id || undefined,
      sms_finding_location_id: (initialData as any)?.sms_finding_location_id || undefined,
      incident_location_other: initialData?.incident_location_other ?? "",
      description: initialData?.description ?? "",
      aircraft_id: initialData?.aircraft_id?.toString() ?? "",
      pilot_id: initialData?.pilot_id?.toString() ?? "",
      copilot_id: initialData?.copilot_id?.toString() ?? "",
      flight_number: (initialData as any)?.flight_number ?? "",
      airline_company_involved: (initialData as any)?.airline_company_involved ?? "",
      flight_phases: Array.isArray((initialData as any)?.flight_phases)
        ? ((initialData as any).flight_phases as string[])
        : [],
      incidents: Array.isArray(initialData?.incidents)
        ? (initialData.incidents as string[]).filter((v) => typeof v === "string")
        : [],
      other_incidents: initialData?.other_incidents ?? "",
      report_date: initialData?.report_date
        ? new Date(initialData.report_date)
        : new Date(),
      incident_date: initialData?.incident_date
        ? new Date(initialData.incident_date)
        : new Date(),
    },
  });

  const isAeronaveLocation =
    findingLocations?.find((l) => l.id === form.watch("sms_finding_location_id"))?.name?.toUpperCase() === "AERONAVE";

  const onSubmit = async (data: FormSchemaType) => {
    try {
      await createObligatoryReport.mutateAsync({
        company: selectedCompany?.slug ?? company,
        data: {
          sms_station_id: data.sms_station_id ?? null,
          sms_finding_location_id: data.sms_finding_location_id ?? null,
          incident_location_other: data.incident_location_other ?? null,
          description: data.description,
          incident_date: data.incident_date.toISOString().split("T")[0],
          report_date: data.report_date.toISOString().split("T")[0],
          pilot_id: data.pilot_id ?? null,
          copilot_id: data.copilot_id ?? null,
          aircraft_id: data.aircraft_id ?? null,
          flight_number: data.flight_number ?? null,
          airline_company_involved: data.airline_company_involved ?? null,
          flight_phases: data.flight_phases ?? null,
          incidents: data.incidents ?? null,
          other_incidents: data.other_incidents ?? null,
          image: data.image ?? null,
          document: data.document ?? null,
          status: "PROCESO" as const,
        },
      });
      router.push(`/${selectedCompany?.slug ?? company}/dashboard`);
    } catch (error) {
      console.error("Error al crear reporte:", error);
    }
    onClose();
  };

  const handleOtherCheckboxChange = (checked: boolean) => {
    setShowOtherInput(checked);
    if (!checked) {
      form.setValue("other_incidents", "");
    }
  };

  const handleOtherInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    form.setValue("other_incidents", event.target.value);
  };

  return (
    <>
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className="flex flex-col w-full max-w-4xl mx-auto"
      >

        {/* ── Header strip ── */}
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 mb-3 overflow-hidden">
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-amber-700 dark:text-amber-400">
              Reporte Obligatorio de Suceso
            </span>
            <Separator orientation="vertical" className="h-3.5 bg-amber-500/20" />
            <span className="text-[10px] tracking-wide text-amber-700/60 dark:text-amber-400/60 font-medium">
              Formulario Público · SIGEAC
            </span>
          </div>
        </div>

        {/* ── 01 Identificación ── */}
        <Section num="01" icon={MapPin} title="Identificación y Ubicación">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="sms_station_id"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                      Base de Localización
                    </FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => setOpenCreateStation(true)}
                      disabled={!shouldEnableField}
                    >
                      <Plus className="h-3 w-3" />
                      Nueva
                    </Button>
                  </div>
                  <Select
                    onValueChange={(val) => field.onChange(Number(val))}
                    value={field.value?.toString()}
                    disabled={isLoadingStations}
                  >
                    <FormControl>
                      <SelectTrigger className="h-9 text-sm border-border focus:ring-amber-500/30">
                        <SelectValue placeholder={isLoadingStations ? "Cargando..." : "Seleccionar base"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {stations?.map((s) => (
                        <SelectItem key={s.id} value={s.id.toString()}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="sms_finding_location_id"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                      Lugar del Incidente
                    </FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 gap-1 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      onClick={() => setOpenCreateLocation(true)}
                      disabled={!shouldEnableField}
                    >
                      <Plus className="h-3 w-3" />
                      Nuevo
                    </Button>
                  </div>
                  <Select
                    onValueChange={(val) => field.onChange(Number(val))}
                    value={field.value?.toString()}
                    disabled={isLoadingLocations}
                  >
                    <FormControl>
                      <SelectTrigger className="h-9 text-sm border-border focus:ring-amber-500/30">
                        <SelectValue placeholder={isLoadingLocations ? "Cargando..." : "Seleccionar"} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {findingLocations?.map((loc) => (
                        <SelectItem key={loc.id} value={loc.id.toString()}>{loc.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {findingLocations?.find(l => l.id === form.watch("sms_finding_location_id"))?.name?.toUpperCase() === "OTRO" && (
              <FormField
                control={form.control}
                name="incident_location_other"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                      Especificación del Lugar
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Especificar si aplica"
                        className="h-9 text-sm border-border focus-visible:ring-amber-500/30 focus-visible:border-amber-500/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            )}
          </div>
        </Section>

        {/* ── 02 Identificacion del Vuelo (solo si el lugar del hallazgo es Aeronave) ── */}
        {isAeronaveLocation && (
          <Section num="02" icon={Plane} title="Identificación del Vuelo">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <FormField
                control={form.control}
                name="aircraft_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                      Aeronave
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value ?? ""}
                      disabled={isLoadingAircrafts}
                    >
                      <FormControl>
                        <SelectTrigger className="h-9 text-sm border-border focus:ring-amber-500/30">
                          <SelectValue placeholder={isLoadingAircrafts ? "Cargando..." : "Seleccionar"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {aircrafts?.map((ac) => (
                          <SelectItem key={ac.id} value={ac.id.toString()}>{ac.acronym}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="flight_number"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                      N° de Vuelo
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Ej.: 123"
                        className="h-9 text-sm border-border focus-visible:ring-amber-500/30 focus-visible:border-amber-500/50"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="airline_company_involved"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                      Empresa Involucrada
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nombre de la empresa"
                        className="h-9 text-sm border-border focus-visible:ring-amber-500/30 focus-visible:border-amber-500/50"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="flight_phases"
              render={() => (
                <FormItem className="mt-3">
                  <FormLabel className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                    Fases del Vuelo (si aplica)
                  </FormLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {FLIGHT_PHASE_OPTIONS.map((phase) => (
                      <FormField
                        key={phase.value}
                        control={form.control}
                        name="flight_phases"
                        render={({ field }) => {
                          const current = field.value ?? [];
                          const checked = current.includes(phase.value);
                          return (
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(isChecked) => {
                                    field.onChange(
                                      isChecked
                                        ? [...current, phase.value]
                                        : current.filter((v) => v !== phase.value)
                                    );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="text-sm font-normal">{phase.label}</FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </Section>
        )}

        {/* ── 03 Fechas ── */}
        <Section num="03" icon={CalendarIcon} title="Fechas del Evento">
          <div className="grid grid-cols-2 gap-3">
            <FormField
              control={form.control}
              name="incident_date"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-0">
                  <DateField label="Fecha del Incidente" value={field.value} onChange={field.onChange} />
                  <FormMessage className="text-xs mt-1" />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="report_date"
              render={({ field }) => (
                <FormItem className="flex flex-col gap-0">
                  <DateField label="Fecha del Reporte" value={field.value} onChange={field.onChange} />
                  <FormMessage className="text-xs mt-1" />
                </FormItem>
              )}
            />
          </div>
        </Section>

        {/* ── 03 Descripción ── */}
        <Section num="04" icon={FileText} title="Descripción del Suceso">
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                  Descripción
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describa el suceso ocurrido con el mayor detalle posible..."
                    className="min-h-[90px] text-sm resize-none border-border focus-visible:ring-amber-500/30 focus-visible:border-amber-500/50"
                    {...field}
                  />
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />
        </Section>

        {/* ── 04 Incidentes ── */}
        <Section num="05" icon={AlertTriangle} title="Tipo de Incidente">
          <div className="flex flex-col gap-3">

            {/* Multi-select combobox */}
            {!showOtherInput && (
              <FormField
                control={form.control}
                name="incidents"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                      Incidentes Reportados
                    </FormLabel>
                    <FormControl>
                      <Popover open={open} onOpenChange={setOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={open}
                            className="w-full justify-between h-9 text-sm border-border hover:border-amber-500/50 hover:bg-amber-500/5 transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <ListChecks className="h-3.5 w-3.5 text-amber-500/70" />
                              {selectedValues && selectedValues.length > 0 ? (
                                <span className="flex items-center gap-1.5">
                                  <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-[10px] font-bold text-amber-950">
                                    {selectedValues.length}
                                  </span>
                                  <span className="text-foreground">seleccionados</span>
                                </span>
                              ) : (
                                <span className="text-muted-foreground">Seleccionar incidentes...</span>
                              )}
                            </span>
                            <ChevronsUpDown className="h-3.5 w-3.5 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-full max-w-md p-0">
                          <Command>
                            <CommandInput placeholder="Buscar incidente..." className="text-sm" />
                            <CommandList>
                              <CommandEmpty>No se encontraron opciones.</CommandEmpty>
                              <CommandGroup>
                                {OPTIONS_LIST.map((option) => (
                                  <CommandItem
                                    key={option}
                                    value={option}
                                    onSelect={(currentValue) => {
                                      const isSelected = selectedValues.includes(currentValue);
                                      const newValues = isSelected
                                        ? selectedValues.filter((v) => v !== currentValue)
                                        : [...selectedValues, currentValue];
                                      setSelectedValues(newValues);
                                      field.onChange(newValues.length > 0 ? newValues : []);
                                    }}
                                    className="text-sm"
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-3.5 w-3.5 text-amber-500 flex-shrink-0",
                                        selectedValues.includes(option) ? "opacity-100" : "opacity-0"
                                      )}
                                    />
                                    {option}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                    </FormControl>
                    {selectedValues.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {selectedValues.map((v) => (
                          <span
                            key={v}
                            className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 leading-relaxed"
                          >
                            {v}
                          </span>
                        ))}
                      </div>
                    )}
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />
            )}

            {/* Other incidents checkbox + input */}
            <FormField
              control={form.control}
              name="other_incidents"
              render={() => (
                <FormItem>
                  <div className="flex items-center gap-2.5 rounded-md border border-border bg-muted/20 px-3 py-2.5">
                    <FormControl>
                      <Checkbox
                        checked={showOtherInput}
                        onCheckedChange={handleOtherCheckboxChange}
                        className="border-amber-500/50 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
                      />
                    </FormControl>
                    <FormLabel className="text-[11px] font-medium text-foreground cursor-pointer m-0">
                      Registrar otro tipo de incidente no listado
                    </FormLabel>
                  </div>
                  {showOtherInput && (
                    <div className="mt-2">
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Describa el incidente..."
                          className="h-9 text-sm border-border focus-visible:ring-amber-500/30 focus-visible:border-amber-500/50"
                          {...form.register("other_incidents")}
                          onChange={handleOtherInputChange}
                        />
                      </FormControl>
                    </div>
                  )}
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
        </Section>

        {/* ── 05 Archivos Adjuntos ── */}
        <Section num="06" icon={Paperclip} title="Archivos Adjuntos">
          <div className="grid grid-cols-2 gap-3">

            {/* Image upload */}
            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                    Imagen <span className="text-muted-foreground/50 normal-case tracking-normal">JPEG / PNG · 5MB</span>
                  </FormLabel>
                  <div className={cn(
                    "relative rounded-md border border-dashed transition-colors",
                    field.value instanceof File || initialData?.image
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-border hover:border-amber-500/30 hover:bg-muted/30"
                  )}>
                    {(field.value instanceof File || initialData?.image) ? (
                      <div className="flex items-center gap-2.5 p-2.5">
                        <div className="w-10 h-10 rounded border border-border overflow-hidden flex-shrink-0 bg-muted">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={
                              field.value instanceof File
                                ? URL.createObjectURL(field.value)
                                : initialData!.image!.startsWith("http")
                                  ? initialData!.image!
                                  : `${process.env.NEXT_PUBLIC_STORAGE_BASE_URL}${initialData!.image!}`
                            }
                            alt="Preview"
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <CheckCircle2 className="w-3 h-3 text-amber-500" />
                            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                              {field.value instanceof File ? "Imagen seleccionada" : "Imagen actual"}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {field.value instanceof File ? field.value.name : "Imagen adjunta"}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-4 gap-1.5">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                          <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <span className="text-[10px] text-muted-foreground">Seleccionar imagen</span>
                      </div>
                    )}
                    <FormControl>
                      <Input
                        type="file"
                        accept="image/jpeg, image/png"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => field.onChange(e.target.files?.[0])}
                      />
                    </FormControl>
                  </div>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />

            {/* Document upload */}
            <FormField
              control={form.control}
              name="document"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[10px] font-semibold tracking-[0.18em] uppercase text-muted-foreground">
                    Documento <span className="text-muted-foreground/50 normal-case tracking-normal">PDF · 5MB</span>
                  </FormLabel>
                  <div className={cn(
                    "relative rounded-md border border-dashed transition-colors",
                    field.value instanceof File || initialData?.document
                      ? "border-amber-500/40 bg-amber-500/5"
                      : "border-border hover:border-amber-500/30 hover:bg-muted/30"
                  )}>
                    {field.value instanceof File ? (
                      <div className="flex items-center gap-2.5 p-2.5">
                        <div className="w-10 h-10 rounded border border-border flex-shrink-0 bg-red-500/10 flex items-center justify-center">
                          <FileIcon className="w-4 h-4 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <CheckCircle2 className="w-3 h-3 text-amber-500" />
                            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                              PDF seleccionado
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{field.value.name}</p>
                        </div>
                      </div>
                    ) : initialData?.document ? (
                      <div className="flex items-center gap-2.5 p-2.5">
                        <div className="w-10 h-10 rounded border border-border flex-shrink-0 bg-red-500/10 flex items-center justify-center">
                          <FileIcon className="w-4 h-4 text-red-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1 mb-0.5">
                            <CheckCircle2 className="w-3 h-3 text-amber-500" />
                            <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                              Documento actual
                            </span>
                          </div>
                          <a
                            href={initialData.document}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-amber-600 hover:underline"
                            onClick={(e) => e.stopPropagation()}
                          >
                            Ver documento
                          </a>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-4 gap-1.5">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                          <FileIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        </div>
                        <span className="text-[10px] text-muted-foreground">Seleccionar PDF</span>
                      </div>
                    )}
                    <FormControl>
                      <Input
                        type="file"
                        accept="application/pdf"
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        onChange={(e) => field.onChange(e.target.files?.[0])}
                      />
                    </FormControl>
                  </div>
                  <FormMessage className="text-xs" />
                </FormItem>
              )}
            />
          </div>
        </Section>

        {/* ── Actions ── */}
        <div className="mt-1 rounded-lg border border-border overflow-hidden">
          <div className="grid grid-cols-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => router.push("/acceso_publico/estelar/sms")}
              className="h-11 rounded-none border-r border-border text-muted-foreground hover:text-foreground hover:bg-muted/60 font-medium tracking-wide text-[12px] uppercase"
            >
              <ArrowLeft className="h-3.5 w-3.5 mr-2" />
              Volver
            </Button>
            <Button
              type="submit"
              disabled={createObligatoryReport.isPending}
              className="h-11 rounded-none bg-amber-500 hover:bg-amber-400 text-amber-950 font-semibold tracking-[0.12em] uppercase text-[12px] border-0 transition-colors"
            >
              {createObligatoryReport.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="h-3.5 w-3.5" />
                  Enviar Reporte
                </span>
              )}
            </Button>
          </div>
        </div>

      </form>
    </Form>

    <Dialog open={openCreateStation} onOpenChange={setOpenCreateStation}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nueva Estación</DialogTitle>
          <DialogDescription>La estación quedará disponible en el selector.</DialogDescription>
        </DialogHeader>
        <CreateSmsStationForm onClose={() => setOpenCreateStation(false)} />
      </DialogContent>
    </Dialog>

    <Dialog open={openCreateLocation} onOpenChange={setOpenCreateLocation}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Nuevo Lugar del Incidente</DialogTitle>
          <DialogDescription>El lugar quedará disponible en el selector.</DialogDescription>
        </DialogHeader>
        <CreateFindingLocationForm onClose={() => setOpenCreateLocation(false)} />
      </DialogContent>
    </Dialog>
    </>
  );
}
