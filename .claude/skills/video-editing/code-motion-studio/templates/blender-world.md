# Blender world brief

Credit: prompt by Alex Albert (X, Sep 22): a historically accurate Market Street, San Francisco, April 17, 1906, built in Blender from one prompt. He also reported making claymation in Blender from a single prompt in claude.ai.

Structure that matters: **build the data first, then write generators, then assemble.** Every object must trace back to a source record.

Swap in your own place, date and sources:

```
Recreate Market Street, San Francisco as it stood on April 17, 1906, the afternoon before the earthquake, in Blender.

Scope: the Ferry Building up Market to Fifth Street, including the Palace Hotel, the Call Building, the Chronicle Building, Lotta's Fountain and the Emporium.

Before modeling anything, build a source file from: the 1899-1905 Sanborn fire insurance maps (footprints, heights, materials, occupants), the Miles Brothers film "A Trip Down Market Street" (April 1906), period photographs from OpenSFHistory, the Library of Congress and the David Rumsey collection, and USGS topography. Record every building with footprint, height, facade material, occupant, and the source for each fact with a confidence level.

Build everything in Blender Python. No downloaded meshes, textures or HDRIs. Write reusable generators (Victorian commercial facade, mansard roof, bay windows, awnings, painted signage, gas and electric street lamps, cable car, horse-drawn wagon, early automobile) and assemble the street from the source file, so every building traces back to data.

Provide a 10 second video up the street.
```

Notes:
- The "historical accuracy" part requires research access. If web access is blocked, say so and ask the user to supply sources rather than inventing data; mark every fact's confidence honestly.
- Claymation variant: a Blender claymation skill exists (`angrypenguinpng/blender-claymation-skill`, per the source thread; unverified).
- Self-check: render stills from the camera path, review them, and fix scale, clipping and lighting before the final render.
