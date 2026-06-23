"use client";

import Link from "next/link";
import Image from "next/image";
import WalletButton from "@/components/WalletButton";
import VaultHeaderWidget from "@/components/VaultHeaderWidget";
import LastRaceBanner from "@/components/LastRaceBanner";
import { META } from "@/config";

export default function NavBar() {
  return (
    <header className="w-full border-b border-[#1f1c3b]/60 sticky top-0 z-50 bg-[#0c0c0c]">
      <nav className="w-full h-16 flex items-center justify-between px-4 sm:px-6 navbar-checkered">
        <Link
          href="/"
          aria-label="Cosmos Animal Racing League"
          className="flex items-center gap-3 text-white hover:opacity-90 transition-opacity"
        >
          <Image
            src={META.logo}
            alt="Cosmos Animal Racing League"
            width={44}
            height={44}
            className="shrink-0 object-contain"
            priority
          />
          <div className="leading-none w-fit max-w-[11rem] sm:max-w-[12.5rem]">
            <span
              className="block text-lg sm:text-xl font-black uppercase text-justify [text-align-last:justify]"
              aria-hidden
            >
              COSMOS
            </span>
            <span className="block mt-0.5 text-[8px] sm:text-[9px] font-semibold uppercase tracking-[0.12em] text-white/85 whitespace-nowrap">
              Animal Racing League
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <VaultHeaderWidget />
          <WalletButton />
        </div>
      </nav>
      <LastRaceBanner />
    </header>
  );
}
