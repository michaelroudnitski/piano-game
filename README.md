# Piano Game

[![CI](https://github.com/michaelroudnitski/piano-game/actions/workflows/ci.yml/badge.svg)](https://github.com/michaelroudnitski/piano-game/actions/workflows/ci.yml)

A quick and fun app I wrote that helped me learn to read musical notes. It shows one note on a music staff at a time, and you name it.

**Play it: [pianogame.mroudnitski.com](https://www.pianogame.mroudnitski.com)**

<img width="971" alt="Piano Game (2022 screenshot): a note above a treble staff, with a box below it for typing the note's letter" src="https://user-images.githubusercontent.com/28542979/188705858-db482274-0a1b-4806-b4b1-adf19778d429.png">

## How to play

A note appears on the staff. Name it by typing its letter (`C` through `B`) or by tapping that key on the on-screen piano. The key turns green when you're right and red when you're not, and the game keeps a running score and streak.

## Development

Next.js (pages router), React and Tailwind CSS, in plain JavaScript. There is no backend and there are no accounts.

Bun and Node versions are pinned in [`.tool-versions`](.tool-versions). [mise](https://mise.jdx.dev) installs both:

```bash
mise install
bun install
bun run dev    # http://localhost:3000
```

If mise isn't activated in your shell, prefix commands with `mise exec --`, for example `mise exec -- bun run dev`. Without mise, install Bun 1.x and Node 24 yourself.

| Script | What it does |
| --- | --- |
| `bun run dev` | Start the dev server |
| `bun run build` | Create the production build |
| `bun run start` | Serve the production build |
| `bun run lint` | Lint with ESLint (`eslint.config.mjs`, Next.js `core-web-vitals` preset) |
| `bun run test` | Run the unit tests (`*.test.js`) with Bun's built-in test runner |

GitHub Actions runs install, lint, test and build on every pull request and every push to `main`.

If a build warns that `caniuse-lite` is outdated, `bun update caniuse-lite` refreshes it (lockfile only).

## Project structure

```text
pages/        index.js is the game: state, input handling and layout
components/   UI pieces, such as the staff and clefs, the piano keyboard and the footer
lib/          Plain JavaScript helpers (such as staff geometry), with tests beside them
styles/       globals.css: Tailwind layers and a few keyframes
public/       Favicon and social preview image
```

## Deployment

The live site runs on Vercel. The repo has no Vercel-specific configuration: the app is a static Next.js build with no API routes or environment variables, so importing it into Vercel with the default Next.js settings is enough. Any host that runs Next.js works too. To try the production build locally, run `bun run build` and then `bun run start`.

## License

[Apache 2.0](LICENSE)
