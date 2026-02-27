"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { CourseAutocomplete } from "@/components/CourseAutocomplete";
import { AvatarWithSash } from "@/components/AvatarWithSash";

const SCORING_FORMATS = [
  "Stroke Play",
  "Stableford",
  "Best Ball",
  "Scramble",
  "Match Play",
  "Shamble",
  "Chapman",
  "Four Ball",
  "Modified Stableford",
  "Pinehurst (Chapman)",
  "Alternate Shot",
  "Other",
];

interface CommentUser {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  imageUrl: string | null;
  scgaOfficial?: boolean;
}

interface CommentWithReplies {
  id: string;
  content: string;
  createdAt: string;
  user: CommentUser;
  replies: Array<{
    id: string;
    content: string;
    createdAt: string;
    user: CommentUser;
  }>;
}

interface RegisteredUser {
  id: string;
  registrationId: string;
  firstName: string;
  lastName: string;
  fullName: string;
  imageUrl: string | null;
  scgaOfficial?: boolean;
  paymentStatus: string;
}

interface Prize {
  name: string;
  amount: number;
}

interface TournamentDetail {
  id: string;
  slug?: string;
  name: string;
  date: string;
  course: string;
  scoringFormat: string;
  individualOrTeam: string;
  teamSize: number | null;
  availableSpots: number;
  greenFee: number;
  prizePool: number;
  clubDonation: number;
  paymentMethod: string | null;
  venmoUsername: string | null;
  prizes: Prize[];
  registeredCount: number;
  isRegistered: boolean;
  myPaymentStatus: string | null;
  registeredUsers: RegisteredUser[];
}

export default function TournamentDetailPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;
  const [tournament, setTournament] = useState<TournamentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [registering, setRegistering] = useState(false);
  const [markingPaid, setMarkingPaid] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    date: "",
    course: "",
    scoringFormat: "",
    individualOrTeam: "individual" as "individual" | "team",
    teamSize: "2" as "2" | "4",
    availableSpots: "",
    greenFee: "",
    prizePool: "",
    clubDonation: "",
    paymentMethod: "" as "" | "venmo" | "cash",
    venmoUsername: "",
    prizes: [] as { name: string; amount: string }[],
  });

  const loadComments = useCallback(() => {
    if (!id) return;
    fetch(`/api/tournaments/${id}/comments`)
      .then((res) => (res.ok ? res.json() : []))
      .then(setComments)
      .catch(() => setComments([]));
  }, [id]);

  const loadTournament = useCallback(() => {
    if (!id) return;
    fetch(`/api/tournaments/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((data) => ({
        ...data,
        date: typeof data.date === "string" ? data.date.split("T")[0] : data.date,
      }))
      .then((data) => {
        setError("");
        setTournament(data);
        setEditForm({
          name: data.name ?? "",
          date: data.date ?? "",
          course: data.course ?? "",
          scoringFormat: data.scoringFormat ?? "",
          individualOrTeam: data.individualOrTeam ?? "individual",
          teamSize: data.teamSize === 4 ? "4" : "2",
          availableSpots: String(data.availableSpots ?? ""),
          greenFee: data.greenFee != null ? String(data.greenFee) : "",
          prizePool: data.prizePool != null ? String(data.prizePool) : "",
          clubDonation: data.clubDonation != null ? String(data.clubDonation) : "",
          paymentMethod: (data.paymentMethod === "venmo" || data.paymentMethod === "cash") ? data.paymentMethod : "",
          venmoUsername: data.venmoUsername ?? "",
          prizes: (data.prizes || []).map((p: Prize) => ({ name: p.name, amount: String(p.amount) })),
        });
      })
      .catch(() => setError("Tournament not found"))
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    if (status === "loading" || !id) return;
    loadTournament();
    loadComments();
  }, [status, id, loadTournament, loadComments]);

  const handleSubmitComment = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    if (!tournament) return;
    const content = parentId ? replyContent.trim() : newComment.trim();
    if (!content) return;
    setIsSubmittingComment(true);
    setError("");
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, ...(parentId && { parentId }) }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to post comment");
        return;
      }
      setNewComment("");
      setReplyContent("");
      setReplyingTo(null);
      loadComments();
    } catch {
      setError("Failed to post comment");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleRegister = async () => {
    if (!tournament) return;
    const totalBuyIn = (tournament.greenFee ?? 0) + (tournament.prizePool ?? 0) + (tournament.clubDonation ?? 0);
    if (totalBuyIn > 0 && tournament.paymentMethod === "venmo" && tournament.venmoUsername) {
      const note = encodeURIComponent(`${tournament.name} - buy-in`);
      const venmoUser = tournament.venmoUsername.replace(/^@/, "");
      window.open(
        `https://venmo.com/${venmoUser}?txn=pay&amount=${totalBuyIn.toFixed(2)}&note=${note}`,
        "_blank",
        "noopener,noreferrer"
      );
    }
    setRegistering(true);
    setError("");
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/register`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to register");
        return;
      }
      loadTournament();
    } catch {
      setError("Something went wrong");
    } finally {
      setRegistering(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!tournament) return;
    setIsSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editForm.name.trim(),
          date: editForm.date,
          course: editForm.course.trim(),
          scoringFormat: editForm.scoringFormat,
          individualOrTeam: editForm.individualOrTeam,
          teamSize: editForm.individualOrTeam === "team" ? parseInt(editForm.teamSize, 10) : null,
          availableSpots: parseInt(editForm.availableSpots, 10),
          greenFee: parseFloat(editForm.greenFee) || 0,
          prizePool: parseFloat(editForm.prizePool) || 0,
          clubDonation: parseFloat(editForm.clubDonation) || 0,
          paymentMethod: editForm.paymentMethod || null,
          venmoUsername: editForm.paymentMethod === "venmo" ? editForm.venmoUsername : null,
          prizes: editForm.prizes
            .filter((p) => p.name.trim() && p.amount.trim())
            .map((p) => ({ name: p.name.trim(), amount: parseFloat(p.amount) || 0 })),
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save");
        return;
      }
      setIsEditing(false);
      loadTournament();
    } catch {
      setError("Failed to save");
    } finally {
      setIsSaving(false);
    }
  };

  const handleMarkPaid = async () => {
    if (!tournament) return;
    setMarkingPaid(true);
    setError("");
    try {
      const res = await fetch(
        `/api/tournaments/${tournament.id}/register/mark-paid`,
        { method: "POST" }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to mark as paid");
        return;
      }
      loadTournament();
    } catch {
      setError("Failed to mark as paid");
    } finally {
      setMarkingPaid(false);
    }
  };

  const handleDelete = async () => {
    if (!tournament || !confirm("Are you sure you want to delete this tournament? This cannot be undone.")) return;
    setIsDeleting(true);
    setError("");
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to delete");
        return;
      }
      router.push("/tournaments");
    } catch {
      setError("Failed to delete tournament");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmPayment = async (registrationId: string) => {
    if (!tournament) return;
    setError("");
    try {
      const res = await fetch(
        `/api/tournaments/${tournament.id}/registrations/${registrationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentStatus: "confirmed" }),
        }
      );
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to confirm");
        return;
      }
      loadTournament();
    } catch {
      setError("Failed to confirm payment");
    }
  };

  const handleUnregister = async () => {
    if (!tournament) return;
    setRegistering(true);
    setError("");
    try {
      const res = await fetch(`/api/tournaments/${tournament.id}/register`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to unregister");
        return;
      }
      loadTournament();
    } catch {
      setError("Something went wrong");
    } finally {
      setRegistering(false);
    }
  };

  const formatCurrency = (n: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);

  const formatCommentDate = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined });
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  if (status === "loading" || isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-stone-50">
        <Header />
        <div className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
        </div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="flex min-h-screen flex-col bg-stone-50">
        <Header />
        <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
          <p className="text-stone-600">{error || "Tournament not found"}</p>
          <Link
            href="/tournaments"
            className="mt-4 inline-block text-emerald-600 hover:text-emerald-700"
          >
            ← Back to Tournaments
          </Link>
        </div>
      </div>
    );
  }

  const now = new Date();
  const isUpcoming = new Date(tournament.date + "T23:59:59") >= now;
  const isFull = tournament.registeredCount >= tournament.availableSpots;
  const isAdmin = session?.user?.role === "admin";

  return (
    <div className="flex min-h-screen flex-col bg-stone-50">
      <Header />
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-12">
        <Link
          href="/tournaments"
          className="text-sm text-emerald-600 hover:text-emerald-700"
        >
          ← Back to Tournaments
        </Link>

        <div className="mt-6 rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-serif text-2xl font-semibold text-stone-900">
                {tournament.name}
              </h1>
              <p className="mt-2 text-stone-600">
                {formatDate(tournament.date)} · {tournament.course}
              </p>
            </div>
            {isAdmin && !isEditing && (
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  {isDeleting ? "…" : "Delete"}
                </button>
              </div>
            )}
          </div>

          {isEditing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveEdit();
              }}
              className="mt-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-stone-700">Name</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                  required
                  className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">Date</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => setEditForm((p) => ({ ...p, date: e.target.value }))}
                  required
                  className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">Course</label>
                <CourseAutocomplete
                  value={editForm.course}
                  onChange={(v) => setEditForm((p) => ({ ...p, course: v }))}
                  placeholder="Search California courses"
                  id="edit-course"
                  className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">Format</label>
                <select
                  value={editForm.scoringFormat}
                  onChange={(e) => setEditForm((p) => ({ ...p, scoringFormat: e.target.value }))}
                  required
                  className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  {SCORING_FORMATS.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">Individual or Team</label>
                <div className="mt-2 flex rounded-lg border border-stone-300 p-1">
                  <button
                    type="button"
                    onClick={() => setEditForm((p) => ({ ...p, individualOrTeam: "individual" }))}
                    className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      editForm.individualOrTeam === "individual"
                        ? "bg-emerald-600 text-white"
                        : "text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditForm((p) => ({ ...p, individualOrTeam: "team" }))}
                    className={`flex-1 rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                      editForm.individualOrTeam === "team"
                        ? "bg-emerald-600 text-white"
                        : "text-stone-600 hover:bg-stone-100"
                    }`}
                  >
                    Team
                  </button>
                </div>
                {editForm.individualOrTeam === "team" && (
                  <div className="mt-2 flex gap-4">
                    {(["2", "4"] as const).map((size) => (
                      <label key={size} className="flex cursor-pointer items-center gap-2">
                        <input
                          type="radio"
                          name="editTeamSize"
                          value={size}
                          checked={editForm.teamSize === size}
                          onChange={() => setEditForm((p) => ({ ...p, teamSize: size }))}
                          className="h-4 w-4 border-stone-300 text-emerald-600 focus:ring-emerald-500"
                        />
                        <span className="text-sm text-stone-700">{size} players</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">Available Spots</label>
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={editForm.availableSpots}
                  onChange={(e) => setEditForm((p) => ({ ...p, availableSpots: e.target.value }))}
                  required
                  className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-stone-700">Green Fee ($)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={editForm.greenFee}
                    onChange={(e) => setEditForm((p) => ({ ...p, greenFee: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700">Prize Pool ($)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={editForm.prizePool}
                    onChange={(e) => setEditForm((p) => ({ ...p, prizePool: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700">Club Donation ($)</label>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={editForm.clubDonation}
                    onChange={(e) => setEditForm((p) => ({ ...p, clubDonation: e.target.value }))}
                    className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">Payment Options</label>
                <div className="mt-2 flex gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setEditForm((p) => ({
                        ...p,
                        paymentMethod: p.paymentMethod === "venmo" ? "" : "venmo",
                      }))
                    }
                    className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                      editForm.paymentMethod === "venmo"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-stone-300 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    Venmo
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setEditForm((p) => ({
                        ...p,
                        paymentMethod: p.paymentMethod === "cash" ? "" : "cash",
                      }))
                    }
                    className={`rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors ${
                      editForm.paymentMethod === "cash"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-stone-300 text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    Cash
                  </button>
                </div>
                {editForm.paymentMethod === "venmo" && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-stone-700">Venmo Username</label>
                    <input
                      type="text"
                      value={editForm.venmoUsername}
                      onChange={(e) => setEditForm((p) => ({ ...p, venmoUsername: e.target.value }))}
                      placeholder="@username"
                      className="mt-1 w-full rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700">Prizes</label>
                <div className="mt-2 space-y-2">
                  {editForm.prizes.map((prize, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={prize.name}
                        onChange={(e) => {
                          const updated = [...editForm.prizes];
                          updated[idx] = { ...updated[idx], name: e.target.value };
                          setEditForm((p) => ({ ...p, prizes: updated }));
                        }}
                        placeholder="Prize name (e.g., 1st Place)"
                        className="flex-1 rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <input
                        type="number"
                        min={0}
                        step={0.01}
                        value={prize.amount}
                        onChange={(e) => {
                          const updated = [...editForm.prizes];
                          updated[idx] = { ...updated[idx], amount: e.target.value };
                          setEditForm((p) => ({ ...p, prizes: updated }));
                        }}
                        placeholder="Amount"
                        className="w-28 rounded-lg border border-stone-300 px-4 py-2.5 text-stone-900 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const updated = editForm.prizes.filter((_, i) => i !== idx);
                          setEditForm((p) => ({ ...p, prizes: updated }));
                        }}
                        className="rounded-lg border border-stone-300 px-3 py-2.5 text-stone-500 hover:bg-stone-50 hover:text-stone-700"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      setEditForm((p) => ({
                        ...p,
                        prizes: [...p.prizes, { name: "", amount: "" }],
                      }))
                    }
                    className="rounded-lg border border-dashed border-stone-300 px-4 py-2.5 text-sm text-stone-600 hover:border-stone-400 hover:text-stone-700"
                  >
                    + Add Prize
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSaving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  disabled={isSaving}
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
          <dl className="mt-6 space-y-3">
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Format
              </dt>
              <dd className="text-stone-900">{tournament.scoringFormat}</dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Type
              </dt>
              <dd className="text-stone-900">
                {tournament.individualOrTeam === "team" && tournament.teamSize
                  ? `${tournament.teamSize}-person teams`
                  : "Individual"}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-medium uppercase tracking-wide text-stone-400">
                Spots
              </dt>
              <dd className="text-stone-900">
                {tournament.registeredCount} / {tournament.availableSpots} filled
              </dd>
            </div>
            {((tournament.greenFee ?? 0) + (tournament.prizePool ?? 0) + (tournament.clubDonation ?? 0)) > 0 && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-stone-400 mb-1">
                  Buy-in
                </dt>
                <dd className="text-stone-900">
                  <span className="font-medium tabular-nums">
                    {formatCurrency((tournament.greenFee ?? 0) + (tournament.prizePool ?? 0) + (tournament.clubDonation ?? 0))}
                  </span>
                  <span className="ml-2 text-sm text-stone-600">
                    Includes 18 Holes of Golf, Prize Pool, and Registration Fees
                  </span>
                </dd>
              </div>
            )}
            {tournament.prizes && tournament.prizes.length > 0 && (
              <div>
                <dt className="text-xs font-medium uppercase tracking-wide text-stone-400 mb-1">
                  Prizes
                </dt>
                <dd className="text-stone-900">
                  <table className="w-full border-separate border-spacing-1 text-sm">
                    <tbody>
                      {tournament.prizes.map((prize, idx) => (
                        <tr key={idx}>
                          <td className="rounded bg-stone-100 px-3 py-2 text-stone-600">{prize.name}</td>
                          <td className="rounded bg-stone-100 px-3 py-2 text-right tabular-nums">{formatCurrency(prize.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </dd>
              </div>
            )}
          </dl>
          )}

          {isUpcoming && (
            <div className="mt-6 space-y-4">
              {tournament.isRegistered ? (
                <>
                  {(tournament.myPaymentStatus === "unpaid") &&
                    ((tournament.greenFee ?? 0) + (tournament.prizePool ?? 0) + (tournament.clubDonation ?? 0)) > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm text-amber-900">
                        {tournament.paymentMethod === "venmo" && tournament.venmoUsername
                          ? "Send your payment via Venmo, then click \"Paid\" below. An admin will confirm payment."
                          : tournament.paymentMethod === "cash"
                          ? "Pay cash at the event, then click \"Paid\" below. An admin will confirm payment."
                          : "Complete your payment and click \"Paid\" below. An admin will confirm payment."}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {tournament.paymentMethod === "venmo" && tournament.venmoUsername && (
                          <a
                            href={`https://venmo.com/${tournament.venmoUsername.replace(/^@/, "")}?txn=pay&amount=${(tournament.greenFee ?? 0) + (tournament.prizePool ?? 0) + (tournament.clubDonation ?? 0)}&note=${encodeURIComponent(tournament.name)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-lg bg-[#008CFF] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#0074D4] transition-colors"
                          >
                            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M19.27 3c.93 1.54 1.35 3.13 1.35 5.14 0 6.41-5.48 14.73-9.93 20.86H3.14L0 4.29l7.55-.69 1.76 14.18c1.64-2.68 3.67-6.89 3.67-9.76 0-1.93-.33-3.24-.93-4.32L19.27 3z"/>
                            </svg>
                            Pay {formatCurrency((tournament.greenFee ?? 0) + (tournament.prizePool ?? 0) + (tournament.clubDonation ?? 0))} via Venmo
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={handleMarkPaid}
                          disabled={markingPaid}
                          className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                        >
                          {markingPaid ? "…" : "I've Paid"}
                        </button>
                      </div>
                    </div>
                  )}
                  {(tournament.myPaymentStatus === "pending") && (
                    <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      <strong>Pending</strong> — Awaiting admin confirmation of your payment.
                    </p>
                  )}
                  {(tournament.myPaymentStatus === "confirmed") &&
                    ((tournament.greenFee ?? 0) + (tournament.prizePool ?? 0) + (tournament.clubDonation ?? 0)) > 0 && (
                    <p className="text-sm text-emerald-700 font-medium">
                      ✓ Paid and registered
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={handleUnregister}
                    disabled={registering}
                    className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 disabled:opacity-50"
                  >
                    {registering ? "…" : "Unregister"}
                  </button>
                </>
              ) : !session ? (
                <Link
                  href={`/signin?callbackUrl=/tournaments/${tournament.slug ?? tournament.id}`}
                  className="inline-block rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
                >
                  Sign In to Register
                </Link>
              ) : (
                <>
                  {((tournament.greenFee ?? 0) + (tournament.prizePool ?? 0) + (tournament.clubDonation ?? 0)) > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <p className="text-sm text-amber-900">
                        <span className="font-medium">Buy-in: {formatCurrency((tournament.greenFee ?? 0) + (tournament.prizePool ?? 0) + (tournament.clubDonation ?? 0))}</span>
                      </p>
                      <p className="mt-1 text-sm text-amber-800">
                        {tournament.paymentMethod === "venmo" && tournament.venmoUsername
                          ? "When you click Register, you'll be taken to Venmo to send your payment. Once paid, an admin will confirm your payment."
                          : tournament.paymentMethod === "cash"
                          ? "Pay cash at the event. An admin will confirm your payment."
                          : "Complete your payment after registering. An admin will confirm your payment."}
                      </p>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleRegister}
                    disabled={registering || isFull}
                    className="rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {registering ? "…" : isFull ? "Full" : "Register"}
                  </button>
                </>
              )}
            </div>
          )}

          {error && (
            <p className="mt-4 text-sm text-red-600">{error}</p>
          )}

          {tournament.registeredUsers.length > 0 && (
            <div className="mt-8 border-t border-stone-200 pt-6">
              <h2 className="text-sm font-semibold text-stone-900">
                Registered ({tournament.registeredUsers.length})
              </h2>
              <div className="mt-3 space-y-2">
                {tournament.registeredUsers.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 px-3 py-2"
                  >
                    <Link
                      href={`/members/${u.id}`}
                      className="flex min-w-0 flex-1 items-center gap-2 transition-colors hover:text-emerald-600"
                    >
                      <AvatarWithSash
                        imageUrl={u.imageUrl}
                        alt={u.fullName}
                        size="md"
                        fallback={u.firstName ? u.firstName[0].toUpperCase() : "?"}
                      />
                      <span className="font-medium text-stone-900 truncate">{u.fullName}</span>
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                      {u.paymentStatus === "unpaid" && (
                        <>
                          <span className="rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600">
                            Unpaid
                          </span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleConfirmPayment(u.registrationId)}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                            >
                              Mark as paid
                            </button>
                          )}
                        </>
                      )}
                      {u.paymentStatus === "pending" && (
                        <>
                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            Pending
                          </span>
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => handleConfirmPayment(u.registrationId)}
                              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                            >
                              Confirm payment
                            </button>
                          )}
                        </>
                      )}
                      {u.paymentStatus === "confirmed" &&
                        ((tournament.greenFee ?? 0) + (tournament.prizePool ?? 0) + (tournament.clubDonation ?? 0)) > 0 && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          Paid and registered
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 border-t border-stone-200 pt-6">
            <h2 className="text-sm font-semibold text-stone-900">Comments</h2>

            <form
              onSubmit={(e) => handleSubmitComment(e)}
              className="mt-4"
            >
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                rows={3}
                maxLength={2000}
                className="w-full rounded-lg border border-stone-300 px-4 py-3 text-stone-900 placeholder-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <div className="mt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmittingComment || !newComment.trim()}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isSubmittingComment ? "Posting…" : "Post"}
                </button>
              </div>
            </form>

            <div className="mt-6 space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <AvatarWithSash
                    imageUrl={comment.user.imageUrl}
                    alt={comment.user.fullName}
                    size="md"
                    fallback={comment.user.firstName ? comment.user.firstName[0].toUpperCase() : "?"}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="rounded-lg bg-stone-50 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/members/${comment.user.id}`} className="font-medium text-stone-900 hover:text-emerald-600">
                          {comment.user.fullName}
                        </Link>
                        <span className="text-xs text-stone-400">{formatCommentDate(comment.createdAt)}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-stone-700">{comment.content}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                      className="mt-1 text-xs font-medium text-emerald-600 hover:text-emerald-700"
                    >
                      {replyingTo === comment.id ? "Cancel" : "Reply"}
                    </button>

                    {replyingTo === comment.id && (
                      <form
                        onSubmit={(e) => handleSubmitComment(e, comment.id)}
                        className="mt-3 ml-4"
                      >
                        <textarea
                          value={replyContent}
                          onChange={(e) => setReplyContent(e.target.value)}
                          placeholder={`Reply to ${comment.user.fullName}...`}
                          rows={2}
                          maxLength={2000}
                          autoFocus
                          className="w-full rounded-lg border border-stone-300 px-4 py-2 text-sm text-stone-900 placeholder-stone-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />
                        <div className="mt-2 flex gap-2">
                          <button
                            type="submit"
                            disabled={isSubmittingComment || !replyContent.trim()}
                            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            {isSubmittingComment ? "…" : "Reply"}
                          </button>
                          <button
                            type="button"
                            onClick={() => { setReplyingTo(null); setReplyContent(""); }}
                            className="rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 hover:bg-stone-50"
                          >
                            Cancel
                          </button>
                        </div>
                      </form>
                    )}

                    {comment.replies.length > 0 && (
                      <div className="mt-3 space-y-3 border-l-2 border-stone-200 pl-4">
                        {comment.replies.map((reply) => (
                          <div key={reply.id} className="flex gap-2">
                            <AvatarWithSash
                              imageUrl={reply.user.imageUrl}
                              alt={reply.user.fullName}
                              size="sm"
                              fallback={reply.user.firstName ? reply.user.firstName[0].toUpperCase() : "?"}
                              className="h-6 w-6"
                            />
                            <div className="min-w-0 flex-1 rounded-lg bg-stone-50 px-3 py-2">
                              <div className="flex items-center gap-2">
                                <Link href={`/members/${reply.user.id}`} className="font-medium text-stone-900 hover:text-emerald-600 text-sm">
                                  {reply.user.fullName}
                                </Link>
                                <span className="text-xs text-stone-400">{formatCommentDate(reply.createdAt)}</span>
                              </div>
                              <p className="mt-0.5 whitespace-pre-wrap text-sm text-stone-700">{reply.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {comments.length === 0 && (
              <p className="mt-4 text-sm text-stone-500">No comments yet. Be the first to add one!</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
