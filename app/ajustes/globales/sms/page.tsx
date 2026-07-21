"use client";

import { useState } from "react";
import { ContentLayout } from "@/components/layout/ContentLayout";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCompanyStore } from "@/stores/CompanyStore";
import {
  useGetSmsStations,
  useCreateSmsStation,
  useUpdateSmsStation,
  useDeleteSmsStation,
  type SmsStation,
} from "@/hooks/sms/useGetSmsStations";
import {
  useGetFindingLocations,
  useCreateFindingLocation,
  useUpdateFindingLocation,
  useDeleteFindingLocation,
  type FindingLocation,
} from "@/hooks/sms/useGetFindingLocations";
import {
  useGetSmsAreas,
  useCreateSmsArea,
  useUpdateSmsArea,
  useDeleteSmsArea,
  type SmsArea,
} from "@/hooks/sms/useGetSmsAreas";
import {
  useGetActivityCategories,
  useCreateActivityCategory,
  useUpdateActivityCategory,
  useDeleteActivityCategory,
  type ActivityCategory,
} from "@/hooks/sms/useGetActivityCategories";
import {
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Tag,
  Trash2,
  MapPin,
  Building2,
  Layers,
} from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

type CatalogItem = { id: number; name: string; slug: string };

const nameSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(100),
});
type NameForm = z.infer<typeof nameSchema>;

/* ── Inline name form (create / edit) ── */
function NameFormFields({
  defaultName = "",
  onSubmit,
  isPending,
  onCancel,
  submitLabel,
}: {
  defaultName?: string;
  onSubmit: (name: string) => void;
  isPending: boolean;
  onCancel: () => void;
  submitLabel: string;
}) {
  const form = useForm<NameForm>({
    resolver: zodResolver(nameSchema),
    defaultValues: { name: defaultName },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((d) => onSubmit(d.name))} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Nombre
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Nombre del registro"
                  {...field}
                  className="h-9 text-sm"
                />
              </FormControl>
              <FormMessage className="text-xs" />
            </FormItem>
          )}
        />
        <DialogFooter>
          <Button type="button" variant="outline" size="sm" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : submitLabel}
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

/* ── Generic catalog tab ── */
function CatalogTab<T extends CatalogItem>({
  items,
  isLoading,
  entityLabel,
  onAdd,
  onEdit,
  onDelete,
  isPendingAdd,
  isPendingEdit,
  isPendingDelete,
}: {
  items: T[] | undefined;
  isLoading: boolean;
  entityLabel: string;
  onAdd: (name: string) => Promise<void>;
  onEdit: (id: number, name: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  isPendingAdd: boolean;
  isPendingEdit: boolean;
  isPendingDelete: boolean;
}) {
  const [openCreate, setOpenCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<T | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setOpenCreate(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nuevo {entityLabel}
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Nombre
              </TableHead>
              <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Slug
              </TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && (!items || items.length === 0) && (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10 text-sm text-muted-foreground">
                  No hay registros aún.
                </TableCell>
              </TableRow>
            )}
            {items?.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-sm font-medium">{item.name}</TableCell>
                <TableCell className="text-sm font-mono text-muted-foreground">{item.slug}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditTarget(item)}>
                        <Pencil className="h-3.5 w-3.5 mr-2 text-blue-500" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create dialog */}
      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Nuevo {entityLabel}</DialogTitle>
            <DialogDescription>
              El registro quedará disponible de inmediato en los formularios.
            </DialogDescription>
          </DialogHeader>
          <NameFormFields
            onSubmit={async (name) => {
              await onAdd(name);
              setOpenCreate(false);
            }}
            isPending={isPendingAdd}
            onCancel={() => setOpenCreate(false)}
            submitLabel="Crear"
          />
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Editar {entityLabel}</DialogTitle>
            <DialogDescription>Modifique el nombre del registro.</DialogDescription>
          </DialogHeader>
          {editTarget && (
            <NameFormFields
              defaultName={editTarget.name}
              onSubmit={async (name) => {
                await onEdit(editTarget.id, name);
                setEditTarget(null);
              }}
              isPending={isPendingEdit}
              onCancel={() => setEditTarget(null)}
              submitLabel="Guardar"
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>¿Eliminar {entityLabel}?</DialogTitle>
            <DialogDescription>
              Esta acción es irreversible. Se eliminará{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isPendingDelete}
              onClick={async () => {
                if (!deleteTarget) return;
                await onDelete(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              {isPendingDelete ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Simple catalog tab (no slug) ── */
type SimpleItem = { id: number; name: string };

function SimpleCatalogTab<T extends SimpleItem>({
  items,
  isLoading,
  entityLabel,
  onAdd,
  onEdit,
  onDelete,
  isPendingAdd,
  isPendingEdit,
  isPendingDelete,
}: {
  items: T[] | undefined;
  isLoading: boolean;
  entityLabel: string;
  onAdd: (name: string) => Promise<void>;
  onEdit: (id: number, name: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
  isPendingAdd: boolean;
  isPendingEdit: boolean;
  isPendingDelete: boolean;
}) {
  const [openCreate, setOpenCreate] = useState(false);
  const [editTarget, setEditTarget] = useState<T | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<T | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" className="gap-1.5" onClick={() => setOpenCreate(true)}>
          <Plus className="h-3.5 w-3.5" />
          Nueva {entityLabel}
        </Button>
      </div>

      <div className="rounded-lg border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Nombre
              </TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading && (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-10">
                  <Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            )}
            {!isLoading && (!items || items.length === 0) && (
              <TableRow>
                <TableCell colSpan={2} className="text-center py-10 text-sm text-muted-foreground">
                  No hay registros aún.
                </TableCell>
              </TableRow>
            )}
            {items?.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="text-sm font-medium">{item.name}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditTarget(item)}>
                        <Pencil className="h-3.5 w-3.5 mr-2 text-blue-500" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-red-600 focus:text-red-600"
                        onClick={() => setDeleteTarget(item)}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-2" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={openCreate} onOpenChange={setOpenCreate}>
        <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Nueva {entityLabel}</DialogTitle>
            <DialogDescription>
              El registro quedará disponible de inmediato en los formularios.
            </DialogDescription>
          </DialogHeader>
          <NameFormFields
            onSubmit={async (name) => { await onAdd(name); setOpenCreate(false); }}
            isPending={isPendingAdd}
            onCancel={() => setOpenCreate(false)}
            submitLabel="Crear"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Editar {entityLabel}</DialogTitle>
            <DialogDescription>Modifique el nombre del registro.</DialogDescription>
          </DialogHeader>
          {editTarget && (
            <NameFormFields
              defaultName={editTarget.name}
              onSubmit={async (name) => { await onEdit(editTarget.id, name); setEditTarget(null); }}
              isPending={isPendingEdit}
              onCancel={() => setEditTarget(null)}
              submitLabel="Guardar"
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>¿Eliminar {entityLabel}?</DialogTitle>
            <DialogDescription>
              Esta acción es irreversible. Se eliminará{" "}
              <span className="font-semibold text-foreground">{deleteTarget?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteTarget(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={isPendingDelete}
              onClick={async () => {
                if (!deleteTarget) return;
                await onDelete(deleteTarget.id);
                setDeleteTarget(null);
              }}
            >
              {isPendingDelete ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── Page ── */
export default function GlobalesSmsPage() {
  const { selectedCompany } = useCompanyStore();
  const company = selectedCompany?.slug ?? "";

  const { data: stations, isLoading: loadingStations } = useGetSmsStations(company);
  const { data: locations, isLoading: loadingLocations } = useGetFindingLocations(company);
  const { data: areas, isLoading: loadingAreas } = useGetSmsAreas(company);
  const { data: activityCategories, isLoading: loadingCategories } = useGetActivityCategories(company);

  const createStation = useCreateSmsStation();
  const updateStation = useUpdateSmsStation();
  const deleteStation = useDeleteSmsStation();

  const createLocation = useCreateFindingLocation();
  const updateLocation = useUpdateFindingLocation();
  const deleteLocation = useDeleteFindingLocation();

  const createArea = useCreateSmsArea();
  const updateArea = useUpdateSmsArea();
  const deleteArea = useDeleteSmsArea();

  const createCategory = useCreateActivityCategory();
  const updateCategory = useUpdateActivityCategory();
  const deleteCategory = useDeleteActivityCategory();

  return (
    <ContentLayout title="Globales SMS">
      <div className="max-w-4xl mx-auto space-y-4">
        <div className="rounded-lg border border-border bg-muted/20 px-5 py-3">
          <p className="text-sm text-muted-foreground">
            Administre los catálogos globales utilizados en los formularios de reportes SMS:
            estaciones, lugares de identificación y áreas.
          </p>
        </div>

        <Tabs defaultValue="stations">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="stations" className="gap-1.5 text-xs">
              <MapPin className="h-3.5 w-3.5" />
              Estaciones
            </TabsTrigger>
            <TabsTrigger value="locations" className="gap-1.5 text-xs">
              <Building2 className="h-3.5 w-3.5" />
              Lugares de Identificación
            </TabsTrigger>
            <TabsTrigger value="areas" className="gap-1.5 text-xs">
              <Layers className="h-3.5 w-3.5" />
              Áreas
            </TabsTrigger>
            <TabsTrigger value="categories" className="gap-1.5 text-xs">
              <Tag className="h-3.5 w-3.5" />
              Categorías
            </TabsTrigger>
          </TabsList>

          <TabsContent value="stations" className="mt-4">
            <CatalogTab<SmsStation>
              items={stations}
              isLoading={loadingStations}
              entityLabel="Estación"
              onAdd={(name) => createStation.mutateAsync({ company, name })}
              onEdit={(id, name) => updateStation.mutateAsync({ company, id, name })}
              onDelete={(id) => deleteStation.mutateAsync({ company, id })}
              isPendingAdd={createStation.isPending}
              isPendingEdit={updateStation.isPending}
              isPendingDelete={deleteStation.isPending}
            />
          </TabsContent>

          <TabsContent value="locations" className="mt-4">
            <CatalogTab<FindingLocation>
              items={locations}
              isLoading={loadingLocations}
              entityLabel="Lugar"
              onAdd={(name) => createLocation.mutateAsync({ company, name })}
              onEdit={(id, name) => updateLocation.mutateAsync({ company, id, name })}
              onDelete={(id) => deleteLocation.mutateAsync({ company, id })}
              isPendingAdd={createLocation.isPending}
              isPendingEdit={updateLocation.isPending}
              isPendingDelete={deleteLocation.isPending}
            />
          </TabsContent>

          <TabsContent value="areas" className="mt-4">
            <CatalogTab<SmsArea>
              items={areas}
              isLoading={loadingAreas}
              entityLabel="Área"
              onAdd={(name) => createArea.mutateAsync({ company, name })}
              onEdit={(id, name) => updateArea.mutateAsync({ company, id, name })}
              onDelete={(id) => deleteArea.mutateAsync({ company, id })}
              isPendingAdd={createArea.isPending}
              isPendingEdit={updateArea.isPending}
              isPendingDelete={deleteArea.isPending}
            />
          </TabsContent>

          <TabsContent value="categories" className="mt-4">
            <SimpleCatalogTab<ActivityCategory>
              items={activityCategories}
              isLoading={loadingCategories}
              entityLabel="Categoría"
              onAdd={(name) => createCategory.mutateAsync({ company, name })}
              onEdit={(id, name) => updateCategory.mutateAsync({ company, id, name })}
              onDelete={(id) => deleteCategory.mutateAsync({ company, id })}
              isPendingAdd={createCategory.isPending}
              isPendingEdit={updateCategory.isPending}
              isPendingDelete={deleteCategory.isPending}
            />
          </TabsContent>
        </Tabs>
      </div>
    </ContentLayout>
  );
}
