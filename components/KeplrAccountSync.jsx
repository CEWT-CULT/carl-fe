"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useInterchainWalletContext } from "@interchain-kit/react";
import { WalletState } from "@interchain-kit/core";
import { CHAIN_NAME, CHAIN_ID } from "@/config";

const KEYSTORE_EVENT = "keplr_keystorechange";
const KEPLR_WALLET = "keplr-extension";

async function refreshKeplrAccount(walletManager) {
  const walletName = walletManager.currentWalletName;
  if (walletName !== KEPLR_WALLET) return;

  const state = walletManager.getChainWalletState(walletName, CHAIN_NAME);
  if (state?.walletState !== WalletState.Connected) return;

  const chainWallet = walletManager
    .getWalletByName(walletName)
    ?.getChainWalletStore(CHAIN_NAME);
  if (!chainWallet) return;

  try {
    await chainWallet.refreshAccount();
    return;
  } catch {
    // New account may not have Cosmos Hub enabled yet.
  }

  if (typeof window !== "undefined" && window.keplr) {
    try {
      await window.keplr.enable(CHAIN_ID);
      await chainWallet.refreshAccount();
    } catch (error) {
      console.warn("Keplr account switch refresh failed:", error);
    }
  }
}

export default function KeplrAccountSync() {
  const walletManager = useInterchainWalletContext();
  const queryClient = useQueryClient();
  const timerRef = useRef(null);
  const lastAddressRef = useRef(null);

  useEffect(() => {
    const onKeystoreChange = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(async () => {
        const previous =
          walletManager.getChainWalletState(KEPLR_WALLET, CHAIN_NAME)?.account
            ?.address ?? lastAddressRef.current;

        await refreshKeplrAccount(walletManager);

        const next =
          walletManager.getChainWalletState(KEPLR_WALLET, CHAIN_NAME)?.account
            ?.address ?? null;
        lastAddressRef.current = next;

        if (next && next !== previous) {
          queryClient.invalidateQueries();
        }
      }, 150);
    };

    window.addEventListener(KEYSTORE_EVENT, onKeystoreChange);
    return () => {
      window.removeEventListener(KEYSTORE_EVENT, onKeystoreChange);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [walletManager, queryClient]);

  return null;
}
