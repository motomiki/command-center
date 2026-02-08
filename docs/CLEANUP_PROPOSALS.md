# 整理・運用の提案

開発完了に伴う整理の一環として、以下の対応を検討してください。いずれも任意です。

## 1. Python のキャッシュを .gitignore に追加（推奨）

`scripts/tcg_generator/src/` 配下に `__pycache__/` および `*.pyc` が生成されます。リポジトリに含めない場合は次を追加してください。

```gitignore
# Python
__pycache__/
*.py[cod]
*.pyo
.Python
```

## 2. Unused を .gitignore に含めるかどうか

- **含めない場合**: 履歴・参照用として Unused もコミットし、チームで参照できるようにする。
- **含める場合**: ローカルだけに残し、リポジトリのサイズを抑える。必要なら `Unused/` を .gitignore に追加。

## 3. ドキュメントの更新

- `docs/PROGRESS.md`: 「sample/ をベースにした実装」などの記述がある場合、参照先を `Unused/sample/` に変更するか、注釈を付けると分かりやすくなります。
- `README.md`: リポジトリ構成の説明に `Unused/` の役割を 1 行追記してもよいです。

## 4. TCG ジェネレータの output フォルダ

`scripts/tcg_generator/output/` は現在 `.gitkeep` のみです。今後も `main.py` 実行でプレビュー画像がここに出力されます。生成物をリポジトリに含めたくない場合は、既に `.gitkeep` でディレクトリだけ維持しているので、必要に応じて `output/*.png` を .gitignore に追加するとよいです。

---

以上は提案です。必要に応じて取り入れてください。
