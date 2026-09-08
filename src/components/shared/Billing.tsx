/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { DashboardHeader } from "@/components/shared/DashboardHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, FileText, DollarSign, TrendingUp, Eye, Download, Upload,
  IndianRupee, Calendar, Clock, CreditCard, Banknote, Receipt, Edit,
  Users, Filter, FileDown, Building, Home, Shield, Car, Trash2,
  Droplets, Package, List, Grid, ChevronLeft, ChevronRight, Search,
  AlertTriangle, BarChart3, PieChart, ChevronDown, MoreVertical, Menu,
  X, ChevronUp, CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { useOutletContext } from "react-router-dom";
import PaymentSummaryTab from "./PaymentSummaryTab";
import InvoicesTab from "./Invoice";
import ExpensesTab from "./ExpensesTab";
import LedgerBalanceTab from "./LedgerBalanceTab";
import { useRole } from "@/context/RoleContext";
import InvoiceService from "@/services/InvoiceService";
import { ExpenseService, Expense } from "@/services/expenseService";
import { siteService } from "@/services/SiteService";
import PaymentService from "@/services/PaymentService";

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface InvoiceItem {
  description: string;
  quantity: number;
  rate: number;
  amount: number;
  unit?: string;
  designation?: string;
  days?: number;
  hours?: number;
  monthlyRate?: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  voucherNo?: string;
  invoiceType: 'perform' | 'tax';
  status: 'pending' | 'paid' | 'overdue';
  date: string;
  dueDate?: string;
  createdBy?: string;
  userId?: string;
  sharedWith?: string[];
  client: string;
  clientEmail?: string;
  clientAddress?: string;
  companyName?: string;
  companyAddress?: string;
  companyGSTIN?: string;
  companyState?: string;
  companyStateCode?: string;
  companyEmail?: string;
  consignee?: string;
  consigneeAddress?: string;
  consigneeGSTIN?: string;
  consigneeState?: string;
  consigneeStateCode?: string;
  buyer?: string;
  buyerAddress?: string;
  buyerGSTIN?: string;
  buyerState?: string;
  buyerStateCode?: string;
  buyerRef?: string;
  dispatchedThrough?: string;
  paymentTerms?: string;
  notes?: string;
  site?: string;
  destination?: string;
  deliveryTerms?: string;
  serviceType?: string;
  items: InvoiceItem[];
  amount: number;
  subtotal?: number;
  tax: number;
  discount?: number;
  roundUp?: number;
  managementFeesPercent?: number;
  managementFeesAmount?: number;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  branchAndIFSC?: string;
  amountInWords?: string;
  paymentMethod?: string;
  servicePeriodFrom?: string;
  servicePeriodTo?: string;
  panNumber?: string;
  gstNumber?: string;
  esicNumber?: string;
  lwfNumber?: string;
  pfNumber?: string;
  sacCode?: string;
  serviceLocation?: string;
  termsConditions?: string;
  ifscCode?: string;
}

export interface LocalPayment {
  id: string;
  invoiceId: string;
  client: string;
  amount: number;
  date: string;
  method: string;
  status: "completed" | "failed" | "pending";
}

export interface LedgerEntry {
  id: string;
  party: string;
  type: "invoice" | "payment" | "expense" | "credit_note";
  reference: string;
  date: string;
  debit: number;
  credit: number;
  balance: number;
  description: string;
  status: string;
  site?: string;
  serviceType?: string;
}

export interface PartyBalance {
  party: string;
  totalDebit: number;
  totalCredit: number;
  currentBalance: number;
  lastTransaction: string;
  status: "credit" | "debit" | "settled";
  site?: string;
}

export interface SiteProfit {
  site: string;
  revenue: number;
  expenses: number;
  netProfit: number;
  profitMargin: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getExpenseSiteName = (exp: Expense): string =>
  typeof exp.siteId === "object" ? exp.siteId.name : (exp.siteId || "");

// ─── Mobile Responsive Components ──────────────────────────────────────────

const MobileStatCard = ({
  title,
  value,
  icon: Icon,
  color = "primary",
  subtitle
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  color?: string;
  subtitle?: string;
}) => {
  const colorClasses = {
    primary: "text-primary bg-primary/10",
    success: "text-green-600 bg-green-100",
    warning: "text-yellow-600 bg-yellow-100",
    danger: "text-red-600 bg-red-100",
    purple: "text-purple-600 bg-purple-100"
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-2.5">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <p className="text-[11px] text-muted-foreground truncate">{title}</p>
            <p className="text-lg font-bold mt-0.5 truncate">{value}</p>
            {subtitle && <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>}
          </div>
          <div className={`p-2 rounded-lg shrink-0 ${colorClasses[color as keyof typeof colorClasses]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const MobileInvoiceCard = ({
  invoice,
  onView,
  onDownload,
  onMarkPaid,
  formatCurrency,
  getStatusColor
}: any) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="mb-2.5 overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">{invoice.invoiceNumber}</h3>
              <Badge variant={getStatusColor(invoice.status)} className="text-xs">{invoice.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{invoice.client}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(invoice)}>
                  <Eye className="h-4 w-4 mr-2" /> View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDownload(invoice)}>
                  <Download className="h-4 w-4 mr-2" /> Download
                </DropdownMenuItem>
                {invoice.status !== 'paid' && (
                  <DropdownMenuItem onClick={() => onMarkPaid(invoice.id)}>
                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" /> Mark as Paid
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{invoice.date}</span>
          </div>
          <span className="font-bold text-primary text-sm">{formatCurrency(invoice.amount)}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          {invoice.site && (
            <Badge variant="outline" className="text-xs">
              <Building className="h-3 w-3 mr-1" />
              {invoice.site}
            </Badge>
          )}
          {invoice.serviceType && (
            <Badge variant="outline" className="text-xs">{invoice.serviceType}</Badge>
          )}
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <div><p className="text-xs text-muted-foreground">Client Email</p><p className="text-sm">{invoice.clientEmail || 'N/A'}</p></div>
            <div><p className="text-xs text-muted-foreground">Due Date</p><p className="text-sm">{invoice.dueDate || 'N/A'}</p></div>
            <div><p className="text-xs text-muted-foreground">Payment Method</p><p className="text-sm">{invoice.paymentMethod || 'N/A'}</p></div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Items</p>
              {invoice.items.slice(0, 2).map((item: any, idx: number) => (
                <div key={idx} className="text-xs flex justify-between">
                  <span className="truncate max-w-[60%]">{item.description}</span>
                  <span>{formatCurrency(item.amount)}</span>
                </div>
              ))}
              {invoice.items.length > 2 && (
                <p className="text-xs text-muted-foreground">+{invoice.items.length - 2} more items</p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const MobileExpenseCard = ({
  expense,
  onEdit,
  formatCurrency,
  getStatusColor,
  getExpenseTypeColor
}: any) => {
  const [expanded, setExpanded] = useState(false);

  // expense.status no longer exists – we use a fixed "recorded" status for display
  const displayStatus = "recorded";

  return (
    <Card className="mb-2.5 overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">{expense._id}</h3>
              <Badge variant="outline" className="text-xs">{displayStatus}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{expense.description}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(expense)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpanded(!expanded)}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <Badge className={`text-xs ${getExpenseTypeColor(expense.expenseType)}`}>
            {expense.expenseType}
          </Badge>
          <span className="font-bold text-red-600 text-sm">{formatCurrency(expense.amount)}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
          <Calendar className="h-3 w-3" />
          <span>{expense.date}</span>
          {getExpenseSiteName(expense) && (
            <>
              <span>·</span>
              <Building className="h-3 w-3" />
              <span>{getExpenseSiteName(expense)}</span>
            </>
          )}
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-2">
            <div><p className="text-xs text-muted-foreground">Category</p><p className="text-sm">{expense.category}</p></div>
            <div><p className="text-xs text-muted-foreground">Vendor</p><p className="text-sm">{expense.vendor}</p></div>
            <div><p className="text-xs text-muted-foreground">Payment Method</p><p className="text-sm">{expense.paymentMethod}</p></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

const MobilePaymentCard = ({
  payment,
  formatCurrency,
  getStatusColor
}: any) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="mb-2.5 overflow-hidden">
      <CardContent className="p-3">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-sm">{payment.id}</h3>
              <Badge variant={getStatusColor(payment.status)} className="text-xs">{payment.status}</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{payment.client}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>

        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            <span>{payment.date}</span>
          </div>
          <span className="font-bold text-green-600 text-sm">{formatCurrency(payment.amount)}</span>
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs text-muted-foreground">
          <CreditCard className="h-3 w-3" />
          <span>{payment.method}</span>
          <span>·</span>
          <span>Invoice: {payment.invoiceId}</span>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t space-y-1.5">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Invoice ID</span><span className="font-medium">{payment.invoiceId}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Client</span><span className="font-medium">{payment.client}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Amount</span><span className="font-medium">{formatCurrency(payment.amount)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Method</span><span className="font-medium">{payment.method}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Date</span><span className="font-medium">{payment.date}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Status</span><span className="font-medium">{payment.status}</span></div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ─── Utility Functions ──────────────────────────────────────────────────────

export const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case "paid": case "completed": case "approved": return "default";
    case "pending": return "secondary";
    case "overdue": case "failed": case "rejected": return "destructive";
    default: return "outline";
  }
};

export const getBalanceColor = (balance: number) => {
  if (balance > 0) return "text-green-600";
  if (balance < 0) return "text-red-600";
  return "text-gray-600";
};

export const getBalanceBadgeVariant = (status: string) => {
  switch (status) {
    case "debit": return "default";
    case "credit": return "destructive";
    case "settled": return "secondary";
    default: return "outline";
  }
};

export const getServiceIcon = (serviceType: string) => {
  switch (serviceType) {
    case "Housekeeping Management": return <Home className="h-4 w-4" />;
    case "Security Management": return <Shield className="h-4 w-4" />;
    case "Parking Management": return <Car className="h-4 w-4" />;
    case "Waste Management": return <Trash2 className="h-4 w-4" />;
    case "STP Tank Cleaning": return <Droplets className="h-4 w-4" />;
    case "Consumables Supply": return <Package className="h-4 w-4" />;
    default: return <Building className="h-4 w-4" />;
  }
};

export const getTypeIcon = (type: string) => {
  switch (type) {
    case "invoice": return <FileText className="h-4 w-4 text-blue-600" />;
    case "payment": return <DollarSign className="h-4 w-4 text-green-600" />;
    case "expense": return <Receipt className="h-4 w-4 text-red-600" />;
    case "credit_note": return <CreditCard className="h-4 w-4 text-purple-600" />;
    default: return <FileText className="h-4 w-4 text-gray-600" />;
  }
};

export const getExpenseTypeColor = (type: string) => {
  switch (type) {
    case "operational": return "bg-blue-100 text-blue-800 border-blue-200";
    case "office": return "bg-green-100 text-green-800 border-green-200";
    case "other": return "bg-purple-100 text-purple-800 border-purple-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

export const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
};

// ─── Mapping Helpers for Invoice & Payment ─────────────────────────────────

const mapInvoice = (inv: any): Invoice => ({
  id: inv._id || inv.id || '',
  invoiceNumber: inv.invoiceNumber || '',
  voucherNo: inv.voucherNo,
  invoiceType: inv.invoiceType || 'perform',
  status: inv.status || 'pending',
  date: inv.date || new Date().toISOString().split('T')[0],
  dueDate: inv.dueDate,
  createdBy: inv.createdBy,
  userId: inv.userId,
  sharedWith: inv.sharedWith || [],
  client: inv.client || '',
  clientEmail: inv.clientEmail,
  clientAddress: inv.clientAddress,
  companyName: inv.companyName,
  companyAddress: inv.companyAddress,
  companyGSTIN: inv.companyGSTIN,
  companyState: inv.companyState,
  companyStateCode: inv.companyStateCode,
  companyEmail: inv.companyEmail,
  consignee: inv.consignee,
  consigneeAddress: inv.consigneeAddress,
  consigneeGSTIN: inv.consigneeGSTIN,
  consigneeState: inv.consigneeState,
  consigneeStateCode: inv.consigneeStateCode,
  buyer: inv.buyer,
  buyerAddress: inv.buyerAddress,
  buyerGSTIN: inv.buyerGSTIN,
  buyerState: inv.buyerState,
  buyerStateCode: inv.buyerStateCode,
  buyerRef: inv.buyerRef,
  dispatchedThrough: inv.dispatchedThrough,
  paymentTerms: inv.paymentTerms,
  notes: inv.notes,
  site: inv.site,
  destination: inv.destination,
  deliveryTerms: inv.deliveryTerms,
  serviceType: inv.serviceType,
  items: (inv.items || []).map((item: any) => ({
    description: item.description || '',
    quantity: Number(item.quantity) || 0,
    rate: Number(item.rate) || 0,
    amount: Number(item.amount) || 0,
    unit: item.unit,
    designation: item.designation,
    days: item.days,
    hours: item.hours,
    monthlyRate: item.monthlyRate
  })),
  amount: Number(inv.amount) || 0,
  subtotal: inv.subtotal,
  tax: Number(inv.tax) || 0,
  discount: Number(inv.discount) || 0,
  roundUp: inv.roundUp,
  managementFeesPercent: inv.managementFeesPercent,
  managementFeesAmount: inv.managementFeesAmount,
  bankName: inv.bankName,
  accountNumber: inv.accountNumber,
  accountHolder: inv.accountHolder,
  branchAndIFSC: inv.branchAndIFSC,
  amountInWords: inv.amountInWords,
  paymentMethod: inv.paymentMethod,
  servicePeriodFrom: inv.servicePeriodFrom,
  servicePeriodTo: inv.servicePeriodTo,
  panNumber: inv.panNumber,
  gstNumber: inv.gstNumber,
  esicNumber: inv.esicNumber,
  lwfNumber: inv.lwfNumber,
  pfNumber: inv.pfNumber,
  sacCode: inv.sacCode,
  serviceLocation: inv.serviceLocation,
  termsConditions: inv.termsConditions,
  ifscCode: inv.ifscCode,
});

const mapPayment = (pay: any): LocalPayment => ({
  id: pay._id || pay.id || '',
  invoiceId: pay.invoiceId || '',
  client: pay.client || '',
  amount: Number(pay.amount) || 0,
  date: pay.date || new Date().toISOString().split('T')[0],
  method: pay.method || '',
  status: pay.status || 'pending',
});

// ─── Main Component ──────────────────────────────────────────────────────────

const Billing = () => {
  const { onMenuClick } = useOutletContext<{ onMenuClick: () => void }>();
  const { user } = useRole();
  const userId = user?._id || user?.id;
  const userRole = user?.role || 'superadmin';

  const [isMobileView, setIsMobileView] = useState(false);
  const [activeTab, setActiveTab] = useState("invoices");
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partyBalances, setPartyBalances] = useState<PartyBalance[]>([]);
  const [siteProfits, setSiteProfits] = useState<SiteProfit[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [payments, setPayments] = useState<LocalPayment[]>([]);
  const [sites, setSites] = useState<string[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  const invoiceService = new InvoiceService(userId, userRole);
  const expenseService = new ExpenseService();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // ── Data Fetch ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAllDataAndSites = async () => {
      setLoading(true);
      setError(null);
      try {
        const [invoicesData, expensesData, sitesData] = await Promise.all([
          invoiceService.getAllInvoices().catch(() => []),
          expenseService.getExpenses().catch(() => []),
          siteService.getAllSites().catch(() => [])
        ]);

        setInvoices((invoicesData || []).map(mapInvoice));
        setExpenses(expensesData || []);
        const siteNames = (sitesData || []).map((s: any) => s.name);
        setSites(siteNames);

        try {
          const paymentsData = await PaymentService.getAllPayments().then(res => res.data);
          setPayments((paymentsData || []).map(mapPayment));
        } catch (payErr) {
          console.warn('Payments API not available – using empty data', payErr);
          setPayments([]);
          toast.warning('Payments data could not be loaded, some features may be limited');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load billing data');
        toast.error('Could not load billing data');
      } finally {
        setLoading(false);
      }
    };

    fetchAllDataAndSites();   // ← ADD THIS LINE
  }, [userId, userRole]);

  // ── Calculations ────────────────────────────────────────────────────────────

  const totalRevenue = invoices
    .filter(i => i.status === "paid")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const pendingAmount = invoices
    .filter(i => i.status === "pending")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const overdueAmount = invoices
    .filter(i => i.status === "overdue")
    .reduce((sum, inv) => sum + inv.amount, 0);

  // No status field on Expense, so we count all as recorded
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  const netProfit = totalRevenue - totalExpenses;

  // ── Ledger & Profit ─────────────────────────────────────────────────────────

  const initializeLedger = () => {
    const entries: LedgerEntry[] = [];
    const balances: { [key: string]: PartyBalance } = {};

    invoices.forEach(invoice => {
      const entry: LedgerEntry = {
        id: `LED-${invoice.id}`,
        party: invoice.site || "Unknown Site",
        type: "invoice",
        reference: invoice.id,
        date: invoice.date,
        debit: invoice.amount,
        credit: 0,
        balance: 0,
        description: `${invoice.serviceType} - ${invoice.client}`,
        status: invoice.status,
        site: invoice.site,
        serviceType: invoice.serviceType
      };
      entries.push(entry);

      if (!balances[invoice.site || "Unknown Site"]) {
        balances[invoice.site || "Unknown Site"] = {
          party: invoice.site || "Unknown Site",
          totalDebit: 0,
          totalCredit: 0,
          currentBalance: 0,
          lastTransaction: invoice.date,
          status: "debit",
          site: invoice.site
        };
      }
      balances[invoice.site || "Unknown Site"].totalDebit += invoice.amount;
      balances[invoice.site || "Unknown Site"].lastTransaction = invoice.date;
    });

    payments.forEach(payment => {
      if (payment.status === "completed") {
        const invoice = invoices.find(inv => inv.id === payment.invoiceId);
        const site = invoice?.site || "Unknown Site";
        const entry: LedgerEntry = {
          id: `LED-${payment.id}`,
          party: site,
          type: "payment",
          reference: payment.id,
          date: payment.date,
          debit: 0,
          credit: payment.amount,
          balance: 0,
          description: `Payment from ${payment.client}`,
          status: payment.status,
          site: site
        };
        entries.push(entry);
        if (!balances[site]) {
          balances[site] = {
            party: site,
            totalDebit: 0,
            totalCredit: 0,
            currentBalance: 0,
            lastTransaction: payment.date,
            status: "credit",
            site: site
          };
        }
        balances[site].totalCredit += payment.amount;
        balances[site].lastTransaction = payment.date;
      }
    });

    expenses.forEach(expense => {
      const siteName = getExpenseSiteName(expense) || "Unknown Site";
      const entry: LedgerEntry = {
        id: `LED-${expense._id}`,
        party: siteName,
        type: "expense",
        reference: expense._id,
        date: expense.date,
        debit: 0,
        credit: expense.amount,
        balance: 0,
        description: `${expense.description} - ${expense.vendor}`,
        status: "recorded",
        site: siteName
      };
      entries.push(entry);
      if (!balances[siteName]) {
        balances[siteName] = {
          party: siteName,
          totalDebit: 0,
          totalCredit: 0,
          currentBalance: 0,
          lastTransaction: expense.date,
          status: "credit",
          site: siteName
        };
      }
      balances[siteName].totalCredit += expense.amount;
      balances[siteName].lastTransaction = expense.date;
    });

    const sortedEntries = entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const partyRunningBalances: { [key: string]: number } = {};
    sortedEntries.forEach(entry => {
      if (!partyRunningBalances[entry.party]) partyRunningBalances[entry.party] = 0;
      partyRunningBalances[entry.party] += entry.debit - entry.credit;
      entry.balance = partyRunningBalances[entry.party];
    });

    Object.keys(balances).forEach(party => {
      balances[party].currentBalance = partyRunningBalances[party] || 0;
      balances[party].status = balances[party].currentBalance > 0 ? "debit" : balances[party].currentBalance < 0 ? "credit" : "settled";
    });

    setLedgerEntries(sortedEntries);
    setPartyBalances(Object.values(balances));
  };

  const calculateSiteProfits = () => {
    const profits: SiteProfit[] = sites.map(site => {
      const siteInvoices = invoices.filter(inv => inv.site === site && inv.status === "paid");
      const siteExpenses = expenses.filter(exp => getExpenseSiteName(exp) === site);
      const revenue = siteInvoices.reduce((sum, inv) => sum + inv.amount, 0);
      const expensesTotal = siteExpenses.reduce((sum, exp) => sum + exp.amount, 0);
      const netProfit = revenue - expensesTotal;
      const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;
      return { site, revenue, expenses: expensesTotal, netProfit, profitMargin };
    });
    setSiteProfits(profits);
  };

  useEffect(() => {
    initializeLedger();
    calculateSiteProfits();
  }, [invoices, payments, expenses, sites]);

  // ── Event Handlers ──────────────────────────────────────────────────────────

  const handleCreateInvoice = (invoice: Invoice) => {
    // The invoice is already saved by InvoicesTab – just add to local state
    setInvoices(prev => [mapInvoice(invoice), ...prev]);
    toast.success('Invoice created successfully!');
  };
  // ─── Refresh Invoices ──────────────────────────────────────────────────
  const refreshInvoices = async () => {
    try {
      const invoicesData = await invoiceService.getAllInvoices();
      setInvoices(invoicesData.map(mapInvoice));
      toast.success('Invoices refreshed');
    } catch (err: any) {
      toast.error(err.message || 'Failed to refresh invoices');
    }
  };
  // These handlers only update local state – ExpensesTab already did the API call
  const handleAddExpense = (expense: Expense) => {
    setExpenses(prev => [expense, ...prev]);
  };

  const handleUpdateExpense = (expense: Expense) => {
    setExpenses(prev => prev.map(exp => exp._id === expense._id ? expense : exp));
  };

  const handleMarkAsPaid = async (invoiceId: string) => {
    try {
      const updatedInvoice = await invoiceService.markAsPaid(invoiceId);
      setInvoices(prev => prev.map(inv => inv.id === invoiceId ? mapInvoice(updatedInvoice) : inv));
      toast.success('Invoice marked as paid!');
    } catch (err: any) {
      toast.error(err.message || 'Failed to mark as paid');
    }
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    const invoiceContent = `
      INVOICE: ${invoice.id}
      Client: ${invoice.client}
      Email: ${invoice.clientEmail}
      Date: ${invoice.date}
      Due Date: ${invoice.dueDate}
      Status: ${invoice.status}
      Service Type: ${invoice.serviceType}
      Site: ${invoice.site}
      Items:
      ${invoice.items.map(item => `
        ${item.description} - Qty: ${item.quantity} - Rate: ₹${item.rate} - Amount: ₹${item.amount}
      `).join('')}
      Subtotal: ₹${invoice.items.reduce((sum, item) => sum + item.amount, 0)}
      GST (18%): ₹${invoice.tax}
      Discount: ₹${invoice.discount}
      Total: ₹${invoice.amount}
    `;
    const blob = new Blob([invoiceContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `invoice-${invoice.id}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(`Invoice ${invoice.id} downloaded!`);
  };

  const handleExportData = (type: string) => {
    let data: any[] = [];
    let filename = "";
    let headers: string[] = [];
    let csvContent = "";

    switch (type) {
      case "payments":
        data = payments;
        filename = "payments-export.csv";
        headers = ["ID", "Invoice ID", "Client", "Amount", "Date", "Method", "Status"];
        csvContent = [
          headers.join(","),
          ...data.map(payment => [
            payment.id,
            payment.invoiceId,
            `"${payment.client}"`,
            payment.amount,
            payment.date,
            payment.method,
            payment.status
          ].join(","))
        ].join("\n");
        break;
      case "invoices":
        data = invoices;
        filename = "invoices-export.csv";
        headers = ["ID", "Client", "Client Email", "Amount", "Status", "Date", "Due Date", "Service Type", "Site", "Payment Method"];
        csvContent = [
          headers.join(","),
          ...data.map(invoice => [
            invoice.id,
            `"${invoice.client}"`,
            invoice.clientEmail,
            invoice.amount,
            invoice.status,
            invoice.date,
            invoice.dueDate,
            invoice.serviceType || "",
            invoice.site || "",
            invoice.paymentMethod || ""
          ].join(","))
        ].join("\n");
        break;
      case "expenses":
        data = expenses;
        filename = "expenses-export.csv";
        headers = ["ID", "Category", "Description", "Amount", "Date", "Vendor", "Payment Method", "Site", "Expense Type"];
        csvContent = [
          headers.join(","),
          ...data.map(expense => [
            expense._id,
            expense.category,
            `"${expense.description}"`,
            expense.amount,
            expense.date,
            `"${expense.vendor}"`,
            expense.paymentMethod,
            getExpenseSiteName(expense) || "",
            expense.expenseType
          ].join(","))
        ].join("\n");
        break;
      case "site-profits":
        data = siteProfits;
        filename = "site-profits-export.csv";
        headers = ["Site", "Revenue", "Expenses", "Net Profit", "Profit Margin %"];
        csvContent = [
          headers.join(","),
          ...data.map(profit => [
            `"${profit.site}"`,
            profit.revenue,
            profit.expenses,
            profit.netProfit,
            profit.profitMargin.toFixed(2)
          ].join(","))
        ].join("\n");
        break;
      default:
        return;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} data exported successfully!`);
  };

  // ─── Tabs Options ──────────────────────────────────────────────────────────

  const tabOptions = [
    { value: "invoices", label: "Invoices", icon: <FileText className="h-4 w-4 mr-2" /> },
    { value: "expenses", label: "Expenses", icon: <Receipt className="h-4 w-4 mr-2" /> },
    { value: "payments", label: "Payment Summary", icon: <CreditCard className="h-4 w-4 mr-2" /> },
    { value: "ledger", label: "Ledger & Balance", icon: <DollarSign className="h-4 w-4 mr-2" /> }
  ];

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background">
      <DashboardHeader title="Billing & Finance" onMenuClick={onMenuClick} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-2.5 sm:p-6 space-y-3"
      >
        {/* Stats Cards – Compact for mobile */}
        <div className="grid grid-cols-2 gap-2">
          <MobileStatCard
            title="Revenue"
            value={formatCurrency(totalRevenue)}
            icon={IndianRupee}
            color="primary"
            subtitle={`${invoices.filter(i => i.status === "paid").length} paid`}
          />
          <MobileStatCard
            title="Pending"
            value={formatCurrency(pendingAmount)}
            icon={AlertTriangle}
            color="warning"
            subtitle={`${invoices.filter(i => i.status === "pending").length} pending`}
          />
          <MobileStatCard
            title="Overdue"
            value={formatCurrency(overdueAmount)}
            icon={AlertTriangle}
            color="danger"
            subtitle={`${invoices.filter(i => i.status === "overdue").length} overdue`}
          />
          <MobileStatCard
            title="Net Profit"
            value={formatCurrency(netProfit)}
            icon={TrendingUp}
            color={netProfit >= 0 ? "success" : "danger"}
            subtitle="Revenue - Expenses"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {/* Desktop Tabs */}
          <div className="hidden sm:block">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="invoices">Invoices</TabsTrigger>
              <TabsTrigger value="expenses">Expenses</TabsTrigger>
              <TabsTrigger value="payments">Payment Summary</TabsTrigger>
              <TabsTrigger value="ledger">Ledger & Balance</TabsTrigger>
            </TabsList>
          </div>

          {/* Mobile Dropdown */}
          <div className="sm:hidden mb-3">
            <Select value={activeTab} onValueChange={setActiveTab}>
              <SelectTrigger className="w-full bg-white h-10">
                <SelectValue>
                  <div className="flex items-center">
                    {tabOptions.find(option => option.value === activeTab)?.icon}
                    <span className="text-sm">{tabOptions.find(option => option.value === activeTab)?.label}</span>
                  </div>
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tabOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center">
                      {option.icon}
                      <span className="text-sm">{option.label}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <TabsContent value="invoices">
            <InvoicesTab
              invoices={invoices}
              onInvoiceCreate={handleCreateInvoice}
              onMarkAsPaid={handleMarkAsPaid}
              onRefreshInvoices={refreshInvoices}   // ← new prop
              userId={userId}
              userRole={userRole}
            />
          </TabsContent>

          <TabsContent value="expenses">
            <ExpensesTab
              expenses={expenses}
              onExpenseAdd={handleAddExpense}
              onExpenseUpdate={handleUpdateExpense}
            />
          </TabsContent>

          <TabsContent value="payments">
            <PaymentSummaryTab
              invoices={invoices}
              payments={payments}
              expenses={expenses}
              onExportData={handleExportData}
            />
          </TabsContent>

          <TabsContent value="ledger">
            <LedgerBalanceTab
              ledgerEntries={ledgerEntries}
              partyBalances={partyBalances}
              onExportData={handleExportData}
            />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
};

export default Billing;