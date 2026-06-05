# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Changed
- Switch AIGC defaults to economical free-tier models

### Fixed
- Improve image handling and spot name generality
- Fix API interface connectivity issues

---

## [1.1.0] — 2026-06-05

### Added
- Brand upgrade: **TripSystem → Vagabond** with visual refresh
- Local account system for the web frontend
- Tsinghua University campus data package
- 53 Beijing universities with real coordinates and SVG icons
- MIT LICENSE file

### Changed
- Redesigned logo and main title
- Polished travel frontend UI and restaurant data
- Complete README rewrite in [Diátaxis](https://diataxis.fr/) style
- Added architecture diagram, algorithm comparison table, badges, and project tree to README

### Fixed
- Hero preference input keywords now correctly filter recommendations
- Web frontend now rebuilds routes, recommendations, facilities, food, and map data after package switching

---

## [1.0.0] — 2026-06-04

### Added
- Initial release: **Personalized Trip System** (个性化旅游系统)
- C++17 CLI application with hand-written data structures
  - `HashMap` (chaining)
  - `MinHeap` (binary heap)
  - `Trie` (prefix tree)
  - `Graph` (adjacency list)
- Core algorithms implemented:
  - **Dijkstra** & **A\*** — shortest path on spot graph and OSM nodes
  - **TSP-DP** — multi-stop itinerary with DP bitmask
  - **KMP** — substring matching for search
  - **Trie** — autocomplete
  - **Huffman** — compressed diary storage
- Web frontend with HTML5 + Leaflet.js map visualization
- 200 tourist spots and 526 road edges in Beijing dataset
- Food recommendation service (Top-5 restaurants by nearby spot)
- Travel diary CRUD with Huffman-compressed binary storage
- Diátaxis framework documentation (`docs/`)

### Fixed
- Web frontend 404 errors and UI layout issues
- Data corruption bug in web frontend
- Critical bugs in core services

---

## Versioning

| Tag       | Date       | Description                          |
|-----------|------------|--------------------------------------|
| `v1.1.0`  | 2026-06-05 | Vagabond rebrand, Tsinghua data pack |
| `v1.0.0`  | 2026-06-04 | Initial release                      |
