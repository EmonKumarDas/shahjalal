import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../../../supabase/supabase";
import { DashboardLayout } from "../dashboard/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/use-toast";
import { format } from "date-fns";
import { ArrowLeft, Edit, Package, Calendar, Tag, Store } from "lucide-react";

interface ProductHistory {
  id: string;
  product_id: string;
  quantity: number;
  created_at: string;
  updated_at: string;
}

interface ProductWithDetails {
  id: string;
  name: string;
  buying_price: number;
  selling_price: number;
  quantity: number;
  barcode: string | null;
  supplier_id: string;
  shop_id: string;
  watt: number | null;
  size: string | null;
  color: string | null;
  model: string | null;
  advance_payment: number;
  remaining_amount: number;
  created_at: string;
  updated_at: string;
  supplier_name: string;
  shop_name: string;
}

export default function ProductDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductWithDetails | null>(null);
  const [productHistory, setProductHistory] = useState<ProductHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchProductDetails();
      fetchProductHistory();
    }
  }, [id]);

  async function fetchProductDetails() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        // Fetch supplier name
        const { data: supplierData, error: supplierError } = await supabase
          .from("suppliers")
          .select("name")
          .eq("id", data.supplier_id)
          .single();

        if (supplierError) throw supplierError;

        // Fetch shop name
        const { data: shopData, error: shopError } = await supabase
          .from("shops")
          .select("name")
          .eq("id", data.shop_id)
          .single();

        if (shopError) throw shopError;

        setProduct({
          ...data,
          supplier_name: supplierData?.name || "Unknown",
          shop_name: shopData?.name || "Unknown",
        });
      }
    } catch (error) {
      console.error("Error fetching product details:", error);
      toast({
        variant: "destructive",
        title: "Error fetching product details",
        description: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function fetchProductHistory() {
    try {
      // For now, we'll use the product's creation date as the initial history entry
      // In a real implementation, you would have a separate table for product history
      const { data, error } = await supabase
        .from("products")
        .select("id, quantity, created_at, updated_at")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        // Create a history entry from the product's data
        const historyEntry: ProductHistory = {
          id: data.id,
          product_id: data.id,
          quantity: data.quantity,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };

        setProductHistory([historyEntry]);
      }
    } catch (error) {
      console.error("Error fetching product history:", error);
      toast({
        variant: "destructive",
        title: "Error fetching product history",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </DashboardLayout>
    );
  }

  if (!product) {
    return (
      <DashboardLayout>
        <div className="text-center py-10">
          <h2 className="text-2xl font-bold">Product Not Found</h2>
          <p className="text-gray-500 mt-2">
            The requested product could not be found.
          </p>
          <Button
            onClick={() => navigate("/dashboard/products")}
            className="mt-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Products
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  const { status, label } = getStockStatus(product.quantity);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              {product.name}
            </h1>
            <p className="text-gray-500">Product Details</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard/products")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" /> Back
            </Button>
            <Button
              onClick={() => navigate(`/dashboard/products/edit/${product.id}`)}
            >
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="col-span-1 md:col-span-2">
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">
                    Product Name
                  </p>
                  <p className="font-medium">{product.name}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <Badge variant="outline" className={getStatusColor(status)}>
                    {label}
                  </Badge>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Supplier</p>
                  <p>{product.supplier_name}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Shop</p>
                  <p>{product.shop_name}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">
                    Buying Price
                  </p>
                  <p>${product.buying_price.toFixed(2)}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">
                    Selling Price
                  </p>
                  <p>${product.selling_price.toFixed(2)}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">
                    Current Quantity
                  </p>
                  <p>{product.quantity}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Barcode</p>
                  <p>{product.barcode || "N/A"}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Watt</p>
                  <p>{product.watt ? `${product.watt}W` : "N/A"}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Size</p>
                  <p>{product.size || "N/A"}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Color</p>
                  <p>{product.color || "N/A"}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">Model</p>
                  <p>{product.model || "N/A"}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">
                    Advance Payment
                  </p>
                  <p>${product.advance_payment.toFixed(2)}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">
                    Remaining Amount
                  </p>
                  <p>${product.remaining_amount.toFixed(2)}</p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">
                    Added Date
                  </p>
                  <p>
                    {format(new Date(product.created_at), "MMM dd, yyyy HH:mm")}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-sm font-medium text-gray-500">
                    Last Updated
                  </p>
                  <p>{format(new Date(product.updated_at), "MMM dd, yyyy")}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Info</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-md">
                  <Package className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium">Current Stock</p>
                    <p className="text-2xl font-bold">{product.quantity}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-green-50 rounded-md">
                  <Tag className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium">Selling Price</p>
                    <p className="text-2xl font-bold">
                      ${product.selling_price.toFixed(2)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-md">
                  <Store className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="text-sm font-medium">Shop</p>
                    <p className="text-lg font-medium">{product.shop_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-md">
                  <Calendar className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="text-sm font-medium">Added On</p>
                    <p className="text-lg font-medium">
                      {format(new Date(product.created_at), "MMM dd, yyyy")}
                    </p>
                    <p className="text-xs text-amber-700">
                      {format(new Date(product.created_at), "HH:mm:ss")}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Storage History</CardTitle>
          </CardHeader>
          <CardContent>
            {productHistory.length === 0 ? (
              <p className="text-center py-4 text-gray-500">
                No storage history available for this product.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Last Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productHistory.map((history) => (
                    <TableRow key={history.id}>
                      <TableCell>
                        {format(new Date(history.created_at), "MMM dd, yyyy")}
                      </TableCell>
                      <TableCell>{history.quantity}</TableCell>
                      <TableCell>
                        {format(
                          new Date(history.updated_at),
                          "MMM dd, yyyy HH:mm",
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
