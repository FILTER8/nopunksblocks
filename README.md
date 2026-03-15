# YesPunks Filter Generator

**Same data. New light.**

This starter is a more creative builder template for the **YesPunks API**.

Instead of only loading a random YesPunk, it turns the API into a **filter-based generator**. Builders can explore traits, select visual attributes, and generate matching YesPunks directly from the public data layer.

The project is designed as a lightweight creative interface built on top of:

- the original CryptoPunks dataset
- the YesPunks transformation layer
- the public YesPunks API

---

# What This Starter Does

This version includes:

- shared YesPunks visual theme
- YesPunks header and typography
- random YesPunk loading
- trait parsing from API metadata
- trait-based filtering
- filtered regeneration logic
- client-side SVG rendering
- PNG download support

The result is a **creative generator UI** that builders can fork and adapt into their own project.

---

# How It Works

The app loads:

- pixel data from the YesPunks API
- metadata and trait strings from the YesPunks API

Traits are parsed from the metadata response and displayed as selectable filters.

When one or more traits are selected, the generator searches for another YesPunk that matches all selected traits.

If no filters are selected, the generator simply loads a random YesPunk.

---

# Install

Clone the starter:

```bash
git clone https://github.com/yespunks/yespunks-starter
cd yespunks-starter
npm install
npm run dev
```

Or generate a new project with the CLI:

```bash
npx create-yespunks-app my-project
```

---

# API

Base URL:

```
https://api.yespunks.xyz
```

This starter uses:

```
/api/yespunks/:id
/api/yespunks/:id/pixels
```

The metadata endpoint provides the **trait string**.

The pixels endpoint provides the **24x24 grid used to render the YesPunk locally as SVG**.

---

# Example Responses

## Metadata

```json
{
  "id": 3083,
  "name": "YesPunks #3083",
  "sourcePunkId": 3083,
  "attributesText": "Male 1, Chinstrap, Cowboy Hat",
  "pixelsUrl": "/api/yespunks/3083/pixels",
  "svgUrl": "/api/yespunks/3083/svg",
  "transform": {
    "mode": "invert-non-skin",
    "background": "#ffffff",
    "blackTo": "#fbfbfb"
  }
}
```

## Pixel Grid

```json
{
  "w": 24,
  "h": 24,
  "palette": ["#fbfbfb", "#12ab34"],
  "idx": [-1, -1, 0, 1]
}
```

---

# Features

## Random Generator

Loads a random YesPunk from the public supply range.

## Trait Filtering

Traits are parsed from the current YesPunk metadata and displayed as clickable filters.

## Match Search

When traits are selected, the generator searches for another YesPunk that matches all selected filters.

## Local SVG Rendering

The UI renders YesPunks from the pixel grid response instead of relying on pre-rendered image files.

## PNG Export

Users can download the currently rendered YesPunk as a PNG generated client-side.

---

# Builder Notes

This starter is intentionally simple and easy to extend.

Good directions for further work:

- save favorite filter combinations
- add multi-step visual search
- browse matching punks in a grid
- compare original punk and YesPunk side by side
- add wallet-based curation
- create themed generators
- build collector tools or art interfaces

---

# Builder Rewards

YesPunks supports ecosystem builders.

Selected projects may receive **reserved YesPunks allocation from the game reserve**.

Projects are evaluated based on:

- originality
- usefulness
- technical execution
- contribution to the ecosystem

The stronger the project, the stronger the reward can be.

---

# Project Structure

```
app/
components/
lib/
```

Main logic lives in the **generator stage component**:

- loads a random YesPunk
- parses traits
- filters future generations
- renders the selected result
- enables PNG download

---


# Links

Website  
https://yespunks.xyz

API  
https://api.yespunks.xyz

GitHub  
https://github.com/yespunks