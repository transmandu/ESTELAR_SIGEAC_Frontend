import {
  useDeleteQuote,
  useUpdateQuoteStatus,
} from "@/actions/mantenimiento/compras/cotizaciones/actions";
import { useUpdateRequisitionStatus } from "@/actions/mantenimiento/compras/requisiciones/actions";
import { CreateQuoteForm } from "@/components/forms/mantenimiento/compras/CreateQuoteForm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyStore } from "@/stores/CompanyStore";
import { Quote } from "@/types";
import {
  ClipboardCheck,
  ClipboardX,
  EyeIcon,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../../../ui/dialog";
import { useCreatePurchaseOrder } from "@/actions/mantenimiento/compras/ordenes_compras/actions";
import { useGetPurchaseOrders } from "@/hooks/mantenimiento/compras/useGetPurchaseOrders";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const FULL_ACCESS_ROLES = ['SUPERUSER', 'ANALISTA_COMPRAS', 'JEFE_COMPRAS'];

const QuoteDropdownActions = ({ quote }: { quote: Quote }) => {
  const { user } = useAuth();
  const { selectedCompany } = useCompanyStore();

  const [openReject, setOpenReject] = useState(false);
  const [openApprove, setOpenApprove] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  const userRoles = user?.roles?.map((r) => r.name) ?? [];
  const isPrivileged = userRoles.some((r) => FULL_ACCESS_ROLES.includes(r));
  const status = quote.status?.toUpperCase().trim();
  const isEditable = isPrivileged && status !== "APROBADO" && status !== "RECHAZADA";

  // Group articles by vendor for multi-vendor PO creation
  const vendorGroups = useMemo(() => {
    const articles = quote.article_quote_order ?? [];
    const groups: Record<string, { vendorId: number; vendorName: string; articles: typeof articles }> = {};

    for (const article of articles) {
      const vendorId = article.vendor_id ?? quote.vendor?.id;
      if (!vendorId) continue;
      const key = String(vendorId);
      if (!groups[key]) {
        groups[key] = {
          vendorId: Number(vendorId),
          vendorName: article.vendor?.name ?? quote.vendor?.name ?? 'N/A',
          articles: [],
        };
      }
      groups[key].articles.push(article);
    }
    return Object.values(groups);
  }, [quote]);

  const hasMultipleVendors = vendorGroups.length > 1;

  const { data: purchaseOrders } = useGetPurchaseOrders(selectedCompany?.slug ?? null, selectedCompany?.slug ?? null);

  const nextOrderNumber = useMemo(() => {
    const yearSuffix = new Date().getFullYear().toString().slice(-2);
    const pattern = new RegExp(`^${yearSuffix}-(\\d{4})$`);

    const maxNumber = (purchaseOrders ?? []).reduce((max, po) => {
      const match = po.order_number?.match(pattern);
      if (!match) return max;
      return Math.max(max, Number(match[1]));
    }, 134);

    return `${yearSuffix}-${String(maxNumber + 1).padStart(4, '0')}`;
  }, [purchaseOrders]);

  const handleOpenApprove = () => {
    setOrderNumber(nextOrderNumber);
    setOpenApprove(true);
  };

  const { updateStatusQuote } = useUpdateQuoteStatus();
  const { updateStatusRequisition } = useUpdateRequisitionStatus();
  const { createPurchaseOrder } = useCreatePurchaseOrder();
  const { deleteQuote } = useDeleteQuote();

  const isLoading =
    updateStatusQuote.isPending ||
    updateStatusRequisition.isPending ||
    createPurchaseOrder.isPending;

  const handleDelete = async () => {
    try {
      await deleteQuote.mutateAsync({
        id: Number(quote.id),
        company: selectedCompany!.slug,
      });
      setOpenDelete(false);
    } catch (error) {
      console.error("Error eliminando cotización:", error);
    }
  };

  // ✅ RECHAZAR
  const handleReject = async (id: number) => {
    try {
      const data = {
        status: "RECHAZADA",
        updated_by: `${user?.first_name} ${user?.last_name}`,
        company: selectedCompany!.slug
      };

      await updateStatusQuote.mutateAsync({
        id,
        data,
        company: selectedCompany!.slug
      });

      await updateStatusRequisition.mutateAsync({
        id: quote.requisition_order.id,
        data: {
          status: "PROCESO",
          updated_by: `${user?.first_name} ${user?.last_name}`
        },
        company: selectedCompany!.slug
      });

      setOpenReject(false);
    } catch (error) {
      console.error("Error rechazando cotización:", error);
    }
  };

  // ✅ APROBAR (flujo seguro — crea una PO por cada proveedor distinto)
  const handleApprove = async (id: number) => {
    if (!orderNumber.trim()) return;

    try {
      // 1️⃣ Crear una PO por cada grupo de proveedor
      for (let i = 0; i < vendorGroups.length; i++) {
        const group = vendorGroups[i];
        const groupTotal = group.articles.reduce(
          (sum, a) => sum + (a.quantity * Number(a.unit_price)),
          0
        );
        const poOrderNumber = vendorGroups.length > 1
          ? `${orderNumber}-${i + 1}`
          : orderNumber;

        const poData = {
          status: "PROCESO",
          order_number: poOrderNumber,
          justification: quote.justification,
          purchase_date: new Date(),
          sub_total: groupTotal,
          total: groupTotal,
          vendor_id: group.vendorId,
          created_by: `${user?.first_name} ${user?.last_name}`,
          articles_purchase_orders: group.articles,
          quote_order_id: Number(quote.id)
        };

        await createPurchaseOrder.mutateAsync({
          data: poData,
          company: selectedCompany!.slug
        });
      }

      // 2️⃣ Actualizar cotización
      await updateStatusQuote.mutateAsync({
        id,
        data: {
          status: "APROBADO",
          updated_by: `${user?.first_name} ${user?.last_name}`,
        },
        company: selectedCompany!.slug
      });

      // 3️⃣ Actualizar requisición
      await updateStatusRequisition.mutateAsync({
        id: quote.requisition_order.id,
        data: {
          status: "APROBADO",
          updated_by: `${user?.first_name} ${user?.last_name}`
        },
        company: selectedCompany!.slug
      });

      setOpenApprove(false);
      setOrderNumber("");
    } catch (error) {
      console.error("Error aprobando cotización:", error);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <span className="sr-only">Abrir menu</span>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="center" className="flex flex-col gap-1">
          {quote.status !== "APROBADO" && quote.status !== "RECHAZADA" && (
            <>
              <DropdownMenuItem onClick={handleOpenApprove}>
                <ClipboardCheck className="size-5 text-green-500 mr-2" />
                Aprobar
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => setOpenReject(true)}>
                <ClipboardX className="size-5 text-red-500 mr-2" />
                Rechazar
              </DropdownMenuItem>
            </>
          )}

          {isEditable && (
            <>
              <DropdownMenuItem onClick={() => setOpenEdit(true)}>
                <Pencil className="size-5 text-blue-500 mr-2" />
                Editar
              </DropdownMenuItem>

              <DropdownMenuItem onClick={() => setOpenDelete(true)}>
                <Trash2 className="size-5 text-red-500 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </>
          )}

          <DropdownMenuItem>
            <EyeIcon className="size-5 mr-2" />
            Ver detalle
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* ❌ RECHAZAR */}
      <Dialog open={openReject} onOpenChange={setOpenReject}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center">
              ¿Seguro que desea rechazar la cotización?
            </DialogTitle>
            <DialogDescription className="text-center">
              Esta acción es irreversible.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenReject(false)}
            >
              Cancelar
            </Button>

            <Button
              disabled={isLoading}
              onClick={() => handleReject(Number(quote.id))}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Confirmar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✅ APROBAR */}
      <Dialog open={openApprove} onOpenChange={setOpenApprove}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center">
              ¿Seguro que desea aprobar la cotización?
            </DialogTitle>
            <DialogDescription className="text-center">
              {hasMultipleVendors
                ? `Se generarán ${vendorGroups.length} órdenes de compra (una por cada proveedor). ¿Continuar?`
                : 'Se aprobará la cotización y se generará una Orden de Compra.'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2 mt-2">
            <Label>Nro. de PO / OC:</Label>
            <Input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="Ej: 26-0135"
            />
            {!orderNumber && (
              <span className="text-xs text-red-500">
                El número de orden es obligatorio
              </span>
            )}
          </div>

          <DialogFooter className="flex gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setOpenApprove(false)}
            >
              Cancelar
            </Button>

            <Button
              disabled={!orderNumber.trim() || isLoading}
              onClick={() => handleApprove(Number(quote.id))}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isLoading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Confirmar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ✏️ EDITAR */}
      <Dialog open={openEdit} onOpenChange={setOpenEdit}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0 gap-0">
          <div className="border-b border-blue-500/20 bg-blue-500/5 px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded border border-blue-500/30 bg-blue-500/10">
                <Pencil className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold leading-tight">
                  Editar Cotización
                </DialogTitle>
                <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                  {quote.quote_number}
                </p>
              </div>
            </div>
          </div>
          <CreateQuoteForm
            req={quote.requisition_order}
            editQuote={quote}
            onClose={() => setOpenEdit(false)}
          />
        </DialogContent>
      </Dialog>

      {/* 🗑️ ELIMINAR */}
      <Dialog open={openDelete} onOpenChange={setOpenDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-center text-2xl">
              ¿Eliminar cotización?
            </DialogTitle>
            <DialogDescription className="text-center">
              Esta acción no se puede deshacer. La cotización{" "}
              <span className="font-mono font-semibold">{quote.quote_number}</span>{" "}
              será eliminada permanentemente.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setOpenDelete(false)}>
              Cancelar
            </Button>
            <Button
              disabled={deleteQuote.isPending}
              onClick={handleDelete}
              variant="destructive"
            >
              {deleteQuote.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QuoteDropdownActions;