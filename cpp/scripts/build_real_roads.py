"""
Build a REALISTIC connected Beijing road network for university routing.
Uses named intersections as shared nodes, real road names as edge labels.
ONE-TIME run: restores clean state each time.
"""
import json, os, math

DATA_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'data')

def load(fname):
    with open(os.path.join(DATA_DIR, fname), 'r', encoding='utf-8') as f:
        return json.load(f)

def save(fname, data):
    with open(os.path.join(DATA_DIR, fname), 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def haversine_m(a, b):
    R = 6371000
    dlat = math.radians(b[0] - a[0])
    dlon = math.radians(b[1] - a[1])
    lat1, lat2 = math.radians(a[0]), math.radians(b[0])
    h = math.sin(dlat/2)**2 + math.cos(lat1)*math.cos(lat2)*math.sin(dlon/2)**2
    return R * 2 * math.atan2(math.sqrt(h), math.sqrt(1-h))

# ── Named Intersections (shared nodes) ──────────────────────
INTERSECTIONS = {
    "中关村一桥": (39.984, 116.314),
    "中关村二桥": (39.980, 116.318),
    "海淀黄庄":   (39.976, 116.317),
    "四通桥":      (39.968, 116.318),
    "白石桥":      (39.950, 116.323),
    "苏州桥":      (39.960, 116.303),
    "学院桥":      (39.988, 116.348),
    "六道口":      (40.010, 116.350),
    "成府路口":    (39.996, 116.348),
    "志新桥":      (39.992, 116.358),
    "健翔桥":      (39.989, 116.370),
    "北太平庄":    (39.966, 116.360),
    "马甸桥":      (39.969, 116.382),
    "大钟寺":      (39.966, 116.340),
    "知春里":      (39.977, 116.325),
    "学知桥":      (39.978, 116.338),
    "保福寺桥":    (39.990, 116.332),
    "五道口":      (39.993, 116.338),
    "清华西门":    (39.998, 116.318),
    "清华东门":    (40.001, 116.331),
    "西苑":        (40.002, 116.294),
    "颐和园东门":  (39.999, 116.280),
    "海淀桥":      (39.990, 116.295),
    "巴沟":        (39.975, 116.293),
    "小西天":      (39.953, 116.364),
    "明光桥":      (39.958, 116.346),
    "蓟门桥":      (39.966, 116.350),
    "牡丹园":      (39.973, 116.368),
    "安贞桥":      (39.972, 116.403),
    "惠新西街":    (39.978, 116.416),
    "望京西":      (39.990, 116.454),
    "双榆树":      (39.972, 116.324),
    "人民大学":    (39.970, 116.316),
    "魏公村":      (39.954, 116.326),
    "国家图书馆":  (39.945, 116.327),
}

# ── Road segments: (intersection_A, intersection_B, road_name, distance_m) ──
# Distances approximate real-world values
ROAD_SEGMENTS = [
    # ===== 中关村大街 (North-South spine) =====
    ("清华西门", "海淀黄庄", "中关村大街", 2400),
    ("海淀黄庄", "四通桥", "中关村大街", 1000),
    ("四通桥", "白石桥", "中关村大街", 2200),
    # ===== 学院路 =====
    ("六道口", "成府路口", "学院路", 1600),
    ("成府路口", "学院桥", "学院路", 1000),
    ("学院桥", "蓟门桥", "学院路", 2600),
    ("蓟门桥", "明光桥", "学院路", 1000),
    # ===== 西土城路 =====
    ("学知桥", "蓟门桥", "西土城路", 1400),
    ("蓟门桥", "明光桥", "西土城路", 1000),
    # ===== 新街口外大街 =====
    ("小西天", "北太平庄", "新街口外大街", 1500),
    # ===== 成府路 (East-West) =====
    ("颐和园东门", "西苑", "颐和园路", 1200),
    ("西苑", "清华西门", "颐和园路", 1000),
    ("清华西门", "五道口", "成府路", 1000),
    ("五道口", "成府路口", "成府路", 1000),
    ("成府路口", "志新桥", "成府路", 1000),
    # ===== 北四环路 =====
    ("海淀桥", "中关村一桥", "北四环路", 2000),
    ("中关村一桥", "保福寺桥", "北四环路", 1600),
    ("保福寺桥", "学院桥", "北四环路", 1500),
    ("学院桥", "志新桥", "北四环路", 1000),
    ("志新桥", "健翔桥", "北四环路", 1400),
    # ===== 北三环路 =====
    ("巴沟", "苏州桥", "北三环路", 1600),
    ("苏州桥", "四通桥", "北三环路", 1400),
    ("四通桥", "大钟寺", "北三环路", 1800),
    ("大钟寺", "北太平庄", "北三环路", 1800),
    ("北太平庄", "马甸桥", "北三环路", 2000),
    ("马甸桥", "安贞桥", "北三环路", 1800),
    ("安贞桥", "惠新西街", "北三环路", 1600),
    ("惠新西街", "望京西", "北四环东路", 2800),
    # ===== 知春路 =====
    ("海淀黄庄", "知春里", "知春路", 900),
    ("知春里", "学知桥", "知春路", 1300),
    ("学知桥", "学院桥", "知春路", 1200),
    # ===== 清华东路 =====
    ("五道口", "成府路口", "清华东路", 1300),
    # ===== 双清路 =====
    ("清华东门", "五道口", "双清路", 800),
    # ===== Cross connections =====
    ("中关村一桥", "保福寺桥", "中关村东路", 1600),
    ("大钟寺", "知春里", "大钟寺东路", 1000),
    ("魏公村", "白石桥", "魏公村路", 600),
    ("人民大学", "四通桥", "人大北路", 500),
    ("国家图书馆", "白石桥", "国图路", 800),
]

# ── University → nearest intersection ───────────────────────
UNI_INTERSECTION = {
    "清华大学": "清华西门",
    "北京大学": "海淀桥",
    "中国人民大学": "人民大学",
    "北京师范大学": "小西天",
    "北京航空航天大学": "学院桥",
    "北京理工大学": "魏公村",
    "中国农业大学": "六道口",
    "中央民族大学": "国家图书馆",
    "北京科技大学": "志新桥",
    "北京交通大学": "明光桥",
    "北京邮电大学": "蓟门桥",
    "北京化工大学": "惠新西街",
    "北京工业大学": "惠新西街",
    "北京林业大学": "六道口",
    "北京中医药大学": "惠新西街",
    "北京外国语大学": "魏公村",
    "北京语言大学": "五道口",
    "中国传媒大学": "惠新西街",
    "中央财经大学": "大钟寺",
    "对外经济贸易大学": "惠新西街",
    "中国政法大学": "蓟门桥",
    "北京体育大学": "六道口",
    "中国石油大学（北京）": "学院桥",
    "中国地质大学（北京）": "成府路口",
    "中国矿业大学（北京）": "成府路口",
    "华北电力大学": "健翔桥",
    "首都师范大学": "巴沟",
    "首都医科大学": "大钟寺",
    "首都经济贸易大学": "安贞桥",
    "北京工商大学": "白石桥",
    "北京建筑大学": "小西天",
    "北京信息科技大学": "健翔桥",
    "北方工业大学": "马甸桥",
    "北京联合大学": "惠新西街",
    "中央美术学院": "望京西",
    "北京电影学院": "学知桥",
    "中央戏剧学院": "安贞桥",
    "中央音乐学院": "国家图书馆",
    "中国音乐学院": "健翔桥",
    "北京舞蹈学院": "国家图书馆",
    "中国戏曲学院": "巴沟",
    "北京服装学院": "惠新西街",
    "北京印刷学院": "白石桥",
    "中国科学院大学": "中关村一桥",
    "中国社会科学院大学": "双榆树",
    "外交学院": "白石桥",
    "国际关系学院": "西苑",
    "北京第二外国语学院": "惠新西街",
    "中国人民公安大学": "白石桥",
    "北京农学院": "六道口",
    "北京物资学院": "惠新西街",
    "北京石油化工学院": "巴沟",
    "中国青年政治学院": "巴沟",
}

def main():
    nodes = load('osm_nodes.json')
    edges = load('osm_edges.json')
    spots = load('spots.json')

    # Keep only original Summer Palace data (node id < 5000)
    orig_node_ids = {n['id'] for n in nodes if n['id'] < 5000}
    edges = [e for e in edges if e['from'] in orig_node_ids and e['to'] in orig_node_ids]
    nodes = [n for n in nodes if n['id'] < 5000]
    print(f"Cleaned: {len(nodes)} nodes, {len(edges)} edges (Summer Palace only)")

    max_nid = max(n['id'] for n in nodes)

    # ── 1. Create intersection nodes ─────────────────────────
    ix_nodes = {}  # name → node_id
    for name, (lat, lon) in INTERSECTIONS.items():
        max_nid += 1
        ix_nodes[name] = max_nid
        nodes.append({
            "id": max_nid, "name": f"{name}路口",
            "lat": lat, "lon": lon,
            "type": "road_intersection", "spot_id": 0,
            "description": f"北京{name}道路交叉口",
            "image": "web/assets/spots/visitor-center.svg"
        })
    print(f"Created {len(ix_nodes)} intersection nodes")

    # ── 2. Create road edges ────────────────────────────────
    added_edges = 0
    edge_set = set()
    for (a_name, b_name, road_name, dist) in ROAD_SEGMENTS:
        a_id = ix_nodes.get(a_name)
        b_id = ix_nodes.get(b_name)
        if not a_id or not b_id:
            print(f"  WARNING: missing intersection {a_name} or {b_name}")
            continue
        if (a_id, b_id) in edge_set:
            continue
        edge_set.add((a_id, b_id))
        edge_set.add((b_id, a_id))
        # Bidirectional
        edges.append({"from": a_id, "to": b_id, "distance": dist, "mode": "both", "road_name": road_name})
        edges.append({"from": b_id, "to": a_id, "distance": dist, "mode": "both", "road_name": road_name})
        added_edges += 2
    print(f"Added {added_edges} road edges")

    # ── 3. Connect universities to nearest intersection ──────
    uni_nodes_in_data = [n for n in load('osm_nodes.json') if n.get('type') == 'university']
    uni_by_name = {}
    for n in uni_nodes_in_data:
        spot = next((s for s in spots if s['id'] == n.get('spot_id')), None)
        if spot:
            uni_by_name[spot['name']] = n

    uni_added = 0
    for uni_name, ix_name in UNI_INTERSECTION.items():
        uni = uni_by_name.get(uni_name)
        ix_id = ix_nodes.get(ix_name)
        if not uni or not ix_id:
            continue
        dist_m = max(80, int(haversine_m((uni['lat'], uni['lon']), INTERSECTIONS[ix_name])))
        edges.append({"from": uni['id'], "to": ix_id, "distance": dist_m, "mode": "walk", "road_name": f"连接{ix_name}"})
        edges.append({"from": ix_id, "to": uni['id'], "distance": dist_m, "mode": "walk", "road_name": f"连接{ix_name}"})
        uni_added += 1
    print(f"Connected {uni_added} Beijing universities to intersections")

    # ── 4. Connect remaining non-Beijing universities ────────
    all_nids = {n['id'] for n in nodes} | set(ix_nodes.values())
    edge_nids = set()
    for e in edges:
        edge_nids.add(e['from'])
        edge_nids.add(e['to'])
    # Reload full uni nodes
    uni_nodes_all = [n for n in load('osm_nodes.json') if n.get('type') == 'university']
    # Add missing uni nodes back to nodes list
    for un in uni_nodes_all:
        if un['id'] not in all_nids:
            nodes.append(un)
            all_nids.add(un['id'])

    connected_unis = [n for n in uni_nodes_all if n['id'] in edge_nids]
    isolated_unis = [n for n in uni_nodes_all if n['id'] not in edge_nids]
    for iso in isolated_unis:
        nearest = min(connected_unis, key=lambda c: haversine_m(
            (iso['lat'], iso['lon']), (c['lat'], c['lon'])))
        dist_m = max(500, int(haversine_m((iso['lat'], iso['lon']), (nearest['lat'], nearest['lon']))))
        edges.append({"from": iso['id'], "to": nearest['id'], "distance": dist_m, "mode": "both", "road_name": "城际联络线"})
        edges.append({"from": nearest['id'], "to": iso['id'], "distance": dist_m, "mode": "both", "road_name": "城际联络线"})
        edge_nids.add(iso['id'])
        edge_nids.add(nearest['id'])
    print(f"Connected {len(isolated_unis)} remaining non-Beijing universities")

    # ── 4b. Force-connect any stragglers ────────────────────
    uni_all = [n for n in nodes if n.get('type') == 'university'] + uni_nodes_all
    edge_nids2 = set()
    for e in edges:
        edge_nids2.add(e['from']); edge_nids2.add(e['to'])
    for u in uni_all:
        if u['id'] in edge_nids2: continue
        nearest_ix = min(ix_nodes.values(), key=lambda ix: haversine_m(
            (u['lat'], u['lon']), (next(n['lat'] for n in nodes if n['id']==ix), next(n['lon'] for n in nodes if n['id']==ix))))
        dist_m = max(80, int(haversine_m((u['lat'], u['lon']),
            (next(n['lat'] for n in nodes if n['id']==nearest_ix), next(n['lon'] for n in nodes if n['id']==nearest_ix)))))
        edges.append({"from": u['id'], "to": nearest_ix, "distance": dist_m, "mode": "walk", "road_name": "连接路"})
        edges.append({"from": nearest_ix, "to": u['id'], "distance": dist_m, "mode": "walk", "road_name": "连接路"})
        edge_nids2.add(u['id'])
        print(f"Force-connected: id={u['id']}")

    # ── 5. Bridge Summer Palace to Beijing road network ──────
    # Summer Palace east gate (颐和园东宫门, node id=1) connects to 颐和园东门 intersection
    sp_gate = next((n for n in nodes if n['id'] == 1), None)
    yiheyuan_ix = ix_nodes.get("颐和园东门")
    if sp_gate and yiheyuan_ix:
        dist = int(haversine_m((sp_gate['lat'], sp_gate['lon']), INTERSECTIONS["颐和园东门"]))
        edges.append({"from": 1, "to": yiheyuan_ix, "distance": max(80, dist), "mode": "walk", "road_name": "颐和园路"})
        edges.append({"from": yiheyuan_ix, "to": 1, "distance": max(80, dist), "mode": "walk", "road_name": "颐和园路"})
        print("Bridged Summer Palace → Beijing road network")

    # ── Save ─────────────────────────────────────────────────
    save('osm_nodes.json', nodes)
    save('osm_edges.json', edges)

    # ── Stats ─────────────────────────────────────────────────
    total_edges = len(edges)
    total_nodes = len(nodes)
    road_names = len(set(e.get('road_name', '') for e in edges))
    uni_connected = sum(1 for n in uni_nodes_all if n['id'] in edge_nids)
    isolated_count = sum(1 for n in nodes if n['id'] not in edge_nids)
    print(f"\nTotal: {total_nodes} nodes, {total_edges} edges, {road_names} road names")
    print(f"Universities connected: {uni_connected}/{len(uni_nodes_all)}, Isolated nodes: {isolated_count}")

    # ── Verify connectivity ──────────────────────────────────
    adj = {}
    for e in edges:
        adj.setdefault(e['from'], []).append(e['to'])
        adj.setdefault(e['to'], []).append(e['from'])
    components = []
    visited_all = set()
    for nid in adj:
        if nid not in visited_all:
            comp = set(); q = [nid]
            while q:
                cur = q.pop(0)
                if cur in comp: continue
                comp.add(cur); visited_all.add(cur)
                for nb in adj.get(cur, []):
                    if nb not in comp: q.append(nb)
            components.append(comp)
    print(f"Connected components: {len(components)}")
    for i, comp in enumerate(components):
        uni_in_comp = sum(1 for n in uni_nodes_all if n['id'] in comp)
        if uni_in_comp > 0:
            print(f"  Component {i+1}: {len(comp)} nodes, {uni_in_comp} universities")

if __name__ == '__main__':
    main()
