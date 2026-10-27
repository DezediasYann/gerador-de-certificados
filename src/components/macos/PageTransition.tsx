"use client";
import { motion } from "framer-motion";
import { forwardRef } from "react";
import type { ReactNode } from "react";
import { pageTransitionProps, staggerContainer } from "@/lib/animations";

/** Wrapper que adiciona transição de entrada/saída em views. */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <motion.div
      {...pageTransitionProps}
      className="contents"
    >
      {children}
    </motion.div>
  );
}

/** Container com stagger — filhos (motion) aparecem em cascata. */
export function StaggerGroup({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Item para usar dentro de StaggerGroup. */
export function StaggerItem({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <motion.div
      variants={{
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
