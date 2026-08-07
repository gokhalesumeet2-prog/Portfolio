# Going live on sumeetgokhale.com

You've uploaded the new files to GitHub. This is what's left.

---

## Step 1: check for leftovers from the old site

This is the one thing that will quietly hurt you if you skip it.

The new site renamed every page. If the old files are still sitting in the repo alongside the new ones, Google will index both versions and split your ranking between them. Uploading new files does not remove old ones.

Open your repo on github.com and look at the root file list. It should contain **exactly** this and nothing else:

```
404.html
CNAME
assets/
about-sumeet-gokhale-ux-designer/
galls-uniform-customizer-ecommerce-ux-case-study/
index.html
nirvana-meditation-app-habit-design-case-study/
nirvana-mudra-recommendation-engine-case-study/
optivento-restaurant-inventory-management-ux-case-study/
ux-design-case-studies/
robots.txt
sitemap.xml

about.html
nirvana.html
nirvana-app.html
nirvana-prototype.html
optivento.html
uniform-customizer.html
work.html
```

Those last seven `.html` files look like the old site but they are not. They are redirect stubs I wrote. Anyone landing on an old link gets forwarded to the new page, and they are marked `noindex` so Google ignores them. **Keep them.**

Anything else at the root — a stray `styles.css`, an old `contact.html`, a `js/` folder, an `images/` folder — is left over from the old site. Delete it: click the file on github.com, then the trash icon, then Commit changes.

Quick way to tell a stub from a real leftover: click the file. A stub is about 14 lines and contains the word "Redirecting". A leftover is hundreds of lines.

---

## Step 2: confirm GitHub Pages is switched on

In your repo: **Settings** → **Pages** (left sidebar).

- Source: `Deploy from a branch`
- Branch: `main`, folder `/ (root)`
- Save

If it was already on, leave it.

---

## Step 3: confirm the domain

Same page, **Custom domain** should read `sumeetgokhale.com`. If it's empty, type it in and Save.

The `CNAME` file in your repo does this automatically, so it's probably already correct. Once the green check appears, tick **Enforce HTTPS**. That checkbox can take up to an hour to become available on a fresh domain.

---

## Step 4: watch the deploy

Click the **Actions** tab in your repo. There'll be a run at the top. Orange dot means building, green tick means live. Usually 60 to 90 seconds.

Then open https://sumeetgokhale.com. If you see the old site, press **Cmd + Shift + R** to force a fresh load past your browser cache.

---

## Step 5: click through everything once

Five minutes, worth doing:

- Home loads, brush graphics and portrait appear
- Work page shows four cards, all four thumbnails render
- Each of the four case studies opens
- On the Nirvana Mudra page, the prototype loads inside the phone frame and you can tap through it
- Both resume PDF links download
- Type a nonsense URL like sumeetgokhale.com/xyz and confirm the styled 404 appears
- Load the site on your phone

If images are missing, the `assets` folder didn't upload completely. Check that it contains 41 files.

---

## Step 6: get Google to find it

This is the part that actually produces search traffic. Do it once, today.

**Google Search Console** — https://search.google.com/search-console

Add property → Domain → `sumeetgokhale.com` → verify with the TXT record it gives you (add it at your domain registrar). Then:

- **Sitemaps** → submit `sitemap.xml`
- **URL Inspection** → paste each of your seven page URLs → **Request indexing**

Requesting indexing manually is the difference between showing up in days versus weeks.

**Bing Webmaster Tools** — https://www.bing.com/webmasters — import straight from Search Console. Bing feeds several AI search tools, so it's worth the two minutes.

**Point real links at the site.** Search engines rank pages that other sites vouch for. Update the website field on LinkedIn, Behance, Dribbble, Medium, your GitHub profile and your email signature. Link to individual case studies, not just the homepage.

**Check the social previews** at https://www.opengraph.xyz — paste a case study URL and confirm the image and title render. This is what shows when someone shares your work in Slack or on LinkedIn.

**Check speed** at https://pagespeed.web.dev — should score high. Every image is WebP with explicit dimensions, so there's no layout shift.

---

## Every future update

```bash
cd "/path/to/your/repo"
git add -A
git commit -m "Describe what changed"
git push
```

Live in one to two minutes.

Or on github.com: navigate to the file, pencil icon, edit, Commit changes.

---

## If something goes wrong

| Symptom | Cause and fix |
|---|---|
| 404 on the whole site | Pages is off, or `index.html` isn't at the repo root |
| Site loads, images missing | The `assets` folder is incomplete. It needs 41 files |
| Old pages still appear | Browser cache. Cmd + Shift + R |
| Two versions of a page in Google | Old files still in the repo. Go back to Step 1 |
| Domain still shows Wix | Old Wix DNS records at your registrar. Remove them |
| Prototype panel is blank | The `prototype` folder must stay inside `nirvana-mudra-recommendation-engine-case-study/` |
| Certificate warning | Untick and re-tick Enforce HTTPS, wait an hour |
| Case study links 404 | A folder uploaded without its `index.html` inside it |

---

## DNS reference

Only needed if the domain isn't already pointing at GitHub. At your registrar:

| Type  | Name  | Value                     |
|-------|-------|---------------------------|
| A     | `@`   | `185.199.108.153`         |
| A     | `@`   | `185.199.109.153`         |
| A     | `@`   | `185.199.110.153`         |
| A     | `@`   | `185.199.111.153`         |
| CNAME | `www` | `sumeetgokhale.github.io` |

Remove any old Wix records first, or the domain will keep resolving to Wix. DNS changes take anywhere from minutes to a day.

---

## Optional cleanup

The `.png` files in `assets/` are unused duplicates of the `.webp` versions and add roughly 22 MB. Safe to delete. Same for `assets/work-nirvana-app.svg`, which the photo thumbnail replaced.

Don't upload this file (`DEPLOY.md`) to the repo. It's working notes, not part of the site.
