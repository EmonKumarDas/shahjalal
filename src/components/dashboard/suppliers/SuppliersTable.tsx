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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Trash2, Plus } from "lucide-react";
import { Supplier } from "@/types/schema";
import { toast } from "@/components/ui/use-toast";

export function SuppliersTable() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [currentSupplier, setCurrentSupplier] = useState<Supplier | null>(null);
  const [supplierName, setSupplierName] = useState("");

  useEffect(() => {
    fetchSuppliers();

    const subscription = supabase
      .channel("suppliers_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "suppliers" },
        () => {
          fetchSuppliers();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  async function fetchSuppliers() {
    try {
      setLoading(true);
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
    } finally {
      setLoading(false);
    }
  }

  async function addSupplier() {
    if (!supplierName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Supplier name is required",
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from("suppliers")
        .insert([{ name: supplierName.trim() }])
        .select();

      if (error) throw error;

      toast({
        title: "Supplier added",
        description: "The supplier has been added successfully",
      });

      setSupplierName("");
      setIsAddDialogOpen(false);
    } catch (error) {
      console.error("Error adding supplier:", error);
      toast({
        variant: "destructive",
        title: "Error adding supplier",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function updateSupplier() {
    if (!currentSupplier || !supplierName.trim()) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Supplier name is required",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from("suppliers")
        .update({
          name: supplierName.trim(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", currentSupplier.id);

      if (error) throw error;

      toast({
        title: "Supplier updated",
        description: "The supplier has been updated successfully",
      });

      setSupplierName("");
      setCurrentSupplier(null);
      setIsEditDialogOpen(false);
    } catch (error) {
      console.error("Error updating supplier:", error);
      toast({
        variant: "destructive",
        title: "Error updating supplier",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  async function deleteSupplier() {
    if (!currentSupplier) return;

    try {
      // Check if supplier has products
      const { data: products, error: productsError } = await supabase
        .from("products")
        .select("id")
        .eq("supplier_id", currentSupplier.id)
        .limit(1);

      if (productsError) throw productsError;

      if (products && products.length > 0) {
        toast({
          variant: "destructive",
          title: "Cannot delete supplier",
          description:
            "This supplier has products associated with it. Remove the products first.",
        });
        setIsDeleteDialogOpen(false);
        setCurrentSupplier(null);
        return;
      }

      const { error } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", currentSupplier.id);

      if (error) throw error;

      toast({
        title: "Supplier deleted",
        description: "The supplier has been deleted successfully",
      });

      setCurrentSupplier(null);
      setIsDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting supplier:", error);
      toast({
        variant: "destructive",
        title: "Error deleting supplier",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }

  function handleEditClick(supplier: Supplier) {
    setCurrentSupplier(supplier);
    setSupplierName(supplier.name);
    setIsEditDialogOpen(true);
  }

  function handleDeleteClick(supplier: Supplier) {
    setCurrentSupplier(supplier);
    setIsDeleteDialogOpen(true);
  }

  return (
    <div className="space-y-4 bg-white p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Suppliers</h2>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button className="flex items-center gap-1">
              <Plus className="h-4 w-4" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Supplier</DialogTitle>
              <DialogDescription>
                Enter the details for the new supplier.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="name" className="text-right">
                  Name
                </Label>
                <Input
                  id="name"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="col-span-3"
                  placeholder="Supplier name"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsAddDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={addSupplier}>Save</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : suppliers.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          No suppliers found. Add your first supplier to get started.
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Created At</TableHead>
              <TableHead>Updated At</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((supplier) => (
              <TableRow key={supplier.id}>
                <TableCell className="font-medium">{supplier.name}</TableCell>
                <TableCell>
                  {new Date(supplier.created_at).toLocaleDateString()}
                </TableCell>
                <TableCell>
                  {supplier.updated_at
                    ? new Date(supplier.updated_at).toLocaleDateString()
                    : "-"}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditClick(supplier)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteClick(supplier)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
            <DialogDescription>Update the supplier details.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-name" className="text-right">
                Name
              </Label>
              <Input
                id="edit-name"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={updateSupplier}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this supplier? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteSupplier}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
