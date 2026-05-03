import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth-context";
import { AppLayout } from "@/components/AppLayout";

// Pathless layout route — wraps all "/app/*" children with AppLayout + auth gate.
// We use a prefix "_app" for layout-only grouping; children use full paths.
export const Route = createFileRoute("/_app")({
  component: AuthedShell,
});

function AuthedShell() {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="h-10 w-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }
  if (!session) return <Navigate to="/login" />;
  return <AppLayout />;
}
