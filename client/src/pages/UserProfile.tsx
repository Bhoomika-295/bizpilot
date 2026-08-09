import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, LogOut, Mail, User } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function UserProfile() {
  const { user, isAuthenticated, logout, loading } = useAuth({ redirectOnUnauthenticated: true });
  const logoutMutation = trpc.auth.logout.useMutation();

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      await logout();
      toast.success("Logged out successfully");
    } catch (error) {
      toast.error("Failed to logout");
    }
  };

  if (loading || !isAuthenticated) {
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
      <div className="space-y-6 max-w-2xl">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">User Profile</h1>
          <p className="text-slate-600 mt-1">Manage your account settings</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-400 to-slate-600 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
              <div>
                <p className="font-semibold text-lg text-slate-900">{user?.name || "User"}</p>
                <p className="text-sm text-slate-600">{user?.email || "No email"}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label className="text-slate-700 font-medium">Full Name</Label>
                <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-slate-900">{user?.name || "—"}</p>
                </div>
              </div>

              <div>
                <Label className="text-slate-700 font-medium">Email Address</Label>
                <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <p className="text-slate-900">{user?.email || "—"}</p>
                </div>
              </div>

              <div>
                <Label className="text-slate-700 font-medium">Account ID</Label>
                <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-slate-900 font-mono text-sm">{user?.openId || "—"}</p>
                </div>
              </div>

              <div>
                <Label className="text-slate-700 font-medium">Account Role</Label>
                <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-slate-900 capitalize">{user?.role || "user"}</p>
                </div>
              </div>

              <div>
                <Label className="text-slate-700 font-medium">Member Since</Label>
                <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-slate-900">{user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : "—"}</p>
                </div>
              </div>

              <div>
                <Label className="text-slate-700 font-medium">Last Sign In</Label>
                <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-slate-900">{user?.lastSignedIn ? new Date(user.lastSignedIn).toLocaleString() : "—"}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-900">Danger Zone</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-red-200 bg-red-50">
              <LogOut className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Logging out will end your current session and require you to sign in again.
              </AlertDescription>
            </Alert>

            <Button
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
            >
              {logoutMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Logging Out...
                </>
              ) : (
                <>
                  <LogOut className="w-4 h-4 mr-2" />
                  Log Out
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <div className="text-xs text-slate-500 space-y-1">
          <p>• Your profile information is read-only and managed through Manus OAuth</p>
          <p>• To change your name or email, please update your Manus account settings</p>
          <p>• All your business data is securely stored and isolated by business</p>
        </div>
      </div>
    </DashboardLayout>
  );
}
