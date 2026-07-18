import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Menu, Search, Bell, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

interface NavbarProps {
  onMenuClick: () => void;
}

interface NotificationItem {
  id: string;
  title: string;
  description: string;
  priority: "High" | "Medium" | "Low";
}

export function Navbar({ onMenuClick }: NavbarProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const { user, role, signOut } = useAuth();

  const notifications: NotificationItem[] = useMemo(() => [], []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/surat-jalan?q=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
      setShowSearch(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b bg-card px-4">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onMenuClick}>
        <Menu className="h-5 w-5" />
      </Button>

      <form onSubmit={handleSearch} className="hidden sm:flex flex-1 max-w-md">
        <div className="relative w-full">
          <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cari nomor polisi, vendor, SPK, batch..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
      </form>

      <div className="flex-1 sm:hidden" />

      <Button
        variant="ghost"
        size="icon"
        className="sm:hidden"
        onClick={() => setShowSearch(!showSearch)}
      >
        {showSearch ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
      </Button>

      {showSearch && (
        <form onSubmit={handleSearch} className="absolute left-0 right-0 top-16 p-4 bg-card border-b sm:hidden">
          <div className="relative w-full">
            <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cari..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
              autoFocus
            />
          </div>
        </form>
      )}

      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {notifications.length > 0 && (
              <span className="absolute right-1 top-1 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-destructive" />
              </span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between border-b p-3">
            <h3 className="text-sm font-semibold">Notifikasi</h3>
            {notifications.length > 0 && (
              <Badge variant="secondary" className="text-xs">{notifications.length} baru</Badge>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Tidak ada notifikasi
              </div>
            ) : (
              notifications.map((n) => (
                <div key={n.id} className="border-b p-3 last:border-0 hover:bg-muted/50 cursor-pointer">
                  <div className="flex items-start gap-2">
                    <span
                      className={cn(
                        "mt-1 h-2 w-2 shrink-0 rounded-full",
                        n.priority === "High" && "bg-red-500",
                        n.priority === "Medium" && "bg-yellow-500",
                        n.priority === "Low" && "bg-green-500"
                      )}
                    />
                    <div>
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground">{n.description}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
      <div className="hidden text-right text-xs sm:block">
        <div className="font-medium">{user?.email}</div>
        <div className="text-muted-foreground">{role}</div>
      </div>
      <Button variant="ghost" size="icon" onClick={signOut} title="Logout">
        <LogOut className="h-5 w-5" />
      </Button>
    </header>
  );
}
