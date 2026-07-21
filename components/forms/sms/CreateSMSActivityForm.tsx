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

import {
    useCreateSMSActivity,
    useUpdateSMSActivity,
    useGetNextActivityNumber,
} from "@/actions/sms/sms_actividades/actions";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectLabel,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useGetEmployeesByDepartment } from "@/hooks/sistema/useGetEmployeesByDepartament";
import { useGetActivityCategories } from "@/hooks/sms/useGetActivityCategories";
import { useGetMitigationTable } from "@/hooks/sms/useGetMitigationTable";
import { cn } from "@/lib/utils";
import { useCompanyStore } from "@/stores/CompanyStore";
import { SmsActivityResource } from "@/.gen/api/types.gen";
import { zodResolver } from "@hookform/resolvers/zod";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarIcon, Check, ChevronDown, Loader2, Plus, X } from "lucide-react";
import axiosInstance from "@/lib/axios";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const FormSchema = z
    .object({
        activity_name: z.string(),
        activity_number: z.string(),
        start_date: z
            .date()
            .refine((val) => !isNaN(val.getTime()), { message: "Fecha inválida" }),
        end_date: z
            .date()
            .refine((val) => !isNaN(val.getTime()), { message: "Fecha inválida" }),
        start_time: z.string(),
        end_time: z.string(),
        place: z.string().max(500, "Máximo 500 caracteres"),
        topics: z.string(),
        objetive: z.string().max(500, "Máximo 500 caracteres"),
        description: z.string().max(2000, "Máximo 2000 caracteres"),
        authorized_by: z.string(),
        planned_by: z.string(),
        executed_by: z.string().optional(),
        mitigation_measure_id: z.number().nullable().optional(),
        category_ids: z.array(z.number()).optional(),
        title: z.string(),
        image: z.any().optional(),
        document: z.any().optional(),
    })
    .refine(
        (data) => {
            const start = new Date(data.start_date);
            const end = new Date(data.end_date);
            start.setHours(0, 0, 0, 0);
            end.setHours(0, 0, 0, 0);
            return end >= start;
        },
        {
            message: "La fecha final debe ser mayor o igual a la fecha de inicio",
            path: ["end_date"],
        },
    );
type FormSchemaType = z.infer<typeof FormSchema>;

interface FormProps {
    onClose: (open: boolean) => void;
    initialData?: SmsActivityResource;
    isEditing?: boolean;
    selectedDate?: string;
}

export default function CreateSMSActivityForm({
    onClose,
    isEditing,
    initialData,
    selectedDate,
}: FormProps) {
    const router = useRouter();
    const { selectedCompany, selectedStation } = useCompanyStore();
    const { data: employees, isLoading: isLoadingEmployees } =
        useGetEmployeesByDepartment("SMS", selectedStation, selectedCompany?.slug);
    const { data: mitigationTable } = useGetMitigationTable(selectedCompany?.slug);
    const { data: categories } = useGetActivityCategories(selectedCompany?.slug);

    const [authenticatedImageUrl, setAuthenticatedImageUrl] = useState<string | null>(null);
    const [authenticatedDocumentUrl, setAuthenticatedDocumentUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!initialData?.image) return;
        const url = (initialData.image as string).startsWith("http")
            ? (initialData.image as string)
            : `${process.env.NEXT_PUBLIC_STORAGE_BASE_URL}${initialData.image}`;
        let blobUrl: string | null = null;
        axiosInstance.get(url, { responseType: "blob" })
            .then((res) => { blobUrl = URL.createObjectURL(res.data); setAuthenticatedImageUrl(blobUrl); })
            .catch(() => setAuthenticatedImageUrl(null));
        return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
    }, [initialData?.image]);

    useEffect(() => {
        if (!initialData?.document) return;
        const url = (initialData.document as string).startsWith("http")
            ? (initialData.document as string)
            : `${process.env.NEXT_PUBLIC_STORAGE_BASE_URL}${initialData.document}`;
        let blobUrl: string | null = null;
        axiosInstance.get(url, { responseType: "blob" })
            .then((res) => { blobUrl = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" })); setAuthenticatedDocumentUrl(blobUrl); })
            .catch(() => setAuthenticatedDocumentUrl(null));
        return () => { if (blobUrl) URL.revokeObjectURL(blobUrl); };
    }, [initialData?.document]);

    const measureGroups = (mitigationTable ?? [])
        .filter((mt) => (mt.mitigation_plan?.measures?.length ?? 0) > 0)
        .map((mt) => {
            const reportLabel = mt.voluntary_report?.report_number
                ? `RVP-${mt.voluntary_report.report_number}`
                : mt.obligatory_report?.report_number
                    ? `RO-${mt.obligatory_report.report_number}`
                    : "Sin reporte";
            return { reportLabel, measures: mt.mitigation_plan!.measures ?? [] };
        });

    const { createSMSActivity } = useCreateSMSActivity();
    const { updateSMSActivity } = useUpdateSMSActivity();

    const [topics, setTopics] = useState<string[]>([]);
    const [newTopic, setNewTopic] = useState("");

    const { data: nextNumberData, isLoading: isLoadingNextNumber } =
        useGetNextActivityNumber(selectedCompany?.slug || null);

    const form = useForm<FormSchemaType>({
        resolver: zodResolver(FormSchema),
        // Los defaultValues aquí están bien, pero los re-aplicaremos en el useEffect
        defaultValues: {
            activity_name: initialData?.activity_name || "",
            title: initialData?.title || "",
            activity_number: initialData?.activity_number || "",
            start_date: initialData?.start_date
                ? new Date(initialData.start_date)
                : selectedDate
                    ? new Date(selectedDate)
                    : new Date(),
            end_date: initialData?.end_date
                ? new Date(initialData.end_date)
                : undefined,
            start_time: initialData?.start_time || "",
            end_time: initialData?.end_time || "",
            place: initialData?.place || "",
            topics: initialData?.topics || "",
            objetive: initialData?.objetive || "",
            description: initialData?.description || "",
            authorized_by: initialData?.authorized_by?.dni?.toString(),
            planned_by: initialData?.planned_by?.dni?.toString(),
            executed_by: initialData?.executed_by || "",
            mitigation_measure_id: (initialData as any)?.mitigation_measure_id ?? null,
            category_ids: (initialData as any)?.categories?.map((c: { id: number }) => c.id) ?? [],
        },
    });

    // ======================= INICIO DE LA SOLUCIÓN =======================
    // Este useEffect se encarga de resolver la "race condition".
    // Se ejecuta cuando los datos iniciales o la lista de empleados cambian.
    useEffect(() => {
        // Solo actuamos si estamos en modo edición y si YA tenemos los datos de los empleados.
        if (isEditing && initialData && employees) {
            // Usamos form.reset para re-poblar el formulario. Esto fuerza a los campos
            // a actualizarse con los nuevos valores, y como 'employees' ya existe,
            // el Select podrá encontrar la opción correspondiente y mostrarla.
            form.reset({
                activity_name: initialData.activity_name || "",
                title: initialData.title || "",
                activity_number: initialData.activity_number || "",
                start_date: initialData.start_date
                    ? new Date(initialData.start_date)
                    : new Date(),
                end_date: initialData.end_date
                    ? new Date(initialData.end_date)
                    : undefined,
                start_time: initialData.start_time || "",
                end_time: initialData.end_time || "",
                place: initialData.place || "",
                topics: initialData.topics || "",
                objetive: initialData.objetive || "",
                description: initialData.description || "",
                authorized_by: initialData.authorized_by?.dni?.toString(),
                planned_by: initialData.planned_by?.dni?.toString(),
                executed_by: initialData.executed_by || "",
                mitigation_measure_id: (initialData as any)?.mitigation_measure_id ?? null,
                category_ids: (initialData as any)?.categories?.map((c: { id: number }) => c.id) ?? [],
            });
        } else if (!isEditing) {
            if (nextNumberData?.next_number) {
                form.setValue("activity_number", nextNumberData.next_number);
            }
            // Aplica mitigation_measure_id una vez que mitigationTable cargó,
            // para que la opción exista en el Select al momento de mostrarla.
            if (mitigationTable && (initialData as any)?.mitigation_measure_id != null) {
                form.setValue("mitigation_measure_id", (initialData as any).mitigation_measure_id);
            }
        }
    }, [isEditing, initialData, employees, nextNumberData, mitigationTable, form.reset, form]); // Dependencias del efecto
    // ======================= FIN DE LA SOLUCIÓN =======================
    useEffect(() => {
        if (initialData?.topics) {
            const initialTopics = initialData.topics
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
            setTopics(initialTopics);
        }
    }, [initialData]);

    const addTopic = () => {
        if (newTopic.trim()) {
            const updated = [...topics, newTopic.trim()];
            setTopics(updated);
            form.setValue("topics", updated.join(","));
            setNewTopic("");
        }
    };

    const removeTopic = (index: number) => {
        const updated = topics.filter((_, i) => i !== index);
        setTopics(updated);
        form.setValue("topics", updated.join(","));
    };

    const handleTopicKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            e.preventDefault();
            addTopic();
        }
    };

    const onSubmit = async (data: FormSchemaType) => {
        if (isEditing && initialData) {
            const value = {
                company: selectedCompany!.slug,
                id: initialData.id.toString(),
                data: {
                    ...data,
                    status: initialData.status ?? "ABIERTO",
                    category_ids: data.category_ids ?? [],
                },
            };
            await updateSMSActivity.mutateAsync(value);
        } else {
            try {
                await createSMSActivity.mutateAsync({
                    company: selectedCompany!.slug,
                    data: { ...data, category_ids: data.category_ids ?? [] },
                });
                router.push(`/${selectedCompany?.slug}/sms/promocion/actividades`);
            } catch (error) {
                console.error("Error al crear la actividad", error);
            }
        }
        onClose(true);
    };

    return (
        <Form {...form}>
            <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="flex flex-col gap-4 flex-1 min-h-0 overflow-y-auto p-2"
            >
                {/* Fila 1: Número | Título | Nombre */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="activity_number"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Número de la Actividad</FormLabel>
                                <FormControl>
                                    <Input
                                        {...field}
                                        placeholder={isLoadingNextNumber ? "Cargando..." : ""}
                                        readOnly={true}
                                        tabIndex={-1}
                                        maxLength={50}
                                        className="bg-muted cursor-not-allowed font-bold text-muted-foreground"
                                    />
                                </FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Título de la Actividad</FormLabel>
                                <FormControl>
                                    <Input {...field} maxLength={100} />
                                </FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="activity_name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nombre de la Actividad</FormLabel>
                                <FormControl>
                                    <Input {...field} maxLength={50} />
                                </FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Fila 2a: Fecha Inicio | Fecha Final */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="start_date"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Fecha de Inicio</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground",
                                                )}
                                            >
                                                {field.value
                                                    ? format(field.value, "PPP", { locale: es })
                                                    : <span>Seleccionar fecha</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50 flex-shrink-0" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={false}
                                            initialFocus
                                            startMonth={new Date(1988, 0)}
                                            endMonth={new Date(new Date().getFullYear() + 5, 11)}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="end_date"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Fecha Final</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground",
                                                )}
                                            >
                                                {field.value
                                                    ? format(field.value, "PPP", { locale: es })
                                                    : <span>Seleccionar fecha</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50 flex-shrink-0" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={false}
                                            initialFocus
                                            startMonth={new Date(1988, 0)}
                                            endMonth={new Date(new Date().getFullYear() + 5, 11)}
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Fila 2b: Hora Inicio | Hora Final */}
                <div className="grid grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="start_time"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Hora de Inicio</FormLabel>
                                <FormControl>
                                    <Input
                                        type="time"
                                        {...field}
                                        onChange={(e) => {
                                            if (e.target.value.match(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
                                                field.onChange(e.target.value);
                                            }
                                        }}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="end_time"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Hora Final</FormLabel>
                                <FormControl>
                                    <Input
                                        type="time"
                                        {...field}
                                        onChange={(e) => {
                                            if (e.target.value.match(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)) {
                                                field.onChange(e.target.value);
                                            }
                                        }}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Fila 3: Lugar | Objetivo */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="place"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Lugar de Actividad</FormLabel>
                                <FormControl>
                                    <Input {...field} maxLength={500} />
                                </FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="objetive"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Objetivo de la Actividad</FormLabel>
                                <FormControl>
                                    <Input {...field} maxLength={500} />
                                </FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Medida de mitigación vinculada */}
                <FormField
                    control={form.control}
                    name="mitigation_measure_id"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Medida de Mitigación Vinculada (opcional)</FormLabel>
                            <Select
                                onValueChange={(val) =>
                                    field.onChange(val === "none" ? null : Number(val))
                                }
                                value={field.value != null ? field.value.toString() : "none"}
                            >
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Sin medida vinculada" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="none">Sin medida vinculada</SelectItem>
                                    {measureGroups.map(({ reportLabel, measures }) => (
                                        <SelectGroup key={reportLabel}>
                                            <SelectLabel className="font-mono text-xs text-amber-600">
                                                {reportLabel}
                                            </SelectLabel>
                                            {measures.map((measure) => (
                                                <SelectItem key={measure.id} value={measure.id.toString()}>
                                                    {measure.description}
                                                </SelectItem>
                                            ))}
                                        </SelectGroup>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage className="text-xs" />
                        </FormItem>
                    )}
                />

                {/* Categorías de la Actividad */}
                <FormField
                    control={form.control}
                    name="category_ids"
                    render={({ field }) => {
                        const selected: number[] = field.value ?? [];
                        const toggle = (id: number) => {
                            const next = selected.includes(id)
                                ? selected.filter((x) => x !== id)
                                : [...selected, id];
                            field.onChange(next);
                        };
                        const selectedNames = (categories ?? [])
                            .filter((c) => selected.includes(c.id))
                            .map((c) => c.name);
                        return (
                            <FormItem>
                                <FormLabel>Categorías de la Actividad</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant="outline"
                                                type="button"
                                                className="w-full justify-between font-normal"
                                                disabled={!categories}
                                            >
                                                <span className="truncate text-left">
                                                    {!categories
                                                        ? <span className="text-muted-foreground">Cargando categorías...</span>
                                                        : selectedNames.length > 0
                                                            ? selectedNames.join(", ")
                                                            : <span className="text-muted-foreground">Sin categorías seleccionadas</span>}
                                                </span>
                                                <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-72 p-2" align="start">
                                        <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
                                            {categories && categories.length === 0 && (
                                                <p className="px-2 py-3 text-xs text-muted-foreground text-center">
                                                    No hay categorías disponibles. Créelas en Ajustes → Globales SMS.
                                                </p>
                                            )}
                                            {(categories ?? []).map((cat) => {
                                                const checked = selected.includes(cat.id);
                                                return (
                                                    <button
                                                        key={cat.id}
                                                        type="button"
                                                        onClick={() => toggle(cat.id)}
                                                        className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted/60 text-left"
                                                    >
                                                        <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border ${checked ? "border-primary bg-primary text-primary-foreground" : "border-input"}`}>
                                                            {checked && <Check className="h-3 w-3" />}
                                                        </span>
                                                        {cat.name}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        );
                    }}
                />

                {/* Fila 4: Temas Abordados */}
                <FormItem>
                    <FormLabel>Temas Abordados</FormLabel>
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Escriba un tema y presione Enter"
                                value={newTopic}
                                onChange={(e) => setNewTopic(e.target.value)}
                                onKeyPress={handleTopicKeyPress}
                            />
                            <Button type="button" onClick={addTopic} size="icon">
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                        <div className="flex flex-wrap gap-2 p-2 border rounded-md min-h-10 max-h-32 overflow-y-auto">
                            {topics.map((item, index) => (
                                <div
                                    key={index}
                                    className="flex items-center gap-1 bg-muted/40 border rounded-full px-3 py-1"
                                >
                                    <span className="text-sm">{item}</span>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 rounded-full"
                                        onClick={() => removeTopic(index)}
                                    >
                                        <X className="h-3 w-3" />
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                </FormItem>
                <FormField
                    control={form.control}
                    name="topics"
                    render={({ field }) => (
                        <FormItem className="hidden">
                            <FormControl>
                                <Input type="hidden" {...field} />
                            </FormControl>
                        </FormItem>
                    )}
                />

                {/* Fila 5: Observaciones */}
                <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Observaciones</FormLabel>
                            <FormControl>
                                <Textarea {...field} maxLength={2000} rows={3} />
                            </FormControl>
                            <FormMessage className="text-xs" />
                        </FormItem>
                    )}
                />

                {/* Fila 6: Autorizado | Elaborado | Realizado */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <FormField
                        control={form.control}
                        name="authorized_by"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Autorizado por</FormLabel>
                                {isLoadingEmployees ? (
                                    <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-sm">Cargando...</span>
                                    </div>
                                ) : (
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingEmployees}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {employees?.map((employee) => (
                                                <SelectItem key={employee.dni} value={employee.dni.toString()}>
                                                    {employee.first_name} {employee.last_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="planned_by"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Elaborado por</FormLabel>
                                {isLoadingEmployees ? (
                                    <div className="flex items-center gap-2 p-2 border rounded-md bg-muted">
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        <span className="text-sm">Cargando...</span>
                                    </div>
                                ) : (
                                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingEmployees}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Seleccionar..." />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {employees?.map((employee) => (
                                                <SelectItem key={employee.id} value={employee.dni.toString()}>
                                                    {employee.first_name} {employee.last_name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="executed_by"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Realizado por</FormLabel>
                                <FormControl>
                                    <Input {...field} maxLength={100} />
                                </FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Fila 7: Imagen | Documento */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="image"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Imagen de la Actividad</FormLabel>
                                <div className="flex flex-col gap-3">
                                    {(field.value instanceof File || authenticatedImageUrl) && (
                                        <div className="w-full h-40 border rounded-lg overflow-hidden bg-muted">
                                            {/* eslint-disable-next-line @next/next/no-img-element */}
                                            <img
                                                src={field.value instanceof File ? URL.createObjectURL(field.value) : authenticatedImageUrl!}
                                                alt="Preview de imagen"
                                                className="w-full h-full object-contain"
                                            />
                                        </div>
                                    )}
                                    <FormControl>
                                        <Input
                                            type="file"
                                            accept="image/jpeg, image/png, image/jpg"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) field.onChange(file);
                                            }}
                                        />
                                    </FormControl>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="document"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Documento PDF</FormLabel>
                                <div className="flex flex-col gap-3">
                                    {field.value instanceof File ? (
                                        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">Archivo seleccionado:</p>
                                            <p className="font-semibold text-sm truncate">{field.value.name}</p>
                                        </div>
                                    ) : initialData?.document ? (
                                        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2">
                                            <p className="text-xs text-muted-foreground">Documento actual:</p>
                                            {authenticatedDocumentUrl ? (
                                                <a
                                                    href={authenticatedDocumentUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-sm font-semibold text-blue-600 dark:text-blue-400 underline hover:text-blue-800"
                                                >
                                                    Ver documento
                                                </a>
                                            ) : (
                                                <p className="text-xs text-muted-foreground">Cargando documento...</p>
                                            )}
                                        </div>
                                    ) : null}
                                    <FormControl>
                                        <Input
                                            type="file"
                                            accept="application/pdf"
                                            onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (file) field.onChange(file);
                                            }}
                                        />
                                    </FormControl>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <Button type="submit" disabled={createSMSActivity.isPending || updateSMSActivity.isPending} className="w-full">
                    {(createSMSActivity.isPending || updateSMSActivity.isPending)
                        ? <Loader2 className="size-4 animate-spin" />
                        : isEditing ? "Guardar cambios" : "Registrar actividad"}
                </Button>
            </form>
        </Form>
    );
}
