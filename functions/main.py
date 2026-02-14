"""
Cloud Functions (第2世代) - Vertex AI Gemini 連携。

リクエストボディで action を指定:
- card_text: カード用テキスト（タイトル・コメント・褒め言葉）を生成
- prompt_optimize: 画像生成用の英語プロンプトを最適化
- student_icon: 生徒アバター（PFP）画像を生成
- card_image: カード用イラスト画像を生成（プロンプト最適化＋画像生成）
- minecraft_analyze: Minecraft スクリーンショットから作品名・説明を生成
"""
import base64
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


# 生徒アイコン・カード画像用の画像生成モデル（Vertex AI 画像生成対応）
STUDENT_ICON_MODEL_FLASH = "gemini-2.5-flash-image"
STUDENT_ICON_MODEL_PRO = "gemini-3-pro-image-preview"

# 画風キー → スタイル説明（CardGeneratorService.ts の ART_STYLE_PROMPTS と一致させる）
ART_STYLE_PROMPTS = {
    "fantasy": "ファンタジー風、魔法や冒険の世界観、温かみのある色彩、子ども向けで夢のあるイラスト。",
    "anime": "アニメ風、クリーンな線画、鮮やかな色使い、日本のアニメ・イラストスタイル。",
    "manga": "漫画風、はっきりした線、コントラストの効いたトーン、動きのある構図。",
    "painting": "絵画風、筆のタッチがわかる質感、芸術的な雰囲気、子どもにも親しみやすいタッチ。",
    "pixel": "ドット絵風、レトロなピクセルアート、はっきりした色と形、ゲーム風。",
}

# 画像生成プロンプト末尾の制約（CardGeneratorService.ts の IMAGE_PROMPT_CONSTRAINT_SUFFIX と一致）
IMAGE_PROMPT_CONSTRAINT_SUFFIX = (
    " No text, no letters, no logos. No white or black border, no frame, no margin. Full bleed only, edge to edge."
)


def _generate_card_image(client, body: dict) -> dict:
    """
    カード用イラスト画像を1枚生成する。
    リクエスト: title, description, artStyle (fantasy|anime|manga|painting|pixel), modelType (flash|pro)
    返却: {"imageDataUrl": "data:<mime>;base64,..."}
    """
    from google.genai.types import GenerateContentConfig, Modality

    title = (body.get("title") or "").strip() or "カード"
    description = (body.get("description") or "").strip()
    art_style_key = body.get("artStyle") or "fantasy"
    art_style = ART_STYLE_PROMPTS.get(
        art_style_key, ART_STYLE_PROMPTS["fantasy"]
    )
    model_type = body.get("modelType") or "flash"
    target_model = (
        STUDENT_ICON_MODEL_PRO if model_type == "pro" else STUDENT_ICON_MODEL_FLASH
    )

    result = _optimize_prompt(client, title, description, art_style)
    optimized = (result.get("optimizedPrompt") or "").strip()
    if not optimized:
        raise ValueError("Prompt optimization returned empty string for card_image")
    final_prompt = optimized + IMAGE_PROMPT_CONSTRAINT_SUFFIX

    config = GenerateContentConfig(
        response_modalities=[Modality.TEXT, Modality.IMAGE],
    )
    response = client.models.generate_content(
        model=target_model,
        contents=final_prompt,
        config=config,
    )

    candidates = getattr(response, "candidates", None) or []
    if not candidates:
        raise RuntimeError("No candidates returned (safety filter or model error).")

    content = getattr(candidates[0], "content", None)
    if content is None:
        raise RuntimeError("Response has no content.")

    parts = getattr(content, "parts", None) or []
    for part in parts:
        inline_data = getattr(part, "inline_data", None)
        if inline_data is None:
            continue
        data_bytes = getattr(inline_data, "data", None)
        if not data_bytes:
            continue
        mime_type = getattr(inline_data, "mime_type", None) or "image/png"
        b64 = base64.b64encode(data_bytes).decode("ascii")
        image_data_url = f"data:{mime_type};base64,{b64}"
        return {"imageDataUrl": image_data_url}

    raise RuntimeError(
        "Response contained no image part (safety filter or model returned text only)."
    )


def _generate_student_icon(client, body: dict) -> dict:
    """
    生徒用アバター（PFP）画像を1枚生成する。
    リクエスト: prompt, modelType ("flash"|"pro"), gender ("boy"|"girl"), style ("anime"|"pixel")
    返却: {"imageDataUrl": "data:<mime>;base64,..."}
    """
    from google.genai.types import GenerateContentConfig, Modality

    prompt = (body.get("prompt") or "").strip()
    if not prompt:
        raise ValueError("prompt is required for student_icon")

    model_type = body.get("modelType") or "flash"
    target_model = (
        STUDENT_ICON_MODEL_PRO if model_type == "pro" else STUDENT_ICON_MODEL_FLASH
    )

    gender = body.get("gender") or "boy"
    gender_text = "女の子" if gender == "girl" else "男の子"

    style = body.get("style") or "anime"
    if style == "pixel":
        style_prompt = (
            "レトロゲーム風のドット絵（Pixel Art）。16ビット風、ピクセルパーフェクト、ノスタルジックでかわいらしい"
        )
    else:
        style_prompt = (
            "高品質な日本のアニメ風（Anime Style）イラスト。セルシェーディング、鮮やかな色彩、表情豊かでかわいらしい"
        )

    final_prompt = (
        f"{style_prompt}{gender_text}のキャラクターアイコン（PFP / プロフィール画像）を1枚生成してください。"
        f"正面または斜め向きの顔アップ構図。背景はシンプルな単色にしてください。テーマ: {prompt}"
    )

    config = GenerateContentConfig(
        response_modalities=[Modality.TEXT, Modality.IMAGE],
    )
    response = client.models.generate_content(
        model=target_model,
        contents=final_prompt,
        config=config,
    )

    candidates = getattr(response, "candidates", None) or []
    if not candidates:
        raise RuntimeError("No candidates returned (safety filter or model error).")

    content = getattr(candidates[0], "content", None)
    if content is None:
        raise RuntimeError("Response has no content.")

    parts = getattr(content, "parts", None) or []
    for part in parts:
        inline_data = getattr(part, "inline_data", None)
        if inline_data is None:
            continue
        data_bytes = getattr(inline_data, "data", None)
        if not data_bytes:
            continue
        mime_type = getattr(inline_data, "mime_type", None) or "image/png"
        b64 = base64.b64encode(data_bytes).decode("ascii")
        image_data_url = f"data:{mime_type};base64,{b64}"
        return {"imageDataUrl": image_data_url}

    raise RuntimeError(
        "Response contained no image part (safety filter or model returned text only)."
    )


MINECRAFT_ANALYZE_PROMPT = """この画像は、小学生が作った Minecraft（マインクラフト）の作品のスクリーンショットです。
画像の内容を分析し、次の 2 つを日本語で出力してください。小学生が読んでワクワクする、やさしくて短い表現にしてください。

1. **title**: 作品のタイトル（10文字程度まで。カタカナ・ひらがな中心で、かっこいい・かわいい名前）
2. **description**: 作品の説明（1文、または簡潔な2文まで。ブロックの色・形・スケールなど、見た目のポイントをほめるような文）

出力は必ず次の JSON 形式のみにしてください。他の説明や改行は入れないでください。
{"title":"ここにタイトル","description":"ここに説明文"}"""


def _minecraft_analyze(client, body: dict) -> dict:
    """
    Minecraft スクリーンショットを分析し、作品名と説明文を生成する。
    リクエスト: image: { mimeType, data } (data は base64 文字列)
    返却: {"title": "...", "description": "..."}
    """
    from google.genai.types import Part

    image = body.get("image") or {}
    mime_type = (image.get("mimeType") or "image/png").strip()
    data_b64 = image.get("data")
    if not data_b64:
        raise ValueError("image.data is required for minecraft_analyze")
    try:
        image_bytes = base64.b64decode(data_b64)
    except Exception as e:
        raise ValueError(f"Invalid base64 in image.data: {e!s}") from e

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=[
            Part.from_bytes(data=image_bytes, mime_type=mime_type),
            MINECRAFT_ANALYZE_PROMPT,
        ],
    )
    text = _get_response_text(response).strip()
    if "```" in text:
        text = re.sub(r"```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```", "", text)
    try:
        data = json.loads(text)
        return {
            "title": (data.get("title") or "").strip() or "Minecraft作品",
            "description": (data.get("description") or "").strip() or "ブロックでつくった作品です。",
        }
    except json.JSONDecodeError:
        return {
            "title": "Minecraft作品",
            "description": text[:200] if text else "ブロックでつくった作品です。",
        }


def handle_request(request):
    """
    HTTP トリガーエントリポイント。
    POST で JSON ボディ: { "action": "card_text" | "prompt_optimize" | "student_icon" | "card_image", ... }
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
            json.dumps(
                {
                    "error": "Missing 'action'. Use 'card_text', 'prompt_optimize', 'student_icon', 'card_image', or 'minecraft_analyze'."
                }
            ),
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

        if action == "student_icon":
            try:
                result = _generate_student_icon(client, body)
                return (json.dumps(result), 200, headers)
            except ValueError as e:
                return (json.dumps({"error": str(e)}), 400, headers)
            except RuntimeError as e:
                return (json.dumps({"error": str(e)}), 500, headers)

        if action == "card_image":
            try:
                result = _generate_card_image(client, body)
                return (json.dumps(result), 200, headers)
            except ValueError as e:
                return (json.dumps({"error": str(e)}), 400, headers)
            except RuntimeError as e:
                return (json.dumps({"error": str(e)}), 500, headers)

        if action == "minecraft_analyze":
            try:
                result = _minecraft_analyze(client, body)
                return (json.dumps(result), 200, headers)
            except ValueError as e:
                return (json.dumps({"error": str(e)}), 400, headers)
            except Exception as e:
                logging.exception("minecraft_analyze failed: %s", e)
                return (json.dumps({"error": str(e)}), 500, headers)

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
