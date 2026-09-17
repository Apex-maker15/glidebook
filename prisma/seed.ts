import { PrismaClient, Role, BusinessCategory } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: [process.env.DATABASE_URL, process.env.POSTGRES_URL].find((u) => u && /^postgres(ql)?:\/\//.test(u)) }) });

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
      currency: "usd",
      locationMode: "MOBILE",
      slotIntervalMinutes: 30,
      bufferMinutes: 30,
      services: {
        create: [
          { name: "Express Wash & Vacuum", description: "Exterior hand wash, wheels, windows and a full interior vacuum.", durationMinutes: 60, priceCents: 6500, currency: "usd", sortOrder: 0 },
          { name: "Full Interior Detail", description: "Deep clean of seats, carpets, panels and leather conditioning.", durationMinutes: 150, priceCents: 18900, currency: "usd", sortOrder: 1 },
          { name: "Paint Correction & Ceramic", description: "Single-stage polish followed by a 2-year ceramic coating.", durationMinutes: 300, priceCents: 64900, currency: "usd", sortOrder: 2 },
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
      currency: "usd",
      locationMode: "MOBILE",
      slotIntervalMinutes: 15,
      bufferMinutes: 15,
      services: {
        create: [
          { name: "Bath & Brush", description: "Warm bath, blow-dry, brush-out, nail trim and ear cleaning.", durationMinutes: 60, priceCents: 5500, currency: "usd", sortOrder: 0 },
          { name: "Full Groom", description: "Everything in Bath & Brush plus a breed-standard haircut.", durationMinutes: 105, priceCents: 9500, currency: "usd", sortOrder: 1 },
          { name: "De-shedding Treatment", description: "Specialised shampoo and undercoat removal for heavy shedders.", durationMinutes: 75, priceCents: 7500, currency: "usd", sortOrder: 2 },
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

  const nailTech = await prisma.user.upsert({
    where: { email: "demo@polishedbyamara.com" },
    update: {},
    create: {
      email: "demo@polishedbyamara.com",
      name: "Amara Okafor",
      phone: "+44 7700 900123",
      passwordHash,
      role: Role.PROVIDER,
      businessName: "Polished by Amara",
      slug: "polished-by-amara",
      category: BusinessCategory.NAILS_BEAUTY,
      timezone: "Europe/London",
      currency: "gbp",
      locationMode: "STUDIO",
      studioAddress: "Home studio, 5 min from West Croydon station (exact address sent after booking)",
      depositPercent: 30,
      slotIntervalMinutes: 15,
      bufferMinutes: 15,
      minNoticeMinutes: 60 * 12,
      services: {
        create: [
          { name: "Gel manicure", description: "Cuticle care, shaping and a flawless gel polish finish.", durationMinutes: 60, priceCents: 3500, currency: "gbp", sortOrder: 0 },
          { name: "BIAB full set", description: "Builder gel overlay for strong, natural-looking nails.", durationMinutes: 90, priceCents: 4500, currency: "gbp", sortOrder: 1 },
          { name: "Acrylic full set with art", description: "Sculpted acrylics with hand-painted nail art of your choice.", durationMinutes: 150, priceCents: 6500, currency: "gbp", sortOrder: 2 },
          { name: "Infill", description: "Refresh your existing set. Gel or acrylic.", durationMinutes: 75, priceCents: 3000, currency: "gbp", sortOrder: 3 },
          { name: "Removal", description: "Gentle soak-off with a nourishing cuticle treatment.", durationMinutes: 30, priceCents: 1500, currency: "gbp", sortOrder: 4 },
        ],
      },
      availability: {
        create: [
          { dayOfWeek: 2, slots: { windows: [{ start: "10:00", end: "19:00" }], breaks: [{ start: "13:30", end: "14:00" }] } },
          { dayOfWeek: 3, slots: { windows: [{ start: "10:00", end: "19:00" }], breaks: [{ start: "13:30", end: "14:00" }] } },
          { dayOfWeek: 4, slots: { windows: [{ start: "10:00", end: "20:00" }], breaks: [{ start: "13:30", end: "14:00" }] } },
          { dayOfWeek: 5, slots: { windows: [{ start: "10:00", end: "19:00" }], breaks: [{ start: "13:30", end: "14:00" }] } },
          { dayOfWeek: 6, slots: { windows: [{ start: "09:00", end: "17:00" }], breaks: [] } },
        ],
      },
    },
  });

  console.log(`Seeded providers:
  ${nailTech.businessName} -> /book/${nailTech.slug}\n  ${detailer.businessName} → /book/${detailer.slug}\n  ${groomer.businessName} → /book/${groomer.slug}\nLogin: demo@shinemobile.com / password123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
