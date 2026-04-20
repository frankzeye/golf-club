import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";

function csvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return "";
  const s = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/**
 * GET /api/members/export - Download all members as CSV (admin only)
 */
export async function GET() {
  const { error } = await requireAdmin();
  if (error) {
    return NextResponse.json(error.json, { status: error.status });
  }

  const users = await prisma.user.findMany({
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    select: {
      email: true,
      firstName: true,
      lastName: true,
      handicapIndex: true,
      homeCourse: true,
      cellNumber: true,
      ghinNumber: true,
      role: true,
      scgaOfficial: true,
    },
  });

  const header = [
    "Email",
    "First Name",
    "Last Name",
    "Handicap Index",
    "Home Course",
    "Cell",
    "GHIN",
    "Role",
    "SCGA Official",
  ];

  const lines = [
    header.join(","),
    ...users.map((u) =>
      [
        u.email,
        u.firstName ?? "",
        u.lastName ?? "",
        u.handicapIndex ?? "",
        u.homeCourse ?? "",
        u.cellNumber ?? "",
        u.ghinNumber ?? "",
        u.role ?? "member",
        u.scgaOfficial ?? false,
      ]
        .map(csvCell)
        .join(",")
    ),
  ];

  const csv = "\uFEFF" + lines.join("\r\n");

  const filename = `members-${new Date().toISOString().slice(0, 10)}.csv`;

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
