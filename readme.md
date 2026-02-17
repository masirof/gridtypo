# 構成
- opencv
- canvas
- lil-gui

## lil-gui
localStorage に保存
キーは gridtypo1-lilgui

## AIプロンプト
- gridtypo1.htmlに /images/test_S1.jpgを読み込んで、opencv使ってコーナー検出して
- lil-guiでopencvのパラメータをスライダーで調節できるようにして、lil-guiのパラメータ保存と、モード切替を使って
- tsで書いて
- ライブラリはcdnで入れて

- gridtypo1.htmlをgridtypo2.htmlにコピーし、 頂点をx軸に平行な線とy軸に平行な線でグリッド状にしてほしい　lil-guiにパラメーター追加して

- 線xとyについて、線y0とy1のgap とy2とy3のgapから頂点がないところにもラインを引きたい grid推定をして
- 線の間隔が等価でないものは、頂点を通っている線はいじらずに、できるだけ同じ線の間隔になるようにグリッドを引いてほしい

- test_P1.jpgを読み込みたい　lil guiでimages\test_P1.jpg　\images配下までのパスを入れるやつと、\imagse配下の画像ファイルをドロップダウンで選択できるやつほしい

- n点の頂点を通る線を表示する機能　n点をGUIに min1~max5

- 輪郭階層を実装して、階層番号を表示してほしい
- 輪郭階層、最小面積全体の何％以下は抽出しないフィルターほしい
- countercolorの線で境界が分かれているので、これの内側、外側で文字入れてほしい

- 境界線マスクからX/Y投影を作り、ピーク検出でグリッド候補線を抽出し、間隔推定に基づいて補完グリッドを生成してください。
- 頂点検出グリッド生成モードと、境界線マスクモードでguiでモード変えられるようにして、デフォルトは境界線マスクモード

- lilgui グループ化して分けてみて

## トラシュ
opencv.js のロード完了だけでは使える状態にならず、Module.onRuntimeInitialized を待つ必要がある

## opencv設定
{
  "controllers": {
    "mode": "Shi-Tomasi",
    "maxCorners": 150,
    "qualityLevel": 0.05,
    "minDistance": 10,
    "blockSize": 2,
    "k": 0.02,
    "pointRadius": 5,
    "pointColor": "#00ff66",
    "showSource": true
  },
  "folders": {}
}