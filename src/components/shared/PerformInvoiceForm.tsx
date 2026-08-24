import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, Download } from "lucide-react";
import { Invoice, InvoiceItem } from ".";
import jsPDF from "jspdf";
import { formatCurrency, formatDate, convertToIndianWords, calculateDueDate } from "../../utils/formatters";

// ─── Type Definitions ──────────────────────────────────────────────────────

type TextOptions = {
  size?: number;
  style?: 'normal' | 'bold' | 'italic';
  color?: [number, number, number]; // RGB tuple
  align?: 'left' | 'center' | 'right';
  required?: boolean;
};

interface PerformInvoiceItem {
  description: string;
  quantity: number;
  unit: string;
  rate: number;
  amount: number;
}

interface PerformInvoiceFormProps {
  isOpen: boolean;
  onClose: () => void;
  onInvoiceCreate: (invoice: Invoice) => Promise<boolean>;
  performInvoicesCount: number;
  userId?: string;
  userRole?: string;
}

export const PerformInvoiceForm: React.FC<PerformInvoiceFormProps> = ({
  isOpen,
  onClose,
  onInvoiceCreate,
  performInvoicesCount
}) => {
  // ─── State ──────────────────────────────────────────────────────────────

  const [items, setItems] = useState<PerformInvoiceItem[]>([
    { description: "", quantity: 0, unit: "No", rate: 0, amount: 0 }
  ]);

  const [formData, setFormData] = useState({
    // Company Details
    companyName: "S K Enterprises",
    companyAddress: "Office No 505, 5th Floor, Global Square\nDeccan College Road, Yerwada, Pune",
    companyGSTIN: "27ALKPK7734N1ZE",
    companyState: "Maharashtra",
    companyStateCode: "27",
    companyEmail: "s.k.enterprises7583@gmail.com",

    // Consignee Details (Ship to)
    consigneeName: "",
    consigneeAddress: "",
    consigneeGSTIN: "",
    consigneeState: "",
    consigneeStateCode: "",

    // Buyer Details (Bill to)
    buyerName: "",
    buyerAddress: "",
    buyerGSTIN: "",
    buyerState: "",
    buyerStateCode: "",

    // Order Details
    voucherNo: `FY${new Date().getFullYear() + 1}-${(new Date().getFullYear() + 2).toString().slice(-2)}-PI-${(performInvoicesCount + 1).toString().padStart(3, '0')}`,
    buyerRef: "",
    orderDate: new Date().toISOString().split('T')[0],
    dispatchedThrough: "",
    paymentTerms: "",
    paymentMethod: "",
    otherReferences: "",
    destination: "",
    deliveryTerms: "",

    // Client details
    clientEmail: "",
    serviceType: "",

    // Bank details
    accountHolder: "S K ENTERPRISES",
    bankName: "BANK OF MAHARASHTRA",
    accountNumber: "CA 60168661338",
    branchAndIFSC: "KALYANI NAGAR & MAHB0001233",
    authorisedSignatory: "",
    footerNote: "This is a Computer Generated Document",
    termsConditions: "E. & O.E"
  });

  const [loading, setLoading] = useState(false);

  // ─── Helper Functions ──────────────────────────────────────────────────

  const formatDateShort = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = date.toLocaleString('en-US', { month: 'short' });
    const year = date.getFullYear().toString().slice(-2);
    return `${day}-${month}-${year}`;
  };

  // ─── PDF Generation ──────────────────────────────────────────────────

  const generateSalesOrderPDF = () => {
    try {
      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const leftMargin = 15;
      const rightMargin = 15;
      const contentWidth = pageWidth - leftMargin - rightMargin;
      let yPos = 20;

      const drawLine = (y: number, lineWidth = contentWidth) => {
        doc.setDrawColor(0, 0, 0);
        doc.setLineWidth(0.2);
        doc.line(leftMargin, y, leftMargin + lineWidth, y);
      };

      // ✅ Fixed addText with proper color handling
      const addText = (text: string, x: number, y: number, options: TextOptions = {}) => {
        if (!text && options.required) text = " ";
        doc.setFontSize(options.size || 10);
        doc.setFont("helvetica", options.style || "normal");
        const color = options.color ?? [0, 0, 0];
        doc.setTextColor(color[0], color[1], color[2]);
        doc.text(String(text), x, y, { align: options.align || 'left' });
      };

      // ==================== COMPANY HEADER ====================
      addText(formData.companyName || "S K Enterprises", pageWidth / 2, yPos, {
        size: 14,
        style: 'bold',
        align: 'center'
      });
      yPos += 7;

      const companyAddress = formData.companyAddress || "Office No 505, 5th Floor, Global Square\nDeccan College Road, Yerwada, Pune";
      const companyAddressLines = companyAddress.split('\n');
      companyAddressLines.forEach((line: string) => {
        addText(line, pageWidth / 2, yPos, { size: 9, align: 'center' });
        yPos += 5;
      });

      yPos += 2;

      addText(`GSTIN/UIN: ${formData.companyGSTIN || "27ALKPK7734N1ZE"}`, pageWidth / 2, yPos, { size: 9, align: 'center' });
      yPos += 5;

      addText(`State Name : ${formData.companyState || "Maharashtra"}, Code : ${formData.companyStateCode || "27"}`,
        pageWidth / 2, yPos, { size: 9, align: 'center' });
      yPos += 5;

      addText(`E-Mail : ${formData.companyEmail || "s.k.enterprises7583@gmail.com"}`,
        pageWidth / 2, yPos, { size: 9, align: 'center' });
      yPos += 12;

      // ==================== CONSIGNEE AND BUYER SIDE BY SIDE ====================
      const colWidth = (contentWidth - 10) / 2;
      const leftColX = leftMargin;
      const rightColX = leftMargin + colWidth + 10;

      // Consignee (Ship to)
      addText("Consignee (Ship to)", leftColX, yPos, { size: 10, style: 'bold' });
      yPos += 6;

      const consigneeName = formData.consigneeName || formData.buyerName || "";
      addText(consigneeName, leftColX, yPos, { size: 9 });
      yPos += 5;

      if (formData.consigneeAddress) {
        const consigneeAddressLines = formData.consigneeAddress.split('\n');
        consigneeAddressLines.forEach((line: string) => {
          addText(line, leftColX, yPos, { size: 9 });
          yPos += 5;
        });
      }

      if (formData.consigneeGSTIN) {
        addText(`GSTIN/UIN : ${formData.consigneeGSTIN}`, leftColX, yPos, { size: 9 });
        yPos += 5;
      }

      if (formData.consigneeState && formData.consigneeStateCode) {
        addText(`State Name : ${formData.consigneeState}, Code : ${formData.consigneeStateCode}`,
          leftColX, yPos, { size: 9 });
        yPos += 5;
      }

      const consigneeEndY = yPos;

      yPos = consigneeEndY - (consigneeName ? 5 : 0) - (formData.consigneeAddress ? (formData.consigneeAddress.split('\n').length * 5) : 0) -
        (formData.consigneeGSTIN ? 5 : 0) - (formData.consigneeState ? 5 : 0) - 6;

      // Buyer (Bill to)
      addText("Buyer (Bill to)", rightColX, yPos, { size: 10, style: 'bold' });
      yPos += 6;

      const buyerName = formData.buyerName || "";
      addText(buyerName, rightColX, yPos, { size: 9 });
      yPos += 5;

      if (formData.buyerAddress) {
        const buyerAddressLines = formData.buyerAddress.split('\n');
        buyerAddressLines.forEach((line: string) => {
          addText(line, rightColX, yPos, { size: 9 });
          yPos += 5;
        });
      }

      if (formData.buyerGSTIN) {
        addText(`GSTIN/UIN : ${formData.buyerGSTIN}`, rightColX, yPos, { size: 9 });
        yPos += 5;
      }

      if (formData.buyerState && formData.buyerStateCode) {
        addText(`State Name : ${formData.buyerState}, Code : ${formData.buyerStateCode}`,
          rightColX, yPos, { size: 9 });
        yPos += 5;
      }

      yPos = Math.max(consigneeEndY, yPos) + 10;

      // ==================== ORDER DETAILS TABLE ====================
      const cellWidth = contentWidth / 2;
      const rowHeight = 10;

      const row1Y = yPos;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.1);
      doc.rect(leftMargin, row1Y, cellWidth, rowHeight);
      addText("Voucher No.", leftMargin + 3, row1Y + 6, { size: 9 });
      addText(formData.voucherNo || "", leftMargin + 55, row1Y + 6, { size: 9, style: 'bold' });

      doc.rect(leftMargin + cellWidth, row1Y, cellWidth, rowHeight);
      addText("Mode/Terms of Payment", leftMargin + cellWidth + 3, row1Y + 6, { size: 9 });
      addText(formData.paymentMethod || formData.paymentTerms || "", leftMargin + cellWidth + 70, row1Y + 6, { size: 9 });

      const row2Y = row1Y + rowHeight;
      doc.rect(leftMargin, row2Y, cellWidth, rowHeight);
      addText("Buyer's Ref./Order No.", leftMargin + 3, row2Y + 6, { size: 9 });
      addText(formData.buyerRef || "", leftMargin + 55, row2Y + 6, { size: 9 });

      doc.rect(leftMargin + cellWidth, row2Y, cellWidth, rowHeight);
      addText("Other References", leftMargin + cellWidth + 3, row2Y + 6, { size: 9 });
      addText(formData.otherReferences || "", leftMargin + cellWidth + 70, row2Y + 6, { size: 9 });

      const row3Y = row2Y + rowHeight;
      doc.rect(leftMargin, row3Y, cellWidth, rowHeight);
      addText("Dispatched through", leftMargin + 3, row3Y + 6, { size: 9 });
      addText(formData.dispatchedThrough || "", leftMargin + 55, row3Y + 6, { size: 9 });

      doc.rect(leftMargin + cellWidth, row3Y, cellWidth, rowHeight);
      addText("Destination", leftMargin + cellWidth + 3, row3Y + 6, { size: 9 });
      addText(formData.destination || "", leftMargin + cellWidth + 70, row3Y + 6, { size: 9 });

      const row4Y = row3Y + rowHeight;
      doc.rect(leftMargin, row4Y, cellWidth, rowHeight);
      addText("Dated", leftMargin + 3, row4Y + 6, { size: 9 });
      addText(formatDateShort(formData.orderDate) || "", leftMargin + 55, row4Y + 6, { size: 9 });

      doc.rect(leftMargin + cellWidth, row4Y, cellWidth, rowHeight);
      addText("Terms of Delivery", leftMargin + cellWidth + 3, row4Y + 6, { size: 9 });
      addText(formData.deliveryTerms || "", leftMargin + cellWidth + 70, row4Y + 6, { size: 9 });

      yPos = row4Y + rowHeight + 12;

      // ==================== ITEMS TABLE ====================
      const slNoX = leftMargin + 3;
      const descriptionX = leftMargin + 15;
      const quantityX = leftMargin + 110;
      const unitX = leftMargin + 135;
      const rateX = leftMargin + 155;
      const amountX = leftMargin + 180;

      doc.setFillColor(240, 240, 240);
      doc.rect(leftMargin, yPos, contentWidth, 8, 'F');

      addText("Sl No.", slNoX, yPos + 5, { size: 9, style: 'bold', align: 'center' });
      addText("Description of Goods", descriptionX, yPos + 5, { size: 9, style: 'bold', align: 'left' });
      addText("Quantity", quantityX, yPos + 5, { size: 9, style: 'bold', align: 'center' });
      addText("Unit", unitX, yPos + 5, { size: 9, style: 'bold', align: 'center' });
      addText("Rate per", rateX, yPos + 5, { size: 9, style: 'bold', align: 'right' });
      addText("Amount", amountX, yPos + 5, { size: 9, style: 'bold', align: 'right' });

      yPos += 8;
      drawLine(yPos);
      yPos += 4;

      let currentY = yPos;
      const subtotal = items.reduce((sum, item) => sum + item.amount, 0);

      items.forEach((item, index) => {
        if (currentY > pageHeight - 80) {
          doc.addPage();
          currentY = 20;

          doc.setFillColor(240, 240, 240);
          doc.rect(leftMargin, currentY, contentWidth, 8, 'F');
          addText("Sl No.", slNoX, currentY + 5, { size: 9, style: 'bold', align: 'center' });
          addText("Description of Goods", descriptionX, currentY + 5, { size: 9, style: 'bold', align: 'left' });
          addText("Quantity", quantityX, currentY + 5, { size: 9, style: 'bold', align: 'center' });
          addText("Unit", unitX, currentY + 5, { size: 9, style: 'bold', align: 'center' });
          addText("Rate per", rateX, currentY + 5, { size: 9, style: 'bold', align: 'right' });
          addText("Amount", amountX, currentY + 5, { size: 9, style: 'bold', align: 'right' });
          currentY += 8;
          drawLine(currentY);
          currentY += 4;
        }

        addText(`${index + 1}`, slNoX, currentY + 4, { size: 9, align: 'center' });
        addText(item.description || "", descriptionX, currentY + 4, { size: 9, align: 'left' });
        addText(`${item.quantity}`, quantityX, currentY + 4, { size: 9, align: 'center' });
        addText(item.unit || "No", unitX, currentY + 4, { size: 9, align: 'center' });
        addText(`${item.rate.toLocaleString('en-IN')}`, rateX, currentY + 4, { size: 9, align: 'right' });
        addText(`${item.amount.toLocaleString('en-IN')}`, amountX, currentY + 4, { size: 9, align: 'right' });

        currentY += 7;
      });

      drawLine(currentY);
      currentY += 6;

      addText("Total", rateX - 20, currentY + 3, { size: 10, style: 'bold', align: 'left' });
      addText(subtotal.toLocaleString('en-IN'), amountX, currentY + 3, { size: 10, style: 'bold', align: 'right' });

      currentY += 12;
      drawLine(currentY);
      currentY += 10;

      // ==================== AMOUNT IN WORDS ====================
      addText("Amount Chargeable (in words)", leftMargin, currentY, { size: 10, style: 'bold' });
      currentY += 6;

      const amountInWords = convertToIndianWords(subtotal);
      addText(amountInWords, leftMargin, currentY, { size: 9 });
      currentY += 8;

      // ==================== BANK DETAILS ====================
      addText("Company's Bank Details", leftMargin, currentY, { size: 10, style: 'bold' });
      currentY += 6;

      addText(`A/c Holder's Name : ${formData.accountHolder || "S K ENTERPRISES"}`, leftMargin, currentY, { size: 9 });
      currentY += 5;

      addText(`Bank Name : ${formData.bankName || "BANK OF MAHARASHTRA"}`, leftMargin, currentY, { size: 9 });
      currentY += 5;

      addText(`A/c No. : ${formData.accountNumber || "CA 60168661338"}`, leftMargin, currentY, { size: 9 });
      currentY += 5;

      addText(`Branch & IFS Code : ${formData.branchAndIFSC || "KALYANI NAGAR & MAHB0001233"}`, leftMargin, currentY, { size: 9 });
      currentY += 12;

      // ==================== SIGNATURE ====================
      const signatureY = pageHeight - 50;
      drawLine(signatureY - 8, 80);

      addText("for S K Enterprises", leftMargin + 40, signatureY, { size: 9, align: 'center' });
      addText("Authorised Signatory", leftMargin + 40, signatureY + 6, { size: 8, align: 'center' });

      // ==================== FOOTER ====================
      const footerY = pageHeight - 18;
      drawLine(footerY - 5);
      addText("This is a Computer Generated Document", pageWidth / 2, footerY, { size: 8, style: 'italic', align: 'center' });

      const fileName = `Sales_Order_${formData.voucherNo || 'temp'}_${formatDate(formData.orderDate)}.pdf`;
      doc.save(fileName);
      return true;
    } catch (error) {
      console.error("Error generating PDF:", error);
      alert("Error generating PDF. Please check the console for details.");
      return false;
    }
  };

  // ─── Form Handlers ──────────────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!formData.consigneeName && !formData.buyerName) {
      alert("Please enter either Consignee Name or Buyer Name");
      return;
    }

    if (!formData.paymentMethod) {
      alert("Please select a Payment Method");
      return;
    }

    if (items.length === 0 || items.some(item => !item.description || item.quantity <= 0 || item.rate <= 0)) {
      alert("Please add valid items with description, quantity, and rate");
      return;
    }

    setLoading(true);

    try {
      const invoiceItems: InvoiceItem[] = items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        rate: item.rate,
        amount: item.quantity * item.rate,
        unit: item.unit
      }));

      const subtotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
      const totalAmount = subtotal;
      const formattedDate = formatDate(formData.orderDate);
      const dueDate = calculateDueDate(formData.orderDate, 30);
      const amountInWords = convertToIndianWords(totalAmount);
      // Generate a unique ID if not already set
      let voucherNo = formData.voucherNo;
      if (!voucherNo || voucherNo === `FY${new Date().getFullYear() + 1}-${(new Date().getFullYear() + 2).toString().slice(-2)}-PI-${(performInvoicesCount + 1).toString().padStart(3, '0')}`) {
        const timestamp = Date.now().toString();
        const randomSuffix = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
        const seq = String(performInvoicesCount + 1).padStart(3, '0');
        voucherNo = `FY${new Date().getFullYear() + 1}-${(new Date().getFullYear() + 2).toString().slice(-2)}-PI-${seq}-${timestamp}-${randomSuffix}`;
      }


      // ✅ Removed 'branch' – not in Invoice interface
      const newInvoice: Invoice = {
        id: voucherNo,
        invoiceNumber: voucherNo,
        voucherNo: voucherNo,
        invoiceType: "perform",
        status: "pending",

        client: formData.consigneeName || formData.buyerName || "",
        clientEmail: formData.clientEmail,
        clientAddress: formData.buyerAddress,

        companyName: formData.companyName,
        companyAddress: formData.companyAddress,
        companyGSTIN: formData.companyGSTIN,
        companyState: formData.companyState,
        companyStateCode: formData.companyStateCode,
        companyEmail: formData.companyEmail,

        consignee: formData.consigneeName,
        consigneeAddress: formData.consigneeAddress,
        consigneeGSTIN: formData.consigneeGSTIN,
        consigneeState: formData.consigneeState,
        consigneeStateCode: formData.consigneeStateCode,

        buyer: formData.buyerName,
        buyerAddress: formData.buyerAddress,
        buyerGSTIN: formData.buyerGSTIN,
        buyerState: formData.buyerState,
        buyerStateCode: formData.buyerStateCode,

        buyerRef: formData.buyerRef,
        dispatchedThrough: formData.dispatchedThrough,
        paymentTerms: formData.paymentTerms,
        paymentMethod: formData.paymentMethod,
        notes: formData.otherReferences,
        site: formData.destination,
        destination: formData.destination,
        deliveryTerms: formData.deliveryTerms,
        serviceType: formData.serviceType,

        items: invoiceItems,

        subtotal: subtotal,
        tax: 0,
        discount: 0,
        amount: totalAmount,
        roundUp: 0,

        date: formattedDate,
        dueDate: dueDate,

        bankName: formData.bankName,
        accountNumber: formData.accountNumber,
        ifscCode: "MAHB0001233",
        accountHolder: formData.accountHolder,
        branchAndIFSC: formData.branchAndIFSC,

        amountInWords: amountInWords,
        termsConditions: formData.termsConditions,
        managementFeesPercent: 0,
        managementFeesAmount: 0,
        sacCode: "",
        panNumber: "",
        gstNumber: formData.companyGSTIN,
        serviceLocation: "",
        esicNumber: "",
        lwfNumber: "",
        pfNumber: "",
        servicePeriodFrom: "",
        servicePeriodTo: ""
      };

      console.log('Creating invoice with payment method:', newInvoice.paymentMethod);

      generateSalesOrderPDF();

      const success = await onInvoiceCreate(newInvoice);

      if (success) {
        onClose();
        resetForm();
      }
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const addItem = () => {
    setItems([...items, { description: "", quantity: 0, unit: "No", rate: 0, amount: 0 }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = [...items];
      newItems.splice(index, 1);
      setItems(newItems);
    }
  };

  const updateItem = (index: number, field: keyof PerformInvoiceItem, value: string | number) => {
    const newItems = [...items];
    const parsedValue = typeof value === 'string' ?
      (field === 'description' || field === 'unit' ? value : parseFloat(value) || 0) : value;

    newItems[index] = {
      ...newItems[index],
      [field]: parsedValue
    };

    if (field === 'rate' || field === 'quantity') {
      const item = newItems[index];
      newItems[index].amount = item.quantity * item.rate;
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
    setItems([{ description: "", quantity: 0, unit: "No", rate: 0, amount: 0 }]);
    setFormData({
      companyName: "S K Enterprises",
      companyAddress: "Office No 505, 5th Floor, Global Square\nDeccan College Road, Yerwada, Pune",
      companyGSTIN: "27ALKPK7734N1ZE",
      companyState: "Maharashtra",
      companyStateCode: "27",
      companyEmail: "s.k.enterprises7583@gmail.com",

      consigneeName: "",
      consigneeAddress: "",
      consigneeGSTIN: "",
      consigneeState: "",
      consigneeStateCode: "",

      buyerName: "",
      buyerAddress: "",
      buyerGSTIN: "",
      buyerState: "",
      buyerStateCode: "",

      voucherNo: `FY${new Date().getFullYear() + 1}-${(new Date().getFullYear() + 2).toString().slice(-2)}-PI-${(performInvoicesCount + 1).toString().padStart(3, '0')}`,
      buyerRef: "",
      orderDate: new Date().toISOString().split('T')[0],
      dispatchedThrough: "",
      paymentTerms: "",
      paymentMethod: "",
      otherReferences: "",
      destination: "",
      deliveryTerms: "",

      clientEmail: "",
      serviceType: "",

      accountHolder: "S K ENTERPRISES",
      bankName: "BANK OF MAHARASHTRA",
      accountNumber: "CA 60168661338",
      branchAndIFSC: "KALYANI NAGAR & MAHB0001233",
      authorisedSignatory: "",
      footerNote: "This is a Computer Generated Document",
      termsConditions: "E. & O.E"
    });
  };

  const handleCopyBuyerToConsignee = () => {
    setFormData(prev => ({
      ...prev,
      consigneeName: prev.buyerName,
      consigneeAddress: prev.buyerAddress,
      consigneeGSTIN: prev.buyerGSTIN,
      consigneeState: prev.buyerState,
      consigneeStateCode: prev.buyerStateCode
    }));
  };

  const handleGenerateVoucherNo = () => {
    const year = new Date().getFullYear();
    const nextYear = year + 1;
    const formattedVoucherNo = `FY${nextYear}-${(nextYear + 1).toString().slice(-2)}-PI-${(performInvoicesCount + 1).toString().padStart(3, '0')}`;
    handleInputChange("voucherNo", formattedVoucherNo);
    if (!formData.buyerRef) {
      handleInputChange("buyerRef", formattedVoucherNo);
    }
  };

  const calculateSummary = () => {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    return { subtotal, totalAmount: subtotal };
  };

  const summary = calculateSummary();

  // ─── Render ──────────────────────────────────────────────────────────

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Performance Invoice / Sales Orders</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Details */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-lg">Company Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => handleInputChange("companyName", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyGSTIN">GSTIN/UIN</Label>
                <Input
                  id="companyGSTIN"
                  value={formData.companyGSTIN}
                  onChange={(e) => handleInputChange("companyGSTIN", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyAddress">Company Address (use Enter for new lines)</Label>
                <Textarea
                  id="companyAddress"
                  value={formData.companyAddress}
                  onChange={(e) => handleInputChange("companyAddress", e.target.value)}
                  rows={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyEmail">Email</Label>
                <Input
                  id="companyEmail"
                  value={formData.companyEmail}
                  onChange={(e) => handleInputChange("companyEmail", e.target.value)}
                  type="email"
                  required
                />
              </div>
            </div>
          </div>

          {/* Consignee and Buyer Side by Side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Consignee Details */}
            <div className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-semibold text-lg">Consignee Details (Ship to)</h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCopyBuyerToConsignee}
                >
                  Copy from Buyer
                </Button>
              </div>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="consigneeName">Consignee Name</Label>
                  <Input
                    id="consigneeName"
                    value={formData.consigneeName}
                    onChange={(e) => handleInputChange("consigneeName", e.target.value)}
                    placeholder="Consignee name"
                  />
                </div>
                <div>
                  <Label htmlFor="consigneeAddress">Consignee Address</Label>
                  <Textarea
                    id="consigneeAddress"
                    value={formData.consigneeAddress}
                    onChange={(e) => handleInputChange("consigneeAddress", e.target.value)}
                    rows={3}
                    placeholder="Enter consignee address"
                  />
                </div>
                <div>
                  <Label htmlFor="consigneeGSTIN">Consignee GSTIN/UIN</Label>
                  <Input
                    id="consigneeGSTIN"
                    value={formData.consigneeGSTIN}
                    onChange={(e) => handleInputChange("consigneeGSTIN", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="consigneeState">State Name</Label>
                    <Input
                      id="consigneeState"
                      value={formData.consigneeState}
                      onChange={(e) => handleInputChange("consigneeState", e.target.value)}
                      placeholder="Maharashtra"
                    />
                  </div>
                  <div>
                    <Label htmlFor="consigneeStateCode">State Code</Label>
                    <Input
                      id="consigneeStateCode"
                      value={formData.consigneeStateCode}
                      onChange={(e) => handleInputChange("consigneeStateCode", e.target.value)}
                      placeholder="27"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Buyer Details */}
            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="font-semibold text-lg">Buyer Details (Bill to)</h3>
              <div className="space-y-3">
                <div>
                  <Label htmlFor="buyerName">Buyer Name *</Label>
                  <Input
                    id="buyerName"
                    value={formData.buyerName}
                    onChange={(e) => handleInputChange("buyerName", e.target.value)}
                    placeholder="Buyer name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="buyerAddress">Buyer Address</Label>
                  <Textarea
                    id="buyerAddress"
                    value={formData.buyerAddress}
                    onChange={(e) => handleInputChange("buyerAddress", e.target.value)}
                    rows={3}
                    placeholder="Enter buyer address"
                  />
                </div>
                <div>
                  <Label htmlFor="buyerGSTIN">Buyer GSTIN/UIN</Label>
                  <Input
                    id="buyerGSTIN"
                    value={formData.buyerGSTIN}
                    onChange={(e) => handleInputChange("buyerGSTIN", e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="buyerState">State Name</Label>
                    <Input
                      id="buyerState"
                      value={formData.buyerState}
                      onChange={(e) => handleInputChange("buyerState", e.target.value)}
                      placeholder="Maharashtra"
                    />
                  </div>
                  <div>
                    <Label htmlFor="buyerStateCode">State Code</Label>
                    <Input
                      id="buyerStateCode"
                      value={formData.buyerStateCode}
                      onChange={(e) => handleInputChange("buyerStateCode", e.target.value)}
                      placeholder="27"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Order Details */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-lg">Order Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label htmlFor="voucherNo">Voucher No. *</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerateVoucherNo}
                    className="h-6 px-2 text-xs"
                  >
                    Auto-generate
                  </Button>
                </div>
                <Input
                  id="voucherNo"
                  value={formData.voucherNo}
                  onChange={(e) => handleInputChange("voucherNo", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="buyerRef">Buyer's Ref./Order No.</Label>
                <Input
                  id="buyerRef"
                  value={formData.buyerRef}
                  onChange={(e) => handleInputChange("buyerRef", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderDate">Dated *</Label>
                <Input
                  id="orderDate"
                  value={formData.orderDate}
                  onChange={(e) => handleInputChange("orderDate", e.target.value)}
                  type="date"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="dispatchedThrough">Dispatched through</Label>
                <Input
                  id="dispatchedThrough"
                  value={formData.dispatchedThrough}
                  onChange={(e) => handleInputChange("dispatchedThrough", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentMethod">Payment Method *</Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => handleInputChange("paymentMethod", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select payment method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Cash">💵 Cash</SelectItem>
                    <SelectItem value="Bank Transfer">🏦 Bank Transfer</SelectItem>
                    <SelectItem value="Credit Card">💳 Credit Card</SelectItem>
                    <SelectItem value="Debit Card">💳 Debit Card</SelectItem>
                    <SelectItem value="Cheque">📝 Cheque</SelectItem>
                    <SelectItem value="UPI">📱 UPI (Google Pay/PhonePe/Paytm)</SelectItem>
                    <SelectItem value="NEFT">🏦 NEFT</SelectItem>
                    <SelectItem value="RTGS">🏦 RTGS</SelectItem>
                    <SelectItem value="Online Payment">🌐 Online Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentTerms">Terms of Payment</Label>
                <Input
                  id="paymentTerms"
                  value={formData.paymentTerms}
                  onChange={(e) => handleInputChange("paymentTerms", e.target.value)}
                  placeholder="e.g., Net 30 days"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination">Destination</Label>
                <Input
                  id="destination"
                  value={formData.destination}
                  onChange={(e) => handleInputChange("destination", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="otherReferences">Other References</Label>
                <Input
                  id="otherReferences"
                  value={formData.otherReferences}
                  onChange={(e) => handleInputChange("otherReferences", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="deliveryTerms">Terms of Delivery</Label>
                <Input
                  id="deliveryTerms"
                  value={formData.deliveryTerms}
                  onChange={(e) => handleInputChange("deliveryTerms", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <Label className="text-lg font-semibold">Items</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Sr.</TableHead>
                    <TableHead>Description of Goods</TableHead>
                    <TableHead className="w-32">Quantity</TableHead>
                    <TableHead className="w-24">Unit</TableHead>
                    <TableHead className="w-32">Rate per</TableHead>
                    <TableHead className="w-32">Amount (₹)</TableHead>
                    <TableHead className="w-12">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Description of goods"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity || ''}
                          onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                          min="0"
                          step="0.01"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          required
                        />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={item.unit}
                          onValueChange={(value) => updateItem(index, 'unit', value)}
                        >
                          <SelectTrigger className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0">
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="No">No</SelectItem>
                            <SelectItem value="Can">Can</SelectItem>
                            <SelectItem value="Kg">Kg</SelectItem>
                            <SelectItem value="Pair">Pair</SelectItem>
                            <SelectItem value="Ltr">Ltr</SelectItem>
                            <SelectItem value="Set">Set</SelectItem>
                            <SelectItem value="Piece">Piece</SelectItem>
                            <SelectItem value="Box">Box</SelectItem>
                            <SelectItem value="Meter">Meter</SelectItem>
                            <SelectItem value="Roll">Roll</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.rate || ''}
                          onChange={(e) => updateItem(index, 'rate', e.target.value)}
                          min="0"
                          step="0.01"
                          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
                          required
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        ₹{item.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={items.length === 1}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Bank Details */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-semibold text-lg">Bank Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="accountHolder">Account Holder's Name</Label>
                <Input
                  id="accountHolder"
                  value={formData.accountHolder}
                  onChange={(e) => handleInputChange("accountHolder", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  value={formData.bankName}
                  onChange={(e) => handleInputChange("bankName", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  value={formData.accountNumber}
                  onChange={(e) => handleInputChange("accountNumber", e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="branchAndIFSC">Branch & IFS Code</Label>
                <Input
                  id="branchAndIFSC"
                  value={formData.branchAndIFSC}
                  onChange={(e) => handleInputChange("branchAndIFSC", e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Calculation Summary */}
          <div className="border rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-lg">Order Summary</h3>
            <div className="flex justify-between items-center border-t pt-2">
              <span className="font-bold text-lg">Total Amount:</span>
              <span className="text-xl font-bold text-primary">
                ₹{summary.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="mt-4 p-3 bg-muted rounded-md text-sm">
              <div className="font-medium mb-1">Amount in Words:</div>
              <div>{convertToIndianWords(summary.totalAmount)}</div>
            </div>
          </div>

          {/* Terms and Conditions */}
          <div className="space-y-2">
            <Label htmlFor="termsConditions">Terms & Conditions</Label>
            <Textarea
              id="termsConditions"
              value={formData.termsConditions}
              onChange={(e) => handleInputChange("termsConditions", e.target.value)}
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <Button type="submit" className="flex-1" disabled={loading}>
              <Download className="mr-2 h-4 w-4" />
              {loading ? 'Creating...' : 'Create & Download PDF'}
            </Button>
            <Button type="button" variant="outline" onClick={resetForm} className="flex-1">
              Reset Form
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};