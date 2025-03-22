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
import { Trash2, Plus } from "lucide-react";
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
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select();

      if (invoiceError) throw invoiceError;

      const invoiceId = invoiceData[0].id;
      setInvoiceId(invoiceId);

      const productsData = productRows.map((row) => ({
        name: row.name.trim(),
        buying_price: Number(row.buyingPrice),
        selling_price: Number(row.sellingPrice),
        quantity: Number(row.quantity),
        barcode: row.barcode.trim() || null,
        supplier_id: supplierId,
        shop_id: shopId,
        watt: row.watt ? Number(row.watt) : null,
        invoice_id: invoiceId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      const { data, error } = await supabase
        .from("products")
        .insert(productsData)
        .select();

      if (error) throw error;

      toast({
        title: "Products added",
        description: `Successfully added ${productsData.length} product(s) and generated invoice #${invoiceNumber}`,
      });

      navigate(`/dashboard/invoices/${invoiceId}`);
      onSuccess();
    } catch (error) {
      console.error("Error adding products:", error);
      toast({
        variant: "destructive",
        title: "Error adding products",
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
      className="space-y-6 max-h-[80vh] overflow-auto pr-2"
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div className="border rounded-md overflow-auto max-h-[400px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Buying Price</TableHead>
                  <TableHead>Selling Price</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Total Price</TableHead>
                  <TableHead>Watt</TableHead>
                  <TableHead>Barcode</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
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
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.buyingPrice}
                        onChange={(e) =>
                          updateRowField(row.id, "buyingPrice", e.target.value)
                        }
                        placeholder="0.00"
                        required
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={row.sellingPrice}
                        onChange={(e) =>
                          updateRowField(row.id, "sellingPrice", e.target.value)
                        }
                        placeholder="0.00"
                        required
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
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        value={row.totalPrice || "0.00"}
                        readOnly
                        className="bg-gray-50"
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
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row.barcode}
                        onChange={(e) =>
                          updateRowField(row.id, "barcode", e.target.value)
                        }
                        placeholder="Barcode"
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
      </div>

      <Separator className="my-6" />

      <div className="space-y-4">
        <h3 className="text-lg font-medium">Payment Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

      <div className="flex justify-end gap-2 mt-6">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
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
