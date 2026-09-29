import base64
import json
import os
import socket
import mimetypes
from email.parser import BytesParser
from email.policy import default as email_policy
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib import error, request
from urllib.parse import parse_qs, quote, urlparse


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


def default_download_hosts():
    aitohumanize_hosts = [f"file{index}.aitohumanize.com" for index in range(1, 31)]
    return ",".join(
        [
            *aitohumanize_hosts,
            "file.aitohumanize.com",
            "image.grsai.ai",
            "grsaiapi.com",
            "grsai.dakka.com.cn",
        ]
    )


def model_name(value=""):
    return (value or env("IMAGE_MODEL", "gpt-image-2.5")).strip()


def is_nano_banana_model(model):
    return (model or "").strip().startswith("nano-banana")


def high_spec_image_model(model):
    return model in {"gpt-image-2-vip", "gpt-image-2.5-flare", "gpt-image-2.5-sunburst"} or is_nano_banana_model(model)


def image_quality(model, requested="standard"):
    requested = (requested or "standard").strip().lower()
    if is_nano_banana_model(model):
        return None
    if model in {"gpt-image-2", "gpt-image-2.5"}:
        return "auto"
    if requested == "4k":
        return "xhigh" if model == "gpt-image-2.5-sunburst" else "high"
    if requested == "high":
        return "high"
    return "medium"


def image_size(model):
    if is_nano_banana_model(model):
        return "auto"
    if model in {"gpt-image-2", "gpt-image-2.5"}:
        return "auto"
    return "1024x1024"


def nano_banana_image_size(requested="standard"):
    requested = (requested or "standard").strip().lower()
    if requested == "4k":
        return "4K"
    if requested == "high":
        return "2K"
    return "1K"


def safe_image_count(value):
    try:
        return min(4, max(1, int(value)))
    except (TypeError, ValueError):
        return 1


def safe_video_duration(value):
    try:
        return min(15, max(1, int(value)))
    except (TypeError, ValueError):
        return 5


def safe_video_resolution(value):
    value = (value or "").strip()
    return value if value in {"480p", "768p", "1080p"} else "768p"


def safe_aspect_ratio(value, model):
    value = (value or "").strip()
    ratio_to_size = {
        "1:1": "1024x1024",
        "16:9": "1280x720",
        "9:16": "720x1280",
        "4:3": "1152x864",
        "3:4": "864x1152",
        "3:2": "1536x1024",
        "2:3": "1024x1536",
        "5:4": "1120x896",
        "4:5": "896x1120",
        "21:9": "1920x832",
        "9:21": "832x1920",
    }
    if is_nano_banana_model(model):
        ratio_map = {
            "1024x1024": "1:1",
            "1280x720": "16:9",
            "720x1280": "9:16",
            "1152x864": "4:3",
            "864x1152": "3:4",
            "1536x1024": "3:2",
            "1024x1536": "2:3",
            "1120x896": "5:4",
            "896x1120": "4:5",
            "1920x832": "21:9",
            "832x1920": "9:21",
        }
        allowed_ratios = {
            "auto",
            "1:1",
            "16:9",
            "9:16",
            "4:3",
            "3:4",
            "3:2",
            "2:3",
            "5:4",
            "4:5",
            "21:9",
            "1:4",
            "4:1",
            "1:8",
            "8:1",
        }
        if value in allowed_ratios:
            return value
        return ratio_map.get(value, "1:1")

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
    if value in ratio_to_size:
        return ratio_to_size[value]
    return value if value in allowed else image_size(model)


def image_aspect_ratio(value, model, requested_quality):
    base = safe_aspect_ratio(value, model)
    requested_quality = (requested_quality or "standard").strip().lower()
    if not high_spec_image_model(model) or requested_quality == "standard":
        return base

    upscale_map = {
        "high": {
            "1024x1024": "2048x2048",
            "1280x720": "2048x1152",
            "720x1280": "1152x2048",
            "1152x864": "2304x1728",
            "864x1152": "1728x2304",
            "1536x1024": "2048x1360",
            "1024x1536": "1360x2048",
            "1120x896": "2240x1792",
            "896x1120": "1792x2240",
            "1920x832": "3072x1536",
            "832x1920": "1536x3072",
        },
        "4k": {
            "1024x1024": "2880x2880",
            "1280x720": "3840x2160",
            "720x1280": "2160x3840",
            "1152x864": "3264x2448",
            "864x1152": "2448x3264",
            "1536x1024": "3504x2336",
            "1024x1536": "2336x3504",
            "1120x896": "3200x2560",
            "896x1120": "2560x3200",
            "1920x832": "3840x1920",
            "832x1920": "1920x3840",
        },
    }
    return upscale_map.get(requested_quality, {}).get(base, base)


def safe_video_aspect_ratio(value):
    value = (value or "").strip().lower()
    if value in {"portrait", "landscape"}:
        return value
    if ":" in value:
        try:
            width, height = [float(item) for item in value.split(":", 1)]
            return "portrait" if height >= width else "landscape"
        except ValueError:
            pass
    if "x" in value:
        try:
            width, height = [int(item) for item in value.split("x", 1)]
            return "portrait" if height > width else "landscape"
        except ValueError:
            pass
    return "portrait"


def build_prompt(prompt, mode, files, requested_quality="standard"):
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
    if requested_quality == "high":
        lines.append("Output detail: high definition commercial image, sharp product texture, clean edges, premium lighting.")
    elif requested_quality == "4k":
        lines.append("Output detail: ultra clear 4K commercial product photography, sharp texture, high resolution, premium realistic details.")
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
        if parsed.path == "/api/download":
            self.handle_download(parsed)
            return
        super().do_GET()

    def handle_generate(self):
        try:
            fields, files = self.read_multipart()
            api_key = self.image_api_key(fields)
            if not api_key:
                self.send_json(400, {"error": "Please set Grsai API Key first"})
                return

            prompt = fields.get("prompt", "").strip()
            if not prompt:
                self.send_json(400, {"error": "Prompt is required"})
                return

            media_type = fields.get("mediaType", "image").strip().lower()
            selected_model = model_name(fields.get("model", ""))
            requested_quality = fields.get("imageQuality", "standard").strip().lower()
            if media_type != "image":
                requested_quality = "standard"
            if requested_quality == "4k" and not high_spec_image_model(selected_model):
                requested_quality = "standard"
            count = 1 if media_type == "video" else safe_image_count(fields.get("count", "1"))
            prompt_text = build_prompt(
                prompt=prompt,
                mode=fields.get("mode", "text-to-image"),
                files=files,
                requested_quality=requested_quality,
            )
            if media_type == "video":
                frame_notes = []
                try:
                    file_roles = json.loads(fields.get("fileRoles", "[]"))
                except json.JSONDecodeError:
                    file_roles = []

                if isinstance(file_roles, list) and file_roles:
                    for index, role in enumerate(file_roles[: len(files)], start=1):
                        if role == "start_frame":
                            frame_notes.append(f"Uploaded image #{index} is the START FRAME. Use it as the opening shot and keep its subject composition at the beginning.")
                        elif role == "end_frame":
                            frame_notes.append(f"Uploaded image #{index} is the END FRAME. The video should naturally transition toward this final composition/result.")
                        else:
                            frame_notes.append(f"Uploaded image #{index} is a visual reference. Use it for product, character, scene, material, and style consistency.")
                else:
                    if fields.get("hasStartFrame"):
                        frame_notes.append("The first uploaded image is the START FRAME. Use it as the opening shot and keep its subject composition at the beginning.")
                    if fields.get("hasEndFrame"):
                        frame_notes.append("The next uploaded image is the END FRAME. The video should naturally transition toward this final composition/result.")
                    ref_count = fields.get("videoReferenceCount", "0").strip()
                    if ref_count and ref_count != "0":
                        frame_notes.append("The remaining uploaded images are additional visual references. Use them only for product, character, scene, material, and style consistency.")
                if frame_notes:
                    prompt_text = "\n".join(
                        [
                            prompt_text,
                            "",
                            "Video reference mapping:",
                            *frame_notes,
                            "Do not treat the start frame and end frame as random references. Build a coherent motion path from the start frame to the end frame.",
                        ]
                    )
                video_resolution = safe_video_resolution(fields.get("resolution", ""))
                video_duration = safe_video_duration(fields.get("duration", ""))
                if video_resolution == "1080p" and video_duration > 10:
                    video_duration = 10
                common_payload = {
                    "model": selected_model or "minimax-h3",
                    "images": [file["dataUrl"] for file in files],
                    "aspectRatio": safe_video_aspect_ratio(fields.get("aspectRatio", "")),
                    "resolution": video_resolution,
                    "duration": video_duration,
                    "replyType": "async",
                }
            else:
                common_payload = {
                    "model": selected_model,
                    "images": [file["dataUrl"] for file in files],
                    "aspectRatio": image_aspect_ratio(fields.get("aspectRatio", ""), selected_model, requested_quality),
                    "replyType": "async",
                }
                if is_nano_banana_model(selected_model):
                    common_payload["imageSize"] = nano_banana_image_size(requested_quality)
                else:
                    common_payload["quality"] = image_quality(selected_model, requested_quality)
            results = []
            for index in range(count):
                payload = {
                    **common_payload,
                    "prompt": prompt_text if media_type == "video" else f"{prompt_text}\n\nVariation index: {index + 1}. Keep the same brief, but create a distinct usable version.",
                }
                results.append(normalize_result(grsai_request(api_key, image_api_url(), payload)))

            images = [item["imageUrl"] for item in results if item.get("imageUrl")]
            tasks = [{"taskId": item["taskId"]} for item in results if item.get("taskId")]
            if len(results) == 1:
                self.send_json(200, {**results[0], "mediaType": media_type})
            else:
                self.send_json(200, {"status": "running", "tasks": tasks, "images": images, "mediaType": media_type})
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
        fields = {}
        try:
            if "multipart/form-data" in self.headers.get("Content-Type", ""):
                fields, _files = self.read_multipart()
        except Exception:
            fields = {}
        api_key = self.image_api_key(fields)
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

    def handle_download(self, parsed):
        params = parse_qs(parsed.query)
        target_url = (params.get("url") or [""])[0].strip()
        filename = (params.get("name") or ["museframe-asset"])[0].strip() or "museframe-asset"
        parsed_target = urlparse(target_url)
        allowed_hosts = {
            item.strip().lower()
            for item in env(
                "MUSEFRAME_DOWNLOAD_HOSTS",
                default_download_hosts(),
            ).split(",")
            if item.strip()
        }
        host = (parsed_target.hostname or "").lower()
        if parsed_target.scheme != "https" or host not in allowed_hosts:
            self.send_json(400, {"error": f"文件域名未加入下载白名单：{host}。把这个域名发给我，我会精确加入允许下载列表。"})
            return

        try:
            req = request.Request(target_url, headers={"User-Agent": "MuseFrame/1.0"})
            with request.urlopen(req, timeout=120) as resp:
                content_length = int(resp.headers.get("Content-Length", "0") or "0")
                if content_length > 350 * 1024 * 1024:
                    self.send_json(413, {"error": "File is too large to proxy download"})
                    return
                content = resp.read()
                content_type = resp.headers.get_content_type() or mimetypes.guess_type(target_url)[0] or "application/octet-stream"
        except Exception as exc:
            self.send_json(502, {"error": f"Download failed: {exc}"})
            return

        safe_name = "".join(char for char in filename if char.isalnum() or char in "._-")[:120] or "museframe-asset"
        if "." not in safe_name:
            safe_name += mimetypes.guess_extension(content_type) or ""

        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.send_header("Content-Disposition", f"attachment; filename*=UTF-8''{quote(safe_name)}")
        self.end_headers()
        self.wfile.write(content)

    def image_api_key(self, fields=None):
        fields = fields or {}
        return self.headers.get("X-Image-Api-Key", "").strip() or fields.get("apiKey", "").strip()

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
