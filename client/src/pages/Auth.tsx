import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";
import { startLogin } from "@/const";

export default function Auth() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (isAuthenticated && user) {
      setLocation("/onboarding");
    }
  }, [isAuthenticated, user, setLocation]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-slate-600" />
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
      <div className="w-full max-w-md">
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-2 text-center">
            <CardTitle className="text-3xl font-bold text-slate-900">BizPilot AI</CardTitle>
            <CardDescription className="text-base">
              Your business should improve every day.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3 text-center text-sm text-slate-600">
              <p>
                BizPilot AI is an adaptive, real-time Business Growth & Operations Copilot.
              </p>
              <p>
                Understand your business, track your progress, and make data-driven decisions.
              </p>
            </div>

            <Button
              onClick={startLogin}
              size="lg"
              className="w-full bg-slate-900 hover:bg-slate-800 text-white"
            >
              Sign In with Manus
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">New to BizPilot?</span>
              </div>
            </div>

            <Button
              onClick={startLogin}
              variant="outline"
              size="lg"
              className="w-full"
            >
              Create Account
            </Button>

            <div className="text-xs text-slate-500 text-center space-y-1">
              <p>By signing in, you agree to our Terms of Service</p>
              <p>and acknowledge our Privacy Policy</p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 grid grid-cols-3 gap-4 text-center">
          <div className="space-y-2">
            <div className="text-2xl font-bold text-slate-900">Real</div>
            <p className="text-xs text-slate-600">Actual data,<br />not demos</p>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-slate-900">Fast</div>
            <p className="text-xs text-slate-600">Real-time<br />insights</p>
          </div>
          <div className="space-y-2">
            <div className="text-2xl font-bold text-slate-900">Smart</div>
            <p className="text-xs text-slate-600">AI-powered<br />analysis</p>
          </div>
        </div>
      </div>
    </div>
  );
}
