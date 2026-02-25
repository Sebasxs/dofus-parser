<div align="center">
  <h1>dofus3-mapping-scripts</h1>
  <p>Decode, transform, and render Dofus 3 Unity assets into clean, developer-friendly formats.</p>
</div>

<br>

![](https://i.imgur.com/kStMysx.png)

## Overview

A specialized processing pipeline designed to parse raw asset dumps from Dofus 3 (Unity), sanitize map descriptors, and assemble individual sprite elements into complete, high-resolution 2D map renders using HTML5 Canvas transformations.

![](https://i.imgur.com/kStMysx.png)

## Key Features

- **Automated File Ingestion:** Continuously watches for newly extracted map bundle files, sanitizing and formatting them in real time.
- **Affine Matrix Transformation:** Accurately applies 2D matrix transformations (`m11` to `m32`), scale, and skew corrections to reproduce in-game Unity camera layouts.
- **Layer & Lighting Composition:** Accurately applies RGBA tinting and composite blending modes (`overlay`, `multiply`) to recreate lighting and animated scene layers.
- **Developer-Friendly Output:** Converts complex engine metadata into simplified JSON schemas optimized for web tools, bots, and databases.

<br>

![](https://i.imgur.com/kStMysx.png)

## Scripts

### 1. Unpacking Watcher (`unpacking-watcher.ts`)

Monitors and standardizes raw map descriptor files exported from Unity asset extractors (such as AssetStudio).

- **How it works:** Watches the `map_data_input/` folder for incoming JSON files. It trims trailing engine references, repairs malformed quotations, flattens `mapData` layers (background, foreground, sortable, and animated elements), and writes clean, standardized JSON files to `map_data_mapped/`.
- **Command:**
  ```bash
  pnpm run watch-maps
  ```

### 2. Map Builder (`build-maps.ts`)

Composes and renders full 1920x1000 2D scene views using mapped map definitions and graphical sprites.

- **How it works:** Loads mapped map data from `map_data_mapped/`, retrieves the corresponding graphical assets from `map_elements/` by `gfxId`, calculates matrix transformations and skew compensations, applies color modifications, and streams the finished canvas render as a PNG image to `map_renders/`.
- **Command:**
  ```bash
  pnpm run build-maps
  ```

<br>

![](https://i.imgur.com/kStMysx.png)

## Directory Structure

- `map_data_input/`: Landing folder for raw extracted map JSON files.
- `map_data_mapped/`: Clean, processed map descriptors ready for rendering or queries.
- `map_elements/`: Repository of raw visual sprites (`.png`) indexed by `gfxId`.
- `map_renders/`: Output folder for rendered 1920x1000 map PNG images.
- `data_input/`: Raw game data files (items, spells, monsters, achievements, etc.).
- `languages/`: Localization dictionaries (`en`, `es`, `fr`, `de`, `pt`).

<br>

![](https://i.imgur.com/kStMysx.png)

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Sebasxs/dofus3-mapping-scripts.git
   ```

2. Navigate to the project directory:
   ```bash
   cd dofus3-mapping-scripts
   ```

3. Install dependencies:
   ```bash
   pnpm install
   ```

<br>

## Usage

### Standardize Extracted Maps
Place raw map JSON files into `map_data_input/` and start the watcher process:
```bash
pnpm run watch-maps
```

### Render Complete Maps
Generate rendered map PNG images from mapped data:
```bash
pnpm run build-maps
```

<br>

## License

This project is licensed under the ISC License.
