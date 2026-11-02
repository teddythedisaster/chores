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

**First, give the script your own ntfy account.** ntfy.sh rejects many messages sent from Google's shared servers, unless they come with an access token:

1. On <https://ntfy.sh>, click **Sign up** and make a free account.
2. Open **Account → Access tokens → Create access token**. No expiry is fine. Copy the token (it starts with `tk_`).
3. In Apps Script, click the **gear (Project Settings)**, scroll to **Script properties**, click **Add script property**, and enter `NTFY_TOKEN` as the property and the token as the value. Click **Save script properties**.

Your phone keeps the same topic, so nothing changes in the ntfy app. Settings → Reminders shows ✓ "Sending with your ntfy account" once it's set.

1. Install **ntfy** from the Play Store.
2. Tap **+** and enter your **NTFY TOPIC** exactly. Leave *Use another server* off, turn **Instant delivery** on, and tap **Subscribe**.
3. On the Nothing Phone, go to **Settings → Apps → ntfy → Battery** and set it to **Unrestricted**, so Android doesn't delay notifications.
4. In the dashboard's settings, tap **Send test notification**. It should arrive within a few seconds.

Reminders are checked every 5 minutes, and each one is handed to ntfy up to 20 minutes ahead with its exact time, so it arrives on the minute even when Google's check runs late. If you finish a task before its reminder goes out, the reminder is cancelled (on rare occasions one may still arrive). Turn on **Phone reminder** under More options. Set **Remind me at** to get the reminder at its own time, whether or not the task has a time. Leave it blank to be reminded at the task's time. It arrives within 5 minutes of that time, unless the task is already Done or Not needed. Tapping the notification opens the app.

---

## Using it

**Pages** (a bottom bar on the phone, the top bar on a laptop; on the phone you can also swipe left/right): Overview, Today, Week and Lists.

**Tag filter**: the buttons under the page title (All, Plans, Cleaning, …) filter the page, including its charts and calendars, to one tag, and the title shows it ("Today • Cleaning"). Edit the tags with the ✎ button (Settings → Tags & categories).

**On a laptop** (any window at least 700 px wide, including half a screen) the app switches to a Notion-style layout with two tabs in the top bar:

- **Home**: To-do Progress (two rings when there's room, bars when the column beside it is short), next to **Anytime** and the lists you've put on Home; then Today's and This Week's To-do; then the week calendar (click a task to set its status; missed ones are crossed out); then Pinned streaks.
- **Lists**: every list side by side, plus **Today's Notes** (the same notes as the phone's Today tab). The ⌂ **On Home** button picks which lists appear on Home (it syncs, but the phone ignores it).
- Settings opens as a panel on the right, and **New task** is in the top bar.

- **Which list shows what**: Today's To-do is everything due today plus overdue ones. On Overview and the laptop's Home, This Week's To-do is only what comes after today (no everyday tasks, nothing already in Today's list). The week chart everywhere counts today's tasks plus later ones you can already start. **Plans** are the exception to "one row per task": a repeating plan shows on every date it falls on this week, even if it's also on today's list.
- **Overview**: both charts, today's and this week's to-dos, **Anytime** (tasks with no date), and up to 5 **pinned streaks** (plus Lists on the laptop).
- **Today**: a big progress chart (as you scroll it collapses into a slim horizontal bar with counts, and the list slides under it), today's to-dos with overdue ones on top and, at the bottom under **Can get ahead on**, tasks from later in the week that can already be started (these don't count in Today's chart; Overview and the laptop leave this section out, since This Week's To-do is right beside it), a Yesterday · Today · Tomorrow calendar (tap a task to set its status), **Notes**, and **Streaks**.
- **Week**: everything due today (everyday tasks and overdue ones included), then the next 6 days, where everyday tasks are left out so they don't repeat. A repeating task shows once. What you can start now comes first; later ones are faded with when they open up ("from Thu"). The calendar shows every task's icon; on a very full day the daily repeats are hidden so one-off tasks stand out.
- **Lists**: tap ☰ at the start of the chips for **Your lists**: drag to reorder, show or hide each list (or all at once) on this device, and rename or delete. The **+** button on the Lists tab makes a new list. Checklists for things without a due date (shopping, packing, gift ideas). Every list has its own titled section; the chips at the top show (bright, outlined) or hide (grayed out) each one, per device; **+** at the end of the chips adds a list, and **⋯** next to a list's title renames or deletes it. Type in "Add item" and press Enter (or just close the keyboard, and what you typed becomes the item). Long items wrap onto more lines. To delete an item, **swipe it left** and tap the red ✕ (on a laptop, hover over it). Tick items off, then "Clear checked". Long lists (more than 8 items) tuck checked items away behind "N checked · Show". Lists aren't tasks, so they don't appear in charts, calendars or reminders.

**Charts**: tap a chart to see its tasks grouped into Still to do, Missed, Done and Not needed; tap a color to jump to that group. The ‹ arrow at the top left goes back.

**Can get ahead on** (phone Today tab) folds away with a tap on its header, and stays folded or open on that device.

**New tasks**: the editor starts simple (name, icon, date and time or **No date**, category). Tap **More options** for repeating, how early it can start, phone reminder, streak, icon color and notes. The button lists what's already set, and it stays open or closed the way you last left it.

**Tasks**

- **Status pill**: tap to set Not started / 25% / 50% / 75% / Done / Not needed / Missed. Finished tasks drop out of the to-do lists (they stay in the charts and calendars); tap "N finished · Show" to see them again.
- **Missed**: when a repeating task wasn't finished and its next repeat can already be started, the old one becomes Missed by itself: it leaves the overdue list and is crossed out in the calendars. You can also pick Missed yourself. Changing it to Done later counts it as done, and the streak and any shield come back.
- **Reorder**: long-press a task with no time and drag it up or down among that day's other untimed tasks. The order sticks for future repeats. Checklist items in Lists and Notes reorder the same way.
- **Duplicate**: open a task and tap **Duplicate** (next to Delete) to start a new task with the same settings.
- **Task name**: tap to edit it.
- **Just one day of a repeating task**: tap the task in a list and choose **Just [day]** at the top of the editor. You can rename it, change its icon, color, time or notes, or move it to another date, and the other repeats stay the same. A ✎ marks changed days. **Undo changes for this day** puts it back; **Skip this day** marks it Not needed.
- **Can start N days before it's due** (More options): 0 means only on the day. Until then the task is faded in This Week's To-do and left out of the week chart.
- **No date**: for one-time tasks. It sits in the Anytime section on Overview until it's done.
- **Weekly repeats**: you can untick every day before picking new ones; Save waits until at least one day is picked, and closing without one asks first.
- **Category**: tap the field to pick from your categories or type to filter; typing something new offers "Create …". Rename or delete categories in Settings → Categories (deleting clears it from tasks that use it).
- **Tag and category colors**: in Settings → Tags & categories, tap a tag’s icon: pick an icon, then pick its color (or tap **Just change the color**). Tasks in that tag use the color unless a task has its own. Under Categories on the same page, tap the colored dot next to any category to change just that one.
- **Overdue** tasks sit at the top of Today with their original due date in red.

**Streaks** (More options in a repeating task → **Track streak**)

- **Done** adds 1. **25/50/75%** keeps the streak alive without adding. **Not needed** pauses it. A task due today never breaks the streak until the day is over.
- **Shields** (like LinkedIn's streak freezes): a run of Done in a row earns one, and a missed day uses one instead of resetting the streak. By default you earn one every 6 and can save up 3. Change the defaults in **Settings → Streak shields**, or give one task its own numbers under More options (**Shields** and **Earn one every**; leave blank to use the defaults; 0 shields turns them off).
- **Goal** (optional): a number of days in a row. A progress bar fills up; reaching it shows a "Goal reached" message and the streak keeps counting.
- **Pin to Overview** puts up to 5 streaks at the bottom of Overview.
- Only the current streak is shown; there's no "best ever" number.
- The row of squares is the last 14 times the task was due: green = done, yellow = partly done, blue = paused, accent = shield used, red outline = missed, dashed = today.

**Look**

- The theme follows the **month**. Holidays take over leading up to the day: a week for Easter, Halloween, and Thanksgiving; two weeks for Christmas; two days for Valentine's, St. Patrick's, New Year's, and the 4th. Settings → Theme can pin a month instead.
- Falling leaves, petals, snow and sparkles can be turned off per device in Settings → Falling particles.
- The short gray notes under section titles can be turned off in Settings → Look & theme → **Section descriptions**.
- **Settings** is a menu: Look & theme, Tags & categories, Streaks, Reminders, Sync & devices and Data; each opens its own page.
- **Photos** (Settings → Look & theme → Photos):
  - **Layout** is chosen per device, so the laptop can use the full background while the phone stays on Auto.
  - **Today's photo** has a **Take out of rotation** button.
  - Pick any month or holiday to see its photos; tap one to take it out or put it back.
  - **Add photos** uploads your own: they're resized in the browser, saved to a "Home Dashboard photos" folder in your Google Drive, and join that month's rotation on every device. Anyone with a photo's exact link can view it. Photos you added have a 🗑 to delete them.
- Settings → **Month & holiday icons**: tap any month or holiday to search for a new icon. `month-icon-ideas.html` has seasonal suggestions.

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

## Adding your own photos: one-time Drive approval

The first time you use **Add photos**, the Google script needs permission to save to your Drive:

1. In Apps Script, paste the new `Code.gs` and click **Save**.
2. Choose `authorizeDrive` in the function dropdown and click **Run**. Approve the permissions (same steps as during setup).
3. **Deploy → Manage deployments → pencil → Version: New version → Deploy.**

## Making changes

- **App changes** (layout, colors): edit the file, then in your GitHub repo use **Add file → Upload files** with the same filename to replace it. Your phone picks it up the next time you open the app (about a minute after upload).
  - Season colors and status-tag colors: `themes.js` (top of file).
  - Status names: `STATUSES` in `themes.js`.
- **Backend changes** (`Code.gs`): paste the new code, then **Deploy → Manage deployments → pencil icon → Version: New version → Deploy**. This keeps the same URL, so you don't need to reconnect.

## Troubleshooting

- **Red "script is out of date" bar**: the Google Sheet is running an older Code.gs, so newer fields (icons, streaks, one-day changes) don't save. Paste the new `Code.gs` into Apps Script, then **Deploy → Manage deployments → pencil → Version: New version → Deploy**.

- **Cloud icon has a slash**: "not connected" or "offline". Changes are saved on the device and sync automatically when back online. A number badge shows how many changes are waiting.
- **"Could not connect"**: check that the URL ends in `/exec`, the deployment access is **Anyone**, and the key matches. Run `showSetupInfo` in Apps Script to print the key again.
- **No notifications**: open Settings → **Reminders**. It shows whether the 5-minute reminder check is running (with a button to turn it back on if not), the last reminder sent, and what's set to remind today, flagging reminders that have no time. Then: check the topic name matches exactly and ntfy's battery setting is Unrestricted. Also confirm the time trigger exists (Apps Script → **Triggers**, alarm-clock icon: `checkReminders`, every 5 minutes).
