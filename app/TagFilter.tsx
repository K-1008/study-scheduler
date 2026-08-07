import Link from "next/link";

/**
 * タグでの絞り込み。リンクなので JavaScript 無しでも動く。
 * basePath は絞り込み対象ページのパス。
 */
export function TagFilter({
  tags,
  active,
  basePath,
}: {
  tags: string[];
  active?: string;
  basePath: string;
}) {
  if (tags.length === 0) return null;

  const base =
    "rounded-full border px-3 py-1 text-xs transition-colors whitespace-nowrap";
  const on =
    "border-zinc-900 bg-zinc-900 text-white dark:border-zinc-100 dark:bg-zinc-100 dark:text-zinc-900";
  const off =
    "border-zinc-300 text-zinc-600 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800";

  return (
    <div className="mb-4 flex flex-wrap gap-2">
      <Link href={basePath} className={`${base} ${active ? off : on}`}>
        すべて
      </Link>
      {tags.map((tag) => (
        <Link
          key={tag}
          href={`${basePath}?tag=${encodeURIComponent(tag)}`}
          className={`${base} ${active === tag ? on : off}`}
        >
          {tag}
        </Link>
      ))}
    </div>
  );
}
