UPDATE "Profile"
SET
    "onboardingStatus" = 'COMPLETED',
    "onboardingCompletedAt" = CURRENT_TIMESTAMP
WHERE
    "createdAt" <= TIMESTAMP '2026-11-23 14:27:54'
    AND "onboardingStatus" = 'NOT_STARTED'
    AND "onboardingStep" = 0;
