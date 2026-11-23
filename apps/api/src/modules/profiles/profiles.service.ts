import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  OnboardingStatus,
  Prisma,
  ProfileVisibility,
} from "@prisma/client";
import { randomBytes } from "node:crypto";
import { PrismaService } from "../../prisma/prisma.service";
import { UpdateProfileDto } from "./dto/update-profile.dto";
import { OnboardingProgressDto } from "./dto/onboarding-progress.dto";

const profileSelect = {
  id: true,
  userId: true,
  username: true,
  displayName: true,
  bio: true,
  avatarUrl: true,
  homeCity: true,
  homeState: true,
  homeCountry: true,
  visibility: true,
  travelStyle: true,
  budgetMin: true,
  budgetMax: true,
  languages: true,
  interests: true,
  onboardingStatus: true,
  onboardingStep: true,
  onboardingCompletedAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.ProfileSelect;

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMyProfile(userId: string) {
    return this.ensureProfile(userId);
  }

  async updateMyProfile(userId: string, input: UpdateProfileDto) {
    // Ensure older or inconsistent accounts receive a profile before updates.
    const existing = await this.ensureProfile(userId);

    const data: Prisma.ProfileUpdateInput = {};

    if (input.username !== undefined) {
      data.username = input.username.trim().toLowerCase();
    }

    if (input.displayName !== undefined) {
      const displayName = input.displayName.trim();

      if (!displayName) {
        throw new BadRequestException("Display name cannot be empty");
      }

      data.displayName = displayName;
    }

    if (input.bio !== undefined) {
      data.bio = input.bio === null ? null : input.bio.trim() || null;
    }

    if (input.homeCity !== undefined) {
      data.homeCity =
        input.homeCity === null ? null : input.homeCity.trim() || null;
    }

    if (input.homeState !== undefined) {
      data.homeState =
        input.homeState === null ? null : input.homeState.trim() || null;
    }

    if (input.homeCountry !== undefined) {
      data.homeCountry =
        input.homeCountry === null ? null : input.homeCountry.trim() || null;
    }

    if (input.travelStyle !== undefined) {
      data.travelStyle =
        input.travelStyle === null ? null : input.travelStyle.trim() || null;
    }

    if (input.budgetMin !== undefined) {
      data.budgetMin = input.budgetMin;
    }

    if (input.budgetMax !== undefined) {
      data.budgetMax = input.budgetMax;
    }

    const nextBudgetMin =
      input.budgetMin === undefined ? existing.budgetMin : input.budgetMin;

    const nextBudgetMax =
      input.budgetMax === undefined ? existing.budgetMax : input.budgetMax;

    if (
      nextBudgetMin !== null &&
      nextBudgetMin !== undefined &&
      nextBudgetMax !== null &&
      nextBudgetMax !== undefined &&
      nextBudgetMin > nextBudgetMax
    ) {
      throw new BadRequestException(
        "Minimum budget cannot exceed maximum budget",
      );
    }

    if (input.languages !== undefined) {
      data.languages = this.normalizeList(input.languages);
    }

    if (input.interests !== undefined) {
      data.interests = this.normalizeList(input.interests);
    }

    if (input.visibility !== undefined) {
      data.visibility = input.visibility as ProfileVisibility;
    }

    if (Object.keys(data).length === 0) {
      return existing;
    }

    try {
      return await this.prisma.profile.update({
        where: { userId },
        data,
        select: profileSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException("That username is already taken");
      }

      throw error;
    }
  }

  async getMyOnboarding(userId: string) {
    const profile = await this.ensureProfile(userId);

    return {
      status: profile.onboardingStatus,
      currentStep: profile.onboardingStep,
      completedAt: profile.onboardingCompletedAt,
      answers: {
        travelStyle: profile.travelStyle,
        interests: profile.interests,
        budgetMin: profile.budgetMin,
        budgetMax: profile.budgetMax,
        languages: profile.languages,
        homeCity: profile.homeCity,
        homeState: profile.homeState,
        homeCountry: profile.homeCountry,
      },
    };
  }

  async saveOnboardingProgress(
    userId: string,
    input: OnboardingProgressDto,
  ) {
    const existing = await this.ensureProfile(userId);

    const data: Prisma.ProfileUpdateInput = {};

    // A completed onboarding always remains on the final step.
    if (
      input.step !== undefined &&
      existing.onboardingStatus !== OnboardingStatus.COMPLETED
    ) {
      data.onboardingStep = input.step;
    }

    if (input.travelStyle !== undefined) {
      data.travelStyle =
        input.travelStyle === null ? null : input.travelStyle.trim() || null;
    }

    if (input.interests !== undefined) {
      data.interests = this.normalizeList(input.interests);
    }

    if (input.languages !== undefined) {
      data.languages = this.normalizeList(input.languages);
    }

    if (input.budgetMin !== undefined) {
      data.budgetMin = input.budgetMin;
    }

    if (input.budgetMax !== undefined) {
      data.budgetMax = input.budgetMax;
    }

    if (input.homeCity !== undefined) {
      data.homeCity =
        input.homeCity === null ? null : input.homeCity.trim() || null;
    }

    if (input.homeState !== undefined) {
      data.homeState =
        input.homeState === null ? null : input.homeState.trim() || null;
    }

    if (input.homeCountry !== undefined) {
      data.homeCountry =
        input.homeCountry === null ? null : input.homeCountry.trim() || null;
    }

    const nextBudgetMin =
      input.budgetMin === undefined ? existing.budgetMin : input.budgetMin;

    const nextBudgetMax =
      input.budgetMax === undefined ? existing.budgetMax : input.budgetMax;

    if (
      nextBudgetMin !== null &&
      nextBudgetMin !== undefined &&
      nextBudgetMax !== null &&
      nextBudgetMax !== undefined &&
      nextBudgetMin > nextBudgetMax
    ) {
      throw new BadRequestException(
        "Minimum budget cannot exceed maximum budget",
      );
    }

    if (Object.keys(data).length === 0) {
      return this.getMyOnboarding(userId);
    }

    if (existing.onboardingStatus !== OnboardingStatus.COMPLETED) {
      data.onboardingStatus = OnboardingStatus.IN_PROGRESS;
    }

    await this.prisma.profile.update({
      where: { userId },
      data,
    });

    return this.getMyOnboarding(userId);
  }

  async skipOnboarding(userId: string) {
    const existing = await this.ensureProfile(userId);

    if (existing.onboardingStatus === OnboardingStatus.COMPLETED) {
      throw new ConflictException("Completed onboarding cannot be skipped");
    }

    await this.prisma.profile.update({
      where: { userId },
      data: {
        onboardingStatus: OnboardingStatus.SKIPPED,
        onboardingCompletedAt: null,
      },
    });

    return this.getMyOnboarding(userId);
  }

  async completeOnboarding(userId: string) {
    const existing = await this.ensureProfile(userId);

    // Keep completion idempotent: repeated calls must not change the original
    // completion timestamp or move an already completed profile backwards.
    if (existing.onboardingStatus !== OnboardingStatus.COMPLETED) {
      await this.prisma.profile.update({
        where: { userId },
        data: {
          onboardingStatus: OnboardingStatus.COMPLETED,
          onboardingStep: 6,
          onboardingCompletedAt: new Date(),
        },
      });
    } else if (existing.onboardingStep !== 6) {
      // Repair any legacy/inconsistent completed profile defensively.
      await this.prisma.profile.update({
        where: { userId },
        data: { onboardingStep: 6 },
      });
    }

    return this.getMyOnboarding(userId);
  }

  /**
   * Returns the user's profile, creating one only when it is missing.
   * The unique userId upsert makes concurrent first requests safe: only one
   * profile is created, and subsequent requests return that same profile.
   */
  private async ensureProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        profile: { select: { id: true } },
      },
    });

    if (!user) {
      throw new NotFoundException("User not found");
    }

    if (user.profile) {
      return this.prisma.profile.findUniqueOrThrow({
        where: { userId },
        select: profileSelect,
      });
    }

    const emailPrefix = user.email.split("@")[0] ?? "";

    const base =
      emailPrefix
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 10) || "traveller";

    // 12 hex characters keep the generated username within the 24-char limit.
    const username = `${base}_${randomBytes(6).toString("hex")}`.slice(0, 24);

    const displayName =
      emailPrefix.replace(/[._-]+/g, " ").trim().slice(0, 80) || "Traveller";

    try {
      return await this.prisma.profile.upsert({
        where: { userId },
        create: {
          userId,
          username,
          displayName,
        },
        update: {},
        select: profileSelect,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new ConflictException(
          "Could not generate a unique profile username. Please retry.",
        );
      }

      throw error;
    }
  }

  private normalizeList(values: string[]) {
    const unique = new Map<string, string>();

    for (const raw of values) {
      const value = raw.trim();

      if (!value) continue;

      const key = value.toLocaleLowerCase();

      if (!unique.has(key)) {
        unique.set(key, value);
      }
    }

    return [...unique.values()];
  }
}
