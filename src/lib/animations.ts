// Animações reutilizáveis (framer-motion) para o app.
// Centraliza variantes e transições para consistência visual.
import type { Variants, Transition } from "framer-motion";

/** Easing suave (estilo macOS) — usado em todas as transições. */
export const easeSmooth: Transition["ease"] = [0.4, 0.0, 0.2, 1];

/** Durações padrão (em segundos). */
export const DURATION = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
} as const;

/** Variante de transição de página/view: fade + slide vertical sutil. */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

/** Variante de fade simples. */
export const fade: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

/** Variante para containers com stagger (filhos aparecem em cascata). */
export const staggerContainer: Variants = {
  initial: { opacity: 0 },
  animate: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
      delayChildren: 0.05,
    },
  },
};

/** Variante para itens dentro de um stagger container. */
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: {
    opacity: 1,
    y: 0,
    transition: { duration: DURATION.normal, ease: easeSmooth },
  },
};

/** Variante de hover para cards (lift + scale sutil). */
export const cardHover = {
  rest: { y: 0, scale: 1 },
  hover: {
    y: -4,
    scale: 1.02,
    transition: { duration: DURATION.fast, ease: easeSmooth },
  },
};

/** Props padrão para transições de página. */
export const pageTransitionProps = {
  initial: "initial",
  animate: "animate",
  exit: "exit",
  variants: pageTransition,
  transition: { duration: DURATION.normal, ease: easeSmooth },
} as const;
