import { useState, useEffect } from "react";
import { supabase } from "../../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { Supplier, Shop } from "@/types/schema";
import { Trash2, Plus, Calendar } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";

interface BatchProductFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

interface ProductRow {
  id: string;
  name: string;
  buyingPrice: string;
  sellingPrice: string;
  quantity: string;
  barcode: string;
  watt: string;
  totalPrice?: string;
}

export function BatchProductForm({
  onSuccess,
  onCancel,
}: BatchProductFormProps) {
  const [supplierId, setSupplierId] = useState<string>("");
  const [shopId, setShopId] = useState<string>("");
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);
  const [productRows, setProductRows] = useState<ProductRow[]>([]);
  const [totalAmount, setTotalAmount] = useState<string>("0");
  const [advancePayment, setAdvancePayment] = useState<string>("0");
  const [remainingAmount, setRemainingAmount] = useState<string>("0");
  const [invoiceId, setInvoiceId] = useState<string>("");
  const [date, setDate] = useState<string>(
    new Date().toISOString().split("T")[0],
  );
  const navigate = useNavigate();

  useEffect(() => {
    fetchSuppliers();
    fetchShops();
    addNewRow();
  }, []);

  useEffect(() => {
    let total = 0;
    productRows.forEach((row) => {
      const price = Number(row.buyingPrice) || 0;
      const quantity = Number(row.quantity) || 0;
      total += price * quantity;
    });
    setTotalAmount(total.toFixed(2));
  }, [productRows]);

  useEffect(() => {
    const total = Number(totalAmount) || 0;
    const advance = Number(advancePayment) || 0;
    setRemainingAmount(Math.max(0, total - advance).toFixed(2));
  }, [totalAmount, advancePayment]);

  async function fetchSuppliers() {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name");

      if (error) throw error;
      setSuppliers(data || []);
    } catch (error) {
      console.error("Error fetching suppliers:", error);
      toast({
        variant: "destructive",
        title: "Error fetching suppliers",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function fetchShops() {
    try {
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .order("name");

      if (error) throw error;
      setShops(data || []);
    } catch (error) {
      console.error("Error fetching shops:", error);
      toast({
        variant: "destructive",
        title: "Error fetching shops",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function addNewRow() {
    const newRow: ProductRow = {
      id: Date.now().toString(),
      name: "",
      buyingPrice: "",
      sellingPrice: "",
      quantity: "0",
      barcode: "",
      watt: "",
      totalPrice: "0",
    };
    setProductRows((prev) => [...prev, newRow]);
  }

  function removeRow(id: string) {
    setProductRows((prev) => prev.filter((row) => row.id !== id));
  }

  function updateRowField(id: string, field: keyof ProductRow, value: string) {
    setProductRows((prev) =>
      prev.map((row) => {
        if (row.id === id) {
          const updatedRow = { ...row, [field]: value };
          if (field === "buyingPrice" || field === "quantity") {
            const price =
              Number(field === "buyingPrice" ? value : row.buyingPrice) || 0;
            const quantity =
              Number(field === "quantity" ? value : row.quantity) || 0;
            updatedRow.totalPrice = (price * quantity).toFixed(2);
          }
          return updatedRow;
        }
        return row;
      }),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!supplierId) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Supplier is required",
      });
      return;
    }

    if (!shopId) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Shop is required",
      });
      return;
    }

    const invalidRows = productRows.filter(
      (row) =>
        !row.name.trim() ||
        !row.buyingPrice ||
        isNaN(Number(row.buyingPrice)) ||
        Number(row.buyingPrice) <= 0 ||
        !row.sellingPrice ||
        isNaN(Number(row.sellingPrice)) ||
        Number(row.sellingPrice) <= 0 ||
        !row.quantity ||
        isNaN(Number(row.quantity)) ||
        Number(row.quantity) < 0 ||
        (row.watt && (isNaN(Number(row.watt)) || Number(row.watt) <= 0)),
    );

    if (invalidRows.length > 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: `${invalidRows.length} product(s) have invalid data. Please check all fields.`,
      });
      return;
    }

    try {
      setLoading(true);

      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const invoiceStatus =
        Number(advancePayment) <= 0
          ? "unpaid"
          : Number(advancePayment) >= Number(totalAmount)
            ? "paid"
            : "partially_paid";

      // Get supplier name for the invoice
      const { data: supplierData, error: supplierError } = await supabase
        .from("suppliers")
        .select("name")
        .eq("id", supplierId)
        .single();

      if (supplierError)
        console.error("Error fetching supplier:", supplierError);

      const { data: invoiceData, error: invoiceError } = await supabase
        .from("invoices")
        .insert({
          invoice_number: invoiceNumber,
          total_amount: Number(totalAmount),
          advance_payment: Number(advancePayment),
          remaining_amount: Number(remainingAmount),
          status: invoiceStatus,
          supplier_id: supplierId,
          shop_id: shopId,
          invoice_type: "product_addition",
          created_at: date
            ? new Date(date).toISOString()
            : new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select();

      if (invoiceError) throw invoiceError;

      const invoiceId = invoiceData[0].id;
      setInvoiceId(invoiceId);

      // Process each product row
      for (const row of productRows) {
        // Case insensitive search for product with same name, supplier, and watt
        const { data: existingProducts, error: searchError } = await supabase
          .from("products")
          .select("*, shops(name)")
          .ilike("name", row.name.trim())
          .eq("supplier_id", supplierId);

        if (searchError) throw searchError;

        // Find exact match with case insensitive name and matching watt
        const matchingProduct = existingProducts?.find((p) => {
          const productWatt = row.watt ? Number(row.watt) : null;
          return (
            p.name.toLowerCase() === row.name.trim().toLowerCase() &&
            p.watt === productWatt
          );
        });

        if (matchingProduct) {
          // Update existing product quantity
          const { error: updateError } = await supabase
            .from("products")
            .update({
              quantity: matchingProduct.quantity + Number(row.quantity),
              updated_at: new Date().toISOString(),
            })
            .eq("id", matchingProduct.id);

          if (updateError) throw updateError;
        } else {
          // Create new product
          const { error: insertError } = await supabase
            .from("products")
            .insert({
              name: row.name.trim(),
              buying_price: Number(row.buyingPrice),
              selling_price: Number(row.sellingPrice),
              quantity: Number(row.quantity),
              barcode: row.barcode.trim() || null,
              supplier_id: supplierId,
              shop_id: shopId,
              watt: row.watt ? Number(row.watt) : null,
              invoice_id: invoiceId,
              created_at: date
                ? new Date(date).toISOString()
                : new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });

          if (insertError) throw insertError;
        }
      }

      // Create invoice items
      const invoiceItemsData = productRows.map((row) => ({
        invoice_id: invoiceId,
        product_name: row.name.trim(),
        quantity: Number(row.quantity),
        unit_price: Number(row.buyingPrice),
        total_price: Number(row.buyingPrice) * Number(row.quantity),
        supplier_name: supplierData?.name || "Unknown Supplier",
        created_at: new Date().toISOString(),
        barcode: row.barcode.trim() || null,
        watt: row.watt ? Number(row.watt) : null,
      }));

      const { error: invoiceItemsError } = await supabase
        .from("invoice_items")
        .insert(invoiceItemsData);

      if (invoiceItemsError) throw invoiceItemsError;

      toast({
        title: "Products processed",
        description: `Successfully processed ${productRows.length} product(s) and generated invoice #${invoiceNumber}`,
      });

      navigate(`/dashboard/invoices/${invoiceId}`);
      onSuccess();
    } catch (error) {
      console.error("Error processing products:", error);
      toast({
        variant: "destructive",
        title: "Error processing products",
        description:
          error instanceof Error ? error.message : JSON.stringify(error),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-6 max-h-[80vh] overflow-y-auto pr-2"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="date" className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Date *
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
            <p className="text-sm text-gray-500">
              Date for all products being added
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier *</Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((supplier) => (
                  <SelectItem key={supplier.id} value={supplier.id}>
                    {supplier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              All products will be assigned to this supplier
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="shop">Shop *</Label>
            <Select value={shopId} onValueChange={setShopId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a shop" />
              </SelectTrigger>
              <SelectContent>
                {shops.map((shop) => (
                  <SelectItem key={shop.id} value={shop.id}>
                    {shop.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">
              All products will be assigned to this shop
            </p>
            {shops.length === 0 && (
              <p className="text-xs text-red-500">
                No shops available. Please add a shop first.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Products</Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addNewRow}
              className="flex items-center gap-1"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Product
            </Button>
          </div>

          <div className="border rounded-md overflow-x-auto">
            <div className="min-w-[800px] max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[20%]">Product Name</TableHead>
                    <TableHead className="w-[12%]">Buying Price</TableHead>
                    <TableHead className="w-[12%]">Selling Price</TableHead>
                    <TableHead className="w-[10%]">Quantity</TableHead>
                    <TableHead className="w-[12%]">Total Price</TableHead>
                    <TableHead className="w-[10%]">Watt</TableHead>
                    <TableHead className="w-[15%]">Barcode</TableHead>
                    <TableHead className="w-[5%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <Input
                          value={row.name}
                          onChange={(e) =>
                            updateRowField(row.id, "name", e.target.value)
                          }
                          placeholder="Product name"
                          required
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.buyingPrice}
                          onChange={(e) =>
                            updateRowField(
                              row.id,
                              "buyingPrice",
                              e.target.value,
                            )
                          }
                          placeholder="0.00"
                          required
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={row.sellingPrice}
                          onChange={(e) =>
                            updateRowField(
                              row.id,
                              "sellingPrice",
                              e.target.value,
                            )
                          }
                          placeholder="0.00"
                          required
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={row.quantity}
                          onChange={(e) =>
                            updateRowField(row.id, "quantity", e.target.value)
                          }
                          placeholder="0"
                          required
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={row.totalPrice || "0.00"}
                          readOnly
                          className="bg-gray-50 w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          value={row.watt}
                          onChange={(e) =>
                            updateRowField(row.id, "watt", e.target.value)
                          }
                          placeholder="Watt"
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.barcode}
                          onChange={(e) =>
                            updateRowField(row.id, "barcode", e.target.value)
                          }
                          placeholder="Barcode"
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeRow(row.id)}
                          disabled={productRows.length === 1}
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
          <p className="text-xs text-gray-500 italic mt-1">
            Scroll horizontally if all columns are not visible on smaller
            screens
          </p>
        </div>
      </div>

      <Separator className="my-6" />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Payment Information</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <div className="space-y-2">
            <Label htmlFor="totalAmount">Total Amount</Label>
            <Input
              id="totalAmount"
              type="number"
              step="0.01"
              min="0"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="bg-gray-50"
              readOnly
            />
            <p className="text-xs text-gray-500">
              Automatically calculated (buying price × quantity)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="advancePayment">Advance Payment</Label>
            <Input
              id="advancePayment"
              type="number"
              step="0.01"
              min="0"
              max={totalAmount}
              value={advancePayment}
              onChange={(e) => setAdvancePayment(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="remainingAmount">Remaining Amount</Label>
            <Input
              id="remainingAmount"
              type="number"
              value={remainingAmount}
              className="bg-gray-50"
              readOnly
            />
            <p className="text-xs text-gray-500">
              Total Amount - Advance Payment
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading} className="w-full sm:w-auto">
          {loading ? (
            <span className="flex items-center gap-2">
              <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              Saving Products & Generating Invoice...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              Save Products & Generate Invoice
            </span>
          )}
        </Button>
      </div>
    </form>
  );
}
