"""
Add missing building spots and facility types to meet requirements.
Run from project root: python cpp/scripts/enrich_data.py
"""
import json, os, random, copy

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')
random.seed(42)

# ── New Building Spots (颐和园) ──────────────────────────────
NEW_BUILDINGS = [
    {"name": "排云殿", "category": "建筑", "rating": 4.7, "heat": 890, "tags": "建筑,历史,皇家"},
    {"name": "玉澜堂", "category": "建筑", "rating": 4.5, "heat": 760, "tags": "建筑,历史,湖景"},
    {"name": "宜芸馆", "category": "建筑", "rating": 4.3, "heat": 680, "tags": "建筑,藏书,文化"},
    {"name": "永寿斋", "category": "建筑", "rating": 4.2, "heat": 550, "tags": "建筑,历史,安静"},
    {"name": "清华轩", "category": "建筑", "rating": 4.6, "heat": 720, "tags": "建筑,园林,文化"},
    {"name": "听鹂馆", "category": "建筑", "rating": 4.8, "heat": 920, "tags": "建筑,戏曲,文化"},
    {"name": "景福阁", "category": "建筑", "rating": 4.4, "heat": 610, "tags": "建筑,观景,安静"},
    {"name": "画中游", "category": "建筑", "rating": 4.9, "heat": 1100, "tags": "建筑,观景,拍照"},
    {"name": "转轮藏", "category": "建筑", "rating": 4.1, "heat": 430, "tags": "建筑,宗教,文化"},
    {"name": "宝云阁", "category": "建筑", "rating": 4.6, "heat": 780, "tags": "建筑,铜殿,地标"},
]

# ── New Facility Types (inside 颐和园 area) ──────────────────
# lat/lon scattered within Summer Palace ~(39.99-40.01, 116.26-116.28)
FACILITY_BASE = [
    # 饭店 (Restaurants inside scenic area)
    {"type": "饭店", "coords": [
        (39.9980, 116.2735), (40.0010, 116.2670), (39.9965, 116.2765),
        (40.0040, 116.2650), (39.9935, 116.2710)]},
    # 图书馆 (Libraries)
    {"type": "图书馆", "coords": [
        (39.9990, 116.2740), (40.0025, 116.2700), (39.9975, 116.2750),
        (39.9950, 116.2790), (40.0030, 116.2635)]},
    # 食堂 (Cafeterias)
    {"type": "食堂", "coords": [
        (39.9985, 116.2760), (40.0015, 116.2690), (39.9970, 116.2730),
        (40.0050, 116.2660), (39.9940, 116.2745)]},
    # 超市 (Supermarkets)
    {"type": "超市", "coords": [
        (39.9978, 116.2720), (40.0020, 116.2680), (39.9955, 116.2770),
        (40.0045, 116.2640), (39.9925, 116.2800)]},
    # 咖啡馆 (Cafes)
    {"type": "咖啡馆", "coords": [
        (39.9995, 116.2710), (40.0005, 116.2665), (39.9960, 116.2780),
        (40.0035, 116.2670), (39.9910, 116.2760)]},
]

SPOT_NAMES = ["颐和园东宫门", "仁寿殿", "长廊东口", "排云门", "佛香阁", "石舫",
              "苏州街入口", "万寿山后湖", "知春亭", "十七孔桥", "南湖岛",
              "谐趣园", "乐寿堂", "文昌院", "铜牛广场", "排云殿", "听鹂馆"]

def load_json(filename):
    path = os.path.join(DATA_DIR, filename)
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(filename, data):
    path = os.path.join(DATA_DIR, filename)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def main():
    # ── Update spots.json ──────────────────────────────────
    spots = load_json('spots.json')
    max_id = max(s['id'] for s in spots)

    for i, b in enumerate(NEW_BUILDINGS):
        max_id += 1
        spots.append({
            "id": max_id,
            "name": b['name'],
            "category": b['category'],
            "rating": b['rating'],
            "heat": b['heat'],
            "tags": b['tags']
        })

    building_count = sum(1 for s in spots if s['category'] in ['建筑', '博物馆', '景点'])
    print(f"Spots: {len(spots)} total, {building_count} buildings (+{len(NEW_BUILDINGS)} new)")
    save_json('spots.json', spots)

    # ── Update facilities.json ──────────────────────────────
    facs = load_json('facilities.json')
    max_fid = max(f['id'] for f in facs)

    tag_map = {
        "饭店": "餐饮,中餐,服务",
        "图书馆": "阅读,学习,安静",
        "食堂": "餐饮,快餐,服务",
        "超市": "购物,日用品,便利",
        "咖啡馆": "咖啡,休闲,茶饮"
    }

    added = 0
    for group in FACILITY_BASE:
        for j, (lat, lon) in enumerate(group['coords']):
            max_fid += 1
            spot_name = random.choice(SPOT_NAMES)
            facs.append({
                "id": max_fid,
                "name": f"颐和园{group['type']}{j+1}",
                "type": group['type'],
                "lat": lat,
                "lon": lon,
                "rating": round(random.uniform(3.8, 4.8), 1),
                "heat": random.randint(200, 900),
                "near_spot_id": random.randint(1, 20),
                "tags": tag_map.get(group['type'], "服务")
            })
            added += 1

    types = set(f['type'] for f in facs)
    print(f"Facilities: {len(facs)} total, {len(types)} types (+{added} new)")
    save_json('facilities.json', facs)

    # ── Update osm_nodes.json (add building nodes) ─────────
    nodes = load_json('osm_nodes.json')
    max_nid = max(n['id'] for n in nodes)

    building_coords = [
        (39.9998, 116.266), (39.9985, 116.273), (39.9992, 116.272),
        (40.0002, 116.271), (39.9988, 116.265), (40.0010, 116.268),
        (40.0020, 116.270), (39.9970, 116.264), (40.0008, 116.266),
        (39.9995, 116.263)
    ]

    new_spot_start = max_id - len(NEW_BUILDINGS) + 1
    for i, b in enumerate(NEW_BUILDINGS):
        max_nid += 1
        spot_id = new_spot_start + i
        coord = building_coords[i]
        nodes.append({
            "id": max_nid,
            "name": b['name'],
            "lat": coord[0],
            "lon": coord[1],
            "type": "building",
            "spot_id": spot_id,
            "description": f"{b['name']}是颐和园内重要{b['category']}，{b['tags']}。",
            "image": "web/assets/spots/real/tower-buddhist-incense.jpg"
        })

    print(f"OSM Nodes: {len(nodes)} total (+{len(NEW_BUILDINGS)} new)")
    save_json('osm_nodes.json', nodes)

    print("\nDone. Run 'powershell -ExecutionPolicy Bypass -File .\\web\\scripts\\setup-data.ps1' to sync.")

if __name__ == '__main__':
    main()
