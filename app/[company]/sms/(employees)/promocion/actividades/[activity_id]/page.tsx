"use client";
import BarChartCourseComponent from "@/components/charts/BarChartCourseComponent";
import { PieChartComponent } from "@/components/charts/PieChartComponent";
import { ContentLayout } from "@/components/layout/ContentLayout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useGetSMSActivityAttendanceStats } from "@/hooks/sms/useGetSMSActivityAttendanceStats";
import { useGetSMSActivityById } from "@/hooks/sms/useGetSMSActivityById";
import { useGetMitigationTable } from "@/hooks/sms/useGetMitigationTable";
import { useCompanyStore } from "@/stores/CompanyStore";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import {
  AlertCircle,
  AreaChartIcon,
  BarChart3,
  Calendar,
  CheckCheck,
  ChevronRight,
  Clock,
  FileText,
  Info,
  Link2,
  Loader2,
  MapPin,
  Shield,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import { useParams } from "next/navigation";
import { useState, useEffect } from "react";
import axiosInstance from "@/lib/axios";

interface AttendanceData {
  id: string;
  attended: boolean;
  employee_dni: string;
  sms_activity_id: string;
  employee: { id: string; first_name: string; last_name: string; dni: string };
}

const formatTime = (time: string | null | undefined): string => {
  if (!time) return "—";
  const [hourStr, minuteStr] = time.split(":");
  const hour = parseInt(hourStr, 10);
  const minute = minuteStr?.slice(0, 2) ?? "00";
  const period = hour >= 12 ? "PM" : "AM";
  const hour12 = hour % 12 || 12;
  return `${hour12}:${minute} ${period}`;
};

const STATUS_CONFIG = {
  ABIERTO: {
    label: "Abierto",
    dot: "bg-emerald-500",
    cls: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
  },
  PROCESO: {
    label: "En Proceso",
    dot: "bg-amber-500 animate-pulse",
    cls: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400",
  },
  CERRADO: {
    label: "Cerrado",
    dot: "bg-slate-400",
    cls: "border-slate-400/30 bg-slate-400/10 text-slate-600 dark:text-slate-400",
  },
} as const;

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
    {children}
  </p>
);

const DataCell = ({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
  accent?: boolean;
}) => (
  <div className="flex flex-col gap-0.5">
    <SectionLabel>{label}</SectionLabel>
    <span
      className={`text-sm font-medium ${mono ? "font-mono" : ""} ${
        accent ? "text-amber-600 dark:text-amber-400" : "text-foreground"
      }`}
    >
      {value || "—"}
    </span>
  </div>
);

const TAB_TRIGGER_CLASS =
  "whitespace-nowrap rounded-none border-b-2 border-b-transparent px-4 py-3 text-sm font-medium text-muted-foreground transition-colors " +
  "hover:bg-amber-500/5 hover:text-amber-700 dark:hover:text-amber-400 " +
  "data-[state=active]:border-b-amber-500 data-[state=active]:bg-transparent data-[state=active]:text-amber-700 data-[state=active]:shadow-none " +
  "dark:data-[state=active]:border-b-amber-400 dark:data-[state=active]:text-amber-400";

const ShowSMSActivity = () => {
  const { selectedCompany } = useCompanyStore();
  const { activity_id } = useParams<{ activity_id: string }>();

  const {
    data: activity,
    isLoading: isActivityLoading,
    isError: activityError,
  } = useGetSMSActivityById({ company: selectedCompany?.slug, id: activity_id });

  const {
    data: AttendanceStats,
    isLoading: isAttendanceStatsLoading,
    isError: isAttendanceStatsError,
  } = useGetSMSActivityAttendanceStats(activity_id);

  const attendedList = (activity as any)?.attendance as AttendanceData[] | undefined;

  const { data: mitigationTable } = useGetMitigationTable(selectedCompany?.slug);

  const mitigationInfo = activity?.mitigation_measure_id
    ? (() => {
        const entry = (mitigationTable ?? []).find((mt) =>
          mt.mitigation_plan?.measures?.some((m) => m.id === activity.mitigation_measure_id),
        );
        if (!entry) return null;
        const measure = entry.mitigation_plan!.measures.find(
          (m) => m.id === activity.mitigation_measure_id,
        )!;
        const reportLabel = entry.voluntary_report?.report_number
          ? `RVP-${entry.voluntary_report.report_number}`
          : entry.obligatory_report?.report_number
            ? `RO-${entry.obligatory_report.report_number}`
            : null;
        return { plan: entry.mitigation_plan!, measure, reportLabel };
      })()
    : null;

  const [isDownloading, setIsDownloading] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    if (!activity?.image) return;
    let objectUrl: string;
    let cancelled = false;
    axiosInstance
      .get(activity.image, { responseType: "blob" })
      .then((response) => {
        if (cancelled) return;
        const blob = new Blob([response.data], {
          type: String(response.headers["content-type"] ?? "image/jpeg"),
        });
        objectUrl = URL.createObjectURL(blob);
        setImageSrc(objectUrl);
      })
      .catch((err) => console.error("Error cargando imagen:", err));
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [activity?.image]);

  const downloadDocument = async (url: string, filename: string) => {
    setIsDownloading(true);
    try {
      const response = await axiosInstance.get(url, { responseType: "blob" });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (err) {
      console.error("Error descargando documento:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const PieChartData = AttendanceStats
    ? [
        { name: "Asistentes", value: AttendanceStats.attended },
        { name: "Inasistentes", value: AttendanceStats.not_attended },
      ]
    : [];

  const statusConfig = activity?.status
    ? (STATUS_CONFIG[activity.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.CERRADO)
    : null;

  return (
    <ContentLayout title="Actividad SMS">
      <div className="space-y-4">
        {isActivityLoading && (
          <div className="flex h-56 items-center justify-center rounded-lg border bg-background">
            <Loader2 className="size-9 animate-spin text-amber-500" />
          </div>
        )}

        {activityError && (
          <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              Error al cargar la actividad.
            </p>
          </div>
        )}

        {activity && (
          <>
            {/* ── Header ── */}
            <div className="overflow-hidden rounded-lg border bg-background">
              <div className="border-b bg-muted/30 px-6 py-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                        Actividad SMS
                      </span>
                      <span className="rounded border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-widest text-amber-600 dark:text-amber-400">
                        ACT-{String(activity.activity_number).padStart(3, "0")}
                      </span>
                    </div>
                    <h1 className="text-xl font-bold leading-tight text-foreground">
                      {activity.activity_name || "Actividad sin nombre"}
                    </h1>
                    {activity.title && (
                      <p className="text-sm text-muted-foreground">{activity.title}</p>
                    )}
                    {(activity as any)?.categories?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-0.5">
                        {(activity as any).categories.map((cat: { id: number; name: string }) => (
                          <span
                            key={cat.id}
                            className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400"
                          >
                            {cat.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {statusConfig && (
                    <div
                      className={`inline-flex items-center gap-2 self-start rounded-full border px-3 py-1.5 text-xs font-semibold ${statusConfig.cls}`}
                    >
                      <span className={`h-2 w-2 rounded-full ${statusConfig.dot}`} />
                      {statusConfig.label}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick-stats strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4">
                <div className="flex items-center gap-2.5 px-5 py-3.5">
                  <Calendar className="h-4 w-4 flex-shrink-0 text-amber-500" />
                  <div>
                    <SectionLabel>Fecha</SectionLabel>
                    <p className="text-xs font-medium text-foreground">
                      {format(addDays(activity.start_date, 1), "d MMM yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 border-l border-border px-5 py-3.5">
                  <Clock className="h-4 w-4 flex-shrink-0 text-amber-500" />
                  <div>
                    <SectionLabel>Horario</SectionLabel>
                    <p className="font-mono text-xs font-medium text-foreground">
                      {formatTime(activity.start_time)} – {formatTime(activity.end_time)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 border-t border-border px-5 py-3.5 sm:border-l sm:border-t-0">
                  <MapPin className="h-4 w-4 flex-shrink-0 text-amber-500" />
                  <div>
                    <SectionLabel>Lugar</SectionLabel>
                    <p className="text-xs font-medium text-foreground">{activity.place || "—"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2.5 border-l border-t border-border px-5 py-3.5 sm:border-t-0">
                  <Users className="h-4 w-4 flex-shrink-0 text-amber-500" />
                  <div>
                    <SectionLabel>Participantes</SectionLabel>
                    <p className="font-mono text-xs font-medium text-foreground">
                      {attendedList?.length ?? "—"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Tabs ── */}
            <Tabs defaultValue="informacion" className="w-full">
              <div className="overflow-hidden rounded-lg border bg-background">
                <TabsList className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none border-b bg-transparent p-0">
                  <TabsTrigger value="informacion" className={TAB_TRIGGER_CLASS}>
                    <Info className="h-3.5 w-3.5" />
                    Información
                  </TabsTrigger>
                  <TabsTrigger value="participantes" className={TAB_TRIGGER_CLASS}>
                    <Users className="h-3.5 w-3.5" />
                    Participantes
                  </TabsTrigger>
                  <TabsTrigger value="asistencia" className={TAB_TRIGGER_CLASS}>
                    <UserCheck className="h-3.5 w-3.5" />
                    Asistencia
                  </TabsTrigger>
                  <TabsTrigger value="estadisticas" className={TAB_TRIGGER_CLASS}>
                    <BarChart3 className="h-3.5 w-3.5" />
                    Estadísticas
                  </TabsTrigger>
                </TabsList>

                {/* ── Información ── */}
                <TabsContent value="informacion" className="space-y-5 p-6">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                    <div className="space-y-4 rounded-lg border bg-muted/20 p-5">
                      <SectionLabel>Responsables</SectionLabel>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="space-y-0.5">
                          <SectionLabel>Autorizado por</SectionLabel>
                          <p className="mt-0.5 text-sm font-semibold text-foreground">
                            {activity.authorized_by?.first_name}{" "}
                            {activity.authorized_by?.last_name || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(activity.authorized_by as any)?.job_title?.name || ""}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <SectionLabel>Elaborado por</SectionLabel>
                          <p className="mt-0.5 text-sm font-semibold text-foreground">
                            {activity.planned_by?.first_name}{" "}
                            {activity.planned_by?.last_name || "—"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {(activity.planned_by as any)?.job_title?.name || ""}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <SectionLabel>Realizado por</SectionLabel>
                          <p className="mt-0.5 text-sm font-semibold text-foreground">
                            {activity.executed_by || "—"}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4 rounded-lg border bg-muted/20 p-5">
                      <SectionLabel>Cronograma</SectionLabel>
                      <div className="grid grid-cols-2 gap-4">
                        <DataCell
                          label="Fecha inicio"
                          value={format(addDays(activity.start_date, 1), "d 'de' MMMM yyyy", {
                            locale: es,
                          })}
                        />
                        <DataCell
                          label="Fecha finalización"
                          value={format(addDays(activity.end_date, 1), "d 'de' MMMM yyyy", {
                            locale: es,
                          })}
                        />
                        <DataCell
                          label="Hora inicio"
                          value={formatTime(activity.start_time)}
                          mono
                          accent
                        />
                        <DataCell
                          label="Hora fin"
                          value={formatTime(activity.end_time)}
                          mono
                          accent
                        />
                      </div>
                    </div>
                  </div>

                  {mitigationInfo && (
                    <div className="rounded-lg border border-l-4 border-border border-l-amber-500 bg-amber-50/60 p-5 dark:bg-amber-950/20">
                      <div className="mb-4 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        <SectionLabel>Plan de Mitigación Asociado</SectionLabel>
                      </div>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div className="space-y-0.5">
                          <SectionLabel>Plan</SectionLabel>
                          <p className="mt-0.5 text-sm font-medium text-foreground">
                            {mitigationInfo.plan.description}
                          </p>
                        </div>
                        <div className="space-y-0.5">
                          <SectionLabel>Medida de mitigación</SectionLabel>
                          <p className="mt-0.5 text-sm font-medium text-foreground">
                            {mitigationInfo.measure.description}
                          </p>
                        </div>
                        {mitigationInfo.reportLabel && (
                          <div className="space-y-0.5">
                            <SectionLabel>Reporte origen</SectionLabel>
                            <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium text-foreground">
                              <Link2 className="h-3.5 w-3.5 text-amber-500" />
                              <span className="font-mono">{mitigationInfo.reportLabel}</span>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="space-y-3 rounded-lg border bg-muted/20 p-5">
                      <SectionLabel>Temas</SectionLabel>
                      {activity.topics ? (
                        <ul className="space-y-1.5">
                          {activity.topics.split("~").map(
                            (topic, i) =>
                              topic.trim() && (
                                <li
                                  key={i}
                                  className="flex items-start gap-2 text-sm text-foreground/80"
                                >
                                  <ChevronRight className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                                  {topic.trim()}
                                </li>
                              ),
                          )}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">—</p>
                      )}
                    </div>

                    <div className="space-y-3 rounded-lg border bg-muted/20 p-5">
                      <SectionLabel>Observaciones</SectionLabel>
                      <p className="whitespace-pre-line break-words text-sm leading-relaxed text-foreground/80">
                        {activity.objetive || "—"}
                      </p>
                    </div>

                    <div className="space-y-3 rounded-lg border bg-muted/20 p-5">
                      <SectionLabel>Descripción</SectionLabel>
                      <p className="whitespace-pre-line break-words text-sm leading-relaxed text-foreground/80">
                        {activity.description || "—"}
                      </p>
                    </div>
                  </div>

                  {(activity?.image || activity?.document) && (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {activity?.image && (
                        <div className="space-y-3 rounded-lg border bg-muted/20 p-5">
                          <SectionLabel>Imagen Adjunta</SectionLabel>
                          <Dialog>
                            <DialogTrigger asChild>
                              <div className="group relative h-48 cursor-pointer overflow-hidden rounded-md border">
                                {imageSrc ? (
                                  <img
                                    src={imageSrc}
                                    alt="Imagen de la actividad"
                                    className="h-full w-full object-contain transition-transform duration-200 group-hover:scale-105"
                                  />
                                ) : (
                                  <div className="flex h-full items-center justify-center">
                                    <Loader2 className="size-8 animate-spin text-amber-500" />
                                  </div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                                  <span className="rounded-full bg-black/60 px-3 py-1.5 text-xs font-semibold text-white">
                                    Ver imagen completa
                                  </span>
                                </div>
                              </div>
                            </DialogTrigger>
                            <DialogContent className="max-h-[90vh] w-[95vw] max-w-4xl">
                              <DialogHeader>
                                <DialogTitle>Imagen de la Actividad</DialogTitle>
                              </DialogHeader>
                              <div className="relative flex h-[60vh] items-center justify-center">
                                {imageSrc ? (
                                  <img
                                    src={imageSrc}
                                    alt="Imagen completa"
                                    className="max-h-full max-w-full rounded-lg object-contain"
                                  />
                                ) : (
                                  <Loader2 className="size-10 animate-spin text-amber-500" />
                                )}
                              </div>
                            </DialogContent>
                          </Dialog>
                        </div>
                      )}

                      {activity?.document && (
                        <div className="flex flex-col space-y-3 rounded-lg border bg-muted/20 p-5">
                          <SectionLabel>Documento Adjunto</SectionLabel>
                          <div className="flex flex-1 items-center justify-center py-4">
                            <Button
                              onClick={() =>
                                downloadDocument(
                                  activity.document!,
                                  `ACT-${activity.activity_number}.pdf`,
                                )
                              }
                              disabled={isDownloading}
                              variant="outline"
                              className="gap-2 border-amber-500/30 text-amber-700 hover:border-amber-500/60 hover:bg-amber-500/10 dark:text-amber-400"
                            >
                              {isDownloading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <FileText className="h-4 w-4" />
                              )}
                              {isDownloading ? "Descargando..." : "Descargar Documento"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>

                {/* ── Participantes ── */}
                <TabsContent value="participantes" className="space-y-4 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-muted-foreground" />
                      <SectionLabel>Empleados Inscritos</SectionLabel>
                    </div>
                    <span className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 font-mono text-xs font-semibold text-amber-600 dark:text-amber-400">
                      {attendedList?.length || 0} registros
                    </span>
                  </div>

                  {isActivityLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="size-8 animate-spin text-amber-500" />
                    </div>
                  ) : activityError ? (
                    <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Error al cargar la lista de empleados.
                      </p>
                    </div>
                  ) : attendedList && attendedList.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/40">
                          <tr>
                            {["#", "Nombre Completo", "DNI"].map((h) => (
                              <th
                                key={h}
                                className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-background">
                          {attendedList.map((a: AttendanceData, idx: number) => (
                            <tr key={a.id} className="transition-colors hover:bg-muted/25">
                              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                {String(idx + 1).padStart(2, "0")}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-foreground">
                                {a.employee.first_name} {a.employee.last_name}
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                {a.employee_dni}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <Users className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">
                        No hay empleados inscritos en esta actividad.
                      </p>
                    </div>
                  )}
                </TabsContent>

                {/* ── Asistencia ── */}
                <TabsContent value="asistencia" className="space-y-4 p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                      <SectionLabel>Registro de Asistencia</SectionLabel>
                    </div>
                    <div className="flex gap-2">
                      <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                        ✓ {AttendanceStats?.attended || 0} asistentes
                      </span>
                      <span className="rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-700 dark:text-red-400">
                        ✗ {AttendanceStats?.not_attended || 0} ausentes
                      </span>
                    </div>
                  </div>

                  {isActivityLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="size-8 animate-spin text-amber-500" />
                    </div>
                  ) : activityError ? (
                    <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Error al cargar la lista de asistencia.
                      </p>
                    </div>
                  ) : attendedList && attendedList.length > 0 ? (
                    <div className="overflow-x-auto rounded-lg border">
                      <table className="min-w-full divide-y divide-border">
                        <thead className="bg-muted/40">
                          <tr>
                            {["#", "Nombre Completo", "DNI", "Estado"].map((h) => (
                              <th
                                key={h}
                                className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                              >
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border bg-background">
                          {attendedList.map((a: AttendanceData, idx: number) => (
                            <tr
                              key={a.id}
                              className={`transition-colors hover:bg-muted/20 ${!a.attended ? "bg-red-500/5" : ""}`}
                            >
                              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                {String(idx + 1).padStart(2, "0")}
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-foreground">
                                {a.employee.first_name} {a.employee.last_name}
                              </td>
                              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                                {a.employee_dni}
                              </td>
                              <td className="px-4 py-3">
                                {a.attended ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
                                    <CheckCheck className="h-3 w-3" /> Asistió
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:text-red-400">
                                    <X className="h-3 w-3" /> No Asistió
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="py-12 text-center">
                      <UserCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">No hay registros de asistencia.</p>
                    </div>
                  )}
                </TabsContent>

                {/* ── Estadísticas ── */}
                <TabsContent value="estadisticas" className="space-y-4 p-6">
                  <div className="flex items-center gap-2">
                    <AreaChartIcon className="h-3.5 w-3.5 text-muted-foreground" />
                    <SectionLabel>Estadísticas de Asistencia</SectionLabel>
                  </div>

                  {isAttendanceStatsLoading ? (
                    <div className="flex h-56 items-center justify-center gap-3">
                      <Loader2 className="size-8 animate-spin text-amber-500" />
                      <span className="text-sm text-muted-foreground">Cargando estadísticas...</span>
                    </div>
                  ) : isAttendanceStatsError ? (
                    <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
                      <p className="text-sm text-red-700 dark:text-red-300">
                        Error al cargar las estadísticas.
                      </p>
                    </div>
                  ) : AttendanceStats && AttendanceStats.total !== 0 ? (
                    <div className="flex flex-col gap-4 md:flex-row">
                      <div className="w-full rounded-lg border bg-muted/20 p-4 md:w-1/2">
                        <SectionLabel>Distribución</SectionLabel>
                        <div className="mt-3">
                          <BarChartCourseComponent
                            height="100%"
                            width="100%"
                            title=""
                            data={
                              AttendanceStats
                                ? {
                                    total: AttendanceStats.total,
                                    open: AttendanceStats.attended,
                                    closed: AttendanceStats.not_attended,
                                  }
                                : { total: 0, open: 0, closed: 0 }
                            }
                            bar_first_name="Asistente"
                            bar_second_name="Inasistente"
                          />
                        </div>
                      </div>
                      <div className="h-[300px] w-full rounded-lg border bg-muted/20 p-4 md:w-1/2">
                        <SectionLabel>Porcentaje</SectionLabel>
                        <PieChartComponent data={PieChartData} title="Porcentaje de Asistencia" />
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-muted/10 py-12 text-center">
                      <BarChart3 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">
                        No hay datos estadísticos disponibles.
                      </p>
                    </div>
                  )}
                </TabsContent>
              </div>
            </Tabs>
          </>
        )}
      </div>
    </ContentLayout>
  );
};

export default ShowSMSActivity;
