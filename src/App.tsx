import '@coinbase/onchainkit/styles.css';
import { OnchainKitProvider } from "@coinbase/onchainkit";
import { base } from "viem/chains";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import TokenDetails from "./pages/TokenDetails";
import Creators from "./pages/Creators";
import NotFound from "./pages/NotFound";
import Layout from "./components/Layout";
import { WagmiProvider } from "wagmi";
import { wagmiConfig } from "./wagmi";
import WhaleTrackerPage from "./pages/WhaleTrackerPage";

const queryClient = new QueryClient();

const App = () => (
  <OnchainKitProvider chain={base}>
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
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
);

export default App;
