# Quick launch video brief

Credit: Deedy (X, Sep 23): a 26-second launch video for an inference startup, about 1 minute of work and about $2, from this entire prompt:

```
make a modern slick and punchy video for a modern startup that works on inference
Stack: JavaScript, Playwright and ffmpeg. No video model, no extra libraries.
```

Use a one-liner only for **short kinetic-type launch videos** where the user does not mind a generic look. For anything longer or on-brand, use a structured template (`ui-morph-loop.md`, `remotion-short-film.md`) and add: a named reference, a banned list, timing numbers, a storyboard, and the self-check loop.

Minimum upgrade over the raw one-liner (do these even for short pieces):
1. Ask for the product name, one-line value prop, brand colour and any reference style.
2. Write a short storyboard with per-beat timings and get a quick OK.
3. Make every frame a pure function of time; render with Playwright and stitch with ffmpeg.
4. Review sampled stills before the final render.
