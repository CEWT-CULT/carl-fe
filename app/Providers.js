"use client";

import { useMemo } from "react";
import { ChainProvider, InterchainWalletModal } from "@interchain-kit/react";
import { keplrWallet } from "@interchain-kit/keplr-extension";
import { KeplrMobile, keplrMobile } from "@interchain-kit/keplr-mobile";
import { chain, assetList } from "chain-registry/mainnet/cosmoshub";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";
import { Toaster } from "react-hot-toast";

import { RPC, WALLET_CONNECT_ID, BASE_DENOM, GAS_PRICE, META } from "@/config";

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
    // Software wallets use protobuf signing; Ledger via Keplr is switched to amino in useChainClient.
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

  const wallets = useMemo(() => {
    const list = [keplrWallet];
    if (WALLET_CONNECT_ID) {
      const appUrl =
        typeof window !== "undefined" ? window.location.origin : META.url;
      list.push(
        new KeplrMobile(keplrMobile.info, {
          projectId: WALLET_CONNECT_ID,
          metadata: {
            name: META.title,
            description: META.description,
            url: appUrl,
            icons: [`${appUrl}${META.logo}`],
          },
        })
      );
    }
    return list;
  }, []);

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
