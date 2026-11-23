-- Keep completed onboarding records consistent with the final onboarding step.
UPDATE "Profile"
SET "onboardingStep" = 6
WHERE "onboardingStatus" = 'COMPLETED'
  AND "onboardingStep" <> 6;
