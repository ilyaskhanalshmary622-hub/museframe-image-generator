import base64
import json
import os
import socket
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


def allowed_origins():
    values = env(
        "MUSEFRAME_ALLOWED_ORIGINS",
        "https://museframe-image-generator.onrender.com,http://127.0.0.1:8765,http://localhost:8765",
    )
    return {item.strip().rstrip("/") for item in values.split(",") if item.strip()}


def model_name(value=""):
    return (value or env("IMAGE_MODEL", "gpt-image-2.5")).strip()


def image_quality(model):
    if model in {"gpt-image-2", "gpt-image-2.5"}:
        return "auto"
    return "medium"


def image_size(model):
    if model in {"gpt-image-2", "gpt-image-2.5"}:
        return "auto"
    return "1024x1024"


def safe_image_count(value):
    try:
        return min(4, max(1, int(value)))
    except (TypeError, ValueError):
        return 1


def safe_aspect_ratio(value, model):
    allowed = {
        "1024x1024",
        "1280x720",
        "720x1280",
        "1152x864",
        "864x1152",
        "1536x1024",
        "1024x1536",
        "1120x896",
        "896x1120",
        "1920x832",
        "832x1920",
    }
    value = (value or "").strip()
    return value if value in allowed else image_size(model)


def build_prompt(prompt, mode, files):
    output_mode = "image-to-image" if files or mode == "image-to-image" else "text-to-image"
    lines = [
        prompt.strip(),
        "",
        f"Generation mode: {output_mode}",
        "Style requirements: realistic, natural, premium commercial photography, clean details, clear subject, no watermark, no typo, no distorted object.",
    ]
    if files:
        lines.append(
            f"Reference image count: {len(files)}. Keep the product structure, logo direction, material, and key visual identity from the reference images."
        )
    return "\n".join(lines)


def normalize_result(data):
    if not isinstance(data, dict):
        raise RuntimeError("Invalid response format from image service")

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

    method = "POST" if payload is not None else "GET"
    req = request.Request(url, data=body, headers=headers, method=method)
    timeout = int(env("IMAGE_API_TIMEOUT", "180"))

    last_error = None
    for attempt in range(2):
        try:
            with request.urlopen(req, timeout=timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Grsai HTTP {exc.code}: {detail}") from exc
        except (error.URLError, TimeoutError, socket.timeout) as exc:
            last_error = exc
            if attempt == 0:
                continue

    reason = getattr(last_error, "reason", last_error)
    raise RuntimeError(f"Grsai network timeout or connection failed: {reason}")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC_DIR), **kwargs)

    def end_headers(self):
        origin = (self.headers.get("Origin") or "").rstrip("/")
        if origin in allowed_origins():
            self.send_header("Access-Control-Allow-Origin", origin)
            self.send_header("Vary", "Origin")
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Image-Api-Key")
        self.send_header("Access-Control-Max-Age", "86400")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_POST(self):
        if self.path == "/api/generate":
            self.handle_generate()
            return
        if self.path == "/api/balance":
            self.handle_balance()
            return
        self.send_json(404, {"error": "Endpoint not found"})

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
        api_key = self.image_api_key()
        if not api_key:
            self.send_json(400, {"error": "Please set Grsai API Key first"})
            return

        try:
            fields, files = self.read_multipart()
            prompt = fields.get("prompt", "").strip()
            if not prompt:
                self.send_json(400, {"error": "Prompt is required"})
                return

            selected_model = model_name(fields.get("model", ""))
            count = safe_image_count(fields.get("count", "1"))
            prompt_text = build_prompt(
                prompt=prompt,
                mode=fields.get("mode", "text-to-image"),
                files=files,
            )
            common_payload = {
                "model": selected_model,
                "images": [file["dataUrl"] for file in files],
                "aspectRatio": safe_aspect_ratio(fields.get("aspectRatio", ""), selected_model),
                "quality": image_quality(selected_model),
                "replyType": "async",
            }
            results = []
            for index in range(count):
                payload = {
                    **common_payload,
                    "prompt": f"{prompt_text}\n\nVariation index: {index + 1}. Keep the same brief, but create a distinct usable version.",
                }
                results.append(normalize_result(grsai_request(api_key, image_api_url(), payload)))

            images = [item["imageUrl"] for item in results if item.get("imageUrl")]
            tasks = [{"taskId": item["taskId"]} for item in results if item.get("taskId")]
            if len(results) == 1:
                self.send_json(200, results[0])
            else:
                self.send_json(200, {"status": "running", "tasks": tasks, "images": images})
        except Exception as exc:
            self.send_json(500, {"error": str(exc)})

    def handle_result(self, parsed):
        api_key = self.image_api_key()
        if not api_key:
            self.send_json(400, {"error": "Please set Grsai API Key first"})
            return

        task_id = (parse_qs(parsed.query).get("id") or [""])[0].strip()
        if not task_id:
            self.send_json(400, {"error": "Task ID is required"})
            return

        try:
            data = grsai_request(api_key, image_result_url(task_id))
            self.send_json(200, normalize_result(data))
        except Exception as exc:
            self.send_json(500, {"error": str(exc)})

    def handle_balance(self):
        api_key = self.image_api_key()
        if not api_key:
            self.send_json(400, {"error": "Please set Grsai API Key first"})
            return
        self.send_json(
            200,
            {
                "balance": "Key ready",
                "detail": "Balance API is not included in the current Grsai docs. Generation is available.",
            },
        )

    def image_api_key(self):
        return self.headers.get("X-Image-Api-Key", "").strip() or env("IMAGE_API_KEY")

    def read_multipart(self):
        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type:
            raise ValueError("Invalid request format: multipart/form-data is required")

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
                mime_type = part.get_content_type()
                encoded = base64.b64encode(payload).decode("utf-8")
                files.append(
                    {
                        "name": filename,
                        "mimeType": mime_type,
                        "dataUrl": f"data:{mime_type};base64,{encoded}",
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
