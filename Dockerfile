# ---------------------------------------------------------------------------
# Stage 1: ビルド（Node.js）
# ---------------------------------------------------------------------------
FROM node:20-alpine AS builder

WORKDIR /app

# パッケージのみ先にコピーしてキャッシュを効かせる
# --legacy-peer-deps: @google/model-viewer と three の peer 競合を許容
COPY package.json package-lock.json ./
RUN npm ci --legacy-peer-deps

# ソースをコピー
COPY . .

# ビルド時に Supabase の URL/Key を注入（Vite が import.meta.env に埋め込む）
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
ENV VITE_SUPABASE_URL=${VITE_SUPABASE_URL}
ENV VITE_SUPABASE_ANON_KEY=${VITE_SUPABASE_ANON_KEY}
# Vertex AI（デモ用）: 空のときは「AIで文生成」非表示
ARG VITE_VERTEX_AI_FUNCTION_URL
ENV VITE_VERTEX_AI_FUNCTION_URL=${VITE_VERTEX_AI_FUNCTION_URL}

RUN npm run build

# ---------------------------------------------------------------------------
# Stage 2: 本番配信（Nginx）
# ---------------------------------------------------------------------------
FROM nginx:alpine

# デフォルト設定を削除し、SPA 用設定を配置
RUN rm /etc/nginx/conf.d/default.conf
COPY nginx.conf /etc/nginx/conf.d/default.conf

# ビルド成果物を Nginx のドキュメントルートにコピー
COPY --from=builder /app/dist /usr/share/nginx/html

# 非 root で起動する場合は権限調整（Alpine の nginx は root で起動するためコメント）
# RUN chown -R nginx:nginx /usr/share/nginx/html

EXPOSE 8080

CMD ["nginx", "-g", "daemon off;"]
