import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CreditCard, ArrowUp, ArrowDown } from "lucide-react";

type StatProps = {
  title: string;
  value: string;
  change: {
    value: string;
    type: "increase" | "decrease";
  };
  description: string;
};

function Stat({ title, value, change, description }: StatProps) {
  return (
    <Card className="bg-white">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-gray-500">
            {title}
          </CardTitle>
        </div>
        <div className="h-8 w-8 rounded-full bg-gray-100 p-1">
          <CreditCard className="h-6 w-6 text-gray-600" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <div className="mt-1 flex items-center text-sm">
          {change.type === "increase" ? (
            <ArrowUp className="mr-1 h-4 w-4 text-green-600" />
          ) : (
            <ArrowDown className="mr-1 h-4 w-4 text-red-600" />
          )}
          <span
            className={
              change.type === "increase" ? "text-green-600" : "text-red-600"
            }
          >
            {change.value}
          </span>
          <span className="ml-1 text-gray-500">{description}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function RevenueStats() {
  const stats = [
    {
      title: "Total Revenue",
      value: "$45,231.89",
      change: {
        value: "20.1%",
        type: "increase" as const,
      },
      description: "vs. last month",
    },
    {
      title: "Sales",
      value: "$12,234.45",
      change: {
        value: "4.3%",
        type: "decrease" as const,
      },
      description: "vs. last month",
    },
    {
      title: "Profit",
      value: "$9,876.54",
      change: {
        value: "12.5%",
        type: "increase" as const,
      },
      description: "vs. last month",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {stats.map((stat, index) => (
        <Stat key={index} {...stat} />
      ))}
    </div>
  );
}
