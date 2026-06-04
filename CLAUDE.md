# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

个性化旅游系统 (Personalized Trip System) — a C++17 CLI application with a web visualization frontend. It implements core algorithms (Dijkstra, A\*, TSP-DP, KMP, Trie, Huffman) from scratch using hand-written data structures (no STL containers for core logic, no external libraries).

## Build

```powershell
# Build the CLI
powershell -ExecutionPolicy Bypass -File .\cpp\scripts\build.ps1
# Output: cpp/build/tripsystem.exe
```

```powershell
# Smoke test (end-to-end functional validation)
powershell -ExecutionPolicy Bypass -File .\cpp\scripts\smoke.ps1
```

```bash
# Run the application
.\cpp\build\tripsystem.exe .\cpp\data
```

The build script auto-detects g++ in PATH or MSYS2 (`C:/msys64/mingw64/bin`). Compiler flags: `-std=c++17 -O2 -Wall -Wextra -static`.

## Web Frontend

The `web/` directory contains a standalone HTML5/Leaflet.js visualization that renders OSM map data.

**First-time setup** (or whenever `cpp/data/` files change):
```powershell
powershell -ExecutionPolicy Bypass -File .\web\scripts\setup-data.ps1
```

This copies `cpp/data/*.json` into `web/data/` so the HTTP server can serve them.

**Start the server:**
```bash
python -m http.server 5173 --directory web
```
Then open http://localhost:5173/

## Architecture

All implementation is **header-only** in `cpp/include/tripsystem/`. `cpp/src/main.cpp` is the sole translation unit.

```
App (CLI menu, main.cpp)
 ├── DataManager       — JSON parsing, binary I/O, Huffman codec, data initialization
 ├── RecommendService  — Top-K spots (MinHeap, score = rating×0.4 + heat×0.4 + tagMatch×0.2)
 ├── PathPlanner       — Dijkstra (spot graph), A* (OSM nodes), TSP multi-stop (DP bitmask)
 ├── SearchService     — Trie autocomplete + KMP substring match + HashMap deduplication
 ├── DiaryService      — CRUD with Huffman-compressed binary storage
 └── FoodService       — Top-5 restaurants filtered by nearby spot
```

**Data flow:** `DataManager::load()` → all data lives in-memory → services operate on shared references → `DataManager::save()` on exit.

**Hand-written data structures** (in `include/tripsystem/`): `HashMap` (chaining), `MinHeap` (binary heap), `Trie` (prefix tree), `Graph` (adjacency list).

## Data Files (`cpp/data/`)

| File | Content |
|------|---------|
| `spots.json` | Tourist spots with rating, heat, tags |
| `roads.json` | Weighted edges (walk\_dist, bike\_dist) |
| `osm_nodes.json` | OSM nodes (lat/lon, images, descriptions) |
| `osm_edges.json` | OSM edges with transit modes and road names |
| `restaurants.json` | Restaurants linked to nearby spot IDs |
| `diaries/{id}.json` | Diary metadata + Huffman frequency table |
| `diaries/{id}.bin` | Huffman-compressed diary body |

On first run, `DataManager` auto-generates sample data if files are absent.

## Documentation

The `docs/` directory follows the [Diátaxis](https://diataxis.fr/) framework:

| Quadrant | File | Purpose |
|----------|------|---------|
| Explanation | `explanation.architecture.md` | System architecture, design decisions, trade-offs |
| Reference | `reference.defense-checklist.md` | Course requirement coverage, algorithm API, data evidence |
| Reference | `reference.algorithms.md` (planned) | Algorithm complexity, interfaces, comparison tables |
| How-to | `how-to.build-and-test.md` (planned) | Build, run, smoke test, add region data |
| Tutorial | `tutorial.getting-started.md` (planned) | 5-minute quick start for new developers |

Original design docs (`软件开发文档.md`, `个性化旅游系统核心功能点.md`, etc.) remain as supplementary material.

## Key Design Constraints

- **No external C++ libraries** — all data structures and algorithms are implemented by hand; this is a course design requirement.
- JSON is parsed with lightweight regex-based parsing, not a JSON library.
- The project targets Windows with g++/MinGW-w64; PowerShell scripts are the primary build tooling.
- The web frontend is purely static (no build step, no npm).
