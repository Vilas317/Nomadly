import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { ProfilesService } from "./profiles.service";

type AuthedRequest = Request & { user: { id: string; sessionId: string } };

@Controller("profiles")
@UseGuards(JwtAuthGuard)
export class ProfilesController {
  constructor(private readonly profiles: ProfilesService) {}

  @Get("me")
  async getMyProfile(@Req() request: AuthedRequest) {
    return { profile: await this.profiles.getMyProfile(request.user.id) };
  }

  @Patch("me")
  async updateMyProfile(
    @Req() request: AuthedRequest,
    @Body() body: UpdateProfileDto,
  ) {
    return { profile: await this.profiles.updateMyProfile(request.user.id, body) };
  }
}
