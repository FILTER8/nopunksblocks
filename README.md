# NoPunks Blocks

**Same pixels. New motion.**


This project turns the public
API into an interactive **motion stage**. Builders can load NoPunks,
animate them across multiple layout modes, zoom into the scene, and
export full browser compositions as images.

The project is designed as a lightweight creative interface built on top
of:


-   the NoPunks transformation layer
-   the public NoPunks API

------------------------------------------------------------------------

# What This App Does

This version includes:

-   shared NoPunks visual theme
-   full-screen motion stage
-   random NoPunk loading
-   direct token ID loading
-   pixel parsing from API data
-   multiple animated layout modes
-   zoom and touch interaction
-   client-side rendering
-   full-browser PNG download support

The result is a **creative stage UI** that builders can fork and adapt
into their own project.

------------------------------------------------------------------------

# How It Works

The app loads:

-   pixel data from the NoPunks API
-   token-based image structure from the NoPunks dataset

Each NoPunk is rendered locally as a set of pixel blocks.

Instead of displaying the artwork as a static image only, the stage maps
those pixels into different visual compositions such as:

-   colorblock
-   stardust
-   tiles
-   line
-   gravity
-   punk

Builders can cycle between layouts, zoom the stage, and export the
current browser composition as a PNG.

------------------------------------------------------------------------

# API

Base URL:

https://nopunks.xyz/api/

The app uses the NoPunks API to load token pixel data.

------------------------------------------------------------------------

# What The App Renders

The stage renders each NoPunk from raw pixel data instead of relying on
pre-rendered image files.

Each pixel is drawn as a positioned block in the browser. Those blocks
are then animated into different layouts.

This makes the project useful not only as a viewer, but also as a base
for:

-   generative motion studies
-   interactive gallery experiences
-   remix tools
-   collector interfaces
-   export tools
-   installation-style browser pieces

------------------------------------------------------------------------

# Features

## Random Generator

Loads a random NoPunk from the public supply range.

## Manual Token Loading

Users can enter a token ID directly and load a specific NoPunk.

## Animated Layout Modes

The project includes multiple display modes:

-   Colorblock
-   Stardust
-   Tiles
-   Line
-   Gravity
-   Punk

Each mode repositions the same pixel set in a different way.

## Zoom Interaction

Users can zoom with mouse wheel or touch gestures.

## Local Pixel Rendering

The UI renders NoPunks directly from API pixel data in the browser.

## PNG Export

Users can download the full current browser composition as a PNG
generated client-side.


------------------------------------------------------------------------

# Project Structure

app/ components/ lib/

Main logic lives in the stage component:

-   loads a random NoPunk
-   loads a manual token by ID
-   fetches pixel data
-   maps pixels into animated layouts
-   supports zoom interaction
-   exports the current composition as PNG

------------------------------------------------------------------------

# Links

Website\
https://nopunks.xyz

API\
https://nopunks.xyz/api/

Tool by\
https://x.com/0xfilter8

------------------------------------------------------------------------

# License

CC0
