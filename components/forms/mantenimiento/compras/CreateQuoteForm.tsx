'use client';
import { useCreateQuote, useUpdateQuote } from '@/actions/mantenimiento/compras/cotizaciones/actions';
import { useUpdateRequisitionStatus } from '@/actions/mantenimiento/compras/requisiciones/actions';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useGetVendors } from '@/hooks/general/proveedores/useGetVendors';
import { cn } from '@/lib/utils';
import { useCompanyStore } from '@/stores/CompanyStore';
import { Quote, Requisition } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Check, ChevronsUpDown, Loader2, Package2 } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';
import { AmountInput } from '../../../misc/AmountInput';
import { Calendar } from '../../../ui/calendar';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '../../../ui/command';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../../ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '../../../ui/popover';
import { ScrollArea } from '../../../ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import CreateVendorForm from '../../general/CreateVendorForm';

const FormSchema = z.object({
  justification: z.string({ message: 'Debe ingresar una justificacion.' }),
  articles: z.array(
    z.object({
      part_number: z.string(),
      alt_part_number: z.string().optional(),
      quantity: z.number().min(1, { message: 'Debe ingresar al menos 1.' }),
      // Unidad de compra: puede diferir de la unidad solicitada en la requisicion.
      unit: z.string({ message: 'Debe elegir la unidad.' }).min(1, { message: 'Debe elegir la unidad.' }),
      unit_price: z.string().min(0, { message: 'El precio no puede ser negativo.' }),
      condition: z.string({ message: 'Debe elegir la condicion.' }),
      vendor_id: z.string({ message: 'Debe seleccionar un proveedor para cada articulo.' }).min(1, { message: 'Debe seleccionar un proveedor para cada articulo.' }),
    }),
  ),
  vendor_id: z.string().optional(),
  quote_date: z.date({ message: 'Debe ingresar una fecha de cotizacion.' }),
});

type FormSchemaType = z.infer<typeof FormSchema>;

export function CreateQuoteForm({
  initialData,
  onClose,
  req,
  editQuote,
}: {
  initialData?: any;
  onClose: () => void;
  req: Requisition;
  editQuote?: Quote;
}) {
  const { selectedCompany } = useCompanyStore();
  const isEditMode = !!editQuote;

  const [openVendor, setOpenVendor] = useState(false);
  const [openVendorDialog, setOpenVendorDialog] = useState(false);
  // Track which article vendor popovers are open (by index)
  const [openArticleVendor, setOpenArticleVendor] = useState<Record<number, boolean>>({});

  const { updateStatusRequisition } = useUpdateRequisitionStatus();
  const { createQuote } = useCreateQuote();
  const { updateQuote } = useUpdateQuote();
  const { user } = useAuth();

  const transformedArticles = isEditMode
    ? editQuote!.article_quote_order.map((a) => ({
        part_number: a.article_part_number,
        alt_part_number: '',
        quantity: Number(a.quantity),
        // Cotizaciones anteriores al campo Unidad no lo tienen: se precarga EA
        // para no bloquear su edicion.
        unit: a.unit ?? 'EA',
        unit_price: a.unit_price?.toString() ?? '',
        condition: a.condition ?? '',
        vendor_id: a.vendor_id?.toString() ?? a.vendor?.id?.toString() ?? '',
        image: a.image,
      }))
    : initialData?.articles?.flatMap((article: any) =>
        article.batch_articles.map((batchArticle: any) => ({
          part_number: batchArticle.part_number,
          alt_part_number: batchArticle.alt_part_number || '',
          quantity: batchArticle.quantity,
          unit: '',
          unit_price: '',
          condition: '',
          vendor_id: '',
          image: batchArticle.image,
        })),
      ) || [];

  // Track which articles had their vendor manually set by the user (form-only, not sent to API)
  // In edit mode, treat existing vendors as manually set so header-vendor changes don't clobber them.
  const vendorManuallySetRef = useRef<boolean[]>(transformedArticles.map(() => isEditMode));

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      justification: editQuote?.justification ?? initialData?.justification ?? '',
      articles: transformedArticles,
      vendor_id: editQuote?.vendor_id?.toString() ?? editQuote?.vendor?.id?.toString() ?? '',
      quote_date: editQuote?.quote_date ? new Date(editQuote.quote_date) : undefined,
    },
  });

  const { control, handleSubmit } = form;

  const { fields } = useFieldArray({ control, name: 'articles' });

  const calculateTotal = (articles: FormSchemaType['articles']) =>
    articles.reduce((sum, article) => sum + (article.quantity * Number(article.unit_price) || 0), 0);

  const articles = useWatch({ control, name: 'articles' });
  const total = useMemo(() => calculateTotal(articles), [articles]);

  const { data: vendors, isLoading: isVendorsLoading, isError: isVendorsErros } = useGetVendors(selectedCompany?.slug);

  // When header vendor changes, propagate to articles that haven't been manually set
  const handleHeaderVendorChange = useCallback(
    (vendorIdStr: string) => {
      form.setValue('vendor_id', vendorIdStr);
      fields.forEach((_, index) => {
        if (!vendorManuallySetRef.current[index]) {
          form.setValue(`articles.${index}.vendor_id`, vendorIdStr);
        }
      });
    },
    [form, fields],
  );

  // "Aplicar a todos" — force header vendor on all items and reset manual flags
  const handleApplyToAll = useCallback(() => {
    const headerVendor = form.getValues('vendor_id');
    if (!headerVendor) return;
    fields.forEach((_, index) => {
      form.setValue(`articles.${index}.vendor_id`, headerVendor);
      vendorManuallySetRef.current[index] = false;
    });
  }, [form, fields]);

  const onSubmit = async (data: FormSchemaType) => {
    const formattedData = {
      ...data,
      created_by: `${user?.id}`,
      sub_total: total,
      total: total,
      company: selectedCompany!.slug,
      requisition_order_id: req.id,
      vendor_id: data.vendor_id ? Number(data.vendor_id) : undefined,
      articles: data.articles.map((article) => ({
        ...article,
        quantity: article.quantity,
        amount: Number(article.unit_price) * Number(article.quantity),
        vendor_id: Number(article.vendor_id),
      })),
    };

    if (isEditMode) {
      await updateQuote.mutateAsync({
        id: editQuote!.id,
        // Preserve original status — backend overwrites with payload (null → status NULL bug)
        data: { ...formattedData, status: editQuote!.status },
        company: selectedCompany!.slug,
      });
    } else {
      await createQuote.mutateAsync({ data: formattedData, company: selectedCompany!.slug });
      await updateStatusRequisition.mutateAsync({
        id: req.id,
        data: {
          status: 'COTIZADO',
          updated_by: `${user?.first_name} ${user?.last_name}`,
        },
        company: selectedCompany!.slug,
      });
    }
    onClose();
  };

  const fieldLabel = 'text-[11px] font-semibold uppercase tracking-widest text-muted-foreground';

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col overflow-hidden">
        <ScrollArea className="max-h-[calc(90vh-8rem)]">
          <div className="flex flex-col gap-5 px-5 py-4">
        {/* Cabecera: fecha . proveedor por defecto */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Fecha */}
          <FormField
            control={form.control}
            name="quote_date"
            render={({ field }) => (
              <FormItem className="flex flex-col space-y-1.5">
                <p className={fieldLabel}>Fecha de Cotizacion</p>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          'w-full justify-start pl-3 text-left font-normal',
                          !field.value && 'text-muted-foreground',
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                        {field.value ? format(field.value, 'PPP', { locale: es }) : 'Seleccione la fecha'}
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      locale={es}
                      disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Proveedor por defecto + Aplicar a todos */}
          <FormField
            control={form.control}
            name="vendor_id"
            render={({ field }) => (
              <FormItem className="flex flex-col space-y-1.5">
                <p className={fieldLabel}>Proveedor por defecto</p>
                <div className="flex gap-2">
                  <Popover open={openVendor} onOpenChange={setOpenVendor}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          disabled={isVendorsLoading}
                          variant="outline"
                          role="combobox"
                          className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}
                        >
                          {isVendorsLoading ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : field.value ? (
                            vendors?.find((v) => v.id.toString() === field.value)?.name
                          ) : (
                            'Elige al proveedor...'
                          )}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[260px] p-0">
                      <Command>
                        <CommandInput placeholder="Busque un proveedor..." />
                        <CommandList>
                          <CommandEmpty>No se ha encontrado un proveedor.</CommandEmpty>
                          <CommandGroup>
                            <Dialog open={openVendorDialog} onOpenChange={setOpenVendorDialog}>
                              <DialogTrigger asChild>
                                <div className="flex justify-center p-1">
                                  <Button
                                    variant="ghost"
                                    className="w-full h-8 text-xs"
                                    onClick={() => setOpenVendorDialog(true)}
                                  >
                                    + Crear Proveedor
                                  </Button>
                                </div>
                              </DialogTrigger>
                              <DialogContent className="sm:max-w-[490px]">
                                <DialogHeader>
                                  <DialogTitle>Creacion de Proveedor</DialogTitle>
                                  <DialogDescription>
                                    Cree un proveedor rellenando la informacion necesaria.
                                  </DialogDescription>
                                </DialogHeader>
                                <CreateVendorForm onClose={() => setOpenVendorDialog(false)} />
                              </DialogContent>
                            </Dialog>
                            {vendors?.map((vendor) => (
                              <CommandItem
                                value={vendor.name}
                                key={vendor.id.toString()}
                                onSelect={() => {
                                  handleHeaderVendorChange(vendor.id.toString());
                                  setOpenVendor(false);
                                }}
                              >
                                <Check
                                  className={cn(
                                    'mr-2 h-4 w-4',
                                    vendor.id.toString() === field.value ? 'opacity-100' : 'opacity-0',
                                  )}
                                />
                                {vendor.name}
                              </CommandItem>
                            ))}
                            {isVendorsErros && (
                              <p className="p-2 text-xs text-muted-foreground">
                                Ha ocurrido un error al cargar los datos...
                              </p>
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0 text-xs"
                    disabled={!field.value}
                    onClick={handleApplyToAll}
                  >
                    Aplicar a todos
                  </Button>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Justificacion */}
        <FormField
          control={control}
          name="justification"
          render={({ field }) => (
            <FormItem className="space-y-1.5">
              <p className={fieldLabel}>Justificacion</p>
              <FormControl>
                <Textarea
                  placeholder="Ej: Necesidad de la pieza X para instalacion..."
                  className="resize-none"
                  rows={3}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Articulos */}
        <div className="overflow-hidden rounded-lg border bg-background">
          {/* Header de seccion */}
          <div className="flex flex-col gap-3 border-b bg-muted/20 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded border bg-muted/30">
                <Package2 className="h-4 w-4 text-muted-foreground" />
              </span>
              <div className="space-y-0.5">
                <p className={fieldLabel}>Articulos</p>
                <p className="text-xs text-muted-foreground">
                  El P/N alterno se precarga desde la requisicion y puede ajustarse.
                </p>
              </div>
            </div>
            <span className="inline-flex w-fit rounded-full border border-border/80 bg-background px-3 py-1 text-[11px] font-semibold tabular-nums text-muted-foreground">
              {fields.length} {fields.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {/* Filas */}
            <div className="divide-y">
              {fields.map((field, index) => (
                <div key={field.id} className="space-y-3 px-5 py-4">
                  {/* Row 1: P/N + Vendor — full width, prominent */}
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
                    {/* P/N display */}
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border bg-muted/30 text-[10px] font-bold tabular-nums text-muted-foreground">
                        {index + 1}
                      </span>
                      <FormField
                        control={control}
                        name={`articles.${index}.part_number`}
                        render={({ field }) => (
                          <FormItem className="min-w-0 flex-1 space-y-0">
                            <p className={cn(fieldLabel, 'mb-1')}>P/N</p>
                            <FormControl>
                              <div className="flex min-h-9 items-center rounded-md border border-border/70 bg-muted/20 px-3 py-1.5">
                                <span className="break-all font-mono text-sm font-semibold tracking-wide">{field.value}</span>
                              </div>
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    {/* Vendor selector — generous width */}
                    <FormField
                      control={control}
                      name={`articles.${index}.vendor_id`}
                      render={({ field }) => (
                        <FormItem className="w-full space-y-0 sm:w-[280px]">
                          <p className={cn(fieldLabel, 'mb-1')}>Proveedor</p>
                          <Popover
                            open={openArticleVendor[index] ?? false}
                            onOpenChange={(open) =>
                              setOpenArticleVendor((prev) => ({ ...prev, [index]: open }))
                            }
                          >
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  disabled={isVendorsLoading}
                                  variant="outline"
                                  role="combobox"
                                  className={cn(
                                    'h-9 w-full justify-between text-sm font-medium',
                                    !field.value && 'text-muted-foreground',
                                  )}
                                >
                                  {isVendorsLoading ? (
                                    <Loader2 className="size-4 animate-spin" />
                                  ) : field.value ? (
                                    <span className="truncate">
                                      {vendors?.find((v) => v.id.toString() === field.value)?.name}
                                    </span>
                                  ) : (
                                    'Seleccionar proveedor...'
                                  )}
                                  <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-[280px] p-0">
                              <Command>
                                <CommandInput placeholder="Buscar proveedor..." />
                                <CommandList>
                                  <CommandEmpty>No encontrado.</CommandEmpty>
                                  <CommandGroup>
                                    {vendors?.map((vendor) => (
                                      <CommandItem
                                        value={vendor.name}
                                        key={vendor.id.toString()}
                                        onSelect={() => {
                                          form.setValue(`articles.${index}.vendor_id`, vendor.id.toString());
                                          vendorManuallySetRef.current[index] = true;
                                          setOpenArticleVendor((prev) => ({ ...prev, [index]: false }));
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            'mr-2 h-4 w-4',
                                            vendor.id.toString() === field.value ? 'opacity-100' : 'opacity-0',
                                          )}
                                        />
                                        {vendor.name}
                                      </CommandItem>
                                    ))}
                                    {isVendorsErros && (
                                      <p className="p-2 text-xs text-muted-foreground">
                                        Error al cargar proveedores...
                                      </p>
                                    )}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Row 2: Alt P/N + Qty + Condition + Price + Total */}
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-[minmax(0,1.5fr)_64px_84px_100px_140px_100px] sm:items-end sm:pl-9">
                    <FormField
                      control={control}
                      name={`articles.${index}.alt_part_number`}
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <p className={fieldLabel}>P/N Alterno</p>
                          <FormControl>
                            <Input
                              placeholder="P/N alterno"
                              className="h-9 border-border/70 bg-background font-mono text-xs"
                              {...field}
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name={`articles.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <p className={fieldLabel}>Cant.</p>
                          <FormControl>
                            <Input
                              className="h-9 border-border/70 bg-background text-center text-sm font-semibold tabular-nums"
                              type="number"
                              min={1}
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => {
                                const v = e.target.value;
                                field.onChange(v === '' ? '' : Number(v));
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name={`articles.${index}.unit`}
                      render={({ field, fieldState }) => (
                        <FormItem className="space-y-1">
                          <p className={fieldLabel}>Unidad</p>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger
                                aria-invalid={fieldState.invalid}
                                className="h-9 border-border/70"
                              >
                                <SelectValue placeholder="Selec..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="EA">EA</SelectItem>
                                <SelectItem value="KG">KG</SelectItem>
                                <SelectItem value="LT">LT</SelectItem>
                                <SelectItem value="FT">FT</SelectItem>
                                <SelectItem value="GL">GL</SelectItem>
                                <SelectItem value="MT">MT</SelectItem>
                                <SelectItem value="SET">SET</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name={`articles.${index}.condition`}
                      render={({ field, fieldState }) => (
                        <FormItem className="space-y-1">
                          <p className={fieldLabel}>Condicion</p>
                          <FormControl>
                            <Select value={field.value} onValueChange={field.onChange}>
                              <SelectTrigger
                                aria-invalid={fieldState.invalid}
                                className="h-9 border-border/70"
                              >
                                <SelectValue placeholder="Selec..." />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="OH">OH</SelectItem>
                                <SelectItem value="SV">SV</SelectItem>
                                <SelectItem value="NE">NE</SelectItem>
                                <SelectItem value="NS">NS</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={control}
                      name={`articles.${index}.unit_price`}
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <p className={fieldLabel}>Precio Unit.</p>
                          <FormControl>
                            <AmountInput {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-1">
                      <p className={fieldLabel}>Total</p>
                      <div className="flex h-9 items-center justify-end rounded-md bg-muted/20 px-3">
                        <p className="text-sm font-semibold tabular-nums">
                          {new Intl.NumberFormat('es-AR', {
                            style: 'currency',
                            currency: 'ARS',
                          }).format((articles[index]?.quantity || 0) * (Number(articles[index]?.unit_price) || 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

          {/* Total general */}
          <div className="flex items-center justify-between border-t bg-muted/20 px-5 py-3">
            <span className={fieldLabel}>Total General</span>
            <span className="text-lg font-bold tabular-nums">
              {new Intl.NumberFormat('es-AR', {
                style: 'currency',
                currency: 'ARS',
              }).format(total)}
            </span>
          </div>
        </div>
          </div>
        </ScrollArea>

        {/* Enviar -- sticky footer */}
        <div className="flex justify-end gap-2 border-t px-5 py-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            disabled={createQuote.isPending || updateQuote.isPending || updateStatusRequisition.isPending}
            type="submit"
          >
            {createQuote.isPending || updateQuote.isPending || updateStatusRequisition.isPending ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" />
                Procesando...
              </>
            ) : isEditMode ? (
              'Actualizar Cotizacion'
            ) : (
              'Crear Cotizacion'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
