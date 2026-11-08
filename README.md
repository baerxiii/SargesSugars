# SargesSugars

## Two-hour reading reminders

Reminders are sent about two hours after a meal is saved without an after-meal
reading, to devices already subscribed for that account. A completed or deleted
meal is skipped. Delivery can be delayed by the push service or device settings;
do not rely on it as the only medical reminder. The notification does not contain
glucose values or food details. Opening it links to the associated meal's
reading dialog. In-flight notifications may still arrive if a reading is entered
at the same time as delivery. Failed deliveries are retried while the meal is
pending, for up to 24 hours; occasional duplicates are possible.

On iPhone, use iOS 16.4 or newer: open the site in Safari, tap Share, choose Add
to Home Screen, then open it from the Home Screen. Sign in, open Settings and tap
**Enable reminders on this device**; allow notifications when asked. Repeat on
each device. Enable reminders before saving the meal. To stop them, use the
disable button in Settings while signed in on the same device.

### Supabase setup (project owner)

The site changes alone do not enable reminders. Deploy the following to the
existing project `cujvvxyadxvlfvhgzlki`. Never commit or share the private key,
cron secret, database password, or service role key. Take a database backup
first; the SQL assumes `public.meals.id` is `bigint` and its `user_id` is the
authenticated user's UUID. Test this setup before relying on it.

1. In Supabase's SQL Editor, run the contents of
   `supabase/migrations/20261108190000_reading_reminders.sql` once. The existing
   `meals` table must already exist. Resolve any error rather than proceeding.
2. On your computer, install Node.js and the Supabase CLI, download this
   repository, open a terminal in it, then run `npx web-push generate-vapid-keys`.
   Save the public and private keys securely. In SQL Editor, run the following
   after replacing the placeholder with the generated **public** key:

   ```sql
   insert into public.push_config (id, public_key)
   values (true, 'YOUR_VAPID_PUBLIC_KEY');
   ```

3. Generate a long random cron secret locally, for example
   `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.
   Authenticate and link the Supabase CLI:

   ```sh
   npx supabase login
   npx supabase link --project-ref cujvvxyadxvlfvhgzlki
   ```

   Set the function secrets in the Supabase dashboard under Edge Functions >
   Secrets, or use `npx supabase secrets set` for `VAPID_PUBLIC_KEY`,
   `VAPID_PRIVATE_KEY`, and `REMINDER_CRON_SECRET`. Use the same public key as
   in step 2 and the random cron secret above. Supabase supplies `SUPABASE_URL`
   and `SUPABASE_SERVICE_ROLE_KEY` automatically. Deploy the function:

   ```sh
   npx supabase functions deploy send-reading-reminders --no-verify-jwt
   ```

   The function checks the separate cron secret itself. Do not expose it in the
   browser or use the publishable key as the cron secret.
4. Enable `pg_cron`, `pg_net`, and Vault in the Supabase dashboard if needed.
   In SQL Editor, replace the secret placeholder below with the same cron secret,
   then run this once. Vault stores it encrypted; the scheduled request contains
   the decrypted value temporarily in the `pg_net` queue, which database login
   roles can read. Restrict database access accordingly.

   ```sql
   select vault.create_secret('YOUR_CRON_SECRET', 'reading_reminder_cron_secret');
   select cron.schedule(
     'send-reading-reminders',
     '* * * * *',
     $job$
       select net.http_post(
         url := 'https://cujvvxyadxvlfvhgzlki.supabase.co/functions/v1/send-reading-reminders',
         headers := jsonb_build_object(
           'Content-Type', 'application/json',
           'x-reminder-secret', (select decrypted_secret from vault.decrypted_secrets
                                 where name = 'reading_reminder_cron_secret')
         ),
         body := '{}'::jsonb,
         timeout_milliseconds := 30000
       );
     $job$
   );
   ```

5. Publish the site changes, enable notifications on the iPhone, and save a
   test meal with the after-reading blank. Check that the reminder arrives after
   about two hours and opens that meal. Save another meal and enter its
   after-reading early to confirm it does not produce a reminder. Inspect Edge
   Function logs and the `cron.job_run_details` and `net._http_response` tables
   if delivery fails. A 200 response means the push service accepted the request,
   not that the phone displayed it.