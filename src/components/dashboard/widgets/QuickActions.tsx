import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Package, ShoppingCart, Users, Plus } from "lucide-react";

type QuickAction = {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
};

export function QuickActions() {
  const actions: QuickAction[] = [
    {
      title: "Add Product",
      description: "Create a new product",
      icon: <Package className="h-5 w-5" />,
      href: "/dashboard/products/new",
      color: "bg-violet-100 text-violet-600",
    },
    {
      title: "New Order",
      description: "Create a new order",
      icon: <ShoppingCart className="h-5 w-5" />,
      href: "/dashboard/orders/new",
      color: "bg-pink-100 text-pink-600",
    },
    {
      title: "Add Customer",
      description: "Add a new customer",
      icon: <Users className="h-5 w-5" />,
      href: "/dashboard/customers/new",
      color: "bg-blue-100 text-blue-600",
    },
  ];

  return (
    <Card className="bg-white">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">Quick Actions</CardTitle>
        <CardDescription>Frequently used actions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {actions.map((action, index) => (
            <Button
              key={index}
              variant="outline"
              className="h-auto flex-col items-start gap-1 p-4 text-left"
              asChild
            >
              <a href={action.href}>
                <div className={`rounded-full p-2 ${action.color}`}>
                  {action.icon}
                </div>
                <div className="font-medium">{action.title}</div>
                <div className="text-xs text-gray-500">
                  {action.description}
                </div>
              </a>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
