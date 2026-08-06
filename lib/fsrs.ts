import { fsrs, createEmptyCard, type Card, type Grade } from "ts-fsrs";

export type { Grade };
export { Rating, State } from "ts-fsrs";

// enable_short_term: false で「1分後・10分後」といった当日中の再出題を無効にする。
// 演習問題は同じ日に解き直すものではないため、最短でも翌日以降になるようにしている。
const scheduler = fsrs({ enable_short_term: false });

/** review_states テーブルの行(DBに保存されている形) */
export interface ReviewStateRow {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: number;
  last_review: string | null;
}

export function rowToCard(row: ReviewStateRow): Card {
  return {
    due: new Date(row.due),
    stability: row.stability,
    difficulty: row.difficulty,
    elapsed_days: row.elapsed_days,
    scheduled_days: row.scheduled_days,
    learning_steps: row.learning_steps,
    reps: row.reps,
    lapses: row.lapses,
    state: row.state,
    last_review: row.last_review ? new Date(row.last_review) : undefined,
  };
}

export function cardToRow(card: Card): ReviewStateRow {
  return {
    due: card.due.toISOString(),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsed_days,
    scheduled_days: card.scheduled_days,
    learning_steps: card.learning_steps,
    reps: card.reps,
    lapses: card.lapses,
    state: card.state,
    last_review: card.last_review ? card.last_review.toISOString() : null,
  };
}

/** 新規演習項目を登録した際の初期FSRS状態 */
export function initialReviewState(now: Date = new Date()): ReviewStateRow {
  return cardToRow(createEmptyCard(now));
}

/** 現在のFSRS状態にレーティングを適用し、次の状態とログを算出する */
export function scheduleNext(
  row: ReviewStateRow,
  rating: Grade,
  now: Date = new Date(),
) {
  const card = rowToCard(row);
  const { card: nextCard, log } = scheduler.next(card, now, rating);
  return { nextRow: cardToRow(nextCard), log };
}
