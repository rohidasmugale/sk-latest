// src/pages/superadmin/billing/InvoicesTab.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, Eye, Download, Search, ChevronLeft, ChevronRight,
  List, Grid, FileText, Receipt, Trash2, Loader2, AlertCircle,
  RefreshCw, Share2, Printer,
} from "lucide-react";
import { toast } from "sonner";
import { Invoice } from "@/components/shared/Billing";
import { PerformInvoiceForm } from "./PerformInvoiceForm";
import { TaxInvoiceForm } from "@/components/shared/TaxInvoiceForm";
import jsPDF from "jspdf";
import InvoiceService from "../../services/InvoiceService";
import { formatCurrency, formatDate, convertToIndianWords } from "../../utils/formatters";
import { SKTaxInvoicePrint } from "@/components/shared/SKTaxInvoicePrint";

// ─── Props ─────────────────────────────────────────────────────────────────────
interface InvoicesTabProps {
  invoices?: Invoice[];
  onInvoiceCreate?: (invoice: Invoice) => void;
  onMarkAsPaid?: (invoiceId: string) => void;
  onRefreshInvoices?: () => void;   // ← new
  userId?: string;
  userRole?: string;
}
// ─── Helpers ───────────────────────────────────────────────────────────────────
const getStatusColor = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (status.toLowerCase()) {
    case "paid": return "default";
    case "pending": return "secondary";
    case "overdue": return "destructive";
    default: return "secondary";
  }
};

// ─── Component ─────────────────────────────────────────────────────────────────
const InvoicesTab: React.FC<InvoicesTabProps> = ({
  invoices: propInvoices,
  onInvoiceCreate,
  onMarkAsPaid,
  onRefreshInvoices,   // ← new
  userId,
  userRole = "superadmin",
}) => {
  const invoiceService = new InvoiceService(userId, userRole);

  const [localInvoices, setLocalInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Dialogs
  const [performOpen, setPerformOpen] = useState(false);
  const [taxOpen, setTaxOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [printInvoice, setPrintInvoice] = useState<Invoice | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "card">("table");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Loading states
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareUserId, setShareUserId] = useState("");

  // Controlled vs standalone
  const isControlled = propInvoices !== undefined;

  useEffect(() => {
    if (isControlled && propInvoices) {
      setLocalInvoices(propInvoices);
      setLoading(false);
    } else if (!isControlled) {
      fetchInvoices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [propInvoices]);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await invoiceService.getAllInvoices();
      setLocalInvoices(data as Invoice[]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to fetch invoices";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // ── CRUD handlers ─────────────────────────────────────────────────────────────
  const handleCreateInvoice = async (invoice: Invoice): Promise<boolean> => {
    try {
      const created = await invoiceService.createInvoice(invoice);
      if (onInvoiceCreate) {
        onInvoiceCreate(created as Invoice);  // ← passes the saved invoice to Billing
      } else {
        setLocalInvoices(prev => [created as Invoice, ...prev]);
      }
      toast.success("Invoice created!");
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create invoice");
      return false;
    }
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      setMarkingPaidId(invoiceId);
      const updated = await invoiceService.markAsPaid(invoiceId);
      // Update local state and notify parent
      setLocalInvoices(prev => prev.map(i => i.id === invoiceId ? updated as Invoice : i));
      if (onMarkAsPaid) onMarkAsPaid(invoiceId);
      if (previewOpen) setPreviewOpen(false);
      toast.success("Invoice marked as paid!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to mark as paid";
      if (msg.includes("not found")) {
        toast.warning("Invoice not found – refreshing list...");
        if (onRefreshInvoices) {
          await onRefreshInvoices();   // ← parent refresh
        } else {
          await fetchInvoices();       // fallback (if no parent refresh)
        }
      } else {
        toast.error(msg);
      }
    } finally {
      setMarkingPaidId(null);
    }
  };
  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!window.confirm("Delete this invoice? This cannot be undone.")) return;
    try {
      setDeletingId(invoiceId);
      await invoiceService.deleteInvoice(invoiceId);
      setLocalInvoices(prev => prev.filter(i => i.id !== invoiceId));
      if (previewOpen && selectedInvoice?.id === invoiceId) {
        setPreviewOpen(false);
        setSelectedInvoice(null);
      }
      toast.success("Invoice deleted!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete invoice");
    } finally {
      setDeletingId(null);
    }
  };

  const handleShareInvoice = async (invoiceId: string, withUserId: string) => {
    if (!withUserId.trim()) { toast.error("Enter a user ID to share with"); return; }
    try {
      setSharingId(invoiceId);
      await invoiceService.shareInvoice(invoiceId, [withUserId]);
      setLocalInvoices(prev =>
        prev.map(i => i.id === invoiceId
          ? { ...i, sharedWith: [...(i.sharedWith ?? []), withUserId] }
          : i)
      );
      setShareOpen(false);
      setShareUserId("");
      toast.success("Invoice shared!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to share invoice");
    } finally {
      setSharingId(null);
    }
  };

  // ── PDF generation ────────────────────────────────────────────────────────────
  const generateSalesOrderPDF = (invoice: Invoice): boolean => {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pw = 210;
      const ph = 297;
      const lm = 15;
      const cw = pw - lm * 2;
      let y = 15;

      const line = (yy: number) => { doc.setDrawColor(0); doc.setLineWidth(0.1); doc.line(lm, yy, lm + cw, yy); };
      const txt = (t: string, x: number, yy: number, opts: { size?: number; style?: string; align?: "left" | "center" | "right"; color?: number } = {}) => {
        doc.setFontSize(opts.size ?? 10);
        doc.setFont("helvetica", opts.style ?? "normal");
        doc.setTextColor(opts.color ?? 0, 0, 0);
        doc.text(t, x, yy, { align: opts.align ?? "left" });
      };

      txt("SALES ORDER", pw / 2, y, { size: 16, style: "bold", align: "center" }); y += 8;
      txt(invoice.companyName ?? "S K Enterprises", pw / 2, y, { size: 12, style: "bold", align: "center" }); y += 6;
      (invoice.companyAddress ?? "Office No 505, 5th Floor, Global Square\nDeccan College Road, Yerwada, Pune")
        .split("\n").forEach(l => { txt(l, pw / 2, y, { size: 10, align: "center" }); y += 4; });
      txt(`GSTIN/UIN: ${invoice.companyGSTIN ?? "27ALKPK7734N1ZE"}`, pw / 2, y, { size: 9, align: "center" }); y += 4;
      txt(`State: ${invoice.companyState ?? "Maharashtra"}, Code: ${invoice.companyStateCode ?? "27"}`, pw / 2, y, { size: 9, align: "center" }); y += 4;
      txt(`E-Mail: ${invoice.companyEmail ?? "s.k.enterprises7583@gmail.com"}`, pw / 2, y, { size: 9, align: "center" }); y += 10;

      // Consignee
      txt("Consignee (Ship to)", lm, y, { size: 10, style: "bold" }); y += 5;
      txt(invoice.consignee ?? invoice.client, lm, y, { size: 10, style: "bold" }); y += 4;
      (invoice.consigneeAddress ?? "").split("\n").forEach(l => { txt(l, lm, y, { size: 9 }); y += 4; });
      if (invoice.consigneeGSTIN) { txt(`GSTIN/UIN: ${invoice.consigneeGSTIN}`, lm, y, { size: 9 }); y += 4; }
      if (invoice.consigneeState) { txt(`State: ${invoice.consigneeState}, Code: ${invoice.consigneeStateCode ?? ""}`, lm, y, { size: 9 }); y += 4; }
      y += 8;

      // Buyer
      txt("Buyer (Bill to)", lm, y, { size: 10, style: "bold" }); y += 5;
      txt(invoice.buyer ?? invoice.client, lm, y, { size: 10, style: "bold" }); y += 4;
      (invoice.buyerAddress ?? "").split("\n").forEach(l => { txt(l, lm, y, { size: 9 }); y += 4; });
      if (invoice.buyerGSTIN) { txt(`GSTIN/UIN: ${invoice.buyerGSTIN}`, lm, y, { size: 9 }); y += 4; }
      if (invoice.buyerState) { txt(`State: ${invoice.buyerState}, Code: ${invoice.buyerStateCode ?? ""}`, lm, y, { size: 9 }); y += 4; }
      y += 8;

      // Order details (2-column)
      const c2 = lm + cw * 0.6;
      const orderY = y;
      [
        ["Voucher No.", invoice.voucherNo ?? invoice.id ?? ""],
        ["Buyer's Ref.", invoice.buyerRef ?? ""],
        ["Dispatched through", invoice.dispatchedThrough ?? ""],
        ["Dated", invoice.date ?? ""],
      ].forEach(([l, v], i) => { txt(l, lm, orderY + i * 6, { size: 9 }); txt(v, lm + 42, orderY + i * 6, { size: 9 }); });
      [
        ["Payment Terms", invoice.paymentTerms ?? ""],
        ["Other Refs", invoice.notes ?? ""],
        ["Destination", invoice.site ?? invoice.destination ?? ""],
        ["Delivery Terms", invoice.deliveryTerms ?? ""],
      ].forEach(([l, v], i) => { txt(l, c2, orderY + i * 6, { size: 9 }); txt(v, c2 + 38, orderY + i * 6, { size: 9 }); });
      y = orderY + 28;

      // Items table
      const cols = { slNo: lm + 5, desc: lm + 20, qty: lm + 130, rate: lm + 155, amt: lm + 180 };
      line(y); y += 8;
      txt("Sl No.", cols.slNo, y, { size: 9, style: "bold", align: "center" });
      txt("Description of Goods", cols.desc, y, { size: 9, style: "bold" });
      txt("Quantity", cols.qty, y, { size: 9, style: "bold", align: "right" });
      txt("Rate per", cols.rate, y, { size: 9, style: "bold", align: "right" });
      txt("Amount", cols.amt, y, { size: 9, style: "bold", align: "right" });
      y += 3; line(y); y += 6;

      invoice.items.forEach((item, idx) => {
        if (y > ph - 50) { doc.addPage(); y = 20; }
        txt(`${idx + 1}`, cols.slNo, y, { size: 9, align: "center" });
        txt(item.description ?? "", cols.desc, y, { size: 9 });
        txt(`${item.quantity}`, cols.qty, y, { size: 9, align: "right" });
        txt(formatCurrency(item.rate), cols.rate, y, { size: 9, align: "right" });
        txt(formatCurrency(item.amount), cols.amt, y, { size: 9, align: "right" });
        y += 4;
        const unit = item.unit ?? "No";
        txt(unit, cols.qty, y, { size: 8, align: "right", style: "italic" });
        y += 6;
      });

      line(y); y += 8;
      txt("Total", cols.desc, y, { size: 10, style: "bold" });
      txt(formatCurrency(invoice.amount), cols.amt, y, { size: 10, style: "bold", align: "right" });
      y += 10; line(y); y += 8;

      // Amount in words
      txt("Amount Chargeable (in words)", lm, y, { size: 10, style: "bold" }); y += 6;
      const words = invoice.amountInWords ?? convertToIndianWords(invoice.amount);
      (doc as unknown as { splitTextToSize?: (t: string, w: number) => string[] })
        .splitTextToSize?.(words, cw)?.forEach((l: string) => { txt(l, lm, y, { size: 9 }); y += 4; });
      y += 8;

      // Bank details
      txt("Company's Bank Details", lm, y, { size: 10, style: "bold" }); y += 6;
      [
        `A/c Holder's Name : ${invoice.accountHolder ?? "S K ENTERPRISES"}`,
        `Bank Name : ${invoice.bankName ?? "BANK OF MAHARASHTRA"}`,
        `A/c No. : ${invoice.accountNumber ?? "CA 60168661338"}`,
        `Branch & IFS Code : ${invoice.branchAndIFSC ?? "KALYANI NAGAR & MAHB0001233"}`,
      ].forEach(l => { txt(l, lm, y, { size: 9 }); y += 4; });

      // Signature & footer
      const sigY = ph - 40;
      line(sigY - 10);
      txt("for S K Enterprises", lm + cw * 0.25, sigY, { size: 9, align: "center" });
      txt("Authorised Signatory", lm + cw * 0.25, sigY + 6, { size: 8, align: "center" });
      line(ph - 20);
      txt("This is a Computer Generated Document", pw / 2, ph - 14, { size: 8, style: "italic", align: "center" });

      doc.save(`Sales_Order_${invoice.voucherNo ?? invoice.id}_${invoice.date ?? formatDate(new Date().toISOString())}.pdf`);
      return true;
    } catch (err) {
      console.error("PDF error:", err);
      toast.error("Error generating PDF");
      return false;
    }
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    if (invoice.invoiceType === "tax") {
      setPrintInvoice(invoice);
      toast.info("Click 'Print / Save as PDF' in the preview to download.");
    } else {
      generateSalesOrderPDF(invoice);
    }
  };

  // ── Filtering / pagination ────────────────────────────────────────────────────
  const performInvoices = localInvoices.filter(i => i.invoiceType === "perform");
  const taxInvoices = localInvoices.filter(i => i.invoiceType === "tax");

  const filterInvoices = (list: Invoice[]) =>
    list.filter(inv =>
      [inv.client, inv.id, inv.site ?? "", inv.serviceType ?? "", inv.status, inv.voucherNo ?? ""]
        .some(v => v.toLowerCase().includes(searchTerm.toLowerCase()))
    );

  const paginate = (list: Invoice[]) => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return list.slice(start, start + ITEMS_PER_PAGE);
  };

  const totalPages = (list: Invoice[]) => Math.ceil(list.length / ITEMS_PER_PAGE);

  const filteredPerform = filterInvoices(performInvoices);
  const filteredTax = filterInvoices(taxInvoices);

  // ── Row action buttons ────────────────────────────────────────────────────────
  const ActionButtons = ({ invoice }: { invoice: Invoice }) => (
    <div className="flex flex-wrap gap-1">
      <Button variant="outline" size="sm" className="h-8 w-8 p-0"
        disabled={deletingId === invoice.id}
        onClick={() => { setSelectedInvoice(invoice); setPreviewOpen(true); }}>
        <Eye className="h-3.5 w-3.5" />
      </Button>
      <Button variant="outline" size="sm" className="h-8 w-8 p-0"
        disabled={deletingId === invoice.id}
        onClick={() => handleDownloadInvoice(invoice)}>
        <Download className="h-3.5 w-3.5" />
      </Button>
      {invoice.status !== "paid" && (
        <Button variant="outline" size="sm" className="h-8 px-2 text-xs"
          disabled={markingPaidId === invoice.id || deletingId === invoice.id}
          onClick={() => handleMarkAsPaid(invoice.id)}>
          {markingPaidId === invoice.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Paid"}
        </Button>
      )}
      {userRole === "superadmin" && (
        <Button variant="outline" size="sm" className="h-8 w-8 p-0"
          disabled={sharingId === invoice.id}
          onClick={() => { setSelectedInvoice(invoice); setShareOpen(true); }}>
          <Share2 className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button variant="outline" size="sm" className="h-8 w-8 p-0"
        disabled={deletingId === invoice.id}
        onClick={() => setPrintInvoice(invoice)}>
        <Printer className="h-3.5 w-3.5" />
      </Button>
      <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-red-600 hover:bg-red-50"
        disabled={deletingId === invoice.id}
        onClick={() => handleDeleteInvoice(invoice.id)}>
        {deletingId === invoice.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );

  // ── Renders ───────────────────────────────────────────────────────────────────
  const renderTable = (list: Invoice[]) => (
    <>
      {viewMode === "table" ? (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[110px]">Invoice ID</TableHead>
                <TableHead className="min-w-[130px]">Client</TableHead>
                <TableHead className="min-w-[100px]">Amount</TableHead>
                <TableHead className="min-w-[90px]">Status</TableHead>
                <TableHead className="min-w-[90px]">Date</TableHead>
                <TableHead className="min-w-[80px]">Type</TableHead>
                <TableHead className="min-w-[80px]">By</TableHead>
                <TableHead className="min-w-[180px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map(inv => (
                <TableRow key={inv.id}
                  className={inv.status === "overdue" ? "bg-red-50" : inv.status === "pending" ? "bg-yellow-50" : ""}>
                  <TableCell className="font-medium text-sm">{inv.id}</TableCell>
                  <TableCell>
                    <div className="font-medium text-sm truncate max-w-[130px]">{inv.client}</div>
                    <div className="text-xs text-muted-foreground truncate max-w-[130px]">{inv.clientEmail}</div>
                  </TableCell>
                  <TableCell className="font-semibold text-sm">{formatCurrency(inv.amount)}</TableCell>
                  <TableCell><Badge variant={getStatusColor(inv.status)} className="text-xs">{inv.status}</Badge></TableCell>
                  <TableCell className="text-sm">{formatDate(inv.date)}</TableCell>
                  <TableCell><Badge variant={inv.invoiceType === "tax" ? "secondary" : "outline"} className="text-xs">{inv.invoiceType === "tax" ? "Tax" : "Sales"}</Badge></TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{inv.createdBy ?? "superadmin"}</Badge></TableCell>
                  <TableCell><ActionButtons invoice={inv} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map(inv => (
            <Card key={inv.id} className={`hover:shadow-md transition-shadow ${inv.status === "overdue" ? "border-red-200 bg-red-50" : inv.status === "pending" ? "border-yellow-200 bg-yellow-50" : ""}`}>
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <CardTitle className="text-sm truncate">{inv.id}</CardTitle>
                    <p className="text-xs text-muted-foreground truncate">{inv.client}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant={getStatusColor(inv.status)} className="text-xs">{inv.status}</Badge>
                    <Badge variant={inv.invoiceType === "tax" ? "secondary" : "outline"} className="text-xs">
                      {inv.invoiceType === "tax" ? "Tax" : "Sales"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="text-xs text-muted-foreground">{formatDate(inv.date)}</div>
                  <div className="font-bold text-base">{formatCurrency(inv.amount)}</div>
                </div>
                <div className="text-xs text-muted-foreground truncate">{inv.serviceType}</div>
                <div className="pt-1">
                  <ActionButtons invoice={inv} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {list.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between mt-4 gap-3">
          <p className="text-xs text-muted-foreground">
            {((currentPage - 1) * ITEMS_PER_PAGE) + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, list.length)} of {list.length}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8"
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-xs">Page {currentPage} of {totalPages(list)}</span>
            <Button variant="outline" size="icon" className="h-8 w-8"
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages(list)))} disabled={currentPage === totalPages(list)}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </>
  );

  const renderEmpty = (type: "perform" | "tax") => (
    <div className="text-center py-10">
      <Eye className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
      <h3 className="font-semibold text-sm">No {type === "perform" ? "sales" : "tax"} invoices found</h3>
      <p className="text-xs text-muted-foreground mt-1">
        {searchTerm ? "Try adjusting your search" : "Create your first invoice"}
      </p>
      {!searchTerm && (
        <Button className="mt-4" size="sm" onClick={() => type === "perform" ? setPerformOpen(true) : setTaxOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />Create Invoice
        </Button>
      )}
    </div>
  );

  // ── Loading / error states ────────────────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <Loader2 className="h-8 w-8 animate-spin text-primary mr-3" />
      <span className="text-sm text-muted-foreground">Loading invoices…</span>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center h-48">
      <div className="text-center">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <p className="font-semibold text-sm">Failed to load invoices</p>
        <p className="text-xs text-red-600 mt-1">{error}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={fetchInvoices}>
          <RefreshCw className="h-4 w-4 mr-1" />Retry
        </Button>
      </div>
    </div>
  );

  // ── Main render ───────────────────────────────────────────────────────────────
  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          {/* Top row: title + view toggles */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">Invoice Management</CardTitle>
              <div className="flex border rounded-lg overflow-hidden">
                <Button variant={viewMode === "table" ? "default" : "ghost"} size="sm" className="h-7 px-2 rounded-none" onClick={() => setViewMode("table")}>
                  <List className="h-3.5 w-3.5" />
                </Button>
                <Button variant={viewMode === "card" ? "default" : "ghost"} size="sm" className="h-7 px-2 rounded-none" onClick={() => setViewMode("card")}>
                  <Grid className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchInvoices}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Search + create buttons */}
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Search invoices…"
                  className="pl-8 h-9 text-sm w-full sm:w-52"
                  value={searchTerm}
                  onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                />
              </div>
              <Button variant="outline" size="sm" className="h-9" onClick={() => setPerformOpen(true)}>
                <FileText className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Performance Invoice</span>
                <span className="sm:hidden">Sales</span>
              </Button>
              <Button size="sm" className="h-9" onClick={() => setTaxOpen(true)}>
                <Receipt className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">Tax Invoice</span>
                <span className="sm:hidden">Tax</span>
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="perform">
            <TabsList className="grid w-full grid-cols-2 mb-4 h-auto">
              <TabsTrigger value="perform" className="text-xs sm:text-sm py-2">
                <FileText className="h-3.5 w-3.5 mr-1" />
                <span className="hidden sm:inline">Performance</span>
                <span className="sm:hidden">Sales</span>
                <Badge variant="secondary" className="ml-1.5 text-xs">{performInvoices.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="tax" className="text-xs sm:text-sm py-2">
                <Receipt className="h-3.5 w-3.5 mr-1" />Tax
                <Badge variant="secondary" className="ml-1.5 text-xs">{taxInvoices.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="perform">
              {filteredPerform.length > 0 ? renderTable(paginate(filteredPerform)) : renderEmpty("perform")}
            </TabsContent>
            <TabsContent value="tax">
              {filteredTax.length > 0 ? renderTable(paginate(filteredTax)) : renderEmpty("tax")}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* ── Invoice forms ── */}
      <PerformInvoiceForm
        isOpen={performOpen}
        onClose={() => setPerformOpen(false)}
        onInvoiceCreate={handleCreateInvoice}
        performInvoicesCount={performInvoices.length}
        userId={userId}
        userRole={userRole}
      />
      <TaxInvoiceForm
        isOpen={taxOpen}
        onClose={() => setTaxOpen(false)}
        onInvoiceCreate={handleCreateInvoice}
        taxInvoicesCount={taxInvoices.length}
        userId={userId}
        userRole={userRole}
      />

      {/* ── Preview dialog ── */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-full sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm">Invoice Preview — {selectedInvoice?.id}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4 border rounded-lg p-4">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
                <div>
                  <h2 className="text-lg font-bold">{selectedInvoice.invoiceType === "tax" ? "TAX INVOICE" : "SALES ORDER"}</h2>
                  <p className="text-xs text-muted-foreground">{selectedInvoice.id}</p>
                  {selectedInvoice.voucherNo && selectedInvoice.voucherNo !== selectedInvoice.id && (
                    <p className="text-xs text-muted-foreground">Voucher: {selectedInvoice.voucherNo}</p>
                  )}
                </div>
                <Badge variant={getStatusColor(selectedInvoice.status)}>{selectedInvoice.status.toUpperCase()}</Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground font-medium">Consignee:</p>
                  <p className="font-semibold">{selectedInvoice.consignee ?? selectedInvoice.client}</p>
                  <p className="text-muted-foreground text-xs">{selectedInvoice.clientEmail}</p>
                  {selectedInvoice.consigneeAddress && <p className="text-xs mt-1 whitespace-pre-line">{selectedInvoice.consigneeAddress}</p>}
                </div>
                <div className="space-y-1 text-xs">
                  {[
                    ["Date", formatDate(selectedInvoice.date)],
                    ["Due", selectedInvoice.dueDate ? formatDate(selectedInvoice.dueDate) : "N/A"],
                    ["Service", selectedInvoice.serviceType ?? "N/A"],
                    ...(selectedInvoice.buyerRef ? [["Buyer Ref", selectedInvoice.buyerRef]] : []),
                  ].map(([l, v]) => (
                    <div key={l} className="flex justify-between">
                      <span className="text-muted-foreground">{l}:</span>
                      <span className="font-medium">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="overflow-x-auto border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Description</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {selectedInvoice.items.map((item, i) => (
                      <TableRow key={i}>
                        <TableCell className="text-sm">{item.description}</TableCell>
                        <TableCell className="text-right text-sm">{item.quantity}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(item.rate)}</TableCell>
                        <TableCell className="text-right text-sm">{formatCurrency(item.amount)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex justify-end">
                <div className="space-y-1 text-sm min-w-[220px]">
                  <div className="flex justify-between gap-6">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedInvoice.items.reduce((s, i) => s + i.amount, 0))}</span>
                  </div>
                  {selectedInvoice.invoiceType === "tax" ? (
                    <>
                      <div className="flex justify-between gap-6"><span>Mgmt Fees:</span><span>{formatCurrency(selectedInvoice.managementFeesAmount ?? 0)}</span></div>
                      <div className="flex justify-between gap-6"><span>SGST 9%:</span><span>{formatCurrency(selectedInvoice.tax / 2)}</span></div>
                      <div className="flex justify-between gap-6"><span>CGST 9%:</span><span>{formatCurrency(selectedInvoice.tax / 2)}</span></div>
                    </>
                  ) : (
                    <div className="flex justify-between gap-6"><span>GST 18%:</span><span>{formatCurrency(selectedInvoice.tax)}</span></div>
                  )}
                  <div className="flex justify-between gap-6 border-t pt-1 font-bold text-base">
                    <span>Total:</span><span className="text-primary">{formatCurrency(selectedInvoice.amount)}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button className="flex-1 h-9" onClick={() => { handleDownloadInvoice(selectedInvoice); setPreviewOpen(false); }}>
                  <Download className="h-4 w-4 mr-1" />Download PDF
                </Button>
                {selectedInvoice.status !== "paid" && (
                  <Button variant="outline" className="flex-1 h-9" onClick={() => handleMarkAsPaid(selectedInvoice.id)} disabled={markingPaidId === selectedInvoice.id}>
                    {markingPaidId === selectedInvoice.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                    Mark as Paid
                  </Button>
                )}
                <Button variant="outline" className="flex-1 h-9" onClick={() => setPreviewOpen(false)}>Close</Button>
                <Button variant="destructive" className="flex-1 h-9" disabled={deletingId === selectedInvoice.id}
                  onClick={() => { if (window.confirm("Delete this invoice?")) { handleDeleteInvoice(selectedInvoice.id); setPreviewOpen(false); } }}>
                  {deletingId === selectedInvoice.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
                  Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Share dialog ── */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Share Invoice</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">Share <strong>{selectedInvoice.id}</strong> with an admin by entering their user ID:</p>
              <Input placeholder="Admin user ID" value={shareUserId} onChange={e => setShareUserId(e.target.value)} className="h-10 text-sm" />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 h-9" onClick={() => { setShareOpen(false); setShareUserId(""); }}>Cancel</Button>
                <Button className="flex-1 h-9" disabled={!shareUserId.trim() || sharingId === selectedInvoice.id}
                  onClick={() => handleShareInvoice(selectedInvoice.id, shareUserId)}>
                  {sharingId === selectedInvoice.id ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Share2 className="h-4 w-4 mr-1" />}
                  Share
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Print dialog ── */}
      {printInvoice && (
        <SKTaxInvoicePrint invoice={printInvoice} onClose={() => setPrintInvoice(null)} />
      )}
    </>
  );
};

export default InvoicesTab;