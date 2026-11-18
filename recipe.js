// ==========================================
// 바로가 공장 통합 관리 시스템 - 레시피 전용 모듈 (recipe.js)
// ==========================================

function parseSpecToGrams(specStr) {
    const s = String(specStr || '').toLowerCase().replace(/,/g, '').trim();
    const m = s.match(/(\d+(?:\.\d+)?)\s*(kg|g|l|ml)/);
    if (!m) return 1000;
    const val = parseFloat(m[1]) || 1;
    return (m[2] === 'kg' || m[2] === 'l') ? val * 1000 : val;
}

function getRawMaterialCatalogForRecipe() {
    const map = {};
    ordersData.forEach(o => {
        const u = parseFloat(o.amount) || 0;
        if (u <= 0 || !o.colB) return;
        const k = `${o.colB}||${o.colC || ''}`;
        map[k] = { key: k, item: o.colB, spec: o.colC || '', unitPrice: u, specGrams: parseSpecToGrams(o.colC) };
    });
    return Object.values(map).sort((a, b) => a.item.localeCompare(b.item, 'ko'));
}

function calculateRecipeMetrics(rc) {
    const ings = Array.isArray(rc.ingredients) ? rc.ingredients : [];
    const pkgs = Array.isArray(rc.packagingList) ? rc.packagingList : [];
    let weightTotalG = 0, flourTotalG = 0, productionCost = 0;

    ings.forEach(ig => {
        const w = parseFloat(ig.weightG ?? ig.g1 ?? 0) || 0;
        const specG = parseFloat(ig.specGrams) || parseSpecToGrams(ig.spec) || 1000;
        const uPrice = parseFloat(ig.unitPrice) || 0;
        const cost = specG > 0 ? (uPrice / specG) * w : 0;
        weightTotalG += w;
        if (ig.isFlour) flourTotalG += w;
        productionCost += cost;
    });

    let unitPackCost = 0, boxPackCost = 0;
    pkgs.forEach(pk => {
        const pPrice = parseFloat(pk.purchasePrice) || 0, sQty = parseFloat(pk.specQty) || 1, uQty = parseFloat(pk.usedQty) || 1;
        const singleCost = sQty > 0 ? (pPrice / sQty) * uQty : 0;
        if (pk.packType === 'UNIT') unitPackCost += singleCost;
        else boxPackCost += singleCost;
    });

    const divW = parseFloat(rc.divisionWeight) || 100;
    const lossR = parseFloat(rc.lossRatio) || 0;
    const theoQty = divW > 0 ? (weightTotalG / divW) : 0;
    const lossAppliedQty = theoQty * (1 - lossR / 100);
    const prodQty = parseFloat(rc.customProductionQty) > 0 ? parseFloat(rc.customProductionQty) : (lossAppliedQty || 1);
    const packQty = parseFloat(rc.packQty) || 1;
    const sellPrice = parseFloat(rc.sellingPrice) || 0;

    const unitRawCost = prodQty > 0 ? (productionCost / prodQty) : 0;
    const onePkRawCost = unitRawCost * packQty;
    const totalPackCost = unitPackCost + boxPackCost;
    const onePkTotalCost = onePkRawCost + totalPackCost;
    const onePkMargin = sellPrice - onePkTotalCost;
    const costRatioPct = sellPrice > 0 ? ((onePkTotalCost / sellPrice) * 100) : 0;
    const marginRatioPct = sellPrice > 0 ? ((onePkMargin / sellPrice) * 100) : 0;

    return {
        weightTotalG, flourTotalG, productionCost, theoQty, lossAppliedQty,
        prodQty, packQty, sellPrice, unitRawCost, onePkRawCost,
        unitPackCost, totalPackCost, onePkTotalCost, onePkMargin,
        costRatioPct, marginRatioPct
    };
}

function renderRecipeWorkspace() {
    renderRecipeSidebarList();
    renderRecipeDetailPanel();
    if (window.lucide) lucide.createIcons();
}

function renderRecipeSidebarList() {
    const q = (document.getElementById('recipeListSearchInput')?.value || '').trim().toLowerCase();
    const sub = document.getElementById('recipeCountSub');
    if (sub) sub.textContent = `등록 레시피 ${recipesData.length}종`;
    const listEl = document.getElementById('recipeSidebarList');
    if (!listEl) return;
    const filtered = recipesData.filter(r => !q || `${r.productName || ''} ${r.productCode || ''}`.toLowerCase().includes(q));
    listEl.innerHTML = filtered.map(r => {
        const active = r.id === selectedRecipeId;
        const m = calculateRecipeMetrics(r);
        return `
            <div onclick="selectRecipeItem('${escapeHtml(r.id)}')" class="p-3 rounded-xl border transition cursor-pointer ${active ? 'bg-amber-50 border-amber-500 shadow-2xs' : 'bg-white border-stone-200 hover:bg-stone-50'}">
                <div class="flex items-center justify-between">
                    <span class="text-xs font-extrabold text-stone-900 truncate">${escapeHtml(r.productName || '이름없는 레시피')}</span>
                    <span class="px-1.5 py-0.5 rounded text-[10px] font-bold bg-stone-100 text-stone-600">#${escapeHtml(r.productCode || '-')}</span>
                </div>
                <div class="mt-1 flex items-center justify-between text-[11px] text-stone-500">
                    <span>1PK 원가율: <strong class="text-amber-800">${m.costRatioPct.toFixed(1)}%</strong></span>
                    <span>총중량 ${formatNumber(m.weightTotalG)}g</span>
                </div>
            </div>
        `;
    }).join('');
}

function selectRecipeItem(id) { selectedRecipeId = id; renderRecipeWorkspace(); }

function createNewRecipeItem() {
    const newRc = {
        id: 'rc_' + Date.now(), productCode: String(1000 + recipesData.length + 1), productName: '신규 제품 레시피',
        divisionWeight: 100, customProductionQty: 50, packQty: 10, sellingPrice: 25000, lossRatio: 5,
        activeProcesses: ['반죽', '토핑'], ingredients: [], packagingList: [], updatedAt: getTodayStr()
    };
    recipesData.unshift(newRc);
    selectedRecipeId = newRc.id;
    saveLocalCache();
    renderRecipeWorkspace();
}

function deleteCurrentRecipeItem(id) {
    openConfirmModal('레시피 삭제', '현재 선택된 레시피를 삭제하시겠습니까?', () => {
        recipesData = recipesData.filter(r => r.id !== id);
        selectedRecipeId = recipesData[0]?.id || null;
        saveLocalCache();
        renderRecipeWorkspace();
    });
}

function renderRecipeDetailPanel() {
    const container = document.getElementById('recipeDetailContainer');
    if (!container) return;
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) {
        container.innerHTML = `<div class="py-20 text-center text-stone-400 font-bold">좌측에서 레시피를 선택하거나 [+ 신규 레시피]를 눌러주세요.</div>`;
        return;
    }
    if (!Array.isArray(rc.activeProcesses) || rc.activeProcesses.length === 0) rc.activeProcesses = ['반죽'];
    const m = calculateRecipeMetrics(rc);
    const rawCatalog = getRawMaterialCatalogForRecipe();

    container.innerHTML = `
        <div class="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-stone-200">
            <div class="flex flex-wrap items-center gap-2">
                <div class="flex items-center gap-1 bg-stone-100 border border-stone-300 rounded-xl px-2.5 py-1.5">
                    <span class="text-[11px] font-bold text-stone-500">코드ID</span>
                    <input type="text" value="${escapeHtml(rc.productCode || '')}" onchange="updateRecipeField('productCode', this.value)" class="w-16 text-xs font-extrabold text-stone-900 bg-transparent focus:outline-none">
                </div>
                <input type="text" value="${escapeHtml(rc.productName || '')}" onchange="updateRecipeField('productName', this.value)" class="text-base sm:text-lg font-black text-stone-900 border-b border-transparent hover:border-stone-300 focus:border-amber-600 focus:outline-none px-1">
            </div>
            <button type="button" onclick="deleteCurrentRecipeItem('${escapeHtml(rc.id)}')" class="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 cursor-pointer flex items-center gap-1"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i><span>레시피 삭제</span></button>
        </div>

        <div class="overflow-x-auto border border-stone-200 rounded-2xl">
            <table class="w-full text-center border-collapse text-xs">
                <tbody>
                    <tr class="bg-stone-100 border-b border-stone-200 font-extrabold text-stone-600">
                        <th class="py-2 px-2 border-r border-stone-200">분할중량(g)</th>
                        <th class="py-2 px-2 border-r border-stone-200">생산수량(수기)</th>
                        <th class="py-2 px-2 border-r border-stone-200">1PK 포장수량</th>
                        <th class="py-2 px-2 border-r border-stone-200">1PK 판매금액</th>
                        <th class="py-2 px-2 border-r border-stone-200">손실비율(%)</th>
                        <th class="py-2 px-2 border-r border-stone-200">총 배합중량(g)</th>
                        <th class="py-2 px-2 border-r border-stone-200">이론 생산수량</th>
                        <th class="py-2 px-2">손실반영 수량</th>
                    </tr>
                    <tr class="border-b border-stone-200 bg-amber-50/30 font-extrabold text-stone-900">
                        <td class="py-2 px-2 border-r border-stone-200"><input type="text" value="${formatNumber(rc.divisionWeight)}" onchange="updateRecipeNumericField('divisionWeight', this.value)" class="w-20 text-center border border-amber-400 rounded-lg py-0.5 bg-white"></td>
                        <td class="py-2 px-2 border-r border-stone-200"><input type="text" value="${formatNumber(rc.customProductionQty)}" onchange="updateRecipeNumericField('customProductionQty', this.value)" class="w-20 text-center border border-amber-400 rounded-lg py-0.5 bg-white"></td>
                        <td class="py-2 px-2 border-r border-stone-200"><input type="text" value="${formatNumber(rc.packQty)}" onchange="updateRecipeNumericField('packQty', this.value)" class="w-16 text-center border border-amber-400 rounded-lg py-0.5 bg-white"></td>
                        <td class="py-2 px-2 border-r border-stone-200"><input type="text" value="${formatNumber(rc.sellingPrice)}" onchange="updateRecipeNumericField('sellingPrice', this.value)" class="w-24 text-center border border-amber-400 rounded-lg py-0.5 bg-white text-amber-900"></td>
                        <td class="py-2 px-2 border-r border-stone-200"><input type="text" value="${formatNumber(rc.lossRatio)}" onchange="updateRecipeNumericField('lossRatio', this.value)" class="w-16 text-center border border-amber-400 rounded-lg py-0.5 bg-white"></td>
                        <td class="py-2 px-2 border-r border-stone-200 text-stone-800">${formatNumber(m.weightTotalG)}g</td>
                        <td class="py-2 px-2 border-r border-stone-200 text-stone-600">${formatNumber(m.theoQty)}개</td>
                        <td class="py-2 px-2 text-stone-600">${formatNumber(m.lossAppliedQty)}개</td>
                    </tr>
                    <tr class="bg-stone-100 border-b border-stone-200 font-extrabold text-stone-600">
                        <th class="py-2 px-2 border-r border-stone-200">1배합 생산원가</th>
                        <th class="py-2 px-2 border-r border-stone-200">1개당 원재료원가</th>
                        <th class="py-2 px-2 border-r border-stone-200">1PK 원재료원가</th>
                        <th class="py-2 px-2 border-r border-stone-200">개별포장 원가</th>
                        <th class="py-2 px-2 border-r border-stone-200">1PK 총포장가</th>
                        <th class="py-2 px-2 border-r border-stone-200">1PK 총원가</th>
                        <th class="py-2 px-2 border-r border-stone-200">1PK 마진액</th>
                        <th class="py-2 px-2">원가율 / 이익률</th>
                    </tr>
                    <tr class="bg-white font-extrabold">
                        <td class="py-2 px-2 border-r border-stone-200 text-stone-900">${formatCurrency(m.productionCost)}</td>
                        <td class="py-2 px-2 border-r border-stone-200 text-stone-800">${formatCurrency(m.unitRawCost)}</td>
                        <td class="py-2 px-2 border-r border-stone-200 text-stone-900">${formatCurrency(m.onePkRawCost)}</td>
                        <td class="py-2 px-2 border-r border-stone-200 text-stone-700">${formatCurrency(m.unitPackCost)}</td>
                        <td class="py-2 px-2 border-r border-stone-200 text-stone-700">${formatCurrency(m.totalPackCost)}</td>
                        <td class="py-2 px-2 border-r border-stone-200 text-amber-900">${formatCurrency(m.onePkTotalCost)}</td>
                        <td class="py-2 px-2 border-r border-stone-200 text-emerald-800">${formatCurrency(m.onePkMargin)}</td>
                        <td class="py-2 px-2"><span class="text-rose-700">${m.costRatioPct.toFixed(1)}%</span> / <span class="text-emerald-700">${m.marginRatioPct.toFixed(1)}%</span></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="p-3 rounded-xl bg-stone-50 border border-stone-200 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div class="flex flex-wrap items-center gap-2">
                <span class="font-extrabold text-stone-700 mr-1">사용 공정 체크:</span>
                ${RECIPE_PROCESS_PRESETS.map(pName => {
                    const checked = rc.activeProcesses.includes(pName);
                    return `<label class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border cursor-pointer font-bold ${checked ? 'bg-amber-600 text-white border-amber-600' : 'bg-white text-stone-600 border-stone-200'}"><input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleRecipeProcessPreset('${escapeHtml(pName)}')" class="hidden"><span>${escapeHtml(pName)}</span></label>`;
                }).join('')}
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5 p-3 rounded-xl bg-amber-50/60 border border-amber-200 text-xs">
            <div class="flex items-center gap-1.5">
                <span class="font-extrabold text-amber-950 shrink-0">① 공정:</span>
                <select id="quickAddProcessSelect" class="flex-1 border border-amber-300 rounded-lg px-2.5 py-1.5 font-extrabold bg-white">
                    ${rc.activeProcesses.map(p => `<option value="${escapeHtml(p)}">${escapeHtml(p)}</option>`).join('')}
                </select>
            </div>
            <div class="flex items-center gap-1.5">
                <span class="font-extrabold text-amber-950 shrink-0">② 원재료:</span>
                <select id="quickAddRawSelect" class="flex-1 border border-amber-300 rounded-lg px-2 py-1.5 font-bold bg-white">
                    <option value="">발주 원재료에서 선택...</option>
                    ${rawCatalog.map(c => `<option value="${escapeHtml(c.key)}">${escapeHtml(c.item)} (${escapeHtml(c.spec)} · ${formatCurrency(c.unitPrice)})</option>`).join('')}
                </select>
                <button type="button" onclick="addIngredientToRecipe()" class="px-3 py-1.5 rounded-lg bg-stone-900 text-white font-extrabold cursor-pointer shrink-0">+ 원재료 추가</button>
            </div>
            <div class="flex items-center justify-end gap-1.5">
                <button type="button" onclick="addBlankIngredientToRecipe()" class="px-3 py-1.5 rounded-lg bg-white border border-stone-300 text-stone-700 font-bold cursor-pointer">+ 직접입력 행</button>
                <button type="button" onclick="addPackagingRowToRecipe()" class="px-3 py-1.5 rounded-lg bg-emerald-700 text-white font-extrabold cursor-pointer">+ ③ 포장지 추가</button>
            </div>
        </div>

        <div class="overflow-x-auto border border-stone-200 rounded-2xl">
            <table class="w-full text-left border-collapse text-xs">
                <thead>
                    <tr class="bg-stone-100 border-b border-stone-200 font-extrabold text-stone-600">
                        <th class="py-2 px-2.5 text-center">공정</th>
                        <th class="py-2 px-2.5">원재료명</th>
                        <th class="py-2 px-2 text-center">규격</th>
                        <th class="py-2 px-2 text-right">구입단가</th>
                        <th class="py-2 px-2 text-center">가루류(베이커스%)</th>
                        <th class="py-2 px-2.5 text-right bg-amber-100/60 text-amber-950">배합량 (g)</th>
                        <th class="py-2 px-2 text-right">중량비(%)</th>
                        <th class="py-2 px-2 text-right">베이커스(%)</th>
                        <th class="py-2 px-2.5 text-right">투입 원가</th>
                        <th class="py-2 px-2 text-center">삭제</th>
                    </tr>
                </thead>
                <tbody>
                    ${(rc.ingredients || []).map((ig, idx) => {
                        const w = parseFloat(ig.weightG ?? ig.g1 ?? 0) || 0;
                        const specG = parseFloat(ig.specGrams) || parseSpecToGrams(ig.spec) || 1000;
                        const uPrice = parseFloat(ig.unitPrice) || 0;
                        const rowCost = specG > 0 ? (uPrice / specG) * w : 0;
                        const weightPct = m.weightTotalG > 0 ? ((w / m.weightTotalG) * 100) : 0;
                        const bakersPct = m.flourTotalG > 0 ? ((w / m.flourTotalG) * 100) : 0;
                        return `
                            <tr class="border-b border-stone-100 hover:bg-stone-50">
                                <td class="py-1.5 px-2 text-center">
                                    <select onchange="updateRecipeIngredient(${idx}, 'process', this.value)" class="border border-stone-200 rounded px-1.5 py-0.5 font-bold bg-white">
                                        ${rc.activeProcesses.map(p => `<option value="${escapeHtml(p)}" ${ig.process === p ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('')}
                                    </select>
                                </td>
                                <td class="py-1.5 px-2.5"><input type="text" value="${escapeHtml(ig.item || '')}" onchange="updateRecipeIngredient(${idx}, 'item', this.value)" class="w-full font-extrabold text-stone-900 border-b border-transparent focus:border-amber-500 focus:outline-none"></td>
                                <td class="py-1.5 px-2 text-center"><input type="text" value="${escapeHtml(ig.spec || '')}" onchange="updateRecipeIngredient(${idx}, 'spec', this.value)" class="w-16 text-center text-stone-600 border rounded px-1 py-0.5"></td>
                                <td class="py-1.5 px-2 text-right"><input type="text" value="${formatNumber(uPrice)}" onchange="updateRecipeIngredient(${idx}, 'unitPrice', this.value)" class="w-20 text-right font-bold border rounded px-1.5 py-0.5"></td>
                                <td class="py-1.5 px-2 text-center"><input type="checkbox" ${ig.isFlour ? 'checked' : ''} onchange="updateRecipeIngredient(${idx}, 'isFlour', this.checked)" class="rounded text-amber-600"></td>
                                <td class="py-1.5 px-2.5 text-right bg-amber-50/40"><input type="text" value="${formatNumber(w)}" onchange="updateRecipeIngredient(${idx}, 'weightG', this.value)" class="w-24 text-right font-extrabold text-amber-950 border border-amber-300 rounded px-1.5 py-0.5 bg-white"></td>
                                <td class="py-1.5 px-2 text-right text-stone-600 font-semibold">${weightPct.toFixed(1)}%</td>
                                <td class="py-1.5 px-2 text-right text-amber-800 font-bold">${bakersPct.toFixed(1)}%</td>
                                <td class="py-1.5 px-2.5 text-right font-extrabold text-stone-900">${formatCurrency(rowCost)}</td>
                                <td class="py-1.5 px-2 text-center"><button type="button" onclick="removeRecipeIngredient(${idx})" class="text-stone-400 hover:text-rose-600 cursor-pointer"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>

        <div class="border border-stone-200 rounded-2xl overflow-hidden">
            <div class="px-4 py-2 bg-stone-100 border-b border-stone-200 flex items-center justify-between text-xs font-extrabold text-stone-700">
                <span>포장지 · 부자재 투입 리스트 (1PK 기준)</span>
                <span>총 포장원가 합계: <strong class="text-emerald-800">${formatCurrency(m.totalPackCost)}</strong></span>
            </div>
            <table class="w-full text-left border-collapse text-xs">
                <thead>
                    <tr class="bg-stone-50 border-b border-stone-200 font-bold text-stone-500">
                        <th class="py-2 px-3">구분</th>
                        <th class="py-2 px-3">포장 부자재명</th>
                        <th class="py-2 px-2 text-center">구매규격</th>
                        <th class="py-2 px-2 text-right">구매단가</th>
                        <th class="py-2 px-2 text-center">규격입수량</th>
                        <th class="py-2 px-2 text-center">1PK 사용수량</th>
                        <th class="py-2 px-3 text-right">1PK 포장원가</th>
                        <th class="py-2 px-2 text-center">삭제</th>
                    </tr>
                </thead>
                <tbody>
                    ${(rc.packagingList || []).map((pk, idx) => {
                        const pCost = (parseFloat(pk.specQty) || 1) > 0 ? ((parseFloat(pk.purchasePrice) || 0) / (parseFloat(pk.specQty) || 1)) * (parseFloat(pk.usedQty) || 1) : 0;
                        return `
                            <tr class="border-b border-stone-100">
                                <td class="py-1.5 px-3">
                                    <select onchange="updateRecipePackaging(${idx}, 'packType', this.value)" class="border rounded px-1.5 py-0.5 font-bold">
                                        <option value="UNIT" ${pk.packType === 'UNIT' ? 'selected' : ''}>개별포장</option>
                                        <option value="BOX" ${pk.packType === 'BOX' ? 'selected' : ''}>박스/외포장</option>
                                    </select>
                                </td>
                                <td class="py-1.5 px-3"><input type="text" value="${escapeHtml(pk.name || '')}" onchange="updateRecipePackaging(${idx}, 'name', this.value)" class="w-full font-bold border rounded px-2 py-0.5"></td>
                                <td class="py-1.5 px-2 text-center"><input type="text" value="${escapeHtml(pk.spec || '')}" onchange="updateRecipePackaging(${idx}, 'spec', this.value)" class="w-20 text-center border rounded px-1 py-0.5"></td>
                                <td class="py-1.5 px-2 text-right"><input type="text" value="${formatNumber(pk.purchasePrice)}" onchange="updateRecipePackaging(${idx}, 'purchasePrice', this.value)" class="w-24 text-right font-bold border rounded px-1.5 py-0.5"></td>
                                <td class="py-1.5 px-2 text-center"><input type="text" value="${formatNumber(pk.specQty)}" onchange="updateRecipePackaging(${idx}, 'specQty', this.value)" class="w-16 text-center border rounded px-1 py-0.5"></td>
                                <td class="py-1.5 px-2 text-center"><input type="text" value="${formatNumber(pk.usedQty)}" onchange="updateRecipePackaging(${idx}, 'usedQty', this.value)" class="w-16 text-center font-extrabold border rounded px-1 py-0.5"></td>
                                <td class="py-1.5 px-3 text-right font-extrabold text-emerald-900">${formatCurrency(pCost)}</td>
                                <td class="py-1.5 px-2 text-center"><button type="button" onclick="removeRecipePackaging(${idx})" class="text-stone-400 hover:text-rose-600 cursor-pointer"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i></button></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
    if (window.lucide) lucide.createIcons();
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

function toggleRecipeProcessPreset(pName) {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    if (!Array.isArray(rc.activeProcesses)) rc.activeProcesses = ['반죽'];
    if (rc.activeProcesses.includes(pName)) {
        if (rc.activeProcesses.length > 1) rc.activeProcesses = rc.activeProcesses.filter(p => p !== pName);
    } else {
        rc.activeProcesses.push(pName);
    }
    saveLocalCache();
    renderRecipeWorkspace();
}

function addIngredientToRecipe() {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    const proc = document.getElementById('quickAddProcessSelect')?.value || '반죽';
    const rawKey = document.getElementById('quickAddRawSelect')?.value;
    if (!rawKey) return showToast('추가할 원재료를 선택해 주세요.', 'error');
    const found = getRawMaterialCatalogForRecipe().find(c => c.key === rawKey);
    if (!found) return;
    rc.ingredients.push({
        rowId: 'ri_' + Date.now(), process: proc, item: found.item, spec: found.spec,
        unitPrice: found.unitPrice, specGrams: found.specGrams, isFlour: /분|가루|밀/.test(found.item), weightG: 1000
    });
    saveLocalCache();
    renderRecipeWorkspace();
}

function addBlankIngredientToRecipe() {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc) return;
    const proc = document.getElementById('quickAddProcessSelect')?.value || '반죽';
    rc.ingredients.push({ rowId: 'ri_' + Date.now(), process: proc, item: '신규 원재료', spec: '1kg', unitPrice: 10000, specGrams: 1000, isFlour: false, weightG: 500 });
    saveLocalCache();
    renderRecipeWorkspace();
}

function updateRecipeIngredient(idx, field, val) {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc || !rc.ingredients[idx]) return;
    if (field === 'unitPrice' || field === 'weightG') rc.ingredients[idx][field] = parseNumericCell(val);
    else if (field === 'spec') { rc.ingredients[idx].spec = val; rc.ingredients[idx].specGrams = parseSpecToGrams(val); }
    else rc.ingredients[idx][field] = val;
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
    if (!Array.isArray(rc.packagingList)) rc.packagingList = [];
    rc.packagingList.push({ rowId: 'pk_' + Date.now(), name: '포장 비닐/박스', spec: '1,000매', purchasePrice: 35000, specQty: 1000, usedQty: rc.packQty || 1, packType: 'UNIT' });
    saveLocalCache();
    renderRecipeWorkspace();
}

function updateRecipePackaging(idx, field, val) {
    const rc = recipesData.find(r => r.id === selectedRecipeId);
    if (!rc || !rc.packagingList[idx]) return;
    if (['purchasePrice', 'specQty', 'usedQty'].includes(field)) rc.packagingList[idx][field] = parseNumericCell(val);
    else rc.packagingList[idx][field] = val;
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

function openRecipeDbModal() {
    document.getElementById('recipeGasUrlInput').value = recipeGasWebAppUrl;
    const m = document.getElementById('recipeDbModal');
    m.classList.remove('hidden'); m.classList.add('flex');
}

function closeRecipeDbModal() {
    const m = document.getElementById('recipeDbModal');
    m.classList.add('hidden'); m.classList.remove('flex');
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
                const procs = parsedJson.activeProcesses || ['반죽', '토핑'];
                return {
                    id: r.id || ('rc_' + Date.now() + Math.random()), productCode: String(r.productCode || '1001'), productName: r.productName || '레시피',
                    divisionWeight: parseFloat(r.divisionWeight) || 100, customProductionQty: parseFloat(r.customProductionQty) || 50,
                    packQty: parseFloat(r.packQty) || 10, sellingPrice: parseFloat(r.sellingPrice) || 0, lossRatio: parseFloat(r.lossRatio) || 0,
                    activeProcesses: procs, ingredients: ings, packagingList: pkgs, updatedAt: r.updatedAt || getTodayStr()
                };
            });
            selectedRecipeId = recipesData[0]?.id || null;
            saveLocalCache();
            if (activeMasterDomain === 'RECIPE') renderRecipeWorkspace();
            if (showMessage) showToast(`레시피 DB에서 ${recipesData.length}종 불러오기 완료`, 'success');
        }
    } catch (e) { if (showMessage) showToast('레시피 DB URL을 확인해 주세요.', 'error'); }
}

async function pushRecipesToGoogleSheet(silent = false) {
    saveLocalCache();
    if (!recipeGasWebAppUrl) return;
    const payloadRows = recipesData.map(rc => {
        const m = calculateRecipeMetrics(rc);
        return {
            productCode: rc.productCode, productName: rc.productName, divisionWeight: rc.divisionWeight, customProductionQty: rc.customProductionQty,
            packQty: rc.packQty, sellingPrice: rc.sellingPrice, lossRatio: rc.lossRatio, unitPackCost: Math.round(m.unitPackCost), totalPackCost: Math.round(m.totalPackCost),
            productionCost: Math.round(m.productionCost), weightTotalG: m.weightTotalG,
            ingredientsJson: JSON.stringify({ activeProcesses: rc.activeProcesses, ingredients: rc.ingredients, packagingList: rc.packagingList }),
            updatedAt: rc.updatedAt || getTodayStr(), id: rc.id
        };
    });
    try {
        await fetchWithTimeout(recipeGasWebAppUrl, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'replaceAll', data: payloadRows }) }, 14000);
        if (!silent) showToast('레시피 DB에 저장되었습니다.', 'success');
    } catch (e) {
        try {
            await fetch(recipeGasWebAppUrl, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action: 'replaceAll', data: payloadRows }) });
            if (!silent) showToast('레시피 DB 저장 요청 완료', 'success');
        } catch (e2) { if (!silent) showToast('레시피 DB 저장 실패', 'error'); }
    }
}

function exportRecipesCsv() {
    let csv = '\uFEFF제품코드,제품명,분할중량(g),생산수량,1PK포장수량,1PK판매가,1배합원가,1PK총원가,원가율(%)\n';
    recipesData.forEach(rc => {
        const m = calculateRecipeMetrics(rc);
        csv += `"${rc.productCode}","${rc.productName}",${rc.divisionWeight},${m.prodQty},${rc.packQty},${rc.sellingPrice},${Math.round(m.productionCost)},${Math.round(m.onePkTotalCost)},${m.costRatioPct.toFixed(1)}\n`;
    });
    triggerCsvDownload(csv, `바로가공장_레시피원가표_${getTodayStr()}.csv`);
}
