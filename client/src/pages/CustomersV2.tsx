import { useParams } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2, Plus, Trash2, Mail, Phone } from "lucide-react";
import { useState, useMemo } from "react";

export default function CustomersV2() {
  const { businessId } = useParams<{ businessId: string }>();
  const { isAuthenticated } = useAuth({ redirectOnUnauthenticated: true });
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch customers
  const customersQuery = trpc.customers.list.useQuery(
    { businessId: parseInt(businessId || "0") },
    { enabled: !!businessId && isAuthenticated }
  );

  // Fetch transactions for customer metrics
  const transactionsQuery = trpc.transactions.list.useQuery(
    { businessId: parseInt(businessId || "0") },
    { enabled: !!businessId && isAuthenticated }
  );

  const deleteCustomerMutation = trpc.customers.delete.useMutation({
    onSuccess: () => {
      customersQuery.refetch();
    },
  });

  const customers = customersQuery.data || [];
  const transactions = transactionsQuery.data || [];

  // Calculate customer metrics
  const customerMetrics = useMemo(() => {
    const metrics: Record<
      number,
      {
        totalPurchases: number;
        transactionCount: number;
        lastTransactionDate: Date | null;
        status: "active" | "inactive";
      }
    > = {};

    customers.forEach((customer) => {
      metrics[customer.id] = {
        totalPurchases: 0,
        transactionCount: 0,
        lastTransactionDate: null,
        status: "inactive",
      };
    });

    transactions.forEach((transaction) => {
      if (transaction.customerId && metrics[transaction.customerId]) {
        const amount = parseFloat(transaction.amount || "0");
        metrics[transaction.customerId].totalPurchases += amount;
        metrics[transaction.customerId].transactionCount += 1;

        const txDate = new Date(transaction.transactionDate);
        if (
          !metrics[transaction.customerId].lastTransactionDate ||
          txDate > metrics[transaction.customerId].lastTransactionDate!
        ) {
          metrics[transaction.customerId].lastTransactionDate = txDate;
        }
      }
    });

    // Mark customers as active if they had a transaction in last 30 days
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    Object.keys(metrics).forEach((customerId) => {
      const cId = parseInt(customerId);
      const lastTx = metrics[cId].lastTransactionDate;
      if (lastTx && lastTx > thirtyDaysAgo) {
        metrics[cId].status = "active";
      }
    });

    return metrics;
  }, [customers, transactions]);

  // Filter customers by search term
  const filteredCustomers = useMemo(() => {
    return customers.filter((customer) =>
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customers, searchTerm]);

  const isLoading = customersQuery.isLoading || transactionsQuery.isLoading;

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Customers</h1>
            <p className="text-slate-600 mt-1">
              {customers.length} total customers
            </p>
          </div>
        </div>

        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <Input
              placeholder="Search by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </CardContent>
        </Card>

        {/* Customers Table */}
        <Card>
          <CardHeader>
            <CardTitle>Customer List</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-slate-600">
                {customers.length === 0
                  ? "No customers yet. Add your first customer to get started."
                  : "No customers match your search."}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead className="text-right">Total Purchases</TableHead>
                      <TableHead className="text-right">Transactions</TableHead>
                      <TableHead>Last Purchase</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCustomers.map((customer) => {
                      const metrics = customerMetrics[customer.id];
                      return (
                        <TableRow key={customer.id}>
                          <TableCell className="font-medium text-slate-900">
                            {customer.name}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {customer.email ? (
                              <a
                                href={`mailto:${customer.email}`}
                                className="flex items-center gap-1 hover:text-blue-600"
                              >
                                <Mail className="w-4 h-4" />
                                {customer.email}
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {customer.phone ? (
                              <a
                                href={`tel:${customer.phone}`}
                                className="flex items-center gap-1 hover:text-blue-600"
                              >
                                <Phone className="w-4 h-4" />
                                {customer.phone}
                              </a>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-semibold text-slate-900">
                            ₹{metrics.totalPurchases.toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right text-slate-600">
                            {metrics.transactionCount}
                          </TableCell>
                          <TableCell className="text-slate-600">
                            {metrics.lastTransactionDate ? (
                              new Date(
                                metrics.lastTransactionDate
                              ).toLocaleDateString()
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                metrics.status === "active"
                                  ? "default"
                                  : "secondary"
                              }
                              className={
                                metrics.status === "active"
                                  ? "bg-green-100 text-green-800"
                                  : "bg-slate-100 text-slate-800"
                              }
                            >
                              {metrics.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                deleteCustomerMutation.mutate({
                                  customerId: customer.id,
                                })
                              }
                              disabled={deleteCustomerMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 text-red-600" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Statistics */}
        {customers.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-600">
                  Total Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {customers.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-600">
                  Active Customers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {
                    Object.values(customerMetrics).filter(
                      (m) => m.status === "active"
                    ).length
                  }
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-600">
                  Total Revenue
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  ₹
                  {Object.values(customerMetrics)
                    .reduce((sum, m) => sum + m.totalPurchases, 0)
                    .toFixed(2)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium text-slate-600">
                  Avg Customer Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  ₹
                  {customers.length > 0
                    ? (
                        Object.values(customerMetrics).reduce(
                          (sum, m) => sum + m.totalPurchases,
                          0
                        ) / customers.length
                      ).toFixed(2)
                    : "0.00"}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
