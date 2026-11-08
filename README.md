# SallyClient-Extras
Partner Icons and some other stuff for SallyClient

## Servers

Servers in here show up in SallyClient with their own banner. Featured ones also get added
to everyone's server list (once, if someone removes it it stays removed).

Want your server in? Make a PR:

1. Copy `template/` to `servers/<id>/`. The id is lowercase letters, numbers and `-` (like `gommehd`)
2. Fill out `server.json`
3. Add `banner.jpg` or `banner.png`, **480x232** or **960x464**, max **300 KB**
4. Open the PR, the check tells you if something is wrong

No idea how PRs work? Just open an issue with the server form and I'll add it.

| field | |
|---|---|
| `name` | max 32 chars |
| `address` | what players join with, `play.example.net` or `play.example.net:25566` |
| `description` | optional, max 120 chars |
| `languages` | optional, like `["de", "en"]` |
| `featured` | leave it `false`, I set that |

Only add your own server or one you have permission for, same for the banner.
After merge it's live in the client within ~10 min.

You can run the check yourself with `node scripts/check.mjs`.
