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
import { Product, Supplier, Shop } from "@/types/schema";

interface ProductFormProps {
  product?: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductForm({
  product,
  onSuccess,
  onCancel,
}: ProductFormProps) {
  const [name, setName] = useState(product?.name || "");
  const [buyingPrice, setBuyingPrice] = useState<string>(
    product?.buying_price?.toString() || "",
  );
  const [sellingPrice, setSellingPrice] = useState<string>(
    product?.selling_price?.toString() || "",
  );
  const [quantity, setQuantity] = useState<string>(
    product?.quantity?.toString() || "0",
  );
  const [barcode, setBarcode] = useState(product?.barcode || "");
  const [supplierId, setSupplierId] = useState<string>(
    product?.supplier_id || "",
  );
  const [shopId, setShopId] = useState<string>(product?.shop_id || "");
  const [watt, setWatt] = useState<string>(product?.watt?.toString() || "");
  const [advancePayment, setAdvancePayment] = useState<string>(
    product?.advance_payment?.toString() || "0",
  );
  const [remainingAmount, setRemainingAmount] = useState<string>(
    product?.remaining_amount?.toString() || "0",
  );
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSuppliers();
    fetchShops();
  }, []);

  // Calculate remaining amount when selling price or advance payment changes
  useEffect(() => {
    const selling = Number(sellingPrice) || 0;
    const advance = Number(advancePayment) || 0;
    setRemainingAmount(Math.max(0, selling - advance).toString());
  }, [sellingPrice, advancePayment]);

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    // Validation
    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Product name is required",
      });
      return;
    }

    if (
      !buyingPrice ||
      isNaN(Number(buyingPrice)) ||
      Number(buyingPrice) <= 0
    ) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Buying price must be a positive number",
      });
      return;
    }

    if (
      !sellingPrice ||
      isNaN(Number(sellingPrice)) ||
      Number(sellingPrice) <= 0
    ) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Selling price must be a positive number",
      });
      return;
    }

    if (!quantity || isNaN(Number(quantity)) || Number(quantity) < 0) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Quantity must be a non-negative number",
      });
      return;
    }

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

    if (
      advancePayment &&
      (isNaN(Number(advancePayment)) || Number(advancePayment) < 0)
    ) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Advance payment must be a non-negative number",
      });
      return;
    }

    if (watt && (isNaN(Number(watt)) || Number(watt) <= 0)) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Watt must be a positive number",
      });
      return;
    }

    try {
      setLoading(true);

      const productData = {
        name: name.trim(),
        buying_price: Number(buyingPrice),
        selling_price: Number(sellingPrice),
        quantity: Number(quantity),
        barcode: barcode.trim() || null,
        supplier_id: supplierId,
        shop_id: shopId,
        watt: watt ? Number(watt) : null,
        advance_payment: Number(advancePayment),
        remaining_amount: Number(remainingAmount),
        updated_at: new Date().toISOString(),
      };

      let result;

      if (product) {
        // Update existing product
        result = await supabase
          .from("products")
          .update(productData)
          .eq("id", product.id)
          .select();
      } else {
        // Create new product
        result = await supabase.from("products").insert([productData]).select();
      }

      if (result.error) throw result.error;

      toast({
        title: product ? "Product updated" : "Product created",
        description: product
          ? "The product has been updated successfully"
          : "The product has been created successfully",
      });

      onSuccess();
    } catch (error) {
      console.error("Error saving product:", error);
      toast({
        variant: "destructive",
        title: `Error ${product ? "updating" : "creating"} product`,
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="name">Product Name *</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter product name"
            required
          />
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
          {shops.length === 0 && (
            <p className="text-xs text-red-500 mt-1">
              No shops available. Please add a shop first.
            </p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="buyingPrice">Buying Price *</Label>
          <Input
            id="buyingPrice"
            type="number"
            step="0.01"
            min="0"
            value={buyingPrice}
            onChange={(e) => setBuyingPrice(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="sellingPrice">Selling Price *</Label>
          <Input
            id="sellingPrice"
            type="number"
            step="0.01"
            min="0"
            value={sellingPrice}
            onChange={(e) => setSellingPrice(e.target.value)}
            placeholder="0.00"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="quantity">Quantity *</Label>
          <Input
            id="quantity"
            type="number"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="watt">Watt</Label>
          <Input
            id="watt"
            type="number"
            min="0"
            value={watt}
            onChange={(e) => setWatt(e.target.value)}
            placeholder="Enter watt"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="barcode">Barcode</Label>
          <Input
            id="barcode"
            value={barcode}
            onChange={(e) => setBarcode(e.target.value)}
            placeholder="Enter barcode"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="advancePayment">Advance Payment</Label>
          <Input
            id="advancePayment"
            type="number"
            step="0.01"
            min="0"
            max={sellingPrice}
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
            readOnly
            className="bg-gray-50"
          />
          <p className="text-xs text-gray-500">
            Automatically calculated (Selling Price - Advance Payment)
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2">
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
              {product ? "Updating..." : "Creating..."}
            </span>
          ) : (
            <>{product ? "Update Product" : "Create Product"}</>
          )}
        </Button>
      </div>
    </form>
  );
}
