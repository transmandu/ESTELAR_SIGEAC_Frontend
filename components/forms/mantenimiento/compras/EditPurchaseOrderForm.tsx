'use client';

import { useUpdatePurchaseOrder } from '@/actions/mantenimiento/compras/ordenes_compras/actions';
import { AmountInput } from '@/components/misc/AmountInput';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useGetVendors } from '@/hooks/general/proveedores/useGetVendors';
import { cn } from '@/lib/utils';
import { useCompanyStore } from '@/stores/CompanyStore';
import { PurchaseOrder } from '@/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Check, ChevronsUpDown, Loader2, Package2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

const fieldLabel = 'text-[11px] font-semibold uppercase tracking-widest text-muted-foreground';

const FormSchema = z.object({
  order_number: z.string().min(1, { message: 'El número de orden es obligatorio.' }),
  justification: z.string().min(1, { message: 'Debe ingresar una justificación.' }),
  purchase_date: z.date({ message: 'Debe ingresar una fecha.' }),
  vendor_id: z.string().min(1, { message: 'Debe seleccionar un proveedor.' }),
  articles: z.array(
    z.object({
      id: z.number().optional(),
      article_part_number: z.string(),
      condition: z.string().optional(),
      quantity: z.number().min(1, { message: 'Mínimo 1.' }),
      unit: z.string().optional(),
      unit_price: z.string().min(1, { message: 'Debe ingresar un precio.' }),
    }),
  ),
});

type FormSchemaType = z.infer<typeof FormSchema>;

interface EditPurchaseOrderFormProps {
  po: PurchaseOrder;
  onSuccess?: (newOrderNumber: string) => void;
}

export function EditPurchaseOrderForm({ po, onSuccess }: EditPurchaseOrderFormProps) {
  const { selectedCompany } = useCompanyStore();
  const { user } = useAuth();
  const { updatePurchaseOrder } = useUpdatePurchaseOrder();
  const { data: vendors, isLoading: isVendorsLoading } = useGetVendors(selectedCompany?.slug);

  const [openVendor, setOpenVendor] = useState(false);

  const form = useForm<FormSchemaType>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      order_number: po.order_number,
      justification: po.justification || '',
      purchase_date: new Date(po.purchase_date),
      vendor_id: String(po.vendor?.id ?? ''),
      articles: po.article_purchase_order.map((a) => ({
        id: a.id,
        article_part_number: a.article_part_number,
        condition: a.condition ?? '',
        quantity: Number(a.quantity),
        unit: a.unit ?? '',
        unit_price: String(a.unit_price),
      })),
    },
  });

  const { control, handleSubmit } = form;
  const { fields } = useFieldArray({ control, name: 'articles' });

  const articles = useWatch({ control, name: 'articles' });
  const total = useMemo(
    () => articles.reduce((sum, a) => sum + (a.quantity * Number(a.unit_price) || 0), 0),
    [articles],
  );

  const onSubmit = async (data: FormSchemaType) => {
    await updatePurchaseOrder.mutateAsync({
      id: po.id,
      company: selectedCompany!.slug,
      data: {
        order_number: data.order_number,
        justification: data.justification,
        purchase_date: data.purchase_date,
        vendor_id: Number(data.vendor_id),
        sub_total: total,
        total: total,
        updated_by: `${user?.first_name} ${user?.last_name}`,
        articles_purchase_orders: data.articles.map((a) => ({
          id: a.id,
          article_part_number: a.article_part_number,
          condition: a.condition || null,
          quantity: a.quantity,
          unit: a.unit || null,
          unit_price: a.unit_price,
        })),
      },
    });
    onSuccess?.(data.order_number);
  };

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* ── General Info ──────────────────────────────────────────── */}
        <section className="overflow-hidden rounded-lg border bg-background">
          <div className="border-b px-5 py-3">
            <p className={fieldLabel}>Información General</p>
          </div>
          <div className="space-y-4 p-5">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Order number */}
              <FormField
                control={control}
                name="order_number"
                render={({ field }) => (
                  <FormItem className="space-y-1.5">
                    <p className={fieldLabel}>Nro. de Orden</p>
                    <FormControl>
                      <Input placeholder="Ej: PO-2026-001" className="font-mono" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Date */}
              <FormField
                control={control}
                name="purchase_date"
                render={({ field }) => (
                  <FormItem className="flex flex-col space-y-1.5">
                    <p className={fieldLabel}>Fecha de Compra</p>
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
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Vendor */}
            <FormField
              control={control}
              name="vendor_id"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <p className={fieldLabel}>Proveedor</p>
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
                    <PopoverContent className="w-[300px] p-0">
                      <Command>
                        <CommandInput placeholder="Busque un proveedor..." />
                        <CommandList>
                          <CommandEmpty>No se ha encontrado un proveedor.</CommandEmpty>
                          <CommandGroup>
                            {vendors?.map((vendor) => (
                              <CommandItem
                                value={vendor.name}
                                key={vendor.id.toString()}
                                onSelect={() => {
                                  form.setValue('vendor_id', vendor.id.toString());
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
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Justification */}
            <FormField
              control={control}
              name="justification"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <p className={fieldLabel}>Justificación</p>
                  <FormControl>
                    <Textarea placeholder="Justificación de la orden..." className="resize-none" rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </section>

        {/* ── Articles ──────────────────────────────────────────────── */}
        <section className="overflow-hidden rounded-lg border bg-background">
          <div className="flex items-center gap-3 border-b bg-muted/20 px-5 py-3">
            <span className="flex h-8 w-8 items-center justify-center rounded border bg-muted/30">
              <Package2 className="h-4 w-4 text-muted-foreground" />
            </span>
            <div className="flex-1">
              <p className={fieldLabel}>Artículos</p>
            </div>
            <span className="inline-flex rounded-full border border-border/80 bg-background px-3 py-1 text-[11px] font-semibold tabular-nums text-muted-foreground">
              {fields.length} {fields.length === 1 ? 'ítem' : 'ítems'}
            </span>
          </div>

          {/* Column headers — desktop */}
          <div className="hidden border-b bg-muted/10 px-5 py-2.5 lg:block">
            <div className="grid grid-cols-[minmax(0,2fr)_90px_80px_80px_160px_120px] items-center gap-3">
              {(['Part Number', 'Condición', 'Cant.', 'Unidad', 'Precio Unit.', 'Total'] as const).map((col, i) => (
                <span key={col} className={cn(fieldLabel, i === 5 && 'text-right')}>
                  {col}
                </span>
              ))}
            </div>
          </div>

          <ScrollArea className={fields.length > 5 ? 'h-[400px]' : ''}>
            <div className="divide-y">
              {fields.map((field, index) => (
                <div key={field.id} className="px-5 py-4">
                  {/* Mobile label */}
                  <div className="mb-3 flex items-center justify-between lg:hidden">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                      Artículo {index + 1}
                    </p>
                    <p className="text-sm font-semibold tabular-nums">
                      ${((articles[index]?.quantity || 0) * (Number(articles[index]?.unit_price) || 0)).toFixed(2)}
                    </p>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_90px_80px_80px_160px_120px] lg:items-start">
                    {/* P/N — read-only */}
                    <FormField
                      control={control}
                      name={`articles.${index}.article_part_number`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <p className={cn(fieldLabel, 'lg:hidden')}>Part Number</p>
                          <div className="flex min-h-9 items-center rounded-md border border-border/70 bg-muted/30 px-3 py-2">
                            <span className="break-all font-mono text-xs font-medium">{field.value}</span>
                          </div>
                        </FormItem>
                      )}
                    />

                    {/* Condition */}
                    <FormField
                      control={control}
                      name={`articles.${index}.condition`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <p className={cn(fieldLabel, 'lg:hidden')}>Condición</p>
                          <FormControl>
                            <Input
                              className="h-9 text-center text-sm font-medium uppercase"
                              placeholder="OH"
                              maxLength={10}
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Quantity */}
                    <FormField
                      control={control}
                      name={`articles.${index}.quantity`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <p className={cn(fieldLabel, 'lg:hidden')}>Cantidad</p>
                          <FormControl>
                            <Input
                              type="number"
                              min={1}
                              className="h-9 text-center text-sm font-semibold"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Unit */}
                    <FormField
                      control={control}
                      name={`articles.${index}.unit`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <p className={cn(fieldLabel, 'lg:hidden')}>Unidad</p>
                          <FormControl>
                            <Input
                              className="h-9 text-center text-sm font-medium uppercase"
                              placeholder="EA"
                              maxLength={10}
                              {...field}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Unit price */}
                    <FormField
                      control={control}
                      name={`articles.${index}.unit_price`}
                      render={({ field }) => (
                        <FormItem className="space-y-1.5">
                          <p className={cn(fieldLabel, 'lg:hidden')}>Precio Unit.</p>
                          <FormControl>
                            <AmountInput {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Line total — read-only */}
                    <div className="hidden h-9 items-center justify-end rounded-md bg-muted/30 px-3 lg:flex">
                      <p className="text-right text-sm font-semibold tabular-nums">
                        ${((articles[index]?.quantity || 0) * (Number(articles[index]?.unit_price) || 0)).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Total */}
          <div className="flex items-center justify-between border-t bg-muted/20 px-5 py-3">
            <span className={fieldLabel}>Total</span>
            <span className="text-lg font-bold tabular-nums">${total.toFixed(2)}</span>
          </div>
        </section>

        {/* ── Actions ───────────────────────────────────────────────── */}
        <div className="flex justify-end gap-2">
          <Button disabled={updatePurchaseOrder.isPending} type="submit">
            {updatePurchaseOrder.isPending ? (
              <>
                <Loader2 className="mr-2 size-3.5 animate-spin" />
                Guardando…
              </>
            ) : (
              'Guardar Cambios'
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
}
