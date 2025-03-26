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
import { Supplier, Shop, Product } from "@/types/schema";
import { Trash2, Plus, Calendar, Search } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
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
  size: string;
  color: string;
  model: string;
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
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRowId, setActiveRowId] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchSuppliers();
    fetchShops();
    addNewRow();
  }, []);

  useEffect(() => {
    if (searchQuery && searchQuery.trim().length >= 1) {
      searchProducts(searchQuery);
    } else if (searchQuery === "") {
      // Show recent products when search is cleared
      fetchRecentProducts();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

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

  async function fetchRecentProducts() {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error fetching recent products:", error);
    }
  }

  async function searchProducts(query: string) {
    try {
      console.log("Searching for products with query:", query);
      // Search by name, barcode, or model in a single query
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .or(
          `name.ilike.%${query}%,barcode.ilike.%${query}%,model.ilike.%${query}%`,
        )
        .limit(20);

      if (error) throw error;

      console.log("Search results:", data);
      setSearchResults(data || []);
    } catch (error) {
      console.error("Error searching products:", error);
      toast({
        variant: "destructive",
        title: "Search Error",
        description: "Failed to search products. Please try again.",
      });
    }
  }

  const handleSelectProduct = (selectedProduct: Product, rowId: string) => {
    setProductRows((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          return {
            ...row,
            name: selectedProduct.name || "",
            buyingPrice: selectedProduct.buying_price?.toString() || "",
            sellingPrice: selectedProduct.selling_price?.toString() || "",
            barcode: selectedProduct.barcode || "",
            watt: selectedProduct.watt?.toString() || "",
            size: selectedProduct.size || "",
            color: selectedProduct.color || "",
            model: selectedProduct.model || "",
            quantity: selectedProduct.quantity?.toString() || row.quantity,
            totalPrice: (
              (Number(selectedProduct.buying_price) || 0) *
              (Number(selectedProduct.quantity) || Number(row.quantity) || 0)
            ).toFixed(2),
          };
        }
        return row;
      }),
    );

    // Close the search popover and reset the search query
    setIsSearchOpen(false);
    setSearchQuery("");
    setActiveRowId("");

    toast({
      title: "Product selected",
      description: `${selectedProduct.name} has been loaded into the form.`,
    });
  };

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
      size: "",
      color: "",
      model: "",
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
              size: row.size.trim() || null,
              color: row.color.trim() || null,
              model: row.model.trim() || null,
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
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <Label
              htmlFor="date"
              className="flex items-center gap-1 text-sm font-medium"
            >
              <Calendar className="h-4 w-4 text-primary" />
              Date *
            </Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              className="bg-white"
            />
            <p className="text-xs text-gray-500">
              Date for all products being added
            </p>
          </div>

          <div className="space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <Label htmlFor="supplier" className="text-sm font-medium">
              Supplier *
            </Label>
            <Select value={supplierId} onValueChange={setSupplierId}>
              <SelectTrigger className="bg-white">
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
            <p className="text-xs text-gray-500">
              All products will be assigned to this supplier
            </p>
          </div>

          <div className="space-y-2 bg-gray-50 p-4 rounded-lg border border-gray-100">
            <Label htmlFor="shop" className="text-sm font-medium">
              Shop *
            </Label>
            <Select value={shopId} onValueChange={setShopId}>
              <SelectTrigger className="bg-white">
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
            <p className="text-xs text-gray-500">
              All products will be assigned to this shop
            </p>
            {shops.length === 0 && (
              <p className="text-xs text-red-500">
                No shops available. Please add a shop first.
              </p>
            )}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-100">
            <div className="flex items-center gap-2">
              <div className="bg-primary/10 p-1.5 rounded-md">
                <Plus className="h-4 w-4 text-primary" />
              </div>
              <Label className="font-medium">Products</Label>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addNewRow}
              className="flex items-center gap-1 bg-white hover:bg-primary hover:text-white transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Product
            </Button>
          </div>

          <div className="border rounded-lg overflow-x-auto shadow-sm">
            <div className="min-w-[800px]">
              <Table>
                <TableHeader className="bg-gray-50">
                  <TableRow>
                    <TableHead className="w-[15%] font-semibold">
                      Product Name
                    </TableHead>
                    <TableHead className="w-[8%] font-semibold">
                      Buying Price
                    </TableHead>
                    <TableHead className="w-[8%] font-semibold">
                      Selling Price
                    </TableHead>
                    <TableHead className="w-[6%] font-semibold">
                      Quantity
                    </TableHead>
                    <TableHead className="w-[8%] font-semibold">
                      Total Price
                    </TableHead>
                    <TableHead className="w-[6%] font-semibold">Watt</TableHead>
                    <TableHead className="w-[10%] font-semibold">
                      Barcode
                    </TableHead>
                    <TableHead className="w-[8%] font-semibold">Size</TableHead>
                    <TableHead className="w-[8%] font-semibold">
                      Color
                    </TableHead>
                    <TableHead className="w-[8%] font-semibold">
                      Model
                    </TableHead>
                    <TableHead className="w-[5%]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productRows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell>
                        <div className="relative">
                          <Input
                            value={row.name}
                            onChange={(e) =>
                              updateRowField(row.id, "name", e.target.value)
                            }
                            placeholder="Product name"
                            required
                            className="w-full pr-10"
                          />
                          <Popover
                            open={isSearchOpen && activeRowId === row.id}
                            onOpenChange={(open) => {
                              setIsSearchOpen(open);
                              if (open) setActiveRowId(row.id);
                            }}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="absolute right-0 top-0 h-full px-3 py-2 text-gray-400 hover:text-gray-600 bg-transparent"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setActiveRowId(row.id);
                                  setIsSearchOpen(true);
                                  // Trigger search with empty query to show recent products
                                  fetchRecentProducts();
                                }}
                              >
                                <Search className="h-4 w-4 text-gray-600" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent
                              align="start"
                              side="bottom"
                              sideOffset={5}
                              alignOffset={-10}
                              className="w-[300px] p-0"
                            >
                              <Command>
                                <CommandInput
                                  placeholder="Search by name, barcode, or model..."
                                  value={searchQuery}
                                  onValueChange={setSearchQuery}
                                  autoFocus
                                />
                                <CommandList>
                                  <CommandEmpty>
                                    <div className="p-2 text-center">
                                      <p>No products found</p>
                                      <p className="text-xs text-gray-500 mt-1">
                                        Try a different search term or add a new
                                        product
                                      </p>
                                    </div>
                                  </CommandEmpty>
                                  <CommandGroup heading="Products">
                                    {searchResults.map((product) => (
                                      <CommandItem
                                        key={product.id}
                                        value={product.id}
                                        onSelect={() =>
                                          handleSelectProduct(product, row.id)
                                        }
                                      >
                                        <div className="flex flex-col">
                                          <span className="font-medium">
                                            {product.name}
                                          </span>
                                          <span className="text-xs text-gray-500">
                                            {product.watt &&
                                              `${product.watt}W • `}
                                            {product.barcode &&
                                              `${product.barcode} • `}
                                            {product.quantity !== undefined &&
                                              `Current Stock: ${product.quantity}`}
                                          </span>
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
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
                        <Input
                          value={row.size}
                          onChange={(e) =>
                            updateRowField(row.id, "size", e.target.value)
                          }
                          placeholder="Size"
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.color}
                          onChange={(e) =>
                            updateRowField(row.id, "color", e.target.value)
                          }
                          placeholder="Color"
                          className="w-full"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={row.model}
                          onChange={(e) =>
                            updateRowField(row.id, "model", e.target.value)
                          }
                          placeholder="Model"
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

      <div className="space-y-4 bg-gray-50 p-6 rounded-lg border border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <div className="bg-primary/10 p-1.5 rounded-md">
            <Calendar className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-lg font-medium">Payment Information</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2 bg-white p-4 rounded-lg border border-gray-100">
            <Label htmlFor="totalAmount" className="text-sm font-medium">
              Total Amount
            </Label>
            <Input
              id="totalAmount"
              type="number"
              step="0.01"
              min="0"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              className="bg-gray-50 font-medium text-primary"
              readOnly
            />
            <p className="text-xs text-gray-500">
              Automatically calculated (buying price × quantity)
            </p>
          </div>

          <div className="space-y-2 bg-white p-4 rounded-lg border border-gray-100">
            <Label htmlFor="advancePayment" className="text-sm font-medium">
              Advance Payment
            </Label>
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

          <div className="space-y-2 bg-white p-4 rounded-lg border border-gray-100">
            <Label htmlFor="remainingAmount" className="text-sm font-medium">
              Remaining Amount
            </Label>
            <Input
              id="remainingAmount"
              type="number"
              value={remainingAmount}
              className="bg-gray-50 font-medium text-destructive"
              readOnly
            />
            <p className="text-xs text-gray-500">
              Total Amount - Advance Payment
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-end gap-3 mt-8 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={loading}
          className="w-full sm:w-auto"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={loading}
          className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white shadow-md"
        >
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
