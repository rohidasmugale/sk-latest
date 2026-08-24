import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Trash2, Loader2, Building2, Users, AlertCircle } from "lucide-react";
import { siteService, Site } from "../../services/SiteService";
import { Invoice, InvoiceItem } from ".";

interface TaxInvoiceItem {
  description: string;
  designation: string;
  quantity: number;
  days: number;
  hours: number;
  rate: number;
  amount: number;
}

interface TaxInvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceCreate: (invoice: Invoice) => void;
  taxInvoicesCount: number;
  userId?: string;
  userRole?: string;
}

interface SiteOption {
  _id: string;
  name: string;
  clientName: string;
  location: string;
  clientDetails?: {
    company: string;
    email: string;
    phone: string;
    city: string;
    state: string;
  };
}

export const TaxInvoiceForm: React.FC<TaxInvoiceFormProps> = ({
  isOpen,
  onClose,
  onInvoiceCreate,
  taxInvoicesCount,
  userId = "current-user",
  userRole = "admin"
}) => {
  const [items, setItems] = useState<TaxInvoiceItem[]>([
    { description: "Garbage Disposal Charges", designation: "", quantity: 1, days: 1, hours: 1, rate: 7500, amount: 7500 }
  ]);
  const [managementFeesPercent, setManagementFeesPercent] = useState<number>(0);
  const [roundUp, setRoundUp] = useState<number>(0);
  const [sites, setSites] = useState<SiteOption[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [sitesError, setSitesError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    clientName: "",
    clientAddress: "",
    invoiceNumber: "",
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: "",
    panNumber: "",
    serviceTaxCategory: "",
    esicNumber: "",
    gstNumber: "",
    lwfNumber: "",
    pfNumber: "",
    sacCode: "999424",
    serviceLocation: "Maharashtra",
    servicePeriodFrom: "",
    servicePeriodTo: "",
    bankName: "BANK OF MAHARASHTRA",
    accountNumber: "61068661338",
    ifscCode: "MAHB0001223",
    // branch removed – not part of Invoice
    termsConditions: "We declare that this invoice shows the actual price of the goods & service described and that all particulars are true and correct.",
    selectedSiteId: "",
    consigneeName: "",
    consigneeAddress: "",
    consigneeGSTIN: "",
    buyerName: "",
    buyerAddress: "",
    buyerGSTIN: "",
    buyerState: "",
    buyerStateCode: "",
    enterpriseName: "S.K. ENTERPRISES",
    enterpriseAddress: "Office No.505, 5th Floor, Global Square Building, Deccan College Road, Yerawada, Pune - 411006",
    enterprisePhone: "+91 9158984091 / +91 7028577271",
    enterpriseEmail: "s.k.enterprises7583@gmail.com",
    enterprisePan: "ALKPK7734N",
    enterpriseGst: "27ALKPK7734NL2E",
    enterpriseEsic: "33000457830001001",
    enterpriseLwf: "PUN60715PROV",
    enterprisePf: "PUPUN1012226",
    serviceCategory: "Manpower",
    clientEmail: "client@example.com"
  });

  useEffect(() => {
    if (isOpen) {
      fetchSites();
    }
  }, [isOpen]);

  const fetchSites = async () => {
    try {
      setLoadingSites(true);
      setSitesError(null);
      const allSites = await siteService.getAllSites();

      const siteOptions = allSites.map((site: Site) => ({
        _id: site._id,
        name: site.name,
        clientName: site.clientName,
        location: site.location,
        clientDetails: site.clientDetails
      }));

      setSites(siteOptions);
    } catch (error) {
      console.error("Error fetching sites:", error);
      setSitesError("Failed to load sites. Please try again.");
    } finally {
      setLoadingSites(false);
    }
  };

  const handleSiteSelect = (siteId: string) => {
    const selectedSite = sites.find(site => site._id === siteId);
    if (selectedSite) {
      setFormData(prev => ({
        ...prev,
        selectedSiteId: siteId,
        clientName: selectedSite.clientName,
        clientAddress: `Gala No.3, Sr No 234, 235, Tal - Mulshi, Hingjwadi, Pune-411057`,
        consigneeName: selectedSite.clientName,
        consigneeAddress: selectedSite.location,
        buyerName: selectedSite.clientName,
        buyerAddress: selectedSite.location,
        serviceLocation: "Maharashtra",
        panNumber: "ALKPK7734N",
        gstNumber: "27AAHFH01651J12D",
        esicNumber: "33000457830001001",
        lwfNumber: "PUN60715PROV",
        pfNumber: "PUPUN1012226",
        clientEmail: selectedSite.clientDetails?.email || "client@example.com"
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const taxableValue = items.reduce((sum, item) => sum + item.amount, 0);
      const managementFees = (taxableValue * managementFeesPercent) / 100;
      const netTaxableValue = taxableValue + managementFees;
      const sgst = netTaxableValue * 0.09;
      const cgst = netTaxableValue * 0.09;
      const totalAmountBeforeRound = netTaxableValue + sgst + cgst;
      const roundedTotalAmount = Math.round(totalAmountBeforeRound + roundUp);
      const finalRoundUp = roundedTotalAmount - totalAmountBeforeRound;

      // Check if any item has 0 amount
      const zeroAmountItems = items.filter(item => item.amount <= 0);
      if (zeroAmountItems.length > 0) {
        alert(`Cannot submit: ${zeroAmountItems.length} item(s) have ₹0 amount. Please add a rate for all items.`);
        setIsSubmitting(false);
        return;
      }

      const invoiceItems: InvoiceItem[] = items.map(item => ({
        description: item.description,
        designation: item.designation,
        quantity: item.quantity,
        days: item.days,
        hours: item.hours,
        rate: item.rate,
        amount: item.amount,
        monthlyRate: item.rate
      }));

      // Generate unique invoice number with timestamp to avoid duplicates
      let invoiceNumber = formData.invoiceNumber;
      if (!invoiceNumber) {
        // Use a high‑precision timestamp (milliseconds) and a 4‑digit random suffix
        const timestamp = Date.now().toString();                // e.g., "1715678901234"
        const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const seq = String(taxInvoicesCount + 1).padStart(3, '0');
        // Format: SK-2425-G001-1715678901234-1234
        invoiceNumber = `SK-2425-G${seq}-${timestamp}-${randomSuffix}`;
      }

      const newInvoice: Invoice = {
        id: invoiceNumber,
        invoiceNumber: invoiceNumber,
        client: formData.clientName,
        clientEmail: formData.clientEmail,
        clientAddress: formData.clientAddress,
        amount: roundedTotalAmount,
        status: "pending",
        date: formData.invoiceDate,
        dueDate: formData.dueDate || formData.invoiceDate,
        items: invoiceItems,
        tax: Number((sgst + cgst).toFixed(2)),
        discount: 0,
        subtotal: taxableValue,
        serviceType: formData.serviceCategory,
        site: formData.selectedSiteId,
        invoiceType: "tax",
        sacCode: formData.sacCode,
        panNumber: formData.panNumber,
        gstNumber: formData.gstNumber,
        serviceLocation: formData.serviceLocation,
        esicNumber: formData.esicNumber,
        lwfNumber: formData.lwfNumber,
        pfNumber: formData.pfNumber,
        servicePeriodFrom: formData.servicePeriodFrom,
        servicePeriodTo: formData.servicePeriodTo,
        managementFeesPercent: managementFeesPercent,
        managementFeesAmount: Number(managementFees.toFixed(2)),
        roundUp: Number(finalRoundUp.toFixed(2)),
        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        ifscCode: formData.ifscCode,
        consignee: formData.consigneeName,
        consigneeAddress: formData.consigneeAddress,
        consigneeGSTIN: formData.consigneeGSTIN,
        buyer: formData.buyerName,
        buyerAddress: formData.buyerAddress,
        buyerGSTIN: formData.buyerGSTIN,
        buyerState: formData.buyerState,
        buyerStateCode: formData.buyerStateCode,
        termsConditions: formData.termsConditions,
        createdBy: userRole,
        userId: userId
      };

      console.log("Submitting invoice:", newInvoice);
      onInvoiceCreate(newInvoice);
      onClose();
      resetForm();
    } catch (error) {
      console.error("Error in form submission:", error);
      alert(error instanceof Error ? error.message : "Failed to create invoice");
    } finally {
      setIsSubmitting(false);
    }
  };

  const addItem = () => {
    setItems([...items, { description: "", designation: "", quantity: 1, days: 1, hours: 1, rate: 0, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    }
  };

  const updateItem = (index: number, field: keyof TaxInvoiceItem, value: string | number) => {
    const newItems = [...items];
    const parsedValue = typeof value === 'string' ? (field === 'description' || field === 'designation' ? value : parseFloat(value) || 0) : value;

    newItems[index] = {
      ...newItems[index],
      [field]: parsedValue
    };

    if (field === 'rate' || field === 'quantity' || field === 'days' || field === 'hours') {
      const item = newItems[index];
      const totalUnits = (item.quantity || 1) * (item.days || 1) * (item.hours || 1);
      newItems[index].amount = Number((totalUnits * (item.rate || 0)).toFixed(2));
    }

    setItems(newItems);
  };

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const resetForm = () => {
    setItems([{ description: "Garbage Disposal Charges", designation: "", quantity: 1, days: 1, hours: 1, rate: 7500, amount: 7500 }]);
    setManagementFeesPercent(0);
    setRoundUp(0);
    setFormData({
      clientName: "",
      clientAddress: "",
      invoiceNumber: "",
      invoiceDate: new Date().toISOString().split('T')[0],
      dueDate: "",
      panNumber: "",
      serviceTaxCategory: "",
      esicNumber: "",
      gstNumber: "",
      lwfNumber: "",
      pfNumber: "",
      sacCode: "999424",
      serviceLocation: "Maharashtra",
      servicePeriodFrom: "",
      servicePeriodTo: "",
      bankName: "BANK OF MAHARASHTRA",
      accountNumber: "61068661338",
      ifscCode: "MAHB0001223",
      termsConditions: "We declare that this invoice shows the actual price of the goods & service described and that all particulars are true and correct.",
      selectedSiteId: "",
      consigneeName: "",
      consigneeAddress: "",
      consigneeGSTIN: "",
      buyerName: "",
      buyerAddress: "",
      buyerGSTIN: "",
      buyerState: "",
      buyerStateCode: "",
      enterpriseName: "S.K. ENTERPRISES",
      enterpriseAddress: "Office No.505, 5th Floor, Global Square Building, Deccan College Road, Yerawada, Pune - 411006",
      enterprisePhone: "+91 9158984091 / +91 7028577271",
      enterpriseEmail: "s.k.enterprises7583@gmail.com",
      enterprisePan: "ALKPK7734N",
      enterpriseGst: "27ALKPK7734NL2E",
      enterpriseEsic: "33000457830001001",
      enterpriseLwf: "PUN60715PROV",
      enterprisePf: "PUPUN1012226",
      serviceCategory: "Manpower",
      clientEmail: "client@example.com"
    });
  };

  const calculateSummary = () => {
    const taxableValue = items.reduce((sum, item) => sum + item.amount, 0);
    const managementFees = (taxableValue * managementFeesPercent) / 100;
    const netTaxableValue = taxableValue + managementFees;
    const sgst = netTaxableValue * 0.09;
    const cgst = netTaxableValue * 0.09;
    const totalAmountBeforeRound = netTaxableValue + sgst + cgst;
    const roundedTotalAmount = Math.round(totalAmountBeforeRound + roundUp);
    const finalRoundUp = roundedTotalAmount - totalAmountBeforeRound;

    return {
      taxableValue: Number(taxableValue.toFixed(2)),
      managementFees: Number(managementFees.toFixed(2)),
      netTaxableValue: Number(netTaxableValue.toFixed(2)),
      sgst: Number(sgst.toFixed(2)),
      cgst: Number(cgst.toFixed(2)),
      roundUp: Number(finalRoundUp.toFixed(2)),
      totalAmount: roundedTotalAmount,
      totalAmountBeforeRound: Number(totalAmountBeforeRound.toFixed(2))
    };
  };

  const summary = calculateSummary();

  const convertToIndianWords = (num: number) => {
    const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];

    function convert_hundreds(num: number) {
      let result = '';
      if (num >= 100) {
        result += ones[Math.floor(num / 100)] + ' Hundred ';
        num %= 100;
      }
      if (num >= 20) {
        result += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
      }
      if (num >= 10) {
        result += teens[num - 10] + ' ';
        return result;
      }
      if (num > 0) {
        result += ones[num] + ' ';
      }
      return result;
    }

    function convert_number(num: number) {
      if (num === 0) return 'Zero';

      let result = '';
      const crore = Math.floor(num / 10000000);
      if (crore > 0) {
        result += convert_hundreds(crore) + 'Crore ';
        num %= 10000000;
      }

      const lakh = Math.floor(num / 100000);
      if (lakh > 0) {
        result += convert_hundreds(lakh) + 'Lakh ';
        num %= 100000;
      }

      const thousand = Math.floor(num / 1000);
      if (thousand > 0) {
        result += convert_hundreds(thousand) + 'Thousand ';
        num %= 1000;
      }

      const hundred = Math.floor(num / 100);
      if (hundred > 0) {
        result += convert_hundreds(hundred) + 'Hundred ';
        num %= 100;
      }

      if (num > 0) {
        result += convert_hundreds(num);
      }

      return result.trim();
    }

    const rupees = Math.floor(num);
    const paise = Math.round((num - rupees) * 100);

    let result = convert_number(rupees) + ' Rupees';
    if (paise > 0) {
      result += ' and ' + convert_number(paise) + ' Paise';
    }
    result += ' Only';

    return result.toUpperCase();
  };

  const getFormattedServicePeriod = () => {
    if (formData.servicePeriodFrom && formData.servicePeriodTo) {
      const fromDate = new Date(formData.servicePeriodFrom);
      const toDate = new Date(formData.servicePeriodTo);
      const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', year: 'numeric' };
      return `${fromDate.toLocaleDateString('en-IN', options)} to ${toDate.toLocaleDateString('en-IN', options)}`;
    }
    return "";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center">TAX INVOICE</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Enterprise Header Section */}
          <div className="border rounded-lg p-4 bg-muted/20 text-center">
            <div className="text-center mb-2">
              <h2 className="text-2xl font-bold tracking-wider">{formData.enterpriseName}</h2>
              <div className="flex justify-center gap-4 text-sm mt-1">
                <span>Housekeeping</span>
                <span>Parking</span>
                <span>Waste Management</span>
              </div>
              <p className="text-sm mt-2">{formData.enterpriseAddress}</p>
              <p className="text-sm">{formData.enterprisePhone}</p>
              <p className="text-sm">{formData.enterpriseEmail}</p>
            </div>
          </div>

          {/* Invoice Title */}
          <div className="text-center">
            <h3 className="text-xl font-bold border-y-2 border-black py-2 inline-block px-8">TAX INVOICE</h3>
          </div>

          {/* Service Period Line */}
          {getFormattedServicePeriod() && (
            <div className="text-center text-sm font-medium">
              <div className="bg-muted/30 py-1 px-3 rounded-md inline-block">
                {getFormattedServicePeriod()}
              </div>
            </div>
          )}

          {/* Site Selection Dropdown */}
          <div className="border rounded-lg p-4 bg-muted/30">
            <div className="flex items-center gap-2 mb-4">
              <Building2 className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">Select Site / Client</h3>
            </div>

            {sitesError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-lg mb-4">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">{sitesError}</span>
                <Button type="button" variant="outline" size="sm" onClick={fetchSites} className="ml-auto">
                  Retry
                </Button>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="siteSelect" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Select Site (Site Name - Client Name) *
              </Label>
              <Select
                value={formData.selectedSiteId}
                onValueChange={handleSiteSelect}
                disabled={loadingSites}
              >
                <SelectTrigger id="siteSelect" className="w-full">
                  <SelectValue placeholder={loadingSites ? "Loading sites..." : "Select a site to auto-fill client details"} />
                </SelectTrigger>
                <SelectContent className="max-h-[300px]">
                  {loadingSites ? (
                    <div className="flex items-center justify-center p-4">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span className="ml-2">Loading sites...</span>
                    </div>
                  ) : sites.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No sites found. Please add sites first.
                    </div>
                  ) : (
                    sites.map((site) => (
                      <SelectItem key={site._id} value={site._id} className="py-3">
                        <div className="flex flex-col">
                          <span className="font-medium">{site.name}</span>
                          <span className="text-xs text-muted-foreground">
                            Client: {site.clientName} | Location: {site.location}
                          </span>
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Selecting a site will automatically fill client details, PAN, GST, and registration numbers
              </p>
            </div>
          </div>

          {/* Client and Invoice Details Grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm border rounded-lg p-4">
            <div className="font-semibold">Client Name</div>
            <div>
              <Input
                value={formData.clientName}
                onChange={(e) => handleInputChange("clientName", e.target.value)}
                placeholder="Client Name"
                className="h-7"
                required
              />
            </div>

            <div className="font-semibold">Invoice No</div>
            <div>
              <Input
                value={formData.invoiceNumber}
                onChange={(e) => handleInputChange("invoiceNumber", e.target.value)}
                placeholder="SK-2425-G301"
                className="h-7"
              />
            </div>

            <div className="font-semibold">Address</div>
            <div>
              <Textarea
                value={formData.clientAddress}
                onChange={(e) => handleInputChange("clientAddress", e.target.value)}
                placeholder="Client address"
                rows={2}
                className="resize-none text-sm"
                required
              />
            </div>

            <div className="font-semibold">Date</div>
            <div>
              <Input
                type="date"
                value={formData.invoiceDate}
                onChange={(e) => handleInputChange("invoiceDate", e.target.value)}
                className="h-7"
                required
              />
            </div>

            <div className="font-semibold">PAN NO</div>
            <div>
              <Input
                value={formData.panNumber}
                onChange={(e) => handleInputChange("panNumber", e.target.value)}
                placeholder="ALKPK7734N"
                className="h-7"
              />
            </div>

            <div className="font-semibold">ST NO</div>
            <div>
              <Input
                value={formData.gstNumber}
                onChange={(e) => handleInputChange("gstNumber", e.target.value)}
                placeholder="27ALKPK7734NL2E"
                className="h-7"
              />
            </div>

            <div className="font-semibold">Service Tax Category</div>
            <div>
              <Select
                value={formData.serviceCategory}
                onValueChange={(value) => handleInputChange("serviceCategory", value)}
              >
                <SelectTrigger className="h-7">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Manpower">Manpower</SelectItem>
                  <SelectItem value="Housekeeping">Housekeeping</SelectItem>
                  <SelectItem value="Parking">Parking</SelectItem>
                  <SelectItem value="Waste Management">Waste Management</SelectItem>
                  <SelectItem value="Security">Security Services</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="font-semibold">ESIC NO</div>
            <div>
              <Input
                value={formData.esicNumber}
                onChange={(e) => handleInputChange("esicNumber", e.target.value)}
                placeholder="33000457830001001"
                className="h-7"
              />
            </div>

            <div className="font-semibold">GST</div>
            <div>
              <Input
                value={formData.enterpriseGst}
                onChange={(e) => handleInputChange("enterpriseGst", e.target.value)}
                placeholder="27ALKPK7734NL2E"
                className="h-7"
              />
            </div>

            <div className="font-semibold">LWF NO</div>
            <div>
              <Input
                value={formData.lwfNumber}
                onChange={(e) => handleInputChange("lwfNumber", e.target.value)}
                placeholder="PUN60715PROV"
                className="h-7"
              />
            </div>

            <div className="font-semibold">PF NO</div>
            <div>
              <Input
                value={formData.pfNumber}
                onChange={(e) => handleInputChange("pfNumber", e.target.value)}
                placeholder="PUPUN1012226"
                className="h-7"
              />
            </div>
          </div>

          {/* Service Period */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="servicePeriodFrom">Service Period From *</Label>
              <Input
                id="servicePeriodFrom"
                type="date"
                value={formData.servicePeriodFrom}
                onChange={(e) => handleInputChange("servicePeriodFrom", e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="servicePeriodTo">Service Period To *</Label>
              <Input
                id="servicePeriodTo"
                type="date"
                value={formData.servicePeriodTo}
                onChange={(e) => handleInputChange("servicePeriodTo", e.target.value)}
                required
              />
            </div>
          </div>

          {/* Service Items Table */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-lg font-semibold">Service Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="w-12 text-center">Sr. No.</TableHead>
                    <TableHead className="min-w-[200px]">Description</TableHead>
                    <TableHead className="min-w-[150px]">Designation</TableHead>
                    <TableHead className="w-20 text-center">Qty</TableHead>
                    <TableHead className="w-20 text-center">Days</TableHead>
                    <TableHead className="w-20 text-center">Hours</TableHead>
                    <TableHead className="w-24 text-right">Rate (₹)</TableHead>
                    <TableHead className="w-32 text-right">Amount (₹)</TableHead>
                    <TableHead className="w-12 text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="text-center">{index + 1}</TableCell>
                      <TableCell>
                        <input
                          list={`descOptions-${index}`}
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Select or type description"
                          className="w-full border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-8 bg-transparent"
                        />
                        <datalist id={`descOptions-${index}`}>
                          <option value="Housekeeping" />
                          <option value="Waste Management" />
                          <option value="Machine Rental" />
                          <option value="Rental Service" />
                        </datalist>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.designation}
                          onChange={(e) => updateItem(index, 'designation', e.target.value)}
                          placeholder="Designation"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-8"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity || ''}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          min="1"
                          step="1"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-8 text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.days || ''}
                          onChange={(e) => updateItem(index, 'days', e.target.value)}
                          min="1"
                          step="1"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-8 text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.hours || ''}
                          onChange={(e) => updateItem(index, 'hours', e.target.value)}
                          min="1"
                          step="1"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-8 text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.rate || ''}
                          onChange={(e) => updateItem(index, 'rate', e.target.value)}
                          min="0"
                          step="0.01"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 p-0 h-8 text-right"
                          required
                        />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          className="h-6 w-6 p-0"
                        >
                          <Trash2 className="h-3 w-3 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* SAC Code and Service Location */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="font-semibold">SAC Code-{formData.sacCode}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-semibold">Service Location:</span>
              <Input
                value={formData.serviceLocation}
                onChange={(e) => handleInputChange("serviceLocation", e.target.value)}
                className="h-7 w-40"
              />
            </div>
          </div>

          {/* Amount Summary Section */}
          <div className="border rounded-lg overflow-hidden">
            <div className="grid grid-cols-2 border-b">
              <div className="p-3 font-semibold bg-muted/30">Net Taxable Value</div>
              <div className="p-3 text-right font-medium">
                ₹{summary.taxableValue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="grid grid-cols-2 border-b">
              <div className="p-3 font-semibold bg-muted/30">SGST @9%</div>
              <div className="p-3 text-right font-medium">
                ₹{summary.sgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="grid grid-cols-2 border-b">
              <div className="p-3 font-semibold bg-muted/30">CGST @9%</div>
              <div className="p-3 text-right font-medium">
                ₹{summary.cgst.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="grid grid-cols-2 bg-primary/5">
              <div className="p-3 font-bold text-lg">Total Amount</div>
              <div className="p-3 text-right font-bold text-lg text-primary">
                ₹{summary.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>

          {/* Amount in Words */}
          <div className="p-3 bg-muted/20 rounded-lg">
            <div className="font-semibold mb-1">Amount in words:</div>
            <div className="text-sm font-medium">
              {convertToIndianWords(summary.totalAmount)}
            </div>
          </div>

          {/* Terms & Conditions */}
          <div className="space-y-2">
            <Label htmlFor="termsConditions">Terms & Conditions</Label>
            <Textarea
              id="termsConditions"
              value={formData.termsConditions}
              onChange={(e) => handleInputChange("termsConditions", e.target.value)}
              rows={2}
              className="text-sm"
            />
          </div>

          {/* Bank Details */}
          <div className="text-xs text-muted-foreground border-t pt-3">
            <div>Account No.: {formData.accountNumber} | IFSC Code: {formData.ifscCode}</div>
            <div>Account Name: S.K. ENTERPRISES</div>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 pt-4 border-t">
            <div className="text-center">
              <div className="border-t border-black pt-2 w-48 mx-auto">
                <p className="text-sm">Receiver's Signature</p>
              </div>
            </div>
            <div className="text-center">
              <div className="border-t border-black pt-2 w-48 mx-auto">
                <p className="text-sm">Authorized Signatory</p>
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Tax Invoice'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};