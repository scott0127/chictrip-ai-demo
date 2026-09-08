# 我的回憶地圖 · chicTrip 概念原型

入口：`index.html`。從「回憶作品」可返回手機版。

## 如何操作
- 「總回憶」依序回顧台北出發、大阪、首爾、香港，共 12 段旅程。
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
