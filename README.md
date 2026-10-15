# Teleprompter

A minimal web teleprompter. No build step, no dependencies — just static files.

## Run locally

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>.

(Any static server works, e.g. `npx serve`.)

## Features

- **Script editor with line numbers** — paste or type your script; every line is numbered, including wrapped lines.
- **Timed scroll** — set how long the whole script should take (in minutes). Scroll speed is computed automatically so the full text scrolls in exactly that time.
- **Text size** — adjust the prompter font size while writing or while prompting.

## Controls

- `Start` — open the prompter.
- `Space` — play / pause (while prompting).
- `Esc` — exit the prompter.
- `Restart` — jump back to the top.
- `Fullscreen` — full-screen the prompter.

Your script, duration, and text size are remembered in `localStorage`.
