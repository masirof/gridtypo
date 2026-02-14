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