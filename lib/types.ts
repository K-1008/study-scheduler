export interface Item {
  id: string;
  title: string;
  tag: string | null;
  is_archived: boolean;
  created_at: string;
}

export interface ReviewStateFields {
  due: string;
  state: number;
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
}

export interface ItemWithReviewState extends Item {
  review_states: ReviewStateFields | null;
}

export interface ReviewLogRow {
  id: string;
  rating: number;
  reviewed_at: string;
  stability_after: number;
  difficulty_after: number;
  scheduled_days: number;
}
