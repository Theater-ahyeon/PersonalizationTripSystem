# trip-backend

## 课程约束（重要）

- **不要使用数据库来完成核心功能**。
- 当前后端实现全部基于：**内存数据结构 + JSON 导入 + 算法接口**。

## 启动方式（默认无 DB）

- 构建：
  - Windows：`cd backend && .\\mvnw.cmd -DskipTests package`
- 运行：
  - `cd backend && .\\mvnw.cmd spring-boot:run`

健康检查：

- `GET http://localhost:8080/api/health`

示例演示：

- `POST http://localhost:8080/api/demo/load-sample`
- `GET  http://localhost:8080/api/graph/shortest-distance?start=1&goal=3`
- `GET  http://localhost:8080/api/graph/shortest-time?start=1&goal=3`
