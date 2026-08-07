"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toDayKey } from "@/lib/date";

/**
 * 日付が変わったら画面を作り直す。
 *
 * サーバーで描画したHTMLは開いた時点のもので、放っておいても更新
 * されない。タブやホーム画面のアプリを開いたまま日をまたぐと、
 * 前日の「今日の復習」を見続けることになる。
 *
 * renderedOn は描画時点でサーバーが算出した日付。ブラウザ側で今の
 * 日付を計算し、食い違っていたら再取得する。判定には toDayKey を
 * 使うので、午前4時までは前日として扱われる点もサーバーと揃う。
 */
export function DayChangeRefresher({ renderedOn }: { renderedOn: string }) {
  const router = useRouter();

  useEffect(() => {
    function refreshIfDayChanged() {
      if (document.visibilityState !== "visible") return;
      if (toDayKey(new Date()) !== renderedOn) router.refresh();
    }

    // 画面に戻ってきたとき(スマホでアプリを再度開いた場合を含む)
    document.addEventListener("visibilitychange", refreshIfDayChanged);
    window.addEventListener("focus", refreshIfDayChanged);
    // 開きっぱなしで日付をまたぐ場合に備えて定期的にも見る
    const timer = setInterval(refreshIfDayChanged, 60_000);

    return () => {
      document.removeEventListener("visibilitychange", refreshIfDayChanged);
      window.removeEventListener("focus", refreshIfDayChanged);
      clearInterval(timer);
    };
  }, [renderedOn, router]);

  return null;
}
