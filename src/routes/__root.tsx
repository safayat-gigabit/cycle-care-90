import { Outlet, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "@/components/ui/sonner";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Mess Manager — Track meals, bazar & balances" },
      { name: "description", content: "Manage mess members, daily meals, bazar expenses, deposits and per-meal cost reports for any billing cycle." },
      { property: "og:title", content: "Mess Manager — Track meals, bazar & balances" },
      { name: "twitter:title", content: "Mess Manager — Track meals, bazar & balances" },
      { property: "og:description", content: "Manage mess members, daily meals, bazar expenses, deposits and per-meal cost reports for any billing cycle." },
      { name: "twitter:description", content: "Manage mess members, daily meals, bazar expenses, deposits and per-meal cost reports for any billing cycle." },
      { property: "og:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/f5fd3ef3-7faa-4c1e-8e7a-b26bc37d899c" },
      { name: "twitter:image", content: "https://storage.googleapis.com/gpt-engineer-file-uploads/attachments/og-images/f5fd3ef3-7faa-4c1e-8e7a-b26bc37d899c" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="text-center">
        <div className="text-6xl font-bold text-primary">404</div>
        <p className="mt-2 text-muted-foreground">Page not found</p>
        <a href="/" className="inline-block mt-4 text-primary hover:underline">Go home</a>
      </div>
    </div>
  ),
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <Outlet />
      <Toaster />
    </AuthProvider>
  );
}
