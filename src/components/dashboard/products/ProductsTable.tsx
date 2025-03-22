import { useState, useEffect } from "react";
import { supabase } from "../../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash2, Plus, Search } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { Product, Supplier } from "@/types/schema";
import { ProductForm } from "./ProductForm";
import { BatchProductForm } from "./BatchProductForm";

type ProductWithSupplier = Product & { suppliers: Pick<Supplier, "name"> };

export function ProductsTable() {
  const [products, setProducts] = useState<ProductWithSupplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentProduct, setCurrentProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchProducts();

    const subscription = supabase
      .channel("products_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          fetchProducts();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  async function fetchProducts() {
    try {
      setLoading(true);
      // First, fetch all products
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .order("name");

      if (productsError) throw productsError;

      // Get unique supplier IDs
      const supplierIds =
        productsData
          ?.filter((product) => product.supplier_id)
          .map((product) => product.supplier_id) || [];

      const uniqueSupplierIds = [...new Set(supplierIds)];

      // If there are supplier IDs, fetch supplier data
      let supplierMap = {};
      if (uniqueSupplierIds.length > 0) {
        const { data: suppliersData, error: suppliersError } = await supabase
          .from("suppliers")
          .select("id, name")
          .in("id", uniqueSupplierIds);

        if (suppliersError) throw suppliersError;

        // Create a map of supplier id to supplier name
        supplierMap = (suppliersData || []).reduce((map, supplier) => {
          map[supplier.id] = { name: supplier.name };
          return map;
        }, {});
      }

      // Combine product data with supplier data
      const productsWithSuppliers = (productsData || []).map((product) => ({
        ...product,
        suppliers: product.supplier_id
          ? supplierMap[product.supplier_id]
          : null,
      }));

      setProducts(productsWithSuppliers);
    } catch (error) {
      console.error("Error fetching products:", error);
      toast({
        variant: "destructive",
        title: "Error fetching products",
        description:
          error instanceof Error ? error.message : JSON.stringify(error),
      });
    } finally {
      setLoading(false);
    }
  }

  async function deleteProduct() {
    if (!currentProduct) return;

    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", currentProduct.id);

      if (error) throw error;

      toast({
        title: "Product deleted",
        description: "The product has been deleted successfully",
      });

      setCurrentProduct(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting product:", error);
      toast({
        variant: "destructive",
        title: "Error deleting product",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function handleEditClick(product: Product) {
    setCurrentProduct(product);
    setIsEditDialogOpen(true);
  }

  function handleDeleteClick(product: Product) {
    setCurrentProduct(product);
    setIsDeleteDialogOpen(true);
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

  const filteredProducts = products.filter((product) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      product.name.toLowerCase().includes(searchLower) ||
      product.supplier?.name?.toLowerCase().includes(searchLower) ||
      product.barcode?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search products..."
            className="w-full bg-white pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Products
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          {searchQuery
            ? "No products match your search."
            : "No products found. Add your first product to get started."}
        </div>
      ) : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Watt</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts.map((product) => {
                const { status, label } = getStockStatus(product.quantity);
                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      {product.name}
                    </TableCell>
                    <TableCell>{product.suppliers?.name || "N/A"}</TableCell>
                    <TableCell>{product.watt || "N/A"}</TableCell>
                    <TableCell>
                      ${Number(product.selling_price).toFixed(2)}
                    </TableCell>
                    <TableCell>{product.quantity}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={getStatusColor(status)}
                      >
                        {label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(product)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add Product Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-5xl">
          <DialogHeader>
            <DialogTitle>Add New Products</DialogTitle>
            <DialogDescription>
              Add one or multiple products at once.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end mb-4">
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
          <BatchProductForm
            onSuccess={() => {
              setIsAddDialogOpen(false);
              fetchProducts();
            }}
            onCancel={() => setIsAddDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update the product details.</DialogDescription>
          </DialogHeader>
          {currentProduct && (
            <ProductForm
              product={currentProduct}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setCurrentProduct(null);
                fetchProducts();
              }}
              onCancel={() => {
                setIsEditDialogOpen(false);
                setCurrentProduct(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Deletion</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteProduct}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
