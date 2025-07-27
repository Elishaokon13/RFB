import "@coinbase/onchainkit/styles.css";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { base } from "viem/chains";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { PrivyProvider } from '@privy-io/react-auth';
import { WagmiProvider } from 'wagmi';
import { privyConfig, wagmiConfig } from './wagmi';
import Index from "./pages/Index";
import TokenDetails from "./pages/TokenDetails";
import Creators from "./pages/Creators";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import WhaleTrackerPage from "./pages/WhaleTrackerPage";
import TbaCoins from "./pages/TbaCoins";

const queryClient = new QueryClient();

const App = () => (
  <PrivyProvider
    appId={import.meta.env.VITE_PRIVY_APP_ID || "clz2zz2z20000z2z2z2z2z2z2"}
    config={privyConfig}
  >
    <OnchainKitProvider 
      chain={base}
      apiKey={import.meta.env.VITE_COINBASE_API_KEY}
    >
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <BrowserRouter>
                <Routes>
                  <Route element={<Layout />}>
                    <Route path="/" element={<Index />} />
                    <Route path="/token/:address" element={<TokenDetails />} />
                    <Route path="/creators" element={<Creators />} />
                    <Route path="/whale-tracker" element={<WhaleTrackerPage />} />
                    {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Routes>
              </BrowserRouter>
            </TooltipProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </ThemeProvider>
    </OnchainKitProvider>
  </PrivyProvider>
);

export default App;
