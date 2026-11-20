// ============================================================================
// [VERSION: ms_inbound.js v1.13 - 2026-11-20 2단계 보안 (DB 요청에 접속 코드 첨부 · SRM 계정정보 삭제 · 화면 출력 이스케이프) / v1.12 1단계 데이터 손실 방지 (저장 응답 확인 · 리비전 충돌 방지 · 기본 데이터 자동탑재 제거 · 재업로드 시 수동입력 보존 · 운임 0원 버그)]
// 바로가 공장 통합 관리 시스템 - 엠즈 입고 전용 모듈 (ms_inbound.js)
// ============================================================================
(function () {
// =========================================================================
    // ★ [팀원 전체 자동 동기화용 고정 URL 설정] ★
    // 발급받으신 Google Apps Script 웹앱 URL이 기본값으로 영구 탑재되었습니다.
    // 이제 다른 팀원들이 노션에 접속할 때 아무 설정 없이도 100% 자동으로 같은 데이터를 공유합니다!
    const DEFAULT_CLOUD_URL = 'https://script.google.com/macros/s/AKfycbxT64_EgYAeUHQntHumeeoAnVnc05uuehhD09kCMUiQInfZDegdrY0FnFTEjzaJSaJf/exec';
    // =========================================================================

    // 로컬 스토리지 키 정의
    const STORAGE_KEY = 'ms_inbound_records_v3_5';
    const RETURNS_STORAGE_KEY = 'ms_return_records_v3_5';
    const PRICES_STORAGE_KEY = 'ms_unit_prices_v3_6';
    const RECIPE_LINKS_STORAGE_KEY = 'ms_recipe_code_links_v1';
    const CLOUD_URL_KEY = 'ms_inbound_cloud_url_v3';

    // [1단계] 코드에 고정돼 있던 10~11월 기본 데이터(OCT_DEFAULT_DATA) 자동 탑재 제거
    //  → DB가 비었거나 연결에 실패해도 가짜/옛 데이터를 실데이터처럼 보여주거나 DB에 저장하지 않음

    // [1단계] DB 보호 상태: 정상적으로 불러온 뒤에만 저장, 리비전으로 다른 기기 저장분 덮어쓰기 방지
    let msDbLoaded = false;
    let msDbRevision = null;
    let msDbBlockReason = 'DB를 아직 불러오지 못했습니다';
    let msPushTimer = null;
    let msIsPushing = false;
    let msPushPending = false;

    let records = [];
    let returnRecords = [];
    let unitPrices = {}; // { [상품코드 또는 상품명]: pk당_매입단가(number) }
    let recipeLinks = {}; // { [상품코드 또는 상품명]: 레시피_내부아이디(품목코드 string) }
    let currentFilter = 'ALL';
    let currentMainView = 'DAILY';
    let collapsedMap = {};
    let editingTarget = null;
    let confirmCallback = null;

    // 레시피 탭 & 제품단가 탭의 실시간 목록 및 1PK 판매금액 조회 헬퍼
    function getLiveRecipesListForMs() {
      if (typeof window !== 'undefined' && Array.isArray(window.recipesData) && window.recipesData.length > 0) {
        return window.recipesData;
      }
      try {
        const cached = localStorage.getItem('baroga_recipes_cache_v18');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch (e) {}
      return [];
    }

    function getRecipeSellingPriceByCode(recipeCode) {
      const cleanCode = String(recipeCode || '').trim();
      if (!cleanCode) return null;

      const list = getLiveRecipesListForMs();
      const matchedRc = list.find(r => r && String(r.productCode || '').trim() === cleanCode) || null;

      let sellPrice = 0;
      let packQty = matchedRc ? (parseFloat(matchedRc.packQty) || 0) : 0;
      let releasePriceEa = 0;
      let productName = matchedRc ? (matchedRc.productName || '') : '';
      let foundEntity = Boolean(matchedRc);

      // 1순위: recipe.js의 calculateRecipeMetrics(matchedRc) 실시간 산출 판매금액
      if (matchedRc && typeof window !== 'undefined' && typeof window.calculateRecipeMetrics === 'function') {
        try {
          const m = window.calculateRecipeMetrics(matchedRc);
          if (m) {
            sellPrice = Math.round(Number(m.sellPrice) || 0);
            releasePriceEa = Number(m.releasePriceEa) || 0;
            packQty = Number(m.packQty) || packQty;
          }
        } catch (e) {}
      }

      // 2순위 보조: price.js 브릿지 또는 로컬 캐시에서 직접 출고가×PK입수 계산
      if (sellPrice <= 0 && typeof window !== 'undefined' && window.barogaProductPriceBridge && typeof window.barogaProductPriceBridge.findPriceByRecipe === 'function') {
        const hit = window.barogaProductPriceBridge.findPriceByRecipe(cleanCode, productName, 'PRODUCT');
        if (hit && hit.matched) {
          foundEntity = true;
          if (!productName) productName = hit.productName || '';
          releasePriceEa = Number(hit.releasePriceEa) || 0;
          const effPk = packQty > 0 ? packQty : (Number(hit.pkQuantityEa) || 0);
          packQty = effPk;
          if (releasePriceEa > 0 && effPk > 0) {
            sellPrice = Math.round(releasePriceEa * effPk);
          }
        }
      }

      if (sellPrice <= 0 && matchedRc && Number(matchedRc.sellingPrice) > 0) {
        sellPrice = Math.round(Number(matchedRc.sellingPrice) || 0);
      }

      if (!foundEntity) return null;
      return {
        matched: true,
        recipeCode: cleanCode,
        productName,
        packQty,
        releasePriceEa,
        sellPrice
      };
    }

    function getItemRecipeCode(item) {
      if (!item) return '';
      if (item.code && item.code !== '-' && recipeLinks[item.code] !== undefined) {
        return String(recipeLinks[item.code] || '').trim();
      }
      if (item.name && recipeLinks[item.name] !== undefined) {
        return String(recipeLinks[item.name] || '').trim();
      }
      return '';
    }

    function setItemRecipeCode(code, name, recipeCodeVal) {
      const clean = String(recipeCodeVal || '').trim();
      if (code && code !== '-') {
        if (clean) recipeLinks[code] = clean;
        else delete recipeLinks[code];
      }
      if (name) {
        if (clean) recipeLinks[name] = clean;
        else delete recipeLinks[name];
      }
      saveToStorage();
      renderAll();
      const linked = clean ? getRecipeSellingPriceByCode(clean) : null;
      if (clean && linked && linked.sellPrice > 0) {
        showToast(`[레시피 ${clean}] ${linked.productName} 판매금액(${linked.sellPrice.toLocaleString()}원)이 연동되었습니다!`);
      } else if (clean && linked) {
        showToast(`[레시피 ${clean}] 연결됨 (현재 판매금액 0원 — 제품단가 출고가를 확인하세요)`);
      } else if (clean) {
        showToast(`레시피 코드 [${clean}] 저장됨 (일치하는 레시피 코드를 확인해주세요)`);
      } else {
        showToast('레시피 품목코드 연동이 해제되었습니다.');
      }
    }

    // 품목명 핵심 키워드 정규화 (엠즈 상품명 ↔ 바로가 레시피/단가표 자동 매칭용)
    function normalizeMsCoreProductName(str) {
      return String(str || '')
        .replace(/^M\s*(\[[^\]]*\]|\([^)]*\))?\s*/i, '')
        .replace(/\[[^\]]*\]/g, '')
        .replace(/\((New_?곤트란|곤트란|바로가|르미디|공장|반제품|신|대|소|합포장|막대|스틱)\)/gi, '')
        .replace(/New\s*/gi, '')
        .replace(/_?\d+(?:\.\d+)?\s*(?:g|kg|ea|pk|box).*$/i, '')
        .replace(/\(\s*\d+[^)]*\)/g, '')
        .replace(/생지/g, '')
        .replace(/[^가-힣a-zA-Z0-9]/g, '')
        .toLowerCase();
    }

    function autoMatchRecipeCodes() {
      const recipes = getLiveRecipesListForMs().filter(r => r && r.recipeType !== 'SUB' && String(r.productCode || '').trim());
      if (recipes.length === 0) {
        showToast('연동할 레시피 데이터가 아직 로드되지 않았습니다.');
        return;
      }
      const rcIndex = recipes.map(r => ({
        code: String(r.productCode || '').trim(),
        name: r.productName || '',
        core: normalizeMsCoreProductName(r.productName)
      })).filter(x => x.core.length >= 2);

      const catalogMap = new Map();
      records.forEach(rec => {
        (rec.items || []).forEach(it => {
          const k = (it.code ? it.code + '_' : '') + it.name;
          if (!catalogMap.has(k)) catalogMap.set(k, { code: it.code || '-', name: it.name });
        });
      });

      let matchedCount = 0;
      catalogMap.forEach(it => {
        if (getItemRecipeCode(it)) return; // 이미 수동 지정된 항목은 보존
        const msCore = normalizeMsCoreProductName(it.name);
        if (!msCore) return;
        let hit = rcIndex.find(r => r.core === msCore);
        if (!hit) {
          hit = rcIndex.find(r => msCore.includes(r.core) || r.core.includes(msCore));
        }
        if (hit) {
          if (it.code && it.code !== '-') recipeLinks[it.code] = hit.code;
          if (it.name) recipeLinks[it.name] = hit.code;
          matchedCount++;
        }
      });

      if (matchedCount > 0) {
        saveToStorage();
        renderAll();
        showToast(`품목명 분석을 통해 ${matchedCount}개 품목의 레시피 품목코드가 자동 매칭되었습니다!`);
      } else {
        showToast('추가로 자동 매칭할 수 있는 미연결 품목이 없습니다. 표에서 직접 선택·입력해 주세요.');
      }
    }

    // 품목의 단가 및 레시피 연동 상세 정보 조회 헬퍼
    function getItemPriceMeta(item) {
      if (!item) return { price: 0, isRecipeSynced: false, recipeCode: '', recipeInfo: null };
      const rCode = getItemRecipeCode(item);
      if (rCode) {
        const rInfo = getRecipeSellingPriceByCode(rCode);
        if (rInfo && rInfo.sellPrice > 0) {
          return {
            price: rInfo.sellPrice,
            isRecipeSynced: true,
            recipeCode: rCode,
            recipeInfo: rInfo
          };
        }
        const manualFallback =
          (item.code && unitPrices[item.code] !== undefined ? Number(unitPrices[item.code]) : 0) ||
          (item.name && unitPrices[item.name] !== undefined ? Number(unitPrices[item.name]) : 0) ||
          0;
        return {
          price: manualFallback,
          isRecipeSynced: false,
          recipeCode: rCode,
          recipeInfo: rInfo
        };
      }
      const manual =
        (item.code && unitPrices[item.code] !== undefined ? Number(unitPrices[item.code]) : 0) ||
        (item.name && unitPrices[item.name] !== undefined ? Number(unitPrices[item.name]) : 0) ||
        0;
      return { price: manual, isRecipeSynced: false, recipeCode: '', recipeInfo: null };
    }

    // 품목의 pk당 매입단가 조회 헬퍼 (레시피 내부 아이디가 연동되어 판매금액이 있으면 최우선 반영)
    function getItemUnitPrice(item) {
      return getItemPriceMeta(item).price;
    }

    // 품목의 pk당 매입단가 수동 저장 헬퍼
    function setItemUnitPrice(code, name, priceVal) {
      const num = parseInt(String(priceVal).replace(/[^0-9]/g, ''), 10) || 0;
      if (code && code !== '-') unitPrices[code] = num;
      if (name) unitPrices[name] = num;
      saveToStorage();
      renderAll();
    }

    function getActiveCloudUrl() {
      return localStorage.getItem(CLOUD_URL_KEY) || DEFAULT_CLOUD_URL || '';
    }

    let _msInboundMounted = false;

    function mountMsInboundApp() {
      const rootEl = document.getElementById('msInboundRoot');
      if (!rootEl) return;
      if (!_msInboundMounted) {
        rootEl.innerHTML = "<style>\n  #msInboundRoot .drop-active { border-color: #2563eb !important; background-color: #eff6ff !important; }\n</style>\n<div class=\"w-full\">\n  <!-- 엠즈 입고 하위 4대 워크스페이스 바 (원재료 탭과 100% 동일한 디자인 · 폰트 · 선택 UX + 우측 DB 3종 버튼) -->\n  <div class=\"w-full bg-stone-100/90 border-b border-stone-200 no-print\">\n    <div class=\"max-w-[1600px] mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2\">\n      <div class=\"flex flex-wrap items-center gap-1.5\">\n        <button type=\"button\" id=\"msi_tabBtnDaily\" onclick=\"window.MSInbound.switchMainView('DAILY')\" class=\"flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-extrabold transition cursor-pointer bg-stone-900 text-white shadow-xs\">\n          <i data-lucide=\"calendar-days\" class=\"w-4 h-4\"></i><span>1. 일자별 입고 내역</span>\n        </button>\n        <button type=\"button\" id=\"msi_tabBtnAnalytics\" onclick=\"window.MSInbound.switchMainView('ANALYTICS')\" class=\"flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-extrabold transition cursor-pointer bg-white text-stone-700 border border-stone-200 hover:bg-stone-50\">\n          <i data-lucide=\"bar-chart-3\" class=\"w-4 h-4\"></i><span>2. 품목별 누적 통계 & 순위</span>\n        </button>\n        <button type=\"button\" id=\"msi_tabBtnReturns\" onclick=\"window.MSInbound.switchMainView('RETURNS')\" class=\"flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-extrabold transition cursor-pointer bg-white text-stone-700 border border-stone-200 hover:bg-stone-50\">\n          <i data-lucide=\"rotate-ccw\" class=\"w-4 h-4 text-amber-600\"></i><span>3. 회송 내역 관리</span>\n          <span id=\"msi_returnTabCountBadge\" class=\"px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded-full text-[11px] font-extrabold tabular-nums\">0</span>\n        </button>\n        <button type=\"button\" id=\"msi_tabBtnPrices\" onclick=\"window.MSInbound.switchMainView('PRICES')\" class=\"flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-extrabold transition cursor-pointer bg-white text-stone-700 border border-stone-200 hover:bg-stone-50\">\n          <i data-lucide=\"coins\" class=\"w-4 h-4 text-emerald-600\"></i><span>4. 매입가 DB 관리</span>\n        </button>\n      </div>\n      <div class=\"flex items-center gap-1.5 ml-auto\">\n        <button type=\"button\" id=\"msi_dbStatusBadge\" onclick=\"window.MSInbound.openCloudModal()\" class=\"flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-xl text-xs font-bold border bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 transition cursor-pointer\">\n          <span id=\"msi_dbStatusDot\" class=\"w-2 h-2 rounded-full bg-emerald-500\"></span>\n          <span id=\"msi_dbStatusText\">DB 연동됨</span>\n          <i data-lucide=\"settings\" class=\"w-3.5 h-3.5 ml-0.5 opacity-75\"></i>\n        </button>\n        <button type=\"button\" onclick=\"window.MSInbound.pushToCloud(false)\" class=\"flex items-center gap-1.5 px-3.5 py-1.5 h-9 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer\">\n          <i data-lucide=\"cloud-upload\" class=\"w-3.5 h-3.5\"></i>\n          <span>DB 저장</span>\n        </button>\n        <button type=\"button\" onclick=\"window.MSInbound.pullFromCloud(false)\" title=\"구글 시트 새로고침\" class=\"flex items-center justify-center w-9 h-9 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 transition cursor-pointer\">\n          <span id=\"msi_syncSpinWrap\" class=\"inline-flex items-center justify-center\"><i data-lucide=\"refresh-cw\" class=\"w-4 h-4\"></i></span>\n        </button>\n      </div>\n    </div>\n  </div>\n\n  <!-- 본문 영역: 시선 이동이 가장 편안한 가독성 최적 좌우 폭 (max-w-[1080px] 중앙 정렬) -->\n  <div id=\"msi_bodyContainer\" class=\"max-w-[1080px] mx-auto px-3 sm:px-5 pt-3.5 pb-8 transition-all\">\n  <!-- [1번 탭 전용 영역] 좌측 엑셀 업로드 + 우측 핵심 요약본 나란히 1단 배치 (2,3,4번 탭에서는 자동 숨김) -->\n  <div id=\"msi_dailyTopSummaryWrap\" class=\"mb-3.5\">\n    <div class=\"grid grid-cols-1 lg:grid-cols-12 gap-3 items-stretch\">\n      <!-- 좌측 (5칸): 엑셀 업로드 + 입고 방법 가이드 버튼 + 인라인 기본 설정 -->\n      <section class=\"lg:col-span-5 bg-white px-3 py-2.5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between gap-2 no-print\">\n        <div id=\"msi_dropZone\" class=\"border border-dashed border-blue-300 bg-blue-50/30 hover:bg-blue-50/70 hover:border-blue-500 rounded-xl px-2.5 py-2 transition flex items-center justify-between gap-1.5\">\n          <input type=\"file\" id=\"msi_excelInput\" accept=\".xlsx,.xls,.csv\" class=\"hidden\" multiple onchange=\"window.MSInbound.handleFiles(this.files)\">\n          <label for=\"msi_excelInput\" class=\"flex items-center gap-2 min-w-0 flex-1 cursor-pointer\">\n            <div class=\"w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs\">\n              <i data-lucide=\"file-up\" class=\"w-3.5 h-3.5\"></i>\n            </div>\n            <div class=\"text-left min-w-0\">\n              <div class=\"text-xs font-bold text-slate-800 truncate\">엠즈 입고 엑셀 업로드</div>\n              <div class=\"text-[10.5px] text-slate-500 truncate\">[입고요청일] 기준 자동 분리·합산</div>\n            </div>\n          </label>\n          <div class=\"flex items-center gap-1.5 shrink-0\">\n            <label for=\"msi_excelInput\" class=\"px-2.5 py-1 bg-white hover:bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-[11px] font-bold cursor-pointer shadow-2xs transition\">파일 선택</label>\n            <button type=\"button\" onclick=\"window.MSInbound.openGuideModal()\" class=\"w-6 h-6 flex items-center justify-center bg-amber-400 hover:bg-amber-500 text-stone-950 rounded-lg text-xs font-black cursor-pointer shadow-2xs transition\" title=\"엠즈 입고 엑셀 다운로드 및 업로드 사용법 보기\" aria-label=\"입고 방법 안내\">?</button>\n          </div>\n        </div>\n\n        <div class=\"flex flex-wrap items-center justify-between gap-1 bg-slate-50 px-2 py-1.5 rounded-xl border border-slate-200/70 text-[11px]\">\n          <div class=\"flex items-center gap-1\">\n            <span class=\"text-slate-400 font-medium\">상태</span>\n            <select id=\"msi_defaultStatus\" class=\"text-[11px] px-1 py-0.5 rounded border border-slate-200 bg-white font-semibold text-slate-700\">\n              <option value=\"입고 완료\">완료</option>\n              <option value=\"입고 예정\">예정</option>\n            </select>\n          </div>\n          <div class=\"flex items-center gap-1\">\n            <span class=\"text-slate-400 font-medium\">기사</span>\n            <input type=\"text\" id=\"msi_defaultDriver\" value=\"김민겸 기사\" class=\"w-[82px] text-[11px] px-1.5 py-0.5 rounded border border-slate-200 bg-white font-semibold text-slate-700\">\n          </div>\n          <div class=\"flex items-center gap-1\">\n            <span class=\"text-slate-400 font-medium\">운임</span>\n            <input type=\"number\" id=\"msi_defaultCost\" value=\"250000\" step=\"10000\" class=\"w-[80px] text-[11.5px] px-1.5 py-0.5 rounded border border-slate-200 bg-white font-bold text-slate-800 tabular-nums\">\n          </div>\n          <label class=\"flex items-center gap-1 font-semibold text-slate-700 cursor-pointer px-1.5 py-0.5 bg-white rounded border border-slate-200\">\n            <input type=\"checkbox\" id=\"msi_mergeSameItemToggle\" checked onchange=\"window.MSInbound.renderAll()\" class=\"rounded text-blue-600\">\n            <span>품목합산</span>\n          </label>\n        </div>\n        <div id=\"msi_uploadStatusBanner\" class=\"hidden px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 text-[11px] font-semibold\"></div>\n      </section>\n\n      <!-- 우측 (7칸): 핵심 6대 지표 초슬림 3×2 요약 보드 -->\n      <section class=\"lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden grid grid-cols-3 divide-x divide-y divide-slate-100\">\n        <div class=\"px-3.5 py-2 flex flex-col justify-center\">\n          <div class=\"flex items-center justify-between gap-1\">\n            <span class=\"text-[11px] font-semibold text-slate-400\">입고 일수</span>\n            <span class=\"text-[10px] text-slate-400 tabular-nums\" id=\"msi_statSubCount\">완료 0·예정 0</span>\n          </div>\n          <div class=\"text-[15px] font-extrabold text-slate-800 mt-0.5 tabular-nums\" id=\"msi_statCount\">0건</div>\n        </div>\n        <div class=\"px-3.5 py-2 flex flex-col justify-center\">\n          <div class=\"flex items-center justify-between gap-1\">\n            <span class=\"text-[11px] font-semibold text-slate-400\">누적 박스</span>\n            <span class=\"text-[10px] text-slate-400 tabular-nums\" id=\"msi_statAvgBoxes\">일평균 0</span>\n          </div>\n          <div class=\"text-[15px] font-extrabold text-blue-600 mt-0.5 tabular-nums\" id=\"msi_statBoxes\">0 box</div>\n        </div>\n        <div class=\"px-3.5 py-2 flex flex-col justify-center\">\n          <div class=\"flex items-center justify-between gap-1\">\n            <span class=\"text-[11px] font-semibold text-slate-400\">누적 환산팩</span>\n            <span class=\"text-[10px] text-slate-400 tabular-nums\" id=\"msi_statAvgPks\">일평균 0</span>\n          </div>\n          <div class=\"text-[15px] font-extrabold text-emerald-600 mt-0.5 tabular-nums\" id=\"msi_statPks\">0 pk</div>\n        </div>\n        <div class=\"px-3.5 py-2 flex flex-col justify-center\">\n          <div class=\"flex items-center justify-between gap-1\">\n            <span class=\"text-[11px] font-semibold text-slate-400\">취급 품목</span>\n            <span class=\"text-[10px] text-slate-400 truncate max-w-[95px]\" id=\"msi_statTopItem\">-</span>\n          </div>\n          <div class=\"text-[15px] font-extrabold text-indigo-600 mt-0.5 tabular-nums\" id=\"msi_statUniqueItems\">0종</div>\n        </div>\n        <div class=\"px-3.5 py-2 flex flex-col justify-center\">\n          <div class=\"flex items-center justify-between gap-1\">\n            <span class=\"text-[11px] font-semibold text-slate-400\">누적 운임</span>\n            <span class=\"text-[10px] text-slate-400 truncate max-w-[100px] tabular-nums\" id=\"msi_statCostBreakdown\">입고 0·회송 0</span>\n          </div>\n          <div class=\"text-[15px] font-extrabold text-slate-900 mt-0.5 tabular-nums\" id=\"msi_statCost\">0원</div>\n        </div>\n        <div class=\"px-3.5 py-2 bg-indigo-50/50 flex flex-col justify-center\">\n          <div class=\"flex items-center justify-between gap-1\">\n            <span class=\"text-[11px] font-bold text-indigo-700\">누적 매입액</span>\n            <span class=\"text-[10px] text-indigo-500 font-semibold tabular-nums\" id=\"msi_statPriceSetRate\">단가 0/0종</span>\n          </div>\n          <div class=\"text-[15px] font-extrabold text-indigo-700 mt-0.5 tabular-nums\" id=\"msi_statPurchaseAmount\">0원</div>\n        </div>\n      </section>\n    </div>\n  </div>\n\n  <!-- 월별 필터 칩 & 검색/아코디언/정산 엑셀 컨트롤 바 -->\n  <div class=\"flex flex-col md:flex-row md:items-center justify-between gap-2.5 mb-4 no-print\">\n    <div class=\"flex items-center gap-1.5 overflow-x-auto py-0.5\" id=\"msi_dateTabs\"></div>\n\n    <!-- 우측 검색 및 접기/펼치기 · 정산 엑셀 컨트롤 -->\n    <div class=\"flex flex-wrap items-center gap-2 ml-auto\">\n      <button type=\"button\" onclick=\"window.MSInbound.downloadSettlementExcel()\" class=\"flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-white border border-stone-200 rounded-xl text-emerald-700 hover:bg-emerald-50 transition cursor-pointer\" title=\"4개 시트 정산 엑셀 다운로드\">\n        <i data-lucide=\"file-spreadsheet\" class=\"w-3.5 h-3.5\"></i><span>정산 엑셀</span>\n      </button>\n      <div id=\"msi_accordionControls\" class=\"flex items-center gap-1\">\n        <button onclick=\"window.MSInbound.toggleAllCards(false)\" class=\"px-2.5 py-1.5 text-xs font-bold bg-white border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 cursor-pointer\">전체 펼치기</button>\n        <button onclick=\"window.MSInbound.toggleAllCards(true)\" class=\"px-2.5 py-1.5 text-xs font-bold bg-white border border-stone-200 rounded-xl text-stone-600 hover:bg-stone-50 cursor-pointer\">전체 접기</button>\n      </div>\n      <div class=\"relative w-full sm:w-60\">\n        <i data-lucide=\"search\" class=\"w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2\"></i>\n        <input type=\"text\" id=\"msi_searchInput\" oninput=\"window.MSInbound.renderAll()\" placeholder=\"상품명, 코드, 날짜, 사유 검색...\" class=\"w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-stone-200 rounded-xl focus:outline-none focus:border-amber-500\">\n      </div>\n    </div>\n  </div>\n\n  <!-- 뷰 1: 일자별 입고 내역 컨테이너 -->\n  <section id=\"msi_dailyViewContainer\" class=\"space-y-3.5\"></section>\n\n  <!-- 뷰 2: 품목별 누적 통계 & 순위 컨테이너 -->\n  <section id=\"msi_analyticsViewContainer\" class=\"hidden space-y-5\"></section>\n\n  <!-- 뷰 3: 회송 내역 관리 (수기 등록 & 이력 목록) 컨테이너 -->\n  <section id=\"msi_returnsViewContainer\" class=\"hidden space-y-4\">\n    <!-- 회송 요약 카드 (사유별 집계) -->\n    <div class=\"grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5\">\n      <div class=\"bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm\">\n        <div class=\"text-[11px] font-medium text-slate-400\">총 회송 건수</div>\n        <div class=\"text-lg font-bold text-slate-800 mt-0.5\" id=\"msi_retStatCount\">0건</div>\n      </div>\n      <div class=\"bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-sm\">\n        <div class=\"text-[11px] font-medium text-slate-400\">누적 회송 운임료</div>\n        <div class=\"text-lg font-bold text-rose-600 mt-0.5\" id=\"msi_retStatCost\">0원</div>\n      </div>\n      <div class=\"bg-rose-50/60 p-3.5 rounded-xl border border-rose-200/60\">\n        <div class=\"text-[11px] font-semibold text-rose-700\">소비기한 오류</div>\n        <div class=\"text-lg font-bold text-rose-800 mt-0.5\" id=\"msi_retStatReason1\">0건</div>\n      </div>\n      <div class=\"bg-amber-50/60 p-3.5 rounded-xl border border-amber-200/60\">\n        <div class=\"text-[11px] font-semibold text-amber-700\">외박스 파손</div>\n        <div class=\"text-lg font-bold text-amber-800 mt-0.5\" id=\"msi_retStatReason2\">0건</div>\n      </div>\n      <div class=\"bg-orange-50/60 p-3.5 rounded-xl border border-orange-200/60\">\n        <div class=\"text-[11px] font-semibold text-orange-700\">파레트 적재 불량</div>\n        <div class=\"text-lg font-bold text-orange-800 mt-0.5\" id=\"msi_retStatReason3\">0건</div>\n      </div>\n      <div class=\"bg-purple-50/60 p-3.5 rounded-xl border border-purple-200/60\">\n        <div class=\"text-[11px] font-semibold text-purple-700\">입고 시간 미준수</div>\n        <div class=\"text-lg font-bold text-purple-800 mt-0.5\" id=\"msi_retStatReason4\">0건</div>\n      </div>\n      <div class=\"bg-slate-100/80 p-3.5 rounded-xl border border-slate-200/80\">\n        <div class=\"text-[11px] font-semibold text-slate-600\">기타 사유</div>\n        <div class=\"text-lg font-bold text-slate-800 mt-0.5\" id=\"msi_retStatReason5\">0건</div>\n      </div>\n    </div>\n\n    <!-- 회송 수기 등록 폼 -->\n    <div class=\"bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm no-print\">\n      <div class=\"flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3.5\">\n        <div>\n          <h3 class=\"text-sm font-bold text-slate-900 flex items-center gap-1.5\">\n            <span class=\"w-2 h-2 rounded-full bg-amber-500\"></span> 회송 내역 수기 등록\n          </h3>\n          <p class=\"text-[11px] text-slate-500 mt-0.5\">입고 진행 기사에게 지불한 회송 운임료와 회송 사유를 기록하면 클라우드에 즉시 동기화됩니다.</p>\n        </div>\n        <!-- 사유 빠른 선택 버튼 -->\n        <div class=\"flex flex-wrap items-center gap-1\">\n          <span class=\"text-[11px] text-slate-400 mr-1\">사유 빠른선택:</span>\n          <button type=\"button\" onclick=\"window.MSInbound.selectReturnReason('소비기한 오류')\" class=\"px-2 py-1 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 transition\">소비기한 오류</button>\n          <button type=\"button\" onclick=\"window.MSInbound.selectReturnReason('외박스 파손')\" class=\"px-2 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition\">외박스 파손</button>\n          <button type=\"button\" onclick=\"window.MSInbound.selectReturnReason('파레트 적재 불량')\" class=\"px-2 py-1 rounded-md text-[11px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 hover:bg-orange-100 transition\">파레트 적재 불량</button>\n          <button type=\"button\" onclick=\"window.MSInbound.selectReturnReason('입고 시간 미준수')\" class=\"px-2 py-1 rounded-md text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition\">입고 시간 미준수</button>\n        </div>\n      </div>\n\n      <div class=\"grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5 items-end\">\n        <div class=\"lg:col-span-2\">\n          <label class=\"block text-[11px] font-semibold text-slate-600 mb-1\">회송일자</label>\n          <input type=\"date\" id=\"msi_retInputDate\" class=\"block w-full h-9 text-xs px-2.5 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-500\">\n        </div>\n        <div class=\"lg:col-span-2\">\n          <label class=\"block text-[11px] font-semibold text-slate-600 mb-1\">회송 사유</label>\n          <select id=\"msi_retInputReason\" class=\"block w-full h-9 text-xs px-2.5 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-500 font-medium\">\n            <option value=\"소비기한 오류\">소비기한 오류</option>\n            <option value=\"외박스 파손\">외박스 파손</option>\n            <option value=\"파레트 적재 불량\">파레트 적재 불량</option>\n            <option value=\"입고 시간 미준수\">입고 시간 미준수</option>\n            <option value=\"기타 사유\">기타 사유</option>\n          </select>\n        </div>\n        <div class=\"lg:col-span-2\">\n          <label class=\"block text-[11px] font-semibold text-slate-600 mb-1\">담당 기사</label>\n          <input type=\"text\" id=\"msi_retInputDriver\" value=\"김민겸 기사\" placeholder=\"김민겸 기사\" class=\"block w-full h-9 text-xs px-2.5 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-500\">\n        </div>\n        <div class=\"lg:col-span-2\">\n          <label class=\"block text-[11px] font-semibold text-slate-600 mb-1\">회송 운임료 (원)</label>\n          <input type=\"number\" id=\"msi_retInputCost\" value=\"250000\" step=\"10000\" placeholder=\"250000\" class=\"block w-full h-9 text-xs px-2.5 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-500 font-semibold text-rose-600\">\n        </div>\n        <div class=\"lg:col-span-3\">\n          <label class=\"block text-[11px] font-semibold text-slate-600 mb-1\">상세 내용 / 대상 품목 (Enter로 줄바꿈 가능)</label>\n          <textarea id=\"msi_retInputNote\" rows=\"1\" oninput=\"this.style.height='36px';this.style.height=Math.max(36,this.scrollHeight)+'px'\" placeholder=\"예: 크로와상 생지 2box 외박스 파손\" class=\"block w-full h-9 min-h-[36px] text-xs px-2.5 py-[8px] rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:border-blue-500 resize-none leading-[18px] overflow-hidden\"></textarea>\n        </div>\n        <div class=\"lg:col-span-1\">\n          <button type=\"button\" onclick=\"window.MSInbound.addReturnRecord()\" class=\"w-full h-9 px-3 bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs rounded-lg transition shadow-sm flex items-center justify-center gap-1\">\n            <i data-lucide=\"plus\" class=\"w-3.5 h-3.5\"></i> 등록\n          </button>\n        </div>\n      </div>\n    </div>\n\n    <!-- 회송 내역 목록 테이블 -->\n    <div class=\"bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden\">\n      <div class=\"p-4 sm:px-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60\">\n        <div class=\"flex items-center gap-2\">\n          <h3 class=\"text-sm font-bold text-slate-900\">📋 회송 이력 및 운임 정산 내역</h3>\n          <span class=\"text-[11px] text-slate-400\">(항목 클릭 시 내용을 즉시 수정하거나 삭제할 수 있습니다)</span>\n        </div>\n      </div>\n      <div class=\"p-3.5 sm:px-5 overflow-x-auto\" id=\"msi_returnsTableWrapper\"></div>\n    </div>\n  </section>\n\n  <!-- 뷰 4: 품목별 매입가 DB 마스터 관리 컨테이너 -->\n  <section id=\"msi_pricesViewContainer\" class=\"hidden space-y-4\">\n    <datalist id=\"msi_recipeIdDatalist\"></datalist>\n    <div class=\"bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-sm\">\n      <div class=\"flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100\">\n        <div>\n          <h3 class=\"text-sm font-bold text-slate-900 flex items-center gap-1.5\">\n            💰 품목별 매입단가(pk 기준) 마스터 DB · 레시피 판매금액 연동\n          </h3>\n          <p class=\"text-xs text-slate-500 mt-0.5\">\n            상품코드 옆 <b>[레시피 품목코드]</b>를 입력하면 레시피 탭의 <b>판매금액(1PK)이 pk당 매입단가에 실시간 자동 연동(<span class=\"inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 align-middle\"></span>)</b>되며, 미입력 품목은 직접 단가를 입력할 수 있습니다.\n          </p>\n        </div>\n        <div class=\"flex flex-wrap items-center gap-2 no-print\">\n          <button type=\"button\" onclick=\"window.MSInbound.autoMatchRecipeCodes()\" class=\"flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-extrabold cursor-pointer transition shadow-xs\" title=\"엠즈 상품명과 레시피 품목명을 비교해 미연결 품목의 레시피 품목코드를 자동 매칭합니다\">\n            <i data-lucide=\"link\" class=\"w-3.5 h-3.5\"></i> 레시피 품목코드 자동매칭\n          </button>\n        </div>\n      </div>\n      <div class=\"overflow-x-auto mt-3\" id=\"msi_pricesTableWrapper\"></div>\n    </div>\n  </section>\n\n  <!-- 필드 수정 모달 (인라인 에디터 + 내용 삭제 버튼 포함) -->\n  <div id=\"msi_editFieldModal\" class=\"fixed inset-0 bg-slate-900/50 hidden items-center justify-center z-50 p-4\">\n    <div class=\"bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-slate-200\">\n      <div class=\"flex items-center justify-between mb-3\">\n        <h3 id=\"msi_editModalTitle\" class=\"text-sm font-bold text-slate-900\">항목 수정</h3>\n        <button onclick=\"window.MSInbound.closeEditModal()\" class=\"text-slate-400 hover:text-slate-600\"><i data-lucide=\"x\" class=\"w-4 h-4\"></i></button>\n      </div>\n      <textarea id=\"msi_editModalInput\" rows=\"4\" class=\"w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 mb-1 resize-y leading-relaxed\" placeholder=\"내용을 입력하세요... (Enter로 줄바꿈 가능)\"></textarea>\n      <p class=\"text-[11px] text-slate-400 mb-3\">💡 Enter 키로 줄바꿈을 넣을 수 있습니다.</p>\n      <div class=\"flex items-center justify-between gap-2 pt-1\">\n        <button onclick=\"window.MSInbound.clearEditField()\" class=\"flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition\">\n          <i data-lucide=\"trash-2\" class=\"w-3.5 h-3.5\"></i> 내용 삭제\n        </button>\n        <div class=\"flex items-center gap-2\">\n          <button onclick=\"window.MSInbound.closeEditModal()\" class=\"px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition\">취소</button>\n          <button onclick=\"window.MSInbound.saveEditModal()\" class=\"px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition\">저장</button>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <!-- 확인(Confirm) 모달 -->\n  <div id=\"msi_confirmModal\" class=\"fixed inset-0 bg-slate-900/50 hidden items-center justify-center z-50 p-4\">\n    <div class=\"bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-slate-200\">\n      <h3 class=\"text-sm font-bold text-slate-900 mb-2\">확인</h3>\n      <p id=\"msi_confirmModalMsg\" class=\"text-xs text-slate-600 mb-4\">진행하시겠습니까?</p>\n      <div class=\"flex justify-end gap-2\">\n        <button onclick=\"window.MSInbound.closeConfirmModal()\" class=\"px-3 py-1.5 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg\">취소</button>\n        <button id=\"msi_confirmModalBtn\" class=\"px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg\">확인</button>\n      </div>\n    </div>\n  </div>\n\n  <!-- 엠즈 입고 DB 설정 모달 (통일된 심플 URL 팝업) -->\n  <div id=\"msi_cloudModal\" onclick=\"if(event.target===this) window.MSInbound.closeCloudModal()\" class=\"fixed inset-0 bg-stone-950/60 backdrop-blur-xs hidden items-center justify-center z-50 p-4\">\n    <div class=\"bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl border border-stone-200 text-xs\">\n      <div class=\"flex items-center justify-between pb-3 border-b border-stone-200\">\n        <h3 class=\"text-base font-extrabold text-stone-900\">엠즈 입고 구글 스프레드시트 DB 설정</h3>\n        <button type=\"button\" onclick=\"window.MSInbound.closeCloudModal()\" class=\"text-stone-400 hover:text-stone-700 cursor-pointer\"><i data-lucide=\"x\" class=\"w-5 h-5\"></i></button>\n      </div>\n      <div class=\"mt-4 space-y-3\">\n        <div>\n          <label class=\"font-bold text-stone-700 block mb-1\">Google Apps Script 웹 앱 URL</label>\n          <input type=\"url\" id=\"msi_cloudUrlInput\" placeholder=\"https://script.google.com/macros/s/.../exec\" class=\"w-full border border-stone-300 focus:border-emerald-600 focus:outline-none rounded-xl px-3 py-2 font-mono bg-stone-50 focus:bg-white text-stone-900\">\n        </div>\n        <div class=\"flex justify-end gap-2 pt-1\">\n          <button type=\"button\" onclick=\"window.MSInbound.closeCloudModal()\" class=\"px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold cursor-pointer\">닫기</button>\n          <button type=\"button\" onclick=\"window.MSInbound.saveCloudConfig()\" class=\"px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer\">URL 저장 및 동기화</button>\n        </div>\n      </div>\n    </div>\n  </div>\n\n  <!-- 입고 방법(사용법) 안내 모달 -->\n  <div id=\"msi_guideModal\" onclick=\"if(event.target===this) window.MSInbound.closeGuideModal()\" class=\"fixed inset-0 bg-stone-950/60 backdrop-blur-xs hidden items-center justify-center z-50 p-4\">\n    <div class=\"bg-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-xl border border-stone-200 text-xs space-y-4\">\n      <div class=\"flex items-center justify-between pb-3 border-b border-stone-200\">\n        <div class=\"flex items-center gap-2\">\n          <span class=\"w-6 h-6 rounded-lg bg-slate-900 text-amber-300 flex items-center justify-center font-extrabold text-xs\">?</span>\n          <h3 class=\"text-base font-extrabold text-stone-900\">사용법 · 엠즈 입고 엑셀 다운로드 안내</h3>\n        </div>\n        <button type=\"button\" onclick=\"window.MSInbound.closeGuideModal()\" class=\"text-stone-400 hover:text-stone-700 cursor-pointer\"><i data-lucide=\"x\" class=\"w-5 h-5\"></i></button>\n      </div>\n\n      <!-- 접속 정보 카드 -->\n      <div class=\"bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-2\">\n        <div class=\"flex items-center justify-between gap-2 flex-wrap\">\n          <span class=\"font-extrabold text-slate-800 text-[13px]\">엠즈 바로가 PRM 사이트 로그인</span>\n          <a href=\"http://srm.msfs.co.kr:8084/\" target=\"_blank\" rel=\"noopener noreferrer\" class=\"inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11.5px] font-bold transition\">\n            <span>사이트 바로가기</span>\n            <i data-lucide=\"external-link\" class=\"w-3 h-3\"></i>\n          </a>\n        </div>\n        <div class=\"font-mono text-[11.5px] text-blue-700 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 select-all\">http://srm.msfs.co.kr:8084/</div>\n        <div class=\"bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600\">로그인 ID·비밀번호는 보안상 화면에 표시하지 않습니다. 담당자에게 문의하세요.</div>\n      </div>\n\n      <!-- 단계별 안내 -->\n      <div class=\"space-y-3 text-[12.5px] text-slate-700 leading-relaxed\">\n        <div class=\"p-3 rounded-xl bg-amber-50/60 border border-amber-200/80\">\n          <div class=\"font-extrabold text-slate-900\">1. 로그인 후 메뉴 이동</div>\n          <div class=\"mt-0.5 font-bold text-amber-900\">메뉴 &gt; 발주관리 &gt; 발주 및 거래명세서(수량)</div>\n        </div>\n\n        <div class=\"p-3.5 rounded-xl bg-white border border-slate-200 space-y-1.5\">\n          <div class=\"font-extrabold text-slate-900\">2. 필수 입력 <span class=\"text-rose-600 text-[11.5px]\">(미입력 시 검색 안됨)</span></div>\n          <ul class=\"space-y-1.5 pl-1 text-xs\">\n            <li><span class=\"font-bold text-slate-800\">1) 물류센터:</span> <b class=\"text-blue-700\">용인센터</b> 선택 <span class=\"text-slate-500\">(엠즈 용인 남사 센터로만 입고 진행함)</span></li>\n            <li><span class=\"font-bold text-slate-800\">2) 조회구분:</span> 입고 완료된 내역만 업로드 하기 때문에 <b class=\"px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-extrabold\">입고 기간</b>으로 설정</li>\n            <li><span class=\"font-bold text-slate-800\">3) 조회기간:</span> 원하는 기간 입력</li>\n            <li><span class=\"font-bold text-slate-800\">4) 매입확정:</span> 입고 완료 후 <b>매입 확정된 이력만</b> 업로드 진행함</li>\n          </ul>\n        </div>\n\n        <div class=\"p-3 rounded-xl bg-emerald-50 border border-emerald-200 font-extrabold text-emerald-900 flex items-center gap-2\">\n          <i data-lucide=\"file-spreadsheet\" class=\"w-4 h-4 text-emerald-600 shrink-0\"></i>\n          <span>3. 엑셀 버튼으로 다운로드 후 해당 엑셀 파일 그대로 업로드</span>\n        </div>\n      </div>\n\n      <div class=\"flex justify-end pt-1\">\n        <button type=\"button\" onclick=\"window.MSInbound.closeGuideModal()\" class=\"px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold cursor-pointer\">확인</button>\n      </div>\n    </div>\n  </div>\n\n  <!-- 토스트 알림 -->\n  <div id=\"msi_toast\" class=\"fixed bottom-5 right-5 bg-slate-900 text-white text-xs font-medium px-4 py-2.5 rounded-xl shadow-lg opacity-0 pointer-events-none transition-opacity duration-200 flex items-center gap-2 z-50\">\n    <i data-lucide=\"check-circle-2\" class=\"w-4 h-4 text-emerald-400\"></i>\n    <span id=\"msi_toastMsg\">완료되었습니다.</span>\n  </div>\n  </div>\n</div>";
        _msInboundMounted = true;
        const todayStr = new Date().toISOString().slice(0, 10);
        const retDateEl = document.getElementById('msi_retInputDate');
        if (retDateEl) retDateEl.value = todayStr;
        loadFromStorage();
        setupDragAndDrop();
        checkCloudBadge();
        // 최초 접속 시 loadFromStorage()에서 1회만 자동 불러오기 수행 (이후에는 등록/수정/삭제 액션 또는 [불러오기] 클릭 시에만 동기화)
      } else {
        renderAll();
      }
      if (window.lucide) lucide.createIcons();
    }

    window.mountMsInboundApp = mountMsInboundApp;
    window.exportMsInboundExcel = downloadSettlementExcel;
    window.MSInbound = {
      downloadSettlementExcel, pullFromCloud, pushToCloud, openCloudModal, closeCloudModal, openGuideModal, closeGuideModal, copyAccountInfo, saveCloudConfig, openConfirmModal, closeConfirmModal, handleFiles, renderAll, switchMainView, toggleAllCards, toggleCard, toggleRecordStatus, setFilter, selectReturnReason, addReturnRecord, requestDeleteReturn, requestDeleteRecord, handlePriceExcel, editUnitPriceModal, editRecordField, closeEditModal, clearEditField, saveEditModal, setItemUnitPrice, setItemRecipeCode, autoMatchRecipeCodes, showToast, exportData, importData
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        mountMsInboundApp();
      });
    } else {
      mountMsInboundApp();
    }

    function setupDragAndDrop() {
      const dropZone = document.getElementById('msi_dropZone');
      ['dragenter', 'dragover'].forEach(evt => {
        dropZone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); dropZone.classList.add('drop-active'); });
      });
      ['dragleave', 'drop'].forEach(evt => {
        dropZone.addEventListener(evt, e => { e.preventDefault(); e.stopPropagation(); dropZone.classList.remove('drop-active'); });
      });
      dropZone.addEventListener('drop', e => {
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) {
          handleFiles(e.dataTransfer.files);
        }
      });
    }

    function switchMainView(view) {
      currentMainView = view;
      const btnDaily = document.getElementById('msi_tabBtnDaily');
      const btnAnalytics = document.getElementById('msi_tabBtnAnalytics');
      const btnReturns = document.getElementById('msi_tabBtnReturns');
      const btnPrices = document.getElementById('msi_tabBtnPrices');
      const dailyContainer = document.getElementById('msi_dailyViewContainer');
      const analyticsContainer = document.getElementById('msi_analyticsViewContainer');
      const returnsContainer = document.getElementById('msi_returnsViewContainer');
      const pricesContainer = document.getElementById('msi_pricesViewContainer');
      const accordionControls = document.getElementById('msi_accordionControls');

      const activeClass = 'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-extrabold transition cursor-pointer bg-stone-900 text-white shadow-xs';
      const inactiveClass = 'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-extrabold transition cursor-pointer bg-white text-stone-700 border border-stone-200 hover:bg-stone-50';

      btnDaily.className = view === 'DAILY' ? activeClass : inactiveClass;
      btnAnalytics.className = view === 'ANALYTICS' ? activeClass : inactiveClass;
      btnReturns.className = view === 'RETURNS' ? activeClass : inactiveClass;
      if (btnPrices) btnPrices.className = view === 'PRICES' ? activeClass : inactiveClass;

      const retBadge = document.getElementById('msi_returnTabCountBadge');
      if (retBadge) {
        retBadge.className = view === 'RETURNS'
          ? 'px-1.5 py-0.5 bg-amber-400 text-stone-950 rounded-full text-[11px] font-extrabold tabular-nums'
          : 'px-1.5 py-0.5 bg-amber-100 text-amber-900 rounded-full text-[11px] font-extrabold tabular-nums';
      }

      const bodyContainer = document.getElementById('msi_bodyContainer');
      if (bodyContainer) {
        bodyContainer.className = view === 'ANALYTICS'
          ? 'max-w-[1320px] mx-auto px-3 sm:px-5 pt-3.5 pb-8 transition-all'
          : 'max-w-[1080px] mx-auto px-3 sm:px-5 pt-3.5 pb-8 transition-all';
      }
      const dailyTopSummary = document.getElementById('msi_dailyTopSummaryWrap');
      if (dailyTopSummary) dailyTopSummary.classList.toggle('hidden', view !== 'DAILY');
      dailyContainer.classList.toggle('hidden', view !== 'DAILY');
      analyticsContainer.classList.toggle('hidden', view !== 'ANALYTICS');
      returnsContainer.classList.toggle('hidden', view !== 'RETURNS');
      if (pricesContainer) pricesContainer.classList.toggle('hidden', view !== 'PRICES');
      accordionControls.classList.toggle('hidden', view !== 'DAILY');
      const dateTabsEl = document.getElementById('msi_dateTabs');
      if (dateTabsEl) dateTabsEl.classList.toggle('hidden', view === 'RETURNS' || view === 'PRICES');

      renderAll();
    }

    function getDisplayItems(rawItems) {
      const merge = document.getElementById('msi_mergeSameItemToggle')?.checked;
      if (!merge) return rawItems;
      const map = new Map();
      rawItems.forEach(it => {
        const key = (it.code ? it.code + '_' : '') + it.name;
        if (map.has(key)) {
          const prev = map.get(key);
          prev.box += it.box;
          prev.pk += it.pk;
          prev.mergedCount = (prev.mergedCount || 1) + 1;
        } else {
          map.set(key, { ...it, mergedCount: 1 });
        }
      });
      return Array.from(map.values());
    }

    function setBannerStatus(msg, isError = false) {
      const banner = document.getElementById('msi_uploadStatusBanner');
      banner.classList.remove('hidden', 'bg-emerald-100', 'text-emerald-800', 'bg-rose-100', 'text-rose-800');
      banner.classList.add(isError ? 'bg-rose-100' : 'bg-emerald-100', isError ? 'text-rose-800' : 'text-emerald-800');
      banner.textContent = msg;
    }

    function handleFiles(files) {
      if (!files || files.length === 0) return;
      setBannerStatus(`⏳ '${files[0].name}' 파일을 분석 중입니다...`);

      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = e => {
          try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true, codepage: 949 });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1, defval: '' });
            parseMsExcel(rows, file.name);
          } catch (err) {
            setBannerStatus(`❌ 파일 읽기 오류: ${err.message}`, true);
            showToast('엑셀 파일을 읽는 중 오류가 발생했습니다.');
          }
        };
        reader.readAsArrayBuffer(file);
      });
      document.getElementById('msi_excelInput').value = '';
    }

    function parseMsExcel(rows, fileName) {
      if (!rows || rows.length < 2) {
        setBannerStatus('❌ 엑셀 시트에 데이터가 없습니다.', true);
        return;
      }

      let colReqDate = -1, colBuyDate = -1, colOrderDate = -1;
      let colCode = -1, colName = -1, colSpec = -1, colUnit = -1, colIpsu = -1, colBox = -1, colPk = -1, colCenter = -1;
      let startRow = 1;

      for (let r = 0; r < Math.min(10, rows.length); r++) {
        const rowStr = rows[r].map(c => String(c).trim());
        rowStr.forEach((val, idx) => {
          if (val === '입고요청일' || /입고일|요청일/.test(val)) colReqDate = idx;
          if (val === '매입일자' || /매입일/.test(val)) colBuyDate = idx;
          if (val === '발주일자' || /발주일/.test(val)) colOrderDate = idx;
          if (val === '입고처' || /센터|납품처/.test(val)) colCenter = idx;
          if (val === '상품코드' || /품목코드/.test(val)) colCode = idx;
          if (val === '상품명' || (/품목명|품명|상품|품목/.test(val) && !/코드/.test(val))) colName = idx;
          if (val === '규격') colSpec = idx;
          if (val === '단위') colUnit = idx;
          if (val === '입수') colIpsu = idx;
          if (val === '발주' || /박스수|발주량|발주수량/.test(val)) colBox = idx;
          if (val === '환산' || /환산수량|팩수|pk/i.test(val)) colPk = idx;
        });
        if (colName !== -1) { startRow = r + 1; break; }
      }

      if (colName === -1) {
        const sampleRow = rows[1] || rows[0];
        if (sampleRow && sampleRow.length >= 17) {
          colOrderDate = 2; colReqDate = 4; colCenter = 6; colCode = 7; colName = 8;
          colSpec = 9; colUnit = 11; colIpsu = 12; colBox = 15; colPk = 16; colBuyDate = 19;
          startRow = 1;
        }
      }

      const groupedByDate = {};
      const defaultDate = new Date().toISOString().slice(0, 10);

      for (let i = startRow; i < rows.length; i++) {
        const row = rows[i];
        if (!row || row.length === 0) continue;

        const itemName = String(row[colName] || '').trim();
        if (!itemName || /합계|총계|소계|상품명/i.test(itemName)) continue;

        let rawDate = (colReqDate !== -1 && row[colReqDate]) ? row[colReqDate] :
                      (colBuyDate !== -1 && row[colBuyDate]) ? row[colBuyDate] :
                      (colOrderDate !== -1 && row[colOrderDate]) ? row[colOrderDate] : '';
        const dateKey = normalizeDate(rawDate) || defaultDate;
        const orderDateStr = (colOrderDate !== -1 && row[colOrderDate]) ? normalizeDate(row[colOrderDate]) : '';
        const centerStr = (colCenter !== -1 && row[colCenter]) ? String(row[colCenter]).trim() : '용인 남사센터';

        const ipsu = colIpsu !== -1 ? (parseFloat(String(row[colIpsu]).replace(/[^0-9.]/g, '')) || 1) : 1;
        let boxCount = colBox !== -1 ? (parseFloat(String(row[colBox]).replace(/[^0-9.]/g, '')) || 0) : 0;
        let pkCount = colPk !== -1 ? (parseFloat(String(row[colPk]).replace(/[^0-9.]/g, '')) || 0) : 0;

        if (boxCount > 0 && pkCount === 0) pkCount = boxCount * ipsu;
        if (pkCount > 0 && boxCount === 0 && ipsu > 0) boxCount = Math.round((pkCount / ipsu) * 10) / 10;
        if (boxCount <= 0 && pkCount <= 0) continue;

        if (!groupedByDate[dateKey]) {
          groupedByDate[dateKey] = { date: dateKey, orderDate: orderDateStr, center: centerStr, items: [] };
        }

        groupedByDate[dateKey].items.push({
          code: colCode !== -1 ? String(row[colCode] || '').trim() : '',
          name: itemName,
          spec: colSpec !== -1 ? String(row[colSpec] || '').trim() : '',
          unit: colUnit !== -1 ? String(row[colUnit] || 'BOX').trim() : 'BOX',
          ipsu: ipsu,
          box: boxCount,
          pk: pkCount
        });
      }

      const dateKeys = Object.keys(groupedByDate).sort();
      if (dateKeys.length === 0) {
        setBannerStatus('❌ 유효한 입고 품목 행을 찾지 못했습니다.', true);
        return;
      }

      const type = '입고';
      const status = document.getElementById('msi_defaultStatus').value;
      const driver = document.getElementById('msi_defaultDriver').value;
      const costRaw = String(document.getElementById('msi_defaultCost').value || '').replace(/[^0-9]/g, '');
      const cost = costRaw === '' ? 0 : (parseInt(costRaw, 10) || 0);

      let totalItemsParsed = 0;
      let preservedCount = 0;
      dateKeys.forEach(dKey => {
        const grp = groupedByDate[dKey];
        totalItemsParsed += grp.items.length;
        const totalBoxes = Math.round(grp.items.reduce((s, it) => s + it.box, 0));
        const totalPks = Math.round(grp.items.reduce((s, it) => s + it.pk, 0));
        const recId = 'rec_' + dKey.replace(/-/g, '');

        const newRecord = {
          id: recId,
          date: dKey,
          orderDate: grp.orderDate,
          center: grp.center,
          type: type,
          status: status,
          title: `정기 입고 (${totalBoxes}box)`,
          driver: driver,
          cost: cost,
          memo: '',
          totalBoxes: totalBoxes,
          totalPks: totalPks,
          items: grp.items
        };

        const existIdx = records.findIndex(r => r.date === dKey);
        if (existIdx !== -1) {
          // [1단계] 같은 날짜 재업로드: 품목·수량은 새 파일 기준으로 교체하고,
          // 손으로 입력한 기사·운임·메모·상태·제목은 기존 값을 유지
          const prev = records[existIdx];
          const autoTitle = /^정기 입고 \(\d+box\)$/.test(String(prev.title || ''));
          newRecord.id = prev.id || newRecord.id;
          newRecord.driver = prev.driver !== undefined ? prev.driver : newRecord.driver;
          newRecord.cost = prev.cost !== undefined ? prev.cost : newRecord.cost;
          newRecord.memo = prev.memo || '';
          newRecord.status = (prev.status === '입고 완료' || status === '입고 완료') ? '입고 완료' : (prev.status || status);
          if (!autoTitle && prev.title) newRecord.title = prev.title;
          records[existIdx] = newRecord;
          preservedCount++;
        } else {
          records.push(newRecord);
        }
      });

      records.sort((a, b) => b.date.localeCompare(a.date));
      currentFilter = 'ALL';
      saveToStorage();
      renderAll();
      setBannerStatus(`✅ '${fileName}' 업로드 성공! 총 ${dateKeys.length}개 일자 (${totalItemsParsed}개 행) 반영 완료${preservedCount ? ` · 기존 ${preservedCount}개 일자는 기사·운임·메모 유지` : ''}`);
      showToast(`총 ${dateKeys.length}개 일자 내역이 업데이트되었습니다!`);
    }

    function normalizeDate(val) {
      if (!val) return '';
      if (val instanceof Date) return val.toISOString().slice(0, 10);
      const str = String(val).trim().replace(/[./년월]/g, '-').replace(/일/g, '');
      const m = str.match(/(20\d{2})-(\d{1,2})-(\d{1,2})/);
      if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
      return '';
    }

    function renderAll() {
      renderStats();
      renderTop5Widget();
      renderDateTabs();
      updateReturnTabBadge();
      if (currentMainView === 'DAILY') {
        renderRecords();
      } else if (currentMainView === 'ANALYTICS') {
        renderAnalytics();
      } else if (currentMainView === 'RETURNS') {
        renderReturnsView();
      } else if (currentMainView === 'PRICES') {
        renderPricesView();
      }
      lucide.createIcons();
    }

    function updateReturnTabBadge() {
      const badge = document.getElementById('msi_returnTabCountBadge');
      if (badge) badge.textContent = returnRecords.length;
    }

    // 상단 TOP 10 간략 가로 막대그래프 위젯 렌더링 (pk 기준, 1열 가로 나열)
    function renderTop5Widget() {
      const container = document.getElementById('msi_top5ChartContainer');
      if (!container) return;
      const filtered = getFilteredRecords();

      if (filtered.length === 0) {
        container.innerHTML = `<div class="text-xs text-slate-400 text-center py-6">데이터가 없습니다.</div>`;
        return;
      }

      const itemMap = new Map();
      let totalPkAll = 0;

      filtered.forEach(r => {
        r.items.forEach(it => {
          const key = (it.code ? it.code + '_' : '') + it.name;
          if (!itemMap.has(key)) {
            itemMap.set(key, { code: it.code, name: it.name, box: 0, pk: 0 });
          }
          const st = itemMap.get(key);
          st.box += it.box;
          st.pk += it.pk;
          totalPkAll += it.pk;
        });
      });

      const top10 = Array.from(itemMap.values())
        .sort((a, b) => b.pk - a.pk)
        .slice(0, 10);

      const maxPk = top10[0]?.pk || 1;
      const barColors = [
        'bg-emerald-600', 'bg-emerald-500', 'bg-teal-500', 'bg-blue-500', 'bg-indigo-500',
        'bg-indigo-400', 'bg-slate-500', 'bg-slate-400', 'bg-slate-400', 'bg-slate-300'
      ];

      if (filtered.length === 0) {
        container.innerHTML = `<div class="col-span-2 text-xs text-slate-400 text-center py-3">데이터가 없습니다.</div>`;
        return;
      }
      // 좌측 열(1~5위), 우측 열(6~10위) 순으로 자연스럽게 읽히도록 2열 인터리브 배치
      const leftCol = top10.slice(0, 5);
      const rightCol = top10.slice(5, 10);
      const ordered = [];
      for (let r = 0; r < 5; r++) {
        if (leftCol[r]) ordered.push({ item: leftCol[r], rank: r + 1 });
        if (rightCol[r]) ordered.push({ item: rightCol[r], rank: r + 6 });
      }
      container.innerHTML = ordered.map(({ item, rank }) => {
        const idx = rank - 1;
        const share = totalPkAll ? ((item.pk / totalPkAll) * 100).toFixed(1) : '0.0';
        const widthPct = Math.max(4, Math.round((item.pk / maxPk) * 100));
        const shortName = item.name.replace(/^M(\[.*?\]|\(.*?\))/, '');
        return `
          <div class="grid grid-cols-12 items-center gap-2 text-xs py-0.5">
            <div class="col-span-5 flex items-center gap-1.5 min-w-0">
              <span class="w-4 h-4 rounded ${idx < 3 ? 'bg-emerald-600 text-white' : 'bg-slate-200/80 text-slate-600'} text-[10px] font-extrabold flex items-center justify-center shrink-0 tabular-nums">${rank}</span>
              <span class="font-semibold text-slate-700 truncate text-[11.5px]" title="${escapeHtml(item.name)}">${escapeHtml(shortName)}</span>
            </div>
            <div class="col-span-4 bg-slate-200/70 h-1.5 rounded-full overflow-hidden">
              <div class="${barColors[idx] || 'bg-slate-400'} h-full rounded-full transition-all duration-300" style="width: ${widthPct}%"></div>
            </div>
            <div class="col-span-3 text-right font-semibold text-slate-700 whitespace-nowrap text-[11px] tabular-nums">
              <span class="text-emerald-700 font-extrabold">${item.pk.toLocaleString()}</span><span class="text-[10px] text-slate-400">pk</span>
              <span class="text-[10px] text-slate-400 ml-0.5">(${share}%)</span>
            </div>
          </div>
        `;
      }).join('');
    }

    function renderStats() {
      const filtered = getFilteredRecords();
      const filteredReturns = getFilteredReturns();
      const count = filtered.length;
      const doneCount = filtered.filter(r => r.status === '입고 완료').length;
      const planCount = count - doneCount;
      const boxes = filtered.reduce((acc, r) => acc + (r.totalBoxes || 0), 0);
      const pks = filtered.reduce((acc, r) => acc + (r.totalPks || 0), 0);
      const inboundCost = filtered.reduce((acc, r) => acc + (r.cost || 0), 0);
      const returnCost = filteredReturns.reduce((acc, r) => acc + (r.cost || 0), 0);
      const totalCost = inboundCost + returnCost;

      const itemMap = new Map();
      const pricedSet = new Set();
      let totalPurchaseAmount = 0;

      filtered.forEach(r => {
        r.items.forEach(it => {
          const k = it.name;
          itemMap.set(k, (itemMap.get(k) || 0) + it.pk);
          const uPrice = getItemUnitPrice(it);
          if (uPrice > 0) {
            pricedSet.add(k);
            totalPurchaseAmount += (it.pk * uPrice);
          }
        });
      });
      let topItemName = '-';
      let maxPk = 0;
      itemMap.forEach((pkVal, name) => {
        if (pkVal > maxPk) { maxPk = pkVal; topItemName = name.replace(/^M(\[.*?\]|\(.*?\))/, ''); }
      });

      document.getElementById('msi_statCount').textContent = `${count}건`;
      document.getElementById('msi_statSubCount').textContent = `완료 ${doneCount} · 예정 ${planCount}`;
      document.getElementById('msi_statBoxes').textContent = `${boxes.toLocaleString()} box`;
      document.getElementById('msi_statAvgBoxes').textContent = `일평균 ${count ? Math.round(boxes / count).toLocaleString() : 0}box`;
      document.getElementById('msi_statPks').textContent = `${pks.toLocaleString()} pk`;
      document.getElementById('msi_statAvgPks').textContent = `일평균 ${count ? Math.round(pks / count).toLocaleString() : 0}pk`;
      document.getElementById('msi_statUniqueItems').textContent = `${itemMap.size}종`;
      document.getElementById('msi_statTopItem').textContent = maxPk > 0 ? `최다: ${topItemName.slice(0, 9)}..` : '-';
      document.getElementById('msi_statCost').textContent = `${totalCost.toLocaleString()}원`;
      const breakdownEl = document.getElementById('msi_statCostBreakdown');
      if (breakdownEl) {
        breakdownEl.textContent = `입고 ${(inboundCost / 10000).toFixed(0)}만 · 회송 ${(returnCost / 10000).toFixed(0)}만`;
      }
      const purchaseEl = document.getElementById('msi_statPurchaseAmount');
      if (purchaseEl) purchaseEl.textContent = `${totalPurchaseAmount.toLocaleString()}원`;
      const rateEl = document.getElementById('msi_statPriceSetRate');
      if (rateEl) rateEl.textContent = `단가 ${pricedSet.size}/${itemMap.size}종`;
    }

    function renderDateTabs() {
      // 회송 내역(returnRecords)은 제외하고 순수 입고 내역(records) 날짜만 기준으로 월별 필터 생성
      const inboundDates = records.map(r => r.date).filter(Boolean);
      const months = Array.from(new Set(inboundDates.map(d => d.slice(0, 7)))).sort().reverse();
      const container = document.getElementById('msi_dateTabs');

      // 현재 선택된 필터 월에 입고 내역이 없다면 전체 보기로 자동 복귀
      if (currentFilter !== 'ALL' && !months.includes(currentFilter)) {
        currentFilter = 'ALL';
      }

      let html = `<button onclick="window.MSInbound.setFilter('ALL')" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${currentFilter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}">전체 보기 (${records.length}건)</button>`;

      months.forEach(m => {
        const [y, mm] = m.split('-');
        const mCount = records.filter(r => r.date && r.date.startsWith(m)).length;
        const active = currentFilter === m;
        html += `<button onclick="window.MSInbound.setFilter('${m}')" class="px-3 py-1.5 rounded-lg text-xs font-semibold transition whitespace-nowrap ${active ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'}">${y}년 ${parseInt(mm, 10)}월 (${mCount}건)</button>`;
      });

      container.innerHTML = html;
    }

    function setFilter(f) {
      currentFilter = f;
      renderAll();
    }

    function getFilteredRecords() {
      const q = (document.getElementById('msi_searchInput')?.value || '').toLowerCase();
      return records.filter(r => {
        const matchFilter = currentFilter === 'ALL' || r.date.startsWith(currentFilter);
        const matchQuery = !q || r.date.includes(q) || r.title.toLowerCase().includes(q) || r.driver.toLowerCase().includes(q) || (r.memo && r.memo.toLowerCase().includes(q)) || r.items.some(i => i.name.toLowerCase().includes(q) || (i.code && i.code.includes(q)));
        return matchFilter && matchQuery;
      });
    }

    function getFilteredReturns() {
      const q = (document.getElementById('msi_searchInput')?.value || '').toLowerCase();
      return returnRecords.filter(r => {
        const matchQuery = !q || r.date.includes(q) || r.reason.toLowerCase().includes(q) || r.driver.toLowerCase().includes(q) || (r.note && r.note.toLowerCase().includes(q));
        return matchQuery;
      });
    }

    function toggleCard(id) {
      collapsedMap[id] = !collapsedMap[id];
      renderRecords();
    }

    function toggleAllCards(collapse) {
      records.forEach(r => { collapsedMap[r.id] = collapse; });
      renderRecords();
    }

    function toggleRecordStatus(id) {
      const rec = records.find(r => r.id === id);
      if (!rec) return;
      rec.status = rec.status === '입고 완료' ? '입고 예정' : '입고 완료';
      saveToStorage();
      renderAll();
      showToast(`${rec.date} 상태가 '${rec.status}'(으)로 변경되었습니다.`);
    }

    // 인라인 수정 모달 제어 (입고 내역 & 회송 내역 & 품목 매입단가 공용)
    function editUnitPriceModal(code, name) {
      const curPrice = getItemUnitPrice({ code, name });
      editingTarget = { id: code, field: 'unitPrice', label: 'pk당 매입단가(원)', isUnitPrice: true, code, name };
      document.getElementById('msi_editModalTitle').textContent = `[${name}] pk당 매입단가(원) 입력`;
      const input = document.getElementById('msi_editModalInput');
      input.value = curPrice > 0 ? curPrice : '';
      input.rows = 1;
      const modal = document.getElementById('msi_editFieldModal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      lucide.createIcons();
      setTimeout(() => { input.focus(); input.select(); }, 50);
    }

    function editRecordField(id, field, label, isReturn = false) {
      const targetList = isReturn ? returnRecords : records;
      const rec = targetList.find(r => r.id === id);
      if (!rec) return;
      editingTarget = { id, field, label, isReturn };
      document.getElementById('msi_editModalTitle').textContent = `${rec.date} [${label}] 수정`;
      const input = document.getElementById('msi_editModalInput');
      input.value = rec[field] !== undefined ? rec[field] : '';
      input.rows = (field === 'note' || field === 'memo') ? 4 : 2;
      const modal = document.getElementById('msi_editFieldModal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      lucide.createIcons();
      setTimeout(() => input.focus(), 50);
    }

    function closeEditModal() {
      const modal = document.getElementById('msi_editFieldModal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      editingTarget = null;
    }

    function clearEditField() {
      if (!editingTarget) return;
      if (editingTarget.isUnitPrice) {
        setItemUnitPrice(editingTarget.code, editingTarget.name, 0);
        showToast('매입단가가 초기화되었습니다.');
        closeEditModal();
        return;
      }
      const { id, field, isReturn } = editingTarget;
      const targetList = isReturn ? returnRecords : records;
      const rec = targetList.find(r => r.id === id);
      if (rec) {
        if (field === 'cost') {
          rec.cost = 0;
        } else {
          rec[field] = '';
        }
        saveToStorage();
        renderAll();
        showToast('내용이 삭제되었습니다.');
      }
      closeEditModal();
    }

    function saveEditModal() {
      if (!editingTarget) return;
      const val = document.getElementById('msi_editModalInput').value;
      if (editingTarget.isUnitPrice) {
        setItemUnitPrice(editingTarget.code, editingTarget.name, val);
        showToast(`[${editingTarget.name}] 매입단가가 저장되었습니다.`);
        closeEditModal();
        return;
      }
      const { id, field, label, isReturn } = editingTarget;
      const targetList = isReturn ? returnRecords : records;
      const rec = targetList.find(r => r.id === id);
      if (rec) {
        if (field === 'cost') {
          rec.cost = parseInt(String(val).replace(/[^0-9]/g, ''), 10) || 0;
        } else {
          rec[field] = val.trim();
        }
        saveToStorage();
        renderAll();
        showToast(`${label} 항목이 업데이트되었습니다.`);
      }
      closeEditModal();
    }

    // 회송 내역 관리 전용 함수들
    function selectReturnReason(reason) {
      const sel = document.getElementById('msi_retInputReason');
      if (sel) sel.value = reason;
    }

    function getReasonBadgeClass(reason) {
      if (reason.includes('소비기한')) return 'bg-rose-100 text-rose-700 border border-rose-200';
      if (reason.includes('외박스')) return 'bg-amber-100 text-amber-800 border border-amber-200';
      if (reason.includes('파레트')) return 'bg-orange-100 text-orange-800 border border-orange-200';
      if (reason.includes('입고 시간')) return 'bg-purple-100 text-purple-700 border border-purple-200';
      return 'bg-slate-100 text-slate-700 border border-slate-200';
    }

    function addReturnRecord() {
      const dateVal = document.getElementById('msi_retInputDate').value || new Date().toISOString().slice(0, 10);
      const reasonVal = document.getElementById('msi_retInputReason').value || '소비기한 오류';
      const driverVal = document.getElementById('msi_retInputDriver').value.trim() || '김민겸 기사';
      const costVal = parseInt(document.getElementById('msi_retInputCost').value, 10) || 0;
      const noteVal = document.getElementById('msi_retInputNote').value.trim();

      const newRet = {
        id: 'ret_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        date: dateVal,
        reason: reasonVal,
        driver: driverVal,
        cost: costVal,
        note: noteVal
      };

      returnRecords.unshift(newRet);
      returnRecords.sort((a, b) => b.date.localeCompare(a.date));
      const noteEl = document.getElementById('msi_retInputNote');
      noteEl.value = '';
      noteEl.style.height = '36px';
      saveToStorage();
      renderAll();
      showToast(`${dateVal} [${reasonVal}] 회송 내역이 등록되었습니다.`);
    }

    function requestDeleteReturn(id, dateStr, reasonStr) {
      openConfirmModal(`${dateStr} [${reasonStr}] 회송 내역을 삭제하시겠습니까?`, () => {
        returnRecords = returnRecords.filter(r => r.id !== id);
        saveToStorage();
        renderAll();
        showToast('회송 내역이 삭제되었습니다.');
      });
    }

    function renderReturnsView() {
      const filtered = getFilteredReturns();
      const totalCost = filtered.reduce((acc, r) => acc + (r.cost || 0), 0);

      const c1 = filtered.filter(r => r.reason.includes('소비기한')).length;
      const c2 = filtered.filter(r => r.reason.includes('외박스')).length;
      const c3 = filtered.filter(r => r.reason.includes('파레트')).length;
      const c4 = filtered.filter(r => r.reason.includes('입고 시간')).length;
      const c5 = filtered.length - (c1 + c2 + c3 + c4);

      document.getElementById('msi_retStatCount').textContent = `${filtered.length}건`;
      document.getElementById('msi_retStatCost').textContent = `${totalCost.toLocaleString()}원`;
      document.getElementById('msi_retStatReason1').textContent = `${c1}건`;
      document.getElementById('msi_retStatReason2').textContent = `${c2}건`;
      document.getElementById('msi_retStatReason3').textContent = `${c3}건`;
      document.getElementById('msi_retStatReason4').textContent = `${c4}건`;
      const r5El = document.getElementById('msi_retStatReason5');
      if (r5El) r5El.textContent = `${c5}건`;

      const wrapper = document.getElementById('msi_returnsTableWrapper');
      if (filtered.length === 0) {
        wrapper.innerHTML = `
          <div class="py-12 text-center text-slate-400 text-xs">
            등록된 회송 내역이 없습니다. 위 입력창에서 회송 사유(소비기한 오류, 외박스 파손 등)와 운임료를 입력해 등록해 보세요!
          </div>`;
        return;
      }

      wrapper.innerHTML = `
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-slate-200 text-slate-400">
              <th class="py-2 w-12">No.</th>
              <th class="py-2 w-28">회송일자</th>
              <th class="py-2 w-36">회송 사유</th>
              <th class="py-2">상세 내용 / 대상 품목 (클릭 시 수정)</th>
              <th class="py-2 w-28">담당 기사</th>
              <th class="py-2 text-right w-32">회송 운임료</th>
              <th class="py-2 text-center w-16 no-print">삭제</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${filtered.map((ret, idx) => `
              <tr class="hover:bg-slate-50/80">
                <td class="py-2.5 text-slate-400 font-medium">${idx + 1}</td>
                <td class="py-2.5 font-bold text-slate-800">${escapeHtml(ret.date)}</td>
                <td class="py-2.5">
                  <span onclick="window.MSInbound.editRecordField('${ret.id}', 'reason', '회송 사유', true)" class="px-2 py-0.5 rounded-md text-[11px] font-semibold cursor-pointer ${getReasonBadgeClass(ret.reason)}" title="클릭하여 사유 수정">
                    ${escapeHtml(ret.reason)} ✎
                  </span>
                </td>
                <td class="py-2.5 font-medium text-slate-700 cursor-pointer hover:text-blue-600 whitespace-pre-line leading-relaxed" onclick="window.MSInbound.editRecordField('${ret.id}', 'note', '회송 상세 내용', true)">
                  ${ret.note ? escapeHtml(ret.note) : `<span class="text-slate-300 underline">+ 상세 내용 입력</span>`}
                </td>
                <td class="py-2.5 text-slate-600 cursor-pointer hover:text-blue-600" onclick="window.MSInbound.editRecordField('${ret.id}', 'driver', '담당 기사', true)">
                  🚚 <b>${escapeHtml(ret.driver)}</b> ✎
                </td>
                <td class="py-2.5 text-right font-bold text-rose-600 cursor-pointer hover:underline" onclick="window.MSInbound.editRecordField('${ret.id}', 'cost', '회송 운임료', true)">
                  ${(ret.cost || 0).toLocaleString()}원 ✎
                </td>
                <td class="py-2.5 text-center no-print">
                  <button onclick="window.MSInbound.requestDeleteReturn('${ret.id}', '${ret.date}', '${escapeQuotes(ret.reason)}')" class="text-slate-400 hover:text-rose-600 p-1 rounded">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr class="border-t-2 border-slate-200 bg-slate-50/60 font-bold text-slate-800">
              <td colspan="5" class="py-2.5 pl-2">회송 합계 (총 ${filtered.length}건)</td>
              <td class="py-2.5 text-right text-rose-600">${totalCost.toLocaleString()}원</td>
              <td class="no-print"></td>
            </tr>
          </tfoot>
        </table>
      `;
    }

    // 커스텀 확인 모달 제어
    function openConfirmModal(msg, onConfirm) {
      document.getElementById('msi_confirmModalMsg').textContent = msg;
      confirmCallback = onConfirm;
      const btn = document.getElementById('msi_confirmModalBtn');
      btn.onclick = () => {
        if (confirmCallback) confirmCallback();
        closeConfirmModal();
      };
      const modal = document.getElementById('msi_confirmModal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeConfirmModal() {
      const modal = document.getElementById('msi_confirmModal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
      confirmCallback = null;
    }

    function renderRecords() {
      const container = document.getElementById('msi_dailyViewContainer');
      const filtered = getFilteredRecords();

      if (filtered.length === 0) {
        container.innerHTML = `
          <div class="bg-white rounded-2xl border border-slate-200/80 p-10 text-center text-slate-400 text-xs">
            표시할 입고 내역이 없습니다. 상단에 엑셀 파일을 업로드해 보세요!
          </div>`;
        return;
      }

      container.innerHTML = filtered.map(rec => {
        const displayItems = getDisplayItems(rec.items);
        const isCollapsed = !!collapsedMap[rec.id];
        const dailyPurchaseTotal = displayItems.reduce((sum, it) => sum + (it.pk * getItemUnitPrice(it)), 0);

        return `
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden transition">
          <!-- 카드 상단 바 -->
          <div class="p-3.5 sm:px-5 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2 bg-slate-50/70">
            <div class="flex items-center gap-2 flex-wrap">
              <button onclick="window.MSInbound.toggleCard('${rec.id}')" class="p-1 rounded hover:bg-slate-200/70 text-slate-500 transition" title="접기/펼치기">
                <i data-lucide="${isCollapsed ? 'chevron-right' : 'chevron-down'}" class="w-4 h-4"></i>
              </button>
              <span class="px-2.5 py-1 rounded-md text-xs font-bold bg-slate-900 text-white cursor-pointer" onclick="window.MSInbound.toggleCard('${rec.id}')">${escapeHtml(rec.date)}</span>
              <span class="px-2 py-0.5 rounded text-[11px] font-semibold ${rec.type === '입고' ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700'}">${escapeHtml(rec.type)}</span>
              <button onclick="window.MSInbound.toggleRecordStatus('${rec.id}')" class="px-2 py-0.5 rounded text-[11px] font-semibold cursor-pointer transition ${rec.status === '입고 완료' ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-amber-100 text-amber-700 hover:bg-amber-200'}" title="클릭하여 완료/예정 전환">
                ${escapeHtml(rec.status)} ↻
              </button>
              <h3 class="text-sm font-bold text-slate-800 cursor-pointer hover:text-blue-600" onclick="window.MSInbound.editRecordField('${rec.id}', 'title', '업무 제목')">${escapeHtml(rec.title)}</h3>
              <span class="text-xs text-slate-400 font-medium">(${displayItems.length}종 / 총 ${rec.totalPks.toLocaleString()}pk)</span>
              ${dailyPurchaseTotal > 0 ? `<span class="px-2 py-0.5 rounded-md text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">매입합계: ${dailyPurchaseTotal.toLocaleString()}원</span>` : ''}
              ${rec.memo ? `<span onclick="window.MSInbound.editRecordField('${rec.id}', 'memo', '비고 메모')" class="px-2 py-0.5 rounded-full text-[11px] bg-amber-50 text-amber-800 border border-amber-200 cursor-pointer">📝 ${escapeHtml(rec.memo)}</span>` : ''}
            </div>

            <div class="flex items-center gap-2.5 text-xs text-slate-600">
              <button onclick="window.MSInbound.editRecordField('${rec.id}', 'memo', '비고 메모')" class="text-[11px] text-slate-400 hover:text-slate-700 underline">+메모</button>
              <button onclick="window.MSInbound.editRecordField('${rec.id}', 'driver', '화물 기사')" class="hover:text-blue-600" title="클릭하여 기사 수정">🚚 <b>${escapeHtml(rec.driver)}</b> ✎</button>
              <button onclick="window.MSInbound.editRecordField('${rec.id}', 'cost', '운임 비용')" class="hover:text-blue-600" title="클릭하여 비용 수정">💰 <b>${rec.cost.toLocaleString()}원</b> ✎</button>
              <button onclick="window.MSInbound.requestDeleteRecord('${rec.id}', '${rec.date}')" class="text-slate-400 hover:text-rose-600 p-1" title="이 날짜 삭제">
                <i data-lucide="x" class="w-4 h-4"></i>
              </button>
            </div>
          </div>

          <div class="${isCollapsed ? 'hidden' : 'block'}">
            <!-- 품목 상세 테이블 (상품명 최대 확장 · 우측 수치열 컴팩트 정렬) -->
            <div class="p-3 sm:px-4 overflow-x-auto">
              <table class="w-full min-w-[860px] table-fixed text-left border-collapse text-xs">
                <colgroup>
                  <col class="w-[36px]">
                  <col class="w-[72px]">
                  <col class="w-[68px]">
                  <col>
                  <col class="w-[46px]">
                  <col class="w-[74px]">
                  <col class="w-[76px]">
                  <col class="w-[94px]">
                  <col class="w-[110px]">
                </colgroup>
                <thead>
                  <tr class="border-b border-slate-200 text-slate-500 font-bold text-[11.5px]">
                    <th class="py-1.5 px-1 text-center">No.</th>
                    <th class="py-1.5 px-1 text-center">상품코드</th>
                    <th class="py-1.5 px-1 text-center leading-tight">레시피<br><span class="text-[10.5px]">품목코드</span></th>
                    <th class="py-1.5 px-2">상품명</th>
                    <th class="py-1.5 px-1 text-center">입수</th>
                    <th class="py-1.5 px-1.5 text-right">발주(box)</th>
                    <th class="py-1.5 px-1.5 text-right">환산(pk)</th>
                    <th class="py-1.5 px-1.5 text-right">매입단가(pk)</th>
                    <th class="py-1.5 px-1.5 text-right">입고금액(pk×단가)</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100">
                  ${displayItems.map((item, idx) => {
                    const pMeta = getItemPriceMeta(item);
                    const uPrice = pMeta.price;
                    const rowAmt = item.pk * uPrice;
                    const syncDot = pMeta.isRecipeSynced
                      ? `<span class="inline-block w-1 h-1 rounded-full bg-emerald-500 mr-1 align-middle" title="레시피 [${escapeHtml(pMeta.recipeCode)}] 판매금액 자동연동"></span>`
                      : '';
                    const rcBadge = pMeta.recipeCode
                      ? `<span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[11.5px] font-extrabold tabular-nums ${pMeta.isRecipeSynced ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}" title="${pMeta.recipeInfo ? escapeHtml(pMeta.recipeInfo.productName) : '레시피 미확인'}">${pMeta.isRecipeSynced ? '<span class=\"w-1 h-1 rounded-full bg-emerald-500\"></span>' : ''}${escapeHtml(pMeta.recipeCode)}</span>`
                      : `<span class="text-slate-300 text-xs">-</span>`;
                    return `
                    <tr class="hover:bg-slate-50/80">
                      <td class="py-2 px-1 text-center text-slate-400 font-semibold tabular-nums">${idx + 1}</td>
                      <td class="py-2 px-1 text-center text-slate-600 font-mono text-[13px] font-semibold tabular-nums whitespace-nowrap">${escapeHtml(item.code || '-')}</td>
                      <td class="py-2 px-1 text-center whitespace-nowrap">${rcBadge}</td>
                      <td class="py-2 px-2 font-semibold text-slate-800 text-[13px] whitespace-nowrap truncate" title="${escapeHtml(item.name)}">
                        ${escapeHtml(item.name)}
                        ${item.mergedCount > 1 ? `<span class="ml-1.5 px-1.5 py-0.5 text-[10px] rounded bg-amber-100 text-amber-800 font-semibold">${item.mergedCount}건 합산됨</span>` : ''}
                      </td>
                      <td class="py-2 px-1 text-center text-slate-600 text-[13px] font-semibold tabular-nums whitespace-nowrap">${item.ipsu || '-'}</td>
                      <td class="py-2 px-1.5 text-right text-[13.5px] font-bold text-blue-600 tabular-nums whitespace-nowrap">${item.box.toLocaleString()} <span class="text-[11px] font-medium">box</span></td>
                      <td class="py-2 px-1.5 text-right text-[13.5px] font-bold text-emerald-600 tabular-nums whitespace-nowrap">${item.pk.toLocaleString()} <span class="text-[11px] font-medium">pk</span></td>
                      <td class="py-2 px-1.5 text-right text-[13.5px] tabular-nums whitespace-nowrap ${uPrice > 0 ? (pMeta.isRecipeSynced ? 'text-emerald-800 font-extrabold' : 'text-slate-700 font-semibold') : 'text-slate-300'}">
                        ${uPrice > 0 ? syncDot + uPrice.toLocaleString() + '원' : '-'}
                      </td>
                      <td class="py-2 px-1.5 text-right text-[13.5px] font-extrabold tabular-nums whitespace-nowrap ${rowAmt > 0 ? 'text-indigo-700' : 'text-slate-300'}">
                        ${rowAmt > 0 ? rowAmt.toLocaleString() + '원' : '-'}
                      </td>
                    </tr>
                  `;}).join('')}
                </tbody>
                <tfoot>
                  <tr class="border-t-2 border-slate-200 bg-slate-50/50 font-extrabold text-slate-800">
                    <td colspan="5" class="py-2 pl-2 text-xs">일일 합계 (${displayItems.length}종)</td>
                    <td class="py-2 px-1.5 text-right text-[13.5px] text-blue-600 tabular-nums whitespace-nowrap">${rec.totalBoxes.toLocaleString()} box</td>
                    <td class="py-2 px-1.5 text-right text-[13.5px] text-emerald-600 tabular-nums whitespace-nowrap">${rec.totalPks.toLocaleString()} pk</td>
                    <td class="py-2 px-1.5 text-right text-slate-500 text-xs whitespace-nowrap">매입 합계</td>
                    <td class="py-2 px-1.5 text-right text-sm text-indigo-700 tabular-nums whitespace-nowrap">${dailyPurchaseTotal > 0 ? dailyPurchaseTotal.toLocaleString() + '원' : '-'}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>`;
      }).join('');

      lucide.createIcons();
    }

    // 뷰 2: 품목별 누적 통계 & TOP 순위 렌더링 (pk 기준 정렬 및 누적 매입금액 표시)
    function renderAnalytics() {
      const container = document.getElementById('msi_analyticsViewContainer');
      const filtered = getFilteredRecords();

      if (filtered.length === 0) {
        container.innerHTML = `<div class="bg-white rounded-2xl border border-slate-200 p-10 text-center text-slate-400 text-xs">데이터가 없습니다.</div>`;
        return;
      }

      const itemStats = new Map();
      let grandTotalBox = 0;
      let grandTotalPk = 0;
      let grandTotalAmt = 0;

      filtered.forEach(rec => {
        rec.items.forEach(it => {
          const key = (it.code ? it.code + '_' : '') + it.name;
          if (!itemStats.has(key)) {
            itemStats.set(key, {
              code: it.code || '-',
              name: it.name,
              ipsu: it.ipsu || 1,
              days: new Set(),
              totalBox: 0,
              totalPk: 0
            });
          }
          const st = itemStats.get(key);
          st.days.add(rec.date);
          st.totalBox += it.box;
          st.totalPk += it.pk;
          grandTotalBox += it.box;
          grandTotalPk += it.pk;
        });
      });

      const sortedItems = Array.from(itemStats.values()).map(st => {
        const pMeta = getItemPriceMeta(st);
        const uPrice = pMeta.price;
        const totalAmt = st.totalPk * uPrice;
        grandTotalAmt += totalAmt;
        return { ...st, uPrice, totalAmt, pMeta };
      }).sort((a, b) => b.totalPk - a.totalPk);

      const maxPk = sortedItems[0]?.totalPk || 1;

      container.innerHTML = `
        <div class="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-100">
            <div>
              <h3 class="text-sm font-bold text-slate-900">📊 품목별 누적 입고량 및 매입 금액 순위 (총 ${sortedItems.length}종 · pk 기준)</h3>
              <p class="text-xs text-slate-400 mt-0.5">매입단가 수정은 [💰 매입가 DB 관리] 탭에서 일괄 관리할 수 있습니다.</p>
            </div>
            <div class="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-700 bg-slate-100 px-3 py-1.5 rounded-lg">
              <span>누적팩: <b class="text-emerald-600">${grandTotalPk.toLocaleString()} pk</b></span>
              <span>|</span>
              <span>누적박스: <b class="text-blue-600">${grandTotalBox.toLocaleString()} box</b></span>
              <span>|</span>
              <span>총 매입금액: <b class="text-indigo-700">${grandTotalAmt.toLocaleString()}원</b></span>
            </div>
          </div>

          <div class="overflow-x-auto mt-3">
            <table class="w-full min-w-[1060px] table-fixed text-left border-collapse text-xs">
              <colgroup>
                <col class="w-[48px]">
                <col class="w-[84px]">
                <col class="w-[96px]">
                <col>
                <col class="w-[64px]">
                <col class="w-[96px]">
                <col class="w-[92px]">
                <col class="w-[116px]">
                <col class="w-[130px]">
                <col class="w-[144px]">
              </colgroup>
              <thead>
                <tr class="border-b border-slate-200 text-slate-500 font-bold whitespace-nowrap">
                  <th class="py-2 px-1 text-center">순위</th>
                  <th class="py-2 px-1 text-center">상품코드</th>
                  <th class="py-2 px-1 text-center">레시피 품목코드</th>
                  <th class="py-2 px-2">상품명</th>
                  <th class="py-2 px-1 text-center">입고횟수</th>
                  <th class="py-2 px-1.5 text-right">누적 팩 (pk)</th>
                  <th class="py-2 px-1.5 text-right">누적 박스</th>
                  <th class="py-2 px-1.5 text-right">매입단가 (pk)</th>
                  <th class="py-2 px-1.5 text-right">누적 매입금액</th>
                  <th class="py-2 pl-4 pr-1">물량 비중 (pk %)</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                ${sortedItems.map((st, idx) => {
                  const share = grandTotalPk ? ((st.totalPk / grandTotalPk) * 100).toFixed(1) : '0.0';
                  const barWidth = Math.max(4, Math.round((st.totalPk / maxPk) * 100));
                  const pMeta = st.pMeta;
                  const syncDot = pMeta.isRecipeSynced
                    ? `<span class="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 align-middle" title="레시피 [${escapeHtml(pMeta.recipeCode)}] 판매금액 자동연동"></span>`
                    : '';
                  const rcBadge = pMeta.recipeCode
                    ? `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-xs font-extrabold tabular-nums ${pMeta.isRecipeSynced ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}">${pMeta.isRecipeSynced ? '<span class=\"w-1.5 h-1.5 rounded-full bg-emerald-500\"></span>' : ''}${escapeHtml(pMeta.recipeCode)}</span>`
                    : `<span class="text-slate-300 text-xs">-</span>`;
                  return `
                  <tr class="hover:bg-slate-50/80">
                    <td class="py-2.5 px-1 text-center font-bold tabular-nums whitespace-nowrap ${idx < 3 ? 'text-emerald-600' : 'text-slate-400'}">${idx + 1}위</td>
                    <td class="py-2.5 px-1 text-center font-mono text-[13px] font-semibold text-slate-600 tabular-nums whitespace-nowrap">${escapeHtml(st.code)}</td>
                    <td class="py-2.5 px-1 text-center whitespace-nowrap">${rcBadge}</td>
                    <td class="py-2.5 px-2 font-semibold text-slate-800 text-[13px] whitespace-nowrap truncate" title="${escapeHtml(st.name)}">${escapeHtml(st.name)}</td>
                    <td class="py-2.5 px-1 text-center text-[13px] font-semibold text-slate-600 tabular-nums whitespace-nowrap">${st.days.size}회</td>
                    <td class="py-2.5 px-1.5 text-right text-[13.5px] font-bold text-emerald-600 tabular-nums whitespace-nowrap">${st.totalPk.toLocaleString()} <span class="text-[11px] font-medium">pk</span></td>
                    <td class="py-2.5 px-1.5 text-right text-[13.5px] font-bold text-blue-600 tabular-nums whitespace-nowrap">${st.totalBox.toLocaleString()} <span class="text-[11px] font-medium">box</span></td>
                    <td class="py-2.5 px-1.5 text-right text-[13.5px] tabular-nums whitespace-nowrap ${st.uPrice > 0 ? (pMeta.isRecipeSynced ? 'text-emerald-800 font-extrabold' : 'text-slate-700 font-semibold') : 'text-slate-300'}">
                      ${st.uPrice > 0 ? syncDot + st.uPrice.toLocaleString() + '원' : '-'}
                    </td>
                    <td class="py-2.5 px-1.5 text-right text-[13.5px] font-extrabold tabular-nums whitespace-nowrap ${st.totalAmt > 0 ? 'text-indigo-700' : 'text-slate-300'}">
                      ${st.totalAmt > 0 ? st.totalAmt.toLocaleString() + '원' : '-'}
                    </td>
                    <td class="py-2.5 pl-4 pr-1 whitespace-nowrap">
                      <div class="flex items-center gap-2">
                        <div class="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div class="bg-emerald-600 h-full rounded-full" style="width:${barWidth}%"></div>
                        </div>
                        <span class="text-xs font-bold text-slate-700 w-11 text-right tabular-nums">${share}%</span>
                      </div>
                    </td>
                  </tr>`;
                }).join('')}
              </tbody>
              <tfoot>
                <tr class="border-t-2 border-slate-200 bg-slate-50/70 font-extrabold text-slate-800">
                  <td colspan="5" class="py-2.5 pl-2 text-xs">전체 합계 (${sortedItems.length}종)</td>
                  <td class="py-2.5 text-right text-[13.5px] text-emerald-600 tabular-nums">${grandTotalPk.toLocaleString()} pk</td>
                  <td class="py-2.5 text-right text-[13.5px] text-blue-600 tabular-nums">${grandTotalBox.toLocaleString()} box</td>
                  <td class="py-2.5 text-right text-slate-500 text-xs">누적 매입총액</td>
                  <td class="py-2.5 text-right text-sm text-indigo-700 tabular-nums">${grandTotalAmt.toLocaleString()}원</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      `;
    }

    // 뷰 4: 매입가 DB 마스터 관리 화면 렌더링 (레시피 내부 아이디 연동 + pk 단가 관리)
    function renderPricesView() {
      const wrapper = document.getElementById('msi_pricesTableWrapper');
      if (!wrapper) return;
      const q = (document.getElementById('msi_searchInput')?.value || '').toLowerCase();

      // 레시피 자동완성 datalist 최신화
      const dlEl = document.getElementById('msi_recipeIdDatalist');
      if (dlEl) {
        const liveRcs = getLiveRecipesListForMs()
          .filter(r => r && r.recipeType !== 'SUB' && String(r.productCode || '').trim())
          .sort((a, b) => String(a.productCode || '').localeCompare(String(b.productCode || ''), 'ko', { numeric: true }));
        dlEl.innerHTML = liveRcs.map(rc => {
          const info = getRecipeSellingPriceByCode(rc.productCode);
          const priceTxt = info && info.sellPrice > 0 ? ` · 판매금액 ${info.sellPrice.toLocaleString()}원` : '';
          return `<option value="${escapeHtml(String(rc.productCode).trim())}">${escapeHtml(rc.productName || '')}${priceTxt}</option>`;
        }).join('');
      }

      const catalogMap = new Map();
      records.forEach(r => {
        r.items.forEach(it => {
          const key = (it.code ? it.code + '_' : '') + it.name;
          if (!catalogMap.has(key)) {
            catalogMap.set(key, {
              code: it.code || '-',
              name: it.name,
              ipsu: it.ipsu || 1,
              totalPk: 0,
              totalBox: 0
            });
          }
          const entry = catalogMap.get(key);
          entry.totalPk += it.pk;
          entry.totalBox += it.box;
        });
      });

      const list = Array.from(catalogMap.values())
        .filter(it => {
          const rCode = getItemRecipeCode(it);
          return !q || it.name.toLowerCase().includes(q) || it.code.includes(q) || rCode.toLowerCase().includes(q);
        })
        .sort((a, b) => b.totalPk - a.totalPk);

      if (list.length === 0) {
        wrapper.innerHTML = `<div class="py-10 text-center text-slate-400 text-xs">표시할 품목이 없습니다.</div>`;
        return;
      }

      wrapper.innerHTML = `
        <table class="w-full text-left border-collapse text-xs">
          <thead>
            <tr class="border-b border-slate-200 text-slate-500 font-bold">
              <th class="py-2.5 w-12 text-center">No.</th>
              <th class="py-2.5 w-28 text-center">상품코드</th>
              <th class="py-2.5 w-36 text-center" title="바로가 레시피 탭의 품목코드를 입력하면 레시피 판매금액(1PK)이 pk당 매입단가에 자동 반영됩니다">레시피 품목코드</th>
              <th class="py-2.5">엠즈 상품명 · 연결된 레시피</th>
              <th class="py-2.5 text-center w-24">박스입수</th>
              <th class="py-2.5 text-right w-52">pk당 매입단가 (원)</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            ${list.map((it, idx) => {
              const pMeta = getItemPriceMeta(it);
              const uPrice = pMeta.price;
              const rCode = pMeta.recipeCode;
              const rInfo = pMeta.recipeInfo;
              const isSynced = pMeta.isRecipeSynced;

              let linkSubBadge = '';
              if (rCode && rInfo) {
                linkSubBadge = isSynced
                  ? `<div class="mt-0.5 inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>레시피 연동: ${escapeHtml(rInfo.productName)} (출고가 ${rInfo.releasePriceEa.toLocaleString()}원 × ${rInfo.packQty}입 = ${rInfo.sellPrice.toLocaleString()}원)</div>`
                  : `<div class="mt-0.5 text-[11px] text-amber-700 font-medium">⚠️ 레시피 [${escapeHtml(rInfo.productName)}] 연결됨 — 판매금액이 0원이라 수기 단가 사용 중</div>`;
              } else if (rCode && !rInfo) {
                linkSubBadge = `<div class="mt-0.5 text-[11px] text-rose-600 font-medium">⚠️ 코드 [${escapeHtml(rCode)}]와 일치하는 레시피가 없습니다</div>`;
              }

              const priceCellHtml = isSynced
                ? `<div class="inline-flex items-center justify-end gap-1.5 px-3 py-1.5 w-40 rounded-lg border border-emerald-300 bg-emerald-50/70 text-[14px] font-extrabold text-emerald-900 tabular-nums cursor-help" title="레시피 [${escapeHtml(rCode)}] 판매금액 실시간 연동 중 (직접 입력하려면 레시피 품목코드를 비워주세요)">
                     <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                     <span>${uPrice.toLocaleString()}</span>
                   </div>
                   <span class="text-xs text-emerald-700 font-bold ml-1">원</span>`
                : `<div class="inline-flex items-center gap-1">
                     <input type="number" step="100" value="${uPrice > 0 ? uPrice : ''}" placeholder="단가 입력"
                       onchange="window.MSInbound.setItemUnitPrice('${escapeQuotes(it.code)}', '${escapeQuotes(it.name)}', this.value); window.MSInbound.showToast('단가가 자동 저장되었습니다.');"
                       class="w-40 text-right text-[14px] px-3 py-1.5 rounded-lg border ${uPrice > 0 ? 'border-indigo-300 bg-indigo-50/40 font-extrabold text-indigo-700' : 'border-slate-200 bg-white font-semibold text-slate-700'} focus:outline-none focus:border-indigo-600 tabular-nums">
                     <span class="text-xs text-slate-500 font-semibold">원</span>
                   </div>`;

              return `
              <tr class="hover:bg-slate-50/80">
                <td class="py-2.5 text-center text-slate-400 font-semibold tabular-nums">${idx + 1}</td>
                <td class="py-2.5 text-center font-mono text-[13.5px] font-bold text-slate-700 tabular-nums">${escapeHtml(it.code)}</td>
                <td class="py-2.5 px-1.5 text-center">
                  <div class="relative inline-flex items-center w-32">
                    ${isSynced ? `<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"></span>` : ''}
                    <input type="text" list="msi_recipeIdDatalist" value="${escapeHtml(rCode)}" placeholder="예: 1001"
                      onchange="window.MSInbound.setItemRecipeCode('${escapeQuotes(it.code)}', '${escapeQuotes(it.name)}', this.value)"
                      class="w-full text-center font-mono text-[13.5px] py-1.5 rounded-lg border ${isSynced ? 'pl-4 pr-2 border-emerald-400 bg-emerald-50/60 font-extrabold text-emerald-800' : (rCode ? 'px-2 border-amber-300 bg-amber-50/50 font-extrabold text-amber-900' : 'px-2 border-slate-200 bg-slate-50/60 font-semibold text-slate-700')} focus:bg-white focus:outline-none focus:border-emerald-600 tabular-nums">
                  </div>
                </td>
                <td class="py-2.5">
                  <div class="font-semibold text-slate-800 text-[13px]">${escapeHtml(it.name)}</div>
                  ${linkSubBadge}
                </td>
                <td class="py-2.5 text-center text-[13.5px] font-semibold text-slate-600 tabular-nums">${it.ipsu} <span class="text-[11px] text-slate-400">pk/box</span></td>
                <td class="py-2.5 text-right whitespace-nowrap">
                  ${priceCellHtml}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      `;
    }

    // 단가표 엑셀 일괄 업로드 파서 (상품코드/상품명 + 단가 열 자동 매핑)
    function handlePriceExcel(files) {
      if (!files || !files.length) return;
      const file = files[0];
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array', codepage: 949 });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
          let colCode = -1, colRecipeId = -1, colName = -1, colPrice = -1, startRow = 1;

          for (let r = 0; r < Math.min(10, rows.length); r++) {
            rows[r].forEach((cell, idx) => {
              const s = String(cell).trim();
              if (/레시피/.test(s)) colRecipeId = idx;
              else if (/상품코드|품목코드|코드/.test(s)) colCode = idx;
              if (/상품명|품목명|품명/.test(s)) colName = idx;
              if (/매입가|단가|매입단가|가격|금액|price/i.test(s)) colPrice = idx;
            });
            if (colPrice !== -1 || colRecipeId !== -1) { startRow = r + 1; break; }
          }

          if (colPrice === -1 && colRecipeId === -1) {
            showToast('엑셀에서 [매입단가] 또는 [레시피ID] 열을 찾지 못했습니다.');
            return;
          }

          let updated = 0;
          for (let i = startRow; i < rows.length; i++) {
            const row = rows[i];
            if (!row) continue;
            const code = colCode !== -1 ? String(row[colCode] || '').trim() : '';
            const name = colName !== -1 ? String(row[colName] || '').trim() : '';
            const rcId = colRecipeId !== -1 ? String(row[colRecipeId] || '').trim() : '';
            const price = colPrice !== -1 ? (parseInt(String(row[colPrice] || '').replace(/[^0-9]/g, ''), 10) || 0) : 0;
            if (code || name) {
              if (rcId) {
                if (code) recipeLinks[code] = rcId;
                if (name) recipeLinks[name] = rcId;
                updated++;
              }
              if (price > 0) {
                if (code) unitPrices[code] = price;
                if (name) unitPrices[name] = price;
                if (!rcId) updated++;
              }
            }
          }
          saveToStorage();
          renderAll();
          showToast(`단가표 엑셀에서 총 ${updated}개 품목의 매입단가가 일괄 등록되었습니다!`);
        } catch (err) {
          showToast('단가표 엑셀을 읽는 중 오류가 발생했습니다.');
        }
      };
      reader.readAsArrayBuffer(file);
      document.getElementById('msi_priceExcelInput').value = '';
    }

    // 월말 정산용 4-시트 엑셀(.xlsx) 자동 생성 및 다운로드 (매입단가 및 매입금액 포함)
    function downloadSettlementExcel() {
      const filtered = getFilteredRecords();
      const filteredReturns = getFilteredReturns();
      if (filtered.length === 0 && filteredReturns.length === 0) {
        showToast('다운로드할 내역이 없습니다.');
        return;
      }

      const wb = XLSX.utils.book_new();

      const dailyRows = filtered.map((r, i) => {
        const disp = getDisplayItems(r.items);
        const dayPurchaseAmt = disp.reduce((s, it) => s + (it.pk * getItemUnitPrice(it)), 0);
        return {
          'No': i + 1,
          '입고일자': r.date,
          '발주일자': r.orderDate || '-',
          '구분': r.type,
          '입고상태': r.status,
          '업무명': r.title,
          '품목종수': disp.length,
          '총 박스(box)': r.totalBoxes,
          '총 환산팩(pk)': r.totalPks,
          '일일 매입금액(원)': dayPurchaseAmt,
          '화물기사': r.driver,
          '운임비용(원)': r.cost,
          '비고(메모)': r.memo || ''
        };
      });
      const wsDaily = XLSX.utils.json_to_sheet(dailyRows);
      XLSX.utils.book_append_sheet(wb, wsDaily, '1_일자별_입고정산');

      const itemMap = new Map();
      filtered.forEach(r => {
        r.items.forEach(it => {
          const k = (it.code ? it.code + '_' : '') + it.name;
          if (!itemMap.has(k)) itemMap.set(k, { code: it.code, name: it.name, ipsu: it.ipsu, days: new Set(), box: 0, pk: 0 });
          const st = itemMap.get(k);
          st.days.add(r.date);
          st.box += it.box;
          st.pk += it.pk;
        });
      });
      const itemRows = Array.from(itemMap.values()).sort((a, b) => b.pk - a.pk).map((st, idx) => {
        const pMeta = getItemPriceMeta(st);
        const uPrice = pMeta.price;
        return {
          '순위(pk기준)': idx + 1,
          '상품코드': st.code,
          '레시피품목코드': pMeta.recipeCode || '',
          '상품명': st.name,
          '입수': st.ipsu,
          '입고횟수': st.days.size,
          '누적 환산(pk)': st.pk,
          '누적 발주(box)': st.box,
          'pk당 매입단가(원)': uPrice,
          '누적 매입금액(원)': st.pk * uPrice
        };
      });
      const wsItems = XLSX.utils.json_to_sheet(itemRows);
      XLSX.utils.book_append_sheet(wb, wsItems, '2_품목별_누적통계');

      const detailRows = [];
      filtered.forEach(r => {
        getDisplayItems(r.items).forEach((it, idx) => {
          const pMeta = getItemPriceMeta(it);
          const uPrice = pMeta.price;
          detailRows.push({
            '입고일자': r.date,
            '순번': idx + 1,
            '상품코드': it.code,
            '레시피품목코드': pMeta.recipeCode || '',
            '상품명': it.name,
            '입수': it.ipsu,
            '발주(box)': it.box,
            '환산(pk)': it.pk,
            'pk당 매입단가(원)': uPrice,
            '입고 매입금액(원)': it.pk * uPrice
          });
        });
      });
      const wsDetail = XLSX.utils.json_to_sheet(detailRows);
      XLSX.utils.book_append_sheet(wb, wsDetail, '3_상세입고내역');

      const returnRows = filteredReturns.map((ret, idx) => ({
        'No': idx + 1,
        '회송일자': ret.date,
        '회송사유': ret.reason,
        '상세내용/대상품목': ret.note || '',
        '담당기사': ret.driver,
        '회송운임료(원)': ret.cost || 0
      }));
      const wsReturns = XLSX.utils.json_to_sheet(returnRows.length ? returnRows : [{'안내': '등록된 회송 내역이 없습니다.'}]);
      XLSX.utils.book_append_sheet(wb, wsReturns, '4_회송내역_운임정산');

      const fileLabel = currentFilter === 'ALL' ? '전체' : currentFilter;
      XLSX.writeFile(wb, `엠즈_입고및회송_정산보고서_${fileLabel}.xlsx`);
      showToast('입고 및 회송 정산용 엑셀 파일(4개 시트)이 다운로드되었습니다!');
    }

    // 아이프레임 및 캔버스 호환 클립보드 복사
    function copyText(text, msg) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        showToast(msg);
      } catch (err) {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(text).then(() => showToast(msg));
        }
      }
      document.body.removeChild(textarea);
    }

    function escapeBackticks(str) {
      return String(str).replace(/\\/g, '\\\\').replace(/`/g, '\\`').replace(/\$/g, '\\$');
    }

    function escapeQuotes(str) {
      return String(str).replace(/'/g, "\\'");
    }

    function escapeHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function requestDeleteRecord(id, dateStr) {
      openConfirmModal(`${dateStr} 입고 내역을 삭제하시겠습니까?`, () => {
        records = records.filter(r => r.id !== id);
        saveToStorage();
        renderAll();
        showToast('해당 일자 내역이 삭제되었습니다.');
      });
    }

    function saveToStorage() {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
      localStorage.setItem(RETURNS_STORAGE_KEY, JSON.stringify(returnRecords));
      localStorage.setItem(PRICES_STORAGE_KEY, JSON.stringify(unitPrices));
      localStorage.setItem(RECIPE_LINKS_STORAGE_KEY, JSON.stringify(recipeLinks));
      // 연속 수정은 0.6초 모아서 한 번에 저장
      if (msPushTimer) clearTimeout(msPushTimer);
      msPushTimer = setTimeout(() => { msPushTimer = null; pushToCloud(true); }, 600);
    }

    function safeParseLocal(key, fallback) {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        const v = JSON.parse(raw);
        return v === null || v === undefined ? fallback : v;
      } catch (e) {
        return fallback;
      }
    }

    function loadFromStorage() {
      // 이 기기에 남아 있는 사본을 먼저 보여주고(저장은 막힘), 곧바로 DB에서 최신 데이터를 불러옴
      records = safeParseLocal(STORAGE_KEY, []);
      if (!Array.isArray(records)) records = [];
      returnRecords = safeParseLocal(RETURNS_STORAGE_KEY, []);
      if (!Array.isArray(returnRecords)) returnRecords = [];
      unitPrices = safeParseLocal(PRICES_STORAGE_KEY, {});
      recipeLinks = safeParseLocal(RECIPE_LINKS_STORAGE_KEY, {});
      renderAll();
      if (getActiveCloudUrl()) pullFromCloud(true);
    }

    function openCloudModal() {
      document.getElementById('msi_cloudUrlInput').value = getActiveCloudUrl();
      const modal = document.getElementById('msi_cloudModal');
      modal.classList.remove('hidden');
      modal.classList.add('flex');
    }

    function closeCloudModal() {
      const modal = document.getElementById('msi_cloudModal');
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    function openGuideModal() {
      const modal = document.getElementById('msi_guideModal');
      if (!modal) return;
      modal.classList.remove('hidden');
      modal.classList.add('flex');
      if (window.lucide) lucide.createIcons();
    }

    function closeGuideModal() {
      const modal = document.getElementById('msi_guideModal');
      if (!modal) return;
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }

    function copyAccountInfo(val, msg) {
      copyText(val, msg);
    }

    function checkCloudBadge(state = 'auto', customText = '') {
      const url = getActiveCloudUrl();
      const badge = document.getElementById('msi_dbStatusBadge');
      const dot = document.getElementById('msi_dbStatusDot');
      const label = document.getElementById('msi_dbStatusText');
      const spin = document.getElementById('msi_syncSpinWrap');
      if (spin) {
        if (state === 'syncing') spin.classList.add('animate-spin');
        else spin.classList.remove('animate-spin');
      }
      if (!badge || !dot || !label) return;
      const effState = state === 'auto' ? (url ? 'connected' : 'error') : state;
      if (effState === 'syncing' || effState === 'saving') {
        dot.className = 'w-2 h-2 rounded-full bg-amber-500 animate-pulse';
        badge.className = 'flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-xl text-xs font-bold border bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 transition cursor-pointer';
        label.textContent = customText || (effState === 'saving' ? '저장중...' : '동기화중...');
      } else if (effState === 'error' || !url) {
        dot.className = 'w-2 h-2 rounded-full bg-rose-500';
        badge.className = 'flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-xl text-xs font-bold border bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100 transition cursor-pointer';
        label.textContent = customText || (url ? 'DB 연결 확인' : '로컬 모드');
      } else {
        dot.className = 'w-2 h-2 rounded-full bg-emerald-500';
        badge.className = 'flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-xl text-xs font-bold border bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 transition cursor-pointer';
        label.textContent = customText || `DB 연동됨 (${records.length}건)`;
      }
    }

    function saveCloudConfig() {
      const url = document.getElementById('msi_cloudUrlInput').value.trim();
      closeCloudModal();
      msDbLoaded = false;
      msDbRevision = null;
      msDbBlockReason = '새 DB 주소를 아직 불러오지 못했습니다';
      if (url) {
        localStorage.setItem(CLOUD_URL_KEY, url);
      } else {
        localStorage.removeItem(CLOUD_URL_KEY);
      }
      pullFromCloud(false);
    }

    // [2단계 보안] 모든 DB 요청은 접속 코드를 붙여 POST로 보냄 (index.html의 barogaApi)
    function msApi(url, body, timeoutMs) {
      if (typeof window.barogaApi === 'function') return window.barogaApi(url, body, timeoutMs);
      return Promise.reject(new Error('접속 코드 모듈을 찾을 수 없습니다'));
    }

    function buildCloudPayload() {
      return {
        records: records,
        returns: returnRecords,
        unitPrices: unitPrices,
        recipeLinks: recipeLinks,
        updatedAt: new Date().toISOString()
      };
    }

    async function pushToCloud(silent = true) {
      if (msPushTimer) { clearTimeout(msPushTimer); msPushTimer = null; }
      const url = getActiveCloudUrl();
      if (!url) {
        showToast('엠즈 DB 주소가 없습니다. 저장하지 않았습니다.');
        return false;
      }
      // [1단계] 불러오기 실패·구버전 GAS·충돌 상태에서는 저장하지 않음
      if (!msDbLoaded || msDbRevision === null) {
        checkCloudBadge('error', '저장 중지');
        showToast(`저장하지 않았습니다: ${msDbBlockReason}. 변경 내용은 이 기기에만 있습니다.`);
        return false;
      }
      if (msIsPushing) { msPushPending = true; return; }
      msIsPushing = true;
      let ok = false;
      try {
        checkCloudBadge('saving', '저장중...');
        const json = await msApi(url, { action: 'replaceAll', baseRevision: msDbRevision, payload: buildCloudPayload() }, 30000);
        if (json && json.ok === true && typeof json.revision === 'number') {
          msDbRevision = json.revision;
          ok = true;
          checkCloudBadge();
          if (!silent) showToast('엠즈 DB에 입고·회송·단가 데이터가 저장되었습니다.');
        } else if (json && json.conflict) {
          msDbLoaded = false;
          msDbBlockReason = '다른 기기에서 먼저 저장했습니다. ↻ 새로고침 후 다시 입력하세요';
          msPushPending = false;
          checkCloudBadge('error', '충돌 · 새로고침 필요');
          showToast('다른 기기에서 먼저 저장한 내용이 있어 저장하지 않았습니다. ↻ 새로고침 후 방금 변경한 내용을 다시 입력해 주세요.');
        } else {
          throw new Error((json && (json.error || json.message)) || '알 수 없는 응답');
        }
      } catch (e) {
        const isTimeout = e && e.name === 'AbortError';
        if (isTimeout) {
          msDbLoaded = false;
          msDbBlockReason = '저장 응답이 없어 저장 여부를 알 수 없습니다. ↻ 새로고침으로 확인하세요';
        }
        checkCloudBadge('error', isTimeout ? '저장 확인 필요' : 'DB 저장 실패');
        showToast(isTimeout
          ? '엠즈 DB 저장 응답이 없습니다(시간 초과). ↻ 새로고침으로 실제 저장 여부를 확인해 주세요.'
          : `엠즈 DB 저장 실패: ${e && e.message ? e.message : e} — 변경 내용은 이 기기에만 있습니다.`);
      } finally {
        msIsPushing = false;
        if (msPushPending) { msPushPending = false; if (ok) pushToCloud(true); }
      }
      return ok;
    }

    async function pullFromCloud(silent = false) {
      const url = getActiveCloudUrl();
      if (!url) {
        if (!silent) showToast('엠즈 DB 주소를 먼저 입력해 주세요.');
        checkCloudBadge('error', 'DB 주소 없음');
        return;
      }
      if (msPushTimer || msIsPushing || msPushPending) {
        if (!silent) showToast('저장이 진행 중입니다. 저장이 끝난 뒤 다시 새로고침해 주세요.');
        return;
      }
      checkCloudBadge('syncing', '동기화중...');
      try {
        const json = await msApi(url, { action: 'getAll' }, 20000);
        let data;
        let revision = null;
        if (json && typeof json === 'object' && !Array.isArray(json) && 'ok' in json) {
          // v2.0 GAS 응답: { ok, revision, data }
          if (json.ok !== true) throw new Error(json.error || '서버 오류');
          data = json.data;
          revision = typeof json.revision === 'number' ? json.revision : null;
        } else {
          // 구버전 GAS 응답 (A1 셀 원본) — 읽기만 하고 저장은 막음
          data = json;
        }

        if (data === null || data === undefined) {
          records = [];
          returnRecords = [];
          unitPrices = {};
          recipeLinks = {};
        } else if (Array.isArray(data)) {
          records = data;
        } else if (typeof data === 'object') {
          records = Array.isArray(data.records) ? data.records : [];
          returnRecords = Array.isArray(data.returns) ? data.returns : [];
          unitPrices = (data.unitPrices && typeof data.unitPrices === 'object') ? data.unitPrices : {};
          recipeLinks = (data.recipeLinks && typeof data.recipeLinks === 'object') ? data.recipeLinks : {};
        } else {
          throw new Error('응답 형식을 인식할 수 없습니다');
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        localStorage.setItem(RETURNS_STORAGE_KEY, JSON.stringify(returnRecords));
        localStorage.setItem(PRICES_STORAGE_KEY, JSON.stringify(unitPrices));
        localStorage.setItem(RECIPE_LINKS_STORAGE_KEY, JSON.stringify(recipeLinks));

        msDbLoaded = true;
        msDbRevision = revision;
        msDbBlockReason = revision === null ? '엠즈 GAS 스크립트가 구버전입니다 (v2.0 업데이트 필요)' : '';
        renderAll();
        if (revision === null) checkCloudBadge('error', '저장 중지 (GAS 업데이트 필요)');
        else checkCloudBadge();
        if (!silent) showToast(`엠즈 DB 동기화 완료 (입고 ${records.length}건 / 회송 ${returnRecords.length}건)`);
      } catch (e) {
        if (e && e.unauthorized) {
          msDbBlockReason = '접속 코드가 필요합니다';
          checkCloudBadge('error', '접속 코드 필요');
        } else if (!msDbLoaded) {
          msDbBlockReason = 'DB를 불러오지 못했습니다';
          checkCloudBadge('error', 'DB 불러오기 실패 · 저장 중지');
          showToast(`엠즈 DB를 불러오지 못했습니다 (${e && e.message ? e.message : e}). 화면은 이 기기에 남은 사본이며 저장은 중지됩니다.`);
        } else {
          checkCloudBadge('error', '새로고침 실패');
          if (!silent) showToast(`새로고침 실패: ${e && e.message ? e.message : e}`);
        }
      }
    }

    function exportData() {
      const payload = {
        records: records,
        returns: returnRecords,
        unitPrices: unitPrices,
        recipeLinks: recipeLinks,
        exportedAt: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `엠즈_입고및회송_백업_${new Date().toISOString().slice(0,10)}.json`;
      a.click();
    }

    function importData(event) {
      const file = event.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const imported = JSON.parse(e.target.result);
          if (Array.isArray(imported)) {
            records = imported;
            saveToStorage();
            renderAll();
            showToast('데이터를 성공적으로 불러왔습니다.');
          } else if (imported && typeof imported === 'object') {
            if (Array.isArray(imported.records)) records = imported.records;
            if (Array.isArray(imported.returns)) returnRecords = imported.returns;
            if (imported.unitPrices && typeof imported.unitPrices === 'object') unitPrices = { ...unitPrices, ...imported.unitPrices };
            if (imported.recipeLinks && typeof imported.recipeLinks === 'object') recipeLinks = { ...recipeLinks, ...imported.recipeLinks };
            saveToStorage();
            renderAll();
            showToast('입고 및 회송 데이터를 성공적으로 불러왔습니다.');
          }
        } catch (err) {
          showToast('올바른 JSON 파일이 아닙니다.');
        }
      };
      reader.readAsText(file);
    }

    function showToast(msg) {
      const toast = document.getElementById('msi_toast');
      document.getElementById('msi_toastMsg').textContent = msg;
      toast.classList.remove('opacity-0');
      setTimeout(() => toast.classList.add('opacity-0'), 2600);
    }
})();
