import { http, cookieStorage, createConfig, createStorage } from "wagmi";
import { base } from "wagmi/chains";
import { coinbaseWallet, metaMask, walletConnect } from "wagmi/connectors";
import { PrivyClientConfig } from '@privy-io/react-auth';

// Privy configuration
export const privyConfig: PrivyClientConfig = {
  loginMethods: ['wallet', 'email', 'sms'],
  appearance: {
    theme: 'light',
    accentColor: '#676FFF',
    logo: 'https://zoracle.xyz/zoracle.svg',
  },
  embeddedWallets: {
    createOnLogin: 'users-without-wallets',
    requireUserPasswordOnCreate: true,
  },
  defaultChain: base,
  supportedChains: [base],
};


export const wagmiConfig = createConfig({
  chains: [base],
  connectors: [
    metaMask(),
    walletConnect({
      projectId: "",
    }),
    coinbaseWallet({
      appName: "Zoracle",
      preference: "all",
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
