import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { ArrowLeft, Download, Printer, Plus, RotateCcw } from "lucide-react";
import { usePDF } from "react-to-pdf";
import { ReturnForm } from "../returns/ReturnForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Invoice = {
  id: string;
  invoice_number: string;
  created_at: string;
  total_amount: number;
  advance_payment: number;
  remaining_amount: number;
  status: "paid" | "partially_paid" | "unpaid";
  supplier_id: string;
  shop_id: string;
  supplier_name?: string;
  shop_name?: string;
  shop_address?: string;
  shop_phone?: string;
  supplier_details?: any;
  shop_details?: any;
  products?: any[];
  invoice_items?: any[];
  payments?: any[];
  invoice_type?: "sales" | "product_addition";
  notes?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_id?: string;
  customer_details?: any;
};

export function InvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddPaymentOpen, setIsAddPaymentOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  const [isReturnDialogOpen, setIsReturnDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toPDF, targetRef } = usePDF({
    filename: `invoice-${invoice?.invoice_number}.pdf`,
  });

  useEffect(() => {
    if (id) {
      fetchInvoiceDetails(id);
    }
  }, [id]);

  async function fetchInvoiceDetails(invoiceId: string) {
    try {
      setLoading(true);
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (invoiceError) throw invoiceError;
      if (!invoiceData) throw new Error("Invoice not found");

      let supplierData = null;
      if (invoiceData.supplier_id) {
        const { data, error: supplierError } = await supabase
          .from("suppliers")
          .select("*")
          .eq("id", invoiceData.supplier_id)
          .single();
        if (!supplierError) supplierData = data;
      }

      let customerData = null;
      if (invoiceData.customer_id) {
        const { data, error: customerError } = await supabase
          .from("customers")
          .select("*")
          .eq("id", invoiceData.customer_id)
          .single();
        if (!customerError) customerData = data;
      }

      let shopData = null;
      if (invoiceData.shop_id) {
        const { data, error: shopError } = await supabase
          .from("shops")
          .select("*")
          .eq("id", invoiceData.shop_id)
          .single();
        if (!shopError) shopData = data;
      }

      const { data: invoiceItemsData, error: invoiceItemsError } =
        await supabase
          .from("invoice_items")
          .select("*, products(id, name, barcode, watt)")
          .eq("invoice_id", invoiceId);

      if (invoiceItemsError) throw invoiceItemsError;

      const processedInvoiceItems = invoiceItemsData?.map((item) => ({
        ...item,
        product_id: (item.products && item.products.id) || item.product_id,
        product_name:
          item.product_name ||
          (item.products && item.products.name) ||
          "Unknown Product",
        product_barcode:
          item.barcode || (item.products && item.products.barcode) || null,
        product_watt:
          item.watt || (item.products && item.products.watt) || null,
      }));

      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("invoice_id", invoiceId);

      if (productsError) throw productsError;

      const { data: paymentsData, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .eq("invoice_id", invoiceId)
        .order("payment_date", { ascending: false });

      if (paymentsError) throw paymentsError;

      setInvoice({
        ...invoiceData,
        supplier_name: supplierData?.name || "Unknown Supplier",
        shop_name: shopData?.name || "Unknown Shop",
        shop_address: shopData?.address || "",
        shop_phone: shopData?.phone || "",
        supplier_details: supplierData || {},
        shop_details: shopData || {},
        customer_details: customerData || {},
        products: productsData || [],
        invoice_items: processedInvoiceItems || [],
        payments: paymentsData || [],
      });
    } catch (error) {
      console.error("Error fetching invoice details:", error);
      toast({
        variant: "destructive",
        title: "Error fetching invoice",
        description: error instanceof Error ? error.message : String(error),
      });
      navigate("/dashboard/invoices");
    } finally {
      setLoading(false);
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "border-green-600 bg-green-100 text-green-800";
      case "partially_paid":
        return "border-yellow-600 bg-yellow-100 text-yellow-800";
      case "unpaid":
        return "border-red-600 bg-red-100 text-red-800";
      default:
        return "border-gray-600 bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "paid":
        return "PAID";
      case "partially_paid":
        return "PARTIALLY PAID";
      case "unpaid":
        return "UNPAID";
      default:
        return status.toUpperCase();
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleAddPayment = async () => {
    if (!id || !invoice) return;

    if (
      !paymentAmount ||
      isNaN(Number(paymentAmount)) ||
      Number(paymentAmount) <= 0
    ) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Please enter a valid payment amount",
      });
      return;
    }

    if (Number(paymentAmount) > invoice.remaining_amount) {
      toast({
        variant: "destructive",
        title: "Invalid Amount",
        description: "Payment amount cannot exceed remaining balance",
      });
      return;
    }

    try {
      setIsSubmittingPayment(true);
      const { error: paymentError } = await supabase.from("payments").insert({
        invoice_id: id,
        amount: Number(paymentAmount),
        payment_method: paymentMethod,
        notes: paymentNotes,
        payment_date: new Date().toISOString(),
      });

      if (paymentError) throw paymentError;

      const newRemainingAmount = Math.max(
        0,
        invoice.remaining_amount - Number(paymentAmount),
      );
      const newStatus = newRemainingAmount <= 0 ? "paid" : "partially_paid";

      const { error: invoiceError } = await supabase
        .from("invoices")
        .update({
          remaining_amount: newRemainingAmount,
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);

      if (invoiceError) throw invoiceError;

      toast({
        title: "Payment Recorded",
        description: `Payment of $${Number(paymentAmount).toFixed(2)} successfully recorded`,
      });

      setPaymentAmount("");
      setPaymentMethod("cash");
      setPaymentNotes("");
      setIsAddPaymentOpen(false);
      fetchInvoiceDetails(id);
    } catch (error) {
      console.error("Error adding payment:", error);
      toast({
        variant: "destructive",
        title: "Payment Error",
        description:
          error instanceof Error ? error.message : "Failed to process payment",
      });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12 text-gray-600">Invoice not found</div>
    );
  }

  const getDiscountAmount = () => {
    if (!invoice.notes) return 0;
    const discountMatch = invoice.notes.match(/Discount: ([\d.]+)/);
    return discountMatch ? parseFloat(discountMatch[1]) : 0;
  };

  const discountAmount = getDiscountAmount();
  const subtotalBeforeDiscount = invoice.total_amount + discountAmount;

  return (
    <div className="space-y-8 print:space-y-0">
      <div className="flex justify-between items-center print:hidden">
        <Button
          variant="outline"
          onClick={() => navigate("/dashboard/invoices")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Invoices
        </Button>
        <div className="flex gap-3">
          {invoice.remaining_amount > 0 && (
            <Button
              onClick={() => setIsAddPaymentOpen(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Plus className="h-4 w-4" /> Add Payment
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handlePrint}
            className="flex items-center gap-2"
          >
            <Printer className="h-4 w-4" /> Print
          </Button>
          {invoice.invoice_type === "sales" && (
            <Button
              variant="outline"
              onClick={() => setIsReturnDialogOpen(true)}
              className="flex items-center gap-2 border-orange-600 text-orange-600 hover:bg-orange-50"
            >
              <RotateCcw className="h-4 w-4" /> Initiate Return
            </Button>
          )}
          <Button
            onClick={() => toPDF()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          >
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      <Card
        className="border-none print:border print:shadow-none"
        ref={targetRef}
      >
        <CardContent className="p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-serif font-bold text-gray-900">
              SHAJALAL LIGHTING
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Invoice #{invoice.invoice_number}
            </p>
            <Badge
              variant="outline"
              className={`mt-2 ${getStatusColor(invoice.status)} font-semibold`}
            >
              {getStatusLabel(invoice.status)}
            </Badge>
          </div>

          {/* Company Info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h2 className="text-sm font-semibold text-gray-700 uppercase">
                Billed From
              </h2>
              <p className="mt-2 font-medium">SHAJALAL LIGHTING</p>
              <p className="text-sm text-gray-600">
                {invoice.shop_address || "Address not specified"}
              </p>
              <p className="text-sm text-gray-600">
                {invoice.shop_phone || "Phone not specified"}
              </p>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-700 uppercase">
                Billed To
              </h2>
              <p className="mt-2 font-medium">
                {invoice.invoice_type === "sales"
                  ? invoice.customer_name ||
                    invoice.customer_details?.name ||
                    "Unknown Customer"
                  : invoice.supplier_name}
              </p>
              <p className="text-sm text-gray-600">
                {invoice.invoice_type === "sales"
                  ? invoice.customer_phone ||
                    invoice.customer_details?.phone ||
                    ""
                  : ""}
              </p>
              {invoice.invoice_type === "sales" &&
                invoice.customer_details?.address && (
                  <p className="text-sm text-gray-600">
                    {invoice.customer_details.address}
                  </p>
                )}
            </div>
          </div>

          {/* Invoice Details */}
          <div className="mb-8">
            <div className="flex justify-between text-sm">
              <div>
                <p className="font-semibold text-gray-700">Invoice Date:</p>
                <p>{new Date(invoice.created_at).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="font-semibold text-gray-700">Invoice Type:</p>
                <p>{invoice.invoice_type === "sales" ? "Sales" : "Purchase"}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                    Description
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                    Qty
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                    Unit Price
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-gray-700">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {invoice.invoice_items && invoice.invoice_items.length > 0 ? (
                  invoice.invoice_items.map((item) => (
                    <tr key={item.id} className="border-b border-gray-200">
                      <td className="py-3 px-4">
                        <p className="font-medium">{item.product_name}</p>
                        {item.product_barcode && (
                          <p className="text-xs text-gray-600">
                            Barcode: {item.product_barcode}
                          </p>
                        )}
                        {item.product_watt && (
                          <p className="text-xs text-gray-600">
                            Wattage: {item.product_watt}W
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">{item.quantity}</td>
                      <td className="py-3 px-4">
                        ${Number(item.unit_price).toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        ${Number(item.total_price).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : invoice.products && invoice.products.length > 0 ? (
                  invoice.products.map((product) => (
                    <tr key={product.id} className="border-b border-gray-200">
                      <td className="py-3 px-4">
                        <p className="font-medium">{product.name}</p>
                        {product.barcode && (
                          <p className="text-xs text-gray-600">
                            Barcode: {product.barcode}
                          </p>
                        )}
                        {product.watt && (
                          <p className="text-xs text-gray-600">
                            Wattage: {product.watt}W
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">{product.quantity}</td>
                      <td className="py-3 px-4">
                        $
                        {invoice.invoice_type === "product_addition"
                          ? product.buying_price.toFixed(2)
                          : product.selling_price.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        $
                        {(
                          product.quantity *
                          (invoice.invoice_type === "product_addition"
                            ? product.buying_price
                            : product.selling_price)
                        ).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="py-3 px-4 text-center text-gray-600"
                    >
                      No items found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end mb-8">
            <div className="w-72 text-sm">
              <div className="flex justify-between py-2">
                <span className="font-semibold">Subtotal:</span>
                <span>${subtotalBeforeDiscount.toFixed(2)}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between py-2">
                  <span className="font-semibold">Discount:</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between py-2 border-t border-gray-300">
                <span className="font-semibold">Total:</span>
                <span>${invoice.total_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="font-semibold">Paid:</span>
                <span>${invoice.advance_payment.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-2 border-t border-gray-300">
                <span className="font-bold">Balance Due:</span>
                <span className="font-bold">
                  ${invoice.remaining_amount.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center text-xs text-gray-600 border-t pt-4">
            <p>Thank you for your business with SHAJALAL LIGHTING</p>
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Add payment for Invoice #{invoice?.invoice_number} - Balance: $
              {invoice?.remaining_amount.toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={invoice?.remaining_amount}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="method" className="text-right">
                Method
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="col-span-3">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Credit Card</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="check">Check</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="notes" className="text-right">
                Notes
              </Label>
              <Input
                id="notes"
                value={paymentNotes}
                onChange={(e) => setPaymentNotes(e.target.value)}
                className="col-span-3"
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAddPaymentOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleAddPayment} disabled={isSubmittingPayment}>
              {isSubmittingPayment ? "Processing..." : "Record Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={isReturnDialogOpen} onOpenChange={setIsReturnDialogOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Initiate Return</DialogTitle>
            <DialogDescription>
              Process return for Invoice #{invoice?.invoice_number}
            </DialogDescription>
          </DialogHeader>
          <ReturnForm
            invoice={invoice}
            onSuccess={() => {
              setIsReturnDialogOpen(false);
              toast({
                title: "Return Processed",
                description: "Return request successfully created",
              });
            }}
            onCancel={() => setIsReturnDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
