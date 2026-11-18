// ============================================================================
// 바로가 공장 통합 관리 시스템 - 레시피 전용 모듈 (FoodDiscovery 완벽 이식 · 확장판)
// 파일명: recipe.js (index.html 수정 없이 단독 교체 가능)
// ============================================================================

let selectedRecipeIdsForBulk = new Set();
let collapsedSubRecipeNodes = new Set();
let recipeCategoryFilter = 'ALL'; // ALL | PRODUCT | SUB
let recipeRatioMode = 'WEIGHT'; // WEIGHT(푸드디스커버리 기본 중량비%) | BAKERS(밀가루100% 베이커스%)

// 단위/규격 문자열에서 기준 수량(g, ml, 매, ea) 추출
function parseSpecToGrams(specStr) {
    const s = String(specStr || '').toLowerCase().replace(/,/g, '').trim();
    if (!s) return 1000;
    // 예: 2kg*5, 500g*20 등 곱셈 규격 처리
    const mult = s.match(/(\d+(?:\.\d+)?)\s*(kg|g|l|ml)\s*[*x×]\s*(\d+(?:\.\d+)?)/);
    if (mult) {
        const base = parseFloat(mult[1]) || 1;
        const unit = mult[2];
        const cnt = parseFloat(mult[3]) || 1;
        return ((unit === 'kg' || unit === 'l') ? base * 1000 : base) * cnt;
    }
    const m = s.match(/(\d+(?:\.\d+)?)\s*(kg|g|l|ml)/);
    if (m) {
        const val = parseFloat(m[1]) || 1;
        return (m[2] === 'kg' || m[2] === 'l') ? val * 1000 : val;
    }
    return 1000;
}

function parsePackagingSpecQty(specStr) {
    const s = String(specStr || '').toLowerCase().replace(/,/g, '').trim();
    if (!s) return 1;
    // 예: 500매/롤, 1000매, 200ea 등
    const m = s.match(/(\d+(?:\.\d+)?)\s*(매|장|ea|개|입)/);
    if (m) return parseFloat(m[1]) || 1;
    return 1;
}

// 발주 데이터(ordersData)에서 최신 원재료/부자재 카탈로그 추출
function getRawMaterialCatalogForRecipe() {
    const map = {};
    (ordersData || []).forEach(o => {
        const u = parseFloat(o.amount) || 0;
        if (u <= 0 || !o.colB) return;
        const k = `${o.colB}||${o.colC || ''}`;
        const isPack = /비닐|박스|유포지|노루지|롤백|트레이|패드|스티커|테이프|봉투|랩|카톤/.test(o.colB);
        map[k] = {
            key: k,
            item: o.colB,
            spec: o.colC || '',
            vendor: o.colA || '',
            unitPrice: u,
            specGrams: parseSpecToGrams(o.colC),
            specPackQty: parsePackagingSpecQty(o.colC),
            isPackaging: isPack
        };
    });
    return Object.values(map).sort((a, b) => a.item.localeCompare(b.item, 'ko'));
}

// 레시피 데이터 구조 표준화 (기존 데이터 하위호환 100% 보장)
function ensureRecipeSchema(rc) {
    if (!rc) return null;
    if (!rc.productCode) rc.productCode = '100001';
    if (!rc.productName) rc.productName = '신규 제품 레시피';
    if (!rc.recipeType) {
        rc.recipeType = /(반제품|충전물|필링|앙금|크림|소스|시럽)/.test(rc.productName) ? 'SUB' : 'PRODUCT';
    }
    if (rc.divisionWeight === undefined || rc.divisionWeight === null) rc.divisionWeight = 100;
    if (rc.packQty === undefined || rc.packQty === null) rc.packQty = 1;
    if (rc.sellingPrice === undefined || rc.sellingPrice === null) rc.sellingPrice = 0;
    if (rc.lossRatio === undefined || rc.lossRatio === null) rc.lossRatio = 0;
    if (rc.customProductionQty === undefined) rc.customProductionQty = 0; // 0이면 자동(중량합계/분할중량)
    if (!rc.imageData) rc.imageData = '';

    if (!Array.isArray(rc.activeProcesses) || rc.activeProcesses.length === 0) {
        rc.activeProcesses = ['제1공정'];
    }
    if (!Array.isArray(rc.ingredients)) rc.ingredients = [];
    rc.ingredients.forEach((ig, idx) => {
        if (!ig.rowId) ig.rowId = 'ri_' + Date.now() + '_' + idx;
        if (!ig.rowType) ig.rowType = ig.subRecipeId ? 'SUB_RECIPE' : 'RAW'; // RAW | SUB_RECIPE
        if (!ig.process) ig.process = rc.activeProcesses[0] || '제1공정';
        if (!ig.itemCode) ig.itemCode = '';
        if (!ig.origin) ig.origin = '';
        if (!ig.unit) ig.unit = ig.rowType === 'SUB_RECIPE' ? 'EA' : 'G';
        if (ig.qty === undefined || ig.qty === null) ig.qty = parseFloat(ig.weightG ?? ig.g1 ?? 0) || 0;
        if (ig.seq === undefined || ig.seq === null) ig.seq = 0;
        if (ig.unitPrice === undefined || ig.unitPrice === null) ig.unitPrice = 0;
        if (!ig.specGrams) ig.specGrams = parseSpecToGrams(ig.spec || '1kg');
    });

    if (!Array.isArray(rc.packagingList)) rc.packagingList = [];
    rc.packagingList.forEach((pk, idx) => {
        if (!pk.rowId) pk.rowId = 'pk_' + Date.now() + '_' + idx;
        if (!pk.code) pk.code = '';
        if (!pk.unit) pk.unit = 'EA';
        if (pk.purchasePrice === undefined) pk.purchasePrice = 0;
        if (pk.specQty === undefined || pk.specQty <= 0) pk.specQty = 1;
        if (pk.usedQty === undefined) pk.usedQty = 1;
    });

    if (!rc.bakingProcess || typeof rc.bakingProcess !== 'object') {
        rc.bakingProcess = {};
    }
    const bpDefaults = {
        mixLow: '', mixMid: '', mixHigh: '',
        ferm2Temp: '', ferm2Humid: '', ferm2Time: '',
        ovenTop: '', ovenBottom: '', bakeTime: '',
        doughTemp: '', ferm1Time: '', benchTime: '',
        memo: ''
    };
    Object.keys(bpDefaults).forEach(k => {
        if (rc.bakingProcess[k] === undefined) rc.bakingProcess[k] = bpDefaults[k];
    });
    return rc;
}

// 다단계(Multi-level) 하위 반제품/충전물 재귀 평가 (순환 참조 방지 포함)
function evaluateRecipeBaseTotals(rc, visitedIds = new Set()) {
    ensureRecipeSchema(rc);
    if (visitedIds.has(rc.id)) {
        return { weightTotalG: 0, fillingWeightG: 0, rawCostTotal: 0, baseYieldQty: 1, itemBreakdown: [] };
    }
    const nextVisited = new Set(visitedIds);
    nextVisited.add(rc.id);

    let weightTotalG = 0;
    let fillingWeightG = 0;
    let rawCostTotal = 0;
    const itemBreakdown = [];

    (rc.ingredients || []).forEach(ig => {
        const qty = parseFloat(ig.qty ?? ig.weightG ?? 0) || 0;
        if (ig.rowType === 'SUB_RECIPE' && ig.subRecipeId) {
            const subRc = (recipesData || []).find(r => r.id === ig.subRecipeId);
            if (subRc) {
                const subEval = evaluateRecipeBaseTotals(subRc, nextVisited);
                // 스케일 산정:
                // 1) 단위 'G'이거나 투입수량이 하위 총중량 수준(예: 35,375g 충전물)일 때 중량비례
                // 2) 단위 'EA'일 때 하위 레시피 생산수량(baseYieldQty) 대비 투입 EA 비율로 스케일링
                let scale = 1;
                const unitUpper = String(ig.unit || 'EA').toUpperCase();
                if (unitUpper === 'G' || unitUpper === 'KG') {
                    const targetG = unitUpper === 'KG' ? qty * 1000 : qty;
                    scale = subEval.weightTotalG > 0 ? (targetG / subEval.weightTotalG) : 0;
                } else {
                    // FoodDiscovery 호환: 충전물처럼 단위가 EA인데 수량이 중량(예: 35375)으로 입력된 경우 자동 감지
                    if (subEval.weightTotalG > 0 && Math.abs(qty - subEval.weightTotalG) < 1 && subEval.baseYieldQty !== qty) {
                        scale = 1;
                    } else {
                        const baseYield = subEval.baseYieldQty > 0 ? subEval.baseYieldQty : 1;
                        scale = qty / baseYield;
                    }
                }
                const effWeightG = subEval.weightTotalG * scale;
                const effCost = subEval.rawCostTotal * scale;
                const isFilling = /(충전물|필링|앙금|크림|잼)/.test(subRc.productName || ig.item || '');
                weightTotalG += effWeightG;
                if (isFilling) fillingWeightG += effWeightG;
                rawCostTotal += effCost;
                itemBreakdown.push({ ig, subRc, subEval, scale, effWeightG, effCost });
                return;
            }
        }
        // 일반 원재료
        const unitUpper = String(ig.unit || 'G').toUpperCase();
        const effWeightG = unitUpper === 'KG' ? qty * 1000 : (unitUpper === 'EA' ? qty * (parseFloat(ig.unitWeightG) || 0) : qty);
        const specG = parseFloat(ig.specGrams) || parseSpecToGrams(ig.spec) || 1000;
        const uPrice = parseFloat(ig.unitPrice) || 0;
        const effCost = unitUpper === 'EA'
            ? (uPrice * qty)
            : (specG > 0 ? (uPrice / specG) * effWeightG : 0);

        weightTotalG += effWeightG;
        if (/(충전물|필링|앙금)/.test(ig.process || '')) fillingWeightG += effWeightG;
        rawCostTotal += effCost;
        itemBreakdown.push({ ig, subRc: null, subEval: null, scale: 1, effWeightG, effCost });
    });

    const divW = parseFloat(rc.divisionWeight) || 0;
    const autoYield = divW > 0 ? (weightTotalG / divW) : 1;
    const baseYieldQty = parseFloat(rc.customProductionQty) > 0 ? parseFloat(rc.customProductionQty) : (autoYield > 0 ? autoYield : 1);

    return { weightTotalG, fillingWeightG, rawCostTotal, baseYieldQty, itemBreakdown };
}

// FoodDiscovery 우측 상단 16개 지표 완벽 산출
function calculateRecipeMetrics(rc) {
    ensureRecipeSchema(rc);
    const base = evaluateRecipeBaseTotals(rc);
    const weightTotalG = base.weightTotalG;
    const fillingWeightG = base.fillingWeightG;
    const rawMaterialCost = base.rawCostTotal;

    const divW = parseFloat(rc.divisionWeight) || 0;
    const theoProdQty = divW > 0 ? (weightTotalG / divW) : 0;
    const prodQty = parseFloat(rc.customProductionQty) > 0 ? parseFloat(rc.customProductionQty) : theoProdQty;

    const lossR = Math.max(0, parseFloat(rc.lossRatio) || 0);
    const lossWeightG = weightTotalG * (lossR / 100);
    const productQty = prodQty * (1 - lossR / 100); // 제품수량 (손실 반영 후 최종 수량)
    const lossAmount = rawMaterialCost * (lossR / 100);

    // 포장지(1PK 기준 개별포장 원가 합산)
    let unitPackCost = 0;
    (rc.packagingList || []).forEach(pk => {
        const pPrice = parseFloat(pk.purchasePrice) || 0;
        const sQty = parseFloat(pk.specQty) || 1;
        const uQty = parseFloat(pk.usedQty) || 0;
        unitPackCost += sQty > 0 ? (pPrice / sQty) * uQty : 0;
    });

    const packQty = Math.max(1, parseFloat(rc.packQty) || 1);
    const packCount = productQty > 0 ? (productQty / packQty) : 0;
    const totalPackCost = packCount * unitPackCost; // 총 포장가 = (제품수량 / 포장수량) * 개별포장

    const productionCost = rawMaterialCost + totalPackCost; // 생산원가 = 배합 재료원가 합계 + 총 포장가
    const unitCost = productQty > 0 ? (productionCost / productQty) : 0; // 개당원가
    const salesCost = unitCost * packQty; // 판매원가 (1PK 총원가)
    const sellingPrice = parseFloat(rc.sellingPrice) || 0; // 판매금액 (1PK 판매가)
    const costRatioPct = sellingPrice > 0 ? ((salesCost / sellingPrice) * 100) : 0; // 원가비율(%)
    const marginRatioPct = sellingPrice > 0 ? (100 - costRatioPct) : 0;

    return {
        // 구버전 필드 호환 유지
        weightTotalG,
        flourTotalG: weightTotalG,
        productionCost,
        theoQty: theoProdQty,
        lossAppliedQty: productQty,
        prodQty,
        packQty,
        sellPrice: sellingPrice,
        unitRawCost: productQty > 0 ? (rawMaterialCost / productQty) : 0,
        onePkRawCost: productQty > 0 ? (rawMaterialCost / productQty) * packQty : 0,
        unitPackCost,
        totalPackCost,
        onePkTotalCost: salesCost,
        onePkMargin: sellingPrice - salesCost,
        costRatioPct,
        marginRatioPct,
        // FoodDiscovery 전용 정밀 지표
        divisionWeight: divW,
        lossRatio: lossR,
        lossWeightG,
        productQty,
        unitCost,
        salesCost,
        lossAmount,
        rawMaterialCost,
        fillingWeightG,
        itemBreakdown: base.itemBreakdown
    };
}

function isFlourIngredientName(name) {
    return /(강력|중력|박력|통밀|호밀|쌀가루|밀가루|T45|T55|T65|전립분|낙우밀|프레첼블렌드|파우더)/i.test(String(name || ''));
}

function toggleRecipeRatioMode() {
    recipeRatioMode = recipeRatioMode === 'WEIGHT' ? 'BAKERS' : 'WEIGHT';
    renderRecipeDetailPanel();
}

function fmtDec(n, digits = 1) {
    const val = Number(n) || 0;
    return val.toLocaleString('ko-KR', { minimumFractionDigits: 0, maximumFractionDigits: digits });
}

// 메인 레시피 워크스페이스 렌더링 (3단 FoodDiscovery 레이아웃으로 자동 전환)
function renderRecipeWorkspace() {
    (recipesData || []).forEach(r => ensureRecipeSchema(r));
    if (!selectedRecipeId && recipesData.length > 0) selectedRecipeId = recipesData[0].id;

    const mainEl = document.getElementById('recipeMainSection');
    if (!mainEl) return;
    mainEl.className = `${activeMasterDomain === 'RECIPE' ? 'flex' : 'hidden'} max-w-[1880px] w-full mx-auto px-3 sm:px-5 py-3.5 flex-1 flex-col gap-3`;

    // 최초 1회 FoodDiscovery 3단 스켈레톤 주입
    if (!document.getElementById('fdThreeColRoot')) {
        mainEl.innerHTML = `
            <style>
                .fd-th { background-color: #EFE2C6; color: #292524; font-weight: 800; font-size: 11px; border: 1px solid #D6C7A9; }
                .fd-td { border: 1px solid #E5E0D8; font-size: 11.5px; }
                .fd-kv-label { background-color: #EFE2C6; color: #292524; font-weight: 800; font-size: 11px; border: 1px solid #D6C7A9; padding: 5px 8px; text-align: center; white-space: nowrap; }
                .fd-kv-val { background-color: #FFFFFF; color: #1C1917; font-weight: 700; font-size: 11.5px; border: 1px solid #DFD9CE; padding: 4px 8px; text-align: right; }
                .fd-kv-input { width: 100%; text-align: right; font-weight: 800; background: #FFFBEB; border: 1px solid #F59E0B; border-radius: 4px; padding: 1px 5px; font-size: 11.5px; color: #1C1917; }
                .fd-kv-input:focus { outline: 2px solid #D97706; background: #FFFFFF; }
            </style>
            <div id="fdThreeColRoot" class="grid grid-cols-1 xl:grid-cols-12 gap-3.5 items-start flex-1">
                <!-- [1] 좌측: 제품내역 -->
                <div class="xl:col-span-3 bg-white rounded-xl border border-stone-300 shadow-2xs flex flex-col overflow-hidden">
                    <div class="px-3 py-2.5 bg-stone-100 border-b border-stone-300 flex flex-wrap items-center justify-between gap-1.5">
                        <div class="flex items-center gap-1.5">
                            <h3 class="text-xs sm:text-sm font-black text-stone-900">제품내역</h3>
                            <span id="recipeCountSub" class="px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 text-[10px] font-extrabold">0종</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <button type="button" onclick="createNewRecipeItem('PRODUCT')" class="px-2 py-1 rounded-lg text-[11px] font-extrabold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer">+ 완제품</button>
                            <button type="button" onclick="createNewRecipeItem('SUB')" class="px-2 py-1 rounded-lg text-[11px] font-extrabold bg-rose-700 hover:bg-rose-800 text-white cursor-pointer" title="다른 제품에 투입 가능한 반제품·충전물 레시피">+ 반제품</button>
                            <button type="button" onclick="duplicateSelectedRecipe()" class="px-2 py-1 rounded-lg text-[11px] font-bold bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 cursor-pointer">복제</button>
                            <button type="button" onclick="deleteBulkSelectedRecipes()" class="px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 cursor-pointer">삭제</button>
                        </div>
                    </div>
                    <div class="p-2 border-b border-stone-200 bg-stone-50/70 flex flex-col gap-1.5">
                        <div class="grid grid-cols-3 gap-1">
                            <button type="button" onclick="setRecipeCategoryFilter('ALL')" id="rcCat_ALL" class="py-1 rounded text-[11px] font-extrabold bg-stone-900 text-white cursor-pointer">전체</button>
                            <button type="button" onclick="setRecipeCategoryFilter('PRODUCT')" id="rcCat_PRODUCT" class="py-1 rounded text-[11px] font-bold bg-white border border-stone-200 text-stone-600 cursor-pointer">완제품</button>
                            <button type="button" onclick="setRecipeCategoryFilter('SUB')" id="rcCat_SUB" class="py-1 rounded text-[11px] font-bold bg-white border border-stone-200 text-rose-700 cursor-pointer">반제품·충전물</button>
                        </div>
                        <div class="flex items-center gap-1">
                            <input type="text" id="recipeListSearchInput" oninput="renderRecipeSidebarList()" placeholder="품목코드 · 품목명 검색..." class="flex-1 text-xs border border-stone-300 rounded-lg px-2.5 py-1 bg-white focus:outline-none focus:border-amber-500">
                            <button type="button" onclick="insertFoodDiscoverySampleSet()" title="푸드디스커버리 다단계 반제품 샘플 넣기" class="px-2 py-1 rounded-lg text-[10px] font-bold bg-amber-50 border border-amber-300 text-amber-900 hover:bg-amber-100 cursor-pointer shrink-0">샘플추가</button>
                        </div>
                    </div>
                    <div id="recipeSidebarList" class="overflow-y-auto max-h-[740px]"></div>
                </div>

                <!-- [2] 중앙: 제품 배합비내역 -->
                <div id="fdCenterFormulaPanel" class="xl:col-span-5 bg-white rounded-xl border border-stone-300 shadow-2xs flex flex-col overflow-hidden"></div>

                <!-- [3] 우측: 원가·수율 요약 + 이미지 + 제빵공정 -->
                <div id="fdRightMetricsPanel" class="xl:col-span-4 flex flex-col gap-3"></div>
            </div>
        `;
    }

    renderRecipeSidebarList();
    renderRecipeDetailPanel();
    if (window.lucide) lucide.createIcons();
}

function setRecipeCategoryFilter(cat) {
    recipeCategoryFilter = cat;
    ['ALL', 'PRODUCT', 'SUB'].forEach(c => {
        const btn = document.getElementById(`rcCat_${c}`);
        if (!btn) return;
        btn.className = c === cat
            ? 'py-1 rounded text-[11px] font-extrabold bg-stone-900 text-white cursor-pointer'
            : `py-1 rounded text-[11px] font-bold bg-white border border-stone-200 ${c === 'SUB' ? 'text-rose-700' : 'text-stone-600'} cursor-pointer`;
    });
    renderRecipeSidebarList();
}

// [1] 좌측 패널: 제품내역 테이블 렌더링
function renderRecipeSidebarList() {
    const q = (document.getElementById('recipeListSearchInput')?.value || '').trim().toLowerCase();
    const sub = document.getElementById('recipeCountSub');
    if (sub) sub.textContent = `${recipesData.length}종`;
    const listEl = document.getElementById('recipeSidebarList');
    if (!listEl) return;

    const filtered = (recipesData || []).filter(r => {
        ensureRecipeSchema(r);
        if (recipeCategoryFilter === 'PRODUCT' && r.recipeType === 'SUB') return false;
        if (recipeCategoryFilter === 'SUB' && r.recipeType !== 'SUB') return false;
        if (q && !`${r.productCode || ''} ${r.productName || ''}`.toLowerCase().includes(q)) return false;
        return true;
    });

    const allChecked = filtered.length > 0 && filtered.every(r => selectedRecipeIdsForBulk.has(r.id));

    listEl.innerHTML = `
        <table class="w-full border-collapse text-left">
            <thead class="sticky top-0 z-10">
                <tr>
                    <th class="fd-th py-1.5 px-2 w-7 text-center"><input type="checkbox" ${allChecked ? 'checked' : ''} onchange="toggleSelectAllRecipes(this.checked)" class="rounded"></th>
                    <th class="fd-th py-1.5 px-2 w-18 text-center">품목코드</th>
                    <th class="fd-th py-1.5 px-2.5">품목명</th>
                    <th class="fd-th py-1.5 px-1.5 w-12 text-center">배합비</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.length === 0 ? `<tr><td colspan="4" class="py-10 text-center text-xs text-stone-400 font-bold">등록된 품목이 없습니다.</td></tr>` : filtered.map(r => {
                    const active = r.id === selectedRecipeId;
                    const hasFormula = (r.ingredients && r.ingredients.length > 0) || (r.packagingList && r.packagingList.length > 0);
                    const isSub = r.recipeType === 'SUB';
                    const checked = selectedRecipeIdsForBulk.has(r.id);
                    return `
                        <tr onclick="selectRecipeItem('${escapeHtml(r.id)}')" class="cursor-pointer transition ${active ? 'bg-amber-100/80 font-extrabold' : 'hover:bg-stone-50'}">
                            <td class="fd-td py-1.5 px-2 text-center" onclick="event.stopPropagation()">
                                <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleBulkRecipeCheck('${escapeHtml(r.id)}', this.checked)" class="rounded">
                            </td>
                            <td class="fd-td py-1.5 px-2 text-center font-mono text-[11px] text-stone-700">${escapeHtml(r.productCode)}</td>
                            <td class="fd-td py-1.5 px-2.5 ${isSub ? 'text-rose-700 font-bold' : 'text-stone-900 font-semibold'} truncate max-w-[180px]" title="${escapeHtml(r.productName)}">
                                ${escapeHtml(r.productName)}
                            </td>
                            <td class="fd-td py-1.5 px-1.5 text-center font-bold ${hasFormula ? 'text-emerald-700' : 'text-stone-300'}">${hasFormula ? 'V' : '-'}</td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

// 하위 반제품 트리를 재귀적으로 HTML 행(<tr>)으로 생성 (읽기전용 펼침 뷰)
function renderNestedSubRecipeRowsHtml(subRc, parentScale, depth = 1, visited = new Set()) {
    if (!subRc || visited.has(subRc.id) || depth > 5) return '';
    const nextVisited = new Set(visited);
    nextVisited.add(subRc.id);

    const subEval = evaluateRecipeBaseTotals(subRc, visited);
    const indentPx = depth * 18;
    let html = '';

    // 공정별 그룹핑
    const procGroups = {};
    (subRc.activeProcesses || ['제1공정']).forEach(p => { procGroups[p] = []; });
    subEval.itemBreakdown.forEach(entry => {
        const p = entry.ig.process || '제1공정';
        if (!procGroups[p]) procGroups[p] = [];
        procGroups[p].push(entry);
    });

    Object.entries(procGroups).forEach(([procName, entries]) => {
        if (entries.length === 0) return;
        // 하위 공정 헤더 행
        html += `
            <tr class="bg-stone-50/90 text-stone-700">
                <td class="fd-td py-1 px-2 font-extrabold" style="padding-left:${indentPx}px">${escapeHtml(procName)}</td>
                <td class="fd-td py-1 px-1.5 text-center"></td>
                <td class="fd-td py-1 px-1.5 text-center"></td>
                <td class="fd-td py-1 px-2 text-right text-stone-400">0</td>
                <td class="fd-td py-1 px-1.5 text-right text-stone-400">0</td>
                <td class="fd-td py-1 px-1.5 text-center text-stone-400">0</td>
                <td class="fd-td py-1 px-2 text-right text-stone-400">0</td>
                <td class="fd-td py-1 px-1 text-center"></td>
            </tr>
        `;

        entries.forEach(entry => {
            const ig = entry.ig;
            const scaledInputQty = (parseFloat(ig.qty ?? ig.weightG ?? 0) || 0) * parentScale;
            const scaledCost = entry.effCost * parentScale;
            const subFlourG = subEval.itemBreakdown.reduce((acc, x) => acc + ((x.ig.isFlour || isFlourIngredientName(x.ig.item)) ? x.effWeightG : 0), 0);
            const denomG = (recipeRatioMode === 'BAKERS' && subFlourG > 0) ? subFlourG : subEval.weightTotalG;
            const pct = denomG > 0 ? ((entry.effWeightG / denomG) * 100) : 0;

            if (ig.rowType === 'SUB_RECIPE' && entry.subRc) {
                const nodeKey = `${subRc.id}_${ig.rowId}_${depth}`;
                const isCollapsed = collapsedSubRecipeNodes.has(nodeKey);
                const codeLabel = entry.subRc.productCode ? ` (${entry.subRc.productCode})` : '';
                html += `
                    <tr class="bg-rose-50/30 hover:bg-rose-50/60">
                        <td class="fd-td py-1 px-2 font-extrabold text-rose-600" style="padding-left:${indentPx + 10}px">
                            <button type="button" onclick="toggleSubNodeCollapse('${escapeHtml(nodeKey)}')" class="mr-1 text-[10px] px-1 rounded border border-rose-200 bg-white text-rose-700 cursor-pointer">${isCollapsed ? '+' : '-'}</button>
                            <span onclick="selectRecipeItem('${escapeHtml(entry.subRc.id)}')" class="underline decoration-dotted cursor-pointer" title="클릭 시 해당 반제품 레시피로 이동">${escapeHtml(entry.subRc.productName)}${escapeHtml(codeLabel)}</span>
                        </td>
                        <td class="fd-td py-1 px-1.5 text-center text-stone-600">${escapeHtml(ig.origin || '')}</td>
                        <td class="fd-td py-1 px-1.5 text-center font-semibold text-stone-700">${escapeHtml(ig.unit || 'EA')}</td>
                        <td class="fd-td py-1 px-2 text-right font-bold text-stone-800">${fmtDec(scaledInputQty, 2)}</td>
                        <td class="fd-td py-1 px-1.5 text-right text-stone-700">${fmtDec(pct, 1)}</td>
                        <td class="fd-td py-1 px-1.5 text-center text-stone-500">${ig.seq || 0}</td>
                        <td class="fd-td py-1 px-2 text-right font-bold text-stone-900">${fmtDec(scaledCost, 1)}</td>
                        <td class="fd-td py-1 px-1 text-center text-[10px] text-stone-400">하위</td>
                    </tr>
                `;
                if (!isCollapsed) {
                    html += renderNestedSubRecipeRowsHtml(entry.subRc, parentScale * entry.scale, depth + 1, nextVisited);
                }
            } else {
                const codeSuffix = ig.itemCode ? ` (${ig.itemCode})` : '';
                html += `
                    <tr class="bg-white/80 hover:bg-stone-50 text-stone-700">
                        <td class="fd-td py-1 px-2 font-medium" style="padding-left:${indentPx + 14}px">${escapeHtml(ig.item || '')}${escapeHtml(codeSuffix)}</td>
                        <td class="fd-td py-1 px-1.5 text-center text-stone-500">${escapeHtml(ig.origin || '')}</td>
                        <td class="fd-td py-1 px-1.5 text-center text-stone-600">${escapeHtml(ig.unit || 'G')}</td>
                        <td class="fd-td py-1 px-2 text-right text-stone-800">${fmtDec(scaledInputQty, 2)}</td>
                        <td class="fd-td py-1 px-1.5 text-right text-stone-600">${fmtDec(pct, 1)}</td>
                        <td class="fd-td py-1 px-1.5 text-center text-stone-400">${ig.seq || 0}</td>
                        <td class="fd-td py-1 px-2 text-right text-stone-800">${fmtDec(scaledCost, 1)}</td>
                        <td class="fd-td py-1 px-1 text-center"></td>
                    </tr>
                `;
            }
        });
    });

    return html;
}

function toggleSubNodeCollapse(nodeKey) {
    if (collapsedSubRecipeNodes.has(nodeKey)) collapsedSubRecipeNodes.delete(nodeKey);
    else collapsedSubRecipeNodes.add(nodeKey);
    renderRecipeDetailPanel();
}

// [2] 중앙 배합비내역 + [3] 우측 원가·이미지·제빵공정 렌더링
function renderRecipeDetailPanel() {
    const centerEl = document.getElementById('fdCenterFormulaPanel');
    const rightEl = document.getElementById('fdRightMetricsPanel');
    if (!centerEl || !rightEl) return;

    const rc = (recipesData || []).find(r => r.id === selectedRecipeId);
    if (!rc) {
        centerEl.innerHTML = `<div class="p-16 text-center text-stone-400 font-bold text-sm">좌측 제품내역에서 품목을 선택하거나 [+ 완제품] 버튼을 눌러주세요.</div>`;
        rightEl.innerHTML = '';
        return;
    }

    ensureRecipeSchema(rc);
    const m = calculateRecipeMetrics(rc);
    const rawCatalog = getRawMaterialCatalogForRecipe();
    const availableSubRecipes = (recipesData || []).filter(r => r.id !== rc.id);

    // 최상위 배합 행들을 공정별로 정리
    const topProcGroups = {};
    rc.activeProcesses.forEach(p => { topProcGroups[p] = []; });
    m.itemBreakdown.forEach((entry, idx) => {
        const p = entry.ig.process || rc.activeProcesses[0] || '제1공정';
        if (!topProcGroups[p]) topProcGroups[p] = [];
        topProcGroups[p].push({ ...entry, idx });
    });

    let formulaRowsHtml = '';
    Object.entries(topProcGroups).forEach(([procName, entries]) => {
        // 최상위 공정 구분 행
        formulaRowsHtml += `
            <tr class="bg-stone-100/90">
                <td class="fd-td py-1.5 px-2.5 font-black text-stone-900 flex items-center justify-between">
                    <span>${escapeHtml(procName)}</span>
                    ${rc.activeProcesses.length > 1 ? `<button type="button" onclick="removeProcessFromRecipe('${escapeHtml(procName)}')" class="text-[10px] text-stone-400 hover:text-rose-600 cursor-pointer" title="공정 제거">✕</button>` : ''}
                </td>
                <td class="fd-td py-1.5 px-1.5 text-center"></td>
                <td class="fd-td py-1.5 px-1.5 text-center"></td>
                <td class="fd-td py-1.5 px-2 text-right text-stone-400 font-semibold">0</td>
                <td class="fd-td py-1.5 px-1.5 text-right text-stone-400 font-semibold">0</td>
                <td class="fd-td py-1.5 px-1.5 text-center text-stone-400 font-semibold">0</td>
                <td class="fd-td py-1.5 px-2 text-right text-stone-400 font-semibold">0</td>
                <td class="fd-td py-1.5 px-1 text-center"></td>
            </tr>
        `;

        entries.forEach(entry => {
            const ig = entry.ig;
            const idx = entry.idx;
            const topFlourG = m.itemBreakdown.reduce((acc, x) => acc + ((x.ig.isFlour || isFlourIngredientName(x.ig.item)) ? x.effWeightG : 0), 0);
            const topDenomG = (recipeRatioMode === 'BAKERS' && topFlourG > 0) ? topFlourG : m.weightTotalG;
            const pct = topDenomG > 0 ? ((entry.effWeightG / topDenomG) * 100) : 0;

            if (ig.rowType === 'SUB_RECIPE' && entry.subRc) {
                const nodeKey = `TOP_${rc.id}_${ig.rowId}`;
                const isCollapsed = collapsedSubRecipeNodes.has(nodeKey);
                const codeSuffix = entry.subRc.productCode ? ` (${entry.subRc.productCode})` : '';
                formulaRowsHtml += `
                    <tr class="bg-rose-50/40 hover:bg-rose-50/80">
                        <td class="fd-td py-1.5 px-2 font-extrabold text-rose-600 pl-3">
                            <div class="flex items-center gap-1">
                                <button type="button" onclick="toggleSubNodeCollapse('${escapeHtml(nodeKey)}')" class="text-[10px] w-4 h-4 inline-flex items-center justify-center rounded border border-rose-300 bg-white text-rose-700 cursor-pointer shrink-0">${isCollapsed ? '+' : '-'}</button>
                                <span onclick="selectRecipeItem('${escapeHtml(entry.subRc.id)}')" class="underline decoration-dotted cursor-pointer truncate" title="클릭하면 하위 반제품 배합비로 이동하여 수정할 수 있습니다">${escapeHtml(entry.subRc.productName)}${escapeHtml(codeSuffix)}</span>
                            </div>
                        </td>
                        <td class="fd-td py-1 px-1 text-center"><input type="text" value="${escapeHtml(ig.origin || '')}" onchange="updateRecipeIngredient(${idx}, 'origin', this.value)" class="w-full text-center bg-transparent focus:bg-white focus:outline-amber-500 text-[11px]"></td>
                        <td class="fd-td py-1 px-1 text-center">
                            <select onchange="updateRecipeIngredient(${idx}, 'unit', this.value)" class="bg-transparent font-bold text-[11px] text-stone-800 focus:outline-none">
                                <option value="EA" ${ig.unit === 'EA' ? 'selected' : ''}>EA</option>
                                <option value="G" ${ig.unit === 'G' ? 'selected' : ''}>G</option>
                            </select>
                        </td>
                        <td class="fd-td py-1 px-1.5 text-right bg-amber-50/50">
                            <input type="text" value="${fmtDec(ig.qty, 2)}" onchange="updateRecipeIngredient(${idx}, 'qty', this.value)" class="w-18 text-right font-extrabold text-stone-900 bg-transparent focus:bg-white focus:outline-amber-500">
                        </td>
                        <td class="fd-td py-1 px-1.5 text-right font-bold text-stone-800">${fmtDec(pct, 1)}</td>
                        <td class="fd-td py-1 px-1 text-center"><input type="text" value="${ig.seq || 0}" onchange="updateRecipeIngredient(${idx}, 'seq', this.value)" class="w-8 text-center bg-transparent focus:bg-white"></td>
                        <td class="fd-td py-1 px-2 text-right font-extrabold text-stone-900">${fmtDec(entry.effCost, 1)}</td>
                        <td class="fd-td py-1 px-1 text-center">
                            <button type="button" onclick="removeRecipeIngredient(${idx})" class="text-stone-400 hover:text-rose-600 cursor-pointer"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                        </td>
                    </tr>
                `;
                if (!isCollapsed) {
                    formulaRowsHtml += renderNestedSubRecipeRowsHtml(entry.subRc, entry.scale, 1, new Set([rc.id]));
                }
            } else {
                // 일반 원재료 행 (클릭/인라인 편집 완벽 지원)
                const perGramPrice = (parseFloat(ig.specGrams) || 1000) > 0 ? ((parseFloat(ig.unitPrice) || 0) / (parseFloat(ig.specGrams) || 1000)) : 0;
                formulaRowsHtml += `
                    <tr class="hover:bg-amber-50/30">
                        <td class="fd-td py-1 px-2 pl-4">
                            <div class="flex items-center gap-1">
                                <input type="text" value="${escapeHtml(ig.item || '')}" onchange="updateRecipeIngredient(${idx}, 'item', this.value)" class="flex-1 font-bold text-stone-900 bg-transparent focus:bg-white focus:outline-amber-500 min-w-[90px]" title="구매규격: ${escapeHtml(ig.spec || '1kg')} / 규격단가: ${formatCurrency(ig.unitPrice)}">
                                <input type="text" value="${escapeHtml(ig.itemCode || '')}" placeholder="코드" onchange="updateRecipeIngredient(${idx}, 'itemCode', this.value)" class="w-13 text-[10px] font-mono text-stone-500 bg-stone-50 border border-stone-200 rounded px-1 text-center" title="원재료 품목코드">
                            </div>
                        </td>
                        <td class="fd-td py-1 px-1 text-center"><input type="text" value="${escapeHtml(ig.origin || '')}" placeholder="-" onchange="updateRecipeIngredient(${idx}, 'origin', this.value)" class="w-14 text-center text-[11px] text-stone-700 bg-transparent focus:bg-white"></td>
                        <td class="fd-td py-1 px-1 text-center">
                            <select onchange="updateRecipeIngredient(${idx}, 'unit', this.value)" class="bg-transparent font-semibold text-[11px] text-stone-700">
                                <option value="G" ${ig.unit === 'G' ? 'selected' : ''}>G</option>
                                <option value="EA" ${ig.unit === 'EA' ? 'selected' : ''}>EA</option>
                                <option value="ML" ${ig.unit === 'ML' ? 'selected' : ''}>ML</option>
                            </select>
                        </td>
                        <td class="fd-td py-1 px-1.5 text-right bg-amber-50/40">
                            <input type="text" value="${fmtDec(ig.qty, 2)}" onchange="updateRecipeIngredient(${idx}, 'qty', this.value)" class="w-18 text-right font-extrabold text-stone-900 bg-transparent focus:bg-white focus:outline-amber-500">
                        </td>
                        <td class="fd-td py-1 px-1.5 text-right text-stone-700 font-semibold">${fmtDec(pct, 1)}</td>
                        <td class="fd-td py-1 px-1 text-center"><input type="text" value="${ig.seq || 0}" onchange="updateRecipeIngredient(${idx}, 'seq', this.value)" class="w-8 text-center text-stone-600 bg-transparent focus:bg-white"></td>
                        <td class="fd-td py-1 px-2 text-right font-bold text-stone-900 cursor-pointer" onclick="promptIngredientUnitPrice(${idx})" title="클릭하여 기준규격(${escapeHtml(ig.spec || '1kg')}) 구매단가(${formatCurrency(ig.unitPrice)} / g당 ${perGramPrice.toFixed(2)}원) 수정">${fmtDec(entry.effCost, 1)}</td>
                        <td class="fd-td py-1 px-1 text-center">
                            <button type="button" onclick="removeRecipeIngredient(${idx})" class="text-stone-400 hover:text-rose-600 cursor-pointer"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                        </td>
                    </tr>
                `;
            }
        });
    });

    // 하단: 포장지(1EA제품기준) 섹션 (FoodDiscovery 스타일 빨간색 텍스트)
    formulaRowsHtml += `
        <tr class="bg-stone-100/90">
            <td class="fd-td py-1.5 px-2.5 font-black text-stone-900">포장지(1EA제품기준)</td>
            <td class="fd-td py-1.5 px-1.5"></td>
            <td class="fd-td py-1.5 px-1.5"></td>
            <td class="fd-td py-1.5 px-2 text-right text-stone-400 font-semibold">0</td>
            <td class="fd-td py-1.5 px-1.5 text-right text-stone-400 font-semibold">0</td>
            <td class="fd-td py-1.5 px-1.5 text-center text-stone-400 font-semibold">0</td>
            <td class="fd-td py-1.5 px-2 text-right text-stone-400 font-semibold">0</td>
            <td class="fd-td py-1.5 px-1"></td>
        </tr>
    `;

    (rc.packagingList || []).forEach((pk, idx) => {
        const sQty = parseFloat(pk.specQty) || 1;
        const pPrice = parseFloat(pk.purchasePrice) || 0;
        const uQty = parseFloat(pk.usedQty) || 0;
        const rowPackCost = sQty > 0 ? (pPrice / sQty) * uQty : 0;
        formulaRowsHtml += `
            <tr class="hover:bg-rose-50/30">
                <td class="fd-td py-1 px-2 pl-4">
                    <div class="flex items-center gap-1">
                        <input type="text" value="${escapeHtml(pk.name || '')}" onchange="updateRecipePackaging(${idx}, 'name', this.value)" class="flex-1 font-bold text-rose-600 bg-transparent focus:bg-white min-w-[100px]" title="클릭하여 포장재명 수정">
                        <input type="text" value="${escapeHtml(pk.code || '')}" placeholder="코드" onchange="updateRecipePackaging(${idx}, 'code', this.value)" class="w-13 text-[10px] font-mono text-rose-500 bg-rose-50/50 border border-rose-200 rounded px-1 text-center">
                    </div>
                </td>
                <td class="fd-td py-1 px-1 text-center text-[10px] text-stone-400" onclick="promptPackagingPrice(${idx})" title="클릭하여 구매단가/입수량 수정"><span class="cursor-pointer underline decoration-dotted">단가수정</span></td>
                <td class="fd-td py-1 px-1 text-center font-semibold text-stone-700">${escapeHtml(pk.unit || 'EA')}</td>
                <td class="fd-td py-1 px-1.5 text-right bg-amber-50/40">
                    <input type="text" value="${fmtDec(uQty, 3)}" onchange="updateRecipePackaging(${idx}, 'usedQty', this.value)" class="w-18 text-right font-extrabold text-stone-900 bg-transparent focus:bg-white">
                </td>
                <td class="fd-td py-1 px-1.5 text-right text-stone-400">0</td>
                <td class="fd-td py-1 px-1 text-center text-stone-400">0</td>
                <td class="fd-td py-1 px-2 text-right font-bold text-stone-900 cursor-pointer" onclick="promptPackagingPrice(${idx})" title="구매가 ${formatCurrency(pPrice)} / 입수 ${sQty}개 (1개당 ${fmtDec(pPrice / sQty, 1)}원)">${fmtDec(rowPackCost, 1)}</td>
                <td class="fd-td py-1 px-1 text-center">
                    <button type="button" onclick="removeRecipePackaging(${idx})" class="text-stone-400 hover:text-rose-600 cursor-pointer"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                </td>
            </tr>
        `;
    });

    centerEl.innerHTML = `
        <!-- 상단 현재 선택 품목 헤더 -->
        <div class="px-3.5 py-2.5 bg-stone-100 border-b border-stone-300 flex flex-wrap items-center justify-between gap-2">
            <div class="flex flex-wrap items-center gap-1.5 flex-1">
                <h3 class="text-xs sm:text-sm font-black text-stone-900 mr-1">제품 배합비내역</h3>
                <select onchange="updateRecipeField('recipeType', this.value)" class="text-[11px] font-extrabold rounded-lg px-2 py-1 border ${rc.recipeType === 'SUB' ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-white text-stone-800 border-stone-300'}">
                    <option value="PRODUCT" ${rc.recipeType === 'PRODUCT' ? 'selected' : ''}>완제품</option>
                    <option value="SUB" ${rc.recipeType === 'SUB' ? 'selected' : ''}>반제품·충전물</option>
                </select>
                <input type="text" value="${escapeHtml(rc.productCode)}" onchange="updateRecipeField('productCode', this.value)" placeholder="품목코드" class="w-20 text-xs font-mono font-extrabold text-center bg-white border border-stone-300 rounded-lg px-2 py-1">
                <input type="text" value="${escapeHtml(rc.productName)}" onchange="updateRecipeField('productName', this.value)" placeholder="품목명 입력" class="flex-1 min-w-[160px] text-xs sm:text-sm font-black text-stone-900 bg-white border border-stone-300 rounded-lg px-2.5 py-1">
            </div>
        </div>

        <!-- 배합비 빠른 투입 툴바 (원재료 / 반제품 / 공정 / 포장재) -->
        <div class="p-2.5 bg-amber-50/60 border-b border-stone-200 flex flex-col gap-2 text-xs">
            <div class="flex flex-wrap items-center gap-1.5">
                <select id="quickAddProcessSelect" class="border border-stone-300 rounded-lg px-2 py-1 font-extrabold bg-white text-xs">
                    ${rc.activeProcesses.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('')}
                </select>
                <button type="button" onclick="promptAddProcessName()" class="px-2 py-1 rounded-lg bg-white border border-stone-300 text-[11px] font-bold text-stone-700 hover:bg-stone-100 cursor-pointer">+ 공정추가</button>

                <select id="quickAddRawSelect" class="flex-1 min-w-[180px] border border-amber-400 rounded-lg px-2 py-1 font-bold bg-white text-xs">
                    <option value="">① 발주 원재료 선택 (${rawCatalog.filter(c => !c.isPackaging).length}종)...</option>
                    ${rawCatalog.filter(c => !c.isPackaging).map(c => `<option value="${escapeHtml(c.key)}">${escapeHtml(c.item)} (${escapeHtml(c.spec)} · ${formatCurrency(c.unitPrice)})</option>`).join('')}
                </select>
                <button type="button" onclick="addIngredientToRecipe()" class="px-2.5 py-1 rounded-lg bg-stone-900 text-white font-extrabold text-[11px] cursor-pointer">+ 원재료투입</button>
                <button type="button" onclick="addBlankIngredientToRecipe()" class="px-2 py-1 rounded-lg bg-white border border-stone-300 text-stone-700 font-bold text-[11px] cursor-pointer">+ 수기원재료</button>
            </div>

            <div class="flex flex-wrap items-center gap-1.5">
                <select id="quickAddSubRecipeSelect" class="flex-1 min-w-[180px] border border-rose-300 rounded-lg px-2 py-1 font-bold bg-white text-rose-800 text-xs">
                    <option value="">② 하위 반제품·충전물 레시피 불러오기 (${availableSubRecipes.length}종)...</option>
                    ${availableSubRecipes.map(sr => `<option value="${escapeHtml(sr.id)}">[${sr.recipeType === 'SUB' ? '반제품' : '레시피'}] ${escapeHtml(sr.productName)} (${escapeHtml(sr.productCode)})</option>`).join('')}
                </select>
                <button type="button" onclick="addSubRecipeToFormula()" class="px-2.5 py-1 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-[11px] cursor-pointer">+ 반제품투입</button>

                <select id="quickAddPackCatalogSelect" class="flex-1 min-w-[150px] border border-emerald-300 rounded-lg px-2 py-1 font-bold bg-white text-emerald-900 text-xs">
                    <option value="">③ 포장 부자재 선택...</option>
                    ${rawCatalog.filter(c => c.isPackaging).map(c => `<option value="${escapeHtml(c.key)}">${escapeHtml(c.item)} (${escapeHtml(c.spec)} · ${formatCurrency(c.unitPrice)})</option>`).join('')}
                </select>
                <button type="button" onclick="addPackagingRowToRecipe()" class="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-[11px] cursor-pointer">+ 포장지추가</button>
            </div>
        </div>

        <!-- 배합비 메인 그리드 -->
        <div class="overflow-x-auto overflow-y-auto max-h-[680px]">
            <table class="w-full border-collapse text-left min-w-[580px]">
                <thead class="sticky top-0 z-10">
                    <tr>
                        <th class="fd-th py-1.5 px-2.5">원재료</th>
                        <th class="fd-th py-1.5 px-1.5 w-16 text-center">원산지</th>
                        <th class="fd-th py-1.5 px-1.5 w-12 text-center">단위</th>
                        <th class="fd-th py-1.5 px-2 w-20 text-right">수량</th>
                        <th onclick="toggleRecipeRatioMode()" title="클릭 시 중량비(%) ⇄ 베이커스(%) 전환" class="fd-th py-1.5 px-1.5 w-15 text-right cursor-pointer hover:bg-amber-200/70 select-none">${recipeRatioMode === 'BAKERS' ? 'B(%)' : '(%)'} ⇄</th>
                        <th class="fd-th py-1.5 px-1 w-10 text-center">순차</th>
                        <th class="fd-th py-1.5 px-2 w-24 text-right">재료원가</th>
                        <th class="fd-th py-1.5 px-1 w-8 text-center">삭제</th>
                    </tr>
                </thead>
                <tbody>
                    ${formulaRowsHtml}
                </tbody>
            </table>
        </div>
        <div class="px-3 py-1.5 bg-stone-50 border-t border-stone-200 text-[11px] text-stone-500 flex flex-wrap justify-between gap-1">
            <span>💡 <strong>재료원가</strong> 셀을 클릭하면 구매규격 단가를 직접 수정할 수 있습니다.</span>
            <span>배합 순수 재료원가 합계: <strong class="text-stone-900">${fmtDec(m.rawMaterialCost, 1)}원</strong></span>
        </div>
    `;

    // [3] 우측 패널: FoodDiscovery 16항목 요약표 + 제품이미지 + 제빵공정 테이블
    const bp = rc.bakingProcess || {};
    rightEl.innerHTML = `
        <!-- 상단: 원가·수율 요약표 + 우측 제품이미지 박스 -->
        <div class="bg-white rounded-xl border border-stone-300 shadow-2xs p-2.5">
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-stretch">
                <div class="sm:col-span-8 overflow-x-auto">
                    <table class="w-full border-collapse">
                        <tbody>
                            <tr>
                                <td class="fd-kv-label">분할중량(G)</td>
                                <td class="fd-kv-val"><input type="text" value="${fmtDec(rc.divisionWeight, 2)}" onchange="updateRecipeNumericField('divisionWeight', this.value)" class="fd-kv-input"></td>
                                <td class="fd-kv-label">생산수량</td>
                                <td class="fd-kv-val"><input type="text" value="${fmtDec(m.prodQty, 1)}" title="0 입력 시 (중량합계÷분할중량) 자동 계산" onchange="updateRecipeNumericField('customProductionQty', this.value)" class="fd-kv-input"></td>
                            </tr>
                            <tr>
                                <td class="fd-kv-label">포장수량</td>
                                <td class="fd-kv-val"><input type="text" value="${fmtDec(rc.packQty, 1)}" onchange="updateRecipeNumericField('packQty', this.value)" class="fd-kv-input"></td>
                                <td class="fd-kv-label">판매금액</td>
                                <td class="fd-kv-val"><input type="text" value="${fmtDec(rc.sellingPrice, 0)}" onchange="updateRecipeNumericField('sellingPrice', this.value)" class="fd-kv-input"></td>
                            </tr>
                            <tr>
                                <td class="fd-kv-label">원가비율(%)</td>
                                <td class="fd-kv-val font-black ${m.costRatioPct >= 70 ? 'text-rose-600' : 'text-blue-700'}">${fmtDec(m.costRatioPct, 2)}</td>
                                <td class="fd-kv-label">손실비율(%)</td>
                                <td class="fd-kv-val"><input type="text" value="${fmtDec(rc.lossRatio, 1)}" onchange="updateRecipeNumericField('lossRatio', this.value)" class="fd-kv-input"></td>
                            </tr>
                            <tr>
                                <td class="fd-kv-label">손실중량(G)</td>
                                <td class="fd-kv-val">${fmtDec(m.lossWeightG, 1)}</td>
                                <td class="fd-kv-label">제품수량</td>
                                <td class="fd-kv-val font-extrabold text-stone-900">${fmtDec(m.productQty, 1)}</td>
                            </tr>
                            <tr>
                                <td class="fd-kv-label">개당원가</td>
                                <td class="fd-kv-val font-extrabold">${fmtDec(m.unitCost, 2)}</td>
                                <td class="fd-kv-label">판매원가</td>
                                <td class="fd-kv-val font-black text-amber-900">${fmtDec(m.salesCost, 0)}</td>
                            </tr>
                            <tr>
                                <td class="fd-kv-label">손실금액</td>
                                <td class="fd-kv-val">${fmtDec(m.lossAmount, 0)}</td>
                                <td class="fd-kv-label">개별포장</td>
                                <td class="fd-kv-val">${fmtDec(m.unitPackCost, 0)}</td>
                            </tr>
                            <tr>
                                <td class="fd-kv-label">총 포장가</td>
                                <td class="fd-kv-val">${fmtDec(m.totalPackCost, 0)}</td>
                                <td class="fd-kv-label">생산원가</td>
                                <td class="fd-kv-val font-black text-stone-900">${fmtDec(m.productionCost, 2)}</td>
                            </tr>
                            <tr>
                                <td class="fd-kv-label">중량합계(G)</td>
                                <td class="fd-kv-val font-extrabold text-stone-900">${fmtDec(m.weightTotalG, 0)}</td>
                                <td class="fd-kv-label">충전합계(G)</td>
                                <td class="fd-kv-val">${fmtDec(m.fillingWeightG, 0)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- 우측 제품이미지 영역 -->
                <div class="sm:col-span-4 border border-[#D6C7A9] bg-[#F7EFE1] rounded flex flex-col items-center justify-center relative overflow-hidden min-h-[190px] group">
                    ${rc.imageData
                        ? `<img src="${rc.imageData}" alt="제품이미지" class="w-full h-full object-cover max-h-[225px]">
                           <div class="absolute inset-0 bg-stone-950/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5">
                               <button type="button" onclick="document.getElementById('recipeImgInput').click()" class="px-2 py-1 rounded bg-white text-stone-900 text-[11px] font-bold cursor-pointer">변경</button>
                               <button type="button" onclick="clearRecipeImage()" class="px-2 py-1 rounded bg-rose-600 text-white text-[11px] font-bold cursor-pointer">삭제</button>
                           </div>`
                        : `<div onclick="document.getElementById('recipeImgInput').click()" class="w-full h-full flex flex-col items-center justify-center p-3 text-center cursor-pointer hover:bg-[#EFE2C6]/60 transition">
                               <i data-lucide="image-plus" class="w-6 h-6 text-stone-500 mb-1"></i>
                               <span class="text-xs font-extrabold text-stone-700">제품이미지</span>
                               <span class="text-[10px] text-stone-500 mt-0.5">클릭하여 사진 등록</span>
                           </div>`
                    }
                    <input type="file" id="recipeImgInput" accept="image/*" onchange="handleRecipeImageUpload(this.files)" class="hidden">
                </div>
            </div>
        </div>

        <!-- 하단: 제빵공정 테이블 (FoodDiscovery 동일 레이아웃) -->
        <div class="bg-white rounded-xl border border-stone-300 shadow-2xs p-2.5">
            <h4 class="text-xs sm:text-sm font-black text-stone-900 mb-2 px-0.5">제빵공정</h4>
            <div class="overflow-x-auto">
                <table class="w-full border-collapse text-xs">
                    <tbody>
                        <tr>
                            <td rowspan="3" class="fd-kv-label w-16">믹싱</td>
                            <td class="fd-kv-label w-18">저속(분)</td>
                            <td class="fd-td p-1 w-20"><input type="text" value="${escapeHtml(bp.mixLow)}" onchange="updateBakingProcess('mixLow', this.value)" class="w-full text-center font-bold focus:outline-amber-500"></td>
                            <td class="fd-kv-label w-20">반죽온도(°C)</td>
                            <td class="fd-td p-1"><input type="text" value="${escapeHtml(bp.doughTemp)}" onchange="updateBakingProcess('doughTemp', this.value)" class="w-full text-center font-bold focus:outline-amber-500"></td>
                        </tr>
                        <tr>
                            <td class="fd-kv-label">중속(분)</td>
                            <td class="fd-td p-1"><input type="text" value="${escapeHtml(bp.mixMid)}" onchange="updateBakingProcess('mixMid', this.value)" class="w-full text-center font-bold focus:outline-amber-500"></td>
                            <td class="fd-kv-label">1차발효(분)</td>
                            <td class="fd-td p-1"><input type="text" value="${escapeHtml(bp.ferm1Time)}" onchange="updateBakingProcess('ferm1Time', this.value)" class="w-full text-center font-bold focus:outline-amber-500"></td>
                        </tr>
                        <tr>
                            <td class="fd-kv-label">고속(분)</td>
                            <td class="fd-td p-1"><input type="text" value="${escapeHtml(bp.mixHigh)}" onchange="updateBakingProcess('mixHigh', this.value)" class="w-full text-center font-bold focus:outline-amber-500"></td>
                            <td class="fd-kv-label">벤치타임(분)</td>
                            <td class="fd-td p-1"><input type="text" value="${escapeHtml(bp.benchTime)}" onchange="updateBakingProcess('benchTime', this.value)" class="w-full text-center font-bold focus:outline-amber-500"></td>
                        </tr>
                        <tr>
                            <td rowspan="3" class="fd-kv-label">2차발효</td>
                            <td class="fd-kv-label">온도(°C)</td>
                            <td class="fd-td p-1"><input type="text" value="${escapeHtml(bp.ferm2Temp)}" onchange="updateBakingProcess('ferm2Temp', this.value)" class="w-full text-center font-bold focus:outline-amber-500"></td>
                            <td rowspan="6" class="fd-kv-label">메모</td>
                            <td rowspan="6" class="fd-td p-1.5 align-top">
                                <textarea onchange="updateBakingProcess('memo', this.value)" placeholder="성형 · 충전 · 분할 · 굽기 특이사항 메모 입력..." class="w-full h-36 resize-none text-xs font-semibold text-stone-800 leading-relaxed focus:outline-none">${escapeHtml(bp.memo)}</textarea>
                            </td>
                        </tr>
                        <tr>
                            <td class="fd-kv-label">습도(%)</td>
                            <td class="fd-td p-1"><input type="text" value="${escapeHtml(bp.ferm2Humid)}" onchange="updateBakingProcess('ferm2Humid', this.value)" class="w-full text-center font-bold focus:outline-amber-500"></td>
                        </tr>
                        <tr>
                            <td class="fd-kv-label">시간(분)</td>
                            <td class="fd-td p-1"><input type="text" value="${escapeHtml(bp.ferm2Time)}" onchange="updateBakingProcess('ferm2Time', this.value)" class="w-full text-center font-bold focus:outline-amber-500"></td>
                        </tr>
                        <tr>
                            <td rowspan="2" class="fd-kv-label">오븐온도</td>
                            <td class="fd-kv-label">상(°C)</td>
                            <td class="fd-td p-1"><input type="text" value="${escapeHtml(bp.ovenTop)}" onchange="updateBakingProcess('ovenTop', this.value)" class="w-full text-center font-bold focus:outline-amber-500"></td>
                        </tr>
                        <tr>
                            <td class="fd-kv-label">하(°C)</td>
                            <td class="fd-td p-1"><input type="text" value="${escapeHtml(bp.ovenBottom)}" onchange="updateBakingProcess('ovenBottom', this.value)" class="w-full text-center font-bold focus:outline-amber-500"></td>
                        </tr>
                        <tr>
                            <td colspan="2" class="fd-kv-label">굽는시간(분)</td>
                            <td class="fd-td p-1"><input type="text" value="${escapeHtml(bp.bakeTime)}" onchange="updateBakingProcess('bakeTime', this.value)" class="w-full text-center font-bold focus:outline-amber-500"></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;

    if (window.lucide) lucide.createIcons();
}

// ============================================================================
// 이벤트 핸들러 및 편집 액션 함수들
// ============================================================================

function selectRecipeItem(id) {
    selectedRecipeId = id;
    renderRecipeWorkspace();
}

function toggleBulkRecipeCheck(id, checked) {
    if (checked) selectedRecipeIdsForBulk.add(id);
    else selectedRecipeIdsForBulk.delete(id);
    renderRecipeSidebarList();
}

function toggleSelectAllRecipes(checked) {
    if (checked) (recipesData || []).forEach(r => selectedRecipeIdsForBulk.add(r.id));
    else selectedRecipeIdsForBulk.clear();
    renderRecipeSidebarList();
}

function createNewRecipeItem(type = 'PRODUCT') {
    const nextCode = String(100000 + (recipesData.length + 1));
    const isSub = type === 'SUB';
    const newRc = ensureRecipeSchema({
        id: 'rc_' + Date.now(),
        recipeType: isSub ? 'SUB' : 'PRODUCT',
        productCode: nextCode,
        productName: isSub ? '(공장)(반제품)신규반제품' : '신규 제품 레시피',
        divisionWeight: 100,
        customProductionQty: 0,
        packQty: isSub ? 1 : 10,
        sellingPrice: 0,
        lossRatio: 0,
        activeProcesses: ['제1공정'],
        ingredients: [],
        packagingList: [],
        bakingProcess: {},
        updatedAt: getTodayStr()
    });
    recipesData.unshift(newRc);
    selectedRecipeId = newRc.id;
    saveLocalCache();
    renderRecipeWorkspace();
}

function duplicateSelectedRecipe() {
    const src = (recipesData || []).find(r => r.id === selectedRecipeId);
    if (!src) return showToast('복제할 품목을 먼저 선택해 주세요.', 'error');
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = 'rc_' + Date.now();
    copy.productCode = String((parseInt(src.productCode, 10) || 100000) + 1);
    copy.productName = `${src.productName} (복사본)`;
    copy.updatedAt = getTodayStr();
    recipesData.unshift(copy);
    selectedRecipeId = copy.id;
    saveLocalCache();
    renderRecipeWorkspace();
    showToast('레시피가 복제되었습니다.', 'success');
}

function deleteCurrentRecipeItem(id) {
    openConfirmModal('품목 삭제', '선택한 레시피를 삭제하시겠습니까?', () => {
        recipesData = recipesData.filter(r => r.id !== id);
        selectedRecipeId = recipesData[0]?.id || null;
        saveLocalCache();
        renderRecipeWorkspace();
    });
}

function deleteBulkSelectedRecipes() {
    const targets = selectedRecipeIdsForBulk.size > 0
        ? Array.from(selectedRecipeIdsForBulk)
        : (selectedRecipeId ? [selectedRecipeId] : []);
    if (targets.length === 0) return showToast('삭제할 품목을 선택해 주세요.', 'error');
    openConfirmModal('품목 삭제', `선택한 ${targets.length}개 레시피를 삭제하시겠습니까?`, () => {
        recipesData = recipesData.filter(r => !targets.includes(r.id));
        selectedRecipeIdsForBulk.clear();
        if (!recipesData.some(r => r.id === selectedRecipeId)) selectedRecipeId = recipesData[0]?.id || null;
        saveLocalCache();
        renderRecipeWorkspace();
    });
}

function updateRecipeField(field, val) {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    rc[field] = val;
    rc.updatedAt = getTodayStr();
    saveLocalCache();
    renderRecipeWorkspace();
}

function updateRecipeNumericField(field, val) {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    rc[field] = parseNumericCell(val);
    rc.updatedAt = getTodayStr();
    saveLocalCache();
    renderRecipeWorkspace();
}

function updateBakingProcess(key, val) {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    ensureRecipeSchema(rc);
    rc.bakingProcess[key] = val;
    rc.updatedAt = getTodayStr();
    saveLocalCache();
}

function promptAddProcessName() {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    const nextNum = (rc.activeProcesses?.length || 0) + 1;
    const name = prompt('추가할 공정명을 입력하세요 (예: 제2공정, 탕종, 토핑, 필링)', `제${nextNum}공정`);
    if (!name || !name.trim()) return;
    const clean = name.trim();
    if (!rc.activeProcesses.includes(clean)) rc.activeProcesses.push(clean);
    saveLocalCache();
    renderRecipeWorkspace();
}

function removeProcessFromRecipe(procName) {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc || rc.activeProcesses.length <= 1) return;
    const fallback = rc.activeProcesses.find(p => p !== procName) || '제1공정';
    (rc.ingredients || []).forEach(ig => { if (ig.process === procName) ig.process = fallback; });
    rc.activeProcesses = rc.activeProcesses.filter(p => p !== procName);
    saveLocalCache();
    renderRecipeWorkspace();
}

function addIngredientToRecipe() {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    const proc = document.getElementById('quickAddProcessSelect')?.value || rc.activeProcesses[0] || '제1공정';
    const rawKey = document.getElementById('quickAddRawSelect')?.value;
    if (!rawKey) return showToast('발주 원재료 목록에서 품목을 선택해 주세요.', 'error');
    const found = getRawMaterialCatalogForRecipe().find(c => c.key === rawKey);
    if (!found) return;

    rc.ingredients.push({
        rowId: 'ri_' + Date.now(),
        rowType: 'RAW',
        process: proc,
        item: found.item,
        itemCode: '',
        origin: '',
        spec: found.spec,
        unit: 'G',
        unitPrice: found.unitPrice,
        specGrams: found.specGrams,
        qty: 1000,
        weightG: 1000,
        seq: 0
    });
    saveLocalCache();
    renderRecipeWorkspace();
}

function addBlankIngredientToRecipe() {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    const proc = document.getElementById('quickAddProcessSelect')?.value || rc.activeProcesses[0] || '제1공정';
    rc.ingredients.push({
        rowId: 'ri_' + Date.now(),
        rowType: 'RAW',
        process: proc,
        item: '식수(물)',
        itemCode: '590001',
        origin: '',
        spec: '1kg',
        unit: 'G',
        unitPrice: 0,
        specGrams: 1000,
        qty: 1000,
        weightG: 1000,
        seq: 0
    });
    saveLocalCache();
    renderRecipeWorkspace();
}

function addSubRecipeToFormula() {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    const proc = document.getElementById('quickAddProcessSelect')?.value || rc.activeProcesses[0] || '제1공정';
    const subId = document.getElementById('quickAddSubRecipeSelect')?.value;
    if (!subId) return showToast('투입할 하위 반제품·충전물 레시피를 선택해 주세요.', 'error');
    const subRc = recipesData.find(r => r.id === subId);
    if (!subRc) return;

    // 순환 참조 검사
    const subEval = evaluateRecipeBaseTotals(subRc, new Set([rc.id]));
    rc.ingredients.push({
        rowId: 'ri_' + Date.now(),
        rowType: 'SUB_RECIPE',
        subRecipeId: subRc.id,
        process: proc,
        item: subRc.productName,
        itemCode: subRc.productCode,
        origin: '',
        unit: 'EA',
        qty: Number((subEval.baseYieldQty || 1).toFixed(2)),
        seq: 0
    });
    saveLocalCache();
    renderRecipeWorkspace();
    showToast(`하위 배합 [${subRc.productName}]이 투입되었습니다.`, 'success');
}

function updateRecipeIngredient(idx, field, val) {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc || !rc.ingredients[idx]) return;
    const ig = rc.ingredients[idx];
    if (field === 'qty' || field === 'weightG') {
        const num = parseNumericCell(val);
        ig.qty = num;
        ig.weightG = num;
    } else if (field === 'unitPrice' || field === 'seq') {
        ig[field] = parseNumericCell(val);
    } else {
        ig[field] = val;
    }
    rc.updatedAt = getTodayStr();
    saveLocalCache();
    renderRecipeWorkspace();
}

function promptIngredientUnitPrice(idx) {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc || !rc.ingredients[idx]) return;
    const ig = rc.ingredients[idx];
    const newSpec = prompt(`[${ig.item}] 기준 구매규격을 입력하세요 (예: 25kg, 20kg, 15kg, 1kg):`, ig.spec || '1kg');
    if (newSpec === null) return;
    const newPrice = prompt(`[${ig.item}] (${newSpec}) 1포/박스당 구매단가(원)를 입력하세요:`, String(ig.unitPrice || 0));
    if (newPrice === null) return;
    ig.spec = newSpec.trim() || '1kg';
    ig.specGrams = parseSpecToGrams(ig.spec);
    ig.unitPrice = parseNumericCell(newPrice);
    saveLocalCache();
    renderRecipeWorkspace();
}

function removeRecipeIngredient(idx) {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    rc.ingredients.splice(idx, 1);
    saveLocalCache();
    renderRecipeWorkspace();
}

function addPackagingRowToRecipe() {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    const selKey = document.getElementById('quickAddPackCatalogSelect')?.value || '';
    if (selKey) {
        const found = getRawMaterialCatalogForRecipe().find(c => c.key === selKey);
        if (found) {
            rc.packagingList.push({
                rowId: 'pk_' + Date.now(),
                name: found.item,
                code: '',
                spec: found.spec,
                unit: 'EA',
                purchasePrice: found.unitPrice,
                specQty: found.specPackQty || 1,
                usedQty: 1,
                packType: 'UNIT'
            });
            saveLocalCache();
            renderRecipeWorkspace();
            return;
        }
    }
    rc.packagingList.push({
        rowId: 'pk_' + Date.now(),
        name: '소비닐 / 외포장박스',
        code: '800001',
        spec: '1,000매',
        unit: 'EA',
        purchasePrice: 100000,
        specQty: 1000,
        usedQty: 1,
        packType: 'UNIT'
    });
    saveLocalCache();
    renderRecipeWorkspace();
}

function updateRecipePackaging(idx, field, val) {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc || !rc.packagingList[idx]) return;
    if (['purchasePrice', 'specQty', 'usedQty'].includes(field)) {
        rc.packagingList[idx][field] = parseNumericCell(val);
    } else {
        rc.packagingList[idx][field] = val;
    }
    saveLocalCache();
    renderRecipeWorkspace();
}

function promptPackagingPrice(idx) {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc || !rc.packagingList[idx]) return;
    const pk = rc.packagingList[idx];
    const p = prompt(`[${pk.name}] 구매단가(원)를 입력하세요:`, String(pk.purchasePrice || 0));
    if (p === null) return;
    const s = prompt(`[${pk.name}] 구매규격 내 입수량(매/개)을 입력하세요 (1매 단가일 경우 1 입력):`, String(pk.specQty || 1));
    if (s === null) return;
    pk.purchasePrice = parseNumericCell(p);
    pk.specQty = Math.max(1, parseNumericCell(s));
    saveLocalCache();
    renderRecipeWorkspace();
}

function removeRecipePackaging(idx) {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    rc.packagingList.splice(idx, 1);
    saveLocalCache();
    renderRecipeWorkspace();
}

// 제품 이미지 업로드 (자동 리사이즈 압축으로 용량 절약)
function handleRecipeImageUpload(files) {
    if (!files || !files[0]) return;
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            const canvas = document.createElement('canvas');
            const maxDim = 420;
            let w = img.width, h = img.height;
            if (w > maxDim || h > maxDim) {
                if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
                else { w = Math.round((w * maxDim) / h); h = maxDim; }
            }
            canvas.width = w; canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            rc.imageData = canvas.toDataURL('image/jpeg', 0.8);
            saveLocalCache();
            renderRecipeDetailPanel();
            showToast('제품 이미지가 등록되었습니다.', 'success');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(files[0]);
}

function clearRecipeImage() {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    rc.imageData = '';
    saveLocalCache();
    renderRecipeDetailPanel();
}

// 푸드디스커버리 스크린샷 속 실제 3단계 계층형(퀸아망생지) 샘플 세트 원클릭 추가 기능
function insertFoodDiscoverySampleSet() {
    if (recipesData.some(r => r.productCode === '100148')) {
        selectedRecipeId = recipesData.find(r => r.productCode === '100148').id;
        renderRecipeWorkspace();
        return showToast('이미 샘플 세트가 등록되어 있어 해당 품목으로 이동했습니다.', 'info');
    }

    const idBaseDough = 'rc_fd_100091';
    const idButterDough = 'rc_fd_100092';
    const idFilling = 'rc_fd_100093';
    const idFinal = 'rc_fd_100148';

    const rcBaseDough = ensureRecipeSchema({
        id: idBaseDough,
        recipeType: 'SUB',
        productCode: '100091',
        productName: '(공장)(반제품)패스츄리기본반죽',
        divisionWeight: 3698,
        customProductionQty: 25,
        packQty: 1,
        sellingPrice: 0,
        lossRatio: 0,
        activeProcesses: ['제1공정'],
        ingredients: [
            { rowId: 's91_1', rowType: 'RAW', process: '제1공정', item: 'T45(포리쉐)', itemCode: '500159', origin: '프랑스산', spec: '25kg', specGrams: 25000, unitPrice: 55000, unit: 'G', qty: 48115, seq: 0 },
            { rowId: 's91_2', rowType: 'RAW', process: '제1공정', item: '에스500키모', itemCode: '500117', origin: '국내산', spec: '20kg', specGrams: 20000, unitPrice: 160000, unit: 'G', qty: 963.29, seq: 0 },
            { rowId: 's91_3', rowType: 'RAW', process: '제1공정', item: '백설꽃소금', itemCode: '500176', origin: '', spec: '20kg', specGrams: 20000, unitPrice: 22626, unit: 'G', qty: 1203.37, seq: 0 },
            { rowId: 's91_4', rowType: 'RAW', process: '제1공정', item: '하얀설탕(백설)', itemCode: '500152', origin: '국내산', spec: '15kg', specGrams: 15000, unitPrice: 20000, unit: 'G', qty: 7227.18, seq: 0 },
            { rowId: 's91_5', rowType: 'RAW', process: '제1공정', item: '낙우밀', itemCode: '500042', origin: '국내산', spec: '1kg', specGrams: 1000, unitPrice: 5355, unit: 'G', qty: 1926.59, seq: 0 },
            { rowId: 's91_6', rowType: 'RAW', process: '제1공정', item: '냉동이스트(고당)', itemCode: '500113', origin: '프랑스산', spec: '3.5kg', specGrams: 3500, unitPrice: 34720, unit: 'G', qty: 963.29, seq: 0 },
            { rowId: 's91_7', rowType: 'RAW', process: '제1공정', item: '전란액(살균)', itemCode: '500036', origin: '국내산', spec: '5kg', specGrams: 5000, unitPrice: 26000, unit: 'G', qty: 2408.73, seq: 0 },
            { rowId: 's91_8', rowType: 'RAW', process: '제1공정', item: '식수(물)', itemCode: '590001', origin: '', spec: '1kg', specGrams: 1000, unitPrice: 0, unit: 'G', qty: 20044, seq: 0 },
            { rowId: 's91_9', rowType: 'RAW', process: '제1공정', item: '앵커버터', itemCode: '500029', origin: '뉴질랜드산', spec: '1kg', specGrams: 1000, unitPrice: 12660, unit: 'G', qty: 2408.73, seq: 0 },
            { rowId: 's91_10', rowType: 'RAW', process: '제1공정', item: '파지', itemCode: '500171', origin: '', spec: '1kg', specGrams: 1000, unitPrice: 0, unit: 'G', qty: 7242.06, seq: 0 }
        ],
        packagingList: []
    });

    const rcButterDough = ensureRecipeSchema({
        id: idButterDough,
        recipeType: 'SUB',
        productCode: '100092',
        productName: '(공장)(반제품)패스츄리버터반죽',
        divisionWeight: 4698,
        customProductionQty: 25,
        packQty: 1,
        sellingPrice: 0,
        lossRatio: 0,
        activeProcesses: ['제1공정'],
        ingredients: [
            { rowId: 's92_1', rowType: 'SUB_RECIPE', subRecipeId: idBaseDough, process: '제1공정', item: '(공장)(반제품)패스츄리기본반죽', itemCode: '100091', unit: 'EA', qty: 25, seq: 0 },
            { rowId: 's92_2', rowType: 'RAW', process: '제1공정', item: '플래차드 드라이 버터', itemCode: '500168', origin: '', spec: '10kg', specGrams: 10000, unitPrice: 167000, unit: 'G', qty: 25000, seq: 0 }
        ],
        packagingList: []
    });

    const rcFilling = ensureRecipeSchema({
        id: idFilling,
        recipeType: 'SUB',
        productCode: '100093',
        productName: '(충전물)퀸아망필링',
        divisionWeight: 1,
        customProductionQty: 35375,
        packQty: 1,
        sellingPrice: 0,
        lossRatio: 0,
        activeProcesses: ['제1공정'],
        ingredients: [
            { rowId: 's93_1', rowType: 'RAW', process: '제1공정', item: '푸드림가는정백당(설탕)', itemCode: '500065', origin: '국내산', spec: '15kg', specGrams: 15000, unitPrice: 20900, unit: 'G', qty: 17500, seq: 0 },
            { rowId: 's93_2', rowType: 'RAW', process: '제1공정', item: '백설꽃소금', itemCode: '500143', origin: '국내산', spec: '20kg', specGrams: 20000, unitPrice: 26900, unit: 'G', qty: 375, seq: 0 },
            { rowId: 's93_3', rowType: 'RAW', process: '제1공정', item: '앵커버터', itemCode: '500029', origin: '뉴질랜드산', spec: '1kg', specGrams: 1000, unitPrice: 12660, unit: 'G', qty: 17500, seq: 0 }
        ],
        packagingList: []
    });

    const rcFinal = ensureRecipeSchema({
        id: idFinal,
        recipeType: 'PRODUCT',
        productCode: '100148',
        productName: '(곤트란)퀸아망생지(막대)_2ea*4pk/box',
        divisionWeight: 1527,
        customProductionQty: 0,
        packQty: 2,
        sellingPrice: 23157,
        lossRatio: 0,
        activeProcesses: ['제1공정'],
        ingredients: [
            { rowId: 'f148_1', rowType: 'SUB_RECIPE', subRecipeId: idButterDough, process: '제1공정', item: '(공장)(반제품)패스츄리버터반죽', itemCode: '100092', unit: 'EA', qty: 25, seq: 0 },
            { rowId: 'f148_2', rowType: 'SUB_RECIPE', subRecipeId: idFilling, process: '제1공정', item: '(충전물)퀸아망필링', itemCode: '100093', unit: 'EA', qty: 35375, seq: 0 }
        ],
        packagingList: [
            { rowId: 'pk148_1', name: '소비닐 45*70*0.05', code: '800002', unit: 'EA', purchasePrice: 100, specQty: 1, usedQty: 0.5 },
            { rowId: 'pk148_2', name: '생지비닐(NY) 40*50*0.05', code: '800004', unit: 'EA', purchasePrice: 102, specQty: 1, usedQty: 1 },
            { rowId: 'pk148_3', name: '유포지 무지(at20)(500*50롤)', code: '800032', unit: 'EA', purchasePrice: 36, specQty: 1, usedQty: 1.25 },
            { rowId: 'pk148_4', name: '1호바게트박스(외포장) 550x370x280', code: '800088', unit: 'EA', purchasePrice: 1227.2, specQty: 1, usedQty: 0.25 }
        ],
        bakingProcess: {
            memo: '4,700g 반죽에 1,415g 필링에 생산수량 4막대'
        }
    });

    recipesData.push(rcFinal, rcFilling, rcButterDough, rcBaseDough);
    selectedRecipeId = idFinal;
    saveLocalCache();
    renderRecipeWorkspace();
    showToast('푸드디스커버리 3단 계층 샘플 세트가 추가되었습니다!', 'success');
}

// ============================================================================
// 구글 스프레드시트 DB 연동 & CSV 내보내기 (기존 스키마 100% 호환)
// ============================================================================

function openRecipeDbModal() {
    document.getElementById('recipeGasUrlInput').value = recipeGasWebAppUrl;
    const m = document.getElementById('recipeDbModal');
    m.classList.remove('hidden');
    m.classList.add('flex');
}

function closeRecipeDbModal() {
    const m = document.getElementById('recipeDbModal');
    m.classList.add('hidden');
    m.classList.remove('flex');
}

function saveRecipeGasUrlConfig() {
    const v = document.getElementById('recipeGasUrlInput').value.trim();
    if (v) {
        recipeGasWebAppUrl = v;
        localStorage.setItem('baroga_recipe_gas_url', v);
        closeRecipeDbModal();
        syncRecipesFromGoogleSheet(true);
    }
}

async function syncRecipesFromGoogleSheet(showMessage = false) {
    if (!recipeGasWebAppUrl) return;
    try {
        const sep = recipeGasWebAppUrl.includes('?') ? '&' : '?';
        const res = await fetchWithTimeout(`${recipeGasWebAppUrl}${sep}action=getAll&t=${Date.now()}`, { method: 'GET' }, 12000);
        const json = await res.json();
        const rows = Array.isArray(json) ? json : (json.data || []);
        if (Array.isArray(rows) && rows.length > 0) {
            recipesData = rows.map(r => {
                let parsedJson = {};
                try { parsedJson = typeof r.ingredientsJson === 'string' ? JSON.parse(r.ingredientsJson) : {}; } catch (e) {}
                const ings = Array.isArray(parsedJson) ? parsedJson : (parsedJson.ingredients || []);
                const pkgs = parsedJson.packagingList || [];
                const procs = parsedJson.activeProcesses || ['제1공정'];
                return ensureRecipeSchema({
                    id: r.id || ('rc_' + Date.now() + Math.random()),
                    recipeType: parsedJson.recipeType || undefined,
                    productCode: String(r.productCode || '100001'),
                    productName: r.productName || '레시피',
                    divisionWeight: parseFloat(r.divisionWeight) || 100,
                    customProductionQty: parseFloat(r.customProductionQty) || 0,
                    packQty: parseFloat(r.packQty) || 1,
                    sellingPrice: parseFloat(r.sellingPrice) || 0,
                    lossRatio: parseFloat(r.lossRatio) || 0,
                    activeProcesses: procs,
                    ingredients: ings,
                    packagingList: pkgs,
                    bakingProcess: parsedJson.bakingProcess || {},
                    imageData: parsedJson.imageData || '',
                    updatedAt: r.updatedAt || getTodayStr()
                });
            });
            selectedRecipeId = recipesData[0]?.id || null;
            saveLocalCache();
            if (activeMasterDomain === 'RECIPE') renderRecipeWorkspace();
            if (showMessage) showToast(`레시피 DB에서 ${recipesData.length}종 불러오기 완료`, 'success');
        }
    } catch (e) {
        if (showMessage) showToast('레시피 DB URL을 확인해 주세요.', 'error');
    }
}

async function pushRecipesToGoogleSheet(silent = false) {
    saveLocalCache();
    if (!recipeGasWebAppUrl) return;
    const payloadRows = (recipesData || []).map(rc => {
        ensureRecipeSchema(rc);
        const m = calculateRecipeMetrics(rc);
        return {
            productCode: rc.productCode,
            productName: rc.productName,
            divisionWeight: rc.divisionWeight,
            customProductionQty: rc.customProductionQty || 0,
            packQty: rc.packQty,
            sellingPrice: rc.sellingPrice,
            lossRatio: rc.lossRatio,
            unitPackCost: Math.round(m.unitPackCost),
            totalPackCost: Math.round(m.totalPackCost),
            productionCost: Math.round(m.productionCost),
            weightTotalG: Math.round(m.weightTotalG),
            ingredientsJson: JSON.stringify({
                recipeType: rc.recipeType,
                activeProcesses: rc.activeProcesses,
                ingredients: rc.ingredients,
                packagingList: rc.packagingList,
                bakingProcess: rc.bakingProcess,
                imageData: rc.imageData || ''
            }),
            updatedAt: rc.updatedAt || getTodayStr(),
            id: rc.id
        };
    });
    try {
        await fetchWithTimeout(recipeGasWebAppUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'replaceAll', data: payloadRows })
        }, 16000);
        if (!silent) showToast('레시피 DB에 저장되었습니다.', 'success');
    } catch (e) {
        try {
            await fetch(recipeGasWebAppUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'replaceAll', data: payloadRows })
            });
            if (!silent) showToast('레시피 DB 저장 요청 완료', 'success');
        } catch (e2) {
            if (!silent) showToast('레시피 DB 저장 실패', 'error');
        }
    }
}

function exportRecipesCsv() {
    let csv = '\uFEFF구분,품목코드,품목명,분할중량(G),생산수량,포장수량,판매금액,원가비율(%),개당원가,판매원가,개별포장,총포장가,생산원가,중량합계(G),충전합계(G)\n';
    (recipesData || []).forEach(rc => {
        const m = calculateRecipeMetrics(rc);
        const typeLabel = rc.recipeType === 'SUB' ? '반제품/충전물' : '완제품';
        csv += `"${typeLabel}","${rc.productCode}","${rc.productName}",${rc.divisionWeight},${m.productQty.toFixed(1)},${rc.packQty},${rc.sellingPrice},${m.costRatioPct.toFixed(2)},${m.unitCost.toFixed(2)},${Math.round(m.salesCost)},${Math.round(m.unitPackCost)},${Math.round(m.totalPackCost)},${m.productionCost.toFixed(2)},${Math.round(m.weightTotalG)},${Math.round(m.fillingWeightG)}\n`;
    });
    triggerCsvDownload(csv, `바로가공장_배합비원가표_${getTodayStr()}.csv`);
}
