"""
TCG Generator データモデル定義。
1枚分のカード入力・バリデーションを Pydantic で管理する。
"""
from __future__ import annotations

from enum import Enum
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class Rarity(str, Enum):
    """カードのレアリティ（フロントの CardData と一致）。"""
    C = "C"
    U = "U"
    R = "R"
    RR = "RR"
    SR = "SR"
    UR = "UR"


# 文字数制限（タイトル・説明・プロンプト）
TITLE_MAX_LEN = 40
DESCRIPTION_MAX_LEN = 200
PROMPT_MAX_LEN = 500


class CardData(BaseModel):
    """
    1枚分のカード生成用入力データ。
    CLI / CSV / JSON から構築し、AI生成・合成層に渡す。
    """
    title: str = Field(..., min_length=1, max_length=TITLE_MAX_LEN, description="カード名")
    description: str = Field("", max_length=DESCRIPTION_MAX_LEN, description="先生からのコメント")
    rarity: Rarity = Field(Rarity.C, description="レアリティ")
    prompt: str = Field(..., min_length=1, max_length=PROMPT_MAX_LEN, description="イラスト用プロンプト")

    # オプション（バッチ・識別用）
    card_id: str | None = Field(None, description="出力ファイル名などに使うID")
    date: str | None = Field(None, description="日付 YYYY-MM-DD")
    student_id: str | None = Field(None, description="生徒ID")

    @field_validator("title", "description", "prompt", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v

    @field_validator("title", mode="after")
    @classmethod
    def title_not_empty(cls, v: str) -> str:
        if not v:
            raise ValueError("タイトルは1文字以上必要です")
        return v

    @field_validator("prompt", mode="after")
    @classmethod
    def prompt_not_empty(cls, v: str) -> str:
        if not v:
            raise ValueError("プロンプトは1文字以上必要です")
        return v

    def get_frame_key(self) -> str:
        """レアリティに応じた枠ファイル名（例: SR.png）を返す。"""
        return f"{self.rarity.value}.png"


def rarity_from_string(s: str) -> Rarity:
    """文字列を Rarity に変換。不正な場合は C を返す。"""
    try:
        return Rarity(s.upper().strip())
    except ValueError:
        return Rarity.C
