#!/usr/bin/env python3
import base64
import datetime as dt
import hashlib
import hmac
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ACCESS_KEY_FILE = Path("/Users/tengfeiyang/Downloads/AccessKey.txt")
OUT_DIR = ROOT / "design-samples" / "seedream-v30-test"

HOST = "visual.volcengineapi.com"
ENDPOINT = f"https://{HOST}"
REGION = "cn-north-1"
SERVICE = "cv"
ACTION = "CVProcess"
VERSION = "2022-08-31"
REQ_KEY = "high_aes_general_v30l_zt2i"


CARDS = [
    ("cow", "Cow", "friendly standing black-and-white cow", "pale blue"),
    ("dog", "Dog", "friendly sitting golden dog with floppy ears", "muted green"),
    ("duck", "Duck", "friendly standing white duck with orange beak and feet", "soft blue"),
]


def read_access_keys(path: Path) -> tuple[str, str]:
    text = path.read_text(encoding="utf-8", errors="ignore")
    values = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if ":" in line:
            key, value = line.split(":", 1)
        elif "=" in line:
            key, value = line.split("=", 1)
        else:
            continue
        values[key.strip()] = value.strip().strip('"').strip("'")

    ak = values.get("AccessKeyId") or values.get("VOLC_ACCESSKEY") or values.get("AK")
    sk = values.get("SecretAccessKey") or values.get("VOLC_SECRETKEY") or values.get("SK")
    if not ak or not sk:
        raise RuntimeError("AccessKey.txt must contain AccessKeyId and SecretAccessKey.")
    return ak, sk


def hmac_sha256(key: bytes, data: str) -> bytes:
    return hmac.new(key, data.encode("utf-8"), hashlib.sha256).digest()


def hash_sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sign_request(access_key: str, secret_key: str, body: bytes) -> dict[str, str]:
    now = dt.datetime.utcnow()
    x_date = now.strftime("%Y%m%dT%H%M%SZ")
    short_date = now.strftime("%Y%m%d")
    payload_hash = hash_sha256(body)
    query = f"Action={ACTION}&Version={VERSION}"

    canonical_headers = (
        "content-type:application/json\n"
        f"host:{HOST}\n"
        f"x-content-sha256:{payload_hash}\n"
        f"x-date:{x_date}\n"
    )
    signed_headers = "content-type;host;x-content-sha256;x-date"
    canonical_request = "\n".join([
        "POST",
        "/",
        query,
        canonical_headers,
        signed_headers,
        payload_hash,
    ])

    credential_scope = f"{short_date}/{REGION}/{SERVICE}/request"
    string_to_sign = "\n".join([
        "HMAC-SHA256",
        x_date,
        credential_scope,
        hash_sha256(canonical_request.encode("utf-8")),
    ])

    signing_key = hmac_sha256(
        hmac_sha256(
            hmac_sha256(
                hmac_sha256(secret_key.encode("utf-8"), short_date),
                REGION,
            ),
            SERVICE,
        ),
        "request",
    )
    signature = hmac.new(signing_key, string_to_sign.encode("utf-8"), hashlib.sha256).hexdigest()
    authorization = (
        "HMAC-SHA256 "
        f"Credential={access_key}/{credential_scope}, "
        f"SignedHeaders={signed_headers}, "
        f"Signature={signature}"
    )

    return {
        "Authorization": authorization,
        "Content-Type": "application/json",
        "Host": HOST,
        "X-Content-Sha256": payload_hash,
        "X-Date": x_date,
    }


def build_prompt(title: str, subject: str, background: str) -> str:
    return (
        f'Create one complete individual card for a children charades deck with the word "{title}" printed on the card. '
        "Retro children activity card, hand-drawn animal illustration, off-white cream paper, subtle paper grain, "
        "thin vintage dark border, soft imperfect black ink lines, watercolor and gouache fills. "
        f"Portrait card layout. Large hand-drawn {subject} centered in the upper 70 percent of the card, "
        f"rounded {background} watercolor background patch behind the animal. "
        f'Word label "{title}" near the bottom, simple child-friendly hand-lettered style, dark ink. '
        "One card only. No grid. No numbers. No extra words. No logos, watermark, brand marks, packaging, humans, scary expression, violence, or copyrighted characters. "
        "Keep generous margin so no part of the animal is cropped. Ensure the word is spelled exactly as requested and fits inside the card."
    )


def call_seedream(access_key: str, secret_key: str, prompt: str, seed: int) -> dict:
    payload = {
        "req_key": REQ_KEY,
        "prompt": prompt,
        "use_pre_llm": False,
        "seed": seed,
        "scale": 2.5,
        "width": 1024,
        "height": 1536,
        "return_url": False,
        "logo_info": {"add_logo": False},
    }
    body = json.dumps(payload, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    headers = sign_request(access_key, secret_key, body)
    url = f"{ENDPOINT}?Action={ACTION}&Version={VERSION}"
    request = urllib.request.Request(url, data=body, headers=headers, method="POST")
    with urllib.request.urlopen(request, timeout=180) as response:
        raw = response.read()
    return json.loads(raw.decode("utf-8"))


def download_url(url: str) -> bytes:
    with urllib.request.urlopen(url, timeout=90) as response:
        return response.read()


def save_result(result: dict, out_path: Path) -> None:
    data = result.get("data") or {}
    binary = data.get("binary_data_base64") or []
    urls = data.get("image_urls") or []
    if binary:
        out_path.write_bytes(base64.b64decode(binary[0]))
    elif urls:
        out_path.write_bytes(download_url(urls[0]))
    else:
        raise RuntimeError(f"No image payload in response: {json.dumps(result, ensure_ascii=False)[:1000]}")


def assert_success(result: dict) -> None:
    code = result.get("code", result.get("status"))
    if code != 10000:
        raise RuntimeError(f"Seedream request failed: {json.dumps(result, ensure_ascii=False)[:2000]}")
    data = result.get("data") or {}
    alg = data.get("algorithm_base_resp") or {}
    if alg and alg.get("status_code") not in (0, None):
        raise RuntimeError(f"Seedream algorithm failed: {json.dumps(result, ensure_ascii=False)[:2000]}")


def main() -> int:
    access_key, secret_key = read_access_keys(ACCESS_KEY_FILE)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = []

    for index, (slug, title, subject, background) in enumerate(CARDS, start=1):
        prompt = build_prompt(title, subject, background)
        out_path = OUT_DIR / f"{slug}-seedream-card.png"
        response_path = OUT_DIR / f"{slug}-seedream-response.json"
        print(f"Generating {title} -> {out_path.name}", flush=True)
        result = call_seedream(access_key, secret_key, prompt, seed=2026061100 + index)
        response_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        assert_success(result)
        save_result(result, out_path)
        manifest.append({"slug": slug, "title": title, "file": out_path.name, "response": response_path.name})
        time.sleep(1)

    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(manifest)} images to {OUT_DIR}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
