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

- 画像の読み込みをjpgだけではなく、.pngに対応してほしい
- 画像の名前をtest_P1.jpgとかからP1.jpgにしたが、画像の読み込みができていないっぽいので修正

# threshold
- projThresholdの調節
- A1 0.1
- A2 0.05
- P1 0.05
- S1 0.05
- nasa 0.05
- z1 
  - smooth 2
  - threshold 0.15
  - smooth 1
  - threshold 0.35

- smoothを下げた(10より1)ほうが滑らかじゃないので、直線的なんで検知しやすい？

- smooth を上げる(10)→投影波形の尖りが減る
ピークの山が広くなって、相対的に 高さが下がる
その結果、同じ threshold だと 拾える範囲が狭くなる
→ なので 閾値を下げる必要が出る
smooth を下げる

形が鋭くなる
ピークの高さが上がる
→ 閾値は 少し高めでも拾える
つまり
smooth↑ → thresholdは↓にしないと同じ量が拾えない

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