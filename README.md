# AURELIA — 宇宙の小さな住まい

Three.js を使った、一人称で散策できる宇宙基地です。
Separate_assets_glb の家具・植物・生活用品など15種類を使用し、16点配置しています。アセットはライセンス上の理由からリポジトリに同梱していません。`assets/` は Git の追跡対象外です。

起動前に、正規に入手した次の GLB をローカルの `assets/` フォルダーに配置してください。

```text
bed_001.glb
coffee_machine_001.glb
cup_001.glb
cup_002.glb
drawer_001.glb
flower_001.glb
flower_003.glb
flower_005.glb
flower_008.glb
lamp_001.glb
laptop_001.glb
pillow_001.glb
seat_003.glb
table_001.glb
wall_computer_001.glb
```

## 起動

Windows で `Start.bat` をダブルクリックしてください（Node.js が必要です）。
ブラウザーが先に開いて接続エラーになった場合は、数秒後に再読み込みしてください。

または、このフォルダーで以下を実行します。

```sh
node server.mjs
```

ブラウザーで http://127.0.0.1:4173 を開きます。停止はサーバーのウィンドウで Ctrl+C。
HTML の直接ダブルクリックではなく、ローカルサーバー経由で使用してください。
Three.js 本体・ローダーは同梱しています。必要な GLB をローカルに配置すれば、実行時のインターネット接続や npm install は不要です。

## 操作

- マウスの左ドラッグ：視点の回転
- 「自由に見回す」：マウスを固定して見回す（対応ブラウザー）
- WASD / 矢印キー：前後左右へ移動
- Shift：移動速度を上げる
- Esc：マウス固定を解除し、画面のボタンを操作
- 「昼」「夜」 / N：昼夜を切り替え
- 「部屋へ戻る」：初期位置・視点に戻る

右側の光る出入口から砂漠へ出られます。帰りも同じ出入口を通れます。
壁・大きな家具には簡易衝突判定があります。地表に沿って歩き、探索範囲は基地から X/Z 各 ±220 m です。
PC のキーボードとマウス操作を想定しています。

## 構成

- main.js：室内、地形、惑星、アセット配置、照明、移動処理
- index.html / style.css：日本語の操作 UI
- assets/：ユーザーがローカルに配置する GLB（Git 管理対象外）
- vendor/：Three.js 0.180.0（MIT ライセンスを同梱）
- server.mjs：127.0.0.1 のみに公開するローカルサーバー

Three.js 公式資料：https://threejs.org/docs/
元 GLB の権利・利用条件は提供元のものに従ってください。
