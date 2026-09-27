# ジオラマ表示のドット立ち絵（public/portraits-dot/）の作り方

作者の立ち絵（public/portraits/ の線画）を、LAN の画像生成（ComfyUI の Qwen-Image-Edit-2511。
C:/_own/git/ComfyUI/agent/README.md）で「同じポーズ・髪型・服・表情のまま清書してべた塗り」にし、
それをドット絵にする。線画を直接ドット化すると、ラフな内側の線が縮小で潰れて読めなかったため（2026-09-27）。

1. 線画を白地に貼って `work/<id>_white.png` にする（透明のままだと背景が黒く読まれる）
2. `bash scripts/portrait-dots/run.sh`（`ONLY="kiriko teto"` で一部だけ）— キャラごとの色の指示つきで清書（1枚 約40秒）。
   **色は各キャラの公式サイトの設定・公式立ち絵に合わせる**（run.sh の各行に出典。キリコは肌が山吹色）。
   床の影が出たら「床の影や地面は描かない」を強める／seed を変える
3. `python scripts/portrait-dots/topix.py 150 [id…]` — 白地を抜き、全身 150 ドットに面積平均で縮小、
   14色に減色、外周に1ドットの輪郭。`work/<id>_pix.png` を public/portraits-dot/<id>.png へ
4. ゲームは表示のときに場面の色を 45% かける（engine/diorama.ts の tintPortrait）

作者が自分でドット立ち絵を描いたら、同じ名前で public/portraits-dot/ に置けば差し替わる。
