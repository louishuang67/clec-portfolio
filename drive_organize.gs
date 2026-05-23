/**
 * Google Drive 自動整理腳本
 *
 * 執行方式：
 *   1. 開啟 https://script.google.com → 新增專案
 *   2. 貼上此腳本，取代預設內容
 *   3. 點選 「執行」→ organizeGoogleDrive
 *   4. 第一次執行會要求授權，同意即可
 *   5. 執行完成後，99_封存備份 資料夾會有一份執行報告
 */

function organizeGoogleDrive() {
  const root = DriveApp.getRootFolder();
  const log = [];

  // ── 目標資料夾（不存在則自動建立）────────────────────────
  const WORK    = getOrCreateFolder('02_IC佈局與專案管理 (Work_Layout)');
  const INVEST  = getOrCreateFolder('04_投資理財研究 (Investment)');
  const TRAVEL  = getOrCreateFolder('05_旅遊規劃 (Travel)');
  const BANKING = getOrCreateFolder('06_銀行財務文件 (Banking)');
  const ARCHIVE = getOrCreateFolder('99_封存備份 (Archive)');
  const PHOTOS  = getOrCreateFolder('照片');
  const LEARN   = getOrCreateFolder('學習');
  const HEALTH  = getOrCreateFolder('體檢報告');

  // ── 讀取根目錄所有檔案（排除資料夾）─────────────────────
  const allFiles = [];
  const rootId = root.getId();
  const iter = DriveApp.searchFiles(`'${rootId}' in parents and trashed = false`);
  while (iter.hasNext()) allFiles.push(iter.next());
  Logger.log(`根目錄共找到 ${allFiles.length} 個檔案`);

  // ══════════════════════════════════════════════════════════
  // Step 1：清除重複副本（保留最新 1 份，移入對應資料夾）
  // ══════════════════════════════════════════════════════════

  // 資產配置 V1.2（13+ 份 → 保留最新 1）
  deduplicateAndMove(allFiles, '資產配置與再平衡回測(V1.2) - 副本',       false, INVEST, log);

  // 資產配置 V1.0（6+ 份 → 保留最新 1）
  deduplicateAndMove(allFiles, '資產配置與再平衡回測(V1.0)-發行版 - 副本', false, INVEST, log);

  // 資產配置 V1.1（1 份 → 直接移）
  deduplicateAndMove(allFiles, '資產配置與再平衡回測(V1.1)-發行版 - 副本', false, INVEST, log);

  // CLEC 股票回測（4 份 → 保留最新 xlsm）
  deduplicateAndMove(allFiles, 'CLEC_股票回測', true, INVEST, log);

  // 以下檔案的副本：配置（2 份 → 保留最新 1）
  deduplicateAndMove(allFiles, '以下檔案的副本： 配置', false, INVEST, log);

  // IMG_4818.jpeg（2 份重複 → 保留最新 1）
  deduplicateAndMove(allFiles, 'IMG_4818.jpeg', false, PHOTOS, log);

  // ══════════════════════════════════════════════════════════
  // Step 2：刪除 AI 提示詞殘留文件（全部）
  // ══════════════════════════════════════════════════════════
  const AI_TRASH_PATTERNS = [
    '請將左邊衛生紙去除',
    '改成中文版',
    '將照片的中文翻譯成英文',
    '將上述生成考卷',
  ];
  trashByPatterns(allFiles, AI_TRASH_PATTERNS, log);

  // ══════════════════════════════════════════════════════════
  // Step 3：移動工作相關檔案 → 02_IC佈局與專案管理
  // ══════════════════════════════════════════════════════════
  moveByPatterns(allFiles, [
    'IC Layout 部門 AI 轉型實踐報告',
    'EDP + DPHY Combo',
    '動態資源調度',
    '02_IC佈局與專案管理 (Work_Layout)',  // 同名規劃備忘 doc
  ], WORK, log);

  // ══════════════════════════════════════════════════════════
  // Step 4：移動投資理財檔案 → 04_投資理財研究
  // ══════════════════════════════════════════════════════════
  moveByPatterns(allFiles, [
    '教出富一代',
    '理財EQ',
    '3rd-quarter-2025-qi-list',
  ], INVEST, log);

  // ══════════════════════════════════════════════════════════
  // Step 5：移動旅遊檔案 → 05_旅遊規劃
  // ══════════════════════════════════════════════════════════
  moveByPatterns(allFiles, ['仙台', '日本-2026'], TRAVEL, log);

  // ══════════════════════════════════════════════════════════
  // Step 6：移動圖片 → 照片
  // ══════════════════════════════════════════════════════════
  moveByPatterns(allFiles, ['IMG_4617', 'D123461121'], PHOTOS, log);

  // ══════════════════════════════════════════════════════════
  // Step 7：移動英語學習 → 學習
  // ══════════════════════════════════════════════════════════
  moveByPatterns(allFiles, ['eventual'], LEARN, log);

  // ══════════════════════════════════════════════════════════
  // Step 8：移動封存規劃備忘 doc → 99_封存備份
  // ══════════════════════════════════════════════════════════
  moveByPatterns(allFiles, ['99_封存備份 (Archive)', 'Drive 整理腳本'], ARCHIVE, log);

  // ══════════════════════════════════════════════════════════
  // Step 9：移動銀行 / 財務對帳文件 → 06_銀行財務文件
  // ══════════════════════════════════════════════════════════
  moveByPatterns(allFiles, [
    '電子對帳單', '銀行對帳單', '對帳單',
    'Estatement', 'PaymentSlip',
    '永豐銀行', 'CTBC_card',
    '退稅', 'FB_',
  ], BANKING, log);

  // ══════════════════════════════════════════════════════════
  // Step 10：移動投資理財（舊有散落）→ 04_投資理財研究
  // ══════════════════════════════════════════════════════════
  moveByPatterns(allFiles, [
    '再平衡試算', '泰北', '陳大雄', '史上最懶股票',
    '萬萬稅', 'VENUSD', '理財聖經', '股票質押',
    '鐵飯碗概念股', '父母私塾', '0505-TODY',
    '你可以負擔多少', '資產配置',
  ], INVEST, log);

  // ══════════════════════════════════════════════════════════
  // Step 11：移動旅遊捷徑 → 05_旅遊規劃
  // ══════════════════════════════════════════════════════════
  moveByPatterns(allFiles, ['日本行程表'], TRAVEL, log);

  // ══════════════════════════════════════════════════════════
  // Step 12：移動健康 / 體檢相關 → 體檢報告
  // ══════════════════════════════════════════════════════════
  moveByPatterns(allFiles, ['健康管理儀表板'], HEALTH, log);

  // ══════════════════════════════════════════════════════════
  // Step 13：移動圖片 → 照片
  // ══════════════════════════════════════════════════════════
  moveByPatterns(allFiles, ['IMG_4593', 'BHV1205'], PHOTOS, log);

  // ══════════════════════════════════════════════════════════
  // Step 14：移動學習 → 學習
  // ══════════════════════════════════════════════════════════
  moveByPatterns(allFiles, ['日語基本語彙', '學雜費', '指考錄取分數', '201 黃士宸'], LEARN, log);

  // ══════════════════════════════════════════════════════════
  // Step 15：移動工作文件 → 02_IC佈局與專案管理
  // ══════════════════════════════════════════════════════════
  moveByPatterns(allFiles, ['Laker_TF', 'tf_advance_lab'], WORK, log);

  // ══════════════════════════════════════════════════════════
  // Step 15b：最後散落
  // ══════════════════════════════════════════════════════════
  moveByPatterns(allFiles, ['泰國行程', '泰國'], TRAVEL, log);
  moveByPatterns(allFiles, ['20372588'], BANKING, log);
  moveByPatterns(allFiles, ['自行驗屋'], getOrCreateFolder('雜七雜八'), log);

  // ══════════════════════════════════════════════════════════
  // Step 16：封存無法辨識的舊雜項 → 99_封存備份
  // ══════════════════════════════════════════════════════════
  moveByPatterns(allFiles, [
    'DisplayFile', 'ShowPng', 'doPDF 9.3',
    'c9bf902ef760f88a27d0d33f047ee757',
    'https:/drive.google.com',
    'https:/www.cathay',
    '毛治國', '同一關係人', 'AEA00C9E',
    '租賃附件', 'Explore example',
    '无标题', '無標題',
  ], ARCHIVE, log);

  // ══════════════════════════════════════════════════════════
  // 輸出執行報告，存入封存資料夾
  // ══════════════════════════════════════════════════════════
  const summary = `Google Drive 整理報告\n執行時間：${new Date().toLocaleString('zh-TW', {timeZone:'Asia/Taipei'})}\n共 ${log.length} 項操作\n\n` + log.join('\n');
  Logger.log(summary);

  const reportFile = DriveApp.createFile(
    `整理報告_${Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd_HHmm')}.txt`,
    summary,
    MimeType.PLAIN_TEXT
  );
  reportFile.moveTo(ARCHIVE);

  Logger.log(`✅ 完成！報告已存入「99_封存備份」資料夾。`);
}

// ══════════════════════════════════════════════════════════════
// 工具函式
// ══════════════════════════════════════════════════════════════

/** 取得資料夾，不存在則建立 */
function getOrCreateFolder(name) {
  const iter = DriveApp.getFoldersByName(name);
  return iter.hasNext() ? iter.next() : DriveApp.createFolder(name);
}

/** 判斷檔案是否已被處理（移動或刪除） */
function isProcessed(file) {
  try { return file.isTrashed(); }
  catch (e) { return true; }
}

/**
 * 去重並移動：
 *   - 找出所有符合名稱的檔案
 *   - 依修改時間排序，保留最新 1 份並移入 targetFolder
 *   - 其餘移入垃圾桶
 * @param {boolean} partial - true 表示模糊比對（contains），false 表示完全比對
 */
function deduplicateAndMove(files, nameOrPattern, partial, targetFolder, log) {
  const matching = files.filter(f => {
    if (isProcessed(f)) return false;
    const n = f.getName();
    return partial ? n.includes(nameOrPattern) : n === nameOrPattern;
  });
  if (matching.length === 0) return;

  // 最新修改時間排在最前
  matching.sort((a, b) => b.getLastUpdated() - a.getLastUpdated());

  // 保留最新，移入資料夾
  matching[0].moveTo(targetFolder);
  log.push(`📁 移動(最新版): "${matching[0].getName()}" → ${targetFolder.getName()}`);

  // 其餘全部刪除
  for (let i = 1; i < matching.length; i++) {
    matching[i].setTrashed(true);
    log.push(`🗑️  刪除舊副本: "${matching[i].getName()}"`);
  }
}

/** 依關鍵字模糊比對，將符合的檔案移入 targetFolder */
function moveByPatterns(files, patterns, targetFolder, log) {
  for (const file of files) {
    if (isProcessed(file)) continue;
    const name = file.getName();
    if (patterns.some(p => name.includes(p))) {
      file.moveTo(targetFolder);
      log.push(`📁 移動: "${name}" → ${targetFolder.getName()}`);
    }
  }
}

/** 依關鍵字模糊比對，將符合的檔案移入垃圾桶 */
function trashByPatterns(files, patterns, log) {
  for (const file of files) {
    if (isProcessed(file)) continue;
    const name = file.getName();
    if (patterns.some(p => name.includes(p))) {
      file.setTrashed(true);
      log.push(`🗑️  刪除: "${name}"`);
    }
  }
}
