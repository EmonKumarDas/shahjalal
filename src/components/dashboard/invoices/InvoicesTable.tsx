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
import { Badge } from "@/components/ui/badge";
import { Eye, Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";

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
};

export function InvoicesTable() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchInvoices();

    const subscription = supabase
      .channel("invoices_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "invoices" },
        () => {
          fetchInvoices();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  async function fetchInvoices() {
    try {
      setLoading(true);
      // First, fetch all invoices
      const { data: invoicesData, error: invoicesError } = await supabase
        .from("invoices")
        .select("*")
        .order("created_at", { ascending: false });

      if (invoicesError) throw invoicesError;

      // Get unique supplier and shop IDs
      const supplierIds =
        invoicesData
          ?.filter((invoice) => invoice.supplier_id)
          .map((invoice) => invoice.supplier_id) || [];

      const shopIds =
        invoicesData
          ?.filter((invoice) => invoice.shop_id)
          .map((invoice) => invoice.shop_id) || [];

      const uniqueSupplierIds = [...new Set(supplierIds)];
      const uniqueShopIds = [...new Set(shopIds)];

      // Fetch supplier data if there are supplier IDs
      let supplierMap = {};
      if (uniqueSupplierIds.length > 0) {
        const { data: suppliersData, error: suppliersError } = await supabase
          .from("suppliers")
          .select("id, name")
          .in("id", uniqueSupplierIds);

        if (suppliersError) throw suppliersError;

        // Create a map of supplier id to supplier name
        supplierMap = (suppliersData || []).reduce((map, supplier) => {
          map[supplier.id] = supplier.name;
          return map;
        }, {});
      }

      // Fetch shop data if there are shop IDs
      let shopMap = {};
      if (uniqueShopIds.length > 0) {
        const { data: shopsData, error: shopsError } = await supabase
          .from("shops")
          .select("id, name")
          .in("id", uniqueShopIds);

        if (shopsError) throw shopsError;

        // Create a map of shop id to shop name
        shopMap = (shopsData || []).reduce((map, shop) => {
          map[shop.id] = shop.name;
          return map;
        }, {});
      }

      // Combine invoice data with supplier and shop data
      const formattedInvoices = (invoicesData || []).map((invoice) => ({
        ...invoice,
        supplier_name: invoice.supplier_id
          ? supplierMap[invoice.supplier_id]
          : null,
        shop_name: invoice.shop_id ? shopMap[invoice.shop_id] : null,
      }));

      setInvoices(formattedInvoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      toast({
        variant: "destructive",
        title: "Error fetching invoices",
        description:
          error instanceof Error ? error.message : JSON.stringify(error),
      });
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

  const filteredInvoices = invoices.filter((invoice) => {
    const searchLower = searchQuery.toLowerCase();
    return (
      invoice.invoice_number.toLowerCase().includes(searchLower) ||
      invoice.supplier_name?.toLowerCase().includes(searchLower) ||
      invoice.shop_name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            type="search"
            placeholder="Search invoices..."
            className="w-full bg-white pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          {searchQuery
            ? "No invoices match your search."
            : "No invoices found. Add products with payment details to generate invoices."}
        </div>
      ) : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Shop</TableHead>
                <TableHead>Total Amount</TableHead>
                <TableHead>Advance Payment</TableHead>
                <TableHead>Remaining</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.invoice_number}
                  </TableCell>
                  <TableCell>
                    {new Date(invoice.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell>{invoice.supplier_name || "N/A"}</TableCell>
                  <TableCell>{invoice.shop_name || "N/A"}</TableCell>
                  <TableCell>${invoice.total_amount.toFixed(2)}</TableCell>
                  <TableCell>${invoice.advance_payment.toFixed(2)}</TableCell>
                  <TableCell>${invoice.remaining_amount.toFixed(2)}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={getStatusColor(invoice.status)}
                    >
                      {getStatusLabel(invoice.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/dashboard/invoices/${invoice.id}`}>
                          <Eye className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/dashboard/invoices/${invoice.id}/download`}>
                          <Download className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
