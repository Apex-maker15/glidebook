import type { Transition, Variants } from "framer-motion";

/**
 * Spring presets. Low stiffness + high damping = weighty, non-bouncy motion.
 */
export const spring = {
  /** Buttons, chips, hover/tap feedback. */
  snappy: { type: "spring", stiffness: 380, damping: 32, mass: 0.8 } satisfies Transition,
  /** Cards, panels, step transitions. */
  soft: { type: "spring", stiffness: 210, damping: 28, mass: 1 } satisfies Transition,
  /** Modals, large surfaces sliding in. */
  gentle: { type: "spring", stiffness: 150, damping: 24, mass: 1.1 } satisfies Transition,
  /** Shared-layout morphs (layoutId). */
  morph: { type: "spring", stiffness: 300, damping: 34, mass: 0.9 } satisfies Transition,
} as const;

export const pressable = {
  whileHover: { scale: 1.015, y: -1 },
  whileTap: { scale: 0.975, y: 0 },
  transition: spring.snappy,
} as const;

export const pressableSubtle = {
  whileHover: { y: -1 },
  whileTap: { scale: 0.985 },
  transition: spring.snappy,
} as const;

/** Slide-and-fade for wizard steps; `custom` is the direction (1 forward, -1 back). */
export const stepVariants: Variants = {
  enter: (direction: number) => ({
    x: direction * 56,
    opacity: 0,
    filter: "blur(6px)",
  }),
  center: {
    x: 0,
    opacity: 1,
    filter: "blur(0px)",
    transition: { ...spring.soft, opacity: { duration: 0.28 }, filter: { duration: 0.32 } },
  },
  exit: (direction: number) => ({
    x: direction * -56,
    opacity: 0,
    filter: "blur(6px)",
    transition: { ...spring.soft, opacity: { duration: 0.18 }, filter: { duration: 0.18 } },
  }),
};

export const fadeVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

export const riseVariants: Variants = {
  hidden: { opacity: 0, y: 14, scale: 0.985 },
  visible: { opacity: 1, y: 0, scale: 1, transition: spring.soft },
  exit: { opacity: 0, y: -8, scale: 0.985, transition: { duration: 0.18 } },
};

export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
};

export const modalBackdrop: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.22 } },
  exit: { opacity: 0, transition: { duration: 0.18 } },
};

export const modalPanel: Variants = {
  hidden: { opacity: 0, y: 28, scale: 0.96 },
  visible: { opacity: 1, y: 0, scale: 1, transition: spring.gentle },
  exit: { opacity: 0, y: 16, scale: 0.97, transition: { duration: 0.18 } },
};
