# 个性化旅游系统优化任务清单（已执行版）

> 更新时间：2026-06-05  
> 状态标记：`✅ 完成`、`✅ 已完成，本轮保留`、`📝 后续关注`

## 完成概览

本轮按“分阶段全做”的计划完成了剩余待办，并保留已完成的 `1.1 Logo/标题` 与 `2.2 清华数据真实化`。

- 前端仍保持静态页面形态，无 npm 构建步骤。
- C++ 仍保持 C++17、无外部 C++ 库。
- 颐和园与清华数据仍分别同步到 `cpp/data` 与 `web/data`。
- AIGC 接入采用 OpenAI-compatible `/chat/completions`，未配置或失败时继续走本地模拟兜底。
- 用户提供的千问 API key 不写入仓库文档或源码；前端通过浏览器本地设置保存。

## 一、UI/UX 与品牌（前端）

### 1.1 品牌标题与 Logo

- **状态**：✅ 已完成，本轮保留
- **结果**：页面标题与品牌露出已改为“个性化旅游系统”，保留可见 Logo/品牌样式。
- **主要文件**：`web/index.html`、`web/styles.css`

### 1.2 推荐卡片评论展示

- **状态**：✅ 完成
- **结果**：
  - 推荐景点卡片展示 1-2 条短评。
  - 优先读取日记 `comments`。
  - 没有评论时，从同目的地日记正文生成短摘录兜底。
  - 默认日记索引补充了示例评论，初始数据即可看到效果。
- **主要文件**：`web/app.js`、`web/scripts/generate-osm-data.mjs`、`web/data/diaries/index.json`、`cpp/data/diaries/index.json`

### 1.3 路线页布局优化

- **状态**：✅ 完成
- **结果**：
  - 桌面端收窄右侧路线面板，地图获得更多宽度。
  - 减少路线面板内边距，缓解拥挤。
  - 中小屏自动改为上下布局，路线面板自然排到地图下方。
  - 未新增复杂 JS 控件。
- **主要文件**：`web/styles.css`

## 二、数据质量（C++ / Web 数据）

### 2.1 颐和园设施名称优化

- **状态**：✅ 完成
- **结果**：
  - 生成脚本新增 Overpass/OSM 设施拉取逻辑。
  - Overpass 不可用或数据不足时，使用人工核验兜底表补齐到 60 条。
  - 覆盖卫生间、游客服务、售票、饮水、急救/医疗、停车、地铁出入口、商店、观景点等类型。
  - `cpp/data/facilities.json` 与 `web/data/facilities.json` 已同步。
  - 去除了 `游客服务1`、`地铁站2` 这类占位尾号名称。
  - 每条设施均保留有效 `near_spot_id`，坐标位于颐和园 bbox 内。
- **主要文件**：`web/scripts/generate-osm-data.mjs`、`cpp/data/facilities.json`、`web/data/facilities.json`

### 2.2 清华大学数据真实化

- **状态**：✅ 已完成，本轮保留
- **结果**：清华校园地点、设施、美食等数据已完成真实化处理，本轮只做回归验证，不重复重做。
- **主要文件**：`cpp/data/regions/tsinghua_campus/`、`web/data/regions/tsinghua_campus/`

## 三、用户系统（C++ + 前端）

### 3.1 用户系统增强

- **状态**：✅ 完成
- **C++ 结果**：
  - 新增 `User` 模型。
  - `Diary` 增加 `userId` / JSON `user_id` 兼容读写。
  - `DataManager` 增加用户加载、保存、注册、查找、切换和当前用户上下文。
  - 日记菜单支持“我的日记 / 全部日记”。
  - 删除日记只允许删除当前用户自己的日记。
  - 旧日记 JSON 未带 `user_id` 时默认兼容到用户 1。
- **前端结果**：
  - 日记页增加作用域筛选：全部日记 / 我的日记。
  - 作用域持久化到 `localStorage["vagabond.diaryScope"]`。
  - 保持现有登录、注册、资料页逻辑。
- **主要文件**：`cpp/include/tripsystem/models.hpp`、`cpp/include/tripsystem/data_manager.hpp`、`cpp/include/tripsystem/services.hpp`、`cpp/include/tripsystem/app.hpp`、`web/app.js`、`web/index.html`

## 四、AIGC 集成（前端）

### 4.1 日记模块接入真实 AI 分镜 API

- **状态**：✅ 完成
- **结果**：
  - 新增 AIGC 设置项：`baseUrl`、`model`、`apiKey`、`enabled`。
  - 配置保存到 `localStorage["vagabond.aigcConfig"]`。
  - `generateAigcStoryboard()` 调用 OpenAI-compatible `/chat/completions`。
  - 默认 Base URL：`https://dashscope.aliyuncs.com/compatible-mode/v1`。
  - 默认模型：`qwen-plus`。
  - 未配置、配置缺失或请求失败时，会显示可理解提示，并继续使用本地模拟分镜兜底。
- **主要文件**：`web/app.js`、`web/index.html`

## 五、工程基建

### 5.1 前端与 C++ 一致性测试

- **状态**：✅ 完成（轻量一致性断言）
- **结果**：
  - 前端增加路径距离与道路边权一致性检查入口。
  - 前端 smoke 增加设施数据同步、bbox、名称占位符、AIGC 配置入口、日记作用域、索引和路径一致性入口断言。
  - C++ smoke 增加用户注册、切换、写日记、我的日记、全部日记、删除本人日记等流程断言。
- **主要文件**：`web/app.js`、`web/scripts/smoke.ps1`、`cpp/scripts/smoke.ps1`

### 5.2 大规模数据索引优化

- **状态**：✅ 完成
- **结果**：
  - 为景点/推荐搜索建立倒排索引。
  - 为日记全文、标题、目的地检索建立倒排索引与缓存。
  - 日记列表增加分页状态和上一页/下一页控件。
  - 检索、排序、作用域切换时自动回到第一页。
- **主要文件**：`web/app.js`、`web/index.html`、`web/styles.css`

## 六、代码质量关注点（C++）

| # | 状态 | 处理结果 |
|---|------|----------|
| 6.1 JSON 解析基于正则 | 📝 后续关注 | 当前数据格式仍可控，本轮未引入外部 JSON 库，也未做全量解析器重写。 |
| 6.2 删除操作与 `vector<T>` | ✅ 完成相关风险控制 | 新增日记删除走 `DataManager::deleteDiary()`，按当前用户和 ID 定位后重建索引/保存数据，不暴露悬空迭代器。 |
| 6.3 Huffman 无删除日记接口 | ✅ 完成 | 新增删除入口，删除后重建日记索引并保存。 |
| 6.4 `Graph::neighbors()` 返回副本 | ✅ 完成 | 已改为返回 `const std::vector<Road>*`，调用方只读访问，避免无意义拷贝。 |
| 6.5 `app.js` 单文件偏大 | 📝 后续关注 | 本轮按约束暂不引入构建工具，也不做全量拆分；只做局部索引、缓存和功能增强。 |
| 6.6 Trie 析构正确性 | ✅ 已确认 | 不需要修改。 |

## 验收记录

已通过以下检查：

```powershell
powershell -ExecutionPolicy Bypass -File .\cpp\scripts\smoke.ps1
powershell -ExecutionPolicy Bypass -File .\web\scripts\smoke.ps1
node --check web\app.js
node --check web\scripts\generate-osm-data.mjs
git diff --check
```

本地预览服务：

```text
http://localhost:5173/
```

Chrome 插件验收未能执行：本机没有可用 Chrome User Data 目录，且 Chrome native host 注册键缺失。已使用本地浏览器/静态烟测替代验证推荐短评、AIGC 未配置兜底、日记作用域和控制台错误。

## 千问 API 配置说明

你在原文末尾提供了千问 API key。出于安全考虑，本文档已移除明文 key，源码中也不会硬编码 key。

前端配置路径：

1. 打开 `http://localhost:5173/`。
2. 进入页面设置面板。
3. 打开 AIGC 启用开关。
4. 填写：
   - Base URL：`https://dashscope.aliyuncs.com/compatible-mode/v1`
   - 模型：`qwen-plus`
   - API key：使用你本地持有的千问 key
5. 保存设置后，再在日记页点击“生成模拟分镜”。

安全提醒：如果这个 key 曾经被提交、截图或发送到不可信环境，建议在阿里云控制台重置后再使用新的 key。
