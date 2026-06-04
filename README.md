# PersonalizationTripSystem

个性化旅游系统课程设计，当前可运行场景包含 **北京颐和园景区数据包 + 清华大学校园数据包**。

项目采用 C++17 CLI 作为算法主体，前端使用纯 HTML/CSS/JavaScript + Leaflet 做验收演示。数据不依赖数据库，运行时从 `cpp/data/*.json` 和日记二进制压缩文件加载。

## 已覆盖功能

- 旅游推荐：按兴趣、评分、热度计算 Top-10 推荐。
- 旅游路线规划：景点图 Dijkstra、OSM 路网 A*、多点游览 TSP-DP。
- 场所查询：服务设施按类型/关键词查询，并按路径距离排序。
- 旅游日记：日记浏览、关键词检索、评分/热度排序和 Huffman 压缩展示。
- 美食推荐：按景点、菜系、评分、热度和距离推荐餐饮。
- 前端演示：推荐、路线、查询、日记、美食、数据概览六个视图。

## 数据规模

- `cpp/data/osm_nodes.json`：281 个节点，其中 228 个为颐和园可路由 OSM 节点，53 个为北京高校真实坐标展示/推荐节点。
- `cpp/data/osm_edges.json`：526 条有向道路边，支持步行/骑行模式。
- `cpp/data/spots.json`：247 个景区/校园目的地，其中颐和园内部节点可参与路线规划，北京高校节点用于地图展示、推荐和查询。
- `cpp/data/facilities.json`：60 个服务设施，12 种设施类型。
- `cpp/data/restaurants.json`：50 条餐饮推荐数据，10 种菜系。
- `cpp/data/users.json`：10 个用户画像。
- `cpp/data/diaries/index.json`：12 条前端日记交流展示数据。
- `cpp/data/regions/tsinghua_campus/`：清华校园独立数据包，14 个校园节点、36 条有向边、18 条景点道路、8 个设施、6 条餐饮数据。

真实图片已补充到 `web/assets/spots/real/`，来源记录在 `web/assets/ATTRIBUTIONS.md`；清华校园和颐和园高频推荐卡片会优先显示真实图片，加载失败时回退到本地占位图。

## 构建与运行

```powershell
powershell -ExecutionPolicy Bypass -File .\cpp\scripts\build.ps1
.\cpp\build\tripsystem.exe .\cpp\data
```

## 前端演示

在仓库根目录启动静态服务器，让页面能同时访问 `web/` 和 `cpp/data/`：

```powershell
python -m http.server 5173
```

打开：

```text
http://localhost:5173/web/index.html
```

建议答辩演示顺序：

1. 打开“数据”视图，展示 200+ 节点、200+ 道路边、服务设施、用户和日记规模。
2. 打开“推荐”视图，展示兴趣、评分、热度排序。
3. 打开“路线”视图，默认运行“颐和园东宫门 → 苏州街入口”最短路径并高亮地图。
4. 在“路线”视图切换到“清华大学校园数据包”，展示学校内部路线、设施和美食推荐同样可用。
5. 打开“查询”“日记”“美食”视图，分别说明场所查询、日记交流、美食推荐、日记 JSON 导出和模拟 AIGC 分镜。

## 重新拉取 OSM 路网

默认场景为 `summer-palace`，bbox 为 `39.9850,116.2550,40.0120,116.3050`：

```powershell
node .\web\scripts\generate-osm-data.mjs summer-palace
```

脚本只在生成数据时访问 Overpass。生成后的 JSON 已落盘，普通运行和答辩演示不需要联网。

## 验证

```powershell
powershell -ExecutionPolicy Bypass -File .\web\scripts\smoke.ps1
powershell -ExecutionPolicy Bypass -File .\cpp\scripts\smoke.ps1
```

前端 smoke 会校验主包数据规模、清华校园数据包、图片来源、日记导出入口、AIGC 模拟标注、关键功能视图、图片路径和默认路径可达性。
