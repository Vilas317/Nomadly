import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from "class-validator";

export class OnboardingProgressDto {
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  step?: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  travelStyle?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(50, { each: true })
  interests?: string[];

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
  @MaxLength(40, { each: true })
  languages?: string[];

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
}