'use client'

import {
  useDownloadPurchaseOrderFormat,
  useUpdatePurchaseOrderStatus,
} from '@/actions/mantenimiento/compras/ordenes_compras/actions'
import { useCompanyStore } from '@/stores/CompanyStore'
import { PurchaseOrder } from '@/types'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CompletePurchaseForm } from '@/components/forms/mantenimiento/compras/CompletePurchaseForm'
import { BadgeDollarSign, ClipboardCheck, EyeIcon, FileDown, Loader2, MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

const moneyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
})

const fieldLabelClass = 'text-[11px] font-semibold uppercase tracking-widest text-muted-foreground'

const PurchaseOrderDropdownActions = ({ po }: { po: PurchaseOrder }) => {
  const [openApprove, setOpenApprove] = useState(false)
  const [openPayed, setOpenPayed] = useState(false)
  const { selectedCompany } = useCompanyStore()
  const { updatePurchaseOrderStatus } = useUpdatePurchaseOrderStatus()
  const { downloadPurchaseOrderFormat } = useDownloadPurchaseOrderFormat()

  const status = po.status?.toLowerCase().trim()

  const handleDownloadFormat = () => {
    if (!selectedCompany?.slug) return

    downloadPurchaseOrderFormat.mutate({
      company: selectedCompany.slug,
      id: po.id,
      order_number: po.order_number,
    })
  }

  const handleConfirmPaid = async () => {
    await updatePurchaseOrderStatus.mutateAsync({
      id: po.id,
      status: 'PAGADO',
      company: selectedCompany!.slug,
    })
    setOpenPayed(false)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="flex-col gap-1 justify-center">
          {status === 'proceso' && (
            <DropdownMenuItem onClick={() => setOpenApprove(true)}>
              <ClipboardCheck className="size-4 text-green-500" />
              <p className="pl-2">Completar</p>
            </DropdownMenuItem>
          )}
          {status === 'credito' && (
            <DropdownMenuItem onClick={() => setOpenPayed(true)}>
              <BadgeDollarSign className="size-4 text-blue-500" />
              <p className="pl-2">Marcar Pagado</p>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem asChild>
            <Link href={`/${selectedCompany?.slug}/compras/ordenes_compra/${po.order_number}`}>
              <EyeIcon className="size-4" />
              <p className="pl-2">Ver</p>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleDownloadFormat}
            disabled={downloadPurchaseOrderFormat.isPending}
          >
            {downloadPurchaseOrderFormat.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <FileDown className="size-4" />
            )}
            <p className="pl-2">Descargar formato</p>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ── Confirmar Pago ───────────────────────────────────────────── */}
      <Dialog open={openPayed} onOpenChange={setOpenPayed}>
        <DialogContent className="max-w-sm">
          <DialogHeader className="pb-1">
            <DialogTitle className="text-base font-semibold">Confirmar pago</DialogTitle>
          </DialogHeader>

          {/* Receipt card */}
          <div className="rounded-lg border bg-muted/20 divide-y text-sm">

            {/* PO + Vendor */}
            <div className="grid grid-cols-2 gap-x-4 px-4 py-3">
              <div className="space-y-1">
                <p className={fieldLabelClass}>Orden</p>
                <p className="font-mono font-semibold">{po.order_number}</p>
              </div>
              <div className="space-y-1">
                <p className={fieldLabelClass}>Cotización</p>
                <p className="font-mono text-muted-foreground">{po.quote_order?.quote_number ?? '—'}</p>
              </div>
            </div>

            <div className="px-4 py-3 space-y-1">
              <p className={fieldLabelClass}>Proveedor</p>
              <p className="font-medium">{po.vendor?.name ?? '—'}</p>
            </div>

            <div className="px-4 py-3 flex items-center justify-between">
              <p className={fieldLabelClass}>Artículos</p>
              <Badge variant="outline" className="font-mono text-xs">
                {po.article_purchase_order.length} art.
              </Badge>
            </div>

            {/* Financial breakdown */}
            <div className="px-4 py-3 space-y-2">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-mono">{moneyFormatter.format(Number(po.sub_total))}</span>
              </div>
              {po.freight != null && Number(po.freight) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Freight</span>
                  <span className="font-mono">{moneyFormatter.format(Number(po.freight))}</span>
                </div>
              )}
              {po.hazmat != null && Number(po.hazmat) > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>Hazmat</span>
                  <span className="font-mono">{moneyFormatter.format(Number(po.hazmat))}</span>
                </div>
              )}
            </div>

            {/* Total — visual anchor */}
            <div className="px-4 py-4 flex items-center justify-between bg-background rounded-b-lg">
              <p className={fieldLabelClass}>Total a pagar</p>
              <p className="font-mono text-2xl font-bold tracking-tight">
                {moneyFormatter.format(Number(po.total))}
              </p>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Esta acción marcará la orden como{' '}
            <span className="font-semibold text-foreground">PAGADA</span> y no podrá revertirse.
          </p>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => setOpenPayed(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleConfirmPaid}
              disabled={updatePurchaseOrderStatus.isPending}
            >
              {updatePurchaseOrderStatus.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <BadgeDollarSign className="size-4 mr-1.5" />
                  Marcar como Pagado
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Completar Compra ─────────────────────────────────────────── */}
      <Dialog open={openApprove} onOpenChange={setOpenApprove}>
        <DialogContent className="max-w-lg lg:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-center">Completar Compra</DialogTitle>
          </DialogHeader>
          <CompletePurchaseForm po={po} onClose={() => setOpenApprove(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}

export default PurchaseOrderDropdownActions
