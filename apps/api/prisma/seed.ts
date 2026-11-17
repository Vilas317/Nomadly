import { PrismaClient, ContentStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const destinations = [
    { name: "Manali", slug: "manali", description: "A mountain town in Himachal Pradesh known for Himalayan scenery, outdoor activities and nearby valleys.", city: "Manali", state: "Himachal Pradesh", country: "India", category: "Mountains", featured: true, status: ContentStatus.PUBLISHED },
    { name: "Hampi", slug: "hampi", description: "A historic landscape of temple complexes, ancient ruins and distinctive boulder formations.", city: "Hampi", state: "Karnataka", country: "India", category: "Heritage", featured: true, status: ContentStatus.PUBLISHED },
    { name: "Goa", slug: "goa", description: "A coastal destination known for beaches, regional cuisine, heritage and lively local communities.", state: "Goa", country: "India", category: "Coastal", featured: true, status: ContentStatus.PUBLISHED },
    { name: "Rishikesh", slug: "rishikesh", description: "A Himalayan foothill destination known for the Ganges, yoga, rafting and outdoor experiences.", city: "Rishikesh", state: "Uttarakhand", country: "India", category: "Adventure", featured: true, status: ContentStatus.PUBLISHED },
    { name: "Jaipur", slug: "jaipur", description: "The Pink City offers historic architecture, craft traditions, markets and Rajasthani cuisine.", city: "Jaipur", state: "Rajasthan", country: "India", category: "Culture", featured: true, status: ContentStatus.PUBLISHED },
    { name: "Shillong", slug: "shillong", description: "A hill city in Meghalaya surrounded by green landscapes, waterfalls and distinctive music culture.", city: "Shillong", state: "Meghalaya", country: "India", category: "Nature", featured: false, status: ContentStatus.PUBLISHED }
  ];

  for (const destination of destinations) {
    await prisma.destination.upsert({
      where: { slug: destination.slug },
      update: destination,
      create: destination,
    });
  }

  console.log(`Seeded ${destinations.length} destinations.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
