# 我的回憶地圖 · chicTrip 概念原型

入口：`index.html`。從「回憶作品」可返回手機版。

## 如何操作
- 「總回憶」依序回顧台灣桃園國際機場出發、大阪、首爾、香港，共 12 段旅程。
- 播放／暫停、下一段、重播、1×／2×；點城市縮小範圍，點節點或貼紙直接跳到該站。
- 抵達時顯示貼紙、故事與日期，景點周邊建築變為暖金色。拖曳地圖會暫停播放；可縮放、旋轉或切換平面／立體。
- 18 枚貼紙包含地標、美食、環球影城、T1／FAKER、LE SSERAFIM 應援、拍貼與黑膠。收藏依城市分頁，每頁 6 枚。

## 展示範圍
所有人物、回憶敘事、日期、同行者及收藏均為 Mock Data。LE SSERAFIM 演出情境為虛構，並非真實演出公告。品牌、團體與姓名只用於模擬個人旅遊興趣，不代表官方素材或合作。

交通與路線表達旅程順序，不是實際道路導航、鐵軌、班機航跡或 GPS 紀錄。地點座標為展示近似值。亮燈是景點周邊足跡示意，不表示已確認拜訪每棟建築。部分地區的公開建築高度與覆蓋可能不足。

本頁使用預先生成貼紙，尚未串接使用者帳號、即時生圖或持久化收藏。重播會重設本次回顧進度。無相簿上傳與自動社群發文。

## 技術與素材
- 原生 HTML / CSS / JavaScript，MapLibre GL JS **5.6.2** 已放於 vendor，BSD-3-Clause 授權見 vendor/MAPLIBRE-LICENSE.txt。
- 官方 3D 範例：https://maplibre.org/maplibre-gl-js/docs/examples/display-buildings-in-3d/
- OpenFreeMap Positron 底圖與公開向量圖磚：https://openfreemap.org/quick_start/ 。底圖資料 © OpenStreetMap contributors；圖面保留 attribution。街道、字型、sprite 與建築需要網路，未使用 Mapbox token。
- Natural Earth 110m 世界陸地作概略底圖，public domain：https://www.naturalearthdata.com/about/terms-of-use/
- Lucide 圖示，ISC License，見 assets/icons/LICENSE。https://lucide.dev/
- travel-stickers.png / interest-stickers.png 為本原型使用內建 ImageGen 產生的 3×3 插畫素材，CSS 分格展示。
- USJ 官方地點參考：https://www.usj.co.jp/company/company_e/about/profile/
- T1 BASE CAMP 官方地址參考：https://en.shop-t1.gg/ （首爾麻浦區 Yanghwa-ro 147 地下一樓）；座標僅作情境示意。

MapLibre 程式與基本陸地隨專案附帶，詳細底圖仍需要連線。建議 HTTP 本機伺服器或 GitHub Pages 開啟。WebGL 不可用時顯示提示並保留貼紙回顧。

## 沉浸回憶（2026-09-09）

- 出發地設定為台灣桃園國際機場；時間軸與地圖都能回到出發點。
- Three.js r160.1 本地版本（MIT，見 vendor/THREE-LICENSE.txt）；以 MapLibre custom layer 顯示自建飛機、列車、巴士、的士與雙層電車網格。模型大小按畫面可讀性放大，並非真實比例或等比例航行模擬。
- 到站先聚焦建築、亮起三次（約 1.8 秒），再淡入實景回憶並停留約 4.8 秒（2× 仍保留完整建築與作品轉場时间）；可以關閉自動展開、停留、點收藏或返回地圖。
- 12 張有授權的參考照片，來源與作者見 [照片授權](assets/scenes/PHOTO-LICENSE.md)。電競與演唱會影像為情境參考，非 T1 指定店面或 LE SSERAFIM 真實場次，畫面另有註明。
- 環境音由 Web Audio 合成，不是現場錄音，也沒有使用商業歌曲；預設關閉，只有點擊開關後播放，離開場景停止。
- 照片視差與慢鏡頭為 2D 影像效果，不是重建的 360° 街景。未讀取個人相簿。
- 可用 `index.html?memory=3` 直接預覽通天閣回憶。

## 攝影詩頁與列車精緻化

- 列車四節車廂分別取樣路徑位置與方向，過彎時各自轉向；香港叮叮車保持單輛雙層模型。路線仍為旅程示意。
- 每站原照片自然縮入 3:4 攝影詩頁的上半部，同一景物的 AI 插畫在下半部漸顯。11 張新生成插畫，USJ 沿用現有 AI 貼紙。
- 到站自動播放；「重看變化」可重播，滑桿可自由查看中間進度。操作滑桿或重播會暫停旅程，避免看圖時跳站。
- 減少動態效果偏好下不自動轉場；按重看變化即時切換原照／作品。切站、離頁取消舊動畫與非同步回傳。
- AI 圖為預先生成的展示素材，瀏覽器即時執行版面縮放、柔焦與淡入，不是即時 AI 生成影片，也不是光流重建。
- [素材來源及改作授權](assets/scenes/PHOTO-LICENSE.md) · [完整生成提示詞](assets/scenes/ai/prompts.json)。

## 抵達建築與連續轉場

- 本地路線做圓角取樣，車輛漸進加速與減速；到站後保留停靠，再隨鏡頭靠近淡出。
- 以目前景點座標查找 OpenMapTiles 建築輪廓，優先選包含該點的建築，否則只接受 25 公尺內最近輪廓；只點亮該棟建築，取消原本整片方形街區染色。座標與輪廓仍為公開圖資的近似示意。找不到建築時僅顯示地點光圈，不杜撰建築。
- 暖金色建築本體柔和閃爍三次後保留亮色，才淡入回憶照片。暫停會停止脈動，繼續後接續同一進度；減少動態效果下改為恆亮。
- 回憶場景以地標為起點展開照片：進入 380ms、退出 240ms。照片進入轉場前維持相同構圖，不再由裁切畫面突然改成完整照片；取消會互相干擾的照片視差。
- 重播照片效果時先平順回到原照，再向作品轉場；下一站的照片與插畫提前載入。點節點先播放該站建築與回憶，完成後停留，不自動播放整趟。

## 快速動態版本

參考 [Fluent 2 Motion](https://fluent2.microsoft.design/motion) 的 container transform、短時間與減速曲線，以及 [Windows timing and easing](https://learn.microsoft.com/en-us/windows/apps/design/motion/timing-and-easing) 的快速進場原則。下列數值是本原型的設計選擇。

- 地標至照片：以地圖上的實際投影位置為小矩形起點，380ms 展開照片視窗，退出 240ms。取消整頁長淡入。
- 照片與詩頁：共用固定 3:4 畫框與水平中心，只在框內將原照收進上半部，440ms 展開下半部插畫，取消跨畫面的長距離移動與移動模糊。先留約1.05秒看原照。
- 重播：280ms 回到原照、380ms 短停、440ms 展開；滑桿仍可手動比較。照片動畫主要透過 transform 與 opacity，避免逐幀改布局尺寸。
- 鏡頭靠近850ms，地標三次柔和脈動1.8秒，回憶畫面停留約4.8秒。減少動態效果設定仍停用移動動畫。
- 韓國交通：巴士縮至原尺寸56%、列車68%、跨境飛機85%；香港的士、雙層叮叮車與港鐵維持原尺寸。四節車廂間距與模型比例同步縮放。
- 變更過的JS與CSS帶版本參數，避免已開過的網站沿用舊動畫檔案。
