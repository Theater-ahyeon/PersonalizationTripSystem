#!/usr/bin/env python3
"""DashScope AIGC proxy — keeps API keys off the browser."""

from __future__ import annotations

import json
import os
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]

CONFIG = {
    "port": int(os.environ.get("AIGC_PORT", "5174")),
    "api_key": os.environ.get("DASHSCOPE_API_KEY", ""),
    "base_url": os.environ.get("DASHSCOPE_BASE_URL", "https://dashscope.aliyuncs.com/api/v1"),
    "text_model": os.environ.get("AIGC_TEXT_MODEL", "qwen-turbo"),
    "image_model": os.environ.get("AIGC_IMAGE_MODEL", "wanx2.0-t2i-turbo"),
    "video_model": os.environ.get("AIGC_VIDEO_MODEL", "wanx2.1-t2v-turbo"),
    "video_resolution": os.environ.get("AIGC_VIDEO_RESOLUTION", "720P"),
    "video_ratio": os.environ.get("AIGC_VIDEO_RATIO", "16:9"),
    "video_duration": min(15, max(2, int(os.environ.get("AIGC_VIDEO_DURATION", "5")))),
    "max_frames": min(4, max(1, int(os.environ.get("AIGC_MAX_FRAMES", "2")))),
    "poll_interval_s": 2.5,
    "image_poll_max_s": 120,
    "video_poll_max_s": 300,
}


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        os.environ.setdefault(key, value)
    CONFIG["api_key"] = os.environ.get("DASHSCOPE_API_KEY", CONFIG["api_key"])


def dash_fetch(path: str, *, method: str = "GET", headers: dict | None = None, body: dict | None = None) -> dict:
    url = f"{CONFIG['base_url']}{path}"
    payload = None
    req_headers = {
        "Authorization": f"Bearer {CONFIG['api_key']}",
        "Content-Type": "application/json",
    }
    if headers:
        req_headers.update(headers)
    if body is not None:
        payload = json.dumps(body).encode("utf-8")
    request = urllib.request.Request(url, data=payload, headers=req_headers, method=method)
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            text = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        text = exc.read().decode("utf-8", errors="replace")
        try:
            data = json.loads(text) if text else {}
        except json.JSONDecodeError:
            data = {"raw": text}
        message = data.get("message") or data.get("error", {}).get("message") or text or str(exc)
        raise RuntimeError(f"DashScope {exc.code}: {message}") from exc
    return json.loads(text) if text else {}


def extract_text_content(data: dict) -> str:
    choices = data.get("output", {}).get("choices") or []
    if choices and choices[0].get("message", {}).get("content"):
        return str(choices[0]["message"]["content"])
    if data.get("output", {}).get("text"):
        return str(data["output"]["text"])
    return ""


def parse_json_from_text(text: str) -> dict:
    import re

    match = re.search(r"```(?:json)?\s*([\s\S]*?)```", text, re.I)
    candidate = (match.group(1) if match else text).strip()
    try:
        return json.loads(candidate)
    except json.JSONDecodeError:
        start = candidate.find("{")
        end = candidate.rfind("}")
        if start >= 0 and end > start:
            return json.loads(candidate[start : end + 1])
        raise RuntimeError("模型未返回有效 JSON 分镜结构")


def poll_task(task_id: str, max_wait_s: float) -> dict:
    started = time.time()
    while time.time() - started < max_wait_s:
        data = dash_fetch(f"/tasks/{task_id}")
        status = data.get("output", {}).get("task_status") or data.get("task_status")
        if status == "SUCCEEDED":
            return data
        if status in {"FAILED", "CANCELED"}:
            raise RuntimeError(data.get("output", {}).get("message") or data.get("message") or f"任务失败：{status}")
        time.sleep(CONFIG["poll_interval_s"])
    raise RuntimeError("AIGC 任务超时，请稍后重试")


def build_storyboard_prompt(context: dict) -> str:
    tags = "、".join(context.get("tags") or []) or "旅行"
    prefs = "、".join(context.get("preferences") or []) or "文化、路线"
    return f"""你是旅行 Vlog 分镜导演。根据以下旅行日记信息，输出 JSON（不要 markdown 说明），格式：
{{
  "title": "短片标题",
  "summary": "一句话概述",
  "video_prompt": "用于文生视频的完整中文镜头脚本，包含 3-4 个镜头时间轴，并注明配乐/环境音/旁白节奏",
  "frames": [
    {{
      "title": "镜头名",
      "narration": "旁白",
      "visual_prompt": "用于文生图的画面描述，写实旅行摄影风格",
      "duration_sec": 3
    }}
  ]
}}
要求：frames 数量 {CONFIG['max_frames']} 个；目的地真实；适合中国旅行场景。

日记信息：
- 区域：{context.get('regionName') or '旅行区域'}
- 标题：{context.get('title') or '未命名'}
- 目的地：{context.get('destination') or '未知'}
- 标签：{tags}
- 用户偏好：{prefs}
- 正文：{context.get('content') or '（暂无正文）'}
- 媒体说明：{context.get('media') or '（无）'}"""


def generate_storyboard(context: dict) -> dict:
    data = dash_fetch(
        "/services/aigc/text-generation/generation",
        method="POST",
        body={
            "model": CONFIG["text_model"],
            "input": {
                "messages": [
                    {"role": "system", "content": "只输出 JSON，不要额外解释。"},
                    {"role": "user", "content": build_storyboard_prompt(context)},
                ]
            },
            "parameters": {"result_format": "message", "temperature": 0.7},
        },
    )
    parsed = parse_json_from_text(extract_text_content(data))
    frames = parsed.get("frames") or []
    if not frames:
        raise RuntimeError("分镜 JSON 缺少 frames 字段")
    parsed["frames"] = [
        {
            "title": frame.get("title") or f"镜头 {index + 1}",
            "narration": frame.get("narration") or "",
            "visual_prompt": frame.get("visual_prompt") or frame.get("prompt") or f"{context.get('destination')} travel photo",
            "duration_sec": int(frame.get("duration_sec") or 3),
            "image_url": frame.get("image_url") or "",
        }
        for index, frame in enumerate(frames[: CONFIG["max_frames"]])
    ]
    parsed["video_prompt"] = parsed.get("video_prompt") or " ".join(
        frame.get("narration") or "" for frame in parsed["frames"]
    )
    return parsed


def generate_image(prompt: str) -> str:
    submit = dash_fetch(
        "/services/aigc/text2image/image-synthesis",
        method="POST",
        headers={"X-DashScope-Async": "enable"},
        body={
            "model": CONFIG["image_model"],
            "input": {"prompt": prompt},
            "parameters": {"size": "1024*1024", "n": 1},
        },
    )
    task_id = submit.get("output", {}).get("task_id")
    if not task_id:
        raise RuntimeError("文生图任务创建失败")
    result = poll_task(task_id, CONFIG["image_poll_max_s"])
    url = (
        (result.get("output", {}).get("results") or [{}])[0].get("url")
        or result.get("output", {}).get("result_url")
    )
    if not url:
        raise RuntimeError("文生图任务成功但未返回图片 URL")
    return url


def is_wan27_video_model(model: str) -> bool:
    return "wan2.7" in model or "wan2-7" in model


def video_audio_mode(audio_url: str | None = None) -> str:
    if audio_url:
        return "custom"
    if is_wan27_video_model(CONFIG["video_model"]):
        return "auto"
    return "none"


def enrich_video_prompt(prompt: str) -> str:
    if not is_wan27_video_model(CONFIG["video_model"]):
        return prompt
    lowered = prompt.lower()
    if any(token in prompt for token in ("配乐", "背景音乐", "环境音", "音效", "旁白")) or "audio" in lowered:
        return prompt
    return (
        f"{prompt}\n\n"
        "请生成带旅行氛围的背景音乐、环境音效（如风声、脚步声、景区环境声），"
        "整体为写实旅行 Vlog 有声短片，音画同步自然。"
    )


def build_video_request(prompt: str, audio_url: str | None = None) -> dict:
    model = CONFIG["video_model"]
    input_payload: dict = {"prompt": enrich_video_prompt(prompt)}
    if audio_url:
        input_payload["audio_url"] = audio_url
    if is_wan27_video_model(model):
        parameters = {
            "resolution": CONFIG["video_resolution"],
            "ratio": CONFIG["video_ratio"],
            "duration": CONFIG["video_duration"],
            "prompt_extend": True,
            "watermark": False,
        }
    else:
        parameters = {
            "size": "1280*720",
            "duration": CONFIG["video_duration"],
            "prompt_extend": True,
        }
    return {"model": model, "input": input_payload, "parameters": parameters}


def generate_video(prompt: str, audio_url: str | None = None) -> str:
    submit = dash_fetch(
        "/services/aigc/video-generation/video-synthesis",
        method="POST",
        headers={"X-DashScope-Async": "enable"},
        body=build_video_request(prompt, audio_url),
    )
    task_id = submit.get("output", {}).get("task_id")
    if not task_id:
        raise RuntimeError("文生视频任务创建失败")
    result = poll_task(task_id, CONFIG["video_poll_max_s"])
    url = (
        result.get("output", {}).get("video_url")
        or (result.get("output", {}).get("results") or [{}])[0].get("url")
        or result.get("output", {}).get("result_url")
    )
    if not url:
        raise RuntimeError("文生视频任务成功但未返回视频 URL")
    return url


class Handler(BaseHTTPRequestHandler):
    def log_message(self, format: str, *args) -> None:  # noqa: A003
        return

    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET,POST,OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length") or 0)
        raw = self.rfile.read(length).decode("utf-8") if length else ""
        return json.loads(raw) if raw.strip() else {}

    def do_OPTIONS(self) -> None:  # noqa: N802
        self._send_json(204, {})

    def do_GET(self) -> None:  # noqa: N802
        if self.path != "/api/aigc/health":
            self._send_json(404, {"ok": False, "error": "Not found"})
            return
        self._send_json(
            200,
            {
                "ok": True,
                "configured": bool(CONFIG["api_key"]),
                "textModel": CONFIG["text_model"],
                "imageModel": CONFIG["image_model"],
                "videoModel": CONFIG["video_model"],
                "videoAudio": video_audio_mode(os.environ.get("AIGC_AUDIO_URL") or None),
                "maxFrames": CONFIG["max_frames"],
            },
        )

    def do_POST(self) -> None:  # noqa: N802
        try:
            if not CONFIG["api_key"]:
                self._send_json(503, {"ok": False, "error": "未配置 DASHSCOPE_API_KEY。请检查 .env 文件。"})
                return
            body = self._read_json()
            context = body.get("context") or {}
            if self.path == "/api/aigc/storyboard":
                storyboard = generate_storyboard(context)
                self._send_json(200, {"ok": True, "mode": "api", "storyboard": storyboard})
                return
            if self.path == "/api/aigc/images":
                storyboard = body.get("storyboard") or generate_storyboard(context)
                frames = []
                for frame in storyboard.get("frames", [])[: CONFIG["max_frames"]]:
                    image_url = generate_image(frame["visual_prompt"])
                    frames.append({**frame, "image_url": image_url})
                storyboard["frames"] = frames
                self._send_json(200, {"ok": True, "mode": "api", "storyboard": storyboard})
                return
            if self.path == "/api/aigc/video":
                storyboard = body.get("storyboard") or generate_storyboard(context)
                prompt = body.get("prompt") or storyboard.get("video_prompt") or storyboard.get("summary") or "travel vlog"
                audio_url = body.get("audio_url") or os.environ.get("AIGC_AUDIO_URL") or None
                video_url = generate_video(prompt, audio_url=audio_url or None)
                self._send_json(
                    200,
                    {
                        "ok": True,
                        "mode": "api",
                        "storyboard": storyboard,
                        "video_url": video_url,
                        "audio_mode": video_audio_mode(audio_url),
                    },
                )
                return
            if self.path == "/api/aigc/pipeline":
                storyboard = generate_storyboard(context)
                if body.get("withImages", True):
                    frames = []
                    for frame in storyboard.get("frames", []):
                        image_url = generate_image(frame["visual_prompt"])
                        frames.append({**frame, "image_url": image_url})
                    storyboard["frames"] = frames
                video_url = ""
                audio_mode = "none"
                if body.get("withVideo"):
                    audio_url = body.get("audio_url") or os.environ.get("AIGC_AUDIO_URL") or None
                    video_url = generate_video(body.get("prompt") or storyboard.get("video_prompt"), audio_url=audio_url or None)
                    audio_mode = video_audio_mode(audio_url)
                self._send_json(
                    200,
                    {"ok": True, "mode": "api", "storyboard": storyboard, "video_url": video_url, "audio_mode": audio_mode},
                )
                return
            self._send_json(404, {"ok": False, "error": "Not found"})
        except Exception as exc:  # noqa: BLE001
            self._send_json(500, {"ok": False, "error": str(exc)})


def reload_config_from_env() -> None:
    CONFIG["port"] = int(os.environ.get("AIGC_PORT", str(CONFIG["port"])))
    CONFIG["api_key"] = os.environ.get("DASHSCOPE_API_KEY", CONFIG["api_key"])
    CONFIG["base_url"] = os.environ.get("DASHSCOPE_BASE_URL", CONFIG["base_url"])
    CONFIG["text_model"] = os.environ.get("AIGC_TEXT_MODEL", CONFIG["text_model"])
    CONFIG["image_model"] = os.environ.get("AIGC_IMAGE_MODEL", CONFIG["image_model"])
    CONFIG["video_model"] = os.environ.get("AIGC_VIDEO_MODEL", CONFIG["video_model"])
    CONFIG["video_resolution"] = os.environ.get("AIGC_VIDEO_RESOLUTION", CONFIG["video_resolution"])
    CONFIG["video_ratio"] = os.environ.get("AIGC_VIDEO_RATIO", CONFIG["video_ratio"])
    CONFIG["video_duration"] = min(15, max(2, int(os.environ.get("AIGC_VIDEO_DURATION", str(CONFIG["video_duration"])))))
    CONFIG["max_frames"] = min(4, max(1, int(os.environ.get("AIGC_MAX_FRAMES", str(CONFIG["max_frames"])))))


def main() -> None:
    load_env_file(REPO_ROOT / ".env")
    load_env_file(REPO_ROOT / "web" / ".env")
    reload_config_from_env()
    server = ThreadingHTTPServer(("127.0.0.1", CONFIG["port"]), Handler)
    print(f"AIGC proxy listening on http://127.0.0.1:{CONFIG['port']}")
    print(f"API key configured: {'yes' if CONFIG['api_key'] else 'no — check .env'}")
    audio_label = {"auto": "有声", "custom": "自定义音频", "none": "静音"}.get(video_audio_mode(), "静音")
    print(
        f"Models: text={CONFIG['text_model']}, image={CONFIG['image_model']}, "
        f"video={CONFIG['video_model']} ({audio_label}, {CONFIG['video_duration']}s, {CONFIG['max_frames']} frames)"
    )
    server.serve_forever()


if __name__ == "__main__":
    main()
