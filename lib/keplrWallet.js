import {
  ExtensionWallet,
  CosmosWallet,
  EthereumWallet,
  selectWalletByPlatform,
  WCMobileWebWallet,
  clientNotExistError,
} from "@interchain-kit/core";
import { keplrExtensionInfo } from "@interchain-kit/keplr-extension";
import { waitForKeplr } from "@/utils/waitForKeplr";

class KeplrCosmosWallet extends CosmosWallet {
  bindingEvent() {
    if (typeof window === "undefined") return;

    let timer;
    const emitAccountChanged = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        this.events.emit("accountChanged");
      }, 100);
    };

    window.addEventListener(keplrExtensionInfo.keystoreChange, emitAccountChanged);
  }
}

class KeplrExtensionWallet extends ExtensionWallet {
  async init() {
    const client = await waitForKeplr();
    if (!client) {
      throw clientNotExistError;
    }
    await super.init();
  }
}

const web = new KeplrExtensionWallet(keplrExtensionInfo);
web.setNetworkWallet("cosmos", new KeplrCosmosWallet(keplrExtensionInfo));
web.setNetworkWallet("eip155", new EthereumWallet(keplrExtensionInfo));

export const keplrWallet = selectWalletByPlatform(
  {
    mobileBrowser: new WCMobileWebWallet(keplrExtensionInfo),
    inAppBrowser: web,
    desktopBrowser: web,
  },
  keplrExtensionInfo
);
