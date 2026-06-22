"use client";

import { ChainProvider, InterchainWalletModal } from "@interchain-kit/react";
import { keplrWallet } from "@interchain-kit/keplr-extension";
import { keplrMobile } from "@interchain-kit/keplr-mobile";
import { chain, assetList } from "chain-registry/mainnet/cosmoshub";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

import { RPC, WALLET_CONNECT_ID, BASE_DENOM, GAS_PRICE } from "@/config";

import "@interchain-ui/react/styles";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      refetchOnMount: true,
      staleTime: 1000 * 3,
    },
  },
});

export default function Providers({ children }) {
  const signerOptions = {
    preferredSignType: () => "direct",
    signing: (chainName) => {
      if (!chainName) return;
      if (chainName === "cosmoshub") {
        return {
          cosmosSignerConfig: {
            gasPrice: `${GAS_PRICE}${BASE_DENOM}`,
            multiplier: 1.5,
          },
        };
      }
    },
  };

  const wallets = [keplrWallet];

  if (WALLET_CONNECT_ID && WALLET_CONNECT_ID !== "") {
    wallets.push(keplrMobile);
  }

  return (
    <ChainProvider
      chains={[chain]}
      assetLists={[assetList]}
      wallets={wallets}
      signerOptions={signerOptions}
      endpointOptions={{
        endpoints: {
          cosmoshub: {
            rpc: [RPC],
          },
        },
      }}
      walletModal={() => <InterchainWalletModal />}
    >
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      <Toaster position="top-center" toastOptions={{ className: "font-poppins" }} />
    </ChainProvider>
  );
}
