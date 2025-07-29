import { Bell, User, Menu, X, TrendingUp, DollarSign, Clock, ChevronDown } from "lucide-react";
import { useState, useEffect, useContext, createContext } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Skeleton } from "@/components/ui/skeleton";
import { PrivyWalletConnect } from "@/components/PrivyWalletConnect";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// Create a notification context to share notification state across components
export const NotificationContext = createContext<{
  notifications: NewCoinNotification[];
  addNotification: (notification: NewCoinNotification) => void;
  markAllAsRead: () => void;
  unreadCount: number;
}>({
  notifications: [],
  addNotification: () => {},
  markAllAsRead: () => {},
  unreadCount: 0,
});

export const useNotifications = () => useContext(NotificationContext);

// Define notification types
export interface NewCoinNotification {
  id: string;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  coinAddress: string;
  tokenSymbol?: string;
  tokenImage?: string;
}

// Create the NotificationProvider component
export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const [notifications, setNotifications] = useState<NewCoinNotification[]>(() => {
    // Get from localStorage if available
    const saved = localStorage.getItem('coin-notifications');
    return saved ? JSON.parse(saved) : [];
  });

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read).length;

  // Save to localStorage whenever notifications change
  useEffect(() => {
    localStorage.setItem('coin-notifications', JSON.stringify(notifications));
  }, [notifications]);

  const addNotification = (notification: NewCoinNotification) => {
    // Check if notification already exists by coinAddress
    if (notifications.some(n => n.coinAddress === notification.coinAddress)) {
      return;
    }
    setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep only the 50 most recent
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markAllAsRead, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};



interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate();
  const { notifications, markAllAsRead, unreadCount } = useNotifications();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showAllNotifications, setShowAllNotifications] = useState(false);

  // Number of notifications to show initially
  const INITIAL_NOTIFICATION_COUNT = 10;



  // Handle notification click
  const handleNotificationClick = (notification: NewCoinNotification) => {
    navigate(`/token/${notification.coinAddress}`);
    setShowNotifications(false);
    
    // Mark this notification as read
    const updatedNotifications = notifications.map(n => 
      n.id === notification.id ? { ...n, read: true } : n
    );
    localStorage.setItem('coin-notifications', JSON.stringify(updatedNotifications));
  };
  
  // Reset view when dropdown closes
  useEffect(() => {
    if (!showNotifications) {
      setShowAllNotifications(false);
    }
  }, [showNotifications]);

  // Calculate notifications to display based on the current view state
  const displayedNotifications = showAllNotifications 
    ? notifications 
    : notifications.slice(0, INITIAL_NOTIFICATION_COUNT);

  // Check if we have more notifications than the initial count
  const hasMoreNotifications = notifications.length > INITIAL_NOTIFICATION_COUNT;

  return (
    <header className="h-14 bg-background border-b border-border flex items-center justify-between px-4 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-4 flex-1">
        {/* Mobile menu */}
        <button 
          className="lg:hidden p-2 rounded-md hover:bg-muted transition-colors"
          onClick={onMenuClick}
        >
          <Menu className="w-5 h-5 text-muted-foreground" />
        </button>


      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Notifications */}
        <DropdownMenu open={showNotifications} onOpenChange={setShowNotifications}>
          <DropdownMenuTrigger asChild>
            <button className="relative p-1.5 rounded-full hover:bg-muted transition-colors">
              <Bell className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex justify-between items-center">
              <span>Notifications {notifications.length > 0 && `(${notifications.length})`}</span>
              {unreadCount > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    markAllAsRead();
                  }}
                  className="text-xs h-7 px-2"
                >
                  Mark all as read
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {/* Notification Content Area */}
            {notifications.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted-foreground">
                No new notifications
              </div>
            ) : (
              <div className="flex flex-col">
                {/* Notification List - Limited or Full */}
                <div className="max-h-[300px] overflow-auto">
                  {displayedNotifications.map(notification => (
                    <DropdownMenuItem 
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`flex items-start p-3 cursor-pointer ${notification.read ? 'opacity-70' : 'bg-muted/40'}`}
                    >
                      <div className="flex-shrink-0 mr-3">
                        {notification.tokenImage ? (
                          <img 
                            src={notification.tokenImage} 
                            alt={notification.tokenSymbol || 'Token'} 
                            className="w-8 h-8 rounded-md"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-primary/20 rounded-md flex items-center justify-center">
                            <TrendingUp className="w-4 h-4 text-primary" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-sm">{notification.title}</div>
                        <div className="text-xs text-muted-foreground">{notification.message}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {new Date(notification.timestamp).toLocaleTimeString()} - {new Date(notification.timestamp).toLocaleDateString()}
                        </div>
                      </div>
                      {!notification.read && (
                        <div className="w-2 h-2 bg-primary rounded-full mt-1 ml-1"></div>
                      )}
                    </DropdownMenuItem>
                  ))}
                </div>
                
                {/* "See More" Button */}
                {hasMoreNotifications && !showAllNotifications && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAllNotifications(true);
                    }}
                    className="mt-2 mb-2 mx-auto text-xs flex items-center gap-1"
                  >
                    See all {notifications.length} notifications
                    <ChevronDown className="w-3 h-3" />
                  </Button>
                )}
                
                {/* "See Less" Button when showing all */}
                {showAllNotifications && notifications.length > INITIAL_NOTIFICATION_COUNT && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowAllNotifications(false);
                    }}
                    className="mt-2 mb-2 mx-auto text-xs"
                  >
                    Show less
                  </Button>
                )}
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Wallet Connect */}
        <div>
          <PrivyWalletConnect />
        </div>
      </div>
    </header>
  );
}