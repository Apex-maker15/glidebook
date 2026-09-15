import { PrismaClient, Role, BusinessCategory } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

const weekday = {
  windows: [{ start: "08:00", end: "18:00" }],
  breaks: [{ start: "12:00", end: "13:00" }],
};
const saturday = {
  windows: [{ start: "09:00", end: "15:00" }],
  breaks: [],
};

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const detailer = await prisma.user.upsert({
    where: { email: "demo@shinemobile.com" },
    update: {},
    create: {
      email: "demo@shinemobile.com",
      name: "Marcus Reyes",
      phone: "+1 555 010 2233",
      passwordHash,
      role: Role.PROVIDER,
      businessName: "Shine Mobile Detailing",
      slug: "shine-mobile",
      category: BusinessCategory.CAR_DETAILING,
      timezone: "America/Los_Angeles",
      slotIntervalMinutes: 30,
      bufferMinutes: 30,
      services: {
        create: [
          { name: "Express Wash & Vacuum", description: "Exterior hand wash, wheels, windows and a full interior vacuum.", durationMinutes: 60, priceCents: 6500, sortOrder: 0 },
          { name: "Full Interior Detail", description: "Deep clean of seats, carpets, panels and leather conditioning.", durationMinutes: 150, priceCents: 18900, sortOrder: 1 },
          { name: "Paint Correction & Ceramic", description: "Single-stage polish followed by a 2-year ceramic coating.", durationMinutes: 300, priceCents: 64900, sortOrder: 2 },
        ],
      },
      availability: {
        create: [
          { dayOfWeek: 1, slots: weekday },
          { dayOfWeek: 2, slots: weekday },
          { dayOfWeek: 3, slots: weekday },
          { dayOfWeek: 4, slots: weekday },
          { dayOfWeek: 5, slots: weekday },
          { dayOfWeek: 6, slots: saturday },
        ],
      },
    },
  });

  const groomer = await prisma.user.upsert({
    where: { email: "demo@pawsonwheels.com" },
    update: {},
    create: {
      email: "demo@pawsonwheels.com",
      name: "Priya Natarajan",
      phone: "+1 555 010 7788",
      passwordHash,
      role: Role.PROVIDER,
      businessName: "Paws on Wheels Grooming",
      slug: "paws-on-wheels",
      category: BusinessCategory.PET_GROOMING,
      timezone: "America/New_York",
      slotIntervalMinutes: 15,
      bufferMinutes: 15,
      services: {
        create: [
          { name: "Bath & Brush", description: "Warm bath, blow-dry, brush-out, nail trim and ear cleaning.", durationMinutes: 60, priceCents: 5500, sortOrder: 0 },
          { name: "Full Groom", description: "Everything in Bath & Brush plus a breed-standard haircut.", durationMinutes: 105, priceCents: 9500, sortOrder: 1 },
          { name: "De-shedding Treatment", description: "Specialised shampoo and undercoat removal for heavy shedders.", durationMinutes: 75, priceCents: 7500, sortOrder: 2 },
        ],
      },
      availability: {
        create: [
          { dayOfWeek: 1, slots: weekday },
          { dayOfWeek: 2, slots: weekday },
          { dayOfWeek: 3, slots: weekday },
          { dayOfWeek: 4, slots: weekday },
          { dayOfWeek: 5, slots: weekday },
        ],
      },
    },
  });

  console.log(`Seeded providers:\n  ${detailer.businessName} → /book/${detailer.slug}\n  ${groomer.businessName} → /book/${groomer.slug}\nLogin: demo@shinemobile.com / password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
