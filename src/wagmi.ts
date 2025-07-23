import { http, cookieStorage, createConfig, createStorage } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet, metaMask, walletConnect } from "wagmi/connectors";

export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    metaMask(),
    walletConnect({
      projectId: "",
    }),
    coinbaseWallet({
      appName: "Base Screener",
      preference: "eoaOnly",
    }),
  ],
  storage: createStorage({
    storage: cookieStorage,
  }),
  ssr: true,
  transports: {
    [base.id]: http(),
  },
});
