import { Car, PawPrint, Scissors, Sparkles, WandSparkles } from "lucide-react";
import type { BusinessCategory } from "@prisma/client";

const icons: Record<BusinessCategory, typeof Sparkles> = {
  NAILS_BEAUTY: WandSparkles,
  HAIR_BARBER: Scissors,
  CAR_DETAILING: Car,
  PET_GROOMING: PawPrint,
  OTHER: Sparkles,
};

export function CategoryIcon({ category, className }: { category: BusinessCategory; className?: string }) {
  const Icon = icons[category];
  return <Icon className={className} />;
}
