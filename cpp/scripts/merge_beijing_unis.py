"""Merge Beijing university data into existing spots.json and osm_nodes.json.
Removes old Beijing campus entries (IDs 135-194) that duplicate the new data,
and inserts the new entries with real coordinates and images."""

import json
from pathlib import Path

REPO = Path(r"E:\codex\PersonalizationTripSystem-main")
SPOTS_PATH = REPO / "cpp" / "data" / "spots.json"
NODES_PATH = REPO / "cpp" / "data" / "osm_nodes.json"
NEW_SPOTS_PATH = REPO / "cpp" / "data" / "beijing_universities_spots.json"
NEW_NODES_PATH = REPO / "cpp" / "data" / "beijing_universities_nodes.json"

# Beijing university names to remove from old campus entries
BEIJING_UNI_NAMES = {
    "清华大学", "北京大学", "中国人民大学", "北京师范大学", "北京航空航天大学",
    "北京理工大学", "中国农业大学", "中央民族大学", "北京科技大学", "北京交通大学",
    "北京邮电大学", "北京化工大学", "北京工业大学", "北京林业大学", "北京中医药大学",
    "北京外国语大学", "北京语言大学", "中国传媒大学", "中央财经大学", "对外经济贸易大学",
    "中国政法大学", "北京体育大学", "中央美术学院",
}

# Load existing data
spots = json.loads(SPOTS_PATH.read_text(encoding="utf-8-sig"))
nodes = json.loads(NODES_PATH.read_text(encoding="utf-8-sig"))

print(f"Existing spots: {len(spots)}")
print(f"Existing OSM nodes: {len(nodes)}")

# Remove old Beijing campus entries (those without real coordinates)
old_campus_count = sum(1 for s in spots if s.get("category") == "校园" and s["name"] in BEIJING_UNI_NAMES)
spots = [s for s in spots if not (s.get("category") == "校园" and s["name"] in BEIJING_UNI_NAMES)]
print(f"Removed {old_campus_count} old Beijing campus entries")

# Load new entries
new_spots = json.loads(NEW_SPOTS_PATH.read_text(encoding="utf-8-sig"))
new_nodes = json.loads(NEW_NODES_PATH.read_text(encoding="utf-8-sig"))

print(f"Adding {len(new_spots)} new Beijing university spots")
print(f"Adding {len(new_nodes)} new OSM nodes with real coordinates")

# Append new entries
spots.extend(new_spots)
nodes.extend(new_nodes)

# Write back
SPOTS_PATH.write_text(json.dumps(spots, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n")
NODES_PATH.write_text(json.dumps(nodes, ensure_ascii=False, indent=2), encoding="utf-8", newline="\n")

print(f"\nFinal spots: {len(spots)}")
print(f"Final OSM nodes: {len(nodes)}")

# Print summary of new universities
print("\nNew Beijing universities with real coordinates:")
for s in new_spots:
    node = next((n for n in new_nodes if n.get("spot_id") == s["id"]), None)
    if node:
        print(f"  {s['id']:>4}. {s['name']:<20s}  ({node['lat']}, {node['lon']})  ★{s['rating']}")
