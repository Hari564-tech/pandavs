import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect, type FormEvent } from "react";
import { toast } from "sonner";
import { Crest } from "@/components/crest";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient, setBearerToken } from "@/lib/auth/client";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { useHub } from "@/lib/store";

export const Route = createFileRoute("/login")({ component: LoginPage });

function LoginPage() {
  const navigate = useNavigate();
  const { user } = useCurrentUserState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    try {
      const res = await authClient.signIn.email({
        email: email.trim().toLowerCase(),
        password,
      });

      if (res.error) {
        toast.error("Sign-in failed", {
          description: res.error.message || "Invalid email or password",
        });
      } else {
        const sessionToken = (res.data as any)?.session?.token ?? (res.data as any)?.token;
        if (sessionToken) {
          setBearerToken(sessionToken);
        }
        if (res.data?.user?.id) {
          useHub.getState().setUser(res.data.user.id);
        }
        toast.success("Signed in successfully", {
          description: `Welcome back to TeamHub, ${res.data?.user?.name || "Member"}.`,
        });

        // Resolve redirect destination if passed
        let target = "/";
        if (typeof window !== "undefined") {
          const params = new URLSearchParams(window.location.search);
          const r = params.get("redirect");
          if (r && r.startsWith("/")) {
            target = r;
          }
        }
        navigate({ to: target });
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Authentication failed";
      toast.error("Sign-in failed", { description: errorMsg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center text-center">
          <Crest className="h-12 w-12" />
          <h1 className="mt-3 font-display text-2xl font-bold tracking-tight">Sign in to TeamHub</h1>
          <p className="text-sm text-muted">Institutional Project Execution & Operations Portal</p>
        </div>

        {user && !user.isDevFallback ? (
          <Card className="p-6 text-center space-y-4">
            <div className="space-y-1">
              <p className="text-sm text-muted">You are currently signed in as</p>
              <p className="font-semibold text-ink text-base">{user.displayName || user.primaryEmail}</p>
            </div>
            <Button onClick={() => navigate({ to: "/" })} className="w-full">
              Enter Workspace
            </Button>
          </Card>
        ) : (
          <Card className="p-6">
            <form
              id="loginForm"
              data-hydrated={mounted ? "true" : "false"}
              onSubmit={handleLogin}
              action="javascript:void(0);"
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <Label htmlFor="email">Institutional Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Verifying credentials..." : "Sign in"}
              </Button>
            </form>

            <div className="mt-4 pt-3 border-t border-border text-center">
              <p className="text-xs text-muted">
                Accounts are managed by the institution. Contact your Super Admin for credential provisioning.
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
