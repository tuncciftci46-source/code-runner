import React from "react";
import { Link, useLocation } from "wouter";
import { Activity, LineChart, Wifi, WifiOff } from "lucide-react";
import { useHealthCheck, useListLeagues } from "@workspace/api-client-react";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { data: _health, isError } = useHealthCheck();
  const { data: leagues } = useListLeagues();

  const navItems = [
    { href: "/", label: "Canlı Skor", icon: Activity },
    { href: "/tahminler", label: "İddaa Oranları", icon: LineChart },
  ];

  const topLeagues = leagues?.slice(0, 8) ?? [];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground selection:bg-primary/30">
      <aside className="w-64 flex-shrink-0 border-r border-border bg-card flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-border justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center text-primary-foreground font-black text-xl italic tracking-tighter">
              M
            </div>
            <span className="font-bold text-xl tracking-tight">MacSkor</span>
          </div>
          <div title={isError ? "Bağlantı Hatası" : "Bağlı"}>
            {isError ? <WifiOff className="w-4 h-4 text-destructive" /> : <Wifi className="w-4 h-4 text-primary" />}
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          {navItems.map((item) => (
            <Link key={item.href} href={item.href}>
              <div
                className={`flex items-center gap-3 px-3 py-2.5 rounded-md cursor-pointer transition-colors ${
                  location === item.href || (item.href !== "/" && location.startsWith(item.href))
                    ? "bg-primary text-primary-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </div>
            </Link>
          ))}

          {topLeagues.length > 0 && (
            <div className="pt-4">
              <div className="px-3 pb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground/60">
                Ligler
              </div>
              {topLeagues.map((league) => (
                <Link key={league.slug} href={`/lig/${league.slug}`}>
                  <div
                    className={`flex items-center gap-3 px-3 py-2 rounded-md cursor-pointer transition-colors ${
                      location === `/lig/${league.slug}`
                        ? "bg-primary text-primary-foreground font-medium shadow-sm"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                    }`}
                  >
                    <img
                      src={league.logo}
                      alt={league.name}
                      className="w-4 h-4 object-contain"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <span className="text-sm">{league.name}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </nav>
      </aside>

      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="h-14 border-b border-border bg-card/80 backdrop-blur-md flex items-center justify-between px-4 md:hidden sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-primary flex items-center justify-center text-primary-foreground font-black text-sm italic tracking-tighter">
              M
            </div>
            <span className="font-bold text-lg tracking-tight">MacSkor</span>
          </div>
          <nav className="flex items-center gap-4">
            {navItems.map((item) => (
              <Link key={item.href} href={item.href}>
                <div className={`p-1.5 rounded-md ${location === item.href || (item.href !== "/" && location.startsWith(item.href)) ? "text-primary" : "text-muted-foreground"}`}>
                  <item.icon className="w-5 h-5" />
                </div>
              </Link>
            ))}
          </nav>
        </header>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
