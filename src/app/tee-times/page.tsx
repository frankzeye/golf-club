"use client";

import { useState, useEffect, useMemo } from "react";
import { useSession } from "next-auth/react";
import { Header } from "@/components/Header";
import { AccessDenied } from "@/components/AccessDenied";

interface TeeTime {
  time: string;
  schedule_name: string;
  guest_green_fee_18: number;
  available_spots: number;
  course_name: string;
  teesheet_side_name: string;
  booking_url: string;
}

const TIME_OPTIONS = [
  { value: "all", label: "All Times" },
  { value: "morning", label: "Morning (before 12pm)" },
  { value: "afternoon", label: "Afternoon (12pm - 4pm)" },
  { value: "evening", label: "Evening (after 4pm)" },
];

const PRICE_OPTIONS = [
  { value: "all", label: "All Prices" },
  { value: "under50", label: "Under $50" },
  { value: "50to75", label: "$50 - $75" },
  { value: "over75", label: "Over $75" },
];

const PLAYERS_OPTIONS = [
  { value: "all", label: "Any Availability" },
  { value: "1", label: "1+ spots" },
  { value: "2", label: "2+ spots" },
  { value: "3", label: "3+ spots" },
  { value: "4", label: "4 spots" },
];

export default function TeeTimesPage() {
  const { status } = useSession();
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  const [teeTimes, setTeeTimes] = useState<TeeTime[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedCourses, setSelectedCourses] = useState<Set<string>>(new Set());
  const [filterTime, setFilterTime] = useState("all");
  const [filterPrice, setFilterPrice] = useState("all");
  const [filterPlayers, setFilterPlayers] = useState("all");

  useEffect(() => {
    if (status !== "authenticated" || !date) return;

    const fetchTeeTimes = async () => {
      setIsLoading(true);
      setError("");
      try {
        const formattedDate = formatDateForApi(date);
        const res = await fetch(`/api/tee-times?date=${formattedDate}`);
        if (!res.ok) {
          throw new Error("Failed to fetch tee times");
        }
        const data = await res.json();
        setTeeTimes(Array.isArray(data) ? data : []);
      } catch (err) {
        setError("Unable to load tee times. Please try again.");
        setTeeTimes([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTeeTimes();
  }, [status, date]);

  const formatDateForApi = (dateStr: string): string => {
    const [year, month, day] = dateStr.split("-");
    return `${month}-${day}-${year}`;
  };

  const formatTime = (timeStr: string): string => {
    const date = new Date(timeStr);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDisplayDate = (dateStr: string): string => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDisplayCourseName = (teeTime: TeeTime): string => {
    const courseName = teeTime.course_name?.trim() || "";
    const scheduleName = teeTime.schedule_name?.trim() || teeTime.teesheet_side_name?.trim() || "";
    
    if (courseName.toLowerCase().includes("menifee lakes")) {
      if (scheduleName.toLowerCase().includes("palms")) {
        return "Menifee Lakes - Palms";
      } else if (scheduleName.toLowerCase().includes("lakes")) {
        return "Menifee Lakes - Lakes";
      }
    }
    
    return courseName || scheduleName || "—";
  };

  const uniqueCourses = useMemo(() => {
    const courses = new Set<string>();
    teeTimes.forEach((t) => {
      const name = getDisplayCourseName(t);
      if (name && name !== "—") courses.add(name);
    });
    return Array.from(courses).sort();
  }, [teeTimes]);

  useEffect(() => {
    if (uniqueCourses.length > 0 && selectedCourses.size === 0) {
      setSelectedCourses(new Set(uniqueCourses));
    }
  }, [uniqueCourses]);

  const filteredTeeTimes = useMemo(() => {
    const filtered = teeTimes.filter((t) => {
      const courseName = getDisplayCourseName(t);
      if (selectedCourses.size > 0 && !selectedCourses.has(courseName)) {
        return false;
      }

      const hour = new Date(t.time).getHours();
      if (filterTime === "morning" && hour >= 12) return false;
      if (filterTime === "afternoon" && (hour < 12 || hour >= 16)) return false;
      if (filterTime === "evening" && hour < 16) return false;

      const price = t.guest_green_fee_18;
      if (filterPrice === "under50" && price >= 50) return false;
      if (filterPrice === "50to75" && (price < 50 || price > 75)) return false;
      if (filterPrice === "over75" && price <= 75) return false;

      const spots = t.available_spots;
      if (filterPlayers !== "all" && spots < parseInt(filterPlayers)) return false;

      return true;
    });

    return filtered.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  }, [teeTimes, selectedCourses, filterTime, filterPrice, filterPlayers]);

  const toggleCourse = (course: string) => {
    setSelectedCourses((prev) => {
      const next = new Set(prev);
      if (next.has(course)) {
        next.delete(course);
      } else {
        next.add(course);
      }
      return next;
    });
  };

  const selectAllCourses = () => {
    setSelectedCourses(new Set(uniqueCourses));
  };

  const selectNoCourses = () => {
    setSelectedCourses(new Set());
  };

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col bg-stone-50">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return <AccessDenied pageName="Tee times" />;
  }

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-stone-900">
              Tee Times
            </h1>
            <p className="mt-1 text-sm text-stone-500">
              Available tee times at local courses
            </p>
          </div>
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-stone-700">
              Select Date
            </label>
            <input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>
        </div>

        {date && (
          <p className="mt-6 text-lg font-medium text-stone-700">
            {formatDisplayDate(date)}
          </p>
        )}

        {teeTimes.length > 0 && (
          <div className="mt-6 space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-stone-600">
                  Courses
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={selectAllCourses}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    Select All
                  </button>
                  <span className="text-xs text-stone-300">|</span>
                  <button
                    type="button"
                    onClick={selectNoCourses}
                    className="text-xs font-medium text-emerald-600 hover:text-emerald-700"
                  >
                    Select None
                  </button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {uniqueCourses.map((course) => (
                  <button
                    key={course}
                    type="button"
                    onClick={() => toggleCourse(course)}
                    className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                      selectedCourses.has(course)
                        ? "bg-emerald-600 text-white"
                        : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                    }`}
                  >
                    {course}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label htmlFor="filterTime" className="block text-xs font-medium text-stone-600">
                  Time
                </label>
                <select
                  id="filterTime"
                  value={filterTime}
                  onChange={(e) => setFilterTime(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {TIME_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="filterPrice" className="block text-xs font-medium text-stone-600">
                  Price
                </label>
                <select
                  id="filterPrice"
                  value={filterPrice}
                  onChange={(e) => setFilterPrice(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {PRICE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="filterPlayers" className="block text-xs font-medium text-stone-600">
                  Players
                </label>
                <select
                  id="filterPlayers"
                  value={filterPlayers}
                  onChange={(e) => setFilterPlayers(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-sm text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {PLAYERS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="mt-8 flex justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
          </div>
        ) : teeTimes.length === 0 && !error ? (
          <div className="mt-8 rounded-xl border border-stone-200 bg-white p-8 text-center shadow-sm">
            <p className="text-stone-500">No tee times available for this date.</p>
          </div>
        ) : filteredTeeTimes.length === 0 ? (
          <div className="mt-6 rounded-xl border border-stone-200 bg-white p-8 text-center shadow-sm">
            <p className="text-stone-500">No tee times match your filters.</p>
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
            <table className="w-full">
              <thead className="border-b border-stone-200 bg-stone-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-stone-700">
                    Course
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-stone-700">
                    Time
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-stone-700">
                    Price
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-stone-700">
                    Players
                  </th>
                  <th className="hidden sm:table-cell px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filteredTeeTimes.map((teeTime, idx) => (
                  <tr key={idx} className="hover:bg-stone-50">
                    <td className="px-4 py-3 text-sm text-stone-900">
                      <a
                        href={teeTime.booking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-emerald-600 hover:underline"
                      >
                        {getDisplayCourseName(teeTime)}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-stone-900">
                      {formatTime(teeTime.time)}
                    </td>
                    <td className="px-4 py-3 text-sm text-emerald-700 font-medium">
                      {formatCurrency(teeTime.guest_green_fee_18)}
                    </td>
                    <td className="px-4 py-3 text-sm text-stone-700">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        teeTime.available_spots >= 4
                          ? "bg-emerald-100 text-emerald-800"
                          : teeTime.available_spots >= 2
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {teeTime.available_spots}<span className="hidden sm:inline">&nbsp;{teeTime.available_spots === 1 ? "spot" : "spots"}</span>
                      </span>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-sm">
                      <a
                        href={teeTime.booking_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-emerald-600 hover:text-emerald-700"
                      >
                        Book
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
