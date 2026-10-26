# Home Dashboard: setup (about 15 minutes, one time)

There are three pieces:

- **Google Sheet + Apps Script** (on theopatterson7@gmail.com). Stores your tasks and sends reminders.
- **GitHub Pages**. Hosts the app itself for free.
- **ntfy app** on your Nothing Phone. Receives the reminders.

Inside the zip, `backend/Code.gs` goes into Google, and the `upload-1` and `upload-2` folders go to GitHub.

---

## 1. Google Sheet backend

1. Sign in as **theopatterson7@gmail.com** and open <https://sheets.new>. Name the sheet "Chores".
2. Go to **Extensions → Apps Script**.
3. Delete the starter code in `Code.gs`. Open `backend/Code.gs` from the zip in any text editor, then copy and paste all of it in. Click **Save** (disk icon).
4. Click the **gear (Project Settings)** on the left and set **Time zone** to *(GMT-05:00) Eastern Time – New York*.
5. Back in the **Editor**, choose `setup` in the function dropdown at the top and click **Run**.
   - Google asks for permissions: **Review permissions**, pick theopatterson7, then **Advanced → Go to (project) (unsafe) → Allow**. The warning appears because this is your own unpublished script.
6. The **Execution log** at the bottom prints two lines. Copy both somewhere:
   - `SECRET KEY` (for the app)
   - `NTFY TOPIC` (for the ntfy app)
7. Click **Deploy → New deployment**. Click the gear next to "Select type" and choose **Web app**. Then set:
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Click **Deploy** and copy the **Web app URL** (it ends in `/exec`).

"Anyone" is required for the app to reach the script. Requests without your secret key are rejected.

## 2. Put the app on GitHub Pages

1. Make a free account at <https://github.com/signup> if you don't have one.
2. Click **+ → New repository**. Name it `chores`, set it to **Public**, and click **Create repository**.
3. GitHub accepts up to 100 files per upload, so the zip comes pre-split into two batches:
   - On the new repo page, click **uploading an existing file**. Open the `upload-1` folder from the zip, select **everything inside it**, drag it onto the page, and click **Commit changes**.
   - Click **Add file → Upload files**. Open `upload-2`, drag the **`banners` folder** inside it onto the page, and click **Commit changes**. It merges into the `banners` folder from batch 1.
4. Go to repo **Settings → Pages**. Under *Branch*, choose **main** and **/(root)**, then click **Save**.
5. After about a minute your app is live at `https://YOUR-USERNAME.github.io/chores/`.

The code is public, but none of your tasks or keys are in it. Those live only in your Sheet and on your devices.

## 3. Connect your laptop and phone

1. On your laptop, open the app URL. Tap the **gear**, paste the **Web app URL** and **Secret key**, and tap **Connect**.
2. Still in settings, tap **Copy link** under *Link for your other device*. Send it to yourself (e.g. email it) and open it in **Chrome on your phone**. That connects the phone automatically. Keep the link private.
3. On the phone, open Chrome's **⋮ menu → Add to Home screen → Install**. It now opens full-screen like a normal app.

## 4. Phone reminders (ntfy)

1. Install **ntfy** from the Play Store.
2. Tap **+** and enter your **NTFY TOPIC** exactly. Leave *Use another server* off, turn **Instant delivery** on, and tap **Subscribe**.
3. On the Nothing Phone, go to **Settings → Apps → ntfy → Battery** and set it to **Unrestricted**, so Android doesn't delay notifications.
4. In the dashboard's settings, tap **Send test notification**. It should arrive within a few seconds.

Reminders are checked every 5 minutes. A task with **Phone reminder** on and a time set will notify within 5 minutes of that time, unless it's already Done or Not needed. Tapping the notification opens the app.

---

## Using it

**Pages** (a bottom bar on the phone, a tab row on the laptop; on the phone you can also swipe left/right):

- **Overview**: both charts, today's and this week's to-dos, and up to 5 **pinned streaks** (plus Lists on the laptop).
- **Today**: a big progress chart (as you scroll it collapses into a slim horizontal bar with counts, and the list slides under it), today's to-dos with overdue ones on top, a Yesterday · Today · Tomorrow calendar (tap a task to set its status), **Notes**, and **Streaks**.
- **Week**: the week chart, the next 7 days of tasks that can be done early, and the week calendar (every task's icon is shown; on a very full day the daily repeats are hidden so one-off tasks stand out).
- **Tags**: the page title is the selected view (Plans, Cleaning, Hygiene, Cat & plants). Each shows today's tasks, what's coming up, every task with that tag, and its streaks. Reorder, rename, or add views in Settings → Tag views (drag the ⋮⋮ handle).
- **Lists**: checklists for things without a due date (shopping, packing, gift ideas). Every list has its own titled section on the page; the chips at the top show (bright, outlined) or hide (grayed out) each one, per device; **+** at the end of the chips adds a list, and **⋯** next to a list's title renames or deletes it. Type in "Add item" and press Enter; tick items off, then "Clear checked". Long lists (more than 8 items) tuck checked items away behind "N checked · Show". Lists aren't tasks, so they don't appear in charts, calendars or reminders.

**Tasks**

- **Status pill**: tap to set Not started / 25% / 50% / 75% / Done / Not needed. Done and Not needed tasks drop out of the to-do lists (they stay in the charts and calendars); tap "N finished · Show" to see them again.
- **Task name**: tap to edit (icon, repeat, category, early, reminder, streak, notes).
- **Category**: tap the field to pick from your categories or type to filter; typing something new offers "Create …". Rename or delete categories in Settings → Categories (deleting clears it from tasks that use it).
- **Overdue** tasks sit at the top of Today with their original due date in red.

**Streaks** (turn on **Track streak** in a repeating task; optionally set a goal)

- **Done** adds 1. **25/50/75%** keeps the streak alive without adding. **Not needed** pauses it. A task due today never breaks the streak until the day is over.
- **Grace days** (like LinkedIn's streak freezes): every 6 Done in a row earns one, and you can bank up to 3 (the shields). A missed day automatically uses one instead of resetting the streak.
- **Setting a goal**: tap a task (or its streak card) to open it, make sure **Track streak** is on, then type a number in **Streak goal** (e.g. 30) and Save. Cards without a goal say "No goal yet · tap to set one".
- With a goal, a progress bar fills up; reaching it shows a "Goal reached" message and the streak keeps counting.
- **Pin to Overview** (in the task editor) puts up to 5 streaks at the bottom of Overview.
- Only the current streak is shown; there's no "best ever" number.
- The row of squares is the last 14 times the task was due: green = done (ringed = earned a grace day), yellow = partly done, blue = paused, accent = grace day used, red outline = missed, dashed = today.

**Look**

- The theme follows the **month**. Holidays take over leading up to the day: a week for Easter, Halloween, and Thanksgiving; two weeks for Christmas; two days for Valentine's, St. Patrick's, New Year's, and the 4th. Settings → Theme can pin a month instead.
- Falling particles can be turned off in Settings → Falling particles.
- Settings → **Month & holiday icons**: tap any month or holiday to search for a new icon. `month-icon-ideas.html` has seasonal suggestions.
- Falling leaves, petals, or snow can be turned off per device under *Seasonal animation*.

## Banner photos

Your 132 photos are already set up (all 12 months plus 7 holidays). Photos are shuffled: each one shows once (one per day, the same on phone and laptop) before the list reshuffles, and the same photo never appears two days in a row. The whole color scheme comes from the day's photo. Photos fill the screen behind frosted panels, cropped to fit; a few have custom crop points so the subject stays in view. Settings → Photo layout can force a banner or full background.

## Icons

Tap the icon square in a task to search about 4,900 solid icons: Font Awesome first, with Material Symbols for extra variety. Search with plain words like *laundry*, *meds*, *trash*, *vacuum*, or *cat*. Icon color follows the task's category by default; pick a swatch to override it for a single task.

## Home-screen icon that follows the month (optional)

A small GitHub job runs once a day and points the installed app's icon at the current month's or holiday's icon, in black and white. If the Google Sheet is connected, it uses the icons you picked in Settings.

1. Upload the `tools` folder (it contains `app-icon.mjs`) to the top level of your repository.
2. Click **Add file → Create new file**. In the name box type `.github/workflows/app-icon.yml` (the slashes create the folders). Open `app-icon.yml.txt` from the zip, copy everything, paste it in, and click **Commit changes**.
3. Optional, for the icons you pick in Settings: in the repository go to **Settings → Secrets and variables → Actions → New repository secret** and add two secrets:
   - `APP_URL`: your Apps Script web app URL (ends in `/exec`)
   - `APP_KEY`: your secret key
4. Run it once now: **Actions** tab → **Update app icon** → **Run workflow**. (If Actions asks to be enabled, allow it.)
5. On your phone, open the app. Within about a day, Chrome offers the new icon (a prompt, or **Review app update** in Chrome's ⋮ menu). Accept it. Updates are applied while the app is closed and the phone is on Wi‑Fi and charging.

After that it runs by itself every night. If you change an icon in Settings and don't want to wait, run it by hand (step 4).



- **App changes** (layout, colors): edit the file, then in your GitHub repo use **Add file → Upload files** with the same filename to replace it. Your phone picks it up the next time you open the app (about a minute after upload).
  - Season colors and status-tag colors: `themes.js` (top of file).
  - Status names: `STATUSES` in `themes.js`.
- **Backend changes** (`Code.gs`): paste the new code, then **Deploy → Manage deployments → pencil icon → Version: New version → Deploy**. This keeps the same URL, so you don't need to reconnect.

## Troubleshooting

- **Cloud icon has a slash**: "not connected" or "offline". Changes are saved on the device and sync automatically when back online. A number badge shows how many changes are waiting.
- **"Could not connect"**: check that the URL ends in `/exec`, the deployment access is **Anyone**, and the key matches. Run `showSetupInfo` in Apps Script to print the key again.
- **No notifications**: check the topic name matches exactly and ntfy's battery setting is Unrestricted. Also confirm the time trigger exists (Apps Script → **Triggers**, alarm-clock icon: `checkReminders`, every 5 minutes).
