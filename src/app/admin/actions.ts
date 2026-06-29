"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAdminEmail } from "@/lib/admin";

const isAdmin = async () => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  return isAdminEmail(user?.email);
};

export const adminConfirmPayment = async (paymentId: string) => {
  if (!await isAdmin()) return { error: "No autorizado" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("commission_payments")
    .update({ status: "paid", paid_at: new Date().toISOString() })
    .eq("id", paymentId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return {};
};

export const adminRevokePayment = async (paymentId: string) => {
  if (!await isAdmin()) return { error: "No autorizado" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("commission_payments")
    .update({ status: "pending", paid_at: null })
    .eq("id", paymentId);
  if (error) return { error: error.message };
  revalidatePath("/admin");
  return {};
};
