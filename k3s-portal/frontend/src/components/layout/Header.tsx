import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bell, RefreshCw, LogOut, User, Settings, Wifi, WifiOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { websocketService } from '@/services/websocket';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  title?: string;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function Header({ title, onRefresh, isRefreshing = false }: HeaderProps) {
  const { user, logout } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const unsubscribe = websocketService.on<{ connected: boolean }>(
      'connection:status',
      ({ connected }: { connected: boolean }) => {
        setIsConnected(connected);
      }
    );
    setIsConnected(websocketService.isConnected());
    return unsubscribe;
  }, []);

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <motion.header
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-16 bg-gradient-to-r from-card/80 to-card/60 border-b border-border/50 backdrop-blur-xl flex items-center justify-between px-6 sticky top-0 z-30"
    >
      {/* Left side - Title */}
      <div>
        {title && (
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xl font-bold text-foreground"
          >
            {title}
          </motion.h1>
        )}
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-4">
        {/* Connection Status */}
        <Badge
          variant={isConnected ? 'success' : 'error'}
          className="gap-1.5 px-3 py-1 shadow-sm"
        >
          {isConnected ? (
            <Wifi className="w-3.5 h-3.5" />
          ) : (
            <WifiOff className="w-3.5 h-3.5" />
          )}
          {isConnected ? 'Connected' : 'Disconnected'}
        </Badge>

        {/* Refresh Button */}
        {onRefresh && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-xl"
          >
            <RefreshCw
              className={cn('w-4 h-4', isRefreshing && 'animate-spin')}
            />
          </Button>
        )}

        {/* Notifications */}
        <Button
          variant="ghost"
          size="icon"
          className="relative text-muted-foreground hover:text-foreground hover:bg-accent/50 rounded-xl"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        </Button>

        {/* Profile Dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="flex items-center gap-3 px-3 py-2 hover:bg-accent/50 rounded-xl h-auto"
            >
              <Avatar className="w-9 h-9 shadow-md">
                <AvatarFallback className="bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 text-white text-sm font-semibold">
                  {user?.fullName?.charAt(0) || 'A'}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block text-left">
                <div className="text-sm font-semibold text-foreground">
                  {user?.fullName}
                </div>
                <div className="text-xs text-muted-foreground capitalize">
                  {user?.role}
                </div>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl border-border/50 bg-card/95 backdrop-blur-xl">
            <DropdownMenuLabel className="py-3">
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">{user?.fullName}</span>
                <span className="text-xs text-muted-foreground">
                  {user?.email}
                </span>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem
              onClick={() => (window.location.href = '/settings')}
              className="cursor-pointer py-2.5 rounded-lg mx-1 focus:bg-accent/50"
            >
              <Settings className="w-4 h-4 mr-2" />
              Settings
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-pointer py-2.5 rounded-lg mx-1 focus:bg-accent/50"
            >
              <User className="w-4 h-4 mr-2" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-border/50" />
            <DropdownMenuItem
              onClick={handleLogout}
              className="cursor-pointer py-2.5 rounded-lg mx-1 text-red-400 focus:text-red-400 focus:bg-red-500/10"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.header>
  );
}

export default Header;
