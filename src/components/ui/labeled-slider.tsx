"use client";
import { Slider } from "./slider";

interface LabeledSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  /** Sufixo mostrado após o valor (ex.: "px", "pt"). */
  suffix?: string;
  /** Texto explicativo abaixo do slider. */
  hint?: string;
  onValueChange: (v: number) => void;
}

/**
 * Slider rotulado com exibição do valor atual.
 * Componente reutilizável para controles de posição/tamanho baseados em sliders.
 */
export function LabeledSlider({
  label,
  value,
  min,
  max,
  step = 1,
  suffix,
  hint,
  onValueChange,
}: LabeledSliderProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        <span className="rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
          {value > 0 && min < 0 ? "+" : ""}{value}{suffix ?? ""}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onValueChange(v[0])}
      />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
