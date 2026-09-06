"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const EarthGlobe = dynamic(() => import("./EarthGlobe"), {
  ssr: false,
  loading: () => <StaticEarth />,
});

function StaticEarth() {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="h-[46vmin] w-[46vmin] rounded-full bg-[radial-gradient(circle_at_32%_30%,#1a2740_0%,#0a0f1c_55%,#030509_100%)] shadow-[0_0_120px_rgba(63,111,255,0.25),inset_-20px_-20px_60px_rgba(0,0,0,0.8)]">
        <div className="flex h-full w-full items-center justify-center rounded-full border border-white/5">
          <span className="text-xs tracking-[0.3em] text-mist/70">VANDILSON NETO</span>
        </div>
      </div>
    </div>
  );
}

export default function EarthStage({
  className,
  spinSpeed = 0.055,
}: {
  className?: string;
  spinSpeed?: number;
}) {
  const [mode, setMode] = useState<"loading" | "3d" | "static">("loading");

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const lowPower =
      typeof navigator !== "undefined" &&
      (navigator.hardwareConcurrency ?? 8) <= 4;

    if (reduced) {
      setMode("static");
      return;
    }

    // Em ecrãs pequenos corremos em qualidade reduzida
    setMode("3d");
    if (lowPower) {
      // sinaliza via atributo global que o EarthGlobe lê para ajustar DPR
      document.documentElement.dataset.lowPower = "1";
    }
  }, []);

  return (
    <div className={className} aria-hidden="true">
      {mode === "3d" ? (
        <EarthGlobe
          className="h-full w-full"
          spinSpeed={spinSpeed}
          quality={
            typeof document !== "undefined" &&
            document.documentElement.dataset.lowPower === "1"
              ? "low"
              : "high"
          }
        />
      ) : (
        <StaticEarth />
      )}
    </div>
  );
}
