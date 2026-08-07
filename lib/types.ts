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
  /** PostgREST のネスト集約。復習履歴の件数が [{ count: n }] で返る */
  review_logs: { count: number }[];
}

export interface ReviewLogRow {
  id: string;
  rating: number;
  reviewed_at: string;
  stability_after: number;
  difficulty_after: number;
  scheduled_days: number;
}

/** ネスト集約から件数を取り出す */
export function reviewCountOf(item: ItemWithReviewState): number {
  return item.review_logs?.[0]?.count ?? 0;
}
