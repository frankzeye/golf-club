import { NextRequest, NextResponse } from "next/server";

const API_SOURCES = [
  {
    booking_class: "13222",
    schedule_id: "968",
  },
  {
    booking_class: "381",
    schedule_id: "954",
  },
  {
    booking_class: "2552",
    schedule_id: "1676",
  },
  {
    booking_class: "52216",
    schedule_id: "12493",
    schedule_ids: ["12493"],
  },
  {
    booking_class: "50675",
    schedule_id: "11655",
    schedule_ids: ["11655"],
  },
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }

  try {
    const fetchPromises = API_SOURCES.map(async (source) => {
      const scheduleIds = source.schedule_ids || ["968", "954", "1676"];
      const scheduleIdsParam = scheduleIds
        .map((id) => `schedule_ids%5B%5D=${id}`)
        .join("&");
      const url = `https://foreupsoftware.com/index.php/api/booking/times?time=all&date=${date}&holes=all&players=0&booking_class=${source.booking_class}&schedule_id=${source.schedule_id}&${scheduleIdsParam}&specials_only=0&api_key=no_limits`;

      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      return Array.isArray(data) ? data : [];
    });

    const results = await Promise.all(fetchPromises);
    const combined = results.flat();

    combined.sort((a, b) => {
      return new Date(a.time).getTime() - new Date(b.time).getTime();
    });

    return NextResponse.json(combined);
  } catch (error) {
    console.error("Error fetching tee times:", error);
    return NextResponse.json(
      { error: "Failed to fetch tee times" },
      { status: 500 }
    );
  }
}
