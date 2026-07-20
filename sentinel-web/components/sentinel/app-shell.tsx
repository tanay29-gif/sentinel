import Link from "next/link";
import { Bell, Command, Search } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { currentUser, getNavItems, NavItem } from "@/lib/data";

interface AppShellProps {
  children: React.ReactNode;
  params: Promise<{ teamId: string }>; // Define the prop here
}

export async function AppShell({ children ,  params }: AppShellProps) {
  const resolvedParams = await params;
  const teamId = resolvedParams.teamId; 
  
  const navItems: NavItem[] = getNavItems(teamId);

  return (
    <div className="min-h-screen bg-[#f7f8fa] text-slate-950">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-slate-200 px-5">
          <div className="flex size-9 items-center justify-center rounded-md bg-emerald-600 text-white">
            <Command className="size-5" />
          </div>
          <div>
            <p className="text-sm font-semibold tracking-wide">SENTINEL</p>
            <p className="text-xs text-slate-500">Ops workspace</p>
          </div>
        </div>
        <nav className="space-y-1 p-3">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950"
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-4">
          <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3">
            <Badge className="bg-emerald-600">RBAC</Badge>
            <p className="mt-2 text-sm font-medium">{currentUser.team}</p>
            <p className="text-xs text-slate-600">{currentUser.role}</p>
          </div>
        </div>
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-6">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input className="h-10 border-slate-200 pl-9" placeholder="Search incidents, logs, commits, services..." />
          </div>
          <Button variant="outline" size="icon" aria-label="Notifications">
            <Bell className="size-4" />
          </Button>
          <Avatar>
            <AvatarFallback>TS</AvatarFallback>
          </Avatar>
        </header>
        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
