import { Search, Bell, User, Menu } from "lucide-react";
import { Input } from "@/components/ui/input";

export function Header() {
  return (
    <header className="h-16 bg-background border-b border-border flex items-center justify-between px-6">
      <div className="flex items-center gap-4 flex-1">
        {/* Mobile menu */}
        <button className="lg:hidden">
          <Menu className="w-5 h-5 text-muted-foreground" />
        </button>

        {/* Search */}
        <div className="relative max-w-md flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search"
            className="pl-10 bg-muted border-0 focus:ring-2 focus:ring-primary"
          />
          <kbd className="absolute right-3 top-1/2 transform -translate-y-1/2 px-1.5 py-0.5 bg-muted-foreground/10 text-xs text-muted-foreground rounded">
            /
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Ad indicator */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="w-2 h-2 bg-primary rounded-full"></span>
          Ad
        </div>

        {/* Notifications */}
        <button className="relative">
          <Bell className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
          <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full"></span>
        </button>

        {/* Profile */}
        <button className="w-8 h-8 bg-muted rounded-full flex items-center justify-center hover:bg-muted/80 transition-colors">
          <User className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>
    </header>
  );
}