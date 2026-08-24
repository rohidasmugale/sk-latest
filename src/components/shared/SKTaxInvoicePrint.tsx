import { Invoice, InvoiceItem } from "./Billing";
import { formatCurrency, convertToIndianWords } from "../../utils/formatters";

interface PrintableInvoiceProps {
  invoice: Invoice;
  onClose: () => void;
}

// Extend InvoiceItem with optional fields used in tax invoices
type ExtendedInvoiceItem = InvoiceItem & {
  designation?: string;
  monthlyRate?: number;
  days?: number;
};

type GroupedItem = {
  mainDesc: string;
  items: ExtendedInvoiceItem[];
};

export const SKTaxInvoicePrint = ({ invoice, onClose }: PrintableInvoiceProps) => {
  const handlePrint = () => {
    const printContent = document.getElementById("tax-invoice-print")?.innerHTML;
    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      alert("Please allow pop-ups for this site to print.");
      return;
    }

    printWindow.document.write(`
<!DOCTYPE html>
<html>
  <head>
    <title>Tax Invoice - ${invoice.invoiceNumber}</title>
    <style>
      @page {
        size: A4 portrait;
        margin: 10mm;
      }
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      body {
        font-family: 'Arial', sans-serif;
        background: white;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
      .invoice-container {
        width: 100%;
        max-width: 100%;
        margin: 0 auto;
        background: white;
      }
      .header { text-align: center; border-bottom: 2px solid #1e3a8a; margin-bottom: 15px; padding-bottom: 10px; }
      .company-name { font-size: 26px; font-weight: bold; color: #1e3a8a; }
      .services { font-size: 13px; margin: 5px 0; display: flex; justify-content: center; gap: 20px; }
      .address, .contact { font-size: 11px; margin: 3px 0; }
      .title { text-align: center; margin: 15px 0; }
      .title h3 { font-size: 20px; font-weight: bold; border-top: 2px solid black; border-bottom: 2px solid black; display: inline-block; padding: 6px 30px; }
      .service-period { background: #f3f4f6; text-align: center; padding: 5px; border-radius: 6px; margin: 10px 0; font-size: 12px; font-weight: 500; }
      .site-section { border: 1px solid #ccc; border-radius: 6px; padding: 10px; background: #f9fafb; margin: 10px 0; }
      .info-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 11px; }
      .info-table td, .info-table th { border: 1px solid #ccc; padding: 5px 8px; vertical-align: top; }
      .info-table td:first-child { font-weight: 600; width: 35%; background: #f9fafb; }
      .items-table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 10px; }
      .items-table th, .items-table td { border: 1px solid #000; padding: 4px 6px; vertical-align: top; }
      .items-table th { background: #f5f5f5; font-weight: 700; text-align: center; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .summary { width: 280px; margin-left: auto; border: 1px solid #ccc; border-radius: 4px; margin-top: 15px; }
      .summary-row { display: flex; justify-content: space-between; padding: 6px 10px; border-bottom: 1px solid #eee; font-size: 11px; }
      .total-row { background: #eef2ff; font-weight: bold; font-size: 13px; }
      .words { background: #f3f4f6; padding: 8px; border-radius: 4px; margin: 15px 0; font-size: 11px; }
      .bank-details { margin: 15px 0; font-size: 10px; border-top: 1px solid #ccc; padding-top: 8px; }
      .signatures { display: flex; justify-content: space-between; margin-top: 30px; }
      .signature-box { width: 180px; text-align: center; }
      .signature-line { border-top: 1px solid black; margin-top: 25px; padding-top: 5px; font-size: 10px; }
      .footer { text-align: center; font-size: 9px; color: gray; margin-top: 15px; }
      @media print { button { display: none; } body { padding: 0; } }
    </style>
  </head>
  <body>
    <div class="invoice-container">${printContent}</div>
    <script>
      window.onload = function() {
        window.print();
        window.onafterprint = function() {
          window.close();
        };
      };
    </script>
  </body>
</html>
`);

    printWindow.document.close();
  };

  const getFormattedPeriod = () => {
    if (invoice.servicePeriodFrom && invoice.servicePeriodTo) {
      const from = new Date(invoice.servicePeriodFrom).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      const to = new Date(invoice.servicePeriodTo).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
      return `${from} to ${to}`;
    }
    return "";
  };

  // Group items by main description (for row-span)
  const groupedItems = (): GroupedItem[] => {
    const groups: GroupedItem[] = [];
    invoice.items.forEach(item => {
      let mainDesc = item.description;
      let designation = (item as ExtendedInvoiceItem).designation || "";
      // If no explicit designation, try to split on " - "
      if (!designation && mainDesc.includes(" - ")) {
        const parts = mainDesc.split(" - ");
        mainDesc = parts[0];
        designation = parts.slice(1).join(" - ");
      }
      const existing = groups.find(g => g.mainDesc === mainDesc);
      const extendedItem: ExtendedInvoiceItem = { ...item, designation };
      if (existing) {
        existing.items.push(extendedItem);
      } else {
        groups.push({ mainDesc, items: [extendedItem] });
      }
    });
    return groups;
  };

  const groups = groupedItems();
  const subtotal = invoice.items.reduce((s, i) => s + i.amount, 0);
  const total = invoice.amount;
  const sgst = invoice.tax / 2;
  const cgst = invoice.tax / 2;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-auto">
        <div className="sticky top-0 bg-gray-100 p-3 flex justify-between border-b">
          <h2 className="text-lg font-bold">Tax Invoice Preview</h2>
          <div className="space-x-2">
            <button onClick={handlePrint} className="bg-blue-600 text-white px-4 py-2 rounded text-sm">
              🖨️ Print / Save as PDF
            </button>
            <button onClick={onClose} className="bg-gray-500 text-white px-4 py-2 rounded text-sm">
              Close
            </button>
          </div>
        </div>

        <div id="tax-invoice-print" className="p-6">
          {/* <!-- Header --> */}
          <div className="header">
            <div className="company-name">S.K. ENTERPRISES</div>
            <div className="services">Housekeeping | Parking | Waste Management</div>
            <div className="address">Office No.505, 5th Floor, Global Square Building, Deccan College Road, Yerawada, Pune - 411006</div>
            <div className="contact">📞 +91 9158984091 / +91 7028577271 &nbsp;|&nbsp; ✉️ s.k.enterprises7583@gmail.com</div>
          </div>

          <div className="title"><h3>TAX INVOICE</h3></div>
          {getFormattedPeriod() && <div className="service-period">{getFormattedPeriod()}</div>}

          {/* <!-- Site / Client Section --> */}
          <div className="site-section">
            <div><strong>Select Site / Client</strong></div>
            <div><strong>Site:</strong> {invoice.site || invoice.clientAddress || "—"}</div>
          </div>

          {/* <!-- Client & Invoice Details (2‑column table) --> */}
          <table className="info-table">
            <tbody>
              <tr><td>Client Name</td><td>{invoice.client}</td><td>Invoice No</td><td>{invoice.invoiceNumber}</td></tr>
              <tr><td>Address</td><td>{invoice.clientAddress || invoice.site || "—"}</td><td>Date</td><td>{invoice.date}</td></tr>
              <tr><td>PAN NO</td><td>{invoice.panNumber || "ALKPK7734N"}</td><td>ST NO</td><td>{invoice.gstNumber || "27ALKPK7734NL2E"}</td></tr>
              <tr><td>Service Tax Category</td><td>{invoice.serviceType || "Manpower"}</td><td>ESIC NO</td><td>{invoice.esicNumber || "33000457830001001"}</td></tr>
              <tr><td>GST</td><td>{invoice.gstNumber || "27ALKPK7734NL2E"}</td><td>LWF NO</td><td>{invoice.lwfNumber || "PUN60715PROV"}</td></tr>
              <tr><td>PF NO</td><td>{invoice.pfNumber || "PUPUN1012226"}</td><td></td><td></td></tr>
            </tbody>
          </table>

          {/* <!-- Items Table with Row‑span Grouping --> */}
          <table className="items-table">
            <thead>
              <tr>
                <th className="text-center" style={{ width: "35px" }}>SR NO</th>
                <th>DESCRIPTION</th>
                <th>DESIGNATION</th>
                <th className="text-center" style={{ width: "45px" }}>QTY</th>
                <th className="text-center" style={{ width: "45px" }}>DAYS</th>
                <th className="text-right" style={{ width: "80px" }}>RATE PER MONTH</th>
                <th className="text-right" style={{ width: "80px" }}>RATE (₹)</th>
                <th className="text-right" style={{ width: "100px" }}>AMOUNT (₹)</th>
              </tr>
            </thead>
            <tbody>
              {groups.map((group, groupIdx) => {
                const rowSpan = group.items.length;
                const periodLine = getFormattedPeriod() ? `For The Period Of ${getFormattedPeriod()}` : "";
                return group.items.map((item, idx) => (
                  <tr key={`${groupIdx}-${idx}`}>
                    {idx === 0 && (
                      <>
                        <td rowSpan={rowSpan} className="text-center align-middle">{groupIdx + 1}</td>
                        <td rowSpan={rowSpan} className="align-middle">
                          {group.mainDesc}<br />
                          {periodLine && <span className="text-xs">{periodLine}</span>}
                        </td>
                      </>
                    )}
                    <td>{item.designation || "-"}</td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-center">{item.days ?? "-"}</td>
                    <td className="text-right">{item.monthlyRate ? formatCurrency(item.monthlyRate) : "-"}</td>
                    <td className="text-right">{formatCurrency(item.rate)}</td>
                    <td className="text-right">{formatCurrency(item.amount)}</td>
                  </tr>
                ));
              })}
            </tbody>
          </table>

          <div style={{ display: "flex", justifyContent: "space-between", margin: "10px 0", fontSize: "11px" }}>
            <div><strong>SAC Code-</strong>{invoice.sacCode || "999424"}</div>
            <div><strong>Service Location:</strong> {invoice.serviceLocation || "Maharashtra"}</div>
          </div>

          <div className="summary">
            <div className="summary-row"><span>Net Taxable Value</span><span>{formatCurrency(subtotal)}</span></div>
            <div className="summary-row"><span>SGST @9%</span><span>{formatCurrency(sgst)}</span></div>
            <div className="summary-row"><span>CGST @9%</span><span>{formatCurrency(cgst)}</span></div>
            {invoice.managementFeesAmount !== undefined && invoice.managementFeesAmount !== 0 && (
              <div className="summary-row">
                <span>Management Fees ({invoice.managementFeesPercent || 0}%)</span>
                <span>{formatCurrency(invoice.managementFeesAmount)}</span>
              </div>
            )}
            {invoice.roundUp !== undefined && invoice.roundUp !== 0 && <div className="summary-row"><span>Round Up</span><span>{formatCurrency(invoice.roundUp)}</span></div>}
            <div className="summary-row total-row"><span>Total Amount</span><span>{formatCurrency(total)}</span></div>
          </div>

          <div className="words">
            <div><strong>Amount in words:</strong> {convertToIndianWords(total)}</div>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <strong>Terms & Conditions</strong>
            <div style={{ fontSize: "10px" }}>
              {invoice.termsConditions || "We declare that this invoice shows the actual price of the goods & service described and that all particulars are true and correct."}
            </div>
          </div>

          <div className="bank-details">
            <div>Account No.: {invoice.accountNumber || "61068661338"} | IFSC Code: {invoice.ifscCode || "MAHB0001223"}</div>
            <div>Account Name: S.K. ENTERPRISES</div>
          </div>

          <div className="signatures">
            <div className="signature-box"><div className="signature-line">Receiver's Signature</div></div>
            <div className="signature-box"><div className="signature-line">Authorized Signatory</div></div>
          </div>
          <div className="footer">This is a Computer Generated Document</div>
        </div>
      </div>
    </div>
  );
};