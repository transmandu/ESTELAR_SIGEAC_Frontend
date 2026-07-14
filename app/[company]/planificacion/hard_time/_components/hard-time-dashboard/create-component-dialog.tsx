import { useCreateHardTimeComponent } from '@/actions/planificacion/hard_time/actions';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useDebounce } from '@/hooks/helpers/useDebounce';
import { cn } from '@/lib/utils';
import { useCompanyStore } from '@/stores/CompanyStore';
import { batchesPaginateInfiniteOptions } from '@api/queries';
import { HardTimeCategoryResource } from '@api/types';
import { zodResolver } from '@hookform/resolvers/zod';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { z } from 'zod';

const formSchema = z.object({
  category_code: z.string().min(1, 'Seleccione un capítulo ATA'),
  batch_id: z.number({ required_error: 'Seleccione un componente' }).min(1, 'Seleccione un componente'),
  part_number: z.string().optional(),
  description: z.string().optional(),
  position: z.string().min(1, 'Ingrese la ubicación'),
});

type FormValues = z.infer<typeof formSchema>;

type CreateComponentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  aircraftId: number | null;
  categories: HardTimeCategoryResource[];
  defaultCategoryCode?: string | null;
};

export function CreateComponentDialog(props: CreateComponentDialogProps) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nueva Posición</DialogTitle>
          <DialogDescription>
            Registre una nueva posición controlada dentro del capítulo ATA seleccionado.
          </DialogDescription>
        </DialogHeader>
        <CreateComponentForm {...props} />
      </DialogContent>
    </Dialog>
  );
}

function CreateComponentForm(props: CreateComponentDialogProps) {
  const { aircraftId, categories, defaultCategoryCode, onOpenChange } = props;
  const { selectedStation } = useCompanyStore();
  const createComponent = useCreateHardTimeComponent(aircraftId);
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 350);
  const {
    data: componentBatches,
    isFetching: isLoadingBatches,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    ...batchesPaginateInfiniteOptions({
      query: {
        location: Number(selectedStation) || 0,
        category: 'COMPONENTE',
        search: debouncedSearch || null,
        per_page: 50,
      },
    }),
    enabled: !!selectedStation,
    staleTime: 5 * 60 * 1000,
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const meta = lastPage.meta;
      if (!meta) return undefined;
      return meta.current_page < meta.last_page ? meta.current_page + 1 : undefined;
    },
  });
  const [isBatchPopoverOpen, setIsBatchPopoverOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category_code: defaultCategoryCode ?? '',
      batch_id: 0,
      part_number: '',
      description: '',
      position: '',
    },
  });

  const formValues = useWatch({ control: form.control });

  const batchOptions = useMemo(() => componentBatches?.pages.flatMap((page) => page.data) ?? [], [componentBatches]);

  const selectedBatch = useMemo(
    () => batchOptions.find((batch) => batch.id === formValues.batch_id) ?? null,
    [batchOptions, formValues.batch_id],
  );

  function onSubmit(values: FormValues) {
    if (!aircraftId) return;

    createComponent.mutate(
      {
        body: {
          aircraft_id: aircraftId,
          category_code: values.category_code,
          batch_id: values.batch_id,
          part_number: values.part_number?.trim() || null,
          description: values.description?.trim() ?? '',
          position: values.position.trim(),
        },
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Form {...form}>
      <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
        <FormField
          control={form.control}
          name="category_code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Capítulo ATA</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona capítulo ATA" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category.code} value={category.code}>
                      {category.name} ({category.code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="position"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Posición</FormLabel>
              <FormControl>
                <Input {...field} placeholder="ENG-1-FP" required />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="batch_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Componente (catálogo)</FormLabel>
              <FormControl>
                <Popover open={isBatchPopoverOpen} onOpenChange={setIsBatchPopoverOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={isBatchPopoverOpen}
                      className={cn('w-full justify-between font-normal', !field.value && 'text-muted-foreground')}
                    >
                      <span className="truncate">{selectedBatch?.name || 'Seleccione...'}</span>
                      {isLoadingBatches ? (
                        <Loader2 className="ml-2 h-4 w-4 shrink-0 animate-spin opacity-60" />
                      ) : (
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Buscar descripción..."
                        value={searchTerm}
                        onValueChange={setSearchTerm}
                      />
                      <CommandList>
                        <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                          {isLoadingBatches ? 'Cargando...' : 'No se encontraron componentes.'}
                        </CommandEmpty>
                        <CommandGroup>
                          {batchOptions.map((batch) => (
                            <CommandItem
                              key={batch.id}
                              value={`${batch.name} ${batch.description ?? ''} ${batch.ata_code ?? ''}`}
                              onSelect={() => {
                                field.onChange(batch.id);
                                setIsBatchPopoverOpen(false);
                              }}
                            >
                              <Check
                                className={cn('mr-2 h-4 w-4', field.value === batch.id ? 'opacity-100' : 'opacity-0')}
                              />
                              <div className="min-w-0">
                                <p className="truncate font-medium">{batch.name}</p>
                                <p className="truncate text-xs text-muted-foreground">
                                  {batch.description || batch.ata_code || 'Sin descripción adicional'}
                                </p>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                        {hasNextPage && (
                          <div className="border-t p-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="w-full text-xs"
                              disabled={isFetchingNextPage}
                              onClick={() => fetchNextPage()}
                            >
                              {isFetchingNextPage && <Loader2 className="mr-2 size-3 animate-spin" />}
                              Ver más
                            </Button>
                          </div>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="part_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>P/N esperado (opcional)</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Ej: 3289562-6 — P/N que normalmente va en esta posición" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea {...field} rows={3} placeholder="Descripción adicional de la posición" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!aircraftId || createComponent.isPending}>
            {createComponent.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Crear componente
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}
