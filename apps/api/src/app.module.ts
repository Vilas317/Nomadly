import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { DestinationsModule } from "./modules/destinations/destinations.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [PrismaModule, DestinationsModule],
  controllers: [HealthController],
})
export class AppModule {}
