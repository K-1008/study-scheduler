import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const { error, message } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-4 dark:bg-black">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-center text-2xl font-semibold text-zinc-900 dark:text-zinc-50">
          復習スケジュール管理
        </h1>

        {message && (
          <p className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-950 dark:text-green-300">
            {message}
          </p>
        )}
        {error && (
          <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
            {error}
          </p>
        )}

        <form className="space-y-3 rounded-lg border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-950">
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              メールアドレス
            </label>
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
              パスワード
            </label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              formAction={login}
              className="flex-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-50 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              ログイン
            </button>
            <button
              formAction={signup}
              className="flex-1 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              新規登録
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
