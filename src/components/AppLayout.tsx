import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Users, CalendarRange, UtensilsCrossed,
  ShoppingBasket, Wallet, Plus, BarChart3, LogOut, ChefHat,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: typeof LayoutDashboard; admin?: boolean };
const nav: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/cycles", label: "Billing Cycles", icon: CalendarRange, admin: true },
  { to: "/meals", label: "Meals", icon: UtensilsCrossed },
  { to: "/bazar", label: "Bazar", icon: ShoppingBasket },
  { to: "/deposits", label: "Deposits", icon: Wallet },
  { to: "/extra-costs", label: "Extra Costs", icon: Plus, admin: true },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/users", label: "Users", icon: Users, admin: true },
];

export function AppLayout() {
  const { profile, role, signOut } = useAuth();
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden md:flex w-64 flex-col bg-sidebar border-r border-sidebar-border">
        <div className="px-6 py-5 border-b border-sidebar-border flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <ChefHat className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <div className="font-semibold text-sidebar-foreground">Mess Manager</div>
            <div className="text-xs text-muted-foreground">Hisab system</div>
          </div>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {nav.filter(n => !n.admin || role === "admin").map(({ to, label, icon: Icon }) => {
            const active = path === to || path.startsWith(to + "/");
            return (
              <Link
                key={to}
                to={to as never}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-primary text-sm font-semibold">
              {profile?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{profile?.name}</div>
              <div className="text-xs text-muted-foreground capitalize">{role}</div>
            </div>
            <Button size="icon" variant="ghost" onClick={handleSignOut} title="Sign out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* mobile top bar */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 bg-sidebar/95 backdrop-blur border-b border-sidebar-border px-4 py-3 flex items-center justify-between pt-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center shadow-glow">
            <ChefHat className="h-4 w-4 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">Mess Manager</div>
            <div className="text-[10px] text-muted-foreground capitalize">{profile?.name} · {role}</div>
          </div>
        </div>
        <Button size="icon" variant="ghost" onClick={handleSignOut}><LogOut className="h-4 w-4" /></Button>
      </div>

      <main className="flex-1 md:ml-0 mt-[60px] md:mt-0 overflow-x-hidden w-full">
        <div className="p-4 md:p-8 max-w-7xl mx-auto pb-24 md:pb-8">
          <Outlet />
        </div>
        {/* mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-sidebar/95 backdrop-blur border-t border-sidebar-border pb-[env(safe-area-inset-bottom)]">
          <div className="flex overflow-x-auto no-scrollbar">
            {nav.filter(n => !n.admin || role === "admin").map(({ to, label, icon: Icon }) => {
              const active = path === to || path.startsWith(to + "/");
              return (
                <Link key={to} to={to as never} className={cn(
                  "flex-1 min-w-[64px] flex flex-col items-center gap-0.5 px-2 py-2 text-[10px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}>
                  <Icon className={cn("h-5 w-5", active && "scale-110 transition-transform")} />
                  <span className="truncate max-w-[60px]">{label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </main>
    </div>
  );
}
