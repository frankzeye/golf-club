import { prisma } from "@/lib/db";

export async function countConfirmedOutingParticipants(outingId: string): Promise<number> {
  return prisma.outingParticipant.count({
    where: { outingId, status: "confirmed" },
  });
}

export async function syncOutingCapacityStatus(
  outingId: string,
  playerCount: number
): Promise<void> {
  const confirmedCount = await countConfirmedOutingParticipants(outingId);
  const outing = await prisma.outing.findUnique({
    where: { id: outingId },
    select: { status: true },
  });
  if (!outing || outing.status === "cancelled") return;

  if (confirmedCount >= playerCount && outing.status !== "full") {
    await prisma.outing.update({
      where: { id: outingId },
      data: { status: "full" },
    });
  } else if (confirmedCount < playerCount && outing.status === "full") {
    await prisma.outing.update({
      where: { id: outingId },
      data: { status: "open" },
    });
  }
}
