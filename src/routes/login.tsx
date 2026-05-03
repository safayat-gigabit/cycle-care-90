import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { phoneToEmail } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ChefHat } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: phoneToEmail(phone),
      password,
    });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Welcome back!"); navigate({ to: "/dashboard" }); }
  };

  return (
    <div className="min-h-screen grid place-items-center p-4 bg-gradient-surface">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="h-14 w-14 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-glow mb-3">
            <ChefHat className="h-7 w-7 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">Mess Manager</h1>
          <p className="text-sm text-muted-foreground mt-1">Sign in to manage your mess</p>
        </div>
        <Card className="p-6 shadow-card">
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" type="tel" placeholder="01XXXXXXXXX" value={phone}
                onChange={(e) => setPhone(e.target.value)} required autoComplete="tel" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password}
                onChange={(e) => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
          <p className="text-sm text-center text-muted-foreground mt-4">
            New here? <Link to="/register" className="text-primary hover:underline font-medium">Create account</Link>
          </p>
        </Card>
      </div>
    </div>
  );
}
