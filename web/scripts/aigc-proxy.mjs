/**
 * DashScope AIGC proxy — keeps API keys off the browser.
 * Text: Qwen | Image: Wanx | Video: Wan text-to-video (async tasks)
 *
 * Usage:
 *   copy ..\.env.example ..\.env   # set DASHSCOPE_API_KEY
 *   node web/scripts/aigc-proxy.mjs
 */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../..");

const CONFIG = {
  port: Number(process.env.AIGC_PORT || 5174),
  apiKey: process.env.DASHSCOPE_API_KEY || "",
  baseUrl: process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com/api/v1",
  textModel: process.env.AIGC_TEXT_MODEL || "qwen-turbo",
  imageModel: process.env.AIGC_IMAGE_MODEL || "wanx2.0-t2i-turbo",
  videoModel: process.env.AIGC_VIDEO_MODEL || "wanx2.1-t2v-turbo",
  maxFrames: Math.min(4, Math.max(1, Number(process.env.AIGC_MAX_FRAMES || 2))),
  pollIntervalMs: 2500,
  imagePollMaxMs: 120000,
  videoPollMaxMs: 300000
};

loadEnvFile(path.join(REPO_ROOT, ".env"));
loadEnvFile(path.join(REPO_ROOT, "web", ".env"));
CONFIG.apiKey = process.env.DASHSCOPE_API_KEY || CONFIG.apiKey;

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
  CONFIG.apiKey = process.env.DASHSCOPE_API_KEY || CONFIG.apiKey;
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw.trim()) return {};
  return JSON.parse(raw);
}

async function dashFetch(urlPath, { method = "GET", headers = {}, body } = {}) {
  const response = await fetch(`${CONFIG.baseUrl}${urlPath}`, {
    method,
    headers: {
      Authorization: `Bearer ${CONFIG.apiKey}`,
      "Content-Type": "application/json",
      ...headers
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!response.ok) {
    const message = data?.message || data?.error?.message || text || response.statusText;
    throw new Error(`DashScope ${response.status}: ${message}`);
  }
  return data;
}

function extractTextContent(data) {
  const choice = data?.output?.choices?.[0];
  if (choice?.message?.content) return String(choice.message.content);
  if (data?.output?.text) return String(data.output.text);
  return "";
}

function parseJsonFromText(text) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(candidate);
  } catch {
    const start = candidate.indexOf("{");
    const end = candidate.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(candidate.slice(start, end + 1));
    throw new Error("模型未返回有效 JSON 分镜结构");
  }
}

async function pollTask(taskId, maxWaitMs) {
  const started = Date.now();
  while (Date.now() - started < maxWaitMs) {
    const data = await dashFetch(`/tasks/${taskId}`);
    const status = data?.output?.task_status || data?.task_status;
    if (status === "SUCCEEDED") return data;
    if (status === "FAILED" || status === "CANCELED") {
      throw new Error(data?.output?.message || data?.message || `任务失败：${status}`);
    }
    await sleep(CONFIG.pollIntervalMs);
  }
  throw new Error("AIGC 任务超时，请稍后重试");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildStoryboardPrompt(context) {
  return `你是旅行 Vlog 分镜导演。根据以下旅行日记信息，输出 JSON（不要 markdown 说明），格式：
{
  "title": "短片标题",
  "summary": "一句话概述",
  "video_prompt": "用于文生视频的完整中文镜头脚本，包含 3-4 个镜头时间轴",
  "frames": [
    {
      "title": "镜头名",
      "narration": "旁白",
      "visual_prompt": "用于文生图的英文或中文画面描述，写实旅行摄影风格",
      "duration_sec": 3
    }
  ]
}
要求：frames 数量 ${CONFIG.maxFrames} 个；目的地真实；适合中国旅行场景；visual_prompt 适合 AI 绘图。

日记信息：
- 区域：${context.regionName || "旅行区域"}
- 标题：${context.title || "未命名"}
- 目的地：${context.destination || "未知"}
- 标签：${(context.tags || []).join("、") || "旅行"}
- 用户偏好：${(context.preferences || []).join("、") || "文化、路线"}
- 正文：${context.content || "（暂无正文）"}
- 媒体说明：${context.media || "（无）"}`;
}

async function generateStoryboard(context) {
  const data = await dashFetch("/services/aigc/text-generation/generation", {
    method: "POST",
    body: {
      model: CONFIG.textModel,
      input: {
        messages: [
          { role: "system", content: "只输出 JSON，不要额外解释。" },
          { role: "user", content: buildStoryboardPrompt(context) }
        ]
      },
      parameters: {
        result_format: "message",
        temperature: 0.7
      }
    }
  });
  const parsed = parseJsonFromText(extractTextContent(data));
  if (!Array.isArray(parsed.frames) || !parsed.frames.length) {
    throw new Error("分镜 JSON 缺少 frames 字段");
  }
  parsed.frames = parsed.frames.slice(0, CONFIG.maxFrames).map((frame, index) => ({
    title: frame.title || `镜头 ${index + 1}`,
    narration: frame.narration || "",
    visual_prompt: frame.visual_prompt || frame.prompt || `${context.destination} travel photo`,
    duration_sec: Number(frame.duration_sec) || 3,
    image_url: frame.image_url || ""
  }));
  parsed.video_prompt = parsed.video_prompt || parsed.frames.map((f) => f.narration).join(" ");
  return parsed;
}

async function generateImage(prompt) {
  const submit = await dashFetch("/services/aigc/text2image/image-synthesis", {
    method: "POST",
    headers: { "X-DashScope-Async": "enable" },
    body: {
      model: CONFIG.imageModel,
      input: { prompt },
      parameters: {
        size: "1024*1024",
        n: 1
      }
    }
  });
  const taskId = submit?.output?.task_id;
  if (!taskId) throw new Error("文生图任务创建失败");
  const result = await pollTask(taskId, CONFIG.imagePollMaxMs);
  const url = result?.output?.results?.[0]?.url || result?.output?.result_url;
  if (!url) throw new Error("文生图任务成功但未返回图片 URL");
  return url;
}

async function generateVideo(prompt) {
  const submit = await dashFetch("/services/aigc/video-generation/video-synthesis", {
    method: "POST",
    headers: { "X-DashScope-Async": "enable" },
    body: {
      model: CONFIG.videoModel,
      input: { prompt },
      parameters: {
        size: "1280*720",
        duration: 5,
        prompt_extend: true
      }
    }
  });
  const taskId = submit?.output?.task_id;
  if (!taskId) throw new Error("文生视频任务创建失败");
  const result = await pollTask(taskId, CONFIG.videoPollMaxMs);
  const url = result?.output?.video_url
    || result?.output?.results?.[0]?.url
    || result?.output?.result_url;
  if (!url) throw new Error("文生视频任务成功但未返回视频 URL");
  return url;
}

async function handleStoryboard(body) {
  const storyboard = await generateStoryboard(body.context || {});
  return { ok: true, mode: "api", storyboard };
}

async function handleImages(body) {
  let storyboard = body.storyboard;
  if (!storyboard?.frames?.length) {
    storyboard = await generateStoryboard(body.context || {});
  }
  const frames = [];
  for (const frame of storyboard.frames.slice(0, CONFIG.maxFrames)) {
    const image_url = await generateImage(frame.visual_prompt);
    frames.push({ ...frame, image_url });
  }
  return { ok: true, mode: "api", storyboard: { ...storyboard, frames } };
}

async function handleVideo(body) {
  let storyboard = body.storyboard;
  if (!storyboard) {
    storyboard = await generateStoryboard(body.context || {});
  }
  const prompt = body.prompt || storyboard.video_prompt || storyboard.summary || "travel vlog";
  const video_url = await generateVideo(prompt);
  return { ok: true, mode: "api", storyboard, video_url };
}

async function handlePipeline(body) {
  const storyboard = await generateStoryboard(body.context || {});
  const withImages = body.withImages !== false;
  const withVideo = Boolean(body.withVideo);
  const frames = [];
  if (withImages) {
    for (const frame of storyboard.frames) {
      const image_url = await generateImage(frame.visual_prompt);
      frames.push({ ...frame, image_url });
    }
    storyboard.frames = frames;
  }
  let video_url = "";
  if (withVideo) {
    video_url = await generateVideo(body.prompt || storyboard.video_prompt);
  }
  return { ok: true, mode: "api", storyboard, video_url };
}

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

  try {
    if (req.method === "GET" && url.pathname === "/api/aigc/health") {
      sendJson(res, 200, {
        ok: true,
        configured: Boolean(CONFIG.apiKey),
        textModel: CONFIG.textModel,
        imageModel: CONFIG.imageModel,
        videoModel: CONFIG.videoModel,
        maxFrames: CONFIG.maxFrames
      });
      return;
    }

    if (!CONFIG.apiKey) {
      sendJson(res, 503, {
        ok: false,
        error: "未配置 DASHSCOPE_API_KEY。请复制 .env.example 为 .env 并填入百炼 API Key。"
      });
      return;
    }

    if (req.method !== "POST") {
      sendJson(res, 404, { ok: false, error: "Not found" });
      return;
    }

    const body = await readJsonBody(req);
    let result;
    if (url.pathname === "/api/aigc/storyboard") result = await handleStoryboard(body);
    else if (url.pathname === "/api/aigc/images") result = await handleImages(body);
    else if (url.pathname === "/api/aigc/video") result = await handleVideo(body);
    else if (url.pathname === "/api/aigc/pipeline") result = await handlePipeline(body);
    else {
      sendJson(res, 404, { ok: false, error: "Not found" });
      return;
    }
    sendJson(res, 200, result);
  } catch (error) {
    sendJson(res, 500, { ok: false, error: error.message || String(error) });
  }
});

server.listen(CONFIG.port, () => {
  console.log(`AIGC proxy listening on http://127.0.0.1:${CONFIG.port}`);
  console.log(`API key configured: ${CONFIG.apiKey ? "yes" : "no — copy .env.example to .env"}`);
  console.log(`Models: text=${CONFIG.textModel}, image=${CONFIG.imageModel}, video=${CONFIG.videoModel}`);
});
