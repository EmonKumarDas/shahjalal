import { DashboardLayout } from "../dashboard/layout/DashboardLayout";
import { ReturnsTable } from "../dashboard/returns/ReturnsTable";

export default function Returns() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Returns Management
          </h1>
          <p className="text-gray-500">Manage product returns and refunds</p>
        </div>

        <ReturnsTable />
      </div>
    </DashboardLayout>
  );
}
