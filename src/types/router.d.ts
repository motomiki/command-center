// vue-router の RouteMeta を拡張して型安全なメタデータを実現
// ※ export {} で「モジュール」にしないと augmentation ではなく再宣言になる
import 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    /** true の場合、認証が必要なルート */
    requiresAuth?: boolean;
    /** アクセスに必要なロール */
    requiredRole?: 'teacher' | 'student';
  }
}
