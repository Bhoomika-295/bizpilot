import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, ChevronRight } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const INDUSTRIES = [
  "Technology",
  "Retail",
  "Healthcare",
  "Finance",
  "Manufacturing",
  "Education",
  "Hospitality",
  "Real Estate",
  "E-commerce",
  "Services",
  "Other",
];

const BUSINESS_TYPES = [
  "Sole Proprietor",
  "Partnership",
  "LLC",
  "Corporation",
  "Non-profit",
  "Other",
];

const BUSINESS_SIZES = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1000+",
];

const BUSINESS_GOALS = [
  "Increase revenue",
  "Increase profit",
  "Improve customer retention",
  "Reduce costs",
  "Improve operational efficiency",
  "Increase market share",
  "Launch new products/services",
  "Improve customer satisfaction",
];

export default function Onboarding() {
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    industry: "",
    businessType: "",
    country: "",
    location: "",
    currency: "USD",
    businessSize: "",
    numberOfEmployees: "",
    selectedGoals: [] as string[],
  });

  const createBusinessMutation = trpc.business.create.useMutation();
  const createGoalMutation = trpc.businessGoals.create.useMutation();
  const createCustomerMutation = trpc.customers.create.useMutation();
  const createProductMutation = trpc.products.create.useMutation();
  const createTransactionMutation = trpc.transactions.create.useMutation();
  const createExpenseMutation = trpc.expenses.create.useMutation();

  const handleGoalToggle = (goal: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedGoals: prev.selectedGoals.includes(goal)
        ? prev.selectedGoals.filter((g) => g !== goal)
        : [...prev.selectedGoals, goal],
    }));
  };

  const handleSubmit = async () => {
    if (!formData.name || !formData.industry || !formData.businessType) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (formData.selectedGoals.length === 0) {
      toast.error("Please select at least one business goal");
      return;
    }

    setLoading(true);
    try {
      // Create business
      const businessResult = await createBusinessMutation.mutateAsync({
        name: formData.name,
        industry: formData.industry,
        businessType: formData.businessType,
        country: formData.country,
        location: formData.location,
        currency: formData.currency,
        businessSize: formData.businessSize,
        numberOfEmployees: formData.numberOfEmployees
          ? parseInt(formData.numberOfEmployees)
          : undefined,
        isDemo: true,
      });

      const businessId = (businessResult as any).insertId;

      // Create goals with priority
      for (let i = 0; i < formData.selectedGoals.length; i++) {
        await createGoalMutation.mutateAsync({
          businessId,
          goal: formData.selectedGoals[i],
          priority: i,
        });
      }

      // Seed demo data
      await seedDemoData(businessId);

      toast.success("Business created successfully!");
      setLocation(`/dashboard/${businessId}`);
    } catch (error) {
      console.error("Error creating business:", error);
      toast.error("Failed to create business. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const seedDemoData = async (businessId: number) => {
    try {
      // Create demo customers
      const customers = [
        { name: "Acme Corp", company: "Acme Corporation", email: "contact@acme.com" },
        { name: "Tech Startup Inc", company: "Tech Startup", email: "hello@techstartup.com" },
        { name: "Global Solutions", company: "Global Solutions Ltd", email: "info@globalsol.com" },
      ];

      const customerIds: number[] = [];
      for (const customer of customers) {
        const result = await createCustomerMutation.mutateAsync({
          businessId,
          name: customer.name,
          company: customer.company,
          email: customer.email,
          status: "active",
        });
        customerIds.push((result as any).insertId);
      }

      // Create demo products
      const products = [
        { name: "Premium Plan", type: "service", price: 299, cost: 50 },
        { name: "Standard Plan", type: "service", price: 99, cost: 20 },
        { name: "Consulting Services", type: "service", price: 150, cost: 30 },
      ];

      const productIds: number[] = [];
      for (const product of products) {
        const result = await createProductMutation.mutateAsync({
          businessId,
          name: product.name,
          type: product.type as "product" | "service",
          price: product.price,
          cost: product.cost,
          status: "active",
        });
        productIds.push((result as any).insertId);
      }

      // Create demo transactions (last 30 days)
      const now = new Date();
      for (let i = 0; i < 15; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));

        await createTransactionMutation.mutateAsync({
          businessId,
          customerId: customerIds[Math.floor(Math.random() * customerIds.length)],
          productId: productIds[Math.floor(Math.random() * productIds.length)],
          type: "sale",
          amount: Math.floor(Math.random() * 5000) + 500,
          transactionDate: date,
          status: "completed",
          source: "demo",
        });
      }

      // Create demo expenses
      const expenseCategories = [
        "Salaries",
        "Rent",
        "Utilities",
        "Marketing",
        "Software",
        "Supplies",
      ];

      for (let i = 0; i < 10; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - Math.floor(Math.random() * 30));

        await createExpenseMutation.mutateAsync({
          businessId,
          category: expenseCategories[Math.floor(Math.random() * expenseCategories.length)],
          amount: Math.floor(Math.random() * 3000) + 500,
          expenseDate: date,
          status: "completed",
          source: "demo",
        });
      }
    } catch (error) {
      console.error("Error seeding demo data:", error);
      // Continue even if demo data fails
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Welcome to BizPilot AI</h1>
          <p className="text-slate-600">Let's set up your business profile</p>
        </div>

        <Card className="border-0 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Business Setup</CardTitle>
                <CardDescription>Step {step} of 2</CardDescription>
              </div>
              <div className="text-sm font-medium text-slate-600">
                {Math.round((step / 2) * 100)}%
              </div>
            </div>
            <div className="mt-4 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-900 transition-all duration-300"
                style={{ width: `${(step / 2) * 100}%` }}
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {step === 1 ? (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Business Name *</Label>
                  <Input
                    id="name"
                    placeholder="Enter your business name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="industry">Industry *</Label>
                    <Select
                      value={formData.industry}
                      onValueChange={(value) =>
                        setFormData({ ...formData, industry: value })
                      }
                    >
                      <SelectTrigger id="industry" className="mt-1">
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        {INDUSTRIES.map((ind) => (
                          <SelectItem key={ind} value={ind}>
                            {ind}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="type">Business Type *</Label>
                    <Select
                      value={formData.businessType}
                      onValueChange={(value) =>
                        setFormData({ ...formData, businessType: value })
                      }
                    >
                      <SelectTrigger id="type" className="mt-1">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {BUSINESS_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="country">Country</Label>
                    <Input
                      id="country"
                      placeholder="e.g., United States"
                      value={formData.country}
                      onChange={(e) =>
                        setFormData({ ...formData, country: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      placeholder="e.g., New York, NY"
                      value={formData.location}
                      onChange={(e) =>
                        setFormData({ ...formData, location: e.target.value })
                      }
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select
                      value={formData.currency}
                      onValueChange={(value) =>
                        setFormData({ ...formData, currency: value })
                      }
                    >
                      <SelectTrigger id="currency" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                        <SelectItem value="GBP">GBP</SelectItem>
                        <SelectItem value="INR">INR</SelectItem>
                        <SelectItem value="JPY">JPY</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="size">Business Size</Label>
                    <Select
                      value={formData.businessSize}
                      onValueChange={(value) =>
                        setFormData({ ...formData, businessSize: value })
                      }
                    >
                      <SelectTrigger id="size" className="mt-1">
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {BUSINESS_SIZES.map((size) => (
                          <SelectItem key={size} value={size}>
                            {size} employees
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold mb-4 block">
                    What are your primary business goals? *
                  </Label>
                  <p className="text-sm text-slate-600 mb-4">
                    Select the goals that matter most to your business. These will help BizPilot
                    tailor recommendations and insights.
                  </p>
                  <div className="space-y-3">
                    {BUSINESS_GOALS.map((goal) => (
                      <div key={goal} className="flex items-center space-x-2">
                        <Checkbox
                          id={goal}
                          checked={formData.selectedGoals.includes(goal)}
                          onCheckedChange={() => handleGoalToggle(goal)}
                        />
                        <Label htmlFor={goal} className="font-normal cursor-pointer">
                          {goal}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
                  <p className="text-sm text-blue-900">
                    <strong>Demo Data:</strong> We'll create sample customers, products, and
                    transactions so you can explore BizPilot immediately. You can replace these
                    with your real data anytime.
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              {step === 2 && (
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={loading}
                >
                  Back
                </Button>
              )}
              <Button
                onClick={() => (step === 1 ? setStep(2) : handleSubmit())}
                disabled={loading}
                className="flex-1 bg-slate-900 hover:bg-slate-800"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  <>
                    {step === 1 ? "Next" : "Create Business"}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
