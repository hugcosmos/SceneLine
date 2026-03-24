import { useState, useEffect } from "react";
import { Switch, Route, Router, Link, useLocation } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Moon, Sun, Home as HomeIcon, Upload, History } from "lucide-react";

import NotFound from "@/pages/not-found";
import HomePage from "@/pages/home";
import Scripts from "@/pages/scripts";
import ScriptUpload from "@/pages/script-upload";
import ScriptDetail from "@/pages/script-detail";
import Practice from "@/pages/practice";
import HistoryPage from "@/pages/history";
import { I18nProvider, useI18n } from "@/lib/i18n";

function SceneLineLogo() {
  return (
    <svg
      width="28"
      height="28"
      viewBox="0 0 28 28"
      fill="none"
      aria-label="SceneLine"
      className="shrink-0"
    >
      <path
        d="M4 6a4 4 0 014-4h12a4 4 0 014 4v10a4 4 0 01-4 4H10l-4 4v-4H8a4 4 0 01-4-4V6z"
        fill="hsl(var(--primary))"
        opacity="0.15"
        stroke="hsl(var(--primary))"
        strokeWidth="1.5"
      />
      <path
        d="M11 8.5v7l6-3.5-6-3.5z"
        fill="hsl(var(--primary))"
      />
    </svg>
  );
}

function NavBar() {
  const [location] = useLocation();
  const [dark, setDark] = useState(() =>
    typeof window !== "undefined"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : false
  );
  const { lang, setLang, t } = useI18n();

  const NAV_ITEMS = [
    { href: "/", label: t("nav.home"), icon: HomeIcon },
    { href: "/scripts/new", label: t("nav.upload"), icon: Upload },
    { href: "/history", label: t("nav.history"), icon: History },
  ];

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-sm" data-testid="nav-bar">
      <div className="max-w-5xl mx-auto flex items-center justify-between h-12 px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2" data-testid="nav-logo">
            <SceneLineLogo />
            <span className="font-bold text-sm">
              <span className="text-primary">Scene</span>
              <span className="text-accent">Line</span>
            </span>
          </Link>

          <nav className="hidden sm:flex items-center gap-1" data-testid="nav-links">
            {NAV_ITEMS.map((item) => {
              const isActive = location === item.href;
              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    size="sm"
                    className="text-xs gap-1.5"
                    data-testid={`nav-link-${item.href.replace(/\//g, "").replace(/\s/g, "") || "home"}`}
                  >
                    <item.icon className="h-3.5 w-3.5" />
                    {item.label}
                  </Button>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang(lang === "en" ? "zh" : "en")}
            data-testid="button-lang-toggle"
          >
            {lang === "en" ? "中文" : "EN"}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDark(!dark)}
            data-testid="button-theme-toggle"
          >
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </header>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <TooltipProvider>
          <Router hook={useHashLocation}>
            <div className="min-h-screen flex flex-col bg-background text-foreground">
              <NavBar />
              <main className="flex-1 pb-8">
                <Switch>
                  <Route path="/" component={HomePage} />
                  <Route path="/scripts" component={Scripts} />
                  <Route path="/scripts/new" component={ScriptUpload} />
                  <Route path="/scripts/:id" component={ScriptDetail} />
                  <Route path="/practice/:scriptId" component={Practice} />
                  <Route path="/history" component={HistoryPage} />
                  <Route component={NotFound} />
                </Switch>
              </main>
              <footer className="py-6 text-center text-xs text-muted-foreground border-t">
                <p>Made with 💙 by Nicky & AI</p>
              </footer>
            </div>
            <Toaster />
          </Router>
        </TooltipProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

export default App;
