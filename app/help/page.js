export default function HelpPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2 md:py-6 bg-gray-900 rounded-lg">
      <h1 className="text-3xl font-bold mb-6 text-gray-100">Help</h1>

      <div className="bg-gray-800 rounded-lg p-6 shadow-lg mb-6">
        <h2 className="text-xl font-semibold text-gray-100 mb-2">C.A.R.L</h2>
        <p className="text-gray-400 mb-4">
          Cosmos Animal Racing League — a vault-based NFT racing experience by Fyveonit.
          Deposit funds to your personal in-game vault before entering races or placing side bets.
          Your vault balance is isolated from your main wallet for security.
        </p>
        <p className="text-gray-500 text-sm">by Fyveonit</p>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 shadow-lg mb-6">
        <h2 className="text-xl font-semibold text-gray-100 mb-2">Keplr shows &quot;Not Installed&quot;</h2>
        <p className="text-gray-400 mb-3">
          The site only sees the <strong className="text-gray-200">Keplr browser extension</strong> in the
          same browser tab. Having the Keplr mobile app or desktop app open does not count — you need the
          extension in Chrome, Firefox, or Brave.
        </p>
        <ul className="list-disc list-inside text-gray-400 space-y-2 text-sm">
          <li>Open C.A.R.L in Chrome or Firefox (not an in-app browser, Discord, or IDE preview).</li>
          <li>Confirm the Keplr extension is enabled for this site, then hard-refresh the page (Ctrl+Shift+R).</li>
          <li>Unlock Keplr in the extension popup, then click Connect Wallet again.</li>
          <li>On mobile, choose <strong className="text-gray-200">Keplr Mobile</strong> in the wallet list to connect via WalletConnect.</li>
        </ul>
      </div>

      <div className="bg-gray-800 rounded-lg p-6 shadow-lg mb-6">
        <h2 className="text-xl font-semibold text-gray-100 mb-2">Switched Keplr accounts</h2>
        <p className="text-gray-400 mb-3 text-sm">
          After changing accounts in the Keplr extension, the site should update automatically within a
          second. If vault or race data looks wrong, hard-refresh once. Make sure the new account has
          Cosmos Hub enabled in Keplr.
        </p>
      </div>
    </div>
  );
}
