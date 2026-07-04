export function resolveRegistrationHandicapIndex(
  registrationHandicapIndex: number | null | undefined,
  userHandicapIndex: number | null | undefined
): number | null {
  if (registrationHandicapIndex != null) return registrationHandicapIndex;
  return userHandicapIndex ?? null;
}
