import { Module } from "@nestjs/common";
import { HealthController } from "./health/health.controller";
import { AuthModule } from "./modules/auth/auth.module";
import { DestinationsModule } from "./modules/destinations/destinations.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [PrismaModule, AuthModule, DestinationsModule],
  controllers: [HealthController],
})
export class AppModule {}
