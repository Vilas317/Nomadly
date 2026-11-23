import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { Request } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { OnboardingProgressDto } from "./dto/onboarding-progress.dto";
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
    return {
      profile: await this.profiles.updateMyProfile(request.user.id, body),
    };
  }

  @Get("me/onboarding")
  async getMyOnboarding(@Req() request: AuthedRequest) {
    return {
      onboarding: await this.profiles.getMyOnboarding(request.user.id),
    };
  }

  @Patch("me/onboarding")
  async saveOnboardingProgress(
    @Req() request: AuthedRequest,
    @Body() body: OnboardingProgressDto,
  ) {
    return {
      onboarding: await this.profiles.saveOnboardingProgress(
        request.user.id,
        body,
      ),
    };
  }

  @Post("me/onboarding/skip")
  async skipOnboarding(@Req() request: AuthedRequest) {
    return {
      onboarding: await this.profiles.skipOnboarding(request.user.id),
    };
  }

  @Post("me/onboarding/complete")
  async completeOnboarding(@Req() request: AuthedRequest) {
    return {
      onboarding: await this.profiles.completeOnboarding(request.user.id),
    };
  }
}
