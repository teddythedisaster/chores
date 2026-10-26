# Banner photos

The app picks one photo per day and builds its color scheme from it.

**Where photos come from, in order:** the current holiday's list → the current month's list → the season's list → the built-in illustration.

**Rotation:** each list is shuffled; every photo shows once (one per day, same on phone and laptop), then it reshuffles. A photo never shows two days in a row. Month cycles start on the 1st; holiday windows continue their rotation from one year to the next. Each photo is cropped to fit the screen; `focus` / `phoneFocus` (below) move the crop.

## Folders already set up

- **Months:** `january` … `december`
- **Holidays** (each runs up to and including the day itself): `newyear` (Dec 30–Jan 1), `valentine` (Feb 12–14), `stpatrick` (Mar 15–17, no photos yet, so March's photos show), `easter` (the week before Easter + Easter), `july4` (Jul 2–4), `halloween` (Oct 24–31), `thanksgiving` (the week before + Thanksgiving Day), `winterfest` (Christmas: Dec 11–25)

## Adding photos later

The easiest way: send them to Claude, who will resize them, pull their colors, and update `banners.json` for you.

To do it yourself:
1. Resize to about 2200 px on the long side, saved as a JPG under ~500 KB.
2. Put it in the matching folder, e.g. `october/01.jpg`.
3. Add a line to that month's list in `banners.json`:
   `{"file":"october/01.jpg","w":2200,"h":1467,"credit":"Photographer Name"}`

   `w` and `h` are the pixel size. The colors are worked out automatically the first time the photo shows.

## Optional settings per photo

- `"focus": "center 30%"`: which part stays visible when cropped (the second number moves it up/down).
- `"phoneFocus"`: a separate crop point for the phone.
- `"accent": "#e8a54b"`: force the accent color.
- `"layout": "banner"` or `"background"`: override the automatic choice. Large photos fill the screen; thin strips become a banner.
