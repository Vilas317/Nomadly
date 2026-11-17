import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";

@Injectable()
export class DestinationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(search?: string) {
    const destinations = await this.prisma.destination.findMany({
      where: {
        status: "PUBLISHED",
        ...(search ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
            { state: { contains: search, mode: "insensitive" } },
          ],
        } : {}),
      },
      orderBy: [{ featured: "desc" }, { name: "asc" }],
      take: 30,
    });
    return { data: destinations, count: destinations.length };
  }

  async findOne(slug: string) {
    const destination = await this.prisma.destination.findFirst({
      where: { slug, status: "PUBLISHED" },
    });
    if (!destination) throw new NotFoundException("Destination not found");
    return destination;
  }
}
