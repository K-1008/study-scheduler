/**
 * FSRSパラメータの個人最適化。
 *
 * 実装は @open-spaced-repetition/binding (Rust製)。既定パラメータを
 * 初期値とし、L2正則化で既定値へ引き戻しながら学習するため、データが
 * 少ないうちは既定値からほとんど動かない。64アイテム未満ではライブラリ
 * 側が学習をスキップして初期値を返す。
 *
 * 重要: 不正な入力を渡すとRust側で panic が起き、JavaScriptの例外では
 * 捕捉できずプロセスごと落ちる。渡す前に必ず検証すること。
 *   "Invalid FSRS item: at least one review with delta_t > 0 is required"
 */

/** ライブラリが本格的な学習を始める最小アイテム数 */
export const MIN_TRAINABLE_ITEMS = 64;

export interface RawLog {
  item_id: string;
  rating: number;
  reviewed_at: string;
}

/** 1項目分の復習列。[評価, 前回からの経過日数] */
type Sequence = [number, number][];

/** 復習ログを項目ごとの時系列にまとめる */
function groupByItem(logs: RawLog[]): Sequence[] {
  const byItem = new Map<string, RawLog[]>();
  for (const log of logs) {
    const list = byItem.get(log.item_id);
    if (list) list.push(log);
    else byItem.set(log.item_id, [log]);
  }

  const sequences: Sequence[] = [];
  for (const list of byItem.values()) {
    list.sort((a, b) => a.reviewed_at.localeCompare(b.reviewed_at));
    const seq: Sequence = [];
    let prev: number | null = null;
    for (const log of list) {
      const at = new Date(log.reviewed_at).getTime();
      const deltaT = prev === null ? 0 : Math.max(0, Math.round((at - prev) / 86400000));
      seq.push([log.rating, deltaT]);
      prev = at;
    }
    sequences.push(seq);
  }
  return sequences;
}

/**
 * 学習に使える「累積プレフィックス」を列挙する。
 *
 * FSRSは1回の復習ごとに1アイテムを作るが、各アイテムはそれ以前の
 * 復習列を全部含む。ただし先頭1件だけのアイテムは delta_t>0 の復習を
 * 持たず panic の原因になるので、2件目以降から作る。
 */
function toPrefixes(sequences: Sequence[]): Sequence[] {
  const out: Sequence[] = [];
  for (const seq of sequences) {
    for (let i = 2; i <= seq.length; i++) {
      const slice = seq.slice(0, i);
      // 2件目以降に1日以上空いた復習が無いものは弾く(同日の連打など)
      if (!slice.slice(1).some(([, dt]) => dt > 0)) continue;
      out.push(slice);
    }
  }
  return out;
}

/**
 * 学習に使えるアイテム数を数える。ネイティブモジュールを読み込まないので
 * 画面表示から気軽に呼べる。
 */
export function countTrainableItems(logs: RawLog[]): number {
  return toPrefixes(groupByItem(logs)).length;
}

export interface OptimizeResult {
  params: number[];
  itemCount: number;
  /** 既定値と最適化後の精度。小さいほど良い */
  before: { logLoss: number; rmse: number };
  after: { logLoss: number; rmse: number };
  /** 既定値から実際に動いたか */
  changed: boolean;
}

/**
 * 復習ログからパラメータを算出する。
 * アイテム数が足りない場合は null を返す(ネイティブ呼び出しはしない)。
 */
export async function optimizeParameters(logs: RawLog[]): Promise<OptimizeResult | null> {
  const prefixes = toPrefixes(groupByItem(logs));
  if (prefixes.length < MIN_TRAINABLE_ITEMS) return null;

  // ネイティブモジュールはここでだけ読み込む。実行環境によっては
  // バイナリが見つからないことがあるので、その場合は読める形で失敗させる。
  let binding: typeof import("@open-spaced-repetition/binding");
  try {
    binding = await import("@open-spaced-repetition/binding");
  } catch (e) {
    throw new Error(
      `最適化モジュールを読み込めませんでした(この環境では実行できない可能性があります): ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }
  const { computeParameters, FSRSBindingItem, FSRSBindingReview, FSRSBinding } = binding;
  const { default_w } = await import("ts-fsrs");

  const trainSet = prefixes.map(
    (seq) => new FSRSBindingItem(seq.map(([rating, dt]) => new FSRSBindingReview(rating, dt))),
  );

  // スケジューリング側と条件を揃える(当日中の再出題は使わない)
  const params = await computeParameters(trainSet, { enableShortTerm: false });

  const baseline = new FSRSBinding([...default_w]).evaluate(trainSet);
  const tuned = new FSRSBinding(params).evaluate(trainSet);

  const changed = params.some((v, i) => Math.abs(v - default_w[i]) > 1e-6);

  return {
    params,
    itemCount: trainSet.length,
    before: { logLoss: baseline.logLoss, rmse: baseline.rmseBins },
    after: { logLoss: tuned.logLoss, rmse: tuned.rmseBins },
    changed,
  };
}
