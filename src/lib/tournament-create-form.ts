export interface TournamentPrizeDraft {
  name: string;
  amount: string;
}

export interface TournamentCreateFormState {
  name: string;
  description: string;
  date: string;
  startTime: string;
  course: string;
  courseId: string | null;
  scoringFormat: string;
  individualOrTeam: "individual" | "team";
  teamSize: "2" | "4";
  availableSpots: string;
  greenFee: string;
  prizePool: string;
  clubDonation: string;
  paymentMethod: "" | "venmo" | "cash";
  venmoUsername: string;
  prizes: TournamentPrizeDraft[];
  adminOnly: boolean;
}

export const DEFAULT_TOURNAMENT_CREATE_FORM: TournamentCreateFormState = {
  name: "",
  description: "",
  date: "",
  startTime: "",
  course: "",
  courseId: null,
  scoringFormat: "",
  individualOrTeam: "individual",
  teamSize: "2",
  availableSpots: "32",
  greenFee: "",
  prizePool: "",
  clubDonation: "",
  paymentMethod: "",
  venmoUsername: "",
  prizes: [],
  adminOnly: false,
};

export function serializeTournamentCreateForm(form: TournamentCreateFormState) {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    date: form.date,
    startTime: form.startTime || null,
    course: form.course.trim(),
    courseId: form.courseId,
    scoringFormat: form.scoringFormat,
    individualOrTeam: form.individualOrTeam,
    teamSize: form.individualOrTeam === "team" ? parseInt(form.teamSize, 10) : null,
    availableSpots: parseInt(form.availableSpots, 10),
    greenFee: parseFloat(form.greenFee) || 0,
    prizePool: parseFloat(form.prizePool) || 0,
    clubDonation: parseFloat(form.clubDonation) || 0,
    paymentMethod: form.paymentMethod || null,
    venmoUsername: form.paymentMethod === "venmo" ? form.venmoUsername : null,
    prizes: form.prizes
      .filter((prize) => prize.name.trim() && prize.amount.trim())
      .map((prize) => ({
        name: prize.name.trim(),
        amount: parseFloat(prize.amount) || 0,
      })),
    adminOnly: !!form.adminOnly,
  };
}

export function validateTournamentCreateStep(
  step: number,
  form: TournamentCreateFormState
): string | null {
  if (step === 0) {
    if (!form.name.trim()) return "Tournament name is required.";
    if (!form.date) return "Date is required.";
    if (!form.course.trim()) return "Course is required.";
    return null;
  }
  if (step === 1) {
    if (!form.scoringFormat) return "Scoring format is required.";
    const spots = parseInt(form.availableSpots, 10);
    if (!Number.isFinite(spots) || spots < 1) return "Available spots must be at least 1.";
    return null;
  }
  return null;
}
