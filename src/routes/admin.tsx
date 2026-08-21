import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { adminLogin, adminLogout } from "@/lib/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AdminDashboard } from "@/components/admin/AdminDashboard";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Panel | Sai Communication" },
      { name: "description", content: "Manage products, orders, repairs, inventory and store settings." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

const SESSION_KEY = "sc_admin_token";

function AdminPage() {
  const [token, setToken] = useState(() => (typeof window !== "undefined" ? sessionStorage.getItem(SESSION_KEY) ?? "" : ""));
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const loginFn = useServerFn(adminLogin);
  const logoutFn = useServerFn(adminLogout);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const result = (await loginFn({ data: { password } })) as { token: string };
      sessionStorage.setItem(SESSION_KEY, result.token);
      setToken(result.token);
      setPassword("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Login failed.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    try {
      await logoutFn({ data: { token } });
    } catch {}
    sessionStorage.removeItem(SESSION_KEY);
    setToken("");
  }

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm card-surface rounded-2xl p-8 space-y-4">
          <div className="text-center mb-2">
            <h1 className="text-2xl font-bold text-primary">Sai Communication</h1>
            <p className="text-xs text-muted-foreground mt-1">Admin Panel</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin-pw">Password</Label>
            <Input id="admin-pw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoFocus />
          </div>
          <Button type="submit" className="w-full" disabled={loginLoading}>
            {loginLoading ? "Logging in..." : "Log In"}
          </Button>
        </form>
      </div>
    );
  }

  return <AdminDashboard token={token} onLogout={handleLogout} />;
}
