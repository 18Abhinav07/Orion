import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { WalletProvider } from './context/WalletContext.tsx';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { mainnet, sepolia } from 'wagmi/chains';

const queryClient = new QueryClient();

const config = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
})

createRoot(document.getElementById("root")!).render(
  <WagmiProvider config={config}>
    <QueryClientProvider client={queryClient}>
      <WalletProvider>
        <App />
      </WalletProvider>
    </QueryClientProvider>
  </WagmiProvider>
);
