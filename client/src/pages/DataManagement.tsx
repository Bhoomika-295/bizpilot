import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

export default function DataManagement() {
  const { businessId } = useParams<{ businessId: string }>();
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const bid = parseInt(businessId || "0");

  const customersQuery = trpc.customers.list.useQuery({ businessId: bid }, { enabled: !!bid });
  const productsQuery = trpc.products.list.useQuery({ businessId: bid }, { enabled: !!bid });
  const transactionsQuery = trpc.transactions.list.useQuery({ businessId: bid }, { enabled: !!bid });
  const expensesQuery = trpc.expenses.list.useQuery({ businessId: bid }, { enabled: !!bid });

  const createCustomerMutation = trpc.customers.create.useMutation();
  const deleteCustomerMutation = trpc.customers.delete.useMutation();
  const createProductMutation = trpc.products.create.useMutation();
  const deleteProductMutation = trpc.products.delete.useMutation();
  const createTransactionMutation = trpc.transactions.create.useMutation();
  const deleteTransactionMutation = trpc.transactions.delete.useMutation();
  const createExpenseMutation = trpc.expenses.create.useMutation();
  const deleteExpenseMutation = trpc.expenses.delete.useMutation();

  const [activeTab, setActiveTab] = useState("customers");
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);

  const [customerForm, setCustomerForm] = useState({ name: "", email: "", phone: "", company: "" });
  const [productForm, setProductForm] = useState({ name: "", type: "product", price: "", cost: "" });
  const [transactionForm, setTransactionForm] = useState({ amount: "", description: "", date: "" });
  const [expenseForm, setExpenseForm] = useState({ category: "", amount: "", date: "" });

  const handleAddCustomer = async () => {
    if (!customerForm.name) {
      toast.error("Please enter a customer name");
      return;
    }
    setLoading(true);
    try {
      await createCustomerMutation.mutateAsync({
        businessId: bid,
        ...customerForm,
      });
      setCustomerForm({ name: "", email: "", phone: "", company: "" });
      setOpenDialog(false);
      await customersQuery.refetch();
      toast.success("Customer added successfully");
    } catch (error) {
      toast.error("Failed to add customer");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteCustomer = async (customerId: number) => {
    if (confirm("Are you sure?")) {
      try {
        await deleteCustomerMutation.mutateAsync({ customerId });
        await customersQuery.refetch();
        toast.success("Customer deleted");
      } catch (error) {
        toast.error("Failed to delete customer");
      }
    }
  };

  const handleAddProduct = async () => {
    if (!productForm.name) {
      toast.error("Please enter a product name");
      return;
    }
    setLoading(true);
    try {
      await createProductMutation.mutateAsync({
        businessId: bid,
        name: productForm.name,
        type: productForm.type as "product" | "service",
        price: productForm.price ? parseFloat(productForm.price) : undefined,
        cost: productForm.cost ? parseFloat(productForm.cost) : undefined,
      });
      setProductForm({ name: "", type: "product", price: "", cost: "" });
      setOpenDialog(false);
      await productsQuery.refetch();
      toast.success("Product added successfully");
    } catch (error) {
      toast.error("Failed to add product");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (confirm("Are you sure?")) {
      try {
        await deleteProductMutation.mutateAsync({ productId });
        await productsQuery.refetch();
        toast.success("Product deleted");
      } catch (error) {
        toast.error("Failed to delete product");
      }
    }
  };

  const handleAddTransaction = async () => {
    if (!transactionForm.amount || !transactionForm.date) {
      toast.error("Please fill in required fields");
      return;
    }
    setLoading(true);
    try {
      await createTransactionMutation.mutateAsync({
        businessId: bid,
        amount: parseFloat(transactionForm.amount),
        description: transactionForm.description,
        transactionDate: new Date(transactionForm.date),
        type: "sale",
      });
      setTransactionForm({ amount: "", description: "", date: "" });
      setOpenDialog(false);
      await transactionsQuery.refetch();
      toast.success("Transaction added successfully");
    } catch (error) {
      toast.error("Failed to add transaction");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTransaction = async (transactionId: number) => {
    if (confirm("Are you sure?")) {
      try {
        await deleteTransactionMutation.mutateAsync({ transactionId });
        await transactionsQuery.refetch();
        toast.success("Transaction deleted");
      } catch (error) {
        toast.error("Failed to delete transaction");
      }
    }
  };

  const handleAddExpense = async () => {
    if (!expenseForm.category || !expenseForm.amount || !expenseForm.date) {
      toast.error("Please fill in required fields");
      return;
    }
    setLoading(true);
    try {
      await createExpenseMutation.mutateAsync({
        businessId: bid,
        category: expenseForm.category,
        amount: parseFloat(expenseForm.amount),
        expenseDate: new Date(expenseForm.date),
      });
      setExpenseForm({ category: "", amount: "", date: "" });
      setOpenDialog(false);
      await expensesQuery.refetch();
      toast.success("Expense added successfully");
    } catch (error) {
      toast.error("Failed to add expense");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId: number) => {
    if (confirm("Are you sure?")) {
      try {
        await deleteExpenseMutation.mutateAsync({ expenseId });
        await expensesQuery.refetch();
        toast.success("Expense deleted");
      } catch (error) {
        toast.error("Failed to delete expense");
      }
    }
  };

  const formatCurrency = (value: any) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(parseFloat(value));
  };

  if (!user || !businessId) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Data Management</h1>
          <p className="text-slate-600 mt-1">Manage your business data</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="customers">Customers</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="expenses">Expenses</TabsTrigger>
          </TabsList>

          <TabsContent value="customers" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Customers</h2>
                <p className="text-sm text-slate-600">Total: {customersQuery.data?.length || 0}</p>
              </div>
              <Button onClick={() => setOpenDialog(true)} className="bg-slate-900 hover:bg-slate-800">
                <Plus className="w-4 h-4 mr-2" />
                Add Customer
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                {customersQuery.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : customersQuery.data && customersQuery.data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Phone</TableHead>
                          <TableHead>Company</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customersQuery.data.map((customer) => (
                          <TableRow key={customer.id}>
                            <TableCell className="font-medium">{customer.name}</TableCell>
                            <TableCell>{customer.email || "—"}</TableCell>
                            <TableCell>{customer.phone || "—"}</TableCell>
                            <TableCell>{customer.company || "—"}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteCustomer(customer.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-600">
                    <p>No customers yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="products" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Products & Services</h2>
                <p className="text-sm text-slate-600">Total: {productsQuery.data?.length || 0}</p>
              </div>
              <Button onClick={() => setOpenDialog(true)} className="bg-slate-900 hover:bg-slate-800">
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                {productsQuery.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : productsQuery.data && productsQuery.data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {productsQuery.data.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell className="font-medium">{product.name}</TableCell>
                            <TableCell>{product.type}</TableCell>
                            <TableCell>{product.price ? formatCurrency(product.price) : "—"}</TableCell>
                            <TableCell>{product.cost ? formatCurrency(product.cost) : "—"}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteProduct(product.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-600">
                    <p>No products yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Transactions</h2>
                <p className="text-sm text-slate-600">Total: {transactionsQuery.data?.length || 0}</p>
              </div>
              <Button onClick={() => setOpenDialog(true)} className="bg-slate-900 hover:bg-slate-800">
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                {transactionsQuery.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : transactionsQuery.data && transactionsQuery.data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactionsQuery.data.map((transaction) => (
                          <TableRow key={transaction.id}>
                            <TableCell>{new Date(transaction.transactionDate).toLocaleDateString()}</TableCell>
                            <TableCell>{transaction.description || "—"}</TableCell>
                            <TableCell>{transaction.type}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(transaction.amount)}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteTransaction(transaction.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-600">
                    <p>No transactions yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="expenses" className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold">Expenses</h2>
                <p className="text-sm text-slate-600">Total: {expensesQuery.data?.length || 0}</p>
              </div>
              <Button onClick={() => setOpenDialog(true)} className="bg-slate-900 hover:bg-slate-800">
                <Plus className="w-4 h-4 mr-2" />
                Add Expense
              </Button>
            </div>

            <Card>
              <CardContent className="pt-6">
                {expensesQuery.isLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : expensesQuery.data && expensesQuery.data.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expensesQuery.data.map((expense) => (
                          <TableRow key={expense.id}>
                            <TableCell>{new Date(expense.expenseDate).toLocaleDateString()}</TableCell>
                            <TableCell>{expense.category}</TableCell>
                            <TableCell>{expense.description || "—"}</TableCell>
                            <TableCell className="font-medium">{formatCurrency(expense.amount)}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteExpense(expense.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-600">
                    <p>No expenses yet</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={openDialog} onOpenChange={setOpenDialog}>
          <DialogContent>
            {activeTab === "customers" && (
              <>
                <DialogHeader>
                  <DialogTitle>Add Customer</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name *</Label>
                    <Input
                      value={customerForm.name}
                      onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={customerForm.email}
                      onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Phone</Label>
                    <Input
                      value={customerForm.phone}
                      onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Company</Label>
                    <Input
                      value={customerForm.company}
                      onChange={(e) => setCustomerForm({ ...customerForm, company: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleAddCustomer} disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800">
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Add Customer
                  </Button>
                </div>
              </>
            )}

            {activeTab === "products" && (
              <>
                <DialogHeader>
                  <DialogTitle>Add Product</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Name *</Label>
                    <Input
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Type</Label>
                    <Select value={productForm.type} onValueChange={(value) => setProductForm({ ...productForm, type: value })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="product">Product</SelectItem>
                        <SelectItem value="service">Service</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Price</Label>
                    <Input
                      type="number"
                      value={productForm.price}
                      onChange={(e) => setProductForm({ ...productForm, price: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Cost</Label>
                    <Input
                      type="number"
                      value={productForm.cost}
                      onChange={(e) => setProductForm({ ...productForm, cost: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleAddProduct} disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800">
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Add Product
                  </Button>
                </div>
              </>
            )}

            {activeTab === "transactions" && (
              <>
                <DialogHeader>
                  <DialogTitle>Add Transaction</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Amount *</Label>
                    <Input
                      type="number"
                      value={transactionForm.amount}
                      onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={transactionForm.date}
                      onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input
                      value={transactionForm.description}
                      onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleAddTransaction} disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800">
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Add Transaction
                  </Button>
                </div>
              </>
            )}

            {activeTab === "expenses" && (
              <>
                <DialogHeader>
                  <DialogTitle>Add Expense</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Category *</Label>
                    <Input
                      value={expenseForm.category}
                      onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Amount *</Label>
                    <Input
                      type="number"
                      value={expenseForm.amount}
                      onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>Date *</Label>
                    <Input
                      type="date"
                      value={expenseForm.date}
                      onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                      className="mt-1"
                    />
                  </div>
                  <Button onClick={handleAddExpense} disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800">
                    {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Add Expense
                  </Button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
