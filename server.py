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


def model_name():
    return env("IMAGE_MODEL", "gpt-image-2.5")


def image_quality(quality):
    model = model_name()
    if model in {"gpt-image-2", "gpt-image-2.5"}:
        return "auto"
    return {
        "1k": "low",
        "2k": "medium",
        "4k": "high",
        "8k": "max",
    }.get(quality, "medium")


def image_size(ratio, quality):
    model = model_name()

    # Grsai docs: gpt-image-2 / gpt-image-2.5 should stay in 1K-grade sizes.
    # Higher pixel sizes are reserved for vip / flare / sunburst style models.
    if model in {"gpt-image-2", "gpt-image-2.5"}:
        return {
            "1:1": "1024x1024",
            "16:9": "1672x941",
            "9:16": "941x1672",
            "4:3": "1443x1090",
            "3:4": "1090x1443",
            "4:5": "1120x1408",
        }.get(ratio, "1024x1024")

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
        f"鐢婚潰姣斾緥锛歿ratio}",
        f"娓呮櫚搴﹂渶姹傦細{quality.upper()}",
        f"鐢熸垚妯″紡锛歿'鍥剧敓鍥? if files or mode == 'image-to-image' else '鏂囩敓鍥?}",
        f"缂栬緫鏂瑰紡锛歿edit_mode}",
        "瑕佹眰锛氱湡瀹炶嚜鐒讹紝楂樼骇鍟嗕笟鎽勫奖璐ㄦ劅锛屼富浣撴竻鏅帮紝缁嗚妭骞插噣锛屼笉瑕佹按鍗帮紝涓嶈閿欏瓧锛屼笉瑕佺暩褰€?,
    ]
    if edit_brief.strip():
        lines.extend(["鏇挎崲/缂栬緫瑕佹眰锛?, edit_brief.strip()])
    if files:
        lines.append(f"鍙傝€冨浘鏁伴噺锛歿len(files)}銆傚敖閲忎繚鎸佸弬鑰冨浘涓殑浜у搧缁撴瀯銆丩ogo 鏈濆悜銆佹潗璐ㄥ拰鍏抽敭璇嗗埆鐐广€?)
    return "\n".join(lines)


def normalize_result(data):
    if not isinstance(data, dict):
        raise RuntimeError("鐢熷浘鏈嶅姟杩斿洖鏍煎紡寮傚父")

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
                text = resp.read().decode("utf-8")
                return json.loads(text)
        except error.HTTPError as exc:
            detail = exc.read().decode("utf-8", errors="replace")
            raise RuntimeError(f"Grsai 杩斿洖 {exc.code}锛歿detail}") from exc
        except (error.URLError, TimeoutError, socket.timeout) as exc:
            last_error = exc
            if attempt == 0:
                continue

    reason = getattr(last_error, "reason", last_error)
    raise RuntimeError(f"Grsai 缃戠粶瓒呮椂鎴栬繛鎺ュけ璐ワ細{reason}")


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(PUBLIC_DIR), **kwargs)

    def do_POST(self):
        if self.path == "/api/generate":
            self.handle_generate()
            return
        self.send_json(404, {"error": "鎺ュ彛涓嶅瓨鍦?})

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
            self.send_json(500, {"error": "鏈嶅姟鍣ㄦ病鏈夐厤缃?IMAGE_API_KEY"})
            return

        try:
            fields, files = self.read_multipart()
            prompt = fields.get("prompt", "").strip()
            if not prompt:
                self.send_json(400, {"error": "璇疯緭鍏ユ彁绀鸿瘝"})
                return

            quality = fields.get("quality", "1k")
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
            self.send_json(500, {"error": "鏈嶅姟鍣ㄦ病鏈夐厤缃?IMAGE_API_KEY"})
            return

        task_id = (parse_qs(parsed.query).get("id") or [""])[0].strip()
        if not task_id:
            self.send_json(400, {"error": "缂哄皯浠诲姟 ID"})
            return

        try:
            data = grsai_request(api_key, image_result_url(task_id))
            self.send_json(200, normalize_result(data))
        except Exception as exc:  # noqa: BLE001
            self.send_json(500, {"error": str(exc)})

    def authorized(self):
        password = env("MUSEFRAME_ACCESS_PASSWORD")
        if not password:
            self.send_json(500, {"error": "鏈嶅姟鍣ㄦ病鏈夐厤缃闂瘑鐮?})
            return False
        if self.headers.get("X-MuseFrame-Password", "").strip() != password:
            self.send_json(403, {"error": "璁块棶瀵嗙爜涓嶆纭?})
            return False
        return True

    def read_multipart(self):
        content_type = self.headers.get("Content-Type", "")
        if "multipart/form-data" not in content_type:
            raise ValueError("璇锋眰鏍煎紡閿欒锛氶渶瑕?multipart/form-data")

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
