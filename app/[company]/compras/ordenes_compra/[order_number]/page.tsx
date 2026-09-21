'use client';

import {
  useDeletePurchaseOrder,
  useDownloadPurchaseOrderFormat,
} from '@/actions/mantenimiento/compras/ordenes_compras/actions';
import { ContentLayout } from '@/components/layout/ContentLayout';
import LoadingPage from '@/components/misc/LoadingPage';
import { CompletePurchaseForm } from '@/components/forms/mantenimiento/compras/CompletePurchaseForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { useGetPurchaseOrder } from '@/hooks/mantenimiento/compras/useGetPurchaseOrder';
import { cn } from '@/lib/utils';
import { useCompanyStore } from '@/stores/CompanyStore';
import { ArrowLeft, ExternalLink, FileDown, Loader2, Package2, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
});

const fieldLabelClass = 'text-[11px] font-semibold uppercase tracking-widest text-muted-foreground';

function InfoCell({ label, value, mono = false }: { label: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div className="space-y-1.5">
      <p className={fieldLabelClass}>{label}</p>
      <p className={cn('text-sm font-medium', mono && 'font-mono')}>{value ?? '—'}</p>
    </div>
  );
}

const PurchaseOrderDetailPage = () => {
  const { selectedCompany } = useCompanyStore();
  const { order_number, company } = useParams<{ order_number: string; company: string }>();
  const router = useRouter();

  const { data, isLoading } = useGetPurchaseOrder(selectedCompany?.slug, order_number);
  const { deletePurchaseOrder } = useDeletePurchaseOrder();
  const { downloadPurchaseOrderFormat } = useDownloadPurchaseOrderFormat();

  const [openDelete, setOpenDelete] = useState(false);
  const [openComplete, setOpenComplete] = useState(false);

  if (isLoading) return <LoadingPage />;

  if (!data) {
    return (
      <ContentLayout title="Orden de Compra">
        <div className="flex flex-col items-center justify-center gap-4 py-16">
          <p className="text-sm text-muted-foreground">No se encontró la orden de compra.</p>
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-3.5 w-3.5" />
            Volver
          </Button>
        </div>
      </ContentLayout>
    );
  }

  const status = data.status?.toUpperCase().trim();
  const isProceso = status === 'PROCESO';

  return (
    <ContentLayout title="Orden de Compra">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="outline" size="sm" asChild>
          <Link href={`/${company}/compras/ordenes_compra`}>
            <ArrowLeft className="mr-2 h-3.5 w-3.5" />
            Volver
          </Link>
        </Button>
        <div className="flex items-center gap-3">
          <h1 className="font-mono text-2xl font-bold">{data.order_number}</h1>
          <Badge className={cn(isProceso ? 'bg-yellow-500' : 'bg-green-500')}>
            {status}
          </Badge>
        </div>
      </div>

      {/* ── Two-column layout ──────────────────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-12">

        {/* ── Left column (8/12) ──────────────────────────────────── */}
        <div className="space-y-6 lg:col-span-8">

          {/* Información general */}
          <section className="overflow-hidden rounded-lg border bg-background">
            <div className="border-b px-5 py-3">
              <p className={fieldLabelClass}>Información General</p>
            </div>
            <div className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
              <InfoCell label="PO" value={data.order_number} mono />
              <InfoCell label="Cotización" value={data.quote_order?.quote_number} mono />
              <InfoCell
                label="Fecha"
                value={data.purchase_date ? format(new Date(data.purchase_date), 'PPP', { locale: es }) : undefined}
              />
              <InfoCell label="Vendor Quote" value={data.vendor_quote} mono />
              <InfoCell label="Creado por" value={data.created_by} />
            </div>
          </section>

          {/* Proveedor */}
          <section className="overflow-hidden rounded-lg border bg-background">
            <div className="border-b px-5 py-3">
              <p className={fieldLabelClass}>Proveedor</p>
            </div>
            <div className="p-5">
              <p className="text-sm font-medium">{data.vendor?.name ?? '—'}</p>
            </div>
          </section>

          {/* Artículos */}
          <section className="overflow-hidden rounded-lg border bg-background">
            <div className="flex items-center gap-2 border-b px-5 py-3">
              <p className={fieldLabelClass}>Artículos</p>
              <Badge variant="outline" className="font-mono text-xs">
                {data.article_purchase_order.length} art.
              </Badge>
            </div>
            <div className="divide-y">
              {data.article_purchase_order.map((article) => {
                const lineTotal = Number(article.unit_price) * Number(article.quantity);
                return (
                  <div
                    key={article.id}
                    className="grid gap-4 px-5 py-4 sm:grid-cols-[minmax(0,2fr)_auto_auto_auto]"
                  >
                    <div className="space-y-1">
                      <p className={fieldLabelClass}>Part Number</p>
                      <p className="font-mono text-sm font-medium">{article.article_part_number}</p>
                      {article.article_alt_part_number && (
                        <p className="font-mono text-xs text-muted-foreground">
                          ALT: {article.article_alt_part_number}
                        </p>
                      )}
                      {article.batch?.name && (
                        <p className="text-xs text-muted-foreground">{article.batch.name}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className={fieldLabelClass}>Cantidad</p>
                      <p className="text-sm font-medium">
                        {article.quantity}
                        {article.unit && <span className="ml-1 font-mono text-xs text-muted-foreground">{article.unit}</span>}
                      </p>
                      {article.condition && (
                        <p className="font-mono text-xs text-muted-foreground">Cond: {article.condition}</p>
                      )}
                    </div>
                    <div className="space-y-1">
                      <p className={fieldLabelClass}>Unit Price</p>
                      <p className="text-sm font-medium">{moneyFormatter.format(Number(article.unit_price))}</p>
                    </div>
                    <div className="space-y-1">
                      <p className={fieldLabelClass}>Total</p>
                      <p className="text-sm font-semibold">{moneyFormatter.format(lineTotal)}</p>
                    </div>
                  </div>
                );
              })}
              <div className="flex items-center justify-between px-5 py-3">
                <p className={fieldLabelClass}>Subtotal</p>
                <p className="font-mono text-sm font-semibold">{moneyFormatter.format(Number(data.sub_total))}</p>
              </div>
            </div>
          </section>
        </div>

        {/* ── Right column (4/12) ─────────────────────────────────── */}
        <div className="space-y-4 lg:col-span-4 lg:sticky lg:top-4 lg:self-start">

          {/* Acciones — solo en PROCESO */}
          <section className="overflow-hidden rounded-lg border bg-background">
            <div className="border-b px-5 py-3">
              <p className={fieldLabelClass}>Acciones</p>
            </div>
            <div className="flex flex-col gap-2 p-4">
              <Button className="w-full" size="sm" asChild>
                <Link href={`/${company}/compras/ordenes_compra/${order_number}/editar`}>
                  <Pencil className="mr-2 h-3.5 w-3.5" />
                  Editar
                </Link>
              </Button>
              <Button disabled={data.status !== 'PROCESO'} className="w-full" size="sm" onClick={() => setOpenComplete(true)}>
                <Package2 className="mr-2 h-3.5 w-3.5" />
                Completar PO
              </Button>
              <Button
                variant="outline"
                className="w-full"
                size="sm"
                disabled={downloadPurchaseOrderFormat.isPending || !selectedCompany?.slug}
                onClick={() => {
                  if (!selectedCompany?.slug) return;
                  downloadPurchaseOrderFormat.mutate({
                    company: selectedCompany.slug,
                    id: data.id,
                    order_number: data.order_number,
                  });
                }}
              >
                {downloadPurchaseOrderFormat.isPending ? (
                  <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileDown className="mr-2 h-3.5 w-3.5" />
                )}
                Descargar formato
              </Button>
              <Button
                disabled={data.status !== 'PROCESO'}
                variant="destructive"
                size="sm"
                className="w-full"
                onClick={() => setOpenDelete(true)}
              >
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Eliminar
              </Button>
            </div>
          </section>

          {/* Costos */}
          <section className="overflow-hidden rounded-lg border bg-background">
            <div className="border-b px-5 py-3">
              <p className={fieldLabelClass}>Costos</p>
            </div>
            <div className="space-y-2 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="font-mono font-medium">{moneyFormatter.format(Number(data.sub_total))}</span>
              </div>
              {data.freight != null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Freight</span>
                  <span className="font-mono">{moneyFormatter.format(Number(data.freight))}</span>
                </div>
              )}
              {data.hazmat != null && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Hazmat</span>
                  <span className="font-mono">{moneyFormatter.format(Number(data.hazmat))}</span>
                </div>
              )}
              <Separator />
              <div className="flex items-center justify-between">
                <span className={fieldLabelClass}>Total</span>
                <span className="font-mono text-base font-semibold">
                  {moneyFormatter.format(Number(data.total))}
                </span>
              </div>
            </div>
          </section>

          {/* Pago */}
          {(data.bank_account || data.card) && (
            <section className="overflow-hidden rounded-lg border bg-background">
              <div className="border-b px-5 py-3">
                <p className={fieldLabelClass}>Pago</p>
              </div>
              <div className="space-y-3 p-4">
                {data.bank_account && (
                  <div className="space-y-1">
                    <p className={fieldLabelClass}>Cuenta bancaria</p>
                    <p className="text-sm font-medium">{data.bank_account.bank?.name}</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {data.bank_account.name} · {data.bank_account.account_number}
                    </p>
                  </div>
                )}
                {data.card && (
                  <div className="space-y-1">
                    <p className={fieldLabelClass}>Tarjeta</p>
                    <p className="font-mono text-xs text-muted-foreground">
                      {data.card.name} · {data.card.card_number}
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Invoice */}
          {data.invoice && (
            <section className="overflow-hidden rounded-lg border bg-background">
              <div className="border-b px-5 py-3">
                <p className={fieldLabelClass}>Invoice</p>
              </div>
              <div className="p-4">
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <a href={data.invoice} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-2 h-3.5 w-3.5" />
                    Ver / Descargar
                  </a>
                </Button>
              </div>
            </section>
          )}
        </div>
      </div>

      {/* ── Completar PO dialog ───────────────────────────────────── */}
      <Dialog open={openComplete} onOpenChange={setOpenComplete}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">Completar Orden de Compra</DialogTitle>
          </DialogHeader>
          <CompletePurchaseForm po={data} onClose={() => setOpenComplete(false)} />
        </DialogContent>
      </Dialog>

      {/* ── Eliminar dialog ───────────────────────────────────────── */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">¿Eliminar Orden de Compra?</DialogTitle>
            <p className="text-center text-sm text-muted-foreground">
              Esta acción no se puede deshacer. ¿Estás seguro de eliminar{' '}
              <span className="font-mono font-semibold">{data.order_number}</span>?
            </p>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDelete(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={deletePurchaseOrder.isPending}
              onClick={async () => {
                await deletePurchaseOrder.mutateAsync({ id: data.id, company: selectedCompany!.slug });
                router.push(`/${company}/compras/ordenes_compra`);
              }}
            >
              {deletePurchaseOrder.isPending ? <Loader2 className="animate-spin size-4" /> : 'Eliminar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ContentLayout>
  );
};

export default PurchaseOrderDetailPage;
