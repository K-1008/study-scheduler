import { formatDayKeyShort } from "@/lib/date";

/**
 * グラフの配色。dataviz スキルの検証済みパレットを使用し、
 * ライト/ダークそれぞれの面に対して個別に選んだ値を当てている(自動反転ではない)。
 * validate_palette.js で両モードとも ALL PASS を確認済み。
 *
 * 描画はSVGではなくHTML/CSSで行う。SVGのviewBoxを伸縮させると
 * スマホで軸ラベルが潰れて読めなくなるため。
 */
export function ChartStyles() {
  return (
    <style>{`
      .viz {
        --grid: #e4e4e7;
        --series-1: #2a78d6;
        --ord-1: #86b6ef;
        --ord-2: #5598e7;
        --ord-3: #2a78d6;
        --ord-4: #1c5cab;
      }
      @media (prefers-color-scheme: dark) {
        .viz {
          --grid: #27272a;
          --series-1: #3987e5;
          --ord-1: #6da7ec;
          --ord-2: #3987e5;
          --ord-3: #256abf;
          --ord-4: #184f95;
        }
      }
    `}</style>
  );
}

const AXIS_TEXT = "text-[11px] text-zinc-500 dark:text-zinc-400";
const CAPTION = "text-sm font-medium text-zinc-800 dark:text-zinc-200";

function niceMax(v: number) {
  if (v <= 4) return 4;
  const mag = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / mag) * mag;
}

// ============================================================
// 日別復習件数(直近30日)
// ============================================================

export function DailyReviewChart({ data }: { data: { key: string; count: number }[] }) {
  const max = niceMax(Math.max(...data.map((d) => d.count), 1));
  const total = data.reduce((a, b) => a + b.count, 0);
  const edges = [0, Math.floor(data.length / 2), data.length - 1];

  return (
    <figure className="viz m-0">
      <figcaption className={`mb-1 ${CAPTION}`}>日別の復習件数(直近30日)</figcaption>
      <p className={`mb-3 ${AXIS_TEXT}`}>この30日で {total} 回</p>

      <div className="flex gap-2">
        {/* y軸 */}
        <div
          className={`flex h-32 w-6 shrink-0 flex-col justify-between text-right ${AXIS_TEXT}`}
          style={{ fontVariantNumeric: "tabular-nums" }}
          aria-hidden
        >
          <span className="-translate-y-1/2">{max}</span>
          <span className="-translate-y-1/2">{max / 2}</span>
          <span className="-translate-y-1/2">0</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-32">
            {/* グリッド線(実線のヘアライン) */}
            {[0, 50, 100].map((pct) => (
              <div
                key={pct}
                className="absolute inset-x-0 h-px"
                style={{ top: `${pct}%`, background: "var(--grid)" }}
                aria-hidden
              />
            ))}

            {/* 棒。gap-[2px] が隣り合う棒を分ける「面の隙間」 */}
            <div className="absolute inset-0 flex items-end gap-[2px]">
              {data.map((d) => (
                <div
                  key={d.key}
                  className="flex h-full flex-1 items-end justify-center"
                  title={`${formatDayKeyShort(d.key)}: ${d.count}件`}
                >
                  {d.count > 0 && (
                    <div
                      className="w-full max-w-6 rounded-t"
                      style={{
                        height: `${(d.count / max) * 100}%`,
                        background: "var(--series-1)",
                      }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* x軸ラベルは端と中央だけ。30日分すべて出すと潰れる */}
          <div className={`mt-1 flex justify-between ${AXIS_TEXT}`}>
            {edges.map((i) => (
              <span key={i}>{formatDayKeyShort(data[i].key)}</span>
            ))}
          </div>
        </div>
      </div>

      <TableView
        head={["日付", "件数"]}
        rows={data.filter((d) => d.count > 0).map((d) => [formatDayKeyShort(d.key), String(d.count)])}
        empty="まだ復習の記録がありません。"
      />
    </figure>
  );
}

// ============================================================
// 評価の分布(Again→Easy の順序尺度なので順序ランプを使う)
// ============================================================

const RATING_LABELS = ["Again", "Hard", "Good", "Easy"];

export function RatingChart({ counts }: { counts: [number, number, number, number] }) {
  const max = Math.max(...counts, 1);
  const total = counts.reduce((a, b) => a + b, 0);

  return (
    <figure className="viz m-0">
      <figcaption className={`mb-1 ${CAPTION}`}>評価の分布</figcaption>
      <p className={`mb-3 ${AXIS_TEXT}`}>
        全 {total} 回。Again が多い項目ほど、FSRSは短い間隔で再出題します
      </p>

      <div className="space-y-2">
        {counts.map((count, i) => (
          <div key={RATING_LABELS[i]} className="flex items-center gap-2">
            <span className={`w-12 shrink-0 ${AXIS_TEXT}`}>{RATING_LABELS[i]}</span>
            <div className="h-5 min-w-0 flex-1">
              <div
                className="h-full rounded-r"
                style={{
                  width: `${(count / max) * 100}%`,
                  background: `var(--ord-${i + 1})`,
                }}
                title={`${RATING_LABELS[i]}: ${count}回`}
              />
            </div>
            <span
              className={`w-10 shrink-0 text-right ${AXIS_TEXT}`}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {count}
            </span>
          </div>
        ))}
      </div>

      <TableView
        head={["評価", "回数"]}
        rows={counts.map((c, i) => [RATING_LABELS[i], String(c)])}
        empty="まだ復習の記録がありません。"
      />
    </figure>
  );
}

// ============================================================
// 科目別の項目数(順序のない分類なので単一色で長さだけを比べる)
// ============================================================

export function TagChart({ data }: { data: { tag: string; count: number }[] }) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <figure className="viz m-0">
      <figcaption className={`mb-3 ${CAPTION}`}>科目別の項目数</figcaption>

      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.tag} className="flex items-center gap-2">
            <span className={`w-20 shrink-0 truncate ${AXIS_TEXT}`} title={d.tag}>
              {d.tag}
            </span>
            <div className="h-4 min-w-0 flex-1">
              <div
                className="h-full rounded-r"
                style={{
                  width: `${(d.count / max) * 100}%`,
                  background: "var(--series-1)",
                }}
                title={`${d.tag}: ${d.count}件`}
              />
            </div>
            <span
              className={`w-8 shrink-0 text-right ${AXIS_TEXT}`}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {d.count}
            </span>
          </div>
        ))}
      </div>

      <TableView
        head={["科目", "項目数"]}
        rows={data.map((d) => [d.tag, String(d.count)])}
        empty=""
      />
    </figure>
  );
}

// ============================================================
// 表形式(グラフと同じ値を色に頼らず読める代替手段)
// ============================================================

function TableView({
  head,
  rows,
  empty,
}: {
  head: [string, string];
  rows: string[][];
  empty: string;
}) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
        数値を表で見る
      </summary>
      {rows.length === 0 ? (
        <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">{empty}</p>
      ) : (
        <table className="mt-2 w-full text-xs">
          <thead>
            <tr className="text-zinc-500 dark:text-zinc-400">
              <th scope="col" className="py-1 text-left font-medium">
                {head[0]}
              </th>
              <th scope="col" className="py-1 text-right font-medium">
                {head[1]}
              </th>
            </tr>
          </thead>
          <tbody className="text-zinc-700 dark:text-zinc-300">
            {rows.map((r) => (
              <tr key={r[0]} className="border-t border-zinc-100 dark:border-zinc-900">
                <td className="py-1">{r[0]}</td>
                <td className="py-1 text-right" style={{ fontVariantNumeric: "tabular-nums" }}>
                  {r[1]}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </details>
  );
}
