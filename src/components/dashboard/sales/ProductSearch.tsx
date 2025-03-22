import { useState, useEffect } from "react";
import { supabase } from "../../../../supabase/supabase";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, ArrowUpDown } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Product } from "@/types/schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ProductSearchProps {
  onAddToCart: (product: Product) => void;
  shopId: string;
}

type SortOption = {
  field: string;
  label: string;
  column: string;
};

const sortOptions: SortOption[] = [
  { field: "name", label: "Product Name", column: "name" },
  { field: "supplier", label: "Supplier", column: "supplier_id" },
  { field: "watt", label: "Wattage", column: "watt" },
];

export function ProductSearch({ onAddToCart, shopId }: ProductSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<string>("name");
  const [productSuppliers, setProductSuppliers] = useState<
    Record<string, string>
  >({});

  useEffect(() => {
    if (shopId) {
      fetchProducts();
    }
  }, [shopId, sortBy]);

  async function fetchProducts() {
    try {
      setLoading(true);

      // Get the sort option details
      const sortOption =
        sortOptions.find((option) => option.field === sortBy) || sortOptions[0];

      // Fetch products with sorting
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("shop_id", shopId)
        .order(sortOption.column, { nullsFirst: false });

      if (error) throw error;

      // Fetch supplier information for all products
      const supplierIds =
        data?.filter((p) => p.supplier_id).map((p) => p.supplier_id) || [];
      const uniqueSupplierIds = [...new Set(supplierIds)];

      if (uniqueSupplierIds.length > 0) {
        const { data: suppliersData, error: suppliersError } = await supabase
          .from("suppliers")
          .select("id, name")
          .in("id", uniqueSupplierIds);

        if (!suppliersError && suppliersData) {
          const supplierMap: Record<string, string> = {};
          suppliersData.forEach((supplier) => {
            supplierMap[supplier.id] = supplier.name;
          });
          setProductSuppliers(supplierMap);
        }
      }

      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        variant: "destructive",
        title: "Error fetching products",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  const handleSearch = async () => {
    try {
      setLoading(true);

      // Get the sort option details
      const sortOption =
        sortOptions.find((option) => option.field === sortBy) || sortOptions[0];

      let query = supabase.from("products").select("*").eq("shop_id", shopId);

      if (searchQuery) {
        query = query.or(
          `name.ilike.%${searchQuery}%,barcode.ilike.%${searchQuery}%`,
        );
      }

      const { data, error } = await query.order(sortOption.column, {
        nullsFirst: false,
      });

      if (error) throw error;

      // Fetch supplier information for all products
      const supplierIds =
        data?.filter((p) => p.supplier_id).map((p) => p.supplier_id) || [];
      const uniqueSupplierIds = [...new Set(supplierIds)];

      if (uniqueSupplierIds.length > 0) {
        const { data: suppliersData, error: suppliersError } = await supabase
          .from("suppliers")
          .select("id, name")
          .in("id", uniqueSupplierIds);

        if (!suppliersError && suppliersData) {
          const supplierMap: Record<string, string> = {};
          suppliersData.forEach((supplier) => {
            supplierMap[supplier.id] = supplier.name;
          });
          setProductSuppliers(supplierMap);
        }
      }

      setProducts(data || []);
    } catch (error) {
      console.error("Error searching products:", error);
      toast({
        variant: "destructive",
        title: "Error searching products",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  };

  const getStockStatus = (quantity: number) => {
    if (quantity <= 0) return { status: "out-of-stock", label: "Out of Stock" };
    if (quantity <= 5) return { status: "low-stock", label: "Low Stock" };
    return { status: "in-stock", label: "In Stock" };
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "in-stock":
        return "border-green-200 bg-green-50 text-green-600";
      case "low-stock":
        return "border-yellow-200 bg-yellow-50 text-yellow-600";
      case "out-of-stock":
        return "border-red-200 bg-red-50 text-red-600";
      default:
        return "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search products by name or barcode..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <div className="flex gap-2">
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              {sortOptions.map((option) => (
                <SelectItem key={option.field} value={option.field}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSearch}>Search</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          No products found. Try a different search term or add new products.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => {
            const { status, label } = getStockStatus(product.quantity);
            return (
              <Card key={product.id} className="overflow-hidden">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-medium">{product.name}</h3>
                      <p className="text-xs text-gray-500">
                        Supplier:{" "}
                        {productSuppliers[product.supplier_id] || "Unknown"}
                      </p>
                      {product.barcode && (
                        <p className="text-xs text-gray-500">
                          Barcode: {product.barcode}
                        </p>
                      )}
                      {product.watt && (
                        <p className="text-xs text-gray-500">
                          Wattage: {product.watt}W
                        </p>
                      )}
                    </div>
                    <Badge variant="outline" className={getStatusColor(status)}>
                      {label}
                    </Badge>
                  </div>

                  <div className="mt-2 flex justify-between items-center">
                    <div>
                      <p className="text-lg font-bold">
                        ${product.selling_price.toFixed(2)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Available: {product.quantity}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onAddToCart(product)}
                      disabled={product.quantity <= 0}
                      className="flex items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
