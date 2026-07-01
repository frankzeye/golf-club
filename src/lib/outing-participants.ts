export function countConfirmedParticipants(
  participants: Array<{ status: string }>
): number {
  return participants.filter((p) => p.status === "confirmed").length;
}
