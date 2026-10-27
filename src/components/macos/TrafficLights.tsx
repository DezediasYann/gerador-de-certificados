"use client";
import { useState } from "react";

/** Traffic lights do macOS — botões fechar/minimizar/maximizar (decorativos no webview). */
export function TrafficLights() {
  const [hover, setHover] = useState(false);
  return (
    <div
      className="no-drag flex items-center gap-2"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      aria-hidden
    >
      <Light color="#ff5f57" symbol="✕" hover={hover} />
      <Light color="#febc2e" symbol="−" hover={hover} />
      <Light color="#28c840" symbol="+" hover={hover} />
    </div>
  );
}

function Light({
  color,
  symbol,
  hover,
}: {
  color: string;
  symbol: string;
  hover: boolean;
}) {
  return (
    <span
      className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] font-bold text-black/55"
      style={{ backgroundColor: color }}
    >
      {hover ? symbol : ""}
    </span>
  );
}
