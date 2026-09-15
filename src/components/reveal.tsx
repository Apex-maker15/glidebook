"use client";

import { motion } from "framer-motion";
import { spring } from "@/components/motion";

export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ ...spring.soft, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
