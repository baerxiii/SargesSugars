import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const cronSecret = Deno.env.get("REMINDER_CRON_SECRET");
const publicKey = Deno.env.get("VAPID_PUBLIC_KEY");
const privateKey = Deno.env.get("VAPID_PRIVATE_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!cronSecret || !publicKey || !privateKey || !supabaseUrl || !serviceKey) {
  throw new Error("Missing reminder function configuration");
}

webpush.setVapidDetails("https://baerxiii.github.io", publicKey, privateKey);
const db = createClient(supabaseUrl, serviceKey);

Deno.serve(async (request) => {
  if (request.method !== "POST" || request.headers.get("x-reminder-secret") !== cronSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { data: jobs, error } = await db.rpc("claim_reading_reminders");
  if (error) {
    console.error("Could not claim reminders:", error);
    return new Response("Could not claim reminders", { status: 500 });
  }

  let failures = 0;
  for (const job of jobs) {
    const { data: meal, error: mealError } = await db.from("meals")
      .select("glucose_after").eq("id", job.meal_id).maybeSingle();
    if (mealError) {
      console.error("Could not check meal:", mealError);
      failures++;
      continue;
    }
    if (!meal || meal.glucose_after != null) continue;

    try {
      const url = new URL(job.endpoint);
      if (url.protocol !== "https:" || !(
        url.hostname === "web.push.apple.com" ||
        url.hostname.endsWith(".push.apple.com") ||
        url.hostname === "fcm.googleapis.com" ||
        url.hostname === "updates.push.services.mozilla.com"
      )) throw new Error("Unsupported push service endpoint");

      await webpush.sendNotification({
        endpoint: job.endpoint,
        keys: { p256dh: job.p256dh, auth: job.auth }
      }, JSON.stringify({ mealId: job.meal_id }), { TTL: 3600 });

      const { error: updateError } = await db.from("reading_reminder_jobs")
        .update({ sent_at: new Date().toISOString() }).eq("id", job.job_id);
      if (updateError) throw updateError;
    } catch (sendError) {
      console.error("Reminder delivery failed:", sendError);
      failures++;
      if (sendError && typeof sendError === "object" && "statusCode" in sendError &&
          (sendError.statusCode === 404 || sendError.statusCode === 410)) {
        const { error: deleteError } = await db.from("push_subscriptions")
          .delete().eq("endpoint", job.endpoint);
        if (deleteError) console.error("Could not remove expired subscription:", deleteError);
      }
    }
  }
  return new Response(JSON.stringify({ processed: jobs.length, failures }), {
    status: failures ? 500 : 200,
    headers: { "content-type": "application/json" }
  });
});
