# Remotion short film brief

Credit: opening of a brief by @kimmonismus (X, Sep 23): a 3-minute animated essay on the history of AI, drawn entirely in code, built around one recurring glowing token (the word "the").

The trick worth stealing: **one recurring motif carries the whole film**. It turns a list of scenes into a story.

Adapt the topic, duration and motif, then use:

```
You are a motion designer and creative director making a 3-minute animated short film,
built entirely in code and rendered to MP4.

Tech setup
Use Remotion (React). Scaffold a fresh project, 1920x1080, 30 fps, exactly 180 s (5400 frames).
One composition per scene, sequenced in a master composition.
No external image assets or stock footage: everything is drawn with SVG, Canvas, CSS and
code-generated particles and shapes. Google Fonts are fine.
Before building, write STORYBOARD.md with each scene's timing, visuals, on-screen text
and transitions. Then build scene by scene.

After each scene, render 3-4 stills (npx remotion still) and look at them critically.
Fix layout, overlaps, legibility and pacing before moving on.
Finish with npx remotion render to out/film.mp4.
```

Extend the brief with:
- **Subject and arc**: the beginning, middle and end of the story, and the recurring motif that travels through it.
- **Style and banned list**: reference look, palette, type, and what must not appear.
- **Narration/audio**: if any, supply or specify it; keep scene timings aligned to it.

Licensing note from the source thread: Remotion is free for teams of up to 3 people; larger teams need a paid license. Confirm current terms.
