# 去趣旅行提案 · 手機互動版

直接開啟 index.html。原生 HTML / CSS / JS，不需安裝或連線。與 circle-trip-planner 資料夾一併保留，圈選排程連結才能使用。

## 本次範圍

- 行程：5 日實景照片清單、離線 OSM 地圖、單日節點播放。全程以日期節點呈現，單日展開景點；照片與用量小卡置於地圖之外。
- 組隊：自由加入共編，只有模擬購買會推進 2 / 3 / 4 人福利。
- eSIM：用量習慣切換、示範價格、點數和現金差額分列、總量型方案的趣Chip條件試算。
- 回憶：3 款實際預生成作品（收藏貼紙卡、攝影詩頁、藍調旅行票根），可切換、放大及下載；保留本機照片預覽與 eSIM 購買資格流程。瀏覽器沒有即時生圖後端，不會將使用者上傳照片冒充為生成成果。
- Threads：開啟仿串文編輯器、修改文字、移除／加回圖片、選擇公開靈感連結、保留本頁草稿、模擬發佈預覽、複製串文。没有登入、社群 API 或實際發文。草稿僅在目前頁面記憶體中，重新整理即清除。
- 提案：8 則 User Story、5 張情境價值主張畫布及商業模型的手機閱讀版。User Story 取自 canva-user-stories/stories.json，與畫布的故事編號一致；未改寫既有文件。
- 今日圈選原型共用既有邏輯，增加手機版面和返回入口。保存草案獨立於 Tokyo 5 Days 示範，不冒充已匯入。

優惠、流量、價格與成效皆為 Mock / 待驗證假設。NT$80 與 NT$240 比較未納入全部活動成本。共編/模擬購買狀態在目前分頁的 sessionStorage 保留，跨頁返回可續看；本機照片不寫入儲存或發布包。圈選草案依既有原型保存於 localStorage。

## 視覺參考

2026-09-08 查閱：
- https://www.chictrip.com.tw/landing
- https://apps.apple.com/tw/app/去趣-chictrip/id6443825385

參考官方公開截圖的亮藍操作、白底、黃色點綴、行程照片卡片與 App 式導航。屬競賽概念原型，非官方介面逐像素複製或官方已上線功能。

照片作者、來源及授權見 assets/PHOTO-LICENSE.md，地圖資料見 assets/MAP-LICENSE.md。

回憶作品說明見 assets/memory/README.md。Threads 編輯器參考官方公開網頁介紹：https://about.fb.com/news/2025/04/new-features-threads-web-experience/ 。屬互動模擬，非官方整合。

## 維護

從根目錄執行 node work/build-mobile-content.cjs 更新共用景點/文件資料；node work/package-mobile.cjs 更新本地 GitHub Pages 發布包與 OpenDesign 入口。此指令不會發布外部網站。
