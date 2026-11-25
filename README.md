# PixelPets

A bright companion village in the original world of **Lumenwick**. Hatch or adopt up to four friends, earn **Glims**, and wander Harborlight, Mossglen, Cinderreach, and Silvershoal.

The site is a Vite + React + TypeScript app. Live data is Supabase (Auth, Postgres, RLS). Nothing here uses another pet site's names, art, or layout.

## Sample town

Open the built site with `?demo=1` to click through a full town before the database exists. `?demo=1&as=Sender` previews the steward desk. The sample stays in the browser.

## Scripts

```bash
npm install
npm run dev
npm run build
```

Production base path is `/pixelpets/`. The build copies `dist/index.html` to `dist/404.html` so GitHub Pages can boot deep links.

## GitHub Pages

After this is on `main`, enable Pages with **Source: GitHub Actions**. The workflow `.github/workflows/pages.yml` builds and deploys on every push to `main`.

The public URL is [https://mjmasters91.github.io/pixelpets/](https://mjmasters91.github.io/pixelpets/).

## Supabase

Defaults (override with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`):

- URL: `https://esutqfkoyleeazzmjejt.supabase.co`
- Publishable key: the value in `.env.example`

Never put a `service_role` key or an `sb_secret_` key in a `VITE_` variable. The app refuses to boot if it sees one.

Apply the SQL files in `supabase/migrations/` yourself, in filename order, in the SQL editor. They create the schema, RLS, and security-definer RPCs. The seed is catalog data only. It does not create accounts.

Then, in Authentication → URL configuration:

- Site URL: `https://mjmasters91.github.io/pixelpets/`
- Redirect URL: `https://mjmasters91.github.io/pixelpets/`

Email confirmation can stay on. Sign up as `Sender`, then promote that keeper in the SQL editor and confirm exactly one row changed:

```sql
update public.profiles
set is_admin = true
where lower(username) = 'sender';
```

A missing auth session is treated as a signed-out visitor.

## Art

Species portraits live in `public/art/species/`. Backgrounds are keyed out. **Natural** shows each species' own colors. The other eight tints are runtime hue shifts from that base, so markings stay in step with the coat.
