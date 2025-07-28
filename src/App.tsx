import "@coinbase/onchainkit/styles.css";
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { base } from "viem/chains";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider } from "wagmi";
import { privyConfig, wagmiConfig } from "./wagmi";
import Index from "./pages/Index.tsx";
import TokenDetails from "./pages/TokenDetails.tsx";
import Creators from "./pages/Creators.tsx";
import NotFound from "./pages/NotFound.tsx";
import Layout from "./components/Layout";
import WhaleTrackerPage from "./pages/WhaleTrackerPage";
import WatchlistPage from "./pages/WatchlistPage";
// import ComparisonPage from "./pages/ComparisonPage";
import { NotificationProvider } from "./components/Header";
// import { ComparisonProvider } from "./context/ComparisonContext";
import CopyTradeListener from "./components/CopyTradeListener";

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
            <NotificationProvider>
              {/* <ComparisonProvider> */}
                <TooltipProvider>
                  <Toaster />
                  <Sonner />
                  <BrowserRouter>
                    <Routes>
                      <Route element={<Layout />}>
                        <Route path="/" element={<Index />} />
                        <Route path="/token/:address/*" element={<TokenDetails />} />
                        <Route path="/creators" element={<Creators />} />
                        <Route path="/whale-tracker" element={<WhaleTrackerPage />} />
                        <Route path="/watchlist" element={<WatchlistPage />} />
                        {/* <Route path="/comparison" element={<ComparisonPage />} /> */}
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Route>
                    </Routes>
                  </BrowserRouter>
                  {/* Add CopyTradeListener here to enable monitoring for all routes */}
                  <CopyTradeListener />
                </TooltipProvider>
              {/* </ComparisonProvider> */}
            </NotificationProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </ThemeProvider>
    </OnchainKitProvider>
  </PrivyProvider>
);

export default App;
