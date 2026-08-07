import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";

const LINKS = [
  { href: "/", label: "今日" },
  { href: "/calendar", label: "カレンダー" },
  { href: "/stats", label: "記録" },
  { href: "/items", label: "項目管理" },
];

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <nav className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex gap-3 overflow-x-auto text-sm font-medium sm:gap-4">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <form action={logout}>
          <button className="shrink-0 text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white">
            ログアウト
          </button>
        </form>
      </nav>
    </header>
  );
}
