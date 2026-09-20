export type Gender = "girl" | "boy" | "twins";
export type VoteChoice = "girl" | "boy";
export type PublicState = {
  title: string;
  status: "standby" | "voting" | "locked" | "countdown" | "revealed";
  gender: Gender | null;
  revealAt: string | null;
  votes: { girl: number; boy: number };
  total: number;
  yourVote?: VoteChoice | null;
};
