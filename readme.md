# 全体
- グリッド解析ツール
- 手動で文字作るツール
- 自動で文字作るツール


# 手動で文字作るツール
## 仕様
- n*nのグリッドで構成
  - n*nのグリッド数を調節できる
- モデル
  - grid
  - 
- 1.四角いグリッドを塗りつぶす
- 2.線を調整する
  - グリッドの交点(ドット)を2点のドット間の線をグリグリ移動できる
- cadぽく線幅やR値を調節できる

- 名前何がいいだろう
  - grid dot line shape vector
  - dotlinegridtypo
  - gridmoji
  - かぶりにくくて覚えやすくてシンプルでスペルがわかりやすくてかぶりにくいように8文字ぐらいで独自性がある言葉
  - ゼクサとかヴィとかわかりにくい
  - hand_gridtypo

## AIプロンプト
- hand_gridtypo1.htmlを編集して
- scan_gridtypo3.htmlを参考にして右端のlilguiと下のdebugviewを追加して
- 左上にはグリッドの編集viewを表示
- lilguiにn(縦)とn(横)のスライドバー追加して、グリッド数を制御したい
- グリッドの表示はドットのみ

- 下記機能をscan_gridtypo3.htmlを参考にして追加
  - save preset
  - load preset
  - reset
  - copy preset

- 4つドットで囲まれた1マスを押したら四角く塗る機能
  - 縦につながるところなら1マス塗れているが、横につながるところが濡れていない
fillsize1のときは、各点を頂点として1マス塗りたい
  - 左クリック長押しで連続的に塗れるようにして欲しい
  - 1マスと1マスの間に余白ができているので、余白をなくしてほしい
- n*nのドットを正方形の頂点の位置にしてほしい

- すでに塗られた1マスを左クリック、1クリック 長押ししたら、消えてほしい　いまは動作が不安定　点滅する
- 消すとき、左クリック長押しのときは、消す専門のモードにしてほしい

- 塗られた1マスの辺の、頂点を移動できる機能 
- マグネット機能がほしい 近くのグリッドの点にピタッと吸い付く すべてのグリッドの頂点に吸い付く　移動前の頂点にもマグネット吸い付くように
- 左クリッククリック長押しで頂点移動、移動中も重くないぐらいにリアルタイム描画してほしい
- グリッドの点と、辺の頂点を別々に描画してほしい(グリッドの点は動かさないように)
- マスが塗られていないときは、(頂点は移動できない and 辺の頂点は描画されない)
- 塗られているマスの頂点のみを描画 1マス塗ったら4頂点のみ描画

- 塗られたセルのうち、未塗りセルまたは領域外に接する辺、頂点をすべて描画する 辺の色、太さはlilguiで調節
- 塗られたセルのうち、未塗りセルまたは領域外に接しない辺、頂点は描画しない、判定がない

- 頂点がいじられたとき、セル頂点の中だけfillcolorで塗ってほしい 頂点が移動したとき再計算
- 頂点が移動しても、セル頂点内だけを塗ってほしい
- 頂点が移動したら、既存のマス

- 1マス以上が塗られたとき、頂点を移動したら、辺の中をfillcolorで塗ってほしい
- マスが消されたときに、消されたマスの頂点のキャッシュをなくしてほしい

- 頂点があるマスを押したとき、マスに所属する頂点を全部消してほしい

- デバッグ用にid=debugの下にcell_debugを追加してほしい
  - どこのセルをクリックして塗ったか？
  - fillcolorが塗られているか？
  - 移動した頂点の情報(移動が決定してからログ出力)
  - をログ見たら全部わかるようにしてくれ～

## デザイン 色
全部の背景色 363636にして
境界線を 5e5e5eにして
9f9f9f

ウィンドウを丸みをもたせるのをやめて、シームレスにつながる四角にしてほしい
領域ごとの境界線が一つになるようにしてほしい

lilguiのベース色を363636にして
(アクセント色(スライドバーの縦棒)、文字色) = --number-colorをe8481eにして
ベースの文字色はfffにして
lilguiのtitleの背景色を9f9f9fにして、title内のテキストの色は000にして


# グリッド解析ツール
## 構成
- opencv
- canvas
- lil-gui

## lil-gui
localStorage に保存
キーは gridtypo1-lilgui

## todo
- [x] gridを境界線の外に書かないようにする→チェックボックス化
- [ ] グループを閉じた開いたを保存するやつ
- [ ] a2, z1 文字のノイズ除去を維持したまま、細いラインにも対応したい
  - counters minArea%
- [x] よく使う項目guiを上部に持ってくる
- [ ] gridrequireboundaryhit nasa なんか当たってんのに消えとる

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

- う～んsmoothとthreshold2つのパラメータをいじるのがめんどいので、一つのパラメータでいい感じにしたい

- gridを境界線に少しでも当たっていない線は、描かないようにする
- 少しでも当たった線は画像の端から端まで伸ばして良い
- 色は変わらんようにして
- 当たり判定の余白長さのしきい値を調整できるように
- チェックボックス化

- showgridをすると、画像の色が消えるので修正してくれや

- グループimagsの下にグループよく使うを追加し、下要素を複製して移動しておいて
  - projectionグループの3要素
  - gridfillmissing
  - gridRequireBoundaryHit
  - 同じ設定項目が複数個ある場合は値が同期するようにして←もっさりしているので高速化してくれあ
  - スライダーにできるものはスライダーにして


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
  "controllers": {},
  "folders": {
    "Image": {
      "controllers": {
        "imagePath": "images/z1.jpg",
        "imageFile": "z1.jpg"
      },
      "folders": {}
    },
    "Corners": {
      "controllers": {
        "mode": "Shi-Tomasi",
        "maxCorners": 150,
        "qualityLevel": 0.05,
        "minDistance": 10,
        "blockSize": 2,
        "k": 0.02,
        "pointRadius": 5,
        "pointColor": "#ff0000",
        "showPoints": true
      },
      "folders": {}
    },
    "Grid": {
      "controllers": {
        "showGrid": true,
        "gridMode": "Boundary",
        "gridColor": "#44ff00",
        "gridThickness": 2,
        "gridAlpha": 1,
        "gridMinSpacing": 10,
        "gridMinPoints": 2,
        "gridFillMissing": true,
        "gridTargetSpacing": 0
      },
      "folders": {}
    },
    "Projection": {
      "controllers": {
        "projSmooth": 1,
        "projK": 2.1,
        "projMinDistance": 20
      },
      "folders": {}
    },
    "Contours": {
      "controllers": {
        "showContours": true,
        "contourColor": "#3366ff",
        "contourThickness": 2,
        "contourSmooth": true,
        "contourSmoothEpsPx": 1,
        "minArea%": 1
      },
      "folders": {}
    },
    "Hierarchy": {
      "controllers": {
        "showHierarchy": true,
        "hierarchyColor": "#6670ff",
        "hierarchyFontScale": 1
      },
      "folders": {}
    },
    "View": {
      "controllers": {
        "showSource": true
      },
      "folders": {}
    }
  }
}