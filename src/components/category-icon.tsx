import { Car, Info, PaintBrush, PawPrint, Scissors } from "@/components/icons";
import type { BusinessCategory } from "@prisma/client";

const icons: Record<BusinessCategory, typeof Info> = {
  NAILS_BEAUTY: PaintBrush,
  HAIR_BARBER: Scissors,
  CAR_DETAILING: Car,
  PET_GROOMING: PawPrint,
  OTHER: Info,
};

export function CategoryIcon({ category, className }: { category: BusinessCategory; className?: string }) {
  const Icon = icons[category];
  return <Icon className={className} />;
}
