"use client";

import { useState } from "react";
import { speciesInitial } from "@/utils/species";
import { nftImageKey } from "@/utils/nftMetadata";

const SIZES = {
  sm: { img: "w-6 h-6", text: "text-xs" },
  md: { img: "w-9 h-9", text: "text-sm" },
  lg: { img: "w-12 h-12 sm:w-14 sm:h-14", text: "text-lg" },
  xl: { img: "w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem]", text: "text-xl" },
};

export default function RunnerAvatar({ nftContract, nftId, species, imageMap, size = "md" }) {
  const key = nftImageKey(nftContract, nftId);
  const src = key ? imageMap?.[key] : null;
  const [failed, setFailed] = useState(false);
  const dim = SIZES[size] ?? SIZES.md;

  if (src && !failed) {
    return (
      <img
        src={src}
        alt=""
        className={`${dim.img} rounded-lg object-cover border-2 border-white shadow-lg bg-gray-900 shrink-0`}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <span
      className={`${dim.text} font-bold leading-none select-none shrink-0 flex items-center justify-center ${dim.img} rounded-lg border-2 border-white bg-gray-800 text-gray-200 shadow-lg`}
      title={nftId ? `Token #${nftId}` : undefined}
    >
      {speciesInitial(species)}
    </span>
  );
}
