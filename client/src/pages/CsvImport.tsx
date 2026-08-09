import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { toast } from "sonner";

type DataType = "customers" | "products" | "transactions" | "expenses" | null;

interface ParsedRow {
  [key: string]: string;
}

export default function CsvImport() {
  const { businessId } = useParams<{ businessId: string }>();
  const { user } = useAuth({ redirectOnUnauthenticated: true });
  const bid = parseInt(businessId || "0");

  const [step, setStep] = useState<"upload" | "map" | "preview" | "complete">("upload");
  const [dataType, setDataType] = useState<DataType>(null);
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedRow[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);

  const createCustomerMutation = trpc.customers.create.useMutation();
  const createProductMutation = trpc.products.create.useMutation();
  const createTransactionMutation = trpc.transactions.create.useMutation();
  const createExpenseMutation = trpc.expenses.create.useMutation();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      const csv = event.target?.result as string;
      const lines = csv.split("\n").filter((line) => line.trim());
      if (lines.length < 2) {
        toast.error("CSV must have headers and at least one data row");
        return;
      }

      const headerLine = lines[0];
      const parsedHeaders = headerLine.split(",").map((h) => h.trim());
      setHeaders(parsedHeaders);

      const rows: ParsedRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(",").map((v) => v.trim());
        const row: ParsedRow = {};
        parsedHeaders.forEach((header, index) => {
          row[header] = values[index] || "";
        });
        rows.push(row);
      }
      setParsedData(rows);
      setStep("map");
    };
    reader.readAsText(selectedFile);
  };

  const handleMapColumn = (csvHeader: string, dbField: string) => {
    setColumnMapping((prev) => ({
      ...prev,
      [csvHeader]: dbField,
    }));
  };

  const handleImport = async () => {
    if (!dataType) {
      toast.error("Please select data type");
      return;
    }

    setLoading(true);
    const errors: string[] = [];
    let successCount = 0;

    try {
      for (let i = 0; i < parsedData.length; i++) {
        const row = parsedData[i];
        const mappedData: Record<string, any> = {};

        Object.entries(columnMapping).forEach(([csvCol, dbField]) => {
          if (dbField && row[csvCol]) {
            mappedData[dbField] = row[csvCol];
          }
        });

        try {
          if (dataType === "customers") {
            await createCustomerMutation.mutateAsync({
              businessId: bid,
              name: mappedData.name || `Customer ${i + 1}`,
              email: mappedData.email,
              phone: mappedData.phone,
              company: mappedData.company,
              status: "active",
            });
          } else if (dataType === "products") {
            await createProductMutation.mutateAsync({
              businessId: bid,
              name: mappedData.name || `Product ${i + 1}`,
              type: mappedData.type || "product",
              price: mappedData.price ? parseFloat(mappedData.price) : undefined,
              cost: mappedData.cost ? parseFloat(mappedData.cost) : undefined,
              status: "active",
            });
          } else if (dataType === "transactions") {
            await createTransactionMutation.mutateAsync({
              businessId: bid,
              amount: parseFloat(mappedData.amount || "0"),
              description: mappedData.description,
              transactionDate: new Date(mappedData.date || new Date()),
              type: "sale",
              status: "completed",
            });
          } else if (dataType === "expenses") {
            await createExpenseMutation.mutateAsync({
              businessId: bid,
              category: mappedData.category || "Other",
              amount: parseFloat(mappedData.amount || "0"),
              expenseDate: new Date(mappedData.date || new Date()),
              description: mappedData.description,
              status: "completed",
            });
          }
          successCount++;
        } catch (rowError) {
          errors.push(`Row ${i + 1}: ${(rowError as any)?.message || "Import failed"}`);
        }
      }

      setImportResult({
        success: successCount,
        failed: parsedData.length - successCount,
        errors: errors.slice(0, 5),
      });
      setStep("complete");
      toast.success(`Imported ${successCount} records successfully`);
    } catch (error) {
      toast.error("Import failed");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep("upload");
    setDataType(null);
    setFile(null);
    setParsedData([]);
    setHeaders([]);
    setColumnMapping({});
    setImportResult(null);
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
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">CSV Import</h1>
          <p className="text-slate-600 mt-1">Import data from CSV files</p>
        </div>

        {step === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Select Data Type & Upload File</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label htmlFor="data-type">Data Type *</Label>
                <Select value={dataType || ""} onValueChange={(value) => setDataType(value as DataType)}>
                  <SelectTrigger id="data-type" className="mt-1">
                    <SelectValue placeholder="Select data type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customers">Customers</SelectItem>
                    <SelectItem value="products">Products</SelectItem>
                    <SelectItem value="transactions">Transactions</SelectItem>
                    <SelectItem value="expenses">Expenses</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="csv-file">CSV File *</Label>
                <Input id="csv-file" type="file" accept=".csv" onChange={handleFileUpload} className="mt-1" />
                <p className="text-xs text-slate-500 mt-2">Supported format: CSV with headers</p>

              </div>

              {file && (
                <Alert>
                  <CheckCircle className="w-4 h-4" />
                  <AlertDescription>
                    File loaded: {file.name} ({parsedData.length} rows)
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {step === "map" && (
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Map Columns</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">Map CSV columns to database fields</p>
              <div className="space-y-3">
                {headers.map((header) => (
                  <div key={header} className="flex items-center gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{header}</p>
                    </div>
                    <div className="flex-1">
                      <Select value={columnMapping[header] || ""} onValueChange={(value) => handleMapColumn(header, value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Skip column" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Skip</SelectItem>
                          {dataType === "customers" && (
                            <>
                              <SelectItem value="name">Name</SelectItem>
                              <SelectItem value="email">Email</SelectItem>
                              <SelectItem value="phone">Phone</SelectItem>
                              <SelectItem value="company">Company</SelectItem>
                            </>
                          )}
                          {dataType === "products" && (
                            <>
                              <SelectItem value="name">Name</SelectItem>
                              <SelectItem value="type">Type</SelectItem>
                              <SelectItem value="price">Price</SelectItem>
                              <SelectItem value="cost">Cost</SelectItem>
                            </>
                          )}
                          {dataType === "transactions" && (
                            <>
                              <SelectItem value="amount">Amount</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="description">Description</SelectItem>
                            </>
                          )}
                          {dataType === "expenses" && (
                            <>
                              <SelectItem value="category">Category</SelectItem>
                              <SelectItem value="amount">Amount</SelectItem>
                              <SelectItem value="date">Date</SelectItem>
                              <SelectItem value="description">Description</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep("upload")}>
                  Back
                </Button>
                <Button onClick={() => setStep("preview")} className="flex-1 bg-slate-900 hover:bg-slate-800">
                  Continue to Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "preview" && (
          <Card>
            <CardHeader>
              <CardTitle>Step 3: Preview & Validate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {headers.map((header) => (
                        <TableHead key={header}>{columnMapping[header] || header}</TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedData.slice(0, 5).map((row, idx) => (
                      <TableRow key={idx}>
                        {headers.map((header) => (
                          <TableCell key={`${idx}-${header}`}>{row[header] || "—"}</TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              {parsedData.length > 5 && (
                <p className="text-xs text-slate-500">Showing first 5 of {parsedData.length} rows</p>
              )}
              <div className="flex gap-3 pt-4">
                <Button variant="outline" onClick={() => setStep("map")}>
                  Back
                </Button>
                <Button onClick={() => handleImport()} disabled={loading} className="flex-1 bg-slate-900 hover:bg-slate-800">
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    "Import Data"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === "complete" && importResult && (
          <Card>
            <CardHeader>
              <CardTitle>Import Complete</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm text-green-600 font-medium">Successfully Imported</p>
                  <p className="text-3xl font-bold text-green-900 mt-2">{importResult.success}</p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                  <p className="text-sm text-red-600 font-medium">Failed</p>
                  <p className="text-3xl font-bold text-red-900 mt-2">{importResult.failed}</p>
                </div>
              </div>

              {importResult.errors.length > 0 && (
                <Alert>
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {importResult.errors.map((error, idx) => (
                        <p key={idx} className="text-sm">
                          {error}
                        </p>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              <Button onClick={handleReset} className="w-full bg-slate-900 hover:bg-slate-800">
                Import Another File
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
