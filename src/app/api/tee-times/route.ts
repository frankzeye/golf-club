import { NextRequest, NextResponse } from "next/server";

const FOREUP_SOURCES = [
  {
    booking_class: "13222",
    schedule_id: "968",
    booking_url: "https://foreupsoftware.com/index.php/booking/index/19103#/teetimes",
  },
  {
    booking_class: "381",
    schedule_id: "954",
    booking_url: "https://foreupsoftware.com/index.php/booking/index/19103#/teetimes",
  },
  {
    booking_class: "2552",
    schedule_id: "1676",
    booking_url: "https://foreupsoftware.com/index.php/booking/index/19103#/teetimes",
  },
  {
    booking_class: "52216",
    schedule_id: "12493",
    schedule_ids: ["12493"],
    booking_url: "https://foreupsoftware.com/index.php/booking/index/25382#/teetimes",
  },
  {
    booking_class: "50675",
    schedule_id: "11655",
    schedule_ids: ["11655"],
    booking_url: "https://foreupsoftware.com/index.php/booking/index/23626#/teetimes",
  },
  {
    booking_class: "10544",
    schedule_id: "8261",
    schedule_ids: ["8261"],
    booking_url: "https://foreupsoftware.com/index.php/booking/index/21567#/teetimes",
  },
];

const KENNA_SOURCES = [
  {
    alias: "the-legends-golf-club",
    facilityId: "1244",
    courseName: "The Legends Golf Club",
    booking_url: "https://the-legends-golf-club.book.teeitup.com/",
  },
  {
    alias: "hemet-golf-club",
    facilityId: "527",
    courseName: "Hemet Golf Club",
    booking_url: "https://hemet-golf-club.book.teeitup.com/",
  },
  {
    alias: "eagle-glen-golf-club",
    facilityId: "350",
    courseName: "Eagle Glen Golf Club",
    booking_url: "https://eagle-glen-golf-club.book.teeitup.com/",
  },
  {
    alias: "pala-mesa-resort",
    facilityId: "1301",
    courseName: "Pala Mesa Resort",
    booking_url: "https://pala-mesa-resort.book.teeitup.com/",
  },
  {
    alias: "dos-lagos-golf-course",
    facilityId: "3510",
    courseName: "Dos Lagos Golf Course",
    booking_url: "https://dos-lagos-golf-course.book.teeitup.com/",
  },
];

interface TeeTimeResult {
  time: string;
  schedule_name: string;
  guest_green_fee_18: number;
  available_spots: number;
  course_name: string;
  teesheet_side_name: string;
  booking_url: string;
}

async function fetchForeUpTeeTimes(date: string): Promise<TeeTimeResult[]> {
  const fetchPromises = FOREUP_SOURCES.map(async (source) => {
    const scheduleIds = source.schedule_ids || ["968", "954", "1676"];
    const scheduleIdsParam = scheduleIds
      .map((id) => `schedule_ids%5B%5D=${id}`)
      .join("&");
    const url = `https://foreupsoftware.com/index.php/api/booking/times?time=all&date=${date}&holes=all&players=0&booking_class=${source.booking_class}&schedule_id=${source.schedule_id}&${scheduleIdsParam}&specials_only=0&api_key=no_limits`;

    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      const times = Array.isArray(data) ? data : [];
      return times.map((t: Record<string, unknown>) => ({
        ...t,
        booking_url: source.booking_url,
      }));
    } catch {
      return [];
    }
  });

  const results = await Promise.all(fetchPromises);
  return results.flat();
}

async function fetchKennaTeeTimes(date: string): Promise<TeeTimeResult[]> {
  const [month, day, year] = date.split("-");
  const kennaDate = `${year}-${month}-${day}`;

  const fetchPromises = KENNA_SOURCES.map(async (source) => {
    const url = `https://phx-api-be-east-1b.kenna.io/v2/tee-times?date=${kennaDate}&facilityIds=${source.facilityId}`;

    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "x-be-alias": source.alias,
        },
      });

      if (!res.ok) {
        return [];
      }

      const data = await res.json();
      const results: TeeTimeResult[] = [];

      if (Array.isArray(data)) {
        for (const facility of data) {
          if (facility.teetimes && Array.isArray(facility.teetimes)) {
            for (const tt of facility.teetimes) {
              const rate = tt.rates?.[0];
              if (!rate) continue;

              const priceInCents = rate.promotion?.greenFeeCart || rate.greenFeeCart || 0;
              const priceInDollars = priceInCents / 100;
              const availableSpots = tt.maxPlayers - (tt.bookedPlayers || 0);

              if (availableSpots > 0) {
                results.push({
                  time: tt.teetime,
                  schedule_name: rate.name || "Online Rate",
                  guest_green_fee_18: priceInDollars,
                  available_spots: availableSpots,
                  course_name: source.courseName,
                  teesheet_side_name: "",
                  booking_url: source.booking_url,
                });
              }
            }
          }
        }
      }

      return results;
    } catch {
      return [];
    }
  });

  const results = await Promise.all(fetchPromises);
  return results.flat();
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }

  try {
    const [foreUpResults, kennaResults] = await Promise.all([
      fetchForeUpTeeTimes(date),
      fetchKennaTeeTimes(date),
    ]);

    const combined = [...foreUpResults, ...kennaResults];

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
