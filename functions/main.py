"""
Cloud Functions (第2世代) - Vertex AI Gemini 連携。

リクエストボディで action を指定:
- card_text: カード用テキスト（タイトル・コメント・褒め言葉）を生成
- prompt_optimize: 画像生成用の英語プロンプトを最適化
"""
import json
import logging
import os
import re

# Cloud Functions では GOOGLE_CLOUD_PROJECT が自動設定されない場合があるため、
# 明示的に Vertex AI 利用を有効化する
os.environ.setdefault("GOOGLE_GENAI_USE_VERTEXAI", "True")

# デプロイ前に gcloud でプロジェクトが設定されている前提。
# location=global でグローバルエンドポイントを使用（gemini-2.0-flash-001 の利用可能性が高い）。
# リージョン指定する場合は GOOGLE_CLOUD_LOCATION=asia-northeast1 等を設定。
VERTEX_LOCATION = os.environ.get("GOOGLE_CLOUD_LOCATION", "global")
# 安定版モデル ID を使用（エイリアス gemini-2.0-flash は 404 になる場合があるため）
# https://cloud.google.com/vertex-ai/generative-ai/docs/learn/model-versions
GEMINI_MODEL = "gemini-2.0-flash-001"


def _get_response_text(response) -> str:
    """
    generate_content の応答からテキストを安全に取得する。
    google-genai のバージョン差で response.text が None や別構造になる場合に対応。
    """
    text = getattr(response, "text", None)
    if text is not None and isinstance(text, str):
        return text
    # candidates からフォールバック
    candidates = getattr(response, "candidates", None) or []
    if candidates:
        first = candidates[0] if isinstance(candidates, list) else candidates
        content = getattr(first, "content", first)
        if content is not None:
            parts = getattr(content, "parts", None) or []
            if parts and isinstance(parts, list):
                part = parts[0]
                if hasattr(part, "text"):
                    return part.text or ""
    return ""


def _get_genai_client():
    """Vertex AI 経由の Gen AI クライアントを返す。"""
    from google import genai
    from google.genai.types import HttpOptions

    project_id = os.environ.get("GOOGLE_CLOUD_PROJECT") or os.environ.get("GCLOUD_PROJECT")
    if not project_id:
        raise RuntimeError(
            "Project ID not set. Set GOOGLE_CLOUD_PROJECT or GCLOUD_PROJECT when deploying."
        )

    return genai.Client(
        vertexai=True,
        project=project_id,
        location=VERTEX_LOCATION,
        http_options=HttpOptions(api_version="v1"),
    )


def _generate_card_text(client, activity_type: str, context: str) -> dict:
    """
    カード用のタイトル・コメント・褒め言葉を日本語で生成する。
    小学生向けで平易な表現にする。
    """
    prompt = f"""あなたは、小学生の放課後クラブで使う「がんばりカード」の文を考える先生です。
以下の情報をもとに、カードに書く「タイトル」「コメント」「褒め言葉」を1つずつ、日本語で考えてください。

- 活動の種類: {activity_type}
- 補足（成果や状況）: {context or '特になし'}

ルール:
1. 小学生（低学年も含む）が読める、やさしい日本語で書く。難しい漢字は使わない。
2. 褒め言葉は短く、子どもがうれしくなるフレーズ（例: 「すごい！」「この調子！」）。
3. 出力は次のJSON形式のみ。余計な説明やマークダウンは付けない。
   {{"title": "タイトル", "description": "コメント（先生からのメッセージ）", "praiseWords": "褒め言葉"}}
"""
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
    )
    text = _get_response_text(response).strip()
    # コードブロックがあれば除去
    if "```" in text:
        text = re.sub(r"```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```", "", text)
    try:
        data = json.loads(text)
        return {
            "title": data.get("title", ""),
            "description": data.get("description", ""),
            "praiseWords": data.get("praiseWords", ""),
        }
    except json.JSONDecodeError:
        # パースに失敗したら行分割で推測
        lines = [ln.strip() for ln in text.split("\n") if ln.strip()]
        return {
            "title": lines[0] if len(lines) > 0 else "がんばりカード",
            "description": lines[1] if len(lines) > 1 else text[:200],
            "praiseWords": lines[2] if len(lines) > 2 else "すごい！",
        }


def _optimize_prompt(client, title: str, description: str, art_style: str) -> dict:
    """
    タイトル・コメント・画風から、画像生成用の英語プロンプトを1つ生成する。
    """
    prompt = f"""You are an expert prompt engineer for AI image generation. Generate a single, detailed, high-quality prompt in English for an image generation model.

Input from the user (title and comment may be in Japanese):
- Title: {title or '(none)'}
- Comment/Description: {description or '(none)'}
- Visual style to apply strictly: {art_style}

Requirements:
1. Output ONLY the English image-generation prompt. No explanations, no "Prompt:" prefix, no markdown.
2. Expand on the title and description to create a vivid, specific scene suitable for a child-friendly trading card illustration.
3. Apply the given visual style precisely.
4. Include: no text or letters in the image, no borders or frames, full bleed, high quality illustration.
5. Keep the prompt to 2-4 clear, descriptive sentences.
"""
    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt,
    )
    optimized = _get_response_text(response).strip()
    return {"optimizedPrompt": optimized}


def handle_request(request):
    """
    HTTP トリガーエントリポイント。
    POST で JSON ボディ: { "action": "card_text" | "prompt_optimize", ... }
    """
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "3600",
        }
        return ("", 204, headers)

    headers = {"Access-Control-Allow-Origin": "*", "Content-Type": "application/json"}

    if request.method != "POST":
        return (json.dumps({"error": "Method not allowed"}), 405, headers)

    try:
        body = request.get_json(silent=True) or {}
    except Exception:
        body = {}

    action = body.get("action")
    if not action:
        return (
            json.dumps({"error": "Missing 'action'. Use 'card_text' or 'prompt_optimize'."}),
            400,
            headers,
        )

    try:
        client = _get_genai_client()
    except Exception as e:
        logging.exception("Vertex AI client init failed: %s", e)
        return (
            json.dumps(
                {"error": f"Vertex AI client init failed: {e!s}"}
            ),
            500,
            headers,
        )

    try:
        if action == "card_text":
            activity_type = body.get("activityType", "typing")
            context = body.get("context", "")
            result = _generate_card_text(client, activity_type, context)
            return (json.dumps(result), 200, headers)

        if action == "prompt_optimize":
            title = body.get("title", "")
            description = body.get("description", "")
            art_style = body.get("artStyle", "子ども向けファンタジー風、温かみのあるイラスト。")
            result = _optimize_prompt(client, title, description, art_style)
            return (json.dumps(result), 200, headers)

        return (
            json.dumps({"error": f"Unknown action: {action}"}),
            400,
            headers,
        )
    except Exception as e:
        logging.exception("Vertex AI generate_content failed: %s", e)
        return (
            json.dumps({"error": f"Vertex AI generate_content failed: {e!s}"}),
            500,
            headers,
        )
