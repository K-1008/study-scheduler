"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { initialReviewState } from "@/lib/fsrs";

export async function createItem(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("認証されていません");

  const title = String(formData.get("title") ?? "").trim();
  const tag = String(formData.get("tag") ?? "").trim();
  if (!title) throw new Error("タイトルは必須です");

  const { data: item, error } = await supabase
    .from("items")
    .insert({ user_id: user.id, title, tag: tag || null })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: stateError } = await supabase.from("review_states").insert({
    item_id: item.id,
    user_id: user.id,
    ...initialReviewState(),
  });
  if (stateError) throw new Error(stateError.message);

  revalidatePath("/");
  revalidatePath("/items");
}

export async function updateItem(itemId: string, formData: FormData) {
  const supabase = await createClient();

  const title = String(formData.get("title") ?? "").trim();
  const tag = String(formData.get("tag") ?? "").trim();
  if (!title) throw new Error("タイトルは必須です");

  const { error } = await supabase
    .from("items")
    .update({ title, tag: tag || null })
    .eq("id", itemId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/items");
}

export async function archiveItem(itemId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("items")
    .update({ is_archived: true })
    .eq("id", itemId);
  if (error) throw new Error(error.message);

  revalidatePath("/");
  revalidatePath("/items");
}
