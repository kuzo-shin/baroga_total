// ============================================================================
// [VERSION: v3.14 - 2026-11-20 3~5단계 (단가 일괄적용 시 기존 연결·수동고정 보존·포장재 5원 자동보정 제거·규격 인식 경고·반제품 손실률·품목코드 중복 방지·CSV 안전 처리·원가 계산 캐시) / v3.13 2단계 보안 (DB 요청에 접속 코드 첨부) / v3.12 1단계 데이터 손실 방지 (자동 저장 · 저장 응답 확인 · 리비전 충돌 방지 · 사진 분리 저장 · 미저장 수정분 보호 · 샘플추가 버튼 제거)]
// 바로가 공장 통합 관리 시스템 - 레시피 전용 모듈 (recipe.js)
// ============================================================================

const BAROGA_DEFAULT_RECIPE_GAS_URL = "https://script.google.com/macros/s/AKfycbycrRwFx0Ixcj8-xBY7m-IiowUqZ1ByKoqhn5x43IMYDXF1FlsF8tQmIbAaOz6SSbtdVg/exec";
const LEGACY_DUMMY_RECIPE_URL_PART = "AKfycbxR8N2mP9vL4kQ7wT1yU5iO3pA6sD8fG0hJ2kL5zX9cV4bN7mM1qW6eR8tY";

let collapsedSubRecipeNodes = new Set();
let recipeCategoryFilter = 'ALL'; // ALL | PRODUCT | SUB
let recipeRatioMode = 'WEIGHT';   // WEIGHT(중량비%) | BAKERS(베이커스%)
let rawPickerModalSelectedKeys = new Set();
let rawPickerVendorFilter = 'ALL';
let rawPickerScopeFilter = 'RAW'; // RAW(원재료만) | ALL(포장재 포함 전체)

// 레시피 전용 DB URL 초기화 및 기존 더미 URL 자동 교체
(function initRecipeGasUrlDefault() {
    try {
        const saved = localStorage.getItem('baroga_recipe_gas_url') || '';
        if (!saved || saved.includes(LEGACY_DUMMY_RECIPE_URL_PART)) {
            localStorage.setItem('baroga_recipe_gas_url', BAROGA_DEFAULT_RECIPE_GAS_URL);
            recipeGasWebAppUrl = BAROGA_DEFAULT_RECIPE_GAS_URL;
        } else {
            recipeGasWebAppUrl = saved.trim();
        }
    } catch (e) {
        recipeGasWebAppUrl = BAROGA_DEFAULT_RECIPE_GAS_URL;
    }
})();

// 내부 원재료 고유코드 생성기 (화면에는 숨기고 내부 원가 연동 키로 사용)
function generateInternalItemCode(name, spec = '', prefix = 'RM') {
    const seed = `${String(name || '').trim()}||${String(spec || '').trim()}`;
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
    }
    const hex = Math.abs(hash).toString(36).toUpperCase().padStart(5, '0').slice(0, 6);
    return `${prefix}_${hex}`;
}

// 단위/규격 문자열에서 기준 중량(g, ml) 추출
function parseSpecToGrams(specStr) {
    const s = String(specStr || '').toLowerCase().replace(/,/g, '').trim();
    if (!s) return 1000;
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

// [3단계 P4] 규격에서 중량을 읽을 수 있는지 (못 읽으면 parseSpecToGrams가 1kg으로 가정함)
function isSpecWeightParseable(specStr) {
    return /(\d+(?:\.\d+)?)\s*(kg|g|l|ml)/i.test(String(specStr || '').replace(/,/g, ''));
}

function parsePackagingSpecQty() {
    // 원재료 발주서(ordersData)의 포장 부자재 발주단가(amount)는 모두 1EA(낱장/낱개) 단가로 입력되어 있으므로,
    // 품명이나 규격 칸에 `200매` 등이 적혀 있어도 다시 나누지 않고 항상 1EA 기준(1)으로 그대로 반영합니다.
    // (묶음 단가를 직접 나누고 싶을 때만 재료원가 클릭 -> 수동 설정 사용)
    return 1;
}

// 품목명 정규화 헬퍼 (공백·특수기호 제거 및 단어 순서 무관 비교용)
function normalizeRawItemName(str) {
    return String(str || '')
        .toLowerCase()
        .replace(/^[*★●▪•\-\s]+/, '')
        .replace(/\s+/g, '')
        .trim();
}

function normalizeRawItemAlphaNum(str) {
    return String(str || '')
        .toLowerCase()
        .replace(/[^가-힣a-z0-9]/g, '');
}

function extractRawItemTokens(str) {
    return String(str || '')
        .toLowerCase()
        .split(/[^가-힣a-z0-9]+/)
        .filter(t => t.length >= 2 && !/^\d+(kg|g|ml|l|ea|포|매|장|박스|입)$/.test(t));
}

// 원재료 [4. 제품 단가 · 변동 이력]과 100% 동일한 기준(u > 0 일자순 최신 현재단가)으로 카탈로그 및 맵 생성
function getRawMaterialCatalogForRecipe() {
    let sourceOrders = Array.isArray(ordersData) ? ordersData : [];
    if (sourceOrders.length === 0) {
        try {
            const cached = localStorage.getItem('baroga_orders_cache_v18');
            if (cached) {
                const parsed = JSON.parse(cached);
                if (Array.isArray(parsed)) sourceOrders = parsed;
            }
        } catch (e) {}
    }

    const map = {};
    const sortedOrders = [...sourceOrders].sort((a, b) =>
        String(a.date || '').localeCompare(String(b.date || ''))
    );
    sortedOrders.forEach(o => {
        const u = parseFloat(o.amount) || 0;
        const itemName = String(o.colB || '').trim();
        const specName = String(o.colC || '').trim();
        if (u < 0 || !itemName) return;
        const rawKey = `${itemName}||${specName}`;
        const prevEntry = map[rawKey];
        const isZeroCostItem = /^(식수|물|정제수|수돗물|얼음|파지)/.test(itemName);
        // 기존 유상 원재료가 서비스/증정(0원)으로 입고된 경우에는 직전 유효 현재단가를 보존하고, 식수 등 0원 품목은 그대로 등록
        if (u === 0 && prevEntry && prevEntry.unitPrice > 0 && !isZeroCostItem) {
            return;
        }
        const combinedText = `${itemName} ${specName}`;
        const isPack = (
            /비닐|카톤|박스|외포장|내포장|유포지|노루지|유산지|시트지|종이호일|롤백|롤재단|재단|트레이|패드|스티커|라벨|테이프|봉투|실링|필름|용기|슬리브|간지|^랩/.test(combinedText)
            || /\(\s*\d+[\d,]*\s*(매|장)\s*\)/.test(combinedText)
        ) && !/버터|치즈|초콜릿|다이스|앙금|필링|생크림|우유|설탕|밀가루|강력분|박력분|중력분|이스트|소금|전란|난황|난백/.test(itemName);
        const internalCode = generateInternalItemCode(itemName, specName, isPack ? 'PK' : 'RM');
        map[rawKey] = {
            key: rawKey,
            rawKey,
            itemCode: internalCode,
            item: itemName,
            spec: specName,
            vendor: String(o.colA || '').trim(),
            latestDate: o.date || '',
            unitPrice: u,
            specGrams: parseSpecToGrams(specName),
            specPackQty: parsePackagingSpecQty(specName),
            isPackaging: isPack
        };
    });

    // 발주 내역에 식수가 별도 등록되지 않은 경우에도 항상 검색·선택 가능하도록 기본 '식수(물)' 보장
    const hasWater = Object.values(map).some(x => /^(식수|정제수)/.test(x.item));
    if (!hasWater) {
        const wName = '식수(물)';
        const wSpec = '1kg';
        const wKey = `${wName}||${wSpec}`;
        map[wKey] = {
            key: wKey,
            rawKey: wKey,
            itemCode: generateInternalItemCode(wName, wSpec, 'RM'),
            item: wName,
            spec: wSpec,
            vendor: '자체(공장)',
            latestDate: '',
            unitPrice: 0,
            specGrams: 1000,
            specPackQty: 1,
            isPackaging: false
        };
    }

    return Object.values(map).sort((a, b) => a.item.localeCompare(b.item, 'ko'));
}

// [5단계] 성능: 원재료 데이터가 바뀌지 않았으면 단가 카탈로그를 다시 만들지 않음
//  (엠즈 화면이 품목마다 레시피 원가를 계산하며 매번 전체 발주내역을 다시 훑던 문제)
let _rawCatalogCache = null;
function buildRawCatalogLookupMaps() {
    const ver = window.__rawDataVersion || 0;
    const src = Array.isArray(ordersData) ? ordersData : null;
    if (_rawCatalogCache && _rawCatalogCache.ver === ver && _rawCatalogCache.src === src && _rawCatalogCache.len === (src ? src.length : -1)) {
        return _rawCatalogCache.maps;
    }
    const maps = buildRawCatalogLookupMapsUncached();
    _rawCatalogCache = { ver, src, len: src ? src.length : -1, maps };
    return maps;
}
function buildRawCatalogLookupMapsUncached() {
    const list = getRawMaterialCatalogForRecipe();
    const byKey = new Map();
    const byCode = new Map();
    const byName = new Map();
    const byNormName = new Map();
    const byAlphaNum = new Map();

    list.forEach(entry => {
        byKey.set(entry.rawKey, entry);
        byCode.set(entry.itemCode, entry);

        const prev = byName.get(entry.item);
        if (!prev || String(entry.latestDate).localeCompare(String(prev.latestDate)) >= 0) {
            byName.set(entry.item, entry);
        }

        const norm = normalizeRawItemName(entry.item);
        if (norm) {
            const prevN = byNormName.get(norm);
            if (!prevN || String(entry.latestDate).localeCompare(String(prevN.latestDate)) >= 0) {
                byNormName.set(norm, entry);
            }
        }

        const alpha = normalizeRawItemAlphaNum(entry.item);
        if (alpha) {
            const prevA = byAlphaNum.get(alpha);
            if (!prevA || String(entry.latestDate).localeCompare(String(prevA.latestDate)) >= 0) {
                byAlphaNum.set(alpha, entry);
            }
        }
    });

    // 스마트 품목명 매칭 (정확 일치 -> 공백/기호 무시 일치 -> 핵심 토큰 모두 포함 일치)
    const findBestByName = (rawName, specHint = '') => {
        const clean = String(rawName || '').trim();
        if (!clean) return null;
        const exactKey = `${clean}||${String(specHint || '').trim()}`;
        if (byKey.has(exactKey)) return byKey.get(exactKey);
        if (byName.has(clean)) return byName.get(clean);

        const norm = normalizeRawItemName(clean);
        if (norm && byNormName.has(norm)) return byNormName.get(norm);

        const alpha = normalizeRawItemAlphaNum(clean);
        if (alpha && byAlphaNum.has(alpha)) return byAlphaNum.get(alpha);

        // 식수·얼음·파지 등은 정확/정규화 일치만 허용하고 부분 문자열 추정 매칭(예: 물 -> 물엿)은 방지
        if (/^(식수|물|정제수|수돗물|얼음|파지)/.test(clean)) return null;

        // 토큰 순서 무관 매칭 (예: 'T45(포리쉐)' ↔ '포리쉐 T45', '냉동이스트(고당)' ↔ '하이룬델)고당냉동이스트')
        const tokens = extractRawItemTokens(clean);
        if (tokens.length >= 1) {
            let bestHit = null;
            let bestScore = 0;
            list.forEach(cand => {
                const candAlpha = normalizeRawItemAlphaNum(cand.item);
                if (!candAlpha) return;
                const allIncluded = tokens.every(tk => candAlpha.includes(tk));
                if (allIncluded) {
                    const score = tokens.reduce((s, t) => s + t.length, 0) * 100 - Math.abs(candAlpha.length - alpha.length);
                    if (score > bestScore || (score === bestScore && bestHit && String(cand.latestDate).localeCompare(String(bestHit.latestDate)) > 0)) {
                        bestScore = score;
                        bestHit = cand;
                    }
                }
            });
            if (bestHit && (tokens.length >= 2 || alpha.length >= 3)) return bestHit;
        }
        return null;
    };

    return { list, byKey, byCode, byName, byNormName, byAlphaNum, findBestByName };
}

// 원재료 페이지(ordersData) 단가와 레시피 내부코드 실시간 동기화
function syncIngredientWithRawCatalog(ig, lookup) {
    if (!ig || ig.rowType === 'SUB_RECIPE') return null;
    if (!lookup) lookup = buildRawCatalogLookupMaps();

    let matched = null;
    if (ig.rawKey && lookup.byKey.has(ig.rawKey)) {
        matched = lookup.byKey.get(ig.rawKey);
    } else if (ig.itemCode && lookup.byCode.has(ig.itemCode)) {
        matched = lookup.byCode.get(ig.itemCode);
    } else if (ig.item) {
        matched = lookup.findBestByName(ig.item, ig.spec);
    }

    if (matched) {
        ig.rawKey = matched.rawKey;
        if (!ig.itemCode) ig.itemCode = matched.itemCode;
        // 수동 고정 단가(priceSource === 'MANUAL')가 아니면 원재료 페이지 최신 발주단가를 자동 공유
        if (ig.priceSource !== 'MANUAL') {
            ig.unitPrice = matched.unitPrice;
            if (matched.spec) {
                ig.spec = matched.spec;
                ig.specGrams = matched.specGrams;
            }
        }
        return matched;
    } else {
        if (!ig.itemCode) ig.itemCode = generateInternalItemCode(ig.item || '원재료', ig.spec || '', 'RM');
        if (!ig.rawKey && ig.item) ig.rawKey = `${String(ig.item).trim()}||${String(ig.spec || '').trim()}`;
        return null;
    }
}

function syncPackagingWithRawCatalog(pk, lookup) {
    if (!pk) return null;
    if (!lookup) lookup = buildRawCatalogLookupMaps();

    let matched = null;
    if (pk.rawKey && lookup.byKey.has(pk.rawKey)) {
        matched = lookup.byKey.get(pk.rawKey);
    } else if (pk.code && lookup.byCode.has(pk.code)) {
        matched = lookup.byCode.get(pk.code);
    } else if (pk.name) {
        matched = lookup.findBestByName(pk.name, pk.spec);
    }

    // [3단계 P3] '개당 5원 미만이면 규격수량을 1로 바꾸고 수동설정을 해제'하던 자동 보정 제거
    //  (스티커 1,000매 4,000원 = 개당 4원처럼 정상적인 저가 포장재까지 바뀌던 문제)

    if (matched) {
        pk.rawKey = matched.rawKey;
        if (!pk.code) pk.code = matched.itemCode;
        if (pk.priceSource !== 'MANUAL') {
            pk.purchasePrice = matched.unitPrice;
            pk.spec = matched.spec || '';
            pk.specQty = 1;
        }
        return matched;
    } else {
        if (!pk.code) pk.code = generateInternalItemCode(pk.name || '포장재', pk.spec || '', 'PK');
        if (!pk.rawKey && pk.name) pk.rawKey = `${String(pk.name).trim()}||${String(pk.spec || '').trim()}`;
        return null;
    }
}

// 레시피 스키마 표준화 (하위호환 + 내부코드 자동보강)
function ensureRecipeSchema(rc, lookup = null) {
    if (!rc) return null;
    if (!rc.productCode) rc.productCode = getNextUnusedRecipeCode(); // [3단계 P7] 고정값 '100001' 대신 미사용 코드
    if (!rc.productName) rc.productName = '신규 제품 레시피';
    if (!rc.recipeType) {
        rc.recipeType = /(반제품|충전물|필링|앙금|크림|소스|시럽)/.test(rc.productName) ? 'SUB' : 'PRODUCT';
    }
    if (rc.divisionWeight === undefined || rc.divisionWeight === null) rc.divisionWeight = 100;
    if (rc.packQty === undefined || rc.packQty === null) rc.packQty = 1;
    if (rc.sellingPrice === undefined || rc.sellingPrice === null) rc.sellingPrice = 0;
    if (rc.lossRatio === undefined || rc.lossRatio === null) rc.lossRatio = 0;
    if (rc.customProductionQty === undefined) rc.customProductionQty = 0;
    if (!rc.imageData) rc.imageData = '';

    delete rc.activeProcesses;
    if (!Array.isArray(rc.ingredients)) rc.ingredients = [];
    rc.ingredients.forEach((ig, idx) => {
        if (!ig.rowId) ig.rowId = 'ri_' + Date.now() + '_' + idx;
        if (!ig.rowType) ig.rowType = ig.subRecipeId ? 'SUB_RECIPE' : 'RAW';
        if (!ig.origin) ig.origin = '';
        if (!ig.unit) ig.unit = ig.rowType === 'SUB_RECIPE' ? 'EA' : 'G';
        if (ig.qty === undefined || ig.qty === null) ig.qty = parseFloat(ig.weightG ?? ig.g1 ?? 0) || 0;
        if (ig.seq === undefined || ig.seq === null) ig.seq = 0;
        if (ig.unitPrice === undefined || ig.unitPrice === null) ig.unitPrice = 0;
        if (!ig.specGrams) ig.specGrams = parseSpecToGrams(ig.spec || '1kg');
        if (ig.rowType !== 'SUB_RECIPE') {
            syncIngredientWithRawCatalog(ig, lookup);
        } else if (!ig.itemCode && ig.subRecipeId) {
            const sub = (recipesData || []).find(r => r.id === ig.subRecipeId);
            if (sub) ig.itemCode = sub.productCode || '';
        }
    });

    if (!Array.isArray(rc.packagingList)) rc.packagingList = [];
    rc.packagingList.forEach((pk, idx) => {
        if (!pk.rowId) pk.rowId = 'pk_' + Date.now() + '_' + idx;
        if (!pk.unit) pk.unit = 'EA';
        if (pk.purchasePrice === undefined) pk.purchasePrice = 0;
        if (pk.specQty === undefined || pk.specQty <= 0) pk.specQty = 1;
        if (pk.usedQty === undefined) pk.usedQty = 1;
        syncPackagingWithRawCatalog(pk, lookup);
    });

    if (!rc.bakingProcess || typeof rc.bakingProcess !== 'object') rc.bakingProcess = {};
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

// 다단계 하위 반제품/충전물 재귀 평가 (원재료 페이지 단가 실시간 반영)
function evaluateRecipeBaseTotals(rc, visitedIds = new Set(), lookup = null) {
    if (!lookup) lookup = buildRawCatalogLookupMaps();
    ensureRecipeSchema(rc, lookup);
    if (visitedIds.has(rc.id)) {
        return { weightTotalG: 0, netWeightG: 0, fillingWeightG: 0, rawCostTotal: 0, baseYieldQty: 1, itemBreakdown: [] };
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
                const subEval = evaluateRecipeBaseTotals(subRc, nextVisited, lookup);
                let scale = 1;
                const unitUpper = String(ig.unit || 'EA').toUpperCase();
                // [3단계 P6] 반제품은 손실 차감 후 가용중량(netWeightG) 기준으로 사용량 비율을 계산
                //  (손실률 0%면 기존과 동일)
                const subNetG = subEval.netWeightG > 0 ? subEval.netWeightG : subEval.weightTotalG;
                if (unitUpper === 'G' || unitUpper === 'KG') {
                    const targetG = unitUpper === 'KG' ? qty * 1000 : qty;
                    scale = subNetG > 0 ? (targetG / subNetG) : 0;
                } else {
                    if (subEval.weightTotalG > 0 && Math.abs(qty - subEval.weightTotalG) < 1 && subEval.baseYieldQty !== qty) {
                        scale = 1;
                    } else {
                        const baseYield = subEval.baseYieldQty > 0 ? subEval.baseYieldQty : 1;
                        scale = qty / baseYield;
                    }
                }
                const effWeightG = subNetG * scale;
                const effCost = subEval.rawCostTotal * scale;
                const isFilling = /(충전물|필링|앙금|크림|잼)/.test(subRc.productName || ig.item || '');
                weightTotalG += effWeightG;
                if (isFilling) fillingWeightG += effWeightG;
                rawCostTotal += effCost;
                itemBreakdown.push({ ig, subRc, subEval, scale, effWeightG, effCost, linkedRaw: null });
                return;
            }
        }

        const linkedRaw = syncIngredientWithRawCatalog(ig, lookup);
        const unitUpper = String(ig.unit || 'G').toUpperCase();
        const effWeightG = unitUpper === 'KG' ? qty * 1000 : (unitUpper === 'EA' ? qty * (parseFloat(ig.unitWeightG) || 0) : qty);
        const specG = parseFloat(ig.specGrams) || parseSpecToGrams(ig.spec) || 1000;
        const uPrice = parseFloat(ig.unitPrice) || 0;
        const effCost = unitUpper === 'EA'
            ? (uPrice * qty)
            : (specG > 0 ? (uPrice / specG) * effWeightG : 0);

        weightTotalG += effWeightG;
        if (/(충전물|필링|앙금)/.test(ig.item || '')) fillingWeightG += effWeightG;
        rawCostTotal += effCost;
        itemBreakdown.push({ ig, subRc: null, subEval: null, scale: 1, effWeightG, effCost, linkedRaw });
    });

    const divW = parseFloat(rc.divisionWeight) || 0;
    const lossR = Math.max(0, Math.min(99.9, parseFloat(rc.lossRatio) || 0));
    const netWeightG = Math.max(0, weightTotalG * (1 - lossR / 100));
    const autoYield = divW > 0 ? (netWeightG / divW) : 1;
    const customBase = parseFloat(rc.customProductionQty) || 0;
    const baseYieldQty = customBase > 0 ? (customBase * (1 - lossR / 100)) : (autoYield > 0 ? autoYield : 1);

    return { weightTotalG, netWeightG, fillingWeightG, rawCostTotal, baseYieldQty, itemBreakdown };
}

// 제품단가 탭(price.js)에서 동일 품목코드(1순위) 또는 품목명(2순위)의 바로가 출고가(1ea) 조회
function getLinkedProductPriceForRecipe(rc) {
    if (!rc) return null;
    const code = String(rc.productCode || '').trim();
    const name = String(rc.productName || '').trim();
    const rType = rc.recipeType || 'PRODUCT';

    if (typeof window !== 'undefined' && window.barogaProductPriceBridge && typeof window.barogaProductPriceBridge.findPriceByRecipe === 'function') {
        const liveHit = window.barogaProductPriceBridge.findPriceByRecipe(code, name, rType);
        if (liveHit) return liveHit;
    }

    try {
        const cachedStr = localStorage.getItem('baroga_product_price_cache_v1');
        if (cachedStr) {
            const parsed = JSON.parse(cachedStr);
            const rows = Array.isArray(parsed.pkCostRows) ? parsed.pkCostRows : [];
            const dbs = parsed.categoryDbs || {};
            const dbById = new Map();
            const dbByName = new Map();
            Object.values(dbs).forEach(list => {
                (list || []).forEach(p => {
                    if (!p) return;
                    dbById.set(p.id, p);
                    const nm = String(p.productName || '').trim().replace(/\s+/g, '');
                    if (nm) dbByName.set(nm, p);
                });
            });

            const normRcName = name.replace(/\s+/g, '');
            let codeHit = null;
            let nameHit = null;

            rows.forEach(r => {
                if (!r) return;
                const normRowName = String(r.productName || '').trim().replace(/\s+/g, '');
                const dbProd = (r.productId && dbById.get(r.productId)) || dbByName.get(normRowName) || null;
                const effCode = String((dbProd && dbProd.productCode) || r.productCode || '').trim();
                const pkEa = dbProd ? (Number(dbProd.pkQuantityEa) || 0) : 0;
                const relEa = Number(r.releasePriceEa) || 0;
                if (code && effCode && effCode === code && !codeHit) {
                    codeHit = { matched: true, matchedBy: 'CODE', productCode: effCode, productName: r.productName || '', releasePriceEa: relEa, pkQuantityEa: pkEa };
                } else if (rType !== 'SUB' && !effCode && normRcName && normRowName === normRcName && !nameHit) {
                    nameHit = { matched: true, matchedBy: 'NAME', productCode: effCode, productName: r.productName || '', releasePriceEa: relEa, pkQuantityEa: pkEa };
                }
            });
            return codeHit || nameHit || null;
        }
    } catch (e) {}
    return null;
}

// 우측 16개 원가·수율 지표 산출
function calculateRecipeMetrics(rc) {
    const lookup = buildRawCatalogLookupMaps();
    ensureRecipeSchema(rc, lookup);
    const base = evaluateRecipeBaseTotals(rc, new Set(), lookup);
    const weightTotalG = base.weightTotalG;
    const fillingWeightG = base.fillingWeightG;
    const rawMaterialCost = base.rawCostTotal;

    const divW = parseFloat(rc.divisionWeight) || 0;
    const lossR = Math.max(0, Math.min(99.9, parseFloat(rc.lossRatio) || 0));
    const lossWeightG = weightTotalG * (lossR / 100);
    const netWeightG = Math.max(0, weightTotalG - lossWeightG);

    const theoProdQty = divW > 0 ? (weightTotalG / divW) : 0;
    const autoNetProdQty = divW > 0 ? (netWeightG / divW) : 0;
    const isCustomProdQty = (parseFloat(rc.customProductionQty) || 0) > 0;
    // 생산수량 = 손실중량 차감 후 가용중량 ÷ 분할중량 (수기 지정 시 수기 기준수량에서 손실비율 차감)
    const productQty = isCustomProdQty
        ? (parseFloat(rc.customProductionQty) * (1 - lossR / 100))
        : autoNetProdQty;
    const prodQty = productQty;
    const lossAmount = rawMaterialCost * (lossR / 100);

    let unitPackCost = 0;
    (rc.packagingList || []).forEach(pk => {
        syncPackagingWithRawCatalog(pk, lookup);
        const pPrice = parseFloat(pk.purchasePrice) || 0;
        const sQty = parseFloat(pk.specQty) || 1;
        const uQty = parseFloat(pk.usedQty) || 0;
        unitPackCost += sQty > 0 ? (pPrice / sQty) * uQty : 0;
    });

    const packQty = Math.max(1, parseFloat(rc.packQty) || 1);
    const batchPkQty = productQty > 0 ? (productQty / packQty) : 0;
    const packCount = batchPkQty;
    const totalPackCost = packCount * unitPackCost;

    const productionCost = rawMaterialCost + totalPackCost;
    const unitCost = productQty > 0 ? (productionCost / productQty) : 0;
    const salesCost = unitCost * packQty;

    // 판매금액 = 제품단가 탭의 [바로가 출고가(1ea)] × [PK입수] 자동 산출
    const priceLink = getLinkedProductPriceForRecipe(rc);
    const releasePriceEa = priceLink ? (parseFloat(priceLink.releasePriceEa) || 0) : 0;
    const sellingPrice = Math.round(releasePriceEa * packQty);
    rc.sellingPrice = sellingPrice;

    const costRatioPct = sellingPrice > 0 ? ((salesCost / sellingPrice) * 100) : 0;
    const marginRatioPct = sellingPrice > 0 ? (100 - costRatioPct) : 0;

    return {
        priceLink,
        releasePriceEa,
        weightTotalG,
        netWeightG,
        isCustomProdQty,
        flourTotalG: weightTotalG,
        productionCost,
        theoQty: theoProdQty,
        lossAppliedQty: productQty,
        prodQty,
        packQty,
        batchPkQty,
        sellPrice: sellingPrice,
        unitRawCost: productQty > 0 ? (rawMaterialCost / productQty) : 0,
        onePkRawCost: productQty > 0 ? (rawMaterialCost / productQty) * packQty : 0,
        unitPackCost,
        totalPackCost,
        onePkTotalCost: salesCost,
        onePkMargin: sellingPrice - salesCost,
        costRatioPct,
        marginRatioPct,
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

function bindRecipeFormulaTooltipEvents(containerEl) {
    if (!containerEl || containerEl._fdTipBound) return;
    containerEl._fdTipBound = true;

    const getTipEl = () => document.getElementById('fdHoverTip');
    const positionTip = (e, tipEl) => {
        const pad = 12;
        const rect = tipEl.getBoundingClientRect();
        let x = e.clientX + 14;
        let y = e.clientY + 16;
        if (x + rect.width + pad > window.innerWidth) {
            x = Math.max(pad, e.clientX - rect.width - 12);
        }
        if (y + rect.height + pad > window.innerHeight) {
            y = Math.max(pad, e.clientY - rect.height - 12);
        }
        tipEl.style.left = `${x}px`;
        tipEl.style.top = `${y}px`;
    };

    containerEl.addEventListener('mouseover', e => {
        const target = e.target.closest('[data-tip]');
        const tipEl = getTipEl();
        if (!tipEl) return;
        if (!target) {
            tipEl.classList.add('hidden', 'opacity-0');
            return;
        }
        const text = target.getAttribute('data-tip');
        if (!text) {
            tipEl.classList.add('hidden', 'opacity-0');
            return;
        }
        tipEl.textContent = text;
        tipEl.classList.remove('hidden', 'opacity-0');
        positionTip(e, tipEl);
    });

    containerEl.addEventListener('mousemove', e => {
        const tipEl = getTipEl();
        if (!tipEl || tipEl.classList.contains('hidden')) return;
        const target = e.target.closest('[data-tip]');
        if (!target) {
            tipEl.classList.add('hidden', 'opacity-0');
            return;
        }
        positionTip(e, tipEl);
    });

    containerEl.addEventListener('mouseleave', () => {
        const tipEl = getTipEl();
        if (tipEl) tipEl.classList.add('hidden', 'opacity-0');
    });

    containerEl.addEventListener('keydown', () => {
        const tipEl = getTipEl();
        if (tipEl) tipEl.classList.add('hidden', 'opacity-0');
    });
}

// 메인 레시피 워크스페이스 렌더링
function renderRecipeWorkspace() {
    const lookup = buildRawCatalogLookupMaps();
    (recipesData || []).forEach(r => ensureRecipeSchema(r, lookup));
    if (!selectedRecipeId && recipesData.length > 0) selectedRecipeId = recipesData[0].id;

    const mainEl = document.getElementById('recipeMainSection');
    if (!mainEl) return;
    ensureApplyRawPriceHeaderButton();
    mainEl.className = `${activeMasterDomain === 'RECIPE' ? 'flex' : 'hidden'} max-w-[1880px] w-full mx-auto px-3 sm:px-5 py-2 flex-1 flex-col gap-2`;

    if (!document.getElementById('fdThreeColRoot')) {
        mainEl.innerHTML = `
            <style>
                .fd-th { background-color: #EFE2C6; color: #292524; font-weight: 800; font-size: 11px; border: 1px solid #D6C7A9; white-space: nowrap; }
                .fd-td { border: 1px solid #E5E0D8; font-size: 11.5px; }
                .fd-kv-label { background-color: #EFE2C6; color: #292524; font-weight: 800; font-size: 11px; border: 1px solid #D6C7A9; padding: 5px 6px; text-align: center; white-space: nowrap; cursor: help; }
                .fd-kv-val { background-color: #FFFFFF; color: #1C1917; font-weight: 700; font-size: 11.5px; border: 1px solid #DFD9CE; padding: 4px 7px; text-align: right; }
                .fd-kv-val[data-tip] { cursor: help; }
                .fd-kv-val[data-tip]:hover { background-color: #FEFCE8; }
                .fd-kv-input { width: 100%; min-width: 0; text-align: right; font-weight: 800; background: #FFFBEB; border: 1px solid #F59E0B; border-radius: 4px; padding: 1px 5px; font-size: 11.5px; color: #1C1917; }
                .fd-kv-input:focus { outline: 2px solid #D97706; background: #FFFFFF; }
                #fdHoverTip { pointer-events: none; position: fixed; z-index: 9999; max-width: 360px; padding: 7px 10px; border-radius: 10px; background: rgba(28, 25, 23, 0.96); color: #FAFAF9; font-size: 11.5px; line-height: 1.45; font-weight: 600; box-shadow: 0 10px 25px -5px rgba(0,0,0,0.35); border: 1px solid rgba(245, 158, 11, 0.45); white-space: pre-line; transition: opacity 0.08s ease; }
            </style>
            <div id="fdHoverTip" class="hidden opacity-0 no-print"></div>
            <div id="fdThreeColRoot" class="grid grid-cols-1 xl:grid-cols-12 gap-3 xl:items-stretch xl:h-[calc(100vh-196px)] xl:min-h-[530px]">
                <!-- [1] 좌측: 제품내역 (제품 배합비내역과 상하 높이 1:1 일치 + 내부 스크롤) -->
                <div class="xl:col-span-3 xl:h-full bg-white rounded-xl border border-stone-300 shadow-2xs flex flex-col overflow-hidden">
                    <div class="px-3 py-2.5 bg-stone-100 border-b border-stone-300 flex flex-wrap items-center justify-between gap-1.5 shrink-0">
                        <div class="flex items-center gap-1.5">
                            <h3 class="text-xs sm:text-sm font-black text-stone-900">제품내역</h3>
                            <span id="recipeCountSub" class="px-1.5 py-0.5 rounded bg-stone-200 text-stone-700 text-[10px] font-extrabold">0종</span>
                        </div>
                        <div class="flex items-center gap-1">
                            <button type="button" onclick="createNewRecipeItem('PRODUCT')" class="px-2 py-1 rounded-lg text-[11px] font-extrabold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer">+ 완제품</button>
                            <button type="button" onclick="createNewRecipeItem('SUB')" class="px-2 py-1 rounded-lg text-[11px] font-extrabold bg-rose-700 hover:bg-rose-800 text-white cursor-pointer" title="다른 제품에 투입 가능한 반제품·충전물 레시피">+ 반제품</button>
                            <button type="button" onclick="duplicateSelectedRecipe()" class="px-2 py-1 rounded-lg text-[11px] font-bold bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 cursor-pointer">복제</button>
                            <button type="button" onclick="deleteSelectedRecipe()" class="px-2 py-1 rounded-lg text-[11px] font-bold bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 cursor-pointer">삭제</button>
                        </div>
                    </div>
                    <div class="p-2 border-b border-stone-200 bg-stone-50/70 flex flex-col gap-1.5 shrink-0">
                        <div class="grid grid-cols-3 gap-1">
                            <button type="button" onclick="setRecipeCategoryFilter('ALL')" id="rcCat_ALL" class="py-1 rounded text-[11px] font-extrabold bg-stone-900 text-white cursor-pointer">전체</button>
                            <button type="button" onclick="setRecipeCategoryFilter('PRODUCT')" id="rcCat_PRODUCT" class="py-1 rounded text-[11px] font-bold bg-white border border-stone-200 text-stone-600 cursor-pointer">완제품</button>
                            <button type="button" onclick="setRecipeCategoryFilter('SUB')" id="rcCat_SUB" class="py-1 rounded text-[11px] font-bold bg-white border border-stone-200 text-rose-700 cursor-pointer">반제품·충전물</button>
                        </div>
                        <div class="flex items-center gap-1">
                            <input type="text" id="recipeListSearchInput" oninput="renderRecipeSidebarList()" placeholder="품목코드 · 품목명 검색..." class="flex-1 min-w-0 text-xs border border-stone-300 rounded-lg px-2.5 py-1 bg-white focus:outline-none focus:border-amber-500">
                        </div>
                    </div>
                    <div id="recipeSidebarList" class="flex-1 min-h-0 overflow-y-auto max-h-[420px] xl:max-h-none"></div>
                    <div class="px-3 py-1.5 bg-stone-50 border-t border-stone-200 text-[11px] text-stone-500 flex items-center justify-between shrink-0">
                        <span>클릭하여 배합비 조회 · 편집</span>
                        <span class="font-mono text-[10.5px] text-stone-400">스크롤 이동 ↕</span>
                    </div>
                </div>

                <!-- [2] 중앙: 제품 배합비내역 (좌측 제품내역과 동일 높이 · 내부 스크롤) -->
                <div id="fdCenterFormulaPanel" class="xl:col-span-5 xl:h-full bg-white rounded-xl border border-stone-300 shadow-2xs flex flex-col overflow-hidden"></div>

                <!-- [3] 우측: 원가·수율 요약 + 이미지 + 제빵공정 (자연 높이 유지) -->
                <div id="fdRightMetricsPanel" class="xl:col-span-4 xl:self-start flex flex-col gap-2.5"></div>
            </div>

            <!-- [모달] 레시피 원재료 검색 · 다중 투입 팝업 -->
            <div id="rawMaterialPickerModal" onclick="if(event.target===this) closeRawMaterialPickerModal()" class="fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-50 hidden items-center justify-center p-3 sm:p-5">
                <div class="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-stone-300 flex flex-col max-h-[86vh] overflow-hidden text-xs">
                    <div class="px-4 py-3 bg-stone-900 text-white flex items-center justify-between gap-2">
                        <div class="flex items-center gap-2">
                            <i data-lucide="search" class="w-4 h-4 text-amber-400"></i>
                            <div>
                                <h3 class="text-sm font-extrabold">발주 원재료 검색 · 배합비 투입</h3>
                                <p class="text-[11px] text-stone-400">원재료명·거래처·규격·초성(예: ㄱㄹㅂ, ㅇㅋㅂㅌ)으로 검색 후 즉시 투입하거나 여러 개를 체크해 일괄 투입하세요</p>
                            </div>
                        </div>
                        <button type="button" onclick="closeRawMaterialPickerModal()" class="text-stone-400 hover:text-white p-1 cursor-pointer"><i data-lucide="x" class="w-5 h-5"></i></button>
                    </div>

                    <!-- 검색창 & 필터 바 -->
                    <div class="p-3 bg-amber-50/70 border-b border-stone-200 flex flex-wrap items-center gap-2">
                        <div class="relative flex-1 min-w-[220px]">
                            <input type="text" id="rawPickerSearchInput" oninput="renderRawPickerList()" onkeydown="handleRawPickerKeydown(event)" placeholder="품목명 · 거래처 · 규격 · 초성 검색 (예: 포리쉐, 버터, 식수, ㅂㅅㄲㅅㄱ)..." class="w-full h-9 pl-8 pr-8 rounded-xl border-2 border-amber-400 bg-white font-bold text-xs text-stone-900 focus:outline-none focus:border-amber-600">
                            <i data-lucide="search" class="w-4 h-4 text-amber-700 absolute left-2.5 top-2.5"></i>
                            <button type="button" onclick="clearRawPickerSearch()" title="검색어 지우기" class="absolute right-2.5 top-2 text-stone-400 hover:text-stone-700 font-black text-xs cursor-pointer">✕</button>
                        </div>
                        <select id="rawPickerVendorSelect" onchange="rawPickerVendorFilter=this.value; renderRawPickerList();" class="h-9 rounded-xl border border-stone-300 bg-white px-2.5 font-bold text-stone-700 max-w-[160px]">
                            <option value="ALL">전체 거래처</option>
                        </select>
                        <div class="inline-flex rounded-xl border border-stone-300 bg-white p-0.5">
                            <button type="button" id="rawScopeBtn_RAW" onclick="setRawPickerScope('RAW')" class="px-2.5 py-1 rounded-lg font-extrabold text-[11px] bg-stone-900 text-white cursor-pointer">원재료만</button>
                            <button type="button" id="rawScopeBtn_ALL" onclick="setRawPickerScope('ALL')" class="px-2.5 py-1 rounded-lg font-bold text-[11px] text-stone-600 cursor-pointer">전체품목</button>
                        </div>
                    </div>

                    <!-- 검색 결과 리스트 테이블 -->
                    <div class="flex-1 overflow-y-auto min-h-[300px]">
                        <table class="w-full table-fixed border-collapse text-left">
                            <colgroup>
                                <col class="w-[40px]">
                                <col class="w-[15%]">
                                <col class="w-[34%]">
                                <col class="w-[12%]">
                                <col class="w-[14%]">
                                <col class="w-[13%]">
                                <col class="w-[82px]">
                            </colgroup>
                            <thead class="sticky top-0 z-10 shadow-2xs">
                                <tr>
                                    <th class="fd-th py-2 px-2 text-center"><input type="checkbox" id="rawPickerCheckAll" onchange="toggleRawPickerAll(this.checked)" class="rounded cursor-pointer"></th>
                                    <th class="fd-th py-2 px-2.5">거래처</th>
                                    <th class="fd-th py-2 px-2.5">원재료명</th>
                                    <th class="fd-th py-2 px-2 text-center">규격</th>
                                    <th class="fd-th py-2 px-2.5 text-right">최신 발주단가</th>
                                    <th class="fd-th py-2 px-2 text-right">g당 단가</th>
                                    <th class="fd-th py-2 px-2 text-center">즉시투입</th>
                                </tr>
                            </thead>
                            <tbody id="rawPickerTableBody"></tbody>
                        </table>
                    </div>

                    <!-- 하단 액션 바 -->
                    <div class="px-4 py-2.5 bg-stone-100 border-t border-stone-300 flex flex-wrap items-center justify-between gap-2">
                        <div class="flex items-center gap-2 text-[11px] text-stone-600">
                            <span id="rawPickerResultSummary" class="font-bold text-stone-800">총 0종</span>
                            <span>· 행 클릭 시 다중 선택되며, 우측 <strong>[+ 투입]</strong> 클릭 시 1건 즉시 투입 후 창이 유지됩니다.</span>
                        </div>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="closeRawMaterialPickerModal()" class="px-3.5 py-1.5 rounded-xl font-bold bg-white border border-stone-300 text-stone-700 hover:bg-stone-50 cursor-pointer">닫기</button>
                            <button type="button" onclick="commitSelectedRawMaterialsFromModal()" id="rawPickerCommitBtn" class="px-4 py-1.5 rounded-xl font-extrabold bg-amber-600 hover:bg-amber-700 text-white shadow-xs cursor-pointer">선택 품목 일괄 투입 (0건)</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        bindRecipeFormulaTooltipEvents(mainEl);
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

// [1] 좌측 패널: 제품내역 (체크박스 및 배합비 열 완전 제거 -> 품목코드 + 품목명 2열 구성)
function compareRecipeProductCode(a, b) {
    const ca = String(a?.productCode || '').trim();
    const cb = String(b?.productCode || '').trim();
    const cmp = ca.localeCompare(cb, 'ko', { numeric: true, sensitivity: 'base' });
    if (cmp !== 0) return cmp;
    return String(a?.productName || '').localeCompare(String(b?.productName || ''), 'ko');
}

function renderRecipeSidebarList() {
    const dupCodes = getDuplicateRecipeCodes(); // [3단계 P7] 중복 품목코드 표시
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
    }).sort(compareRecipeProductCode);

    listEl.innerHTML = `
        <table class="w-full table-fixed border-collapse text-left">
            <colgroup>
                <col class="w-[74px]">
                <col>
            </colgroup>
            <thead class="sticky top-0 z-10">
                <tr>
                    <th class="fd-th py-1.5 px-2 text-center">품목코드</th>
                    <th class="fd-th py-1.5 px-2.5">품목명</th>
                </tr>
            </thead>
            <tbody>
                ${filtered.length === 0 ? `<tr><td colspan="2" class="py-10 text-center text-xs text-stone-400 font-bold">등록된 품목이 없습니다.</td></tr>` : filtered.map(r => {
                    const active = r.id === selectedRecipeId;
                    const isSub = r.recipeType === 'SUB';
                    return `
                        <tr onclick="selectRecipeItem('${escapeHtml(r.id)}')" class="cursor-pointer transition ${active ? 'bg-amber-100/80 font-extrabold' : 'hover:bg-stone-50'}">
                            <td class="fd-td py-1.5 px-2 text-center font-mono text-[11px] ${dupCodes.has(String(r.productCode || '').trim()) ? 'text-rose-700 font-extrabold bg-rose-50' : 'text-stone-700'} truncate" title="${dupCodes.has(String(r.productCode || '').trim()) ? '품목코드 중복! 엠즈·제품단가 연동이 잘못될 수 있습니다' : ''}">${dupCodes.has(String(r.productCode || '').trim()) ? '⚠' : ''}${escapeHtml(r.productCode)}</td>
                            <td class="fd-td py-1.5 px-2.5 ${isSub ? 'text-rose-700 font-bold' : 'text-stone-900 font-semibold'} truncate" title="${escapeHtml(r.productName)}">
                                ${escapeHtml(r.productName)}
                            </td>
                        </tr>
                    `;
                }).join('')}
            </tbody>
        </table>
    `;
}

// 하위 반제품 트리 재귀 렌더링 (코드 비노출, 깔끔한 품명 표시)
function renderNestedSubRecipeRowsHtml(subRc, parentScale, depth = 1, visited = new Set(), lookup = null) {
    if (!subRc || visited.has(subRc.id) || depth > 5) return '';
    const nextVisited = new Set(visited);
    nextVisited.add(subRc.id);

    const subEval = evaluateRecipeBaseTotals(subRc, visited, lookup);
    const indentPx = depth * 14;
    let html = '';

    subEval.itemBreakdown.forEach(entry => {
            const ig = entry.ig;
            const scaledInputQty = (parseFloat(ig.qty ?? ig.weightG ?? 0) || 0) * parentScale;
            const scaledCost = entry.effCost * parentScale;
            const subFlourG = subEval.itemBreakdown.reduce((acc, x) => acc + ((x.ig.isFlour || isFlourIngredientName(x.ig.item)) ? x.effWeightG : 0), 0);
            const denomG = (recipeRatioMode === 'BAKERS' && subFlourG > 0) ? subFlourG : subEval.weightTotalG;
            const pct = denomG > 0 ? ((entry.effWeightG / denomG) * 100) : 0;

            if (ig.rowType === 'SUB_RECIPE' && entry.subRc) {
                const nodeKey = `${subRc.id}_${ig.rowId}_${depth}`;
                const isCollapsed = collapsedSubRecipeNodes.has(nodeKey);
                html += `
                    <tr class="bg-rose-50/30 hover:bg-rose-50/60">
                        <td class="fd-td py-1 px-2 font-extrabold text-rose-600 truncate" style="padding-left:${indentPx + 8}px" title="${escapeHtml(entry.subRc.productName)} (내부코드: ${escapeHtml(entry.subRc.productCode)})">
                            <button type="button" onclick="toggleSubNodeCollapse('${escapeHtml(nodeKey)}')" class="mr-1 text-[10px] px-1 rounded border border-rose-200 bg-white text-rose-700 cursor-pointer">${isCollapsed ? '+' : '-'}</button>
                            <span onclick="selectRecipeItem('${escapeHtml(entry.subRc.id)}')" class="underline decoration-dotted cursor-pointer">${escapeHtml(entry.subRc.productName)}</span>
                        </td>
                        <td class="fd-td py-1 px-1 text-center text-stone-600 truncate">${escapeHtml(ig.origin || '')}</td>
                        <td class="fd-td py-1 px-1 text-center font-semibold text-stone-700">${escapeHtml(ig.unit || 'EA')}</td>
                        <td class="fd-td py-1 px-1.5 text-right font-bold text-stone-800">${fmtDec(scaledInputQty, 2)}</td>
                        <td class="fd-td py-1 px-1 text-right text-stone-700">${fmtDec(pct, 1)}</td>
                        <td class="fd-td py-1 px-1 text-center text-stone-500">${ig.seq || 0}</td>
                        <td class="fd-td py-1 px-1.5 text-right font-bold text-stone-900">${fmtDec(scaledCost, 1)}</td>
                        <td class="fd-td py-1 px-1 text-center text-[10px] text-stone-400">-</td>
                    </tr>
                `;
                if (!isCollapsed) {
                    html += renderNestedSubRecipeRowsHtml(entry.subRc, parentScale * entry.scale, depth + 1, nextVisited, lookup);
                }
            } else {
                const syncHint = entry.linkedRaw
                    ? `원재료DB 연동됨 (${entry.linkedRaw.spec} · ${formatCurrency(entry.linkedRaw.unitPrice)})`
                    : `기준단가: ${escapeHtml(ig.spec || '1kg')} · ${formatCurrency(ig.unitPrice)}`;
                html += `
                    <tr class="bg-white/80 hover:bg-stone-50 text-stone-700">
                        <td class="fd-td py-1 px-2 font-medium truncate" style="padding-left:${indentPx + 12}px" title="${escapeHtml(ig.item || '')} · ${escapeHtml(syncHint)}">${escapeHtml(ig.item || '')}</td>
                        <td class="fd-td py-1 px-1 text-center text-stone-500 truncate">${escapeHtml(ig.origin || '')}</td>
                        <td class="fd-td py-1 px-1 text-center text-stone-600">${escapeHtml(ig.unit || 'G')}</td>
                        <td class="fd-td py-1 px-1.5 text-right text-stone-800">${fmtDec(scaledInputQty, 2)}</td>
                        <td class="fd-td py-1 px-1 text-right text-stone-600">${fmtDec(pct, 1)}</td>
                        <td class="fd-td py-1 px-1 text-center text-stone-400">${ig.seq || 0}</td>
                        <td class="fd-td py-1 px-1.5 text-right text-stone-800" title="${escapeHtml(syncHint)}">${fmtDec(scaledCost, 1)}</td>
                        <td class="fd-td py-1 px-1 text-center"></td>
                    </tr>
                `;
            }
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

    const lookup = buildRawCatalogLookupMaps();
    ensureRecipeSchema(rc, lookup);
    const m = calculateRecipeMetrics(rc);
    const rawCatalog = lookup.list;
    const rawOnlyList = rawCatalog.filter(c => !c.isPackaging);
    const packOnlyList = rawCatalog.filter(c => c.isPackaging);
    // 포장 키워드에 안 걸린 부자재도 선택 가능하도록 전체 목록 보조 제공
    const packDropdownList = packOnlyList.length > 0 ? packOnlyList : rawCatalog;
    const availableSubRecipes = (recipesData || []).filter(r => r.id !== rc.id).sort(compareRecipeProductCode);

    let formulaRowsHtml = '';
    if (m.itemBreakdown.length === 0) {
        formulaRowsHtml += `
            <tr>
                <td colspan="8" class="fd-td py-6 text-center text-xs text-stone-400 font-bold">상단에서 원재료 또는 반제품·충전물을 선택해 투입해 주세요.</td>
            </tr>
        `;
    }
    m.itemBreakdown.forEach((entry, idx) => {
            const ig = entry.ig;
            const topFlourG = m.itemBreakdown.reduce((acc, x) => acc + ((x.ig.isFlour || isFlourIngredientName(x.ig.item)) ? x.effWeightG : 0), 0);
            const topDenomG = (recipeRatioMode === 'BAKERS' && topFlourG > 0) ? topFlourG : m.weightTotalG;
            const pct = topDenomG > 0 ? ((entry.effWeightG / topDenomG) * 100) : 0;

            if (ig.rowType === 'SUB_RECIPE' && entry.subRc) {
                const nodeKey = `TOP_${rc.id}_${ig.rowId}`;
                const isCollapsed = collapsedSubRecipeNodes.has(nodeKey);
                formulaRowsHtml += `
                    <tr class="bg-rose-50/40 hover:bg-rose-50/80">
                        <td class="fd-td py-1.5 px-2 font-extrabold text-rose-600">
                            <div class="flex items-center gap-1 min-w-0">
                                <button type="button" onclick="toggleSubNodeCollapse('${escapeHtml(nodeKey)}')" class="text-[10px] w-4 h-4 inline-flex items-center justify-center rounded border border-rose-300 bg-white text-rose-700 cursor-pointer shrink-0">${isCollapsed ? '+' : '-'}</button>
                                <span onclick="selectRecipeItem('${escapeHtml(entry.subRc.id)}')" class="underline decoration-dotted cursor-pointer truncate" title="${escapeHtml(entry.subRc.productName)} (클릭 시 해당 반제품 레시피로 이동)">${escapeHtml(entry.subRc.productName)}</span>
                            </div>
                        </td>
                        <td class="fd-td py-1 px-1 text-center"><input type="text" value="${escapeHtml(ig.origin || '')}" onchange="updateRecipeIngredient(${idx}, 'origin', this.value)" class="w-full min-w-0 text-center bg-transparent focus:bg-white focus:outline-amber-500 text-[11px]"></td>
                        <td class="fd-td py-1 px-0.5 text-center">
                            <select onchange="updateRecipeIngredient(${idx}, 'unit', this.value)" class="w-full bg-transparent font-bold text-[11px] text-center text-stone-800 focus:outline-none">
                                <option value="EA" ${ig.unit === 'EA' ? 'selected' : ''}>EA</option>
                                <option value="G" ${ig.unit === 'G' ? 'selected' : ''}>G</option>
                            </select>
                        </td>
                        <td class="fd-td py-1 px-1 text-right bg-amber-50/50">
                            <input type="text" value="${fmtDec(ig.qty, 2)}" onchange="updateRecipeIngredient(${idx}, 'qty', this.value)" class="w-full min-w-0 text-right font-extrabold text-stone-900 bg-transparent focus:bg-white focus:outline-amber-500">
                        </td>
                        <td class="fd-td py-1 px-1 text-right font-bold text-stone-800 cursor-help" data-tip="${escapeHtml(`${recipeRatioMode === 'BAKERS' ? '베이커스(%)' : '중량비(%)'}: ${fmtDec(entry.effWeightG, 1)}g ÷ ${fmtDec(topDenomG, 1)}g × 100 = ${fmtDec(pct, 1)}%`)}">${fmtDec(pct, 1)}</td>
                        <td class="fd-td py-1 px-0.5 text-center"><input type="text" value="${ig.seq || 0}" onchange="updateRecipeIngredient(${idx}, 'seq', this.value)" class="w-full min-w-0 text-center bg-transparent focus:bg-white"></td>
                        <td class="fd-td py-1 px-1.5 text-right font-extrabold text-stone-900 cursor-help" data-tip="${escapeHtml(`반제품 원가: 1배합(${fmtDec(entry.subEval.rawCostTotal, 1)}원) × 배율(${fmtDec(entry.scale, 3)}) = ${fmtDec(entry.effCost, 1)}원`)}">${fmtDec(entry.effCost, 1)}</td>
                        <td class="fd-td py-1 px-0.5 text-center">
                            <button type="button" onclick="removeRecipeIngredient(${idx})" class="text-stone-400 hover:text-rose-600 cursor-pointer"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                        </td>
                    </tr>
                `;
                if (!isCollapsed) {
                    formulaRowsHtml += renderNestedSubRecipeRowsHtml(entry.subRc, entry.scale, 1, new Set([rc.id]), lookup);
                }
            } else {
                // 일반 원재료 행 (코드 입력칸 숨김, 내부코드 및 원재료DB 단가 자동 연동)
                const specGVal = parseFloat(ig.specGrams) || parseSpecToGrams(ig.spec) || 1000;
                const perGramPrice = specGVal > 0 ? ((parseFloat(ig.unitPrice) || 0) / specGVal) : 0;
                const isLinked = Boolean(entry.linkedRaw && ig.priceSource !== 'MANUAL');
                const unitUpperStr = String(ig.unit || 'G').toUpperCase();
                const specWarn = unitUpperStr !== 'EA' && ig.priceSource !== 'MANUAL' && !isSpecWeightParseable(ig.spec);
                const specWarnHtml = specWarn ? `<span class="shrink-0 px-1 rounded bg-rose-100 text-rose-700 text-[9.5px] font-extrabold" title="규격 '${escapeHtml(ig.spec || '없음')}'에서 중량을 읽지 못해 1kg(1,000g)으로 가정해 계산 중입니다. 원재료 발주서 규격을 '20kg', '500g×10'처럼 입력하거나 재료원가를 눌러 직접 설정하세요.">⚠규격</span>` : '';
                const costCalcLine = unitUpperStr === 'EA'
                    ? `${formatCurrency(ig.unitPrice)} × ${fmtDec(ig.qty, 2)}EA = ${fmtDec(entry.effCost, 1)}원`
                    : `(${formatCurrency(ig.unitPrice)} ÷ ${fmtDec(specGVal, 0)}g = ${perGramPrice.toFixed(2)}원/g) × ${fmtDec(entry.effWeightG, 1)}g = ${fmtDec(entry.effCost, 1)}원`;
                const priceTooltip = isLinked
                    ? `[재료원가 계산식] ${costCalcLine}
· 원재료DB 연동 (${entry.linkedRaw.spec} · 클릭 시 개별 설정)`
                    : `[재료원가 계산식] ${costCalcLine}
· 수동단가 (${ig.spec || '1kg'} · 클릭 시 수정/DB복원)`;
                const pctTooltip = `${recipeRatioMode === 'BAKERS' ? '[베이커스(%) 계산식] 투입량 ÷ 가루류 합계 × 100' : '[중량비(%) 계산식] 투입량 ÷ 중량합계 × 100'}
${fmtDec(entry.effWeightG, 1)}g ÷ ${fmtDec(topDenomG, 1)}g × 100 = ${fmtDec(pct, 1)}%`;
                formulaRowsHtml += `
                    <tr class="hover:bg-amber-50/30">
                        <td class="fd-td py-1 px-2 pl-3">
                            <div class="flex items-center gap-1 min-w-0" title="${escapeHtml(ig.item || '')} (내부코드: ${escapeHtml(ig.itemCode || '-')})">
                                <span class="w-1.5 h-1.5 rounded-full shrink-0 ${isLinked ? 'bg-emerald-500' : 'bg-stone-300'}" title="${isLinked ? '원재료 페이지 최신단가 공유중' : '수기/개별 단가'}"></span>${specWarnHtml}
                                <input type="text" value="${escapeHtml(ig.item || '')}" onchange="updateRecipeIngredient(${idx}, 'item', this.value)" class="w-full min-w-0 font-bold text-stone-900 bg-transparent focus:bg-white focus:outline-amber-500 truncate">
                            </div>
                        </td>
                        <td class="fd-td py-1 px-1 text-center"><input type="text" value="${escapeHtml(ig.origin || '')}" placeholder="-" onchange="updateRecipeIngredient(${idx}, 'origin', this.value)" class="w-full min-w-0 text-center text-[11px] text-stone-700 bg-transparent focus:bg-white"></td>
                        <td class="fd-td py-1 px-0.5 text-center">
                            <select onchange="updateRecipeIngredient(${idx}, 'unit', this.value)" class="w-full bg-transparent font-semibold text-[11px] text-center text-stone-700 focus:outline-none">
                                <option value="G" ${ig.unit === 'G' ? 'selected' : ''}>G</option>
                                <option value="EA" ${ig.unit === 'EA' ? 'selected' : ''}>EA</option>
                                <option value="ML" ${ig.unit === 'ML' ? 'selected' : ''}>ML</option>
                            </select>
                        </td>
                        <td class="fd-td py-1 px-1 text-right bg-amber-50/40">
                            <input type="text" value="${fmtDec(ig.qty, 2)}" onchange="updateRecipeIngredient(${idx}, 'qty', this.value)" class="w-full min-w-0 text-right font-extrabold text-stone-900 bg-transparent focus:bg-white focus:outline-amber-500">
                        </td>
                        <td class="fd-td py-1 px-1 text-right text-stone-700 font-semibold cursor-help" data-tip="${escapeHtml(pctTooltip)}">${fmtDec(pct, 1)}</td>
                        <td class="fd-td py-1 px-0.5 text-center"><input type="text" value="${ig.seq || 0}" onchange="updateRecipeIngredient(${idx}, 'seq', this.value)" class="w-full min-w-0 text-center text-stone-600 bg-transparent focus:bg-white"></td>
                        <td class="fd-td py-1 px-1.5 text-right font-bold text-stone-900 cursor-pointer hover:bg-amber-100/50" onclick="promptIngredientUnitPrice(${idx})" data-tip="${escapeHtml(priceTooltip)}">${fmtDec(entry.effCost, 1)}</td>
                        <td class="fd-td py-1 px-0.5 text-center">
                            <button type="button" onclick="removeRecipeIngredient(${idx})" class="text-stone-400 hover:text-rose-600 cursor-pointer"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                        </td>
                    </tr>
                `;
            }
    });

    // 하단: 포장지(1EA제품기준) 섹션 (불필요한 0 표기 및 단가설정 문구 제거, 재료원가 클릭 시 단가 수정 유지)
    formulaRowsHtml += `
        <tr class="bg-stone-100/90">
            <td class="fd-td py-1.5 px-2 font-black text-stone-900 truncate">포장지(1EA제품기준)</td>
            <td class="fd-td py-1.5 px-1"></td>
            <td class="fd-td py-1.5 px-1"></td>
            <td class="fd-td py-1.5 px-1.5"></td>
            <td class="fd-td py-1.5 px-1"></td>
            <td class="fd-td py-1.5 px-1"></td>
            <td class="fd-td py-1.5 px-1.5"></td>
            <td class="fd-td py-1.5 px-1"></td>
        </tr>
    `;

    (rc.packagingList || []).forEach((pk, idx) => {
        const linkedPk = syncPackagingWithRawCatalog(pk, lookup);
        const isPkLinked = Boolean(linkedPk && pk.priceSource !== 'MANUAL');
        const sQty = parseFloat(pk.specQty) || 1;
        const pPrice = parseFloat(pk.purchasePrice) || 0;
        const uQty = parseFloat(pk.usedQty) || 0;
        const rowPackCost = sQty > 0 ? (pPrice / sQty) * uQty : 0;
        formulaRowsHtml += `
            <tr class="hover:bg-rose-50/30">
                <td class="fd-td py-1 px-2 pl-3">
                    <div class="flex items-center gap-1 min-w-0" title="${escapeHtml(pk.name || '')} (내부코드: ${escapeHtml(pk.code || '-')})">
                        <span class="w-1.5 h-1.5 rounded-full shrink-0 ${isPkLinked ? 'bg-emerald-500' : 'bg-rose-300'}" title="${isPkLinked ? '원재료 페이지 최신단가 공유중' : '수기/개별 단가'}"></span>
                        <input type="text" value="${escapeHtml(pk.name || '')}" onchange="updateRecipePackaging(${idx}, 'name', this.value)" class="w-full min-w-0 font-bold text-rose-600 bg-transparent focus:bg-white truncate">
                    </div>
                </td>
                <td class="fd-td py-1 px-1"></td>
                <td class="fd-td py-1 px-0.5 text-center font-semibold text-stone-700">${escapeHtml(pk.unit || 'EA')}</td>
                <td class="fd-td py-1 px-1 text-right bg-amber-50/40">
                    <input type="text" value="${fmtDec(uQty, 3)}" onchange="updateRecipePackaging(${idx}, 'usedQty', this.value)" class="w-full min-w-0 text-right font-extrabold text-stone-900 bg-transparent focus:bg-white">
                </td>
                <td class="fd-td py-1 px-1"></td>
                <td class="fd-td py-1 px-0.5"></td>
                <td class="fd-td py-1 px-1.5 text-right font-bold text-stone-900 cursor-pointer hover:bg-rose-50" onclick="promptPackagingPrice(${idx})" data-tip="${escapeHtml(`[포장재 원가 계산식] (${formatCurrency(pPrice)}${sQty > 1 ? ` ÷ ${sQty}입` : ''}) × 사용수량(${fmtDec(uQty, 3)}EA) = ${fmtDec(rowPackCost, 1)}원
· 클릭하여 단가/입수량 수정`)}">${fmtDec(rowPackCost, 1)}</td>
                <td class="fd-td py-1 px-0.5 text-center">
                    <button type="button" onclick="removeRecipePackaging(${idx})" class="text-stone-400 hover:text-rose-600 cursor-pointer"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button>
                </td>
            </tr>
        `;
    });

    centerEl.innerHTML = `
        <!-- 상단 현재 선택 품목 헤더 -->
        <div class="px-3.5 py-2.5 bg-stone-100 border-b border-stone-300 flex items-center justify-between gap-2 shrink-0">
            <div class="flex items-center gap-1.5 flex-1 min-w-0">
                <h3 class="text-xs sm:text-sm font-black text-stone-900 shrink-0">제품 배합비내역</h3>
                <select onchange="updateRecipeField('recipeType', this.value)" class="text-[11px] font-extrabold rounded-lg px-2 py-1 border shrink-0 ${rc.recipeType === 'SUB' ? 'bg-rose-50 text-rose-700 border-rose-300' : 'bg-white text-stone-800 border-stone-300'}">
                    <option value="PRODUCT" ${rc.recipeType === 'PRODUCT' ? 'selected' : ''}>완제품</option>
                    <option value="SUB" ${rc.recipeType === 'SUB' ? 'selected' : ''}>반제품·충전물</option>
                </select>
                <input type="text" value="${escapeHtml(rc.productCode)}" onchange="updateRecipeField('productCode', this.value)" placeholder="코드" class="w-[74px] shrink-0 text-xs font-mono font-extrabold text-center bg-white border border-stone-300 rounded-lg px-1.5 py-1">
                <input type="text" value="${escapeHtml(rc.productName)}" onchange="updateRecipeField('productName', this.value)" placeholder="품목명 입력" class="flex-1 min-w-0 text-xs sm:text-sm font-black text-stone-900 bg-white border border-stone-300 rounded-lg px-2.5 py-1">
            </div>
        </div>

        <!-- 배합비 투입 컨트롤 박스 (3줄 수직 정렬 그리드 · 줄바꿈 깨짐 방지) -->
        <div class="p-2.5 bg-amber-50/50 border-b border-stone-200 space-y-1.5 text-xs shrink-0">
            <!-- 1열: 원재료 투입 (팝업 검색창 호출 방식) -->
            <div class="flex items-center gap-1.5">
                <div class="w-[132px] shrink-0 h-7 px-2 rounded-lg bg-amber-100/80 border border-amber-300 flex items-center justify-center font-extrabold text-[11px] text-amber-950 whitespace-nowrap">
                    원재료
                </div>
                <button type="button" onclick="openRawMaterialPickerModal()" class="flex-1 min-w-0 h-7 border border-amber-400 hover:border-amber-600 rounded-lg px-2.5 bg-white hover:bg-amber-50/40 flex items-center justify-between text-left transition cursor-pointer group">
                    <span class="flex items-center gap-1.5 min-w-0 truncate font-bold text-[11.5px] text-stone-700 group-hover:text-stone-950">
                        <i data-lucide="search" class="w-3.5 h-3.5 text-amber-600 shrink-0"></i>
                        <span class="truncate">클릭하여 발주 원재료 검색 · 선택 (등록 ${rawOnlyList.length}종)</span>
                    </span>
                    <span class="text-[10px] font-extrabold text-amber-700 bg-amber-100/80 px-1.5 py-0.5 rounded shrink-0 ml-1">검색창 열기</span>
                </button>
                <div class="w-[146px] shrink-0 grid grid-cols-12 gap-1">
                    <button type="button" onclick="openRawMaterialPickerModal()" class="col-span-8 h-7 rounded-lg bg-stone-900 hover:bg-stone-800 text-white font-extrabold text-[11px] cursor-pointer whitespace-nowrap">+ 원재료 검색</button>
                    <button type="button" onclick="addBlankIngredientToRecipe()" title="발주 내역에 없는 원재료 직접 추가" class="col-span-4 h-7 rounded-lg bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold text-[11px] cursor-pointer whitespace-nowrap">수기</button>
                </div>
            </div>

            <!-- 2열: 반제품·충전물 투입 -->
            <div class="flex items-center gap-1.5">
                <div class="w-[132px] shrink-0 h-7 px-2 rounded-lg bg-rose-100/70 border border-rose-200 flex items-center justify-center font-extrabold text-[11px] text-rose-800 whitespace-nowrap">
                    반제품 · 충전물
                </div>
                <select id="quickAddSubRecipeSelect" class="flex-1 min-w-0 h-7 border border-rose-300 rounded-lg px-2 font-bold bg-white text-rose-900 text-[11.5px] truncate">
                    <option value="">하위 반제품 · 충전물 선택 (${availableSubRecipes.length}종)...</option>
                    ${availableSubRecipes.map(sr => `<option value="${escapeHtml(sr.id)}">[${sr.recipeType === 'SUB' ? '반제품' : '완제품'}] ${escapeHtml(sr.productName)}</option>`).join('')}
                </select>
                <div class="w-[146px] shrink-0">
                    <button type="button" onclick="addSubRecipeToFormula()" class="w-full h-7 rounded-lg bg-rose-700 hover:bg-rose-800 text-white font-extrabold text-[11px] cursor-pointer whitespace-nowrap">+ 반제품 투입</button>
                </div>
            </div>

            <!-- 3열: 포장지·부자재 추가 -->
            <div class="flex items-center gap-1.5">
                <div class="w-[132px] shrink-0 h-7 px-2 rounded-lg bg-emerald-100/70 border border-emerald-200 flex items-center justify-center font-extrabold text-[11px] text-emerald-900 whitespace-nowrap">
                    포장지 · 부자재
                </div>
                <select id="quickAddPackCatalogSelect" class="flex-1 min-w-0 h-7 border border-emerald-300 rounded-lg px-2 font-bold bg-white text-emerald-950 text-[11.5px] truncate">
                    <option value="">발주 포장 부자재 선택 (${packDropdownList.length}종)...</option>
                    ${packDropdownList.map(c => `<option value="${escapeHtml(c.key)}">${escapeHtml(c.item)} (${escapeHtml(c.spec)} · ${formatCurrency(c.unitPrice)})</option>`).join('')}
                </select>
                <div class="w-[146px] shrink-0 grid grid-cols-12 gap-1">
                    <button type="button" onclick="addPackagingRowToRecipe(false)" class="col-span-8 h-7 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-[11px] cursor-pointer whitespace-nowrap">+ 포장지 추가</button>
                    <button type="button" onclick="addPackagingRowToRecipe(true)" title="포장 부자재 직접 입력 행 추가" class="col-span-4 h-7 rounded-lg bg-white border border-stone-300 hover:bg-stone-100 text-stone-700 font-bold text-[11px] cursor-pointer whitespace-nowrap">수기</button>
                </div>
            </div>
        </div>

        <!-- 배합비 메인 그리드 (내부 독립 스크롤 · 상하 높이 1:1 고정) -->
        <div class="flex-1 min-h-0 overflow-y-auto max-h-[540px] xl:max-h-none">
            <table class="w-full table-fixed border-collapse text-left">
                <colgroup>
                    <col class="w-[33%]">
                    <col class="w-[11%]">
                    <col class="w-[8%]">
                    <col class="w-[12%]">
                    <col class="w-[9%]">
                    <col class="w-[6%]">
                    <col class="w-[15%]">
                    <col class="w-[6%]">
                </colgroup>
                <thead class="sticky top-0 z-10">
                    <tr>
                        <th class="fd-th py-1.5 px-2">원재료</th>
                        <th class="fd-th py-1.5 px-1 text-center">원산지</th>
                        <th class="fd-th py-1.5 px-1 text-center">단위</th>
                        <th class="fd-th py-1.5 px-1.5 text-right">수량</th>
                        <th onclick="toggleRecipeRatioMode()" title="클릭 시 중량비(%) ⇄ 베이커스(%) 전환" class="fd-th py-1.5 px-1 text-right cursor-pointer hover:bg-amber-200/70 select-none">${recipeRatioMode === 'BAKERS' ? 'B(%)' : '(%)'}⇄</th>
                        <th class="fd-th py-1.5 px-1 text-center">순차</th>
                        <th class="fd-th py-1.5 px-1.5 text-right">재료원가</th>
                        <th class="fd-th py-1.5 px-1 text-center">삭제</th>
                    </tr>
                </thead>
                <tbody>
                    ${formulaRowsHtml}
                </tbody>
            </table>
        </div>
        <div class="px-3 py-1.5 bg-stone-50 border-t border-stone-200 text-[11px] text-stone-500 flex flex-wrap items-center justify-between gap-1 shrink-0">
            <span class="inline-flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>원재료 [4. 제품단가·변동이력] 현재 단가 연동중 (재료원가 클릭 시 개별 설정)</span>
            <span>배합 재료원가 합계: <strong class="text-stone-900">${fmtDec(m.rawMaterialCost, 1)}원</strong></span>
        </div>
    `;

    // [3] 우측 패널: 16항목 요약표(마우스오버 계산식 툴팁 포함) + 제품이미지 + 제빵공정 테이블
    const bp = rc.bakingProcess || {};
    const pkMismatchHint = (m.priceLink && m.priceLink.pkQuantityEa > 0 && Number(m.priceLink.pkQuantityEa) !== Number(rc.packQty))
        ? `
※ 참고: 제품단가 탭 PK입수량은 ${m.priceLink.pkQuantityEa}ea`
        : '';

    const tipDivWeight = `[분할중량(G)] 제품 1개(1EA)당 기준 반죽 분할 중량
· 현재 설정: ${fmtDec(rc.divisionWeight, 2)}g (직접 입력)`;
    const tipProdQty = m.isCustomProdQty
        ? `[생산수량 계산식 · 수기기준 적용]
수기 기준수량(${fmtDec(rc.customProductionQty, 1)}개) × (1 - 손실 ${fmtDec(m.lossRatio, 1)}%) = ${fmtDec(m.prodQty, 1)}개
· 0 입력 시 자동계산((중량합계-손실중량)÷분할중량) 복원`
        : (m.lossRatio > 0
            ? `[생산수량 계산식] (중량합계 - 손실중량) ÷ 분할중량
(${fmtDec(m.weightTotalG, 0)}g - ${fmtDec(m.lossWeightG, 1)}g) ÷ ${fmtDec(rc.divisionWeight, 2)}g = ${fmtDec(m.netWeightG, 1)}g ÷ ${fmtDec(rc.divisionWeight, 2)}g = ${fmtDec(m.prodQty, 2)}개
(손실 전 이론수량: ${fmtDec(m.theoQty, 1)}개)`
            : `[생산수량 계산식] 중량합계 ÷ 분할중량
${fmtDec(m.weightTotalG, 0)}g ÷ ${fmtDec(rc.divisionWeight, 2)}g = ${fmtDec(m.prodQty, 2)}개`);
    const tipPackQty = `[PK입수] 1팩(1PK)당 완제품 입수 수량
· 현재 설정: ${fmtDec(rc.packQty, 1)}개/PK (직접 입력 · 제품단가 탭 PK입수량과 동일)`;
    const tipSellPrice = m.priceLink
        ? (m.releasePriceEa > 0
            ? `[판매금액(1PK) 계산식] 바로가 출고가(1EA) × PK입수
${fmtDec(m.releasePriceEa, 0)}원 × ${fmtDec(rc.packQty, 1)}개 = ${fmtDec(m.sellPrice, 0)}원
· 제품단가 연동: ${m.priceLink.productName}${pkMismatchHint}`
            : `[판매금액(1PK) 계산식] 바로가 출고가(0원) × PK입수(${fmtDec(rc.packQty, 1)}개) = 0원
· 제품단가 탭 [${m.priceLink.productName}] 출고가를 입력해 주세요`)
        : `[판매금액(1PK) 계산식] 바로가 출고가 × PK입수
· 제품단가 탭에 동일 품목코드(${rc.productCode}) 등록 시 자동 연동됩니다`;
    const tipCostRatio = m.sellPrice > 0
        ? `[원가비율(%) 계산식] 판매원가 ÷ 판매금액 × 100
${fmtDec(m.salesCost, 0)}원 ÷ ${fmtDec(m.sellPrice, 0)}원 × 100 = ${fmtDec(m.costRatioPct, 2)}% (마진율 ${fmtDec(m.marginRatioPct, 2)}%)`
        : `[원가비율(%) 계산식] 판매원가 ÷ 판매금액 × 100
· 판매금액이 0원이어서 0%로 표시됩니다`;
    const tipLossRatio = `[손실비율(%)] 믹싱·분할 공정 반죽 손실률 (직접 입력)
· 현재 ${fmtDec(m.lossRatio, 1)}% → 손실중량 ${fmtDec(m.lossWeightG, 1)}g 차감 후 생산수량(${fmtDec(m.prodQty, 1)}개) 산출`;
    const tipLossWeight = `[손실중량(G) 계산식] 중량합계 × 손실비율(%)
${fmtDec(m.weightTotalG, 0)}g × ${fmtDec(m.lossRatio, 1)}% = ${fmtDec(m.lossWeightG, 1)}g
· 실제 가용중량: ${fmtDec(m.weightTotalG, 0)}g - ${fmtDec(m.lossWeightG, 1)}g = ${fmtDec(m.netWeightG, 1)}g`;
    const tipBatchPk = `[1배합 pk수량 계산식] 생산수량 ÷ PK입수
${fmtDec(m.prodQty, 2)}개 ÷ ${fmtDec(m.packQty, 1)}개 = ${fmtDec(m.batchPkQty, 2)} pk`;
    const tipUnitCost = `[개당원가(1EA) 계산식] 원재료비용 ÷ 생산수량
${fmtDec(m.productionCost, 2)}원 ÷ ${fmtDec(m.prodQty, 2)}개 = ${fmtDec(m.unitCost, 2)}원`;
    const tipSalesCost = `[판매원가(1PK) 계산식] 개당원가 × PK입수
${fmtDec(m.unitCost, 2)}원 × ${fmtDec(m.packQty, 1)}개 = ${fmtDec(m.salesCost, 0)}원`;
    const tipLossAmount = `[손실금액 계산식] 배합 재료원가 합계 × 손실비율(%)
${fmtDec(m.rawMaterialCost, 1)}원 × ${fmtDec(m.lossRatio, 1)}% = ${fmtDec(m.lossAmount, 0)}원`;
    const tipUnitPack = `[개별포장(1PK) 계산식] 포장지 부자재(${(rc.packagingList || []).length}종) 원가 합계
= ${fmtDec(m.unitPackCost, 1)}원 (1PK 포장 기준)`;
    const tipTotalPack = `[총 포장가 계산식] 개별포장(1PK) × 1배합 pk수량
${fmtDec(m.unitPackCost, 1)}원 × ${fmtDec(m.batchPkQty, 2)}pk = ${fmtDec(m.totalPackCost, 0)}원`;
    const tipProdCost = `[원재료비용(1배합 총원가) 계산식] 배합 재료원가 합계 + 총 포장가
${fmtDec(m.rawMaterialCost, 1)}원 + ${fmtDec(m.totalPackCost, 1)}원 = ${fmtDec(m.productionCost, 2)}원`;
    const tipWeightTotal = `[중량합계(G) 계산식] 배합 원재료·반제품(${m.itemBreakdown.length}종) 투입중량 합계
= ${fmtDec(m.weightTotalG, 0)}g${m.lossRatio > 0 ? ` (손실 ${fmtDec(m.lossWeightG, 1)}g 제외 시 가용중량 ${fmtDec(m.netWeightG, 1)}g)` : ''}`;
    const tipFillingTotal = `[충전합계(G) 계산식] 충전물·필링·앙금·크림·잼 항목 중량 합계
= ${fmtDec(m.fillingWeightG, 0)}g`;

    rightEl.innerHTML = `
        <div class="bg-white rounded-xl border border-stone-300 shadow-2xs p-2.5">
            <div class="grid grid-cols-1 sm:grid-cols-12 gap-2 items-stretch">
                <div class="sm:col-span-8 overflow-x-auto">
                    <table class="w-full table-fixed border-collapse">
                        <colgroup>
                            <col class="w-[23%]">
                            <col class="w-[25%]">
                            <col class="w-[27%]">
                            <col class="w-[25%]">
                        </colgroup>
                        <tbody>
                            <tr>
                                <td class="fd-kv-label" data-tip="${escapeHtml(tipDivWeight)}">분할중량(G)</td>
                                <td class="fd-kv-val" data-tip="${escapeHtml(tipDivWeight)}"><input type="text" value="${fmtDec(rc.divisionWeight, 2)}" onchange="updateRecipeNumericField('divisionWeight', this.value)" class="fd-kv-input"></td>
                                <td class="fd-kv-label" data-tip="${escapeHtml(tipProdQty)}">생산수량</td>
                                <td class="fd-kv-val" data-tip="${escapeHtml(tipProdQty)}"><input type="text" value="${fmtDec(m.prodQty, 1)}" onchange="updateRecipeNumericField('customProductionQty', this.value)" class="fd-kv-input"></td>
                            </tr>
                            <tr>
                                <td class="fd-kv-label" data-tip="${escapeHtml(tipPackQty)}">PK입수</td>
                                <td class="fd-kv-val" data-tip="${escapeHtml(tipPackQty)}"><input type="text" value="${fmtDec(rc.packQty, 1)}" onchange="updateRecipeNumericField('packQty', this.value)" class="fd-kv-input"></td>
                                <td class="fd-kv-label" data-tip="${escapeHtml(tipSellPrice)}">판매금액</td>
                                <td class="fd-kv-val ${m.releasePriceEa > 0 ? 'bg-emerald-50/40 font-black text-emerald-900' : 'text-stone-400 font-bold'}" data-tip="${escapeHtml(tipSellPrice)}">
                                    <span class="inline-flex items-center justify-end gap-1 w-full">
                                        ${m.releasePriceEa > 0 ? '<span class="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>' : ''}
                                        <span>${fmtDec(m.sellPrice, 0)}</span>
                                    </span>
                                </td>
                            </tr>
                            <tr>
                                <td class="fd-kv-label" data-tip="${escapeHtml(tipCostRatio)}">원가비율(%)</td>
                                <td class="fd-kv-val font-black ${m.costRatioPct >= 70 ? 'text-rose-600' : 'text-blue-700'}" data-tip="${escapeHtml(tipCostRatio)}">${fmtDec(m.costRatioPct, 2)}</td>
                                <td class="fd-kv-label" data-tip="${escapeHtml(tipLossRatio)}">손실비율(%)</td>
                                <td class="fd-kv-val" data-tip="${escapeHtml(tipLossRatio)}"><input type="text" value="${fmtDec(rc.lossRatio, 1)}" onchange="updateRecipeNumericField('lossRatio', this.value)" class="fd-kv-input"></td>
                            </tr>
                            <tr>
                                <td class="fd-kv-label" data-tip="${escapeHtml(tipLossWeight)}">손실중량(G)</td>
                                <td class="fd-kv-val" data-tip="${escapeHtml(tipLossWeight)}">${fmtDec(m.lossWeightG, 1)}</td>
                                <td class="fd-kv-label" data-tip="${escapeHtml(tipBatchPk)}">1배합 pk수량</td>
                                <td class="fd-kv-val font-extrabold text-stone-900" data-tip="${escapeHtml(tipBatchPk)}">${fmtDec(m.batchPkQty, 1)}</td>
                            </tr>
                            <tr>
                                <td class="fd-kv-label" data-tip="${escapeHtml(tipUnitCost)}">개당원가</td>
                                <td class="fd-kv-val font-extrabold" data-tip="${escapeHtml(tipUnitCost)}">${fmtDec(m.unitCost, 2)}</td>
                                <td class="fd-kv-label" data-tip="${escapeHtml(tipSalesCost)}">판매원가</td>
                                <td class="fd-kv-val font-black text-amber-900" data-tip="${escapeHtml(tipSalesCost)}">${fmtDec(m.salesCost, 0)}</td>
                            </tr>
                            <tr>
                                <td class="fd-kv-label" data-tip="${escapeHtml(tipLossAmount)}">손실금액</td>
                                <td class="fd-kv-val" data-tip="${escapeHtml(tipLossAmount)}">${fmtDec(m.lossAmount, 0)}</td>
                                <td class="fd-kv-label" data-tip="${escapeHtml(tipUnitPack)}">개별포장</td>
                                <td class="fd-kv-val" data-tip="${escapeHtml(tipUnitPack)}">${fmtDec(m.unitPackCost, 0)}</td>
                            </tr>
                            <tr>
                                <td class="fd-kv-label" data-tip="${escapeHtml(tipTotalPack)}">총 포장가</td>
                                <td class="fd-kv-val" data-tip="${escapeHtml(tipTotalPack)}">${fmtDec(m.totalPackCost, 0)}</td>
                                <td class="fd-kv-label" data-tip="${escapeHtml(tipProdCost)}">원재료비용</td>
                                <td class="fd-kv-val font-black text-stone-900" data-tip="${escapeHtml(tipProdCost)}">${fmtDec(m.productionCost, 2)}</td>
                            </tr>
                            <tr>
                                <td class="fd-kv-label" data-tip="${escapeHtml(tipWeightTotal)}">중량합계(G)</td>
                                <td class="fd-kv-val font-extrabold text-stone-900" data-tip="${escapeHtml(tipWeightTotal)}">${fmtDec(m.weightTotalG, 0)}</td>
                                <td class="fd-kv-label" data-tip="${escapeHtml(tipFillingTotal)}">충전합계(G)</td>
                                <td class="fd-kv-val" data-tip="${escapeHtml(tipFillingTotal)}">${fmtDec(m.fillingWeightG, 0)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <!-- 제품이미지 영역 -->
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

        <!-- 하단: 제빵공정 테이블 -->
        <div class="bg-white rounded-xl border border-stone-300 shadow-2xs p-2.5">
            <h4 class="text-xs sm:text-sm font-black text-stone-900 mb-2 px-0.5">제빵공정</h4>
            <div class="overflow-x-auto">
                <table class="w-full table-fixed border-collapse text-xs">
                    <colgroup>
                        <col class="w-[14%]">
                        <col class="w-[16%]">
                        <col class="w-[16%]">
                        <col class="w-[18%]">
                        <col class="w-[36%]">
                    </colgroup>
                    <tbody>
                        <tr>
                            <td rowspan="3" class="fd-kv-label">믹싱</td>
                            <td class="fd-kv-label">저속(분)</td>
                            <td class="fd-td p-1"><input type="text" value="${escapeHtml(bp.mixLow)}" onchange="updateBakingProcess('mixLow', this.value)" class="w-full min-w-0 text-center font-bold focus:outline-amber-500"></td>
                            <td class="fd-kv-label">반죽온도(°C)</td>
                            <td class="fd-td p-1"><input type="text" value="${escapeHtml(bp.doughTemp)}" onchange="updateBakingProcess('doughTemp', this.value)" class="w-full min-w-0 text-center font-bold focus:outline-amber-500"></td>
                        </tr>
                        <tr>
                            <td class="fd-kv-label">중속(분)</td>
                            <td class="fd-td p-1"><input type="text" value="${escapeHtml(bp.mixMid)}" onchange="updateBakingProcess('mixMid', this.value)" class="w-full min-w-0 text-center font-bold focus:outline-amber-500"></td>
                            <td class="fd-kv-label">1차발효(분)</td>
                            <td class="fd-td p-1"><input type="text" value="${escapeHtml(bp.ferm1Time)}" onchange="updateBakingProcess('ferm1Time', this.value)" class="w-full min-w-0 text-center font-bold focus:outline-amber-500"></td>
                        </tr>
                        <tr>
                            <td class="fd-kv-label">고속(분)</td>
                            <td class="fd-td p-1"><input type="text" value="${escapeHtml(bp.mixHigh)}" onchange="updateBakingProcess('mixHigh', this.value)" class="w-full min-w-0 text-center font-bold focus:outline-amber-500"></td>
                            <td class="fd-kv-label">벤치타임(분)</td>
                            <td class="fd-td p-1"><input type="text" value="${escapeHtml(bp.benchTime)}" onchange="updateBakingProcess('benchTime', this.value)" class="w-full min-w-0 text-center font-bold focus:outline-amber-500"></td>
                        </tr>
                        <tr>
                            <td rowspan="3" class="fd-kv-label">2차발효</td>
                            <td class="fd-kv-label">온도(°C)</td>
                            <td class="fd-td p-1"><input type="text" value="${escapeHtml(bp.ferm2Temp)}" onchange="updateBakingProcess('ferm2Temp', this.value)" class="w-full min-w-0 text-center font-bold focus:outline-amber-500"></td>
                            <td rowspan="6" class="fd-kv-label">메모</td>
                            <td rowspan="6" class="fd-td p-1.5 align-top">
                                <textarea onchange="updateBakingProcess('memo', this.value)" placeholder="특이사항 작성" class="w-full h-36 resize-none text-xs font-semibold text-stone-800 leading-relaxed focus:outline-none">${escapeHtml(bp.memo)}</textarea>
                            </td>
                        </tr>
                        <tr>
                            <td class="fd-kv-label">습도(%)</td>
                            <td class="fd-td p-1"><input type="text" value="${escapeHtml(bp.ferm2Humid)}" onchange="updateBakingProcess('ferm2Humid', this.value)" class="w-full min-w-0 text-center font-bold focus:outline-amber-500"></td>
                        </tr>
                        <tr>
                            <td class="fd-kv-label">시간(분)</td>
                            <td class="fd-td p-1"><input type="text" value="${escapeHtml(bp.ferm2Time)}" onchange="updateBakingProcess('ferm2Time', this.value)" class="w-full min-w-0 text-center font-bold focus:outline-amber-500"></td>
                        </tr>
                        <tr>
                            <td rowspan="2" class="fd-kv-label">오븐온도</td>
                            <td class="fd-kv-label">상(°C)</td>
                            <td class="fd-td p-1"><input type="text" value="${escapeHtml(bp.ovenTop)}" onchange="updateBakingProcess('ovenTop', this.value)" class="w-full min-w-0 text-center font-bold focus:outline-amber-500"></td>
                        </tr>
                        <tr>
                            <td class="fd-kv-label">하(°C)</td>
                            <td class="fd-td p-1"><input type="text" value="${escapeHtml(bp.ovenBottom)}" onchange="updateBakingProcess('ovenBottom', this.value)" class="w-full min-w-0 text-center font-bold focus:outline-amber-500"></td>
                        </tr>
                        <tr>
                            <td colspan="2" class="fd-kv-label">굽는시간(분)</td>
                            <td class="fd-td p-1"><input type="text" value="${escapeHtml(bp.bakeTime)}" onchange="updateBakingProcess('bakeTime', this.value)" class="w-full min-w-0 text-center font-bold focus:outline-amber-500"></td>
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

// [3단계 P7] 품목코드 중복 방지: 기존 숫자 코드 중 가장 큰 값 + 1
function getNextUnusedRecipeCode(base = 100000) {
    const used = new Set((recipesData || []).map(r => String(r.productCode || '').trim()));
    let maxNum = base;
    used.forEach(c => { if (/^\d+$/.test(c)) maxNum = Math.max(maxNum, parseInt(c, 10)); });
    let next = maxNum + 1;
    while (used.has(String(next))) next++;
    return String(next);
}
function getDuplicateRecipeCodes() {
    const cnt = {};
    (recipesData || []).forEach(r => { const c = String(r.productCode || '').trim(); if (c) cnt[c] = (cnt[c] || 0) + 1; });
    return new Set(Object.keys(cnt).filter(c => cnt[c] > 1));
}

function createNewRecipeItem(type = 'PRODUCT') {
    const nextCode = getNextUnusedRecipeCode();
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
        ingredients: [],
        packagingList: [],
        bakingProcess: {},
        updatedAt: getTodayStr()
    });
    recipesData.unshift(newRc);
    selectedRecipeId = newRc.id;
    persistRecipeChange();
    renderRecipeWorkspace();
}

function duplicateSelectedRecipe() {
    const src = (recipesData || []).find(r => r.id === selectedRecipeId);
    if (!src) return showToast('복제할 품목을 먼저 선택해 주세요.', 'error');
    const copy = JSON.parse(JSON.stringify(src));
    copy.id = 'rc_' + Date.now();
    copy.productCode = getNextUnusedRecipeCode();
    copy.productName = `${src.productName} (복사본)`;
    copy.updatedAt = getTodayStr();
    recipesData.unshift(copy);
    selectedRecipeId = copy.id;
    persistRecipeChange();
    renderRecipeWorkspace();
    showToast('레시피가 복제되었습니다.', 'success');
}

function deleteSelectedRecipe() {
    const target = (recipesData || []).find(r => r.id === selectedRecipeId);
    if (!target) return showToast('삭제할 품목을 먼저 선택해 주세요.', 'error');
    openConfirmModal('품목 삭제', `[${target.productName}] 레시피를 삭제하시겠습니까?`, () => {
        recipesData = recipesData.filter(r => r.id !== target.id);
        selectedRecipeId = recipesData[0]?.id || null;
        persistRecipeChange();
        renderRecipeWorkspace();
    });
}

function deleteCurrentRecipeItem(id) {
    selectedRecipeId = id;
    deleteSelectedRecipe();
}

function updateRecipeField(field, val) {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    if (field === 'productCode') {
        const code = String(val || '').trim();
        const dup = (recipesData || []).find(r => r.id !== rc.id && String(r.productCode || '').trim() === code);
        if (!code) { showToast('품목코드는 비워둘 수 없습니다.', 'error'); renderRecipeWorkspace(); return; }
        if (dup) { showToast(`품목코드 ${code}는 이미 [${dup.productName}]에서 사용 중입니다. 다른 코드를 입력하세요.`, 'error'); renderRecipeWorkspace(); return; }
        val = code;
    }
    rc[field] = val;
    rc.updatedAt = getTodayStr();
    persistRecipeChange();
    renderRecipeWorkspace();
}

function updateRecipeNumericField(field, val) {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    const rawStr = String(val ?? '').trim();
    const num = parseNumericCell(val);

    if (field === 'customProductionQty') {
        if (rawStr === '' || num <= 0) {
            rc.customProductionQty = 0;
        } else {
            const base = evaluateRecipeBaseTotals(rc);
            const divW = parseFloat(rc.divisionWeight) || 0;
            const lossR = Math.max(0, Math.min(99.9, parseFloat(rc.lossRatio) || 0));
            const netW = Math.max(0, base.weightTotalG * (1 - lossR / 100));
            const autoNetQty = divW > 0 ? (netW / divW) : 0;
            // 자동 산출 수량과 사실상 동일한 값이면 자동 계산 모드(0) 유지
            if (autoNetQty > 0 && Math.abs(num - autoNetQty) < 0.08) {
                rc.customProductionQty = 0;
            } else {
                rc.customProductionQty = lossR > 0 ? (num / (1 - lossR / 100)) : num;
            }
        }
    } else {
        rc[field] = num;
    }

    rc.updatedAt = getTodayStr();
    persistRecipeChange();
    renderRecipeWorkspace();
    if (typeof window.refreshProductPriceRecipeLinks === 'function') {
        window.refreshProductPriceRecipeLinks();
    }
}

function updateBakingProcess(key, val) {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    ensureRecipeSchema(rc);
    rc.bakingProcess[key] = val;
    rc.updatedAt = getTodayStr();
    persistRecipeChange();
}


// 한글 초성 추출기 (예: '포리쉐' -> 'ㅍㄹㅅ', '앵커버터' -> 'ㅇㅋㅂㅌ')
function extractKoreanChosung(str) {
    const CHO = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
    let out = '';
    const s = String(str || '');
    for (let i = 0; i < s.length; i++) {
        const code = s.charCodeAt(i) - 44032;
        if (code >= 0 && code <= 11171) out += CHO[Math.floor(code / 588)];
        else out += s[i].toLowerCase();
    }
    return out;
}

function getFilteredRawPickerItems() {
    const allCatalog = getRawMaterialCatalogForRecipe();
    const qRaw = (document.getElementById('rawPickerSearchInput')?.value || '').trim().toLowerCase();
    const qNoSpace = qRaw.replace(/\s+/g, '');
    const vendorF = rawPickerVendorFilter || 'ALL';

    return allCatalog.filter(c => {
        if (rawPickerScopeFilter === 'RAW' && c.isPackaging) return false;
        if (vendorF !== 'ALL' && c.vendor !== vendorF) return false;
        if (!qNoSpace) return true;
        const target = `${c.item} ${c.vendor} ${c.spec}`.toLowerCase();
        const targetNoSpace = target.replace(/\s+/g, '');
        if (targetNoSpace.includes(qNoSpace)) return true;
        const chosung = extractKoreanChosung(targetNoSpace);
        return chosung.includes(qNoSpace);
    });
}

function openRawMaterialPickerModal() {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return showToast('먼저 좌측 제품내역에서 레시피를 선택해 주세요.', 'error');

    rawPickerModalSelectedKeys.clear();
    const modal = document.getElementById('rawMaterialPickerModal');
    if (!modal) return;

    // 거래처 필터 옵션 최신화
    const allCatalog = getRawMaterialCatalogForRecipe();
    const vendors = Array.from(new Set(allCatalog.map(c => c.vendor).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'ko'));
    const vSel = document.getElementById('rawPickerVendorSelect');
    if (vSel) {
        vSel.innerHTML = `<option value="ALL">전체 거래처 (${vendors.length})</option>` +
            vendors.map(v => `<option value="${escapeHtml(v)}" ${v === rawPickerVendorFilter ? 'selected' : ''}>${escapeHtml(v)}</option>`).join('');
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    renderRawPickerList();
    if (window.lucide) lucide.createIcons();

    setTimeout(() => {
        const inp = document.getElementById('rawPickerSearchInput');
        if (inp) { inp.focus(); inp.select(); }
    }, 40);
}

function closeRawMaterialPickerModal() {
    const modal = document.getElementById('rawMaterialPickerModal');
    if (!modal) return;
    modal.classList.add('hidden');
    modal.classList.remove('flex');
}

function clearRawPickerSearch() {
    const inp = document.getElementById('rawPickerSearchInput');
    if (inp) {
        inp.value = '';
        inp.focus();
    }
    renderRawPickerList();
}

function setRawPickerScope(scope) {
    rawPickerScopeFilter = scope;
    const btnRaw = document.getElementById('rawScopeBtn_RAW');
    const btnAll = document.getElementById('rawScopeBtn_ALL');
    if (btnRaw) btnRaw.className = scope === 'RAW' ? 'px-2.5 py-1 rounded-lg font-extrabold text-[11px] bg-stone-900 text-white cursor-pointer' : 'px-2.5 py-1 rounded-lg font-bold text-[11px] text-stone-600 cursor-pointer';
    if (btnAll) btnAll.className = scope === 'ALL' ? 'px-2.5 py-1 rounded-lg font-extrabold text-[11px] bg-stone-900 text-white cursor-pointer' : 'px-2.5 py-1 rounded-lg font-bold text-[11px] text-stone-600 cursor-pointer';
    renderRawPickerList();
}

function handleRawPickerKeydown(e) {
    if (e.key === 'Escape') {
        closeRawMaterialPickerModal();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const filtered = getFilteredRawPickerItems();
        if (rawPickerModalSelectedKeys.size > 0) {
            commitSelectedRawMaterialsFromModal();
        } else if (filtered.length === 1) {
            quickAddSingleRawFromModal(filtered[0].key);
            closeRawMaterialPickerModal();
        }
    }
}

function renderRawPickerList() {
    const tbody = document.getElementById('rawPickerTableBody');
    const summaryEl = document.getElementById('rawPickerResultSummary');
    const commitBtn = document.getElementById('rawPickerCommitBtn');
    const chkAll = document.getElementById('rawPickerCheckAll');
    if (!tbody) return;

    const rc = recipesData.find(r => r.id === selectedRecipeId);
    const existingKeys = new Set((rc?.ingredients || []).filter(ig => ig.rowType !== 'SUB_RECIPE').map(ig => ig.rawKey || `${ig.item}||${ig.spec || ''}`));
    const filtered = getFilteredRawPickerItems();

    if (summaryEl) summaryEl.textContent = `검색 결과 ${filtered.length}종`;
    if (commitBtn) commitBtn.textContent = `선택 품목 일괄 투입 (${rawPickerModalSelectedKeys.size}건)`;
    if (chkAll) chkAll.checked = filtered.length > 0 && filtered.every(c => rawPickerModalSelectedKeys.has(c.key));

    if (filtered.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" class="py-12 text-center text-stone-400 font-bold text-xs">조건에 일치하는 발주 원재료가 없습니다.</td></tr>`;
        return;
    }

    tbody.innerHTML = filtered.map((c, idx) => {
        const checked = rawPickerModalSelectedKeys.has(c.key);
        const alreadyIn = existingKeys.has(c.rawKey);
        const perG = c.specGrams > 0 ? (c.unitPrice / c.specGrams) : 0;
        return `
            <tr onclick="toggleRawPickerRowByIdx(${idx})" class="cursor-pointer transition border-b border-stone-100 ${checked ? 'bg-amber-100/70' : 'hover:bg-amber-50/40'}">
                <td class="fd-td py-2 px-2 text-center" onclick="event.stopPropagation()">
                    <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleRawPickerRowByIdx(${idx}, this.checked)" class="rounded cursor-pointer">
                </td>
                <td class="fd-td py-2 px-2.5 font-semibold text-stone-600 truncate" title="${escapeHtml(c.vendor || '-')}">${escapeHtml(c.vendor || '-')}</td>
                <td class="fd-td py-2 px-2.5 font-extrabold text-stone-900 truncate" title="${escapeHtml(c.item)}">
                    <span>${escapeHtml(c.item)}</span>
                    ${alreadyIn ? `<span class="ml-1 px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">투입됨</span>` : ''}
                </td>
                <td class="fd-td py-2 px-2 text-center text-stone-600 truncate">${escapeHtml(c.spec || '-')}</td>
                <td class="fd-td py-2 px-2.5 text-right font-bold text-stone-900">${formatCurrency(c.unitPrice)}</td>
                <td class="fd-td py-2 px-2 text-right text-stone-500 font-mono text-[11px]">${perG.toFixed(2)}원/g</td>
                <td class="fd-td py-1.5 px-2 text-center" onclick="event.stopPropagation()">
                    <button type="button" onclick="quickAddSingleRawByIdx(${idx})" class="px-2.5 py-1 rounded-lg bg-stone-900 hover:bg-amber-600 text-white font-extrabold text-[11px] transition cursor-pointer whitespace-nowrap">+ 투입</button>
                </td>
            </tr>
        `;
    }).join('');
}

function toggleRawPickerRowByIdx(idx, explicitState) {
    const filtered = getFilteredRawPickerItems();
    const target = filtered[idx];
    if (!target) return;
    const shouldSelect = explicitState !== undefined ? explicitState : !rawPickerModalSelectedKeys.has(target.key);
    if (shouldSelect) rawPickerModalSelectedKeys.add(target.key);
    else rawPickerModalSelectedKeys.delete(target.key);
    renderRawPickerList();
}

function toggleRawPickerAll(checked) {
    const filtered = getFilteredRawPickerItems();
    filtered.forEach(c => {
        if (checked) rawPickerModalSelectedKeys.add(c.key);
        else rawPickerModalSelectedKeys.delete(c.key);
    });
    renderRawPickerList();
}

function pushCatalogItemToRecipe(rc, found) {
    rc.ingredients.push({
        rowId: 'ri_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        rowType: 'RAW',
        rawKey: found.rawKey,
        itemCode: found.itemCode,
        priceSource: 'RAW_DB',
        item: found.item,
        origin: '',
        spec: found.spec,
        unit: 'G',
        unitPrice: found.unitPrice,
        specGrams: found.specGrams,
        qty: 1000,
        weightG: 1000,
        seq: 0
    });
}

function quickAddSingleRawByIdx(idx) {
    const filtered = getFilteredRawPickerItems();
    const found = filtered[idx];
    if (!found) return;
    quickAddSingleRawFromModal(found.key);
}

function quickAddSingleRawFromModal(rawKey) {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    const found = getRawMaterialCatalogForRecipe().find(c => c.key === rawKey);
    if (!found) return;
    pushCatalogItemToRecipe(rc, found);
    rc.updatedAt = getTodayStr();
    persistRecipeChange();
    renderRecipeDetailPanel();
    renderRawPickerList();
    showToast(`[${found.item}] 투입 완료`, 'success');
}

function commitSelectedRawMaterialsFromModal() {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    if (rawPickerModalSelectedKeys.size === 0) {
        return showToast('투입할 원재료를 체크하거나 우측 [+ 투입] 버튼을 눌러주세요.', 'error');
    }
    const catalog = getRawMaterialCatalogForRecipe();
    let addedCnt = 0;
    rawPickerModalSelectedKeys.forEach(k => {
        const found = catalog.find(c => c.key === k);
        if (found) {
            pushCatalogItemToRecipe(rc, found);
            addedCnt++;
        }
    });
    rawPickerModalSelectedKeys.clear();
    rc.updatedAt = getTodayStr();
    persistRecipeChange();
    closeRawMaterialPickerModal();
    renderRecipeWorkspace();
    showToast(`원재료 ${addedCnt}종이 일괄 투입되었습니다.`, 'success');
}

function addIngredientToRecipe() {
    openRawMaterialPickerModal();
}

function addBlankIngredientToRecipe() {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    const defaultName = '식수(물)';
    rc.ingredients.push({
        rowId: 'ri_' + Date.now(),
        rowType: 'RAW',
        rawKey: `${defaultName}||1kg`,
        itemCode: generateInternalItemCode(defaultName, '1kg', 'RM'),
        priceSource: 'RAW_DB',
        item: defaultName,
        origin: '',
        spec: '1kg',
        unit: 'G',
        unitPrice: 0,
        specGrams: 1000,
        qty: 1000,
        weightG: 1000,
        seq: 0
    });
    persistRecipeChange();
    renderRecipeWorkspace();
}

function addSubRecipeToFormula() {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    const subId = document.getElementById('quickAddSubRecipeSelect')?.value;
    if (!subId) return showToast('투입할 하위 반제품·충전물 레시피를 선택해 주세요.', 'error');
    const subRc = recipesData.find(r => r.id === subId);
    if (!subRc) return;

    const subEval = evaluateRecipeBaseTotals(subRc, new Set([rc.id]));
    rc.ingredients.push({
        rowId: 'ri_' + Date.now(),
        rowType: 'SUB_RECIPE',
        subRecipeId: subRc.id,
        item: subRc.productName,
        itemCode: subRc.productCode,
        origin: '',
        unit: 'EA',
        qty: Number((subEval.baseYieldQty || 1).toFixed(2)),
        seq: 0
    });
    persistRecipeChange();
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
    } else if (field === 'item') {
        ig.item = String(val || '').trim();
        // 이름 변경 시 원재료 페이지에 동일 품목이 있으면 내부코드와 단가를 자동 재연결
        const lookup = buildRawCatalogLookupMaps();
        if (lookup.byName.has(ig.item)) {
            const matched = lookup.byName.get(ig.item);
            ig.rawKey = matched.rawKey;
            ig.itemCode = matched.itemCode;
            ig.priceSource = 'RAW_DB';
            ig.unitPrice = matched.unitPrice;
            ig.spec = matched.spec;
            ig.specGrams = matched.specGrams;
        } else {
            ig.rawKey = `${ig.item}||${ig.spec || ''}`;
            ig.itemCode = generateInternalItemCode(ig.item, ig.spec || '', 'RM');
        }
    } else {
        ig[field] = val;
    }
    rc.updatedAt = getTodayStr();
    persistRecipeChange();
    renderRecipeWorkspace();
}

function promptIngredientUnitPrice(idx) {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc || !rc.ingredients[idx]) return;
    const ig = rc.ingredients[idx];
    const lookup = buildRawCatalogLookupMaps();
    const matched = lookup.byKey.get(ig.rawKey) || lookup.byName.get(String(ig.item || '').trim());

    const guideMsg = matched
        ? `[${ig.item}] 현재 원재료 페이지 발주단가(${matched.spec} · ${formatCurrency(matched.unitPrice)})와 연동 가능\n기준 규격을 입력하세요 (빈칸 입력 시 원재료DB 자동연동 복원):`
        : `[${ig.item}] 기준 구매규격을 입력하세요 (예: 25kg, 20kg, 15kg, 1kg):`;

    const newSpec = prompt(guideMsg, ig.spec || '1kg');
    if (newSpec === null) return;
    if (newSpec.trim() === '' && matched) {
        ig.priceSource = 'RAW_DB';
        ig.rawKey = matched.rawKey;
        ig.itemCode = matched.itemCode;
        ig.spec = matched.spec;
        ig.specGrams = matched.specGrams;
        ig.unitPrice = matched.unitPrice;
        persistRecipeChange();
        renderRecipeWorkspace();
        return showToast('원재료 페이지 최신 단가 자동연동으로 복원되었습니다.', 'success');
    }

    const newPrice = prompt(`[${ig.item}] (${newSpec}) 구매단가(원)를 입력하세요:`, String(ig.unitPrice || 0));
    if (newPrice === null) return;
    ig.spec = newSpec.trim() || '1kg';
    ig.specGrams = parseSpecToGrams(ig.spec);
    ig.unitPrice = parseNumericCell(newPrice);
    ig.priceSource = 'MANUAL';
    persistRecipeChange();
    renderRecipeWorkspace();
}

function removeRecipeIngredient(idx) {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    rc.ingredients.splice(idx, 1);
    persistRecipeChange();
    renderRecipeWorkspace();
}

function addPackagingRowToRecipe(forceManual = false) {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    const selKey = document.getElementById('quickAddPackCatalogSelect')?.value || '';
    if (!forceManual && selKey) {
        const found = getRawMaterialCatalogForRecipe().find(c => c.key === selKey);
        if (found) {
            rc.packagingList.push({
                rowId: 'pk_' + Date.now(),
                rawKey: found.rawKey,
                code: found.itemCode,
                priceSource: 'RAW_DB',
                name: found.item,
                spec: found.spec,
                unit: 'EA',
                purchasePrice: found.unitPrice,
                specQty: found.specPackQty || 1,
                usedQty: 1,
                packType: 'UNIT'
            });
            persistRecipeChange();
            renderRecipeWorkspace();
            return;
        }
    }
    if (!forceManual && !selKey) {
        return showToast('발주 포장 부자재를 선택하거나 우측 [수기] 버튼을 눌러주세요.', 'error');
    }
    const defaultPkName = '소비닐 / 외포장박스';
    rc.packagingList.push({
        rowId: 'pk_' + Date.now(),
        rawKey: `${defaultPkName}||1000매`,
        code: generateInternalItemCode(defaultPkName, '1000매', 'PK'),
        priceSource: 'MANUAL',
        name: defaultPkName,
        spec: '1,000매',
        unit: 'EA',
        purchasePrice: 100000,
        specQty: 1000,
        usedQty: 1,
        packType: 'UNIT'
    });
    persistRecipeChange();
    renderRecipeWorkspace();
}

function updateRecipePackaging(idx, field, val) {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc || !rc.packagingList[idx]) return;
    const pk = rc.packagingList[idx];
    if (['purchasePrice', 'specQty', 'usedQty'].includes(field)) {
        pk[field] = parseNumericCell(val);
    } else if (field === 'name') {
        pk.name = String(val || '').trim();
        const lookup = buildRawCatalogLookupMaps();
        if (lookup.byName.has(pk.name)) {
            const matched = lookup.byName.get(pk.name);
            pk.rawKey = matched.rawKey;
            pk.code = matched.itemCode;
            pk.priceSource = 'RAW_DB';
            pk.purchasePrice = matched.unitPrice;
            pk.spec = matched.spec;
            pk.specQty = matched.specPackQty || 1;
        } else {
            pk.rawKey = `${pk.name}||${pk.spec || ''}`;
            pk.code = generateInternalItemCode(pk.name, pk.spec || '', 'PK');
        }
    } else {
        pk[field] = val;
    }
    persistRecipeChange();
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
    pk.priceSource = 'MANUAL';
    persistRecipeChange();
    renderRecipeWorkspace();
}

function removeRecipePackaging(idx) {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    rc.packagingList.splice(idx, 1);
    persistRecipeChange();
    renderRecipeWorkspace();
}

// 제품 이미지 업로드 (자동 리사이즈 압축)
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
            persistRecipeChange();
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
    persistRecipeChange();
    renderRecipeDetailPanel();
}

// 푸드디스커버리 3단계 계층형 샘플 세트 추가
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
        ingredients: [
            { rowId: 's91_1', rowType: 'RAW', item: 'T45(포리쉐)', itemCode: '500159', origin: '프랑스산', spec: '25kg', specGrams: 25000, unitPrice: 55000, unit: 'G', qty: 48115, seq: 0 },
            { rowId: 's91_2', rowType: 'RAW', item: '에스500키모', itemCode: '500117', origin: '국내산', spec: '20kg', specGrams: 20000, unitPrice: 160000, unit: 'G', qty: 963.29, seq: 0 },
            { rowId: 's91_3', rowType: 'RAW', item: '백설꽃소금', itemCode: '500176', origin: '', spec: '20kg', specGrams: 20000, unitPrice: 22626, unit: 'G', qty: 1203.37, seq: 0 },
            { rowId: 's91_4', rowType: 'RAW', item: '하얀설탕(백설)', itemCode: '500152', origin: '국내산', spec: '15kg', specGrams: 15000, unitPrice: 20000, unit: 'G', qty: 7227.18, seq: 0 },
            { rowId: 's91_5', rowType: 'RAW', item: '낙우밀', itemCode: '500042', origin: '국내산', spec: '1kg', specGrams: 1000, unitPrice: 5355, unit: 'G', qty: 1926.59, seq: 0 },
            { rowId: 's91_6', rowType: 'RAW', item: '냉동이스트(고당)', itemCode: '500113', origin: '프랑스산', spec: '3.5kg', specGrams: 3500, unitPrice: 34720, unit: 'G', qty: 963.29, seq: 0 },
            { rowId: 's91_7', rowType: 'RAW', item: '전란액(살균)', itemCode: '500036', origin: '국내산', spec: '5kg', specGrams: 5000, unitPrice: 26000, unit: 'G', qty: 2408.73, seq: 0 },
            { rowId: 's91_8', rowType: 'RAW', item: '식수(물)', itemCode: '590001', origin: '', spec: '1kg', specGrams: 1000, unitPrice: 0, unit: 'G', qty: 20044, seq: 0 },
            { rowId: 's91_9', rowType: 'RAW', item: '앵커버터', itemCode: '500029', origin: '뉴질랜드산', spec: '1kg', specGrams: 1000, unitPrice: 12660, unit: 'G', qty: 2408.73, seq: 0 },
            { rowId: 's91_10', rowType: 'RAW', item: '파지', itemCode: '500171', origin: '', spec: '1kg', specGrams: 1000, unitPrice: 0, unit: 'G', qty: 7242.06, seq: 0 }
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
        ingredients: [
            { rowId: 's92_1', rowType: 'SUB_RECIPE', subRecipeId: idBaseDough, item: '(공장)(반제품)패스츄리기본반죽', itemCode: '100091', unit: 'EA', qty: 25, seq: 0 },
            { rowId: 's92_2', rowType: 'RAW', item: '플래차드 드라이 버터', itemCode: '500168', origin: '', spec: '10kg', specGrams: 10000, unitPrice: 167000, unit: 'G', qty: 25000, seq: 0 }
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
        ingredients: [
            { rowId: 's93_1', rowType: 'RAW', item: '푸드림가는정백당(설탕)', itemCode: '500065', origin: '국내산', spec: '15kg', specGrams: 15000, unitPrice: 20900, unit: 'G', qty: 17500, seq: 0 },
            { rowId: 's93_2', rowType: 'RAW', item: '백설꽃소금', itemCode: '500143', origin: '국내산', spec: '20kg', specGrams: 20000, unitPrice: 26900, unit: 'G', qty: 375, seq: 0 },
            { rowId: 's93_3', rowType: 'RAW', item: '앵커버터', itemCode: '500029', origin: '뉴질랜드산', spec: '1kg', specGrams: 1000, unitPrice: 12660, unit: 'G', qty: 17500, seq: 0 }
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
        ingredients: [
            { rowId: 'f148_1', rowType: 'SUB_RECIPE', subRecipeId: idButterDough, item: '(공장)(반제품)패스츄리버터반죽', itemCode: '100092', unit: 'EA', qty: 25, seq: 0 },
            { rowId: 'f148_2', rowType: 'SUB_RECIPE', subRecipeId: idFilling, item: '(충전물)퀸아망필링', itemCode: '100093', unit: 'EA', qty: 35375, seq: 0 }
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
    persistRecipeChange();
    renderRecipeWorkspace();
    showToast('푸드디스커버리 3단 계층 샘플 세트가 추가되었습니다!', 'success');
}

// ============================================================================
// 레시피 전용 구글 시트 DB 연동 (기본 URL 자동 내장 + 상태 표시 + 초기 동기화)
// ============================================================================

function updateRecipeDbStatusUI(state, text) {
    const dot = document.getElementById('recipeDbStatusDot');
    const label = document.getElementById('recipeDbStatusText');
    const badge = document.getElementById('recipeDbStatusBadge');
    const spin = document.getElementById('recipeSyncSpinWrap');
    if (spin) {
        if (state === 'syncing') spin.classList.add('animate-spin');
        else spin.classList.remove('animate-spin');
    }
    if (label && text) label.textContent = text;
    if (dot) {
        dot.className = state === 'syncing'
            ? 'w-2 h-2 rounded-full bg-amber-500 animate-pulse'
            : (state === 'error' ? 'w-2 h-2 rounded-full bg-rose-500' : 'w-2 h-2 rounded-full bg-emerald-500');
    }
    if (badge) {
        badge.className = state === 'syncing'
            ? 'flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-xl text-xs font-bold border bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 transition cursor-pointer'
            : (state === 'error'
                ? 'flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-xl text-xs font-bold border bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100 transition cursor-pointer'
                : 'flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-xl text-xs font-bold border bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100 transition cursor-pointer');
    }
}

// 상단 [DB 연동됨] 버튼 바로 왼쪽에 [원재료 현재 단가 적용] 버튼 자동 생성 및 바인딩
function ensureApplyRawPriceHeaderButton() {
    const badgeBtn = document.getElementById('recipeDbStatusBadge');
    if (!badgeBtn || !badgeBtn.parentElement) return;
    if (document.getElementById('applyCurrentRawPricesBtn')) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'applyCurrentRawPricesBtn';
    btn.onclick = () => applyCurrentRawMaterialPricesToAllRecipes();
    btn.title = '전 레시피(완제품·반제품·포장재)의 품목명을 원재료 탭 [4. 제품 단가 · 변동 이력]의 현재 단가로 일괄 자동 보정합니다';
    btn.className = 'flex items-center gap-1.5 px-3.5 py-1.5 h-9 rounded-xl text-xs font-extrabold bg-amber-600 hover:bg-amber-700 text-white shadow-xs transition cursor-pointer';
    btn.innerHTML = `<i data-lucide="refresh-ccw" class="w-3.5 h-3.5"></i><span>원재료 현재 단가 적용</span>`;
    badgeBtn.parentElement.insertBefore(btn, badgeBtn);
    if (window.lucide) lucide.createIcons();
}

// [핵심 기능] 전체 레시피 내 원재료·포장재 품목명을 원재료 [4. 제품 단가 · 변동 이력]의 '현재 단가' 값으로 일괄 자동 보정
async function applyCurrentRawMaterialPricesToAllRecipes() {
    if ((!Array.isArray(ordersData) || ordersData.length === 0) && typeof syncFromGoogleSheet === 'function') {
        try { await syncFromGoogleSheet(false); } catch (e) {}
    }

    const lookup = buildRawCatalogLookupMaps();
    if (!lookup.list || lookup.list.length === 0) {
        return showToast('원재료 발주/단가 데이터가 없습니다. 원재료 탭의 DB 연동을 먼저 확인해 주세요.', 'error');
    }

    let matchedRawRows = 0;
    let changedPriceRows = 0;
    let matchedPackRows = 0;
    let manualKeptRows = 0;
    const unmatchedNames = new Set();

    (recipesData || []).forEach(rc => {
        if (!rc) return;

        // 1) 배합 원재료(RAW) 현재 단가 일괄 보정 (수동 고정 상태였더라도 원재료 DB에 매칭되면 현재 단가로 갱신)
        (rc.ingredients || []).forEach(ig => {
            if (!ig || ig.rowType === 'SUB_RECIPE') return;
            const rawName = String(ig.item || '').trim();
            if (!rawName || /^(식수|물|정제수|수돗물|얼음|파지)/.test(rawName)) return;

            // [3단계 P2] 이미 연결된 원재료(rawKey → 내부코드)를 먼저 사용하고, 연결이 없을 때만 이름으로 찾음.
            //  수동 고정 단가(MANUAL)는 덮어쓰지 않음
            if (ig.priceSource === 'MANUAL') { manualKeptRows++; return; }
            const hit =
                (ig.rawKey && lookup.byKey.get(ig.rawKey)) ||
                (ig.itemCode && lookup.byCode.get(ig.itemCode)) ||
                lookup.findBestByName(rawName, ig.spec) ||
                null;

            if (hit) {
                const prevPrice = parseFloat(ig.unitPrice) || 0;
                const prevSpecG = parseFloat(ig.specGrams) || 0;
                ig.rawKey = hit.rawKey;
                ig.itemCode = hit.itemCode;
                ig.unitPrice = hit.unitPrice;
                if (hit.spec) {
                    ig.spec = hit.spec;
                    ig.specGrams = hit.specGrams;
                }
                matchedRawRows++;
                if (Math.abs(prevPrice - hit.unitPrice) > 0.01 || Math.abs(prevSpecG - hit.specGrams) > 0.01) {
                    changedPriceRows++;
                }
            } else {
                unmatchedNames.add(rawName);
            }
        });

        // 2) 포장지·부자재 현재 단가 일괄 보정
        (rc.packagingList || []).forEach(pk => {
            if (!pk) return;
            const pkName = String(pk.name || '').trim();
            if (!pkName) return;

            if (pk.priceSource === 'MANUAL') { manualKeptRows++; return; }
            const hit =
                (pk.rawKey && lookup.byKey.get(pk.rawKey)) ||
                (pk.code && lookup.byCode.get(pk.code)) ||
                lookup.findBestByName(pkName, pk.spec) ||
                null;

            if (hit) {
                const prevPrice = parseFloat(pk.purchasePrice) || 0;
                pk.rawKey = hit.rawKey;
                pk.code = hit.itemCode;
                pk.purchasePrice = hit.unitPrice;
                pk.spec = hit.spec || '';
                pk.specQty = 1;
                matchedPackRows++;
                if (Math.abs(prevPrice - hit.unitPrice) > 0.01) {
                    changedPriceRows++;
                }
            } else {
                unmatchedNames.add(pkName);
            }
        });

        rc.updatedAt = getTodayStr();
    });

    persistRecipeChange();
    renderRecipeWorkspace();
    if (typeof window.refreshProductPriceRecipeLinks === 'function') {
        window.refreshProductPriceRecipeLinks();
    }

    const totalMatched = matchedRawRows + matchedPackRows;
    const unmatchNote = (unmatchedNames.size > 0 ? ` (미매칭 수기품목 ${unmatchedNames.size}종 유지)` : '')
        + (manualKeptRows > 0 ? ` · 수동 고정 단가 ${manualKeptRows}건은 그대로 유지` : '');
    showToast(
        `[현재 단가 보정 완료] 총 ${totalMatched}개 항목(원재료 ${matchedRawRows} · 포장재 ${matchedPackRows}) 연동 · 단가변동 ${changedPriceRows}건 반영!${unmatchNote} — 자동 저장됩니다.`,
        'success'
    );
}

function openRecipeDbModal() {
    const urlToUse = (!recipeGasWebAppUrl || recipeGasWebAppUrl.includes(LEGACY_DUMMY_RECIPE_URL_PART))
        ? BAROGA_DEFAULT_RECIPE_GAS_URL
        : recipeGasWebAppUrl;
    recipeGasWebAppUrl = urlToUse;
    document.getElementById('recipeGasUrlInput').value = urlToUse;
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
    const v = document.getElementById('recipeGasUrlInput').value.trim() || BAROGA_DEFAULT_RECIPE_GAS_URL;
    recipeGasWebAppUrl = v;
    try { localStorage.setItem('baroga_recipe_gas_url', v); } catch (e) {}
    recipeDbLoaded = false;
    recipeDbRevision = null;
    recipeDbBlockReason = '새 DB 주소를 아직 불러오지 못했습니다';
    closeRecipeDbModal();
    syncRecipesFromGoogleSheet(true);
}

// ============================================================================
// [1단계 데이터 보호] 레시피 자동 저장 · 리비전 충돌 방지 · 미저장 수정분 보호
// ============================================================================
let recipeDbLoaded = false;
let recipeDbRevision = null;
let recipeDbBlockReason = 'DB를 아직 불러오지 못했습니다';
let recipeSaveTimer = null;
let recipeIsSaving = false;
let recipeSavePending = false;
let recipeChangeSeq = 0;
const RECIPE_DIRTY_KEY = 'baroga_recipes_dirty_v1';
const RECIPE_UNSAVED_BACKUP_KEY = 'baroga_recipes_unsaved_backup_v1';
const RECIPE_AUTOSAVE_DELAY_MS = 1500;

function readRecipeDirty() {
    try { return JSON.parse(localStorage.getItem(RECIPE_DIRTY_KEY) || 'null'); } catch (e) { return null; }
}
function writeRecipeDirty(baseRevision) {
    try { localStorage.setItem(RECIPE_DIRTY_KEY, JSON.stringify({ baseRevision, at: new Date().toLocaleString('ko-KR') })); } catch (e) {}
}
function clearRecipeDirty() {
    try { localStorage.removeItem(RECIPE_DIRTY_KEY); } catch (e) {}
}

// 레시피 수정 시 호출: 이 기기에 즉시 보관 + 1.5초 뒤 DB 자동 저장
function persistRecipeChange() {
    saveLocalCache();
    recipeChangeSeq++;
    if (!readRecipeDirty()) writeRecipeDirty(recipeDbRevision);
    if (recipeSaveTimer) clearTimeout(recipeSaveTimer);
    recipeSaveTimer = setTimeout(() => { recipeSaveTimer = null; pushRecipesToGoogleSheet(true); }, RECIPE_AUTOSAVE_DELAY_MS);
    updateRecipeDbStatusUI('syncing', '저장 대기...');
    if (typeof window.refreshProductPriceRecipeLinks === 'function') window.refreshProductPriceRecipeLinks(); // [3단계 Q4] 제품단가 재료비 실시간 반영
}

window.addEventListener('beforeunload', (e) => {
    if (recipeSaveTimer || recipeIsSaving || recipeSavePending) {
        e.preventDefault();
        e.returnValue = '레시피 저장이 아직 끝나지 않았습니다.';
        return e.returnValue;
    }
});

function mapRecipeRowFromDb(r, lookup) {
    let parsedJson = {};
    try { parsedJson = typeof r.ingredientsJson === 'string' ? JSON.parse(r.ingredientsJson) : (r.ingredientsJson || {}); } catch (e) {}
    const ings = Array.isArray(parsedJson) ? parsedJson : (parsedJson.ingredients || []);
    const pkgs = parsedJson.packagingList || [];
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
        ingredients: ings,
        packagingList: pkgs,
        bakingProcess: parsedJson.bakingProcess || {},
        imageData: r.imageData || parsedJson.imageData || '',
        updatedAt: r.updatedAt || getTodayStr()
    }, lookup);
}

async function syncRecipesFromGoogleSheet(showMessage = false) {
    if (!recipeGasWebAppUrl || recipeGasWebAppUrl.includes(LEGACY_DUMMY_RECIPE_URL_PART)) {
        recipeGasWebAppUrl = BAROGA_DEFAULT_RECIPE_GAS_URL;
    }
    if (recipeSaveTimer || recipeIsSaving || recipeSavePending) {
        if (showMessage) showToast('레시피 저장이 진행 중입니다. 저장이 끝난 뒤 다시 새로고침해 주세요.', 'error');
        return;
    }
    updateRecipeDbStatusUI('syncing', '동기화중...');
    try {
        const json = await barogaApi(recipeGasWebAppUrl, { action: 'getAll' }, 20000);
        if (json && (json.ok === false || json.status === 'error')) throw new Error(json.error || json.message || '서버 오류');
        const rows = Array.isArray(json) ? json : (json.data || json.rows || json.recipes);
        if (!Array.isArray(rows)) throw new Error('응답 형식을 인식할 수 없습니다');
        const revision = (json && typeof json.revision === 'number') ? json.revision : null;

        const dirty = readRecipeDirty();
        const localCount = (recipesData || []).length;

        if (dirty && localCount > 0) {
            if (revision !== null && dirty.baseRevision === revision) {
                // 이 기기의 미저장 수정분이 있고, 그 사이 DB가 바뀌지 않았음 → 이 기기 내용을 유지하고 저장
                recipeDbLoaded = true;
                recipeDbRevision = revision;
                recipeDbBlockReason = '';
                if (activeMasterDomain === 'RECIPE') renderRecipeWorkspace();
                showToast(`저장되지 않았던 레시피 수정분(${dirty.at || ''})을 DB에 저장합니다.`, 'info');
                pushRecipesToGoogleSheet(false);
                return;
            }
            // 그 사이 다른 곳에서 DB가 바뀜 → DB 기준으로 맞추고, 이 기기 수정분은 별도 백업
            try { localStorage.setItem(RECIPE_UNSAVED_BACKUP_KEY, JSON.stringify({ savedAt: new Date().toLocaleString('ko-KR'), recipes: recipesData })); } catch (e) {}
            clearRecipeDirty();
            showToast(`다른 곳에서 레시피 DB가 변경되어, 이 기기의 미저장 수정분(${dirty.at || ''})은 반영하지 않았습니다. (브라우저에 백업 보관)`, 'error');
        }

        if (rows.length > 0) {
            const lookup = buildRawCatalogLookupMaps();
            recipesData = rows.map(r => mapRecipeRowFromDb(r, lookup));
            if (!recipesData.some(r => r.id === selectedRecipeId)) {
                selectedRecipeId = recipesData[0]?.id || null;
            }
            saveLocalCache();
            if (typeof window.refreshProductPriceRecipeLinks === 'function') window.refreshProductPriceRecipeLinks();
            if (showMessage) showToast(`레시피 DB에서 ${recipesData.length}종 동기화 완료`, 'success');
        } else if (localCount > 0) {
            // DB는 비어 있는데 이 기기에는 레시피가 남아 있음 → 지우지 않고 그대로 보여줌 (복원 가능)
            showToast(`레시피 DB가 비어 있습니다. 이 기기에 남아 있는 ${localCount}종을 DB에 복원하려면 [DB 저장]을 누르세요.`, 'error');
        } else if (showMessage) {
            showToast('레시피 DB가 연결되었습니다 (저장된 데이터 0건).', 'info');
        }

        recipeDbLoaded = true;
        recipeDbRevision = revision;
        recipeDbBlockReason = revision === null ? '레시피 GAS 스크립트가 구버전입니다 (v2.0 업데이트 필요)' : '';
        if (activeMasterDomain === 'RECIPE') renderRecipeWorkspace();
        if (revision === null) updateRecipeDbStatusUI('error', '저장 중지 (GAS 업데이트 필요)');
        else updateRecipeDbStatusUI('connected', `DB 연동됨 (${recipesData.length}종)`);
    } catch (e) {
        if (e && e.unauthorized) {
            recipeDbBlockReason = '접속 코드가 필요합니다';
            updateRecipeDbStatusUI('error', '접속 코드 필요');
        } else if (!recipeDbLoaded) {
            recipeDbBlockReason = 'DB를 불러오지 못했습니다';
            updateRecipeDbStatusUI('error', 'DB 불러오기 실패 · 저장 중지');
            showToast(`레시피 DB를 불러오지 못했습니다 (${e && e.message ? e.message : e}). 화면은 이 기기에 남은 사본이며 저장은 중지됩니다.`, 'error');
        } else {
            updateRecipeDbStatusUI('error', '새로고침 실패');
            if (showMessage) showToast(`레시피 새로고침 실패: ${e && e.message ? e.message : e}`, 'error');
        }
    }
}

async function pushRecipesToGoogleSheet(silent = false) {
    if (recipeSaveTimer) { clearTimeout(recipeSaveTimer); recipeSaveTimer = null; }
    saveLocalCache();
    if (!recipeGasWebAppUrl || recipeGasWebAppUrl.includes(LEGACY_DUMMY_RECIPE_URL_PART)) {
        recipeGasWebAppUrl = BAROGA_DEFAULT_RECIPE_GAS_URL;
    }
    if (!recipeDbLoaded || recipeDbRevision === null) {
        updateRecipeDbStatusUI('error', '저장 중지');
        showToast(`레시피를 저장하지 않았습니다: ${recipeDbBlockReason}. 변경 내용은 이 기기에만 있습니다.`, 'error');
        return false;
    }
    if (recipeIsSaving) { recipeSavePending = true; return; }
    recipeIsSaving = true;
    updateRecipeDbStatusUI('syncing', '저장중...');
    const sentSeq = recipeChangeSeq;
    let ok = false;
    try {
        const lookup = buildRawCatalogLookupMaps();
        const images = [];
        const payloadRows = (recipesData || []).map(rc => {
            ensureRecipeSchema(rc, lookup);
            const m = calculateRecipeMetrics(rc);
            if (rc.imageData) images.push({ id: rc.id, data: rc.imageData });
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
                // 사진은 셀 한도(5만자) 문제로 별도 시트에 저장 → 여기서는 제외
                ingredientsJson: JSON.stringify({
                    recipeType: rc.recipeType,
                    ingredients: rc.ingredients,
                    packagingList: rc.packagingList,
                    bakingProcess: rc.bakingProcess
                }),
                updatedAt: rc.updatedAt || getTodayStr(),
                id: rc.id
            };
        });
        const json = await barogaApi(recipeGasWebAppUrl, { action: 'replaceAll', baseRevision: recipeDbRevision, data: payloadRows, images }, 30000);
        if (json && json.ok === true && typeof json.revision === 'number') {
            recipeDbRevision = json.revision;
            ok = true;
            if (recipeChangeSeq === sentSeq) clearRecipeDirty();
            else writeRecipeDirty(recipeDbRevision);
            updateRecipeDbStatusUI('connected', `DB 연동됨 (${recipesData.length}종)`);
            if (!silent) showToast('레시피 DB에 저장되었습니다.', 'success');
        } else if (json && json.conflict) {
            recipeDbLoaded = false;
            recipeDbBlockReason = '다른 기기에서 먼저 저장했습니다. ↻ 새로고침 후 다시 입력하세요';
            recipeSavePending = false;
            updateRecipeDbStatusUI('error', '충돌 · 새로고침 필요');
            showToast('다른 기기에서 먼저 저장한 레시피가 있어 저장하지 않았습니다. ↻ 새로고침하면 이 기기 수정분은 브라우저에 백업되고 DB 내용으로 맞춰집니다.', 'error');
        } else {
            throw new Error((json && (json.error || json.message)) || '알 수 없는 응답');
        }
    } catch (e) {
        const isTimeout = e && e.name === 'AbortError';
        if (isTimeout) {
            recipeDbLoaded = false;
            recipeDbBlockReason = '저장 응답이 없어 저장 여부를 알 수 없습니다. ↻ 새로고침으로 확인하세요';
        }
        updateRecipeDbStatusUI('error', isTimeout ? '저장 확인 필요' : 'DB 저장 실패');
        showToast(isTimeout
            ? '레시피 저장 응답이 없습니다(시간 초과). ↻ 새로고침으로 실제 저장 여부를 확인해 주세요.'
            : `레시피 DB 저장 실패: ${e && e.message ? e.message : e} — 변경 내용은 이 기기에만 있습니다.`, 'error');
    } finally {
        recipeIsSaving = false;
        if (recipeSavePending) { recipeSavePending = false; if (ok) pushRecipesToGoogleSheet(true); }
    }
    return ok;
}

function exportRecipesCsv() {
    let csv = '\uFEFF구분,품목코드,품목명,분할중량(G),생산수량,PK입수,1배합pk수량,판매금액,원가비율(%),개당원가,판매원가,개별포장,총포장가,원재료비용,중량합계(G),충전합계(G)\n';
    [...(recipesData || [])].sort(compareRecipeProductCode).forEach(rc => {
        const m = calculateRecipeMetrics(rc);
        const typeLabel = rc.recipeType === 'SUB' ? '반제품/충전물' : '완제품';
        csv += [typeLabel, String(rc.productCode || ''), rc.productName, Number(rc.divisionWeight) || 0, Number(m.prodQty.toFixed(1)), Number(rc.packQty) || 0, Number(m.batchPkQty.toFixed(1)), m.sellPrice, Number(m.costRatioPct.toFixed(2)), Number(m.unitCost.toFixed(2)), Math.round(m.salesCost), Math.round(m.unitPackCost), Math.round(m.totalPackCost), Number(m.productionCost.toFixed(2)), Math.round(m.weightTotalG), Math.round(m.fillingWeightG)].map(csvCell).join(',') + '\n';
    });
    triggerCsvDownload(csv, `바로가공장_배합비원가표_${getTodayStr()}.csv`);
}

window.calculateRecipeMetrics = calculateRecipeMetrics;
window.renderRecipeDetailPanel = renderRecipeDetailPanel;

// 초기 구동 시 레시피 DB 자동 동기화 연결
window.applyCurrentRawMaterialPricesToAllRecipes = applyCurrentRawMaterialPricesToAllRecipes;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensureApplyRawPriceHeaderButton);
} else {
    ensureApplyRawPriceHeaderButton();
}
window.addEventListener('load', () => {
    ensureApplyRawPriceHeaderButton();
    setTimeout(() => { syncRecipesFromGoogleSheet(false); }, 350);
});
