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