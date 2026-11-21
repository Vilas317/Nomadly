import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { AuthRateLimitGuard } from "./guards/auth-rate-limit.guard";
import { RedisRateLimitService } from "./services/redis-rate-limit.service";
import { AuthEmailService } from "./services/email.service";

@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, AuthRateLimitGuard, RedisRateLimitService, AuthEmailService],
  exports: [JwtAuthGuard],
})
export class AuthModule {}
