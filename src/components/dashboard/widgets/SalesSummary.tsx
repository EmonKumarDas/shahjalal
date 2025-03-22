import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowUpRight, TrendingUp } from "lucide-react";

export function SalesSummary() {
  // This would typically come from your data source
  const salesData = {
    total: "$24,780",
    increase: "12%",
    period: "vs. last month",
  };

  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-base font-medium">Sales Summary</CardTitle>
          <CardDescription>Monthly revenue overview</CardDescription>
        </div>
        <div className="h-10 w-10 rounded-full bg-blue-50 p-2">
          <TrendingUp className="h-6 w-6 text-blue-600" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{salesData.total}</div>
        <div className="mt-1 flex items-center text-sm text-green-600">
          <ArrowUpRight className="mr-1 h-4 w-4" />
          <span>{salesData.increase}</span>
          <span className="ml-1 text-gray-500">{salesData.period}</span>
        </div>
        <div className="mt-4 h-[80px] w-full bg-gradient-to-r from-blue-50 to-blue-100 rounded-md flex items-end">
          {/* Placeholder for chart - would be replaced with actual chart component */}
          <div className="flex w-full justify-between px-2">
            {[40, 70, 30, 80, 50, 60, 90].map((height, i) => (
              <div
                key={i}
                className="w-6 bg-blue-500 rounded-t-sm"
                style={{ height: `${height}%` }}
              />
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
