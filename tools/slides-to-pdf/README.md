# slides-to-pdf

Converts every reveal.js deck in `slides/<deck>/index.html` to a PDF in
`slides/pdf/<deck>.pdf`, one page per slide.

It serves the repository through a small local HTTP server and prints each
deck with reveal.js's `?print-pdf` mode in a headless Chrome / Edge /
Chromium that is already installed on the machine (no browser download).
SVG step animations (`.anim-step`) are shown in their final state.

## Usage

```bash
cd tools/slides-to-pdf
npm install
npm run export              # all decks
npm run export -- p20 e1    # only decks whose folder name contains "p20" or "e1"
```

Then commit the updated files in `slides/pdf/`.

Options (environment variables):

| Variable | Effect |
|---|---|
| `CHROME_PATH` | Browser executable, if it is not found automatically. |
| `SEPARATE_FRAGMENTS=1` | One page per fragment step instead of one per slide. |
