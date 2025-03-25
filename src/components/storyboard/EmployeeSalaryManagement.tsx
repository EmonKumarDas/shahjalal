import { useState, useEffect } from "react";
import { supabase } from "../../../supabase/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  CreditCard,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Users,
} from "lucide-react";
import { format, subMonths, isAfter } from "date-fns";

export default function EmployeeSalaryManagement() {
  const [employees, setEmployees] = useState([]);
  const [salaryPayments, setSalaryPayments] = useState([]);
  const [payrolls, setPayrolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalMonthlySalary, setTotalMonthlySalary] = useState(0);
  const [paidThisMonth, setPaidThisMonth] = useState(0);
  const [pendingPayments, setPendingPayments] = useState(0);

  useEffect(() => {
    fetchData();

    const employeesSubscription = supabase
      .channel("employees_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "employees" },
        () => fetchData(),
      )
      .subscribe();

    const salaryPaymentsSubscription = supabase
      .channel("salary_payments_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "salary_payments" },
        () => fetchData(),
      )
      .subscribe();

    const payrollsSubscription = supabase
      .channel("payrolls_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "payrolls" },
        () => fetchData(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(employeesSubscription);
      supabase.removeChannel(salaryPaymentsSubscription);
      supabase.removeChannel(payrollsSubscription);
    };
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      // Fetch employees
      const { data: employeesData, error: employeesError } = await supabase
        .from("employees")
        .select("*")
        .order("name");

      if (employeesError) throw employeesError;

      // Fetch salary payments
      const { data: paymentsData, error: paymentsError } = await supabase
        .from("salary_payments")
        .select("*")
        .order("payment_date", { ascending: false });

      if (paymentsError) throw paymentsError;

      // Fetch payrolls
      const { data: payrollsData, error: payrollsError } = await supabase
        .from("payrolls")
        .select("*, employees(name, profile_image)")
        .order("created_at", { ascending: false });

      if (payrollsError) throw payrollsError;

      setEmployees(employeesData || []);
      setSalaryPayments(paymentsData || []);
      setPayrolls(payrollsData || []);

      // Calculate metrics
      const total = employeesData.reduce(
        (sum, emp) => sum + (emp.salary || 0),
        0,
      );
      setTotalMonthlySalary(total);

      const oneMonthAgo = subMonths(new Date(), 1).toISOString();
      const paid = paymentsData
        .filter((payment) => payment.payment_date > oneMonthAgo)
        .reduce((sum, payment) => sum + Number(payment.amount), 0);
      setPaidThisMonth(paid);

      setPendingPayments(total - paid);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Check if employee has been paid this month
  const isSalaryPaidThisMonth = (employee) => {
    if (!employee.last_salary_payment) return false;

    const lastPaymentDate = new Date(employee.last_salary_payment);
    const oneMonthAgo = subMonths(new Date(), 1);

    return isAfter(lastPaymentDate, oneMonthAgo);
  };

  async function processSalaryPayment(employee) {
    try {
      // Create salary payment record
      const paymentData = {
        employee_id: employee.id,
        amount: employee.salary || 0,
        payment_date: new Date().toISOString(),
        payment_method: "bank_transfer",
        status: "completed",
      };

      const { error: paymentError } = await supabase
        .from("salary_payments")
        .insert([paymentData]);

      if (paymentError) throw paymentError;

      // Create payroll record
      const payrollData = {
        employee_id: employee.id,
        amount: employee.salary || 0,
        period: employee.payment_frequency || "Monthly",
        status: "Completed",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { error: payrollError } = await supabase
        .from("payrolls")
        .insert([payrollData]);

      if (payrollError) throw payrollError;

      // Update employee's last salary payment date
      const { error: updateError } = await supabase
        .from("employees")
        .update({
          last_salary_payment: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", employee.id);

      if (updateError) throw updateError;

      // Refresh data
      fetchData();
    } catch (error) {
      console.error("Error processing salary payment:", error);
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6">Employee Salary Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              Total Monthly Salary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">
              ${totalMonthlySalary.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {employees.filter((e) => e.status === "active").length} active
              employees
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Paid This Month
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              ${paidThisMonth.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {employees.filter((e) => isSalaryPaidThisMonth(e)).length}{" "}
              employees paid
            </p>
          </CardContent>
        </Card>

        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              Pending Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">
              ${pendingPayments.toFixed(2)}
            </p>
            <p className="text-sm text-gray-500 mt-1">
              {
                employees.filter(
                  (e) => e.status === "active" && !isSalaryPaidThisMonth(e),
                ).length
              }{" "}
              employees pending
            </p>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-xl font-semibold mb-4">Employee Salary Status</h2>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          {loading ? (
            <div className="col-span-3 flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : employees.length === 0 ? (
            <div className="col-span-3 text-center py-10 text-gray-500">
              No employees found.
            </div>
          ) : (
            employees.map((employee) => (
              <Card
                key={employee.id}
                className={`${isSalaryPaidThisMonth(employee) ? "border-green-200" : "border-orange-200"}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 border border-gray-200">
                      {employee.profile_image ? (
                        <AvatarImage
                          src={employee.profile_image}
                          alt={employee.name}
                        />
                      ) : null}
                      <AvatarFallback className="bg-blue-100 text-blue-600">
                        {employee.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="font-medium">{employee.name}</h3>
                      <p className="text-sm text-gray-500">
                        {employee.position || "No position"}
                      </p>

                      <div className="mt-2 flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium">
                            ${employee.salary?.toFixed(2) || "0.00"}
                          </p>
                          <p className="text-xs text-gray-500">
                            {employee.payment_frequency || "monthly"}
                          </p>
                        </div>

                        {isSalaryPaidThisMonth(employee) ? (
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-600 border-green-200 flex items-center gap-1"
                          >
                            <CheckCircle className="h-3 w-3" />
                            Paid
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-orange-50 text-orange-600 border-orange-200 flex items-center gap-1"
                          >
                            <AlertCircle className="h-3 w-3" />
                            Pending
                          </Badge>
                        )}
                      </div>

                      {employee.last_salary_payment && (
                        <p className="text-xs text-gray-500 mt-2">
                          Last paid:{" "}
                          {format(
                            new Date(employee.last_salary_payment),
                            "MMM dd, yyyy",
                          )}
                        </p>
                      )}
                    </div>
                  </div>

                  {!isSalaryPaidThisMonth(employee) && (
                    <Button
                      className="w-full mt-3 flex items-center justify-center gap-1 bg-green-600 hover:bg-green-700"
                      size="sm"
                      onClick={() => processSalaryPayment(employee)}
                    >
                      <DollarSign className="h-3.5 w-3.5" />
                      Pay Salary
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Recent Salary Payments</h2>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : salaryPayments.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                No salary payments found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Method
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {salaryPayments.slice(0, 5).map((payment) => {
                      const employee = employees.find(
                        (e) => e.id === payment.employee_id,
                      );
                      return (
                        <tr key={payment.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <Avatar className="h-8 w-8 border border-gray-200">
                                  <AvatarFallback className="bg-blue-100 text-blue-600">
                                    {employee?.name
                                      .split(" ")
                                      .map((n) => n[0])
                                      .join("")
                                      .toUpperCase() || "?"}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">
                                  {employee?.name || "Unknown Employee"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-green-600">
                              ${Number(payment.amount).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(
                              new Date(payment.payment_date),
                              "MMM dd, yyyy",
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 capitalize">
                            {payment.payment_method || "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-600 border-green-200"
                            >
                              {payment.status || "Completed"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">
            Recent Payroll Activities
          </h2>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : payrolls.length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                No payroll activities found.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Employee
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Amount
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Period
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {payrolls.slice(0, 5).map((payroll) => {
                      return (
                        <tr key={payroll.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 h-8 w-8">
                                <Avatar className="h-8 w-8 border border-gray-200">
                                  <AvatarFallback className="bg-blue-100 text-blue-600">
                                    {payroll.employees?.name
                                      ? payroll.employees.name
                                          .split(" ")
                                          .map((n) => n[0])
                                          .join("")
                                          .toUpperCase()
                                      : "?"}
                                  </AvatarFallback>
                                </Avatar>
                              </div>
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">
                                  {payroll.employees?.name ||
                                    "Unknown Employee"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="text-sm font-medium text-green-600">
                              ${Number(payroll.amount).toFixed(2)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {format(
                              new Date(payroll.created_at),
                              "MMM dd, yyyy",
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payroll.period || "Monthly"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className="bg-green-50 text-green-600 border-green-200"
                            >
                              {payroll.status || "Completed"}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
