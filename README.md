# 大仏BASE

世界の大仏・仏像データベース（265件）。GitHub / Netlifyで管理するための移行リポジトリです。

- `site/index.html`: 確定したv4のカード型TOP
- `site/data/statues.json`: 265件の登録データ
- `site/admin/index.html`: 管理画面
- `netlify/functions/`: データ保存・画像アップロードAPI

**注意**: Netlifyへのデプロイと本番動作検証はこれからです。GitHubにアップしただけでは公開されません。管理用キー `ADMIN_TOKEN` をNetlifyの環境変数に設定し、秘密をリポジトリへ書かないでください。
