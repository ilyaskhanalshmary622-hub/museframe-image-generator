import base64
import json
import os
from email.parser import BytesParser
from email.policy import default as email_policy
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib import error, request
from urllib.parse import parse_qs, urlparse


ROOT = Path(__file__).resolve().parent
PUBLIC_DIR = ROOT / "public"
PORT = int(os.environ.get("PORT", "8765"))


def env(name, default=""):
    return os.environ.get(name, default).strip()


def image_api_base():
    return env("IMAGE_API_BASE_URL", "https://grsai.dakka.com.cn").rstrip("/")


def image_api_url():
    return f"{image_api_base()}/v1/api/generate"


def image_result_url(task_id):
    return f"{image_api_base()}/v1/api/result?id={task_id}"


def model_name():
    return env("IMAGE_MODEL", "gpt-image-2.5")


def image_quality(quality):
    model = model_name()
    if model in {"gpt-image-2", "gpt-image-2.5"}:
        return "auto"
    if quality == "1k":
        return "low"
    if quality == "2k":
        return "medium"
    if quality == "4k":
        return "high"
    return "xhigh"


def image_size(ratio, quality):
    if quality == "1k":
        return {
            "1:1": "1024x1024",
            "16:9": "1280x720",
            "9:16": "720x1280",
            "4:5": "896x1120",
            "3:4": "864x1152",
        }.get(ratio, "1024x1024")
    if quality == "4k":
        return {
            "1:1": "2880x2880",
            "16:9": "3840x2160",
            "9:16": "2160x3840",
            "4:5": "2560x3200",
            "3:4": "2448x3264",
        }.get(ratio, "2880x2880")
    if quality == "8k":
        return {
            "1:1": "4096x4096",
            "16:9": "7680x4320",
            "9:16": "4320x7680",
            "4:5": "5120x6400",
            "3:4": "4896x6528",
        }.get(ratio, "4096x4096")
    return {
        "1:1": "2048x2048",
        "16:9": "2048x1152",
        "9:16": "1152x2048",
        "4:5": "1792x2240",
        "3:4": "1536x2048",
    }.get(ratio, "2048x2048")


def build_prompt(prompt, mode, ratio, quality, edit_mode, edit_brief, files):
    lines = [
        prompt.strip(),
        "",
        f"画面比例：{ratio}",
        f"清晰度需求：{quality.upper()}",
        f"生成模式：{'图生图' if files or mode == 'image-to-image' else '文生图'}",
        f"编辑方式：{edit_mode}",
        "要求：真实自然，高级商业摄影质感，主体清晰，细节干净，不要水印，不要错字，不要畸形。",
    ]
    if edit_brief.strip():
        lines.extend(["替换/编辑要求：", edit_brief.strip()])
    if files:
        lines.append(f"参考图数量：{len(files)}。请尽量保持参考图中的产品结构、Logo 朝向、材质和关键识别点。")
    return "\n".join(lines)


def normalize_result(data):
    if not isinstance(data, dict):
        raise RuntimeError("生图服务返回格式异常")

    results = data.get("results")
    if isinstance(results, list) and results:
        first = results[0] or {}
        if first.get("url"):
            return {"status": "succeeded", "imageUrl": first["url"], "taskId": data.get("id")}
        if first.get("b64_json"):
            return {
                "status": "succeeded",
                "imageUrl": f"data:image/png;base64,{first['b64_json']}",
                "taskId": data.get("id"),
            }

    for key in ("imageUrl", "url", "image"):
        if data.get(key):
            return {"status": "succeeded", "imageUrl": data[key], "taskId": data.get("id")}

    status = data.get("status") or "running"
    if status in {"failed", "violation"}:
        raise RuntimeError(data.get("error") or status)
    return {"status": status, "taskId": data.get("id"), "progress": data.get("progress")}


def grsai_request(api_key, url, payload=None):
    body = None if payload is None else json.dumps(payload, ensure_ascii=False).encode("utf-8")
    headers = {"Authorization": f"Bearer {api_key}"}
    if payload is not None:
        headers["Content-Type"] = "application/json"
    req = request.Request(url, data=body, headers=headers, method="POST" if payload is not None else "GET")
    try:
        with request.urlopen(req, timeout=60) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Grsai 返回 {exc.code}：{detail}") from exc
    except error.URLError as exc:
        raise RuntimeError(f"Grsai 网络错误：{exc.reason}") from exc


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC_DIR), **kwargs)

    def do_POST(self):
        if self.path == "/api/generate":
            self.handle_generate()
            return
        self.send_json(404, {"error": "接口不存在"})

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/result":
            self.handle_result(parsed)
            return
        if parsed.path == "/api/health":
            self.send_json(200, {"ok": True, "model": model_name(), "baseUrl": image_api_base()})
            return
        super().do_GET()

    def handle_generate(self):
        if not self.authorized():
            return
        api_key = env("IMAGE_API_KEY")
        if not api_key:
            self.send_json(500, {"error": "服务器没有配置 IMAGE_API_KEY"})
            return

        try:
            fields, files = self.read_multipart()
            prompt = fields.get("prompt", "").strip()
            if not prompt:
                self.send_json(400, {"error": "请输入提示词"})
                return

            quality = fields.get("quality", "2k")
            ratio = fields.get("ratio", "1:1")
            payload = {
                "model": model_name(),
                "prompt": build_prompt(
                    prompt=prompt,
                    mode=fields.get("mode", "text-to-image"),
                    ratio=ratio,
                    quality=quality,
                    edit_mode=fields.get("editMode", "generate"),
                    edit_brief=fields.get("editBrief", ""),
                    files=files,
                ),
                "images": [file["data"] for file in files],
                "aspectRatio": image_size(ratio, quality),
                "quality": image_quality(quality),
                "replyType": "async",
            }
            data = grsai_request(api_key, image_api_url(), payload)
            self.send_json(200, normalize_result(data))
        except Exception as exc:  # noqa: BLE001
            self.send_json(500, {"error": str(exc)})

    def handle_result(self, parsed):
        if not self.authorized():
            return
        api_key = env("IMAGE_API_KEY")
        if not api_key:
            self.send_json(500, {"error": "服务器没有配置 IMAGE_API_KEY"})
            return

        task_id = (parse_qs(parsed.query).get("id") or [""])[0].strip()
        if not task_id:
            self.send_json(400, {"error": "缺少任务 ID"})
            return

        try:
            data = grsai_request(api_key, image_result_url(task_id))
            self.send_json(200, normalize_result(data))
        except Exception as exc:  # noqa: BLE001
            self.send_json(500, {"error": str(exc)})

    def authorized(self):
        password = env("MUSEFRAME_ACCESS_PASSWORD")
        if not password:
            self.send_json(500, {"error": "服务器没有配置访问密码"})
            return False
        if self.headers.get("X-MuseFrame-Password", "").strip() != password:
            self.send_json(403, {"error": "访问密码不正确"})
            return False
        return True

    def read_multipart(self):
        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type:
            raise ValueError("请求格式错误：需要 multipart/form-data")

        content_length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(content_length)
        header_blob = f"Content-Type: {content_type}\r\nContent-Length: {content_length}\r\n\r\n".encode("utf-8")
        message = BytesParser(policy=email_policy).parsebytes(header_blob + raw)

        fields = {}
        files = []
        for part in message.iter_parts():
            disposition = part.get("Content-Disposition", "")
            if "form-data" not in disposition:
                continue
            name = part.get_param("name", header="content-disposition")
            filename = part.get_filename()
            payload = part.get_payload(decode=True) or b""
            if filename:
                files.append(
                    {
                        "name": filename,
                        "mimeType": part.get_content_type(),
                        "data": base64.b64encode(payload).decode("utf-8"),
                    }
                )
            elif name:
                fields[name] = payload.decode("utf-8", errors="replace")
        return fields, files

    def send_json(self, status, data):
        raw = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)


def main():
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"MuseFrame running at http://127.0.0.1:{PORT}")
    server.serve_forever()


if __name__ == "__main__":
    main()
