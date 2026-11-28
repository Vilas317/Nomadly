import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { AuthModule } from "../auth/auth.module";
import { AvatarStorageService } from "./avatar-storage.service";
import { ProfilesController } from "./profiles.controller";
import { ProfilesService } from "./profiles.service";

@Module({
  imports: [AuthModule, JwtModule.register({})],
  controllers: [ProfilesController],
  providers: [ProfilesService, AvatarStorageService],
})
export class ProfilesModule {}
