import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { ArrowLeft, Download, Printer, Plus } from "lucide-react";
import { usePDF } from "react-to-pdf";
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

      // Fetch invoice details
      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .select("*")
        .eq("id", invoiceId)
        .single();

      if (invoiceError) throw invoiceError;
      if (!invoiceData) throw new Error("Invoice not found");

      // Fetch supplier details
      let supplierData = null;
      if (invoiceData.supplier_id) {
        const { data, error: supplierError } = await supabase
          .from("suppliers")
          .select("*")
          .eq("id", invoiceData.supplier_id)
          .single();

        if (!supplierError) {
          supplierData = data;
        }
      }

      // Fetch shop details
      let shopData = null;
      if (invoiceData.shop_id) {
        const { data, error: shopError } = await supabase
          .from("shops")
          .select("*")
          .eq("id", invoiceData.shop_id)
          .single();

        if (!shopError) {
          shopData = data;
        }
      }

      // Fetch invoice items associated with this invoice
      const { data: invoiceItemsData, error: invoiceItemsError } =
        await supabase
          .from("invoice_items")
          .select("*")
          .eq("invoice_id", invoiceId);

      if (invoiceItemsError) throw invoiceItemsError;

      // Fetch products associated with this invoice
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .eq("invoice_id", invoiceId);

      if (productsError) throw productsError;

      // Fetch payment history
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
        products: productsData || [],
        invoice_items: invoiceItemsData || [],
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
        return "border-green-200 bg-green-50 text-green-600";
      case "partially_paid":
        return "border-yellow-200 bg-yellow-50 text-yellow-600";
      case "unpaid":
        return "border-red-200 bg-red-50 text-red-600";
      default:
        return "";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "paid":
        return "Paid";
      case "partially_paid":
        return "Partially Paid";
      case "unpaid":
        return "Unpaid";
      default:
        return status;
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
        title: "Invalid amount",
        description: "Please enter a valid payment amount",
      });
      return;
    }

    if (Number(paymentAmount) > invoice.remaining_amount) {
      toast({
        variant: "destructive",
        title: "Invalid amount",
        description: "Payment amount cannot exceed the remaining amount",
      });
      return;
    }

    try {
      setIsSubmittingPayment(true);

      // Add payment record
      const { error: paymentError } = await supabase.from("payments").insert({
        invoice_id: id,
        amount: Number(paymentAmount),
        payment_method: paymentMethod,
        notes: paymentNotes,
        payment_date: new Date().toISOString(),
      });

      if (paymentError) throw paymentError;

      // Update invoice remaining amount and status
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
        title: "Payment added",
        description: `Payment of ${Number(paymentAmount).toFixed(2)} has been recorded successfully.`,
      });

      // Reset form and close dialog
      setPaymentAmount("");
      setPaymentMethod("cash");
      setPaymentNotes("");
      setIsAddPaymentOpen(false);

      // Refresh invoice details
      fetchInvoiceDetails(id);
    } catch (error) {
      console.error("Error adding payment:", error);
      toast({
        variant: "destructive",
        title: "Error adding payment",
        description:
          error instanceof Error
            ? error.message
            : "An error occurred while adding payment",
      });
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-10 text-gray-500">Invoice not found.</div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => navigate("/dashboard/invoices")}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Invoices
        </Button>
        <div className="flex gap-2">
          {invoice.remaining_amount > 0 && (
            <Button
              onClick={() => setIsAddPaymentOpen(true)}
              variant="default"
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
          <Button onClick={() => toPDF()} className="flex items-center gap-2">
            <Download className="h-4 w-4" /> Download PDF
          </Button>
        </div>
      </div>

      <Card
        className="bg-white print:shadow-none overflow-auto max-h-[80vh]"
        ref={targetRef}
      >
        <CardContent className="p-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">INVOICE</h1>
              <p className="text-gray-500 mt-1">#{invoice.invoice_number}</p>
            </div>
            <Badge
              variant="outline"
              className={`${getStatusColor(invoice.status)} text-sm px-3 py-1`}
            >
              {getStatusLabel(invoice.status)}
            </Badge>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-8">
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase">
                From
              </h3>
              <p className="text-lg font-medium mt-1">
                {invoice.supplier_name}
              </p>
              <p className="text-gray-600 mt-1">
                Supplier ID: {invoice.supplier_id}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase">
                To
              </h3>
              <p className="text-lg font-medium mt-1">{invoice.shop_name}</p>
              {invoice.shop_address && (
                <p className="text-gray-600 mt-1">{invoice.shop_address}</p>
              )}
              {invoice.shop_phone && (
                <p className="text-gray-600">{invoice.shop_phone}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 mt-8">
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase">
                Invoice Date
              </h3>
              <p className="text-base mt-1">
                {new Date(invoice.created_at).toLocaleDateString()}
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500 uppercase">
                Payment Details
              </h3>
              <p className="text-base mt-1">
                Total Amount: ${invoice.total_amount.toFixed(2)}
              </p>
              <p className="text-base">
                Advance Payment: ${invoice.advance_payment.toFixed(2)}
              </p>
              <p className="text-base font-medium">
                Remaining Amount: ${invoice.remaining_amount.toFixed(2)}
              </p>
            </div>
          </div>

          <Separator className="my-8" />

          <h3 className="text-lg font-medium">Products</h3>
          <div className="mt-4 border rounded-md overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Unit Price
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {invoice.invoice_items && invoice.invoice_items.length > 0 ? (
                  invoice.invoice_items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div>
                          <p>{item.product_name || "Unknown Product"}</p>
                          <p className="text-xs text-gray-500">
                            Supplier: {item.supplier_name || "Unknown"}
                          </p>
                          {item.product_barcode && (
                            <p className="text-xs text-gray-500">
                              Barcode: {item.product_barcode}
                            </p>
                          )}
                          {item.product_watt && (
                            <p className="text-xs text-gray-500">
                              Wattage: {item.product_watt}W
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${Number(item.unit_price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${Number(item.total_price).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : invoice.products && invoice.products.length > 0 ? (
                  invoice.products.map((product) => (
                    <tr key={product.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        <div>
                          <p>{product.name}</p>
                          <p className="text-xs text-gray-500">
                            Supplier: {product.supplier_name || "Unknown"}
                          </p>
                          {product.watt && (
                            <p className="text-xs text-gray-500">
                              Wattage: {product.watt}W
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.quantity}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${product.selling_price.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${(product.quantity * product.selling_price).toFixed(2)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-4 text-center text-sm text-gray-500"
                    >
                      No products found for this invoice.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-8 flex justify-end">
            <div className="w-80 space-y-2">
              <div className="flex justify-between">
                <p className="text-gray-600">Subtotal:</p>
                <p className="font-medium">
                  ${invoice.total_amount.toFixed(2)}
                </p>
              </div>
              <div className="flex justify-between">
                <p className="text-gray-600">Initial Payment:</p>
                <p className="font-medium">
                  ${invoice.advance_payment.toFixed(2)}
                </p>
              </div>
              {invoice.payments && invoice.payments.length > 0 && (
                <div className="pt-2">
                  <p className="text-gray-600 text-sm font-medium">
                    Additional Payments:
                  </p>
                  {invoice.payments.map((payment, index) => (
                    <div
                      key={payment.id}
                      className="flex justify-between text-sm pl-4 pt-1"
                    >
                      <p className="text-gray-600">
                        {new Date(payment.payment_date).toLocaleDateString()} (
                        {payment.payment_method}):
                      </p>
                      <p className="font-medium">
                        ${Number(payment.amount).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              )}
              <Separator className="my-2" />
              <div className="flex justify-between">
                <p className="text-gray-800 font-medium">Remaining Amount:</p>
                <p className="font-bold">
                  ${invoice.remaining_amount.toFixed(2)}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t">
            <p className="text-center text-gray-500 text-sm">
              Thank you for your business. For any questions regarding this
              invoice, please contact us.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Add Payment Dialog */}
      <Dialog open={isAddPaymentOpen} onOpenChange={setIsAddPaymentOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add Payment</DialogTitle>
            <DialogDescription>
              Record a payment for invoice #{invoice.invoice_number}. Remaining
              amount: ${invoice.remaining_amount.toFixed(2)}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="amount" className="text-right">
                Amount
              </Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                max={invoice.remaining_amount}
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                className="col-span-3"
                placeholder="0.00"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="method" className="text-right">
                Method
              </Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select payment method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
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
                placeholder="Optional notes"
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
              {isSubmittingPayment ? (
                <span className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Processing...
                </span>
              ) : (
                "Add Payment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
