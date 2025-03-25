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
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Edit, Trash2, Eye, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { CustomerDetails } from "./CustomerDetails";

type Customer = {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  created_at: string;
  total_spent?: number;
  last_purchase?: string;
};

export function CustomersTable() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchCustomers();

    // Set up realtime subscription
    const subscription = supabase
      .channel("customers_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "customers" },
        () => fetchCustomers(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  async function fetchCustomers() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // For each customer, calculate total spent and last purchase date
      const customersWithStats = await Promise.all(
        (data || []).map(async (customer) => {
          try {
            // Get all invoices for this customer
            const { data: invoices, error: invoicesError } = await supabase
              .from("invoices")
              .select("id, total_amount, advance_payment, status, created_at")
              .eq("customer_phone", customer.phone)
              .order("created_at", { ascending: false });

            if (invoicesError) {
              console.error("Error fetching invoices:", invoicesError);
              return customer;
            }

            // Calculate total spent (only count paid amounts)
            const totalSpent =
              invoices?.reduce((sum, invoice) => {
                if (invoice.status === "paid") {
                  return sum + Number(invoice.total_amount || 0);
                } else if (invoice.status === "partially_paid") {
                  return sum + Number(invoice.advance_payment || 0);
                }
                return sum;
              }, 0) || 0;

            // Get last purchase date
            const lastPurchase =
              invoices && invoices.length > 0 ? invoices[0].created_at : null;

            return {
              ...customer,
              total_spent: totalSpent,
              last_purchase: lastPurchase,
            };
          } catch (err) {
            console.error("Error processing customer data:", err);
            return customer;
          }
        }),
      );

      setCustomers(customersWithStats);
    } catch (error) {
      console.error("Error fetching customers:", error);
      toast({
        variant: "destructive",
        title: "Error fetching customers",
        description:
          error instanceof Error ? error.message : JSON.stringify(error),
      });
    } finally {
      setLoading(false);
    }
  }

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm) ||
      (customer.email &&
        customer.email.toLowerCase().includes(searchTerm.toLowerCase())),
  );

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetails(true);
  };

  return (
    <div className="space-y-4">
      {showDetails && selectedCustomer ? (
        <CustomerDetails
          customer={selectedCustomer}
          onBack={() => setShowDetails(false)}
          onCustomerUpdated={fetchCustomers}
        />
      ) : (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button
              className="w-full sm:w-auto"
              onClick={() => {
                // Create a new customer with default values
                const newCustomer = {
                  name: "",
                  phone: "",
                  email: "",
                  address: "",
                  created_at: new Date().toISOString(),
                };

                // Set as selected customer and show details form
                setSelectedCustomer(newCustomer as Customer);
                setShowDetails(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Add New Customer
            </Button>
          </div>

          <div className="rounded-md border bg-white">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Total Spent</TableHead>
                  <TableHead>Last Purchase</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredCustomers.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-gray-500"
                    >
                      No customers found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCustomers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-gray-500">
                          {format(
                            new Date(customer.created_at),
                            "MMM dd, yyyy",
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>{customer.phone}</div>
                        {customer.email && (
                          <div className="text-sm text-gray-500">
                            {customer.email}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="bg-green-50 text-green-700 border-green-200"
                        >
                          ${customer.total_spent?.toFixed(2) || "0.00"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {customer.last_purchase
                          ? format(
                              new Date(customer.last_purchase),
                              "MMM dd, yyyy",
                            )
                          : "Never"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewDetails(customer)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-red-500 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}

function Search(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
