import React, { useState } from "react";
import { DashboardLayout } from "../dashboard/layout/DashboardLayout";
import { SalesSummary } from "../dashboard/widgets/SalesSummary";
import { InventoryAlerts } from "../dashboard/widgets/InventoryAlerts";
import { OrderActivity } from "../dashboard/widgets/OrderActivity";
import { QuickActions } from "../dashboard/widgets/QuickActions";
import { RevenueStats } from "../dashboard/widgets/RevenueStats";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const [loading, setLoading] = useState(false);

  // Function to trigger loading state for demonstration
  const handleRefresh = () => {
    setLoading(true);
    // Reset loading after 2 seconds
    setTimeout(() => {
      setLoading(false);
    }, 2000);
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-gray-500">
              Welcome to your ElectroShop ERP dashboard.
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            className="bg-blue-500 hover:bg-blue-600 text-white rounded-full px-4 h-9 shadow-sm transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            {loading ? "Loading..." : "Refresh Dashboard"}
          </Button>
        </div>

        <div
          className={cn(
            "transition-all duration-300 ease-in-out",
            loading && "opacity-60",
          )}
        >
          <RevenueStats />

          <div className="grid grid-cols-1 gap-6 mt-6 md:grid-cols-2 lg:grid-cols-3">
            <SalesSummary />
            <InventoryAlerts />
            <OrderActivity />
          </div>

          <div className="mt-6">
            <QuickActions />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
