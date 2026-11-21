import {
  ArrayMaxSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import { ProfileVisibility } from "@prisma/client";

export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(24)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: "username may contain only letters, numbers and underscores",
  })
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  bio?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  homeCity?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  homeState?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  homeCountry?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  travelStyle?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000000)
  budgetMin?: number | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1000000000)
  budgetMax?: number | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(40, { each: true })
  languages?: string[];

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(50, { each: true })
  interests?: string[];

  @IsOptional()
  @IsEnum(ProfileVisibility)
  visibility?: ProfileVisibility;
}
