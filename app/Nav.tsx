import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/app/login/actions";

export async function Nav() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return (
    <header className="border-b border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950">
      <nav className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
        <div className="flex gap-4 text-sm font-medium">
          <Link href="/" className="text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white">
            ダッシュボード
          </Link>
          <Link
            href="/items"
            className="text-zinc-700 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
          >
            項目管理
          </Link>
        </div>
        <form action={logout}>
          <button className="text-sm text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-white">
            ログアウト
          </button>
        </form>
      </nav>
    </header>
  );
}
