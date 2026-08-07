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

DESIGN-SYSTEM.md
DEPLOY.md
tools/

about.html
nirvana.html
nirvana-app.html
nirvana-prototype.html
optivento.html
uniform-customizer.html
work.html
```

`DESIGN-SYSTEM.md` and `tools/` are not part of the site. They are the design system reference and the consistency checker, kept in the repo so the rules travel with the code. GitHub Pages ignores them.

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

- Home loads, the four project thumbnails and the portrait appear
- Work page shows four cards, all four thumbnails render
- Each of the four case studies opens
- On the Nirvana Mudra page, the prototype loads inside the phone frame and you can tap through it
- The résumé link opens `sumeet-gokhale-ux-designer-resume.pdf`
- The Results panel on the homepage renders black with blue figures
- Type a nonsense URL like sumeetgokhale.com/xyz and confirm the styled 404 appears
- Load the site on your phone

If images are missing, the `assets` folder didn't upload completely. Check that it contains 40 files.

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
| Site loads, images missing | The `assets` folder is incomplete. It needs 40 files |
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

## Before you push, run the checker

```bash
python3 tools/check-consistency.py
```

It reads every page and fails if the design system has drifted: two stylesheets, a page declaring its own tokens, a button that is neither primary nor ghost, a contact band with the wrong CTAs, a missing skip link, a broken link, an em dash. It takes under a second and it has caught every regression so far. If it prints `PASS`, push.

---

## Housekeeping already done

- The 22 MB of unused `.png` duplicates has been removed. Every image on the site is WebP.
- The old `docs/` folder, a full second copy of the previous site, has been removed. It was the most likely cause of Google indexing two versions of the same page.
- The superseded `resume.pdf` and `resume-footer.pdf` are gone. There is now one résumé file, linked from every page.
- All seven Open Graph share images exist at 1200x630, so links render properly on LinkedIn.

Any of it can be recovered: `git checkout pre-v2-relaunch -- <path>`.
