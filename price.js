// ============================================================================
// [VERSION: price.js v1.13 - 2026-11-20 공정 상세 원재료비 카드도 레시피 실시간 값 표시 / v1.12 3~5단계 (레시피 재료비 실시간 반영·매장 수수료율 설정화·퇴직금 표기 정리) / v1.11 2단계 보안 (급여·고정비·매출·단가 기본값 코드에서 제거, DB 값만 사용) / v1.10 1단계 데이터 손실 방지 (저장 응답 확인 · 리비전 충돌 방지 · 불러오기 실패 시 저장 중지 · 빈 DB 자동 덮어쓰기 제거)]
// 바로가 공장 통합 관리 시스템 - 제품단가 전용 모듈 (price.js)
// ============================================================================
(function () {

    const { useState, useMemo, useEffect, useRef } = React;

    // ============================================================================
    // [시트 1] 바로가 생산원가 분석 — 기본설정 원본 초기값 (엑셀 100% 이식)
    // ============================================================================
    const INITIAL_BASIC_SETTINGS = {
      // ■ 1. 근무시간 산정 (한국 노동법)
      avgMonthlyWorkDays: 21.8, // 월 소정근로일수 (평균) - 365÷12÷7×5
      dailyWorkHours: 8, // 일 소정근로시간 - 법정 기준
      annualLeaveDays: 15, // 연차휴가 (연간) - 근로기준법 제60조
      annualPublicHolidays: 15, // 공휴일 유급 (연간) - 5인이상 사업장

      // ■ 2. 퇴직금
      severanceRatePercent: 8.33, // 퇴직금 비율 (참고값 · 계산 미사용: 기본급여(세전)에 퇴직금이 포함된 것으로 책정)
      storeCommissionRatePercent: 9.29, // [5단계] 매장 매입가 수수료율(%) — 매장 매입가 = 출고가 × (1+수수료율) × 1.1(VAT)

      // ■ 3. 월간 환산 기준
      defaultMonthlyProdDays: 20, // 월 평균 생산일수 (기본값) - 파트별 시트에서 개별 조정 가능

      // ■ 4. 월 고정비 항목 (인건비 제외) - DB 구조 (수정·추가·삭제 가능)
      fixedCostItems: [
        { id: 'fc-1', name: '임차료 (공장+사무실)', amount: 0, unit: '원/월', note: '' },
        { id: 'fc-2', name: '전기·수도·가스', amount: 0, unit: '원/월', note: '' },
        { id: 'fc-3', name: '감가상각비', amount: 0, unit: '원/월', note: '' },
        { id: 'fc-4', name: '운송비', amount: 0, unit: '원/월', note: '' },
        { id: 'fc-5', name: '청소비', amount: 0, unit: '원/월', note: '' },
        { id: 'fc-6', name: '통신·소방·프로그램', amount: 0, unit: '원/월', note: '' },
        { id: 'fc-7', name: '반품·불량·샘플', amount: 0, unit: '원/월', note: '' },
        { id: 'fc-8', name: '수선비', amount: 0, unit: '원/월', note: '' },
        { id: 'fc-9', name: '부재료 (포장재 등)', amount: 0, unit: '원/월', note: '' },
        { id: 'fc-10', name: '복리후생', amount: 0, unit: '원/월', note: '' },
        { id: 'fc-11', name: '사대보험+국세 (회사부담)', amount: 0, unit: '원/월', note: '' },
        { id: 'fc-12', name: '법인카드 (기타경비)', amount: 0, unit: '원/월', note: '' },
        { id: 'fc-13', name: '보안·검사·세무 등', amount: 0, unit: '원/월', note: '' },
        { id: 'fc-14', name: '비생산직 인건비 (품질·구매·영업·대표 4인)', amount: 0, unit: '원/월', note: '' },
      ],

      // ■ 5. 고정비 배분 기준 · 활용 지표
      expectedTotalMonthlySales: 0, // 바로가 전체 예상 월 매출 (출고가)

      // ■ 6. 파트별 예상 월 매출 배분
      linkPartFixedToMonthlyTotal: false,
      partAllocations: [
        {
          id: 'part-1',
          name: '파이',
          expectedSales: 0,
          rawAllocatedFixed: 0,
          laborFactor: 2.2,
          factorNote: '',
          juneSalaryTotal: '',
          juneAllocatedCost: null,
        },
        {
          id: 'part-2',
          name: '알생지·건강빵',
          expectedSales: 0,
          rawAllocatedFixed: 0,
          laborFactor: 1.1,
          factorNote: '',
          juneSalaryTotal: '',
          juneAllocatedCost: null,
        },
        {
          id: 'part-3',
          name: '파베이크',
          expectedSales: 0,
          rawAllocatedFixed: 0,
          laborFactor: 1.1,
          factorNote: '',
          juneSalaryTotal: '',
          juneAllocatedCost: null,
        },
        {
          id: 'part-4',
          name: '제과',
          expectedSales: 0,
          rawAllocatedFixed: 0,
          laborFactor: 1.5,
          factorNote: '',
          juneSalaryTotal: '',
          juneAllocatedCost: null,
        },
      ],

      // ■ 7. 작업유형별 기본급여(세전) DB (제품별 인건비 산출 기준 데이터)
      jobTypeSalaries: [
        { id: 'jt-1', jobType: '론도', baseSalary: 0 },
        { id: 'jt-2', jobType: '밑작업', baseSalary: 0 },
        { id: 'jt-3', jobType: '계량 직원', baseSalary: 0 },
        { id: 'jt-4', jobType: '믹싱 직원', baseSalary: 0 },
        { id: 'jt-5', jobType: '반죽 직원', baseSalary: 0 },
        { id: 'jt-6', jobType: '성형', baseSalary: 0 },
        { id: 'jt-7', jobType: '분할', baseSalary: 0 },
        { id: 'jt-8', jobType: '반죽 분할', baseSalary: 0 },
        { id: 'jt-9', jobType: '반죽 분할 직원', baseSalary: 0 },
        { id: 'jt-10', jobType: '분할 직원', baseSalary: 0 },
        { id: 'jt-11', jobType: '버터 분할', baseSalary: 0 },
        { id: 'jt-12', jobType: '버터 성형', baseSalary: 0 },
        { id: 'jt-13', jobType: '재단', baseSalary: 0 },
        { id: 'jt-14', jobType: '버터 라미네이팅', baseSalary: 0 },
        { id: 'jt-15', jobType: '라미네이팅', baseSalary: 0 },
        { id: 'jt-16', jobType: '라미네이팅 냉동 이동', baseSalary: 0 },
        { id: 'jt-17', jobType: '바리오컷', baseSalary: 0 },
        { id: 'jt-18', jobType: '기계', baseSalary: 0 },
        { id: 'jt-19', jobType: '기계 보조', baseSalary: 0 },
        { id: 'jt-20', jobType: '반죽 냉동 이동', baseSalary: 0 },
        { id: 'jt-21', jobType: '냉동 이동 및 중간정리', baseSalary: 0 },
        { id: 'jt-22', jobType: '냉동 이동 및 정리', baseSalary: 0 },
        { id: 'jt-23', jobType: '냉동 보관 및 정리', baseSalary: 0 },
        { id: 'jt-24', jobType: '냉동 보관', baseSalary: 0 },
        { id: 'jt-25', jobType: '냉동보관', baseSalary: 0 },
        { id: 'jt-26', jobType: '중간정리', baseSalary: 0 },
        { id: 'jt-27', jobType: '정리', baseSalary: 0 },
        { id: 'jt-28', jobType: '속재료 정리', baseSalary: 0 },
        { id: 'jt-29', jobType: '준비', baseSalary: 0 },
        { id: 'jt-30', jobType: '굽기', baseSalary: 0 },
        { id: 'jt-31', jobType: '사과캔 따기, 굽기', baseSalary: 0 },
        { id: 'jt-32', jobType: '작업자1', baseSalary: 0 },
        { id: 'jt-33', jobType: '작업자2', baseSalary: 0 },
      ],
    };

    const createBlankProcessSheet = (categoryKey, customName = '신규 품목') => {
      const uid = `${categoryKey}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      return {
        id: uid,
        productCode: '',
        productName: customName,
        batchOutputEa: 0,
        pkQuantityEa: 1,
        batchMaterialCost: 0,
        stage1Rows: [
          { id: `${uid}-s1-1`, jobTypeId: 'jt-3', minutes: 0, note: '' },
          { id: `${uid}-s1-2`, jobTypeId: 'jt-4', minutes: 0, note: '' },
        ],
        stage2Rows: [
          { id: `${uid}-s2-1`, jobTypeId: 'jt-8', minutes: 0, note: '' },
          { id: `${uid}-s2-2`, jobTypeId: 'jt-6', minutes: 0, note: '' },
        ],
        stage3Rows: [
          { id: `${uid}-s3-1`, jobTypeId: 'jt-32', minutes: 0, note: '' },
          { id: `${uid}-s3-2`, jobTypeId: 'jt-33', minutes: 0, note: '' },
          { id: `${uid}-s3-3`, jobTypeId: '', minutes: 0, note: '' },
          { id: `${uid}-s3-4`, jobTypeId: '', minutes: 0, note: '' },
        ],
      };
    };

    const INITIAL_CATEGORY_DBS = {
      PIE: [
        {
          id: 'pie-croissant',
          productName: '크로와상',
          batchOutputEa: 1381,
          pkQuantityEa: 48,
          stage1Rows: [
            { id: 'cr-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'cr-s1-2', jobTypeId: 'jt-4', minutes: 25, note: '' },
          ],
          stage2Rows: [
            { id: 'cr-s2-1', jobTypeId: 'jt-8', minutes: 20, note: '' },
            { id: 'cr-s2-2', jobTypeId: 'jt-8', minutes: 20, note: '' },
            { id: 'cr-s2-3', jobTypeId: 'jt-20', minutes: 3, note: '' },
            { id: 'cr-s2-4', jobTypeId: 'jt-14', minutes: 20, note: '' },
            { id: 'cr-s2-5', jobTypeId: 'jt-15', minutes: 92, note: '' },
            { id: 'cr-s2-6', jobTypeId: 'jt-16', minutes: 3, note: '' },
            { id: 'cr-s2-7', jobTypeId: 'jt-1', minutes: 15, note: '' },
            { id: 'cr-s2-8', jobTypeId: 'jt-17', minutes: 10, note: '' },
            { id: 'cr-s2-9', jobTypeId: 'jt-17', minutes: 10, note: '' },
            { id: 'cr-s2-10', jobTypeId: 'jt-6', minutes: 65, note: '' },
            { id: 'cr-s2-11', jobTypeId: 'jt-6', minutes: 65, note: '' },
            { id: 'cr-s2-12', jobTypeId: 'jt-6', minutes: 65, note: '' },
            { id: 'cr-s2-13', jobTypeId: 'jt-21', minutes: 5, note: '' },
          ],
          stage3Rows: [
            { id: 'cr-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'cr-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'cr-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'cr-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'pie-bamsagwa',
          productName: '밤사과 막대',
          batchOutputEa: 200,
          pkQuantityEa: 3,
          stage1Rows: [
            { id: 'bs-s1-1', jobTypeId: '', minutes: 0, note: '' },
            { id: 'bs-s1-2', jobTypeId: '', minutes: 0, note: '' },
          ],
          stage2Rows: [
            { id: 'bs-s2-1', jobTypeId: 'jt-1', minutes: 40, note: '' },
            { id: 'bs-s2-2', jobTypeId: 'jt-2', minutes: 30, note: '' },
            { id: 'bs-s2-3', jobTypeId: 'jt-6', minutes: 100, note: '' },
            { id: 'bs-s2-4', jobTypeId: 'jt-7', minutes: 20, note: '' },
            { id: 'bs-s2-5', jobTypeId: 'jt-25', minutes: 3, note: '' },
            { id: 'bs-s2-6', jobTypeId: 'jt-26', minutes: 3, note: '' },
          ],
          stage3Rows: [
            { id: 'bs-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'bs-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'bs-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'bs-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'pie-painauchocolat',
          productName: '뺑오쇼콜라',
          batchOutputEa: 1537,
          pkQuantityEa: 36,
          stage1Rows: [
            { id: 'pc-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'pc-s1-2', jobTypeId: 'jt-4', minutes: 20, note: '' },
          ],
          stage2Rows: [
            { id: 'pc-s2-1', jobTypeId: 'jt-8', minutes: 20, note: '' },
            { id: 'pc-s2-2', jobTypeId: 'jt-8', minutes: 20, note: '' },
            { id: 'pc-s2-3', jobTypeId: 'jt-20', minutes: 3, note: '' },
            { id: 'pc-s2-4', jobTypeId: 'jt-14', minutes: 20, note: '' },
            { id: 'pc-s2-5', jobTypeId: 'jt-15', minutes: 92, note: '' },
            { id: 'pc-s2-6', jobTypeId: 'jt-16', minutes: 3, note: '' },
            { id: 'pc-s2-7', jobTypeId: 'jt-1', minutes: 30, note: '' },
            { id: 'pc-s2-8', jobTypeId: 'jt-2', minutes: 15, note: '' },
            { id: 'pc-s2-9', jobTypeId: 'jt-7', minutes: 20, note: '' },
            { id: 'pc-s2-10', jobTypeId: 'jt-6', minutes: 83, note: '' },
            { id: 'pc-s2-11', jobTypeId: 'jt-6', minutes: 83, note: '' },
            { id: 'pc-s2-12', jobTypeId: 'jt-27', minutes: 3, note: '' },
          ],
          stage3Rows: [
            { id: 'pc-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'pc-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'pc-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'pc-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'pie-kouignamann',
          productName: '퀸아망 막대',
          batchOutputEa: 100,
          pkQuantityEa: 2,
          stage1Rows: [
            { id: 'ka-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'ka-s1-2', jobTypeId: 'jt-4', minutes: 20, note: '' },
          ],
          stage2Rows: [
            { id: 'ka-s2-1', jobTypeId: 'jt-8', minutes: 20, note: '' },
            { id: 'ka-s2-2', jobTypeId: 'jt-8', minutes: 20, note: '' },
            { id: 'ka-s2-3', jobTypeId: 'jt-20', minutes: 3, note: '' },
            { id: 'ka-s2-4', jobTypeId: 'jt-14', minutes: 20, note: '' },
            { id: 'ka-s2-5', jobTypeId: 'jt-15', minutes: 92, note: '' },
            { id: 'ka-s2-6', jobTypeId: 'jt-16', minutes: 3, note: '' },
            { id: 'ka-s2-7', jobTypeId: 'jt-1', minutes: 30, note: '' },
            { id: 'ka-s2-8', jobTypeId: 'jt-2', minutes: 15, note: '' },
            { id: 'ka-s2-9', jobTypeId: 'jt-7', minutes: 20, note: '' },
            { id: 'ka-s2-10', jobTypeId: 'jt-6', minutes: 83, note: '' },
            { id: 'ka-s2-11', jobTypeId: 'jt-6', minutes: 83, note: '' },
            { id: 'ka-s2-12', jobTypeId: 'jt-27', minutes: 3, note: '' },
          ],
          stage3Rows: [
            { id: 'ka-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'ka-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'ka-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'ka-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'pie-chausson',
          productName: '쇼숑',
          batchOutputEa: 848,
          pkQuantityEa: 20,
          stage1Rows: [
            { id: 'cs-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'cs-s1-2', jobTypeId: 'jt-4', minutes: 20, note: '' },
          ],
          stage2Rows: [
            { id: 'cs-s2-1', jobTypeId: 'jt-10', minutes: 90, note: '' },
            { id: 'cs-s2-2', jobTypeId: 'jt-24', minutes: 9, note: '' },
            { id: 'cs-s2-3', jobTypeId: 'jt-15', minutes: 15, note: '' },
            { id: 'cs-s2-4', jobTypeId: 'jt-24', minutes: 9, note: '' },
            { id: 'cs-s2-5', jobTypeId: 'jt-1', minutes: 120, note: '' },
            { id: 'cs-s2-6', jobTypeId: 'jt-2', minutes: 90, note: '' },
            { id: 'cs-s2-7', jobTypeId: 'jt-7', minutes: 60, note: '' },
            { id: 'cs-s2-8', jobTypeId: 'jt-28', minutes: 60, note: '' },
            { id: 'cs-s2-9', jobTypeId: 'jt-23', minutes: 15, note: '' },
            { id: 'cs-s2-10', jobTypeId: 'jt-8', minutes: 90, note: '' },
          ],
          stage3Rows: [
            { id: 'cs-s3-1', jobTypeId: 'jt-32', minutes: 30, note: '' },
            { id: 'cs-s3-2', jobTypeId: 'jt-33', minutes: 30, note: '' },
            { id: 'cs-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'cs-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'pie-montmartre',
          productName: '몽마르트 막대',
          batchOutputEa: 112,
          pkQuantityEa: 2,
          stage1Rows: [
            { id: 'mm-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'mm-s1-2', jobTypeId: 'jt-4', minutes: 36, note: '' },
          ],
          stage2Rows: [
            { id: 'mm-s2-1', jobTypeId: 'jt-8', minutes: 22, note: '' },
            { id: 'mm-s2-2', jobTypeId: 'jt-8', minutes: 22, note: '' },
            { id: 'mm-s2-3', jobTypeId: 'jt-20', minutes: 3, note: '' },
            { id: 'mm-s2-4', jobTypeId: 'jt-14', minutes: 20, note: '' },
            { id: 'mm-s2-5', jobTypeId: 'jt-15', minutes: 140, note: '' },
            { id: 'mm-s2-6', jobTypeId: 'jt-16', minutes: 3, note: '' },
            { id: 'mm-s2-7', jobTypeId: 'jt-1', minutes: 30, note: '' },
            { id: 'mm-s2-8', jobTypeId: 'jt-7', minutes: 20, note: '' },
            { id: 'mm-s2-9', jobTypeId: 'jt-6', minutes: 40, note: '' },
            { id: 'mm-s2-10', jobTypeId: 'jt-6', minutes: 40, note: '' },
            { id: 'mm-s2-11', jobTypeId: 'jt-27', minutes: 3, note: '' },
          ],
          stage3Rows: [
            { id: 'mm-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'mm-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'mm-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'mm-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'pie-fromageblanc',
          productName: '프로마쥬블랑',
          batchOutputEa: 1381,
          pkQuantityEa: 20,
          stage1Rows: [
            { id: 'fb-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'fb-s1-2', jobTypeId: 'jt-4', minutes: 25, note: '' },
          ],
          stage2Rows: [
            { id: 'fb-s2-1', jobTypeId: 'jt-8', minutes: 20, note: '' },
            { id: 'fb-s2-2', jobTypeId: 'jt-8', minutes: 20, note: '' },
            { id: 'fb-s2-3', jobTypeId: 'jt-20', minutes: 3, note: '' },
            { id: 'fb-s2-4', jobTypeId: 'jt-14', minutes: 20, note: '' },
            { id: 'fb-s2-5', jobTypeId: 'jt-15', minutes: 92, note: '' },
            { id: 'fb-s2-6', jobTypeId: 'jt-16', minutes: 3, note: '' },
            { id: 'fb-s2-7', jobTypeId: 'jt-1', minutes: 30, note: '' },
            { id: 'fb-s2-8', jobTypeId: 'jt-7', minutes: 50, note: '' },
            { id: 'fb-s2-9', jobTypeId: 'jt-6', minutes: 50, note: '' },
            { id: 'fb-s2-10', jobTypeId: 'jt-21', minutes: 5, note: '' },
          ],
          stage3Rows: [
            { id: 'fb-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'fb-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'fb-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'fb-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'pie-boston',
          productName: '보스톤',
          batchOutputEa: 1174,
          pkQuantityEa: 20,
          stage1Rows: [
            { id: 'bt-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'bt-s1-2', jobTypeId: 'jt-4', minutes: 25, note: '' },
          ],
          stage2Rows: [
            { id: 'bt-s2-1', jobTypeId: 'jt-8', minutes: 20, note: '' },
            { id: 'bt-s2-2', jobTypeId: 'jt-8', minutes: 20, note: '' },
            { id: 'bt-s2-3', jobTypeId: 'jt-20', minutes: 3, note: '' },
            { id: 'bt-s2-4', jobTypeId: 'jt-14', minutes: 20, note: '' },
            { id: 'bt-s2-5', jobTypeId: 'jt-15', minutes: 92, note: '' },
            { id: 'bt-s2-6', jobTypeId: 'jt-16', minutes: 3, note: '' },
            { id: 'bt-s2-7', jobTypeId: 'jt-1', minutes: 30, note: '' },
            { id: 'bt-s2-8', jobTypeId: 'jt-7', minutes: 50, note: '' },
            { id: 'bt-s2-9', jobTypeId: 'jt-6', minutes: 50, note: '' },
            { id: 'bt-s2-10', jobTypeId: 'jt-21', minutes: 5, note: '' },
          ],
          stage3Rows: [
            { id: 'bt-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'bt-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'bt-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'bt-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'pie-doublefromage',
          productName: '더블프로마쥬',
          batchOutputEa: 14,
          pkQuantityEa: 6,
          stage1Rows: [
            { id: 'df-s1-1', jobTypeId: '', minutes: 0, note: '' },
            { id: 'df-s1-2', jobTypeId: '', minutes: 0, note: '' },
          ],
          stage2Rows: [
            { id: 'df-s2-1', jobTypeId: 'jt-18', minutes: 100, note: '' },
            { id: 'df-s2-2', jobTypeId: 'jt-7', minutes: 20, note: '' },
            { id: 'df-s2-3', jobTypeId: 'jt-21', minutes: 5, note: '' },
          ],
          stage3Rows: [
            { id: 'df-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'df-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'df-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'df-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'pie-cremefeuille',
          productName: '크렘푀이유',
          batchOutputEa: 25,
          pkQuantityEa: 15,
          stage1Rows: [
            { id: 'cf-s1-1', jobTypeId: '', minutes: 0, note: '' },
            { id: 'cf-s1-2', jobTypeId: '', minutes: 0, note: '' },
          ],
          stage2Rows: [
            { id: 'cf-s2-1', jobTypeId: 'jt-2', minutes: 7, note: '' },
            { id: 'cf-s2-2', jobTypeId: 'jt-18', minutes: 2, note: '' },
            { id: 'cf-s2-3', jobTypeId: 'jt-7', minutes: 4, note: '' },
            { id: 'cf-s2-4', jobTypeId: 'jt-21', minutes: 3, note: '' },
          ],
          stage3Rows: [
            { id: 'cf-s3-1', jobTypeId: 'jt-32', minutes: 3, note: '' },
            { id: 'cf-s3-2', jobTypeId: 'jt-33', minutes: 3, note: '' },
            { id: 'cf-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'cf-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'pie-minicroissant',
          productName: '미니 크로와상',
          batchOutputEa: 2610,
          pkQuantityEa: 80,
          stage1Rows: [
            { id: 'mc-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'mc-s1-2', jobTypeId: 'jt-4', minutes: 25, note: '' },
          ],
          stage2Rows: [
            { id: 'mc-s2-1', jobTypeId: 'jt-8', minutes: 20, note: '' },
            { id: 'mc-s2-2', jobTypeId: 'jt-8', minutes: 20, note: '' },
            { id: 'mc-s2-3', jobTypeId: 'jt-20', minutes: 3, note: '' },
            { id: 'mc-s2-4', jobTypeId: 'jt-14', minutes: 20, note: '' },
            { id: 'mc-s2-5', jobTypeId: 'jt-15', minutes: 92, note: '' },
            { id: 'mc-s2-6', jobTypeId: 'jt-16', minutes: 3, note: '' },
            { id: 'mc-s2-7', jobTypeId: 'jt-1', minutes: 15, note: '' },
            { id: 'mc-s2-8', jobTypeId: 'jt-17', minutes: 10, note: '' },
            { id: 'mc-s2-9', jobTypeId: 'jt-17', minutes: 10, note: '' },
            { id: 'mc-s2-10', jobTypeId: 'jt-6', minutes: 125, note: '' },
            { id: 'mc-s2-11', jobTypeId: 'jt-6', minutes: 125, note: '' },
            { id: 'mc-s2-12', jobTypeId: 'jt-6', minutes: 125, note: '' },
            { id: 'mc-s2-13', jobTypeId: 'jt-21', minutes: 10, note: '' },
          ],
          stage3Rows: [
            { id: 'mc-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'mc-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'mc-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'mc-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
      ],
      DOUGH: [
        {
          id: 'dough-olivebread',
          productName: '올리브식빵 생지',
          batchOutputEa: 240,
          pkQuantityEa: 12,
          stage1Rows: [
            { id: 'ob-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'ob-s1-2', jobTypeId: 'jt-4', minutes: 26, note: '' },
          ],
          stage2Rows: [
            { id: 'ob-s2-1', jobTypeId: 'jt-10', minutes: 12, note: '' },
            { id: 'ob-s2-2', jobTypeId: 'jt-10', minutes: 12, note: '' },
            { id: 'ob-s2-3', jobTypeId: 'jt-10', minutes: 12, note: '' },
            { id: 'ob-s2-4', jobTypeId: 'jt-10', minutes: 12, note: '' },
            { id: 'ob-s2-5', jobTypeId: 'jt-22', minutes: 5, note: '' },
          ],
          stage3Rows: [
            { id: 'ob-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'ob-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'ob-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'ob-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'dough-viennoise',
          productName: '비엔누아즈',
          batchOutputEa: 538,
          pkQuantityEa: 30,
          stage1Rows: [
            { id: 'vn-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'vn-s1-2', jobTypeId: 'jt-4', minutes: 26, note: '' },
          ],
          stage2Rows: [
            { id: 'vn-s2-1', jobTypeId: 'jt-10', minutes: 12, note: '' },
            { id: 'vn-s2-2', jobTypeId: 'jt-10', minutes: 12, note: '' },
            { id: 'vn-s2-3', jobTypeId: 'jt-10', minutes: 12, note: '' },
            { id: 'vn-s2-4', jobTypeId: 'jt-10', minutes: 12, note: '' },
            { id: 'vn-s2-5', jobTypeId: 'jt-22', minutes: 5, note: '' },
          ],
          stage3Rows: [
            { id: 'vn-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'vn-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'vn-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'vn-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'dough-saltbutter',
          productName: '소금버터빵',
          batchOutputEa: 1036,
          pkQuantityEa: 40,
          stage1Rows: [
            { id: 'sb-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'sb-s1-2', jobTypeId: 'jt-4', minutes: 22, note: '' },
          ],
          stage2Rows: [
            { id: 'sb-s2-1', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'sb-s2-2', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'sb-s2-3', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'sb-s2-4', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'sb-s2-5', jobTypeId: 'jt-22', minutes: 5, note: '' },
          ],
          stage3Rows: [
            { id: 'sb-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'sb-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'sb-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'sb-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'dough-squidinkfocaccia',
          productName: '먹물포카치아',
          batchOutputEa: 442,
          pkQuantityEa: 20,
          stage1Rows: [
            { id: 'sf-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'sf-s1-2', jobTypeId: 'jt-4', minutes: 27, note: '' },
          ],
          stage2Rows: [
            { id: 'sf-s2-1', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'sf-s2-2', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'sf-s2-3', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'sf-s2-4', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'sf-s2-5', jobTypeId: 'jt-22', minutes: 5, note: '' },
          ],
          stage3Rows: [
            { id: 'sf-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'sf-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'sf-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'sf-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'dough-pretzel',
          productName: '프레첼 생지',
          batchOutputEa: 560,
          pkQuantityEa: 40,
          stage1Rows: [
            { id: 'pz-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'pz-s1-2', jobTypeId: 'jt-4', minutes: 25, note: '' },
          ],
          stage2Rows: [
            { id: 'pz-s2-1', jobTypeId: 'jt-10', minutes: 18, note: '' },
            { id: 'pz-s2-2', jobTypeId: 'jt-10', minutes: 18, note: '' },
            { id: 'pz-s2-3', jobTypeId: 'jt-10', minutes: 18, note: '' },
            { id: 'pz-s2-4', jobTypeId: 'jt-10', minutes: 18, note: '' },
            { id: 'pz-s2-5', jobTypeId: 'jt-22', minutes: 5, note: '' },
          ],
          stage3Rows: [
            { id: 'pz-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'pz-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'pz-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'pz-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'dough-sandwichbaguette',
          productName: '샌드위치용 바게트',
          batchOutputEa: 331,
          pkQuantityEa: 20,
          stage1Rows: [
            { id: 'bg-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'bg-s1-2', jobTypeId: 'jt-4', minutes: 25, note: '' },
          ],
          stage2Rows: [
            { id: 'bg-s2-1', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'bg-s2-2', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'bg-s2-3', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'bg-s2-4', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'bg-s2-5', jobTypeId: 'jt-22', minutes: 5, note: '' },
          ],
          stage3Rows: [
            { id: 'bg-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'bg-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'bg-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'bg-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'dough-cassavastick',
          productName: '카사바 스틱',
          batchOutputEa: 299,
          pkQuantityEa: 20,
          stage1Rows: [
            { id: 'cs-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'cs-s1-2', jobTypeId: 'jt-4', minutes: 25, note: '' },
          ],
          stage2Rows: [
            { id: 'cs-s2-1', jobTypeId: 'jt-10', minutes: 30, note: '' },
            { id: 'cs-s2-2', jobTypeId: 'jt-10', minutes: 30, note: '' },
            { id: 'cs-s2-3', jobTypeId: 'jt-22', minutes: 5, note: '' },
          ],
          stage3Rows: [
            { id: 'cs-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'cs-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'cs-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'cs-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'dough-minibrioche',
          productName: '미니브리오슈',
          batchOutputEa: 918,
          pkQuantityEa: 54,
          stage1Rows: [
            { id: 'mb-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'mb-s1-2', jobTypeId: 'jt-4', minutes: 28, note: '' },
          ],
          stage2Rows: [
            { id: 'mb-s2-1', jobTypeId: 'jt-10', minutes: 15, note: '' },
            { id: 'mb-s2-2', jobTypeId: 'jt-10', minutes: 15, note: '' },
            { id: 'mb-s2-3', jobTypeId: 'jt-10', minutes: 15, note: '' },
            { id: 'mb-s2-4', jobTypeId: 'jt-10', minutes: 15, note: '' },
            { id: 'mb-s2-5', jobTypeId: 'jt-22', minutes: 5, note: '' },
          ],
          stage3Rows: [
            { id: 'mb-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'mb-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'mb-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'mb-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'dough-cheesefondue',
          productName: '치즈퐁듀',
          batchOutputEa: 139,
          pkQuantityEa: 15,
          stage1Rows: [
            { id: 'cf-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'cf-s1-2', jobTypeId: 'jt-4', minutes: 25, note: '' },
          ],
          stage2Rows: [
            { id: 'cf-s2-1', jobTypeId: 'jt-10', minutes: 30, note: '' },
            { id: 'cf-s2-2', jobTypeId: 'jt-10', minutes: 30, note: '' },
            { id: 'cf-s2-3', jobTypeId: 'jt-10', minutes: 30, note: '' },
            { id: 'cf-s2-4', jobTypeId: 'jt-22', minutes: 5, note: '' },
          ],
          stage3Rows: [
            { id: 'cf-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'cf-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'cf-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'cf-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'dough-oliveciabatta',
          productName: '올리브치아바타',
          batchOutputEa: 271,
          pkQuantityEa: 24,
          stage1Rows: [
            { id: 'oc-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'oc-s1-2', jobTypeId: 'jt-4', minutes: 28, note: '' },
          ],
          stage2Rows: [
            { id: 'oc-s2-1', jobTypeId: 'jt-10', minutes: 15, note: '' },
            { id: 'oc-s2-2', jobTypeId: 'jt-10', minutes: 15, note: '' },
            { id: 'oc-s2-3', jobTypeId: 'jt-10', minutes: 15, note: '' },
            { id: 'oc-s2-4', jobTypeId: 'jt-10', minutes: 15, note: '' },
            { id: 'oc-s2-5', jobTypeId: 'jt-22', minutes: 5, note: '' },
          ],
          stage3Rows: [
            { id: 'oc-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'oc-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'oc-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'oc-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'dough-plainciabatta',
          productName: '플레인치아바타',
          batchOutputEa: 260,
          pkQuantityEa: 24,
          stage1Rows: [
            { id: 'pc-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'pc-s1-2', jobTypeId: 'jt-4', minutes: 25, note: '' },
          ],
          stage2Rows: [
            { id: 'pc-s2-1', jobTypeId: 'jt-10', minutes: 15, note: '' },
            { id: 'pc-s2-2', jobTypeId: 'jt-10', minutes: 15, note: '' },
            { id: 'pc-s2-3', jobTypeId: 'jt-10', minutes: 15, note: '' },
            { id: 'pc-s2-4', jobTypeId: 'jt-10', minutes: 15, note: '' },
            { id: 'pc-s2-5', jobTypeId: 'jt-22', minutes: 5, note: '' },
          ],
          stage3Rows: [
            { id: 'pc-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'pc-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'pc-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'pc-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'dough-squidinkciabatta',
          productName: '먹물치아바타',
          batchOutputEa: 303,
          pkQuantityEa: 24,
          stage1Rows: [
            { id: 'sc-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'sc-s1-2', jobTypeId: 'jt-4', minutes: 25, note: '' },
          ],
          stage2Rows: [
            { id: 'sc-s2-1', jobTypeId: 'jt-10', minutes: 15, note: '' },
            { id: 'sc-s2-2', jobTypeId: 'jt-10', minutes: 15, note: '' },
            { id: 'sc-s2-3', jobTypeId: 'jt-10', minutes: 15, note: '' },
            { id: 'sc-s2-4', jobTypeId: 'jt-10', minutes: 15, note: '' },
            { id: 'sc-s2-5', jobTypeId: 'jt-22', minutes: 5, note: '' },
          ],
          stage3Rows: [
            { id: 'sc-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'sc-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'sc-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'sc-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'dough-sweetbread',
          productName: '단과자',
          batchOutputEa: 1046,
          pkQuantityEa: 40,
          stage1Rows: [
            { id: 'sw-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'sw-s1-2', jobTypeId: 'jt-4', minutes: 32, note: '' },
          ],
          stage2Rows: [
            { id: 'sw-s2-1', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'sw-s2-2', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'sw-s2-3', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'sw-s2-4', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'sw-s2-5', jobTypeId: 'jt-22', minutes: 5, note: '' },
          ],
          stage3Rows: [
            { id: 'sw-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'sw-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'sw-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'sw-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'dough-paindemi',
          productName: '빵드미오레',
          batchOutputEa: 156.3,
          pkQuantityEa: 12,
          stage1Rows: [
            { id: 'pm-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'pm-s1-2', jobTypeId: 'jt-4', minutes: 26, note: '' },
          ],
          stage2Rows: [
            { id: 'pm-s2-1', jobTypeId: 'jt-10', minutes: 10, note: '' },
            { id: 'pm-s2-2', jobTypeId: 'jt-10', minutes: 10, note: '' },
            { id: 'pm-s2-3', jobTypeId: 'jt-10', minutes: 10, note: '' },
            { id: 'pm-s2-4', jobTypeId: 'jt-22', minutes: 5, note: '' },
          ],
          stage3Rows: [
            { id: 'pm-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'pm-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'pm-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'pm-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'dough-chocobaguette',
          productName: '초코바게트 생지',
          batchOutputEa: 408,
          pkQuantityEa: 20,
          stage1Rows: [
            { id: 'cb-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'cb-s1-2', jobTypeId: 'jt-4', minutes: 20, note: '' },
          ],
          stage2Rows: [
            { id: 'cb-s2-1', jobTypeId: 'jt-10', minutes: 27, note: '' },
            { id: 'cb-s2-2', jobTypeId: 'jt-10', minutes: 27, note: '' },
            { id: 'cb-s2-3', jobTypeId: 'jt-10', minutes: 27, note: '' },
          ],
          stage3Rows: [
            { id: 'cb-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'cb-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'cb-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'cb-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'dough-baguettetradition',
          productName: '바게트 트라디시옹 생지',
          batchOutputEa: 217,
          pkQuantityEa: 12,
          stage1Rows: [
            { id: 'bt-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'bt-s1-2', jobTypeId: 'jt-4', minutes: 20, note: '' },
          ],
          stage2Rows: [
            { id: 'bt-s2-1', jobTypeId: 'jt-10', minutes: 27, note: '' },
            { id: 'bt-s2-2', jobTypeId: 'jt-10', minutes: 27, note: '' },
            { id: 'bt-s2-3', jobTypeId: 'jt-10', minutes: 27, note: '' },
          ],
          stage3Rows: [
            { id: 'bt-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'bt-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'bt-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'bt-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'dough-milkbrioche',
          productName: '밀크 브리오슈',
          batchOutputEa: 924,
          pkQuantityEa: 40,
          stage1Rows: [
            { id: 'mk-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'mk-s1-2', jobTypeId: 'jt-4', minutes: 23, note: '' },
          ],
          stage2Rows: [
            { id: 'mk-s2-1', jobTypeId: 'jt-10', minutes: 13, note: '' },
            { id: 'mk-s2-2', jobTypeId: 'jt-10', minutes: 13, note: '' },
            { id: 'mk-s2-3', jobTypeId: 'jt-10', minutes: 13, note: '' },
            { id: 'mk-s2-4', jobTypeId: 'jt-10', minutes: 13, note: '' },
            { id: 'mk-s2-5', jobTypeId: 'jt-23', minutes: 10, note: '' },
          ],
          stage3Rows: [
            { id: 'mk-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'mk-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'mk-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'mk-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'dough-premiummorning',
          productName: '프리미엄 모닝',
          batchOutputEa: 260,
          pkQuantityEa: 20,
          stage1Rows: [
            { id: 'pmn-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'pmn-s1-2', jobTypeId: 'jt-4', minutes: 23, note: '' },
          ],
          stage2Rows: [
            { id: 'pmn-s2-1', jobTypeId: 'jt-10', minutes: 13, note: '' },
            { id: 'pmn-s2-2', jobTypeId: 'jt-10', minutes: 13, note: '' },
            { id: 'pmn-s2-3', jobTypeId: 'jt-10', minutes: 13, note: '' },
            { id: 'pmn-s2-4', jobTypeId: 'jt-10', minutes: 13, note: '' },
            { id: 'pmn-s2-5', jobTypeId: 'jt-23', minutes: 10, note: '' },
          ],
          stage3Rows: [
            { id: 'pmn-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'pmn-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'pmn-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'pmn-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'dough-purplepotatocampagne',
          productName: '자색고구마 깜빠뉴',
          batchOutputEa: 444,
          pkQuantityEa: 20,
          stage1Rows: [
            { id: 'ppc-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'ppc-s1-2', jobTypeId: 'jt-4', minutes: 20, note: '' },
          ],
          stage2Rows: [
            { id: 'ppc-s2-1', jobTypeId: 'jt-10', minutes: 27, note: '' },
            { id: 'ppc-s2-2', jobTypeId: 'jt-10', minutes: 27, note: '' },
            { id: 'ppc-s2-3', jobTypeId: 'jt-10', minutes: 27, note: '' },
          ],
          stage3Rows: [
            { id: 'ppc-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'ppc-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'ppc-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'ppc-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
      ],
      PARBAKE: [
        {
          id: 'parbake-baguettetradition',
          productName: '(파베이크)바게트트라디시옹',
          batchOutputEa: 217,
          pkQuantityEa: 6,
          stage1Rows: [
            { id: 'pbt-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'pbt-s1-2', jobTypeId: 'jt-5', minutes: 60, note: '' },
          ],
          stage2Rows: [
            { id: 'pbt-s2-1', jobTypeId: 'jt-10', minutes: 45, note: '' },
            { id: 'pbt-s2-2', jobTypeId: 'jt-10', minutes: 45, note: '' },
            { id: 'pbt-s2-3', jobTypeId: 'jt-10', minutes: 45, note: '' },
            { id: 'pbt-s2-4', jobTypeId: 'jt-10', minutes: 45, note: '' },
            { id: 'pbt-s2-5', jobTypeId: 'jt-6', minutes: 45, note: '' },
            { id: 'pbt-s2-6', jobTypeId: 'jt-6', minutes: 45, note: '' },
            { id: 'pbt-s2-7', jobTypeId: 'jt-30', minutes: 55, note: '' },
            { id: 'pbt-s2-8', jobTypeId: 'jt-22', minutes: 5, note: '' },
          ],
          stage3Rows: [
            { id: 'pbt-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'pbt-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'pbt-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'pbt-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'parbake-paindecampagne',
          productName: '(파베이크)빵드깜빠뉴',
          batchOutputEa: 10,
          pkQuantityEa: 3,
          stage1Rows: [
            { id: 'pdc-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'pdc-s1-2', jobTypeId: 'jt-4', minutes: 12, note: '' },
          ],
          stage2Rows: [
            { id: 'pdc-s2-1', jobTypeId: 'jt-10', minutes: 10, note: '' },
            { id: 'pdc-s2-2', jobTypeId: 'jt-10', minutes: 10, note: '' },
            { id: 'pdc-s2-3', jobTypeId: 'jt-10', minutes: 10, note: '' },
            { id: 'pdc-s2-4', jobTypeId: 'jt-10', minutes: 10, note: '' },
            { id: 'pdc-s2-5', jobTypeId: 'jt-6', minutes: 45, note: '' },
            { id: 'pdc-s2-6', jobTypeId: 'jt-6', minutes: 45, note: '' },
            { id: 'pdc-s2-7', jobTypeId: 'jt-6', minutes: 45, note: '' },
            { id: 'pdc-s2-8', jobTypeId: 'jt-6', minutes: 45, note: '' },
            { id: 'pdc-s2-9', jobTypeId: 'jt-30', minutes: 55, note: '' },
            { id: 'pdc-s2-10', jobTypeId: 'jt-22', minutes: 5, note: '' },
          ],
          stage3Rows: [
            { id: 'pdc-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'pdc-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'pdc-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'pdc-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'parbake-campagnecranberry',
          productName: '(파베이크)깜빠뉴크랜베리아망드',
          batchOutputEa: 101,
          pkQuantityEa: 6,
          stage1Rows: [
            { id: 'pcc-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'pcc-s1-2', jobTypeId: 'jt-4', minutes: 12, note: '' },
          ],
          stage2Rows: [
            { id: 'pcc-s2-1', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'pcc-s2-2', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'pcc-s2-3', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'pcc-s2-4', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'pcc-s2-5', jobTypeId: 'jt-6', minutes: 30, note: '' },
            { id: 'pcc-s2-6', jobTypeId: 'jt-6', minutes: 30, note: '' },
            { id: 'pcc-s2-7', jobTypeId: 'jt-6', minutes: 30, note: '' },
            { id: 'pcc-s2-8', jobTypeId: 'jt-6', minutes: 30, note: '' },
            { id: 'pcc-s2-9', jobTypeId: 'jt-30', minutes: 55, note: '' },
            { id: 'pcc-s2-10', jobTypeId: 'jt-22', minutes: 5, note: '' },
          ],
          stage3Rows: [
            { id: 'pcc-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'pcc-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'pcc-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'pcc-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'parbake-painaulevain',
          productName: '(파베이크)빵오르방나튀렐',
          batchOutputEa: 126,
          pkQuantityEa: 4,
          stage1Rows: [
            { id: 'pal-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'pal-s1-2', jobTypeId: 'jt-4', minutes: 12, note: '' },
          ],
          stage2Rows: [
            { id: 'pal-s2-1', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'pal-s2-2', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'pal-s2-3', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'pal-s2-4', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'pal-s2-5', jobTypeId: 'jt-6', minutes: 30, note: '' },
            { id: 'pal-s2-6', jobTypeId: 'jt-6', minutes: 30, note: '' },
            { id: 'pal-s2-7', jobTypeId: 'jt-6', minutes: 30, note: '' },
            { id: 'pal-s2-8', jobTypeId: 'jt-6', minutes: 30, note: '' },
            { id: 'pal-s2-9', jobTypeId: 'jt-30', minutes: 55, note: '' },
            { id: 'pal-s2-10', jobTypeId: 'jt-22', minutes: 5, note: '' },
          ],
          stage3Rows: [
            { id: 'pal-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'pal-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'pal-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'pal-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'parbake-painmulticereal',
          productName: '(파베이크)빵오멀티세레알',
          batchOutputEa: 125,
          pkQuantityEa: 4,
          stage1Rows: [
            { id: 'pmc-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'pmc-s1-2', jobTypeId: 'jt-4', minutes: 12, note: '' },
          ],
          stage2Rows: [
            { id: 'pmc-s2-1', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'pmc-s2-2', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'pmc-s2-3', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'pmc-s2-4', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'pmc-s2-5', jobTypeId: 'jt-6', minutes: 30, note: '' },
            { id: 'pmc-s2-6', jobTypeId: 'jt-6', minutes: 30, note: '' },
            { id: 'pmc-s2-7', jobTypeId: 'jt-6', minutes: 30, note: '' },
            { id: 'pmc-s2-8', jobTypeId: 'jt-6', minutes: 30, note: '' },
            { id: 'pmc-s2-9', jobTypeId: 'jt-30', minutes: 55, note: '' },
            { id: 'pmc-s2-10', jobTypeId: 'jt-22', minutes: 5, note: '' },
          ],
          stage3Rows: [
            { id: 'pmc-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'pmc-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'pmc-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'pmc-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'parbake-paincomplet',
          productName: '(파베이크)빵콩플레',
          batchOutputEa: 118,
          pkQuantityEa: 6,
          stage1Rows: [
            { id: 'pcp-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'pcp-s1-2', jobTypeId: 'jt-4', minutes: 13, note: '' },
          ],
          stage2Rows: [
            { id: 'pcp-s2-1', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'pcp-s2-2', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'pcp-s2-3', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'pcp-s2-4', jobTypeId: 'jt-10', minutes: 20, note: '' },
            { id: 'pcp-s2-5', jobTypeId: 'jt-6', minutes: 30, note: '' },
            { id: 'pcp-s2-6', jobTypeId: 'jt-6', minutes: 30, note: '' },
            { id: 'pcp-s2-7', jobTypeId: 'jt-6', minutes: 30, note: '' },
            { id: 'pcp-s2-8', jobTypeId: 'jt-6', minutes: 30, note: '' },
            { id: 'pcp-s2-9', jobTypeId: 'jt-30', minutes: 55, note: '' },
            { id: 'pcp-s2-10', jobTypeId: 'jt-22', minutes: 5, note: '' },
          ],
          stage3Rows: [
            { id: 'pcp-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'pcp-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'pcp-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'pcp-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
        {
          id: 'parbake-figtradition',
          productName: '(파베이크)무화과트라디시옹(소)',
          batchOutputEa: 472,
          pkQuantityEa: 4,
          stage1Rows: [
            { id: 'pft-s1-1', jobTypeId: 'jt-3', minutes: 5, note: '' },
            { id: 'pft-s1-2', jobTypeId: 'jt-4', minutes: 60, note: '' },
          ],
          stage2Rows: [
            { id: 'pft-s2-1', jobTypeId: 'jt-10', minutes: 45, note: '' },
            { id: 'pft-s2-2', jobTypeId: 'jt-10', minutes: 45, note: '' },
            { id: 'pft-s2-3', jobTypeId: 'jt-10', minutes: 45, note: '' },
            { id: 'pft-s2-4', jobTypeId: 'jt-10', minutes: 45, note: '' },
            { id: 'pft-s2-5', jobTypeId: 'jt-6', minutes: 55, note: '' },
            { id: 'pft-s2-6', jobTypeId: 'jt-6', minutes: 55, note: '' },
            { id: 'pft-s2-7', jobTypeId: 'jt-6', minutes: 55, note: '' },
            { id: 'pft-s2-8', jobTypeId: 'jt-6', minutes: 55, note: '' },
            { id: 'pft-s2-9', jobTypeId: 'jt-30', minutes: 55, note: '' },
            { id: 'pft-s2-10', jobTypeId: 'jt-22', minutes: 20, note: '' },
          ],
          stage3Rows: [
            { id: 'pft-s3-1', jobTypeId: 'jt-32', minutes: 15, note: '' },
            { id: 'pft-s3-2', jobTypeId: 'jt-33', minutes: 15, note: '' },
            { id: 'pft-s3-3', jobTypeId: '', minutes: 0, note: '' },
            { id: 'pft-s3-4', jobTypeId: '', minutes: 0, note: '' },
          ],
        },
      ],
      BAKERY: [],
    };

    const PROCESS_CATEGORIES = {
      PIE: { id: 'PIE', label: '파이', desc: '파이류 품목별 3공정 인건비 DB' },
      DOUGH: { id: 'DOUGH', label: '알생지', desc: '알생지 품목별 3공정 인건비 DB' },
      PARBAKE: { id: 'PARBAKE', label: '파베이크', desc: '파베이크 품목별 3공정 인건비 DB' },
      BAKERY: { id: 'BAKERY', label: '제과', desc: '제과류 품목별 3공정 인건비 DB' },
    };

    const SHEET_TABS = [
      { id: 'PK_MAIN', label: 'PK단위 원가표', icon: '📊', badgeType: 'MAIN' },
      { id: 'PIE', label: '파이', icon: '🥐', badgeType: 'DB' },
      { id: 'DOUGH', label: '알생지', icon: '🥖', badgeType: 'DB' },
      { id: 'PARBAKE', label: '파베이크', icon: '🍞', badgeType: 'DB' },
      { id: 'BAKERY', label: '제과', icon: '🧁', badgeType: 'DB' },
      { id: 'BASIC_DB', label: '기본설정', icon: '⚙️', badgeType: 'SETTINGS' },
    ];

    const buildInitialPkCostRows = (dbs) => {
      const rows = [];
      let seq = 1;
      Object.keys(PROCESS_CATEGORIES).forEach((catKey) => {
        const catLabel = PROCESS_CATEGORIES[catKey].label;
        const list = dbs[catKey] || [];
        list.forEach((prod) => {
          rows.push({
            id: `pk-init-${seq++}`,
            productId: prod.id,
            productCode: prod.productCode || '',
            section: catLabel,
            productName: prod.productName,
            releasePriceEa: 0,
            storeBuyPriceEa: 0,
            gontranPriceEa: 0,
            msBuyPricePk: 0,
            msSellPricePk: 0,
            msNote: '',
            note: '',
          });
        });
      });
      return rows;
    };

    const INITIAL_PK_COST_ROWS = buildInitialPkCostRows(INITIAL_CATEGORY_DBS);

    const normalizeProductName = (name) =>
      String(name || '')
        .trim()
        .replace(/\s+/g, '');

    const normalizeCodeStr = (code) => String(code ?? '').trim();

    const compareProductCodeOrder = (codeA, codeB) => {
      const a = normalizeCodeStr(codeA);
      const b = normalizeCodeStr(codeB);
      if (a && !b) return -1;
      if (!a && b) return 1;
      if (!a && !b) return 0;
      return a.localeCompare(b, 'ko', { numeric: true, sensitivity: 'base' });
    };

    const getLiveRecipesArray = () => {
      if (typeof recipesData !== 'undefined' && Array.isArray(recipesData)) return recipesData;
      if (typeof window !== 'undefined' && Array.isArray(window.recipesData)) return window.recipesData;
      return [];
    };

    const evalLiveRecipeMetrics = (rc) => {
      if (typeof calculateRecipeMetrics === 'function') return calculateRecipeMetrics(rc);
      if (typeof window !== 'undefined' && typeof window.calculateRecipeMetrics === 'function') {
        return window.calculateRecipeMetrics(rc);
      }
      return null;
    };

    function computeProductLabor(product, jobMap, actualMonthlyWorkHours) {
      const computeStage = (rows) => {
        const computedRows = rows.map((row) => {
          const job = row.jobTypeId ? jobMap.get(row.jobTypeId) : null;
          const isAssigned = Boolean(row.jobTypeId && job);
          const baseSalary = isAssigned ? Number(job.baseSalary) || 0 : 0;
          const costPerMin =
            isAssigned && actualMonthlyWorkHours > 0
              ? Math.round(baseSalary / actualMonthlyWorkHours / 60)
              : 0;
          const minutes = Number(row.minutes) || 0;
          const rowLaborCost = isAssigned ? costPerMin * minutes : 0;

          return {
            ...row,
            isAssigned,
            jobName: job ? job.jobType : '',
            isMissingJob: Boolean(row.jobTypeId && !job),
            baseSalary,
            costPerMin,
            minutes,
            rowLaborCost,
          };
        });

        const headcount = computedRows.filter((r) => r.isAssigned).length;
        const totalMinutes = computedRows.reduce(
          (sum, r) => sum + (r.isAssigned ? r.minutes : 0),
          0
        );
        const totalCost = computedRows.reduce((sum, r) => sum + r.rowLaborCost, 0);

        return { rows: computedRows, headcount, totalMinutes, totalCost };
      };

      const s1 = computeStage(product.stage1Rows || []);
      const s2 = computeStage(product.stage2Rows || []);
      const s3 = computeStage(product.stage3Rows || []);

      const batchOutputEa = Number(product.batchOutputEa) || 0;
      const pkQuantityEa = Number(product.pkQuantityEa) || 0;
      const batchMaterialCost = Number(product.batchMaterialCost) || 0;

      const rawBatchPk = pkQuantityEa > 0 ? batchOutputEa / pkQuantityEa : 0;
      const batchOutputPk = Math.round((rawBatchPk + Number.EPSILON) * 10) / 10;

      const totalBatchLaborCost = s1.totalCost + s2.totalCost + s3.totalCost;
      const totalHeadcount = s1.headcount + s2.headcount + s3.headcount;
      const totalMinutes = s1.totalMinutes + s2.totalMinutes + s3.totalMinutes;

      const effectivePkDivisor = batchOutputPk > 0 ? batchOutputPk : rawBatchPk;
      const laborCostPerPk =
        effectivePkDivisor > 0
          ? Math.round(totalBatchLaborCost / effectivePkDivisor + Number.EPSILON)
          : 0;
      const laborCostPerEa =
        batchOutputEa > 0
          ? Math.round(totalBatchLaborCost / batchOutputEa + Number.EPSILON)
          : 0;

      return {
        s1,
        s2,
        s3,
        batchOutputEa,
        pkQuantityEa,
        batchMaterialCost,
        batchOutputPk,
        totalBatchLaborCost,
        totalHeadcount,
        totalMinutes,
        laborCostPerPk,
        laborCostPerEa,
      };
    }

    const fmtInt = (val) => Math.round(Number(val) || 0).toLocaleString('ko-KR');
    const fmtQty = (val) => {
      const num = Number(val) || 0;
      return Number.isInteger(num)
        ? num.toLocaleString('ko-KR')
        : num.toLocaleString('ko-KR', { minimumFractionDigits: 1, maximumFractionDigits: 2 });
    };
    const fmtDec = (val, digits = 1) =>
      (Number(val) || 0).toLocaleString('ko-KR', {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      });

    function CommaNumberInput({
      value,
      onChangeValue,
      placeholder = '',
      allowEmpty = false,
      allowDecimal = false,
      className = '',
    }) {
      const formatVal = (v) => {
        if (allowEmpty && (v === '' || v === null || v === undefined)) return '';
        if (allowDecimal && typeof v === 'string' && v.endsWith('.')) {
          const intPart = Number(v.slice(0, -1)) || 0;
          return `${intPart.toLocaleString('ko-KR')}.`;
        }
        const num = Number(v) || 0;
        return allowDecimal
          ? num.toLocaleString('ko-KR', { maximumFractionDigits: 2 })
          : Math.round(num).toLocaleString('ko-KR');
      };

      const displayValue = formatVal(value);

      const handleChange = (e) => {
        if (allowDecimal) {
          const cleaned = e.target.value.replace(/[^0-9.]/g, '');
          const parts = cleaned.split('.');
          const normalized = parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : cleaned;
          if (allowEmpty && normalized === '') {
            onChangeValue('');
            return;
          }
          if (normalized.endsWith('.')) {
            onChangeValue(normalized);
            return;
          }
          onChangeValue(normalized === '' ? 0 : Number(normalized));
          return;
        }

        const rawDigits = e.target.value.replace(/[^0-9]/g, '');
        if (allowEmpty && rawDigits === '') {
          onChangeValue('');
          return;
        }
        onChangeValue(rawDigits === '' ? 0 : Number(rawDigits));
      };

      return (
        React.createElement("input", { type: "text", inputMode: allowDecimal ? 'decimal' : 'numeric', placeholder: placeholder, value: displayValue, onChange: handleChange, className: className })
      );
    }

    const DEFAULT_PRICE_GAS_WEB_APP_URL =
      'https://script.google.com/macros/s/AKfycbw4zdcL2yjESq8G2_889Oz3pzdAuYJm-DjzEwMNUp4t0NjuRVcWaSnMdxTYD_9RrciZ_Q/exec';
    const LEGACY_PRICE_GAS_URL_PART = 'AKfycbyxvi_Xp6HasU8GA1t5Av6CDqeM4pAUkB8Y7YSxUo_c2hTRvxNxWhNWEMBwWBCX2lnDIg';
    const PRICE_GAS_URL_STORAGE_KEY = 'baroga_product_price_gas_url';

    function loadSavedPriceGasUrl() {
      try {
        const saved = (localStorage.getItem(PRICE_GAS_URL_STORAGE_KEY) || '').trim();
        if (!saved || saved.includes(LEGACY_PRICE_GAS_URL_PART)) {
          localStorage.setItem(PRICE_GAS_URL_STORAGE_KEY, DEFAULT_PRICE_GAS_WEB_APP_URL);
          return DEFAULT_PRICE_GAS_WEB_APP_URL;
        }
        return saved;
      } catch (e) {
        return DEFAULT_PRICE_GAS_WEB_APP_URL;
      }
    }

    function mergeSettingsWithDefaults(loaded) {
      if (!loaded) return INITIAL_BASIC_SETTINGS;
      const defaultParts = INITIAL_BASIC_SETTINGS.partAllocations;
      const rawParts =
        Array.isArray(loaded.partAllocations) && loaded.partAllocations.length > 0
          ? loaded.partAllocations
          : defaultParts;

      const mergedParts = defaultParts.map((fallback, idx) => {
        const matched =
          rawParts.find(
            (p) =>
              p.id === fallback.id ||
              p.name === fallback.name ||
              (fallback.name.includes('알생지') && String(p.name || '').includes('알생지'))
          ) ||
          rawParts[idx] ||
          {};

        const hasSavedFactorMeta = Boolean(matched.factorNote);

        return {
          ...fallback,
          ...matched,
          name: fallback.name,
          laborFactor:
            hasSavedFactorMeta &&
            matched.laborFactor !== undefined &&
            matched.laborFactor !== null &&
            matched.laborFactor !== ''
              ? Number(matched.laborFactor)
              : fallback.laborFactor,
          factorNote: matched.factorNote || fallback.factorNote,
          juneSalaryTotal:
            matched.juneSalaryTotal !== undefined &&
            matched.juneSalaryTotal !== null &&
            matched.juneSalaryTotal !== ''
              ? matched.juneSalaryTotal
              : fallback.juneSalaryTotal,
          juneAllocatedCost:
            matched.juneAllocatedCost !== undefined && matched.juneAllocatedCost !== ''
              ? matched.juneAllocatedCost
              : fallback.juneAllocatedCost,
        };
      });

      return {
        ...INITIAL_BASIC_SETTINGS,
        ...loaded,
        partAllocations: mergedParts,
      };
    }

    const PRICE_LOCAL_CACHE_KEY = 'baroga_product_price_cache_v1';

    function loadInitialPriceCache() {
      try {
        const raw = localStorage.getItem(PRICE_LOCAL_CACHE_KEY);
        if (!raw) return null;
        return JSON.parse(raw);
      } catch (e) {
        return null;
      }
    }

    function SyncedVal({ synced, children }) {
      if (!synced) return children;
      return React.createElement(
        "span",
        { className: "inline-flex items-center justify-end gap-[3px] whitespace-nowrap" },
        React.createElement("span", {
          className: "w-1 h-1 rounded-full bg-emerald-500 shrink-0 pointer-events-none",
        }),
        React.createElement("span", { className: "whitespace-nowrap" }, children)
      );
    }

    function App() {
      const cachedInit = useMemo(() => loadInitialPriceCache(), []);
      const [settings, setSettings] = useState(() =>
        cachedInit?.settings ? mergeSettingsWithDefaults(cachedInit.settings) : INITIAL_BASIC_SETTINGS
      );
      const [categoryDbs, setCategoryDbs] = useState(() =>
        cachedInit?.categoryDbs || INITIAL_CATEGORY_DBS
      );
      const [pkCostRows, setPkCostRows] = useState(() =>
        Array.isArray(cachedInit?.pkCostRows) && cachedInit.pkCostRows.length > 0
          ? cachedInit.pkCostRows
          : INITIAL_PK_COST_ROWS
      );
      const [msUpdatedDate, setMsUpdatedDate] = useState(() =>
        cachedInit?.msUpdatedDate || '2026-11-13'
      );
      const [activeTab, setActiveTab] = useState('PK_MAIN');

      const [formulaTooltip, setFormulaTooltip] = useState(null);

      const showFormulaTooltip = (e, info) => {
        if (!info) return;
        const rect = e.currentTarget.getBoundingClientRect();
        setFormulaTooltip({
          ...info,
          x: rect.left + rect.width / 2,
          y: rect.top,
          bottomY: rect.bottom,
        });
      };

      const hideFormulaTooltip = () => {
        setFormulaTooltip(null);
      };

      const [priceGasUrl, setPriceGasUrl] = useState(() => loadSavedPriceGasUrl());
      const [isPriceDbModalOpen, setIsPriceDbModalOpen] = useState(false);
      const [draftPriceGasUrl, setDraftPriceGasUrl] = useState('');

      const [syncStatus, setSyncStatus] = useState('IDLE');
      const [syncErrorLabel, setSyncErrorLabel] = useState('DB 연결 확인');
      // [1단계 데이터 보호] DB를 정상적으로 불러온 뒤에만 저장 허용 + 리비전으로 다른 기기 저장분 덮어쓰기 방지
      const priceDbLoadedRef = useRef(false);
      const priceDbRevisionRef = useRef(null);
      const priceDbBlockReasonRef = useRef('DB를 아직 불러오지 못했습니다');
      const markPriceError = (label) => { setSyncErrorLabel(label); setSyncStatus('ERROR'); };
      const [lastSyncedAt, setLastSyncedAt] = useState(null);

      const [selectedProductIds, setSelectedProductIds] = useState({
        PIE: 'pie-croissant',
        DOUGH: 'dough-olivebread',
        PARBAKE: 'parbake-baguettetradition',
        BAKERY: null,
      });
      const [productSearchQuery, setProductSearchQuery] = useState('');
      const [categoryViewMode, setCategoryViewMode] = useState('SHEET');
      const [deleteTargetProduct, setDeleteTargetProduct] = useState(null);
      const [toastMessage, setToastMessage] = useState(null);

      const showToast = (msg) => {
        setToastMessage(msg);
        setTimeout(() => {
          setToastMessage((prev) => (prev === msg ? null : prev));
        }, 2800);
      };

      const openPriceDbConfigModal = () => {
        setDraftPriceGasUrl(priceGasUrl || DEFAULT_PRICE_GAS_WEB_APP_URL);
        setIsPriceDbModalOpen(true);
      };

      const closePriceDbConfigModal = () => {
        setIsPriceDbModalOpen(false);
      };

      const extractPricePayloadFromResponse = (result) => {
        if (!result) return null;
        if (result.payload && typeof result.payload === 'object' && !Array.isArray(result.payload)) {
          return result.payload;
        }
        if (result.categoryDbs || result.pkCostRows || result.settings) {
          return result;
        }
        const rows = Array.isArray(result) ? result : (result.data || result.rows || null);
        if (Array.isArray(rows)) {
          if (rows.length === 0) return { __emptySheet: true };
          for (const r of rows) {
            if (!r) continue;
            if (r.payload) {
              try {
                return typeof r.payload === 'string' ? JSON.parse(r.payload) : r.payload;
              } catch (e) {}
            }
            if (r.json || r.dataJson || r.colE) {
              try {
                const rawJ = r.json || r.dataJson || r.colE;
                if (typeof rawJ === 'string' && rawJ.trim().startsWith('{')) {
                  const p = JSON.parse(rawJ);
                  if (p.categoryDbs || p.pkCostRows || p.settings) return p;
                  if (p.payload) return p.payload;
                }
              } catch (e) {}
            }
            if (r.categoryDbs || r.pkCostRows || r.settings) return r;
          }
          if (rows[0] && rows[0].productName !== undefined && rows[0].releasePriceEa !== undefined) {
            return { pkCostRows: rows };
          }
        }
        return null;
      };

      // [2단계 보안] 모든 DB 요청은 접속 코드를 붙여 POST로 보냄 (index.html의 barogaApi)
      const priceApi = (url, body, timeoutMs) => {
        if (typeof window.barogaApi === 'function') return window.barogaApi(url, body, timeoutMs);
        return Promise.reject(new Error('접속 코드 모듈을 찾을 수 없습니다'));
      };

      const handleSaveToGoogleSheet = async (overrideUrl = null, silent = false) => {
        const targetUrl = (typeof overrideUrl === 'string' && overrideUrl.trim())
          ? overrideUrl.trim()
          : (priceGasUrl || DEFAULT_PRICE_GAS_WEB_APP_URL);
        if (!targetUrl) return;

        if (!priceDbLoadedRef.current || priceDbRevisionRef.current === null) {
          markPriceError('저장 중지');
          showToast(`저장하지 않았습니다: ${priceDbBlockReasonRef.current}. 변경 내용은 이 기기에만 있습니다.`);
          return;
        }

        setSyncStatus('SAVING');
        const corePayload = {
          settings,
          categoryDbs,
          pkCostRows,
          msUpdatedDate,
        };
        try {
          const parsed = await priceApi(targetUrl, {
            action: 'replaceAll',
            baseRevision: priceDbRevisionRef.current,
            payload: corePayload,
          }, 30000);
          if (parsed && parsed.ok === true && typeof parsed.revision === 'number') {
            priceDbRevisionRef.current = parsed.revision;
            setSyncStatus('SUCCESS');
            setLastSyncedAt(parsed.updatedAt || new Date().toLocaleTimeString('ko-KR'));
            if (!silent) showToast('제품단가 구글 스프레드시트 DB에 저장되었습니다!');
            if (parsed.warning) showToast(`저장은 완료됐지만 ${parsed.warning}`);
          } else if (parsed && parsed.conflict) {
            priceDbLoadedRef.current = false;
            priceDbBlockReasonRef.current = '다른 기기에서 먼저 저장했습니다. ↻ 불러오기 후 다시 입력하세요';
            markPriceError('충돌 · 새로고침 필요');
            showToast('다른 기기에서 먼저 저장한 내용이 있어 저장하지 않았습니다. ↻ 불러오기 후 방금 변경한 내용을 다시 입력해 주세요.');
          } else {
            throw new Error((parsed && (parsed.message || parsed.error)) || '알 수 없는 응답');
          }
        } catch (err) {
          const isTimeout = err && err.name === 'AbortError';
          if (isTimeout) {
            priceDbLoadedRef.current = false;
            priceDbBlockReasonRef.current = '저장 응답이 없어 저장 여부를 알 수 없습니다. ↻ 불러오기로 확인하세요';
          }
          markPriceError(isTimeout ? '저장 확인 필요' : 'DB 저장 실패');
          showToast(isTimeout
            ? '저장 응답이 없습니다(시간 초과). ↻ 불러오기로 실제 저장 여부를 확인해 주세요.'
            : `구글 시트 저장 실패: ${err && err.message ? err.message : err} — 변경 내용은 이 기기에만 있습니다.`);
        }
      };

      const handleLoadFromGoogleSheet = async (silentOnEmpty = false, overrideUrl = null) => {
        const targetUrl = (typeof overrideUrl === 'string' && overrideUrl.trim())
          ? overrideUrl.trim()
          : (priceGasUrl || DEFAULT_PRICE_GAS_WEB_APP_URL);
        if (!targetUrl) return;

        setSyncStatus('LOADING');

        try {
          const result = await priceApi(targetUrl, { action: 'getAll' }, 20000);
          if (result && (result.ok === false || result.status === 'error')) {
            throw new Error(result.message || result.error || '서버 오류');
          }
          const revision = (result && typeof result.revision === 'number') ? result.revision : null;

          const extracted0 = (result && (result.status === 'empty' || result.empty === true)) ? { __emptySheet: true } : null;
          if (extracted0 || (extractPricePayloadFromResponse(result) || {}).__emptySheet) {
            // [1단계] 빈 DB를 화면의 기본값으로 자동 저장하던 동작 제거 — 사용자가 직접 [구글시트 저장]을 눌러야 저장
            priceDbLoadedRef.current = true;
            priceDbRevisionRef.current = revision;
            priceDbBlockReasonRef.current = revision === null ? '제품단가 GAS 스크립트가 구버전입니다 (v2.0 업데이트 필요)' : '';
            if (revision === null) markPriceError('저장 중지 (GAS 업데이트 필요)');
            else setSyncStatus('IDLE');
            showToast('제품단가 DB가 비어 있습니다. 지금 화면의 데이터를 DB에 저장하려면 확인 후 [구글시트 저장]을 누르세요.');
            return;
          }

          const extracted = extractPricePayloadFromResponse(result);

          if (extracted) {
            if (extracted.settings) {
              setSettings(mergeSettingsWithDefaults(extracted.settings));
            }
            const loadedCatDbs = extracted.categoryDbs || null;
            const loadedPkRows = extracted.pkCostRows || null;
            if (loadedCatDbs && loadedPkRows) {
              // 양쪽 시트 간 품목코드(productCode) 및 productId 상호 보완 동기화
              const codeByName = new Map();
              loadedPkRows.forEach((r) => {
                const c = normalizeCodeStr(r.productCode);
                const nm = normalizeProductName(r.productName);
                if (c && nm) codeByName.set(nm, c);
              });
              const reconciledDbs = {};
              const dbInfoByName = new Map();
              Object.keys(loadedCatDbs).forEach((ck) => {
                reconciledDbs[ck] = (loadedCatDbs[ck] || []).map((p) => {
                  const nm = normalizeProductName(p.productName);
                  const mergedCode = normalizeCodeStr(p.productCode) || codeByName.get(nm) || '';
                  const nextP = { ...p, productCode: mergedCode };
                  if (nm) dbInfoByName.set(nm, nextP);
                  return nextP;
                });
              });
              const reconciledPkRows = loadedPkRows.map((r) => {
                const nm = normalizeProductName(r.productName);
                const dbHit = dbInfoByName.get(nm);
                return {
                  ...r,
                  productId: r.productId || (dbHit ? dbHit.id : ''),
                  productCode: normalizeCodeStr(r.productCode) || (dbHit ? normalizeCodeStr(dbHit.productCode) : ''),
                };
              });
              setCategoryDbs(reconciledDbs);
              setPkCostRows(reconciledPkRows);
            } else {
              if (loadedCatDbs) setCategoryDbs(loadedCatDbs);
              if (loadedPkRows) setPkCostRows(loadedPkRows);
            }
            if (extracted.msUpdatedDate) {
              const rawDate = String(extracted.msUpdatedDate).trim();
              const normalizedDate = /^\d{2}\.\d{2}\.\d{2}$/.test(rawDate)
                ? `20${rawDate.replace(/\./g, '-')}`
                : rawDate;
              setMsUpdatedDate(normalizedDate);
            }
            priceDbLoadedRef.current = true;
            priceDbRevisionRef.current = revision;
            priceDbBlockReasonRef.current = revision === null ? '제품단가 GAS 스크립트가 구버전입니다 (v2.0 업데이트 필요)' : '';
            setLastSyncedAt(result.updatedAt || new Date().toLocaleTimeString('ko-KR'));
            if (revision === null) {
              markPriceError('저장 중지 (GAS 업데이트 필요)');
            } else {
              setSyncStatus('SUCCESS');
            }
            if (!silentOnEmpty) {
              showToast('제품단가 구글 스프레드시트에서 최신 DB를 불러왔습니다!');
            }
          } else {
            throw new Error(result?.message || '인식할 수 없는 응답 형식');
          }
        } catch (err) {
          if (err && err.unauthorized) {
            priceDbBlockReasonRef.current = '접속 코드가 필요합니다';
            markPriceError('접속 코드 필요');
          } else if (!priceDbLoadedRef.current) {
            priceDbBlockReasonRef.current = 'DB를 불러오지 못했습니다';
            markPriceError('DB 불러오기 실패 · 저장 중지');
            showToast(`제품단가 DB를 불러오지 못했습니다 (${err && err.message ? err.message : err}). 화면은 이 기기에 남은 사본이며 저장은 중지됩니다.`);
          } else {
            markPriceError('새로고침 실패');
            if (!silentOnEmpty) showToast(`제품단가 DB 불러오기 실패: ${err && err.message ? err.message : err}`);
          }
        }
      };

      const handleSavePriceGasUrlConfig = () => {
        const nextUrl = (draftPriceGasUrl || '').trim() || DEFAULT_PRICE_GAS_WEB_APP_URL;
        setPriceGasUrl(nextUrl);
        try {
          localStorage.setItem(PRICE_GAS_URL_STORAGE_KEY, nextUrl);
        } catch (e) {}
        setIsPriceDbModalOpen(false);
        priceDbLoadedRef.current = false;
        priceDbRevisionRef.current = null;
        priceDbBlockReasonRef.current = '새 DB 주소를 아직 불러오지 못했습니다';
        handleLoadFromGoogleSheet(false, nextUrl);
      };

      const handleResetDefaultPriceGasUrl = () => {
        setDraftPriceGasUrl(DEFAULT_PRICE_GAS_WEB_APP_URL);
      };

      useEffect(() => {
        handleLoadFromGoogleSheet(true, priceGasUrl);
      }, []);

      // 접속 코드 입력 직후 다시 불러오기용 (index.html의 reloadAllDomainsFromDb에서 호출)
      useEffect(() => {
        window.reloadProductPriceDb = () => handleLoadFromGoogleSheet(true, priceGasUrl);
      });

      const calc = useMemo(() => {
        const avgMonthlyWorkDays = Number(settings.avgMonthlyWorkDays) || 0;
        const dailyWorkHours = Number(settings.dailyWorkHours) || 0;
        const annualLeaveDays = Number(settings.annualLeaveDays) || 0;
        const annualPublicHolidays = Number(settings.annualPublicHolidays) || 0;

        const monthlyScheduledHours = Math.round(avgMonthlyWorkDays * dailyWorkHours * 10) / 10;
        const avgMonthlyHolidays = Math.round((annualPublicHolidays / 12) * 10) / 10;
        const avgMonthlyLeave = Math.round((annualLeaveDays / 12) * 10) / 10;
        const actualMonthlyWorkDays =
          Math.round((avgMonthlyWorkDays - avgMonthlyHolidays - avgMonthlyLeave) * 10) / 10;
        const actualMonthlyWorkHours =
          Math.round(actualMonthlyWorkDays * dailyWorkHours * 10) / 10;

        const severanceRatePercent = Number(settings.severanceRatePercent) || 0;
        const severanceMultiplier = Math.round((1 + severanceRatePercent / 100) * 100) / 100;

        const totalMonthlyFixedCost = settings.fixedCostItems.reduce(
          (sum, item) => sum + (Number(item.amount) || 0),
          0
        );

        const defaultMonthlyProdDays = Number(settings.defaultMonthlyProdDays) || 0;
        const expectedTotalMonthlySales = Number(settings.expectedTotalMonthlySales) || 0;
        const monthlyProdHours = defaultMonthlyProdDays * dailyWorkHours;

        const fixedCostPerHour =
          monthlyProdHours > 0 ? totalMonthlyFixedCost / monthlyProdHours : 0;
        const fixedCostPerMinute = fixedCostPerHour / 60;
        const fixedCostPer100Sales =
          expectedTotalMonthlySales > 0
            ? (totalMonthlyFixedCost / expectedTotalMonthlySales) * 100
            : 0;
        const fixedCostRatioPercent = fixedCostPer100Sales;

        const totalPartSales = settings.partAllocations.reduce(
          (sum, p) => sum + (Number(p.expectedSales) || 0),
          0
        );
        const partRows = settings.partAllocations.map((p) => {
          const sales = Number(p.expectedSales) || 0;
          const ratioPercent = totalPartSales > 0 ? (sales / totalPartSales) * 100 : 0;
          const allocatedFixed = settings.linkPartFixedToMonthlyTotal
            ? Math.round((totalMonthlyFixedCost * ratioPercent) / 100)
            : Number(p.rawAllocatedFixed) || 0;
          return {
            ...p,
            sales,
            ratioPercent,
            allocatedFixed,
          };
        });
        const totalPartAllocatedFixed = partRows.reduce((sum, p) => sum + p.allocatedFixed, 0);

        return {
          monthlyScheduledHours,
          avgMonthlyHolidays,
          avgMonthlyLeave,
          actualMonthlyWorkDays,
          actualMonthlyWorkHours,
          severanceMultiplier,
          totalMonthlyFixedCost,
          fixedCostPerHour,
          fixedCostPerMinute,
          fixedCostPer100Sales,
          fixedCostRatioPercent,
          totalPartSales,
          partRows,
          totalPartAllocatedFixed,
        };
      }, [settings]);

      // [5단계] 매장 매입가 수수료율 (기본 9.29%, 기본설정에서 변경)
      const storeFeeRatePct = (() => { const r = parseFloat(settings.storeCommissionRatePercent); return isFinite(r) ? r : 9.29; })();
      const storeFeeMul = 1 + storeFeeRatePct / 100;

      const jobMap = useMemo(() => {
        const map = new Map();
        settings.jobTypeSalaries.forEach((jt) => map.set(jt.id, jt));
        return map;
      }, [settings.jobTypeSalaries]);

      const [recipeRefreshTick, setRecipeRefreshTick] = useState(0);
      useEffect(() => {
        window.refreshProductPriceRecipeLinks = () => setRecipeRefreshTick((t) => t + 1);
      }, []);

      const liveRecipeLookup = useMemo(() => {
        const list = getLiveRecipesArray();
        const byCode = new Map();
        const byName = new Map();
        list.forEach((rc) => {
          if (!rc) return;
          const code = normalizeCodeStr(rc.productCode);
          if (code) byCode.set(code, rc);
          if (rc.recipeType !== 'SUB') {
            const nm = normalizeProductName(rc.productName);
            if (nm) byName.set(nm, rc);
          }
        });
        return { list, byCode, byName };
      }, [recipeRefreshTick, activeTab]);

      // [3단계 Q4] 품목코드로 연결된 레시피가 있으면 1배합 재료비를 레시피의 '현재' 생산원가로 실시간 반영
      //  (기존: [레시피 연동] 버튼을 누른 시점 값으로 고정 → 레시피 탭과 원가가 달라짐)
      //  1배합 생산수량·PK입수는 직접 수정할 수 있도록 기존처럼 버튼 연동 값을 유지
      const computedCategoryDbs = useMemo(() => {
        const result = {};
        Object.keys(PROCESS_CATEGORIES).forEach((catKey) => {
          const list = categoryDbs[catKey] || [];
          result[catKey] = list.map((product) => {
            let effective = product;
            const code = normalizeCodeStr(product.productCode);
            const rc = code ? liveRecipeLookup.byCode.get(code) : null;
            if (rc) {
              try {
                const m = evalLiveRecipeMetrics(rc);
                if (m && Number(m.productionCost) > 0) {
                  effective = { ...product, batchMaterialCost: Math.round(m.productionCost) };
                }
              } catch (e) {}
            }
            return {
              product,
              computed: computeProductLabor(effective, jobMap, calc.actualMonthlyWorkHours),
            };
          });
        });
        return result;
      }, [categoryDbs, jobMap, calc.actualMonthlyWorkHours, liveRecipeLookup]);



      const laborDbByProductName = useMemo(() => {
        const byIdMap = new Map();
        const byCodeMap = new Map();
        const exactMap = new Map();
        const normalizedMap = new Map();
        const allRegisteredProducts = [];

        Object.keys(PROCESS_CATEGORIES).forEach((catKey) => {
          const catLabel = PROCESS_CATEGORIES[catKey].label;
          const list = computedCategoryDbs[catKey] || [];
          list.forEach(({ product, computed }) => {
            const rawName = String(product.productName || '').trim();
            if (!rawName) return;
            const cleanCode = normalizeCodeStr(product.productCode);
            const entry = {
              catKey,
              catLabel,
              productId: product.id,
              productCode: cleanCode,
              productName: rawName,
              batchOutputEa: computed.batchOutputEa,
              pkQuantityEa: computed.pkQuantityEa,
              batchMaterialCost: computed.batchMaterialCost,
              batchOutputPk: computed.batchOutputPk,
              totalBatchLaborCost: computed.totalBatchLaborCost,
              laborCostPerPk: computed.laborCostPerPk,
              laborCostPerEa: computed.laborCostPerEa,
            };
            byIdMap.set(product.id, entry);
            if (cleanCode && !byCodeMap.has(cleanCode)) byCodeMap.set(cleanCode, entry);
            exactMap.set(rawName, entry);
            normalizedMap.set(normalizeProductName(rawName), entry);
            allRegisteredProducts.push(entry);
          });
        });

        return {
          findMatch: (nameOrRow) => {
            if (nameOrRow && typeof nameOrRow === 'object') {
              if (nameOrRow.productId && byIdMap.has(nameOrRow.productId)) {
                return byIdMap.get(nameOrRow.productId);
              }
              const rCode = normalizeCodeStr(nameOrRow.productCode);
              if (rCode && byCodeMap.has(rCode)) {
                return byCodeMap.get(rCode);
              }
              const rName = String(nameOrRow.productName || '').trim();
              if (!rName) return null;
              return exactMap.get(rName) || normalizedMap.get(normalizeProductName(rName)) || null;
            }
            const trimmed = String(nameOrRow || '').trim();
            if (!trimmed) return null;
            return byCodeMap.get(trimmed) || exactMap.get(trimmed) || normalizedMap.get(normalizeProductName(trimmed)) || null;
          },
          allRegisteredProducts,
        };
      }, [computedCategoryDbs]);

      useEffect(() => {
        setPkCostRows((prev) => {
          let changed = false;
          const validExistingRows = prev
            .filter((r) => Boolean(laborDbByProductName.findMatch(r)))
            .map((r) => {
              const hit = laborDbByProductName.findMatch(r);
              if (!hit) return r;
              const nextCode = hit.productCode || normalizeCodeStr(r.productCode);
              if (
                r.productId !== hit.productId ||
                r.productName !== hit.productName ||
                normalizeCodeStr(r.productCode) !== nextCode ||
                r.section !== hit.catLabel
              ) {
                changed = true;
                return {
                  ...r,
                  productId: hit.productId,
                  productCode: nextCode,
                  productName: hit.productName,
                  section: hit.catLabel,
                };
              }
              return r;
            });

          const existingIds = new Set(validExistingRows.map((r) => r.productId).filter(Boolean));
          const existingNames = new Set(
            validExistingRows.map((r) => normalizeProductName(r.productName))
          );
          const addedRows = [];

          laborDbByProductName.allRegisteredProducts.forEach((dbItem) => {
            const norm = normalizeProductName(dbItem.productName);
            if (!existingIds.has(dbItem.productId) && !existingNames.has(norm)) {
              addedRows.push({
                id: `pk-auto-${dbItem.productId}-${Math.random().toString(36).slice(2, 5)}`,
                productId: dbItem.productId,
                productCode: dbItem.productCode || '',
                section: dbItem.catLabel,
                productName: dbItem.productName,
                releasePriceEa: 0,
                storeBuyPriceEa: 0,
                gontranPriceEa: 0,
                msBuyPricePk: 0,
                msSellPricePk: 0,
                msNote: '',
                note: '',
              });
            }
          });

          if (!changed && addedRows.length === 0 && validExistingRows.length === prev.length) {
            return prev;
          }
          return [...validExistingRows, ...addedRows];
        });
      }, [laborDbByProductName]);

      const handleUpdatePkRow = (rowId, field, value) => {
        setPkCostRows((prev) =>
          prev.map((row) => {
            if (row.id !== rowId) return row;
            if (field === 'productName') {
              const matched = laborDbByProductName.findMatch(value);
              return {
                ...row,
                productId: matched ? matched.productId : row.productId,
                productCode: matched ? matched.productCode || '' : row.productCode,
                productName: value,
                section: matched ? matched.catLabel : row.section,
              };
            }
            return { ...row, [field]: value };
          })
        );
      };

      // PK원가표·공정DB·엠즈단가표 품목코드 양방향 통합 변경 핸들러
      const handleUpdateUnifiedProductCode = (rowId, matchedDb, rawCodeVal) => {
        const cleanCode = String(rawCodeVal ?? '').trim();
        setPkCostRows((prev) =>
          prev.map((r) => (r.id === rowId ? { ...r, productCode: cleanCode } : r))
        );
        if (matchedDb && matchedDb.catKey && matchedDb.productId) {
          setCategoryDbs((prev) => ({
            ...prev,
            [matchedDb.catKey]: (prev[matchedDb.catKey] || []).map((p) =>
              p.id === matchedDb.productId ? { ...p, productCode: cleanCode } : p
            ),
          }));
        }
      };

      // 파트 내 품목코드 오름차순 일괄 정렬 (입력 중 커서 튕김 방지를 위해 버튼 클릭 시 실행)
      const handleSortAllByProductCode = () => {
        setCategoryDbs((prev) => {
          const next = {};
          Object.keys(prev).forEach((ck) => {
            next[ck] = [...(prev[ck] || [])].sort((a, b) =>
              compareProductCodeOrder(a.productCode, b.productCode)
            );
          });
          return next;
        });
        setPkCostRows((prev) => {
          return [...prev].sort((a, b) => {
            const secOrder = ['파이', '알생지', '파베이크', '제과'];
            const sa = secOrder.indexOf(a.section);
            const sb = secOrder.indexOf(b.section);
            if (sa !== sb) return (sa === -1 ? 99 : sa) - (sb === -1 ? 99 : sb);
            const dbA = laborDbByProductName.findMatch(a);
            const dbB = laborDbByProductName.findMatch(b);
            const codeA = dbA?.productCode || a.productCode || '';
            const codeB = dbB?.productCode || b.productCode || '';
            return compareProductCodeOrder(codeA, codeB);
          });
        });
        showToast('품목코드 오름차순으로 정렬되었습니다.');
      };

      // [핵심] 레시피 탭 원가·생산수량·PK입수량 연동 (1순위: 품목코드 일치 -> 2순위: 미입력 시 품목명 일치)
      const handleSyncMaterialCostsFromRecipeTab = (targetProdId = null) => {
        const globalRecipes = getLiveRecipesArray();
        if (globalRecipes.length === 0) {
          showToast('레시피 탭에 등록된 레시피 데이터가 없습니다.');
          return;
        }
        const byCode = new Map();
        const byName = new Map();
        globalRecipes.forEach((rc) => {
          if (!rc) return;
          const m = evalLiveRecipeMetrics(rc);
          if (!m) return;
          const code = normalizeCodeStr(rc.productCode);
          if (code) byCode.set(code, { rc, m });
          if (rc.recipeType !== 'SUB') {
            const norm = normalizeProductName(rc.productName);
            if (norm) byName.set(norm, { rc, m });
          }
        });

        const pkCodeByProdName = new Map();
        pkCostRows.forEach((r) => {
          const c = normalizeCodeStr(r.productCode);
          const nm = normalizeProductName(r.productName);
          if (c && nm) pkCodeByProdName.set(nm, c);
        });

        let codeMatchedCnt = 0;
        let nameMatchedCnt = 0;
        const codeUpdatesByProdId = new Map();

        setCategoryDbs((prev) => {
          const next = {};
          Object.keys(prev).forEach((catKey) => {
            next[catKey] = (prev[catKey] || []).map((prod) => {
              if (targetProdId && prod.id !== targetProdId) return prod;
              const normName = normalizeProductName(prod.productName);
              const curCode = normalizeCodeStr(prod.productCode) || pkCodeByProdName.get(normName) || '';

              let hit = null;
              if (curCode) {
                // 품목코드가 지정된 품목은 오직 동일 품목코드 레시피와만 1:1 정확 매칭!
                hit = byCode.get(curCode) || null;
                if (hit) codeMatchedCnt += 1;
              } else {
                // 품목코드가 비어있는 품목만 보조로 품목명 일치 검색 후 코드 자동 부여
                hit = byName.get(normName) || null;
                if (hit) nameMatchedCnt += 1;
              }

              if (!hit) return curCode !== (prod.productCode || '') ? { ...prod, productCode: curCode } : prod;

              const syncedCode = curCode || normalizeCodeStr(hit.rc.productCode);
              if (syncedCode) codeUpdatesByProdId.set(prod.id, syncedCode);

              const nextOutEa =
                hit.m.productQty > 0
                  ? Math.round(hit.m.productQty * 10) / 10
                  : prod.batchOutputEa;
              const nextPkEa =
                hit.rc.packQty > 0 ? Number(hit.rc.packQty) : prod.pkQuantityEa;
              const nextBatchMatCost = Math.round(hit.m.productionCost || 0);

              return {
                ...prod,
                productCode: syncedCode,
                batchOutputEa: nextOutEa,
                pkQuantityEa: nextPkEa,
                batchMaterialCost: nextBatchMatCost,
              };
            });
          });
          return next;
        });

        if (codeUpdatesByProdId.size > 0) {
          setPkCostRows((prev) =>
            prev.map((r) =>
              r.productId && codeUpdatesByProdId.has(r.productId)
                ? { ...r, productCode: codeUpdatesByProdId.get(r.productId) }
                : r
            )
          );
        }

        const totalMatched = codeMatchedCnt + nameMatchedCnt;
        if (totalMatched > 0) {
          showToast(
            `[레시피 연동 완료] 총 ${totalMatched}종 반영 (품목코드 일치 ${codeMatchedCnt}건 · 이름 일치 ${nameMatchedCnt}건) — [구글시트 저장]을 눌러 확정하세요!`
          );
        } else {
          showToast(
            targetProdId
              ? '해당 품목코드(또는 품목명)와 일치하는 레시피가 없습니다. 레시피 탭의 품목코드를 확인해주세요.'
              : '일치하는 레시피가 없습니다. 좌측 [품목코드] 칸에 레시피와 동일한 코드를 입력해주세요.'
          );
        }
      };

      useEffect(() => {
        try {
          localStorage.setItem(
            PRICE_LOCAL_CACHE_KEY,
            JSON.stringify({ settings, categoryDbs, pkCostRows, msUpdatedDate })
          );
        } catch (e) {}

        window.barogaProductPriceBridge = {
          getPkCostRows: () => pkCostRows,
          getCategoryDbs: () => categoryDbs,
          findPriceByRecipe: (code, name, recipeType = 'PRODUCT') => {
            const cleanCode = normalizeCodeStr(code);
            const normRcName = normalizeProductName(name);
            let codeHit = null;
            let nameHit = null;

            pkCostRows.forEach((r) => {
              if (!r) return;
              const matchedDb = laborDbByProductName.findMatch(r);
              const effCode = matchedDb
                ? matchedDb.productCode || normalizeCodeStr(r.productCode)
                : normalizeCodeStr(r.productCode);
              const pkEa = matchedDb ? Number(matchedDb.pkQuantityEa) || 0 : 0;
              const relEa = Number(r.releasePriceEa) || 0;
              const normRowName = normalizeProductName(r.productName);

              if (cleanCode && effCode && effCode === cleanCode && !codeHit) {
                codeHit = {
                  matched: true,
                  matchedBy: 'CODE',
                  productCode: effCode,
                  productName: r.productName || '',
                  releasePriceEa: relEa,
                  pkQuantityEa: pkEa,
                };
              } else if (
                recipeType !== 'SUB' &&
                !effCode &&
                normRcName &&
                normRowName === normRcName &&
                !nameHit
              ) {
                nameHit = {
                  matched: true,
                  matchedBy: 'NAME',
                  productCode: effCode,
                  productName: r.productName || '',
                  releasePriceEa: relEa,
                  pkQuantityEa: pkEa,
                };
              }
            });

            return codeHit || nameHit || null;
          },
        };

        if (
          window.activeMasterDomain === 'RECIPE' &&
          typeof window.renderRecipeDetailPanel === 'function'
        ) {
          window.renderRecipeDetailPanel();
        }
      }, [settings, categoryDbs, pkCostRows, msUpdatedDate, laborDbByProductName]);

      const handleExportProductPriceExcel = () => {
        const dStr = typeof window.getTodayStr === 'function' ? window.getTodayStr() : new Date().toISOString().slice(0, 10);
        const fixedCostRatioDecimal = calc.fixedCostRatioPercent > 0 ? calc.fixedCostRatioPercent / 100 : 0;

        if (typeof XLSX === 'undefined') {
          showToast('엑셀 라이브러리(XLSX)를 찾을 수 없습니다.');
          return;
        }

        const wb = XLSX.utils.book_new();

        // [시트 1] PK단위_원가표 (2줄 그룹 헤더 + 파트 구분선 + 23열 전체 값)
        const pkAoA = [
          [
            '품목코드', '제품명',
            '◀ 1배합 기준 입력 ▶', '', '',
            '◀ PK당 생산원가 ▶', '', '', '', '',
            '◀ 1개당 원가 vs 출고가 ▶', '', '',
            '◀ 출고가 대비 비율 · 예상마진 ▶', '', '', '', '', '',
            '◀ 곤트란 매장 마진 ▶', '', '',
            '비고'
          ],
          [
            '품목코드', '제품명',
            'PK입수량(ea)', '1배합→PK수', '원재료비용(1배합,원)',
            '1배합 인건비(원)', 'PK당 원재료(원)', 'PK당 인건비(원)', 'PK당 고정비(원)', 'PK 총생산원가(원)',
            '총생산원가(1ea,원)', '바로가 출고가(1ea,원)', '생산원가비율(%)',
            '원재료 비율(%)', '인건비 비율(%)', '고정비 비율(%)', '예상마진(1ea,원)', '예상 마진율(%)', '인건비/마진(%)',
            '매장매입가(VAT포함)', '곤트란 판매가(1ea,원)', '매입원가비율(%)',
            '비고'
          ]
        ];
        const pkMerges = [
          { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
          { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
          { s: { r: 0, c: 2 }, e: { r: 0, c: 4 } },
          { s: { r: 0, c: 5 }, e: { r: 0, c: 9 } },
          { s: { r: 0, c: 10 }, e: { r: 0, c: 12 } },
          { s: { r: 0, c: 13 }, e: { r: 0, c: 18 } },
          { s: { r: 0, c: 19 }, e: { r: 0, c: 21 } },
          { s: { r: 0, c: 22 }, e: { r: 1, c: 22 } },
        ];

        const secOrder = [];
        const secMap = new Map();
        pkCostRows.forEach((r) => {
          const s = (r.section || '기타').trim() || '기타';
          if (!secMap.has(s)) { secMap.set(s, []); secOrder.push(s); }
          secMap.get(s).push(r);
        });

        secOrder.forEach((secName) => {
          const secRowIdx = pkAoA.length;
          pkAoA.push([`-`, `── ${secName} ──`, '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '']);
          pkMerges.push({ s: { r: secRowIdx, c: 1 }, e: { r: secRowIdx, c: 22 } });

          (secMap.get(secName) || []).forEach((row) => {
            const matchedDb = laborDbByProductName.findMatch(row);
            const pCode = matchedDb ? (matchedDb.productCode || normalizeCodeStr(row.productCode)) : normalizeCodeStr(row.productCode);
            const pkEa = matchedDb ? matchedDb.pkQuantityEa : 0;
            const bPk = matchedDb ? matchedDb.batchOutputPk : 0;
            const bMat = matchedDb ? matchedDb.batchMaterialCost : 0;
            const bLab = matchedDb ? matchedDb.totalBatchLaborCost : 0;

            const matchedPartObj = settings.partAllocations.find((p) => {
              if (!matchedDb) return false;
              if (matchedDb.catKey === 'PIE') return p.name.includes('파이');
              if (matchedDb.catKey === 'DOUGH') return p.name.includes('알생지');
              if (matchedDb.catKey === 'PARBAKE') return p.name.includes('파베이크');
              if (matchedDb.catKey === 'BAKERY') return p.name.includes('제과');
              return false;
            });
            const factor = matchedPartObj && Number(matchedPartObj.laborFactor) > 0 ? Number(matchedPartObj.laborFactor) : 1;

            const pkMat = matchedDb && bPk > 0 ? Math.round(bMat / bPk + Number.EPSILON) : null;
            const pkLab = matchedDb && bPk > 0 ? Math.round((bLab / bPk) * factor + Number.EPSILON) : null;
            const relEa = Number(row.releasePriceEa) || 0;
            const pkFix = matchedDb && relEa > 0 && pkEa > 0 && fixedCostRatioDecimal > 0
              ? Math.round(relEa * pkEa * fixedCostRatioDecimal + Number.EPSILON)
              : null;
            const pkTot = (pkMat !== null && pkLab !== null && pkFix !== null) ? (pkMat + pkLab + pkFix) : null;
            const eaTot = (pkTot !== null && pkEa > 0) ? Math.round(pkTot / pkEa + Number.EPSILON) : null;

            const prodRatio = (eaTot !== null && relEa > 0) ? Number(((eaTot / relEa) * 100).toFixed(1)) : '';
            const matRatio = (pkTot !== null && pkMat !== null && pkEa > 0 && relEa > 0) ? Number(((pkMat / pkEa / relEa) * 100).toFixed(1)) : '';
            const labRatio = (pkTot !== null && pkLab !== null && pkEa > 0 && relEa > 0) ? Number(((pkLab / pkEa / relEa) * 100).toFixed(1)) : '';
            const fixRatio = (pkTot !== null && pkFix !== null && pkEa > 0 && relEa > 0) ? Number(((pkFix / pkEa / relEa) * 100).toFixed(1)) : '';
            const expMargin = (eaTot !== null && relEa > 0) ? (relEa - eaTot) : '';
            const expMarginRate = prodRatio !== '' ? Number((100 - prodRatio).toFixed(1)) : '';
            const labToMargin = (pkTot !== null && pkLab !== null && pkEa > 0 && expMargin !== '' && expMargin > 0)
              ? Number((((pkLab / pkEa) / expMargin) * 100).toFixed(1))
              : '';

            const storeBuy = relEa > 0 ? Math.round(relEa * storeFeeMul * 1.1 + Number.EPSILON) : '';
            const gontranPrice = Number(row.gontranPriceEa) || 0;
            const storeRatio = (storeBuy !== '' && gontranPrice > 0) ? Number(((storeBuy / gontranPrice) * 100).toFixed(2)) : '';

            pkAoA.push([
              pCode,
              row.productName || '',
              matchedDb ? pkEa : '',
              matchedDb ? bPk : '',
              matchedDb ? bMat : '',
              matchedDb ? bLab : '',
              pkMat !== null ? pkMat : '',
              pkLab !== null ? pkLab : '',
              pkFix !== null ? pkFix : '',
              pkTot !== null ? pkTot : '',
              eaTot !== null ? eaTot : '',
              relEa > 0 ? relEa : '',
              prodRatio,
              matRatio,
              labRatio,
              fixRatio,
              expMargin,
              expMarginRate,
              labToMargin,
              storeBuy,
              gontranPrice > 0 ? gontranPrice : '',
              storeRatio,
              row.note || ''
            ]);
          });
        });

        const wsPk = XLSX.utils.aoa_to_sheet(pkAoA);
        wsPk['!merges'] = pkMerges;
        wsPk['!cols'] = [
          { wch: 9 }, { wch: 26 }, { wch: 11 }, { wch: 11 }, { wch: 15 },
          { wch: 14 }, { wch: 13 }, { wch: 13 }, { wch: 13 }, { wch: 15 },
          { wch: 14 }, { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 12 },
          { wch: 12 }, { wch: 13 }, { wch: 12 }, { wch: 13 }, { wch: 15 },
          { wch: 14 }, { wch: 13 }, { wch: 16 }
        ];
        XLSX.utils.book_append_sheet(wb, wsPk, '1_PK단위_원가표');

        // [시트 2] 엠즈_매입판매가
        const msAoA = [
          [`업데이트 날짜: ${msUpdatedDate}`, '', '바로가 기준', '', '', '엠즈(M\'s food) 등록 기준', '', '검증', '', '비고'],
          ['품목코드', '제품명', 'PK입수량', '출고가(ea)', '출고가(pk)', '매입가(pk)', '판매가(pk)', '매입가 오차(%)', '판매 수수료(%)', '비고']
        ];
        const msMerges = [
          { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
          { s: { r: 0, c: 2 }, e: { r: 0, c: 4 } },
          { s: { r: 0, c: 5 }, e: { r: 0, c: 6 } },
          { s: { r: 0, c: 7 }, e: { r: 0, c: 8 } },
        ];
        secOrder.forEach((secName) => {
          const rIdx = msAoA.length;
          msAoA.push([`── ${secName} ──`, '', '', '', '', '', '', '', '', '']);
          msMerges.push({ s: { r: rIdx, c: 0 }, e: { r: rIdx, c: 9 } });
          (secMap.get(secName) || []).forEach((row) => {
            const matchedDb = laborDbByProductName.findMatch(row);
            const pCode = matchedDb ? (matchedDb.productCode || normalizeCodeStr(row.productCode)) : normalizeCodeStr(row.productCode);
            const pkEa = matchedDb ? Number(matchedDb.pkQuantityEa) || 0 : 0;
            const relEa = Number(row.releasePriceEa) || 0;
            const relPk = (relEa > 0 && pkEa > 0) ? relEa * pkEa : '';
            const msBuy = Number(row.msBuyPricePk) || 0;
            const msSell = Number(row.msSellPricePk) || 0;
            const buyErr = (relPk !== '' && relPk > 0 && msBuy > 0) ? Number((((msBuy - relPk) / relPk) * 100).toFixed(2)) : '';
            const feePct = (msBuy > 0 && msSell > 0) ? Number((((msSell - msBuy) / msBuy) * 100).toFixed(2)) : '';
            msAoA.push([
              pCode,
              row.productName || '',
              pkEa > 0 ? pkEa : '',
              relEa > 0 ? relEa : '',
              relPk,
              msBuy > 0 ? msBuy : '',
              msSell > 0 ? msSell : '',
              buyErr,
              feePct,
              row.msNote || ''
            ]);
          });
        });
        const wsMs = XLSX.utils.aoa_to_sheet(msAoA);
        wsMs['!merges'] = msMerges;
        wsMs['!cols'] = [
          { wch: 10 }, { wch: 26 }, { wch: 10 }, { wch: 12 }, { wch: 14 },
          { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 22 }
        ];
        XLSX.utils.book_append_sheet(wb, wsMs, '2_엠즈_매입판매가');

        // [시트 3~6] 파트별 공정 인건비 DB (요약 + 품목별 1~3공정 상세)
        [
          { key: 'PIE', sheetName: '3_파이_공정DB' },
          { key: 'DOUGH', sheetName: '4_알생지_공정DB' },
          { key: 'PARBAKE', sheetName: '5_파베이크_공정DB' },
          { key: 'BAKERY', sheetName: '6_제과_공정DB' },
        ].forEach(({ key, sheetName }) => {
          const cList = computedCategoryDbs[key] || [];
          const catAoA = [
            [`[${PROCESS_CATEGORIES[key].label} 공정별 인건비 요약표] (총 ${cList.length}종)`],
            ['품목코드', '품목명', '1배합 실생산(ea)', 'PK입수량(ea)', '1배합→PK수', '원재료비용(1배합,원)', '총 투입시간(분)', '1배합 인건비(원)', 'PK당 인건비(보정전)', '1ea 인건비(보정전)']
          ];
          cList.forEach(({ product, computed }) => {
            catAoA.push([
              product.productCode || '',
              product.productName || '',
              computed.batchOutputEa,
              computed.pkQuantityEa,
              computed.batchOutputPk,
              computed.batchMaterialCost,
              computed.totalMinutes,
              computed.totalBatchLaborCost,
              computed.laborCostPerPk,
              computed.laborCostPerEa
            ]);
          });
          catAoA.push([]);
          catAoA.push([`[${PROCESS_CATEGORIES[key].label} 품목별 1~3공정 작업시간 상세]`]);
          catAoA.push(['품목코드', '품목명', '공정구분', '작업유형', '세전월급(원)', '분당단가(원)', '소요시간(분)', '인건비(원)', '비고']);
          cList.forEach(({ product, computed }) => {
            [
              { label: '1공정(계량·믹싱)', data: computed.s1 },
              { label: '2공정(분할·성형·굽기)', data: computed.s2 },
              { label: '3공정(포장·냉동)', data: computed.s3 },
            ].forEach((st) => {
              st.data.rows.filter((r) => r.isAssigned || r.minutes > 0).forEach((r) => {
                catAoA.push([
                  product.productCode || '',
                  product.productName || '',
                  st.label,
                  r.jobName || '미배정',
                  r.isAssigned ? r.baseSalary : '',
                  r.isAssigned ? r.costPerMin : '',
                  r.minutes,
                  r.rowLaborCost,
                  r.note || ''
                ]);
              });
            });
          });
          const wsCat = XLSX.utils.aoa_to_sheet(catAoA);
          wsCat['!cols'] = [
            { wch: 10 }, { wch: 26 }, { wch: 20 }, { wch: 18 }, { wch: 14 },
            { wch: 16 }, { wch: 14 }, { wch: 15 }, { wch: 18 }, { wch: 18 }
          ];
          XLSX.utils.book_append_sheet(wb, wsCat, sheetName);
        });

        // [시트 7] 기본설정 (근무시간 · 고정비 · 보정계수 · 작업유형별 급여)
        const setAoA = [
          ['■ 1~3. 근무시간 및 고정비 기준'],
          ['항목', '설정값', '단위/비고'],
          ['월 소정근로일수', settings.avgMonthlyWorkDays, '일'],
          ['일 소정근로시간', settings.dailyWorkHours, '시간'],
          ['실제 월 근무일수', calc.actualMonthlyWorkDays, '일'],
          ['실제 월 근무시간 (분당단가 기준)', calc.actualMonthlyWorkHours, '시간'],
          ['예상 월 매출 (출고가 기준)', settings.expectedTotalMonthlySales, '원/월'],
          ['월 고정비 합계', calc.totalMonthlyFixedCost, '원/월'],
          ['매출 대비 고정비 비율', Number(calc.fixedCostRatioPercent.toFixed(4)), '%'],
          [],
          ['■ 4. 월 고정비 세부 항목'],
          ['항목명', '월 금액(원)', '단위'],
          ...settings.fixedCostItems.map((fc) => [fc.name, fc.amount, fc.unit || '원/월']),
          [],
          ['■ 6. 파트별 인건비 가동률 보정계수'],
          ['파트 구분', '보정계수', '산출 근거', '급여합', '6월 배부액(원)'],
          ...settings.partAllocations.map((p) => [p.name, p.laborFactor, p.factorNote || '', p.juneSalaryTotal ?? '', p.juneAllocatedCost ?? '']),
          [],
          ['■ 7. 작업유형별 기본급여(세전) DB'],
          ['작업유형', '세전 기본급(원)'],
          ...settings.jobTypeSalaries.map((jt) => [jt.jobType, jt.baseSalary])
        ];
        const wsSet = XLSX.utils.aoa_to_sheet(setAoA);
        wsSet['!cols'] = [{ wch: 36 }, { wch: 18 }, { wch: 22 }, { wch: 16 }, { wch: 16 }];
        XLSX.utils.book_append_sheet(wb, wsSet, '7_기본설정');

        XLSX.writeFile(wb, `바로가공장_제품단가원가표_${dStr}.xlsx`);
        showToast('제품단가 전체 시트(.xlsx) 다운로드가 완료되었습니다!');
      };

      useEffect(() => {
        window.exportProductPriceCsv = handleExportProductPriceExcel;
      }, [pkCostRows, laborDbByProductName, calc, settings, computedCategoryDbs, msUpdatedDate]);

      const handleAddPkRow = () => {
        const existingNames = new Set(pkCostRows.map((r) => normalizeProductName(r.productName)));
        const nextDbItem =
          laborDbByProductName.allRegisteredProducts.find(
            (item) => !existingNames.has(normalizeProductName(item.productName))
          ) || laborDbByProductName.allRegisteredProducts[0];

        if (!nextDbItem) {
          showToast('먼저 공정 DB(파이·알생지·파베이크·제과)에 품목을 등록해주세요.');
          return;
        }

        const newRow = {
          id: `pk-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
          productId: nextDbItem.productId,
          productCode: nextDbItem.productCode || '',
          section: nextDbItem.catLabel,
          productName: nextDbItem.productName,
          releasePriceEa: 0,
          storeBuyPriceEa: 0,
          gontranPriceEa: 0,
          msBuyPricePk: 0,
          msSellPricePk: 0,
          msNote: '',
          note: '',
        };
        setPkCostRows((prev) => [...prev, newRow]);
      };

      const handleLoadAllDbProductsToPkTable = () => {
        setPkCostRows((prev) => {
          const validExistingRows = prev.filter((r) =>
            Boolean(laborDbByProductName.findMatch(r))
          );
          const existingIds = new Set(validExistingRows.map((r) => r.productId).filter(Boolean));
          const existingNames = new Set(
            validExistingRows.map((r) => normalizeProductName(r.productName))
          );
          const addedRows = [];

          laborDbByProductName.allRegisteredProducts.forEach((dbItem) => {
            const norm = normalizeProductName(dbItem.productName);
            if (!existingIds.has(dbItem.productId) && !existingNames.has(norm)) {
              addedRows.push({
                id: `pk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                productId: dbItem.productId,
                productCode: dbItem.productCode || '',
                section: dbItem.catLabel,
                productName: dbItem.productName,
                releasePriceEa: 0,
                storeBuyPriceEa: 0,
                gontranPriceEa: 0,
                msBuyPricePk: 0,
                msSellPricePk: 0,
                msNote: '',
                note: '',
              });
            }
          });

          if (addedRows.length === 0 && validExistingRows.length === prev.length) {
            showToast('이미 모든 공정 DB 품목이 원가표에 등록되어 있습니다.');
            return prev;
          }
          showToast(`공정 DB 품목 ${validExistingRows.length + addedRows.length}종으로 동기화되었습니다.`);
          return [...validExistingRows, ...addedRows];
        });
      };

      const updateSettingField = (field, value) => {
        setSettings((prev) => ({ ...prev, [field]: value }));
      };

      const handleUpdateFixedItem = (id, field, value) => {
        setSettings((prev) => ({
          ...prev,
          fixedCostItems: prev.fixedCostItems.map((item) =>
            item.id === id ? { ...item, [field]: value } : item
          ),
        }));
      };

      const handleDeleteFixedItem = (id) => {
        setSettings((prev) => ({
          ...prev,
          fixedCostItems: prev.fixedCostItems.filter((item) => item.id !== id),
        }));
      };

      const handleUpdatePartSales = (id, field, value) => {
        setSettings((prev) => ({
          ...prev,
          partAllocations: prev.partAllocations.map((p) =>
            p.id === id ? { ...p, [field]: value } : p
          ),
        }));
      };

      const handleUpdateJobSalary = (id, field, value) => {
        setSettings((prev) => ({
          ...prev,
          jobTypeSalaries: prev.jobTypeSalaries.map((jt) =>
            jt.id === id ? { ...jt, [field]: value } : jt
          ),
        }));
      };

      const handleAddProduct = (catKey, useCroissantTemplate = false) => {
        const count = (categoryDbs[catKey] || []).length + 1;
        const defaultName = `${PROCESS_CATEGORIES[catKey].label} 신규품목 ${count}`;
        let newSheet;

        if (useCroissantTemplate && INITIAL_CATEGORY_DBS.PIE[0]) {
          const tpl = INITIAL_CATEGORY_DBS.PIE[0];
          const uid = `${catKey}-${Date.now()}`;
          newSheet = {
            ...tpl,
            id: uid,
            productName: defaultName,
            stage1Rows: tpl.stage1Rows.map((r, i) => ({ ...r, id: `${uid}-s1-${i}` })),
            stage2Rows: tpl.stage2Rows.map((r, i) => ({ ...r, id: `${uid}-s2-${i}` })),
            stage3Rows: tpl.stage3Rows.map((r, i) => ({ ...r, id: `${uid}-s3-${i}` })),
          };
        } else {
          newSheet = createBlankProcessSheet(catKey, defaultName);
        }

        setCategoryDbs((prev) => ({
          ...prev,
          [catKey]: [...(prev[catKey] || []), newSheet],
        }));
        setSelectedProductIds((prev) => ({ ...prev, [catKey]: newSheet.id }));
        setCategoryViewMode('SHEET');
        showToast(`[${defaultName}] 품목 시트가 생성되었습니다.`);
      };

      const handleDuplicateProduct = (catKey, sourceProduct) => {
        const uid = `${catKey}-${Date.now()}`;
        const cloned = {
          ...sourceProduct,
          id: uid,
          productCode: '',
          productName: `${sourceProduct.productName} (복사본)`,
          stage1Rows: sourceProduct.stage1Rows.map((r, i) => ({ ...r, id: `${uid}-s1-${i}` })),
          stage2Rows: sourceProduct.stage2Rows.map((r, i) => ({ ...r, id: `${uid}-s2-${i}` })),
          stage3Rows: sourceProduct.stage3Rows.map((r, i) => ({ ...r, id: `${uid}-s3-${i}` })),
        };
        setCategoryDbs((prev) => ({
          ...prev,
          [catKey]: [...(prev[catKey] || []), cloned],
        }));
        setSelectedProductIds((prev) => ({ ...prev, [catKey]: uid }));
        setCategoryViewMode('SHEET');
        showToast(`[${cloned.productName}] 품목이 복제되었습니다.`);
      };

      const confirmDeleteProduct = () => {
        if (!deleteTargetProduct) return;
        const { catKey, prodId, prodName } = deleteTargetProduct;
        setCategoryDbs((prev) => {
          const nextList = (prev[catKey] || []).filter((p) => p.id !== prodId);
          setSelectedProductIds((selPrev) => ({
            ...selPrev,
            [catKey]: nextList[0]?.id || null,
          }));
          return { ...prev, [catKey]: nextList };
        });
        setDeleteTargetProduct(null);
        showToast(`[${prodName}] 품목이 삭제되었습니다.`);
      };

      const handleUpdateProductMeta = (catKey, prodId, field, value) => {
        const targetProd = (categoryDbs[catKey] || []).find((p) => p.id === prodId);
        const oldName = targetProd ? targetProd.productName : '';
        setCategoryDbs((prev) => ({
          ...prev,
          [catKey]: (prev[catKey] || []).map((p) =>
            p.id === prodId ? { ...p, [field]: value } : p
          ),
        }));
        if (field === 'productCode' || field === 'productName') {
          setPkCostRows((prev) =>
            prev.map((r) => {
              if (r.productId === prodId || (oldName && r.productName === oldName)) {
                return {
                  ...r,
                  productId: prodId,
                  ...(field === 'productCode' ? { productCode: String(value ?? '').trim() } : {}),
                  ...(field === 'productName' ? { productName: value } : {}),
                };
              }
              return r;
            })
          );
        }
      };

      const handleAddStageRow = (catKey, prodId, stageKey, defaultJobTypeId = '') => {
        const newRow = {
          id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          jobTypeId: defaultJobTypeId,
          minutes: 0,
          note: '',
        };
        setCategoryDbs((prev) => ({
          ...prev,
          [catKey]: (prev[catKey] || []).map((p) =>
            p.id === prodId ? { ...p, [stageKey]: [...(p[stageKey] || []), newRow] } : p
          ),
        }));
      };

      const handleUpdateStageRow = (catKey, prodId, stageKey, rowId, field, value) => {
        setCategoryDbs((prev) => ({
          ...prev,
          [catKey]: (prev[catKey] || []).map((p) =>
            p.id === prodId
              ? {
                  ...p,
                  [stageKey]: (p[stageKey] || []).map((r) =>
                    r.id === rowId ? { ...r, [field]: value } : r
                  ),
                }
              : p
          ),
        }));
      };

      const handleRemoveStageRow = (catKey, prodId, stageKey, rowId) => {
        setCategoryDbs((prev) => ({
          ...prev,
          [catKey]: (prev[catKey] || []).map((p) =>
            p.id === prodId
              ? { ...p, [stageKey]: (p[stageKey] || []).filter((r) => r.id !== rowId) }
              : p
          ),
        }));
      };

      // ============================================================================
      // [시트 2] PK단위 원가표 렌더링
      // ============================================================================
      const renderPkMainCostSheet = () => {
        const fixedCostRatioDecimal =
          calc.fixedCostRatioPercent > 0 ? calc.fixedCostRatioPercent / 100 : 0;

        const sectionOrder = [];
        const groupedBySection = new Map();

        pkCostRows.forEach((row) => {
          const secName = (row.section || '기타').trim() || '기타';
          if (!groupedBySection.has(secName)) {
            groupedBySection.set(secName, []);
            sectionOrder.push(secName);
          }
          groupedBySection.get(secName).push(row);
        });

        const tableBodyElements = [];
        let rowNumber = 0;

        sectionOrder.forEach((currentSection) => {
          const rowsInSection = groupedBySection.get(currentSection) || [];
          tableBodyElements.push(
            React.createElement("tr", { key: `sec-${currentSection}`, className: "bg-slate-100 border-y border-slate-300" }, React.createElement("td", { className: "py-1.5 px-2 text-center text-[11px] font-bold text-slate-400 border-r border-slate-300" }, "-"), React.createElement("td", { colSpan: 22, className: "py-1.5 px-4 text-center text-xs font-extrabold text-slate-800 tracking-wide" }, "── ", currentSection, " ──"))
          );

          rowsInSection.forEach((row) => {
            rowNumber += 1;
            const matchedDb = laborDbByProductName.findMatch(row);
            const effectiveCode = matchedDb
              ? matchedDb.productCode || normalizeCodeStr(row.productCode)
              : normalizeCodeStr(row.productCode);
            const linkedRecipe = effectiveCode ? liveRecipeLookup.byCode.get(effectiveCode) : null;
            const tipRecipeCode = linkedRecipe
              ? {
                  title: `레시피 탭 연동됨 (코드: ${effectiveCode})`,
                  formula: '레시피 품목코드 = 제품단가 품목코드 (1:1 매칭)',
                  calc: `연결된 레시피: [${linkedRecipe.productCode}] ${linkedRecipe.productName}`,
                }
              : {
                  title: '품목코드 (레시피 탭 ID와 통일)',
                  formula: '레시피 탭의 [품목코드]와 동일한 번호 입력',
                  calc: effectiveCode
                    ? `현재 코드 [${effectiveCode}] — 레시피 탭에 동일 코드가 아직 없습니다.`
                    : '코드를 입력하면 제품명이 달라도 레시피 원가가 100% 정확히 연동됩니다.',
                };

            const autoPkQuantityEa = matchedDb ? matchedDb.pkQuantityEa : 0;
            const autoBatchPkCount = matchedDb ? matchedDb.batchOutputPk : 0;
            const autoBatchMaterialCost = matchedDb ? matchedDb.batchMaterialCost : 0;
            const autoBatchLaborCost = matchedDb ? matchedDb.totalBatchLaborCost : 0;

            const liveRcMetrics = linkedRecipe ? evalLiveRecipeMetrics(linkedRecipe) : null;
            const isPkEaRecipeSynced = Boolean(
              linkedRecipe &&
              Number(linkedRecipe.packQty) > 0 &&
              Number(autoPkQuantityEa) === Number(linkedRecipe.packQty)
            );
            const isBatchPkSynced = Boolean(matchedDb && autoBatchPkCount > 0);
            const isMatCostRecipeSynced = Boolean(
              linkedRecipe && autoBatchMaterialCost > 0
            );
            const isLaborDbSynced = Boolean(matchedDb && autoBatchLaborCost > 0);

            const tipPkQuantityEa = matchedDb
              ? {
                  title: isPkEaRecipeSynced
                    ? `PK입수량 (레시피 · ${matchedDb.catLabel} DB 동기화됨)`
                    : `PK입수량 (${matchedDb.catLabel} DB 연동됨)`,
                  formula: '레시피 탭 [PK입수] ⇄ 공정 DB [PK입수량(ea)]',
                  calc: isPkEaRecipeSynced
                    ? `[레시피 ${linkedRecipe.productCode}] PK입수 ${fmtQty(autoPkQuantityEa)}ea 일치`
                    : `[${matchedDb.catLabel} 탭] ${row.productName} = ${fmtQty(autoPkQuantityEa)}ea`,
                }
              : null;

            const tipBatchMaterial = matchedDb
              ? {
                  title: isMatCostRecipeSynced
                    ? `원재료비용 (레시피 탭 동기화됨)`
                    : `원재료비용 (${matchedDb.catLabel} DB 값)`,
                  formula: '레시피 탭 [원재료비용(배합 재료원가 + 총 포장가)] 연동',
                  calc: isMatCostRecipeSynced
                    ? `[레시피 ${linkedRecipe.productCode}] ${linkedRecipe.productName} = ${fmtInt(autoBatchMaterialCost)}원`
                    : autoBatchMaterialCost > 0
                      ? `현재 입력값 ${fmtInt(autoBatchMaterialCost)}원 (상단 [🔗 레시피 탭 원가 연동] 클릭 시 최신화)`
                      : '레시피 탭과 품목코드를 맞추고 [🔗 레시피 탭 원가 연동]을 눌러주세요.',
                }
              : null;

            const pkMaterialCost =
              !matchedDb ||
              autoBatchMaterialCost === '' ||
              autoBatchMaterialCost === null ||
              autoBatchPkCount === '' ||
              autoBatchPkCount === null ||
              autoBatchPkCount === 0
                ? null
                : Math.round(autoBatchMaterialCost / autoBatchPkCount + Number.EPSILON);

            const matchedPartObj = settings.partAllocations.find((p) => {
              if (!matchedDb) return false;
              if (matchedDb.catKey === 'PIE') return p.name.includes('파이');
              if (matchedDb.catKey === 'DOUGH') return p.name.includes('알생지');
              if (matchedDb.catKey === 'PARBAKE') return p.name.includes('파베이크');
              if (matchedDb.catKey === 'BAKERY') return p.name.includes('제과');
              return false;
            });
            const partLaborFactor =
              matchedPartObj && Number(matchedPartObj.laborFactor) > 0
                ? Number(matchedPartObj.laborFactor)
                : 1;

            const pkLaborCost =
              !matchedDb ||
              autoBatchLaborCost === '' ||
              autoBatchLaborCost === null ||
              autoBatchPkCount === '' ||
              autoBatchPkCount === null ||
              autoBatchPkCount === 0
                ? null
                : Math.round((autoBatchLaborCost / autoBatchPkCount) * partLaborFactor + Number.EPSILON);

            const releasePriceEa = Number(row.releasePriceEa) || 0;

            const pkFixedCost =
              !matchedDb ||
              releasePriceEa <= 0 ||
              autoPkQuantityEa === '' ||
              autoPkQuantityEa === null ||
              autoPkQuantityEa === 0 ||
              fixedCostRatioDecimal <= 0
                ? null
                : Math.round(releasePriceEa * autoPkQuantityEa * fixedCostRatioDecimal + Number.EPSILON);

            const pkTotalProductionCost =
              pkMaterialCost === null || pkLaborCost === null || pkFixedCost === null
                ? null
                : pkMaterialCost + pkLaborCost + pkFixedCost;

            const eaTotalProductionCost =
              pkTotalProductionCost === null ||
              autoPkQuantityEa === '' ||
              autoPkQuantityEa === null ||
              autoPkQuantityEa === 0
                ? null
                : Math.round(pkTotalProductionCost / autoPkQuantityEa + Number.EPSILON);

            const prodCostRatio =
              eaTotalProductionCost === null || releasePriceEa <= 0
                ? null
                : eaTotalProductionCost / releasePriceEa;

            const prodCostRatioPercent = prodCostRatio !== null ? prodCostRatio * 100 : null;
            const getProdCostRatioStyle = (pct) => {
              if (pct === null) return { colorClass: 'text-slate-900', bgClass: 'bg-white' };
              if (pct > 95) return { colorClass: 'text-red-900', bgClass: 'bg-red-200/90' };
              if (pct > 90) return { colorClass: 'text-red-700', bgClass: 'bg-red-100/90' };
              if (pct >= 85) return { colorClass: 'text-rose-700', bgClass: 'bg-rose-100/80' };
              if (pct >= 80) return { colorClass: 'text-pink-700', bgClass: 'bg-pink-100/75' };
              if (pct >= 75) return { colorClass: 'text-pink-600', bgClass: 'bg-pink-50/70' };
              return { colorClass: 'text-slate-900', bgClass: 'bg-white' };
            };
            const prodCostStyle = getProdCostRatioStyle(prodCostRatioPercent);

            const materialRatio =
              pkTotalProductionCost === null ||
              pkMaterialCost === null ||
              !autoPkQuantityEa ||
              releasePriceEa <= 0
                ? null
                : pkMaterialCost / autoPkQuantityEa / releasePriceEa;

            const materialRatioPercent = materialRatio !== null ? materialRatio * 100 : null;
            const getMaterialRatioStyle = (pct) => {
              if (pct === null) return { colorClass: 'text-slate-700', bgClass: 'bg-white' };
              if (pct >= 50) return { colorClass: 'text-red-800', bgClass: 'bg-red-200/85' };
              if (pct >= 45) return { colorClass: 'text-rose-700', bgClass: 'bg-rose-100/85' };
              if (pct >= 40) return { colorClass: 'text-orange-800', bgClass: 'bg-orange-100/80' };
              if (pct >= 35) return { colorClass: 'text-amber-800', bgClass: 'bg-amber-100/75' };
              if (pct >= 30) return { colorClass: 'text-amber-700', bgClass: 'bg-amber-50/80' };
              return { colorClass: 'text-slate-700', bgClass: 'bg-white' };
            };
            const materialRatioStyle = getMaterialRatioStyle(materialRatioPercent);

            const laborRatio =
              pkTotalProductionCost === null ||
              pkLaborCost === null ||
              !autoPkQuantityEa ||
              releasePriceEa <= 0
                ? null
                : pkLaborCost / autoPkQuantityEa / releasePriceEa;

            const fixedRatio =
              pkTotalProductionCost === null ||
              pkFixedCost === null ||
              !autoPkQuantityEa ||
              releasePriceEa <= 0
                ? null
                : pkFixedCost / autoPkQuantityEa / releasePriceEa;

            const expectedMarginEa =
              eaTotalProductionCost === null || releasePriceEa <= 0
                ? null
                : releasePriceEa - eaTotalProductionCost;

            const expectedMarginRate = prodCostRatio === null ? null : 1 - prodCostRatio;

            const laborToMarginRatio =
              pkTotalProductionCost === null ||
              pkLaborCost === null ||
              !autoPkQuantityEa ||
              expectedMarginEa === null ||
              expectedMarginEa <= 0
                ? null
                : pkLaborCost / autoPkQuantityEa / expectedMarginEa;

            const storeBuyPriceAuto =
              releasePriceEa <= 0
                ? null
                : Math.round(releasePriceEa * storeFeeMul * 1.1 + Number.EPSILON);

            const gontranPriceEa = Number(row.gontranPriceEa) || 0;

            const storeCostRatio =
              storeBuyPriceAuto === null ||
              storeBuyPriceAuto === '' ||
              row.gontranPriceEa === '' ||
              row.gontranPriceEa === null ||
              gontranPriceEa === 0
                ? null
                : storeBuyPriceAuto / gontranPriceEa;

            const tipBatchPk = matchedDb
              ? {
                  title: '1배합 → PK수 (DB 연동)',
                  formula: 'ROUND(1배합 실생산(ea) ÷ PK입수량(ea), 1)',
                  calc: `${fmtQty(matchedDb.batchOutputEa)}ea ÷ ${fmtQty(autoPkQuantityEa)}ea = ${fmtDec(autoBatchPkCount, 1)} PK`,
                }
              : null;

            const tipBatchLabor = matchedDb
              ? {
                  title: '1배합 인건비 (공정DB 자동합산)',
                  formula: '1공정 + 2공정 + 3공정 인건비 합계',
                  calc: `[${matchedDb.catLabel} 탭] ${row.productName} = ${fmtInt(autoBatchLaborCost)}원`,
                }
              : null;

            const tipPkMaterial = {
              title: 'PK당 원재료 (H열)',
              formula: 'ROUND(원재료비용(1배합, F) ÷ 1배합→PK수(E), 0)',
              calc:
                pkMaterialCost !== null
                  ? `${fmtInt(autoBatchMaterialCost)}원 ÷ ${fmtDec(autoBatchPkCount, 1)}PK = ${fmtInt(pkMaterialCost)}원`
                  : '원재료비용(1배합) 또는 PK수 값이 없습니다.',
            };

            const tipPkLabor = {
              title: 'PK당 인건비 (I열)',
              formula: 'ROUND(1배합 인건비(G) ÷ 1배합→PK수(E) × 파트 보정계수, 0)',
              calc:
                pkLaborCost !== null
                  ? `${fmtInt(autoBatchLaborCost)}원 ÷ ${fmtDec(autoBatchPkCount, 1)}PK × ${partLaborFactor}(${matchedPartObj?.name || '기본'}) = ${fmtInt(pkLaborCost)}원`
                  : '인건비 또는 PK수 값이 없습니다.',
            };

            const tipPkFixed = {
              title: 'PK당 고정비 (J열)',
              formula: 'ROUND(바로가 출고가(M) × PK입수량(D) × 고정비 비율, 0)',
              calc:
                pkFixedCost !== null
                  ? `${fmtInt(releasePriceEa)}원 × ${fmtQty(autoPkQuantityEa)}ea × ${calc.fixedCostRatioPercent.toFixed(2)}% = ${fmtInt(pkFixedCost)}원`
                  : '바로가 출고가(1ea)를 입력하면 자동 계산됩니다.',
            };

            const tipPkTotal = {
              title: 'PK 총생산원가 (K열)',
              formula: 'PK당 원재료(H) + PK당 인건비(I) + PK당 고정비(J)',
              calc:
                pkTotalProductionCost !== null
                  ? `${fmtInt(pkMaterialCost)} + ${fmtInt(pkLaborCost)} + ${fmtInt(pkFixedCost)} = ${fmtInt(pkTotalProductionCost)}원`
                  : '원재료·인건비·고정비 중 미산출 항목이 있습니다 (출고가 입력 필요).',
            };

            const tipEaTotal = {
              title: '총생산원가 (1ea, 원) (L열)',
              formula: 'ROUND(PK 총생산원가(K) ÷ PK입수량(D), 0)',
              calc:
                eaTotalProductionCost !== null
                  ? `${fmtInt(pkTotalProductionCost)}원 ÷ ${fmtQty(autoPkQuantityEa)}ea = ${fmtInt(eaTotalProductionCost)}원`
                  : 'PK 총생산원가가 산출되면 자동 계산됩니다.',
            };

            const tipProdCostRatio = {
              title: '생산원가비율 (N열)',
              formula: '총생산원가(1ea, L) ÷ 바로가 출고가(M)',
              calc:
                prodCostRatio !== null
                  ? `${fmtInt(eaTotalProductionCost)}원 ÷ ${fmtInt(releasePriceEa)}원 = ${(prodCostRatio * 100).toFixed(1)}%`
                  : '바로가 출고가(1ea)를 입력하면 자동 계산됩니다.',
            };

            const tipMaterialRatio = {
              title: '원재료 비율 (O열)',
              formula: 'PK당 원재료(H) ÷ PK입수량(D) ÷ 바로가 출고가(M)',
              calc:
                materialRatio !== null
                  ? `(${fmtInt(pkMaterialCost)}원 ÷ ${fmtQty(autoPkQuantityEa)}ea) ÷ ${fmtInt(releasePriceEa)}원 = ${(materialRatio * 100).toFixed(1)}%`
                  : '출고가 입력 시 계산됩니다.',
            };

            const tipLaborRatio = {
              title: '인건비 비율 (P열)',
              formula: 'PK당 인건비(I) ÷ PK입수량(D) ÷ 바로가 출고가(M)',
              calc:
                laborRatio !== null
                  ? `(${fmtInt(pkLaborCost)}원 ÷ ${fmtQty(autoPkQuantityEa)}ea) ÷ ${fmtInt(releasePriceEa)}원 = ${(laborRatio * 100).toFixed(1)}%`
                  : '출고가 입력 시 계산됩니다.',
            };

            const tipFixedRatio = {
              title: '고정비 비율 (Q열)',
              formula: 'PK당 고정비(J) ÷ PK입수량(D) ÷ 바로가 출고가(M)',
              calc:
                fixedRatio !== null
                  ? `(${fmtInt(pkFixedCost)}원 ÷ ${fmtQty(autoPkQuantityEa)}ea) ÷ ${fmtInt(releasePriceEa)}원 = ${(fixedRatio * 100).toFixed(1)}%`
                  : '출고가 입력 시 계산됩니다.',
            };

            const tipExpectedMargin = {
              title: '예상마진 (1ea,원) (R열)',
              formula: '바로가 출고가(M) - 1ea 총생산원가(L)',
              calc:
                expectedMarginEa !== null
                  ? `${fmtInt(releasePriceEa)}원 - ${fmtInt(eaTotalProductionCost)}원 = ${fmtInt(expectedMarginEa)}원`
                  : '출고가 입력 시 계산됩니다.',
            };

            const tipExpectedMarginRate = {
              title: '예상 마진율 (S열)',
              formula: '100% - 생산원가 비율(N)',
              calc:
                expectedMarginRate !== null
                  ? `100% - ${(prodCostRatio * 100).toFixed(1)}% = ${(expectedMarginRate * 100).toFixed(1)}%`
                  : '출고가 입력 시 계산됩니다.',
            };

            const tipLaborToMargin = {
              title: '인건비/마진 (1ea) (T열)',
              formula: '=IF(OR(K13="",I13="",D13="",D13=0,R13="",R13<=0),"",(I13/D13)/R13)',
              calc:
                laborToMarginRatio !== null
                  ? `(${fmtInt(pkLaborCost)}원 ÷ ${fmtQty(autoPkQuantityEa)}ea) ÷ ${fmtInt(expectedMarginEa)}원 = ${(laborToMarginRatio * 100).toFixed(1)}%`
                  : expectedMarginEa !== null && expectedMarginEa <= 0
                    ? `예상마진(R13=${fmtInt(expectedMarginEa)}원) ≤ 0 이므로 공란("") 처리`
                    : '출고가 입력 시 계산됩니다.',
            };

            const tipStoreBuyPrice = {
              title: '매장매입가 (1ea, VAT포함) (U열)',
              formula: `ROUND(바로가 출고가(M) × ${storeFeeMul.toFixed(4)}(수수료 ${storeFeeRatePct}%) × 1.1(VAT), 0)`,
              calc:
                storeBuyPriceAuto !== null
                  ? `${fmtInt(releasePriceEa)}원 × ${storeFeeMul.toFixed(4)} × 1.1 = ${fmtInt(storeBuyPriceAuto)}원`
                  : '바로가 출고가(1ea) 입력 시 자동 계산됩니다.',
            };

            const tipStoreCostRatio = {
              title: '매입원가비율 (W열)',
              formula: '매장매입가(U) ÷ 곤트란 판매가(V)',
              calc:
                storeCostRatio !== null
                  ? `${fmtInt(storeBuyPriceAuto)}원 ÷ ${fmtInt(gontranPriceEa)}원 = ${(storeCostRatio * 100).toFixed(2)}%`
                  : '출고가와 곤트란 판매가를 입력하면 자동 계산됩니다.',
            };

            tableBodyElements.push(
              React.createElement("tr", { key: row.id, className: "border-b border-slate-200 hover:bg-slate-50/90 transition-colors text-[11.5px]" }, React.createElement("td", { onMouseEnter: (e) => showFormulaTooltip(e, tipRecipeCode), onMouseLeave: hideFormulaTooltip, className: `relative py-1 px-0.5 text-center border-r border-slate-200 whitespace-nowrap ${
                    linkedRecipe ? 'bg-emerald-50/70' : 'bg-amber-50/35'
                  }` }, linkedRecipe && (
                      React.createElement("span", { className: "w-1 h-1 rounded-full bg-emerald-500 absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none" })
                    ), React.createElement("input", { type: "text", value: effectiveCode, placeholder: String(rowNumber), onChange: (e) =>
                        handleUpdateUnifiedProductCode(row.id, matchedDb, e.target.value), className: `w-full min-w-0 text-center font-mono text-[10.5px] bg-transparent focus:outline-none focus:bg-white focus:ring-1 focus:ring-amber-500 rounded py-0.5 tabular-nums ${
                        linkedRecipe ? 'pl-1.5 pr-0' : 'px-0'
                      } ${
                        effectiveCode
                          ? linkedRecipe
                            ? 'font-extrabold text-emerald-800'
                            : 'font-extrabold text-amber-900'
                          : 'font-normal text-slate-400'
                      }` })), React.createElement("td", { className: "py-1 px-1 border-r border-slate-200 bg-white" }, React.createElement("select", { value: row.productName, onChange: (e) => handleUpdatePkRow(row.id, 'productName', e.target.value), className: "w-full bg-transparent text-[11px] font-normal text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-0 py-0.5 truncate" }, !matchedDb && (
                      React.createElement("option", { value: row.productName }, row.productName, " (DB 미등록)")
                    ), Object.keys(PROCESS_CATEGORIES).map((catKey) => {
                      const catLabel = PROCESS_CATEGORIES[catKey].label;
                      const list = computedCategoryDbs[catKey] || [];
                      if (list.length === 0) return null;
                      return (
                        React.createElement("optgroup", { key: catKey, label: `── ${catLabel} ──` }, list.map(({ product }) => (
                            React.createElement("option", { key: product.id, value: product.productName }, product.productName)
                          )))
                      );
                    }))), React.createElement("td", { onMouseEnter: (e) => showFormulaTooltip(e, tipPkQuantityEa), onMouseLeave: hideFormulaTooltip, className: "py-1.5 px-1 text-right text-[12px] font-normal text-slate-900 bg-white border-r border-slate-200 tabular-nums whitespace-nowrap cursor-help hover:bg-slate-50" }, matchedDb ? React.createElement(SyncedVal, { synced: Boolean(matchedDb && autoPkQuantityEa > 0) }, fmtQty(autoPkQuantityEa)) : ''), React.createElement("td", { onMouseEnter: (e) => showFormulaTooltip(e, tipBatchPk), onMouseLeave: hideFormulaTooltip, className: "py-1.5 px-1 text-right text-[12px] font-normal text-slate-900 bg-white border-r border-slate-200 tabular-nums whitespace-nowrap cursor-help hover:bg-slate-50" }, matchedDb ? React.createElement(SyncedVal, { synced: isBatchPkSynced }, fmtDec(autoBatchPkCount, 1)) : ''), React.createElement("td", { onMouseEnter: (e) => showFormulaTooltip(e, tipBatchMaterial), onMouseLeave: hideFormulaTooltip, className: "py-1.5 px-1 text-right text-[12px] font-normal text-slate-900 bg-white border-r border-slate-200 tabular-nums whitespace-nowrap cursor-help hover:bg-slate-50" }, matchedDb ? React.createElement(SyncedVal, { synced: isMatCostRecipeSynced }, fmtInt(autoBatchMaterialCost)) : ''), React.createElement("td", { onMouseEnter: (e) => showFormulaTooltip(e, tipBatchLabor), onMouseLeave: hideFormulaTooltip, className: "py-1.5 px-1 text-right text-[12px] font-normal text-slate-900 bg-white border-r border-slate-200 tabular-nums whitespace-nowrap cursor-help hover:bg-slate-50" }, matchedDb ? React.createElement(SyncedVal, { synced: isLaborDbSynced }, fmtInt(autoBatchLaborCost)) : ''), React.createElement("td", { onMouseEnter: (e) => showFormulaTooltip(e, tipPkMaterial), onMouseLeave: hideFormulaTooltip, className: "py-1.5 px-1 text-right text-[12px] font-normal text-slate-800 bg-white border-r border-slate-200 tabular-nums whitespace-nowrap cursor-help hover:bg-slate-50" }, pkMaterialCost !== null ? fmtInt(pkMaterialCost) : ''), React.createElement("td", { onMouseEnter: (e) => showFormulaTooltip(e, tipPkLabor), onMouseLeave: hideFormulaTooltip, className: "py-1.5 px-1 text-right text-[12px] font-normal text-slate-800 bg-white border-r border-slate-200 tabular-nums whitespace-nowrap cursor-help hover:bg-slate-50" }, pkLaborCost !== null ? fmtInt(pkLaborCost) : ''), React.createElement("td", { onMouseEnter: (e) => showFormulaTooltip(e, tipPkFixed), onMouseLeave: hideFormulaTooltip, className: "py-1.5 px-1 text-right text-[12px] font-normal text-slate-800 bg-white border-r border-slate-200 tabular-nums whitespace-nowrap cursor-help hover:bg-slate-50" }, pkFixedCost !== null ? fmtInt(pkFixedCost) : ''), React.createElement("td", { onMouseEnter: (e) => showFormulaTooltip(e, tipPkTotal), onMouseLeave: hideFormulaTooltip, className: "py-1.5 px-1 text-right text-[12px] font-normal text-slate-900 bg-white border-r border-slate-200 tabular-nums whitespace-nowrap cursor-help hover:bg-slate-50" }, pkTotalProductionCost !== null ? fmtInt(pkTotalProductionCost) : ''), React.createElement("td", { onMouseEnter: (e) => showFormulaTooltip(e, tipEaTotal), onMouseLeave: hideFormulaTooltip, className: "py-1.5 px-1 text-right text-[12px] font-normal text-slate-900 bg-white border-r border-slate-200 tabular-nums whitespace-nowrap cursor-help hover:bg-slate-50" }, eaTotalProductionCost !== null ? fmtInt(eaTotalProductionCost) : ''), React.createElement("td", { className: "py-1 px-0.5 bg-slate-100/90 hover:bg-slate-200/70 transition-colors border-r border-slate-200" }, React.createElement(CommaNumberInput, { value: row.releasePriceEa === 0 ? '' : row.releasePriceEa, allowEmpty: true, placeholder: "입력", onChangeValue: (val) =>
                      handleUpdatePkRow(row.id, 'releasePriceEa', val === '' ? 0 : val), className: "w-full text-right text-[12px] font-bold text-blue-700 bg-transparent focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-0.5 py-0.5 tabular-nums" })), React.createElement("td", { onMouseEnter: (e) => showFormulaTooltip(e, tipProdCostRatio), onMouseLeave: hideFormulaTooltip, className: `py-1.5 px-1 text-right text-[12px] font-normal ${prodCostStyle.colorClass} ${prodCostStyle.bgClass} border-r border-slate-200 tabular-nums whitespace-nowrap cursor-help hover:brightness-95 transition-all` }, prodCostRatio !== null ? `${(prodCostRatio * 100).toFixed(1)}%` : ''), React.createElement("td", { onMouseEnter: (e) => showFormulaTooltip(e, tipMaterialRatio), onMouseLeave: hideFormulaTooltip, className: `py-1.5 px-1 text-right text-[12px] font-normal ${materialRatioStyle.colorClass} ${materialRatioStyle.bgClass} border-r border-slate-200 tabular-nums whitespace-nowrap cursor-help hover:brightness-95 transition-all` }, materialRatio !== null ? `${(materialRatio * 100).toFixed(1)}%` : ''), React.createElement("td", { onMouseEnter: (e) => showFormulaTooltip(e, tipLaborRatio), onMouseLeave: hideFormulaTooltip, className: "py-1.5 px-1 text-right text-[12px] font-normal text-slate-700 bg-white border-r border-slate-200 tabular-nums whitespace-nowrap cursor-help hover:bg-slate-50" }, laborRatio !== null ? `${(laborRatio * 100).toFixed(1)}%` : ''), React.createElement("td", { onMouseEnter: (e) => showFormulaTooltip(e, tipFixedRatio), onMouseLeave: hideFormulaTooltip, className: "py-1.5 px-1 text-right text-[12px] font-normal text-slate-700 bg-white border-r border-slate-200 tabular-nums whitespace-nowrap cursor-help hover:bg-slate-50" }, fixedRatio !== null ? `${(fixedRatio * 100).toFixed(1)}%` : ''), React.createElement("td", { onMouseEnter: (e) => showFormulaTooltip(e, tipExpectedMargin), onMouseLeave: hideFormulaTooltip, className: `py-1.5 px-1 text-right text-[12px] font-normal bg-white border-r border-slate-200 tabular-nums whitespace-nowrap cursor-help hover:bg-slate-50 ${
                    expectedMarginEa !== null && expectedMarginEa < 0
                      ? 'text-rose-600'
                      : 'text-emerald-700'
                  }` }, expectedMarginEa !== null ? fmtInt(expectedMarginEa) : ''), React.createElement("td", { onMouseEnter: (e) => showFormulaTooltip(e, tipExpectedMarginRate), onMouseLeave: hideFormulaTooltip, className: `py-1.5 px-1 text-right text-[12px] font-normal bg-white border-r border-slate-200 tabular-nums whitespace-nowrap cursor-help hover:bg-slate-50 ${
                    expectedMarginRate !== null && expectedMarginRate < 0
                      ? 'text-rose-600'
                      : 'text-emerald-700'
                  }` }, expectedMarginRate !== null ? `${(expectedMarginRate * 100).toFixed(1)}%` : ''), React.createElement("td", { onMouseEnter: (e) => showFormulaTooltip(e, tipLaborToMargin), onMouseLeave: hideFormulaTooltip, className: "py-1.5 px-1 text-right text-[12px] font-normal text-slate-700 bg-white border-r border-slate-200 tabular-nums whitespace-nowrap cursor-help hover:bg-slate-50" }, laborToMarginRatio !== null ? `${(laborToMarginRatio * 100).toFixed(1)}%` : ''), React.createElement("td", { onMouseEnter: (e) => showFormulaTooltip(e, tipStoreBuyPrice), onMouseLeave: hideFormulaTooltip, className: "py-1.5 px-1 text-right text-[12px] font-bold text-slate-900 bg-white border-r border-slate-200 tabular-nums whitespace-nowrap cursor-help hover:bg-slate-50" }, storeBuyPriceAuto !== null ? fmtInt(storeBuyPriceAuto) : ''), React.createElement("td", { className: "py-1 px-0.5 bg-white border-r border-slate-200" }, React.createElement(CommaNumberInput, { value: row.gontranPriceEa === 0 ? '' : row.gontranPriceEa, allowEmpty: true, placeholder: "입력", onChangeValue: (val) =>
                      handleUpdatePkRow(row.id, 'gontranPriceEa', val === '' ? 0 : val), className: "w-full text-right text-[12px] font-bold text-blue-700 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-0.5 py-0.5 tabular-nums" })), React.createElement("td", { onMouseEnter: (e) => showFormulaTooltip(e, tipStoreCostRatio), onMouseLeave: hideFormulaTooltip, className: "py-1.5 px-1 text-right text-[12px] font-normal text-slate-900 bg-white border-r border-slate-200 tabular-nums whitespace-nowrap cursor-help hover:bg-slate-50" }, storeCostRatio !== null ? `${(storeCostRatio * 100).toFixed(2)}%` : ''), React.createElement("td", { className: "py-1 px-1 bg-white" }, React.createElement("input", { type: "text", value: row.note || '', onChange: (e) => handleUpdatePkRow(row.id, 'note', e.target.value), placeholder: "메모", className: "w-full text-[11px] font-bold text-slate-900 bg-transparent focus:outline-none focus:ring-1 focus:ring-slate-400 rounded px-0.5 py-0.5" })))
            );
          });
        });

        return (
          React.createElement("div", { className: "space-y-3" }, React.createElement("div", { className: "bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex flex-wrap items-center justify-between gap-3" }, React.createElement("div", { className: "flex flex-wrap items-center gap-3" }, React.createElement("span", { className: "text-sm font-extrabold text-slate-800" }, "■ 제품별 1배합 기준 생산원가 분석"), React.createElement("span", { onMouseEnter: (e) =>
                    showFormulaTooltip(e, {
                      title: '고정비 비율',
                      formula: '월 고정비 합계 ÷ 예상 월 매출',
                      calc: `${fmtInt(calc.totalMonthlyFixedCost)}원 ÷ ${fmtInt(settings.expectedTotalMonthlySales)}원 = ${calc.fixedCostRatioPercent.toFixed(4)}%`,
                    }), onMouseLeave: hideFormulaTooltip, className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 text-xs font-bold text-slate-700 cursor-help" }, React.createElement("span", null, "고정비 비율:"), React.createElement("span", { className: "text-blue-700 text-sm font-extrabold tabular-nums" }, calc.fixedCostRatioPercent.toFixed(4), "%")), React.createElement("span", { className: "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 border border-amber-200 text-xs font-bold text-amber-800" }, React.createElement("span", null, "가동률 보정계수:"), React.createElement("span", { className: "text-[13px] font-extrabold tabular-nums" }, settings.partAllocations
                      .map((p) => `${p.name} ${p.laborFactor}`)
                      .join(' · '))), React.createElement("span", { className: "inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600" }, React.createElement("span", { className: "w-1 h-1 rounded-full bg-emerald-500 inline-block" }), "타 탭(레시피·공정DB) 동기화 완료 · 셀에 마우스를 올리면 수식 표시")), React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, React.createElement("button", { type: "button", onClick: () => handleSyncMaterialCostsFromRecipeTab(null), title: "품목코드(1순위) 또는 품목명(2순위)이 일치하는 레시피 탭의 원재료비용·생산수량·PK입수량을 일괄 연동합니다", className: "px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold shadow-sm transition cursor-pointer" }, "🔗 레시피 탭 원가 연동"), React.createElement("button", { type: "button", onClick: handleSortAllByProductCode, title: "각 파트 내에서 품목코드 오름차순(1001→1002...)으로 정렬합니다", className: "px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold shadow-sm transition cursor-pointer" }, "🔢 품목코드순 정렬"), React.createElement("button", { type: "button", onClick: handleExportProductPriceExcel, title: "PK단위 원가표 · 엠즈 매입/판매가 · 공정별 인건비 DB · 기본설정 전체 시트를 엑셀(.xlsx)로 다운로드합니다", className: "px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold shadow-sm transition cursor-pointer" }, "📥 엑셀 다운로드"), React.createElement("button", { type: "button", onClick: handleAddPkRow, className: "px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold shadow-sm transition" }, "+ 품목 행 추가"))), React.createElement("div", { className: "bg-white rounded-xl border border-slate-300 shadow-sm overflow-auto max-h-[calc(100vh-145px)] relative" }, React.createElement("table", { className: "w-full min-w-[1320px] border-collapse table-fixed" }, React.createElement("colgroup", null, React.createElement("col", { style: { width: '2.715%' } }), React.createElement("col", { style: { width: '11.463%' } }), React.createElement("col", { style: { width: '3.017%' } }), React.createElement("col", { style: { width: '3.620%' } }), React.createElement("col", { style: { width: '5.732%' } }), React.createElement("col", { style: { width: '4.977%' } }), React.createElement("col", { style: { width: '4.374%' } }), React.createElement("col", { style: { width: '4.374%' } }), React.createElement("col", { style: { width: '4.374%' } }), React.createElement("col", { style: { width: '4.374%' } }), React.createElement("col", { style: { width: '4.223%' } }), React.createElement("col", { style: { width: '4.676%' } }), React.createElement("col", { style: { width: '3.771%' } }), React.createElement("col", { style: { width: '3.469%' } }), React.createElement("col", { style: { width: '3.469%' } }), React.createElement("col", { style: { width: '3.469%' } }), React.createElement("col", { style: { width: '3.620%' } }), React.createElement("col", { style: { width: '3.620%' } }), React.createElement("col", { style: { width: '4.374%' } }), React.createElement("col", { style: { width: '4.525%' } }), React.createElement("col", { style: { width: '4.676%' } }), React.createElement("col", { style: { width: '3.771%' } }), React.createElement("col", { style: { width: '3.318%' } })), React.createElement("thead", { className: "sticky top-0 z-20 shadow-md" }, React.createElement("tr", { className: "text-white text-[10.5px] font-extrabold h-7" }, React.createElement("th", { rowSpan: 2, className: "bg-slate-800 py-1 px-0.5 text-center border-r border-b border-slate-600 leading-tight whitespace-nowrap", title: "레시피 탭의 품목코드와 동일하게 입력하면 원가가 1:1 자동 연동됩니다" }, React.createElement("div", null, "품목"), React.createElement("div", null, "코드")), React.createElement("th", { rowSpan: 2, className: "bg-slate-800 py-1.5 px-1.5 text-center border-r border-b border-slate-600" }, "제품명"), React.createElement("th", { colSpan: 3, className: "bg-orange-600 py-1 px-1 text-center border-r border-b border-slate-500 whitespace-nowrap" }, "◀ 1배합 기준 입력 ▶"), React.createElement("th", { colSpan: 5, className: "bg-slate-700 py-1 px-1 text-center border-r border-b border-slate-500 whitespace-nowrap" }, "◀ PK당 생산원가 ▶"), React.createElement("th", { colSpan: 3, className: "bg-red-800 py-1 px-1 text-center border-r border-b border-slate-500 whitespace-nowrap" }, "◀ 1개당 원가 vs 출고가 ▶"), React.createElement("th", { colSpan: 6, className: "bg-emerald-800 py-1 px-1 text-center border-r border-b border-slate-500 whitespace-nowrap" }, "◀ 출고가 대비 비율 · 예상마진 ▶"), React.createElement("th", { colSpan: 3, className: "bg-green-900 py-1 px-1 text-center border-r border-b border-slate-500 whitespace-nowrap" }, "◀ 곤트란 매장 마진 ▶"), React.createElement("th", { rowSpan: 2, className: "bg-slate-800 py-1.5 px-1 text-center border-b border-slate-600" }, "비고")), React.createElement("tr", { className: "bg-slate-700 text-white text-[10px] font-bold leading-tight tracking-tight" }, React.createElement("th", { className: "bg-slate-700 py-1.5 px-0.5 text-center border-r border-b border-slate-500 whitespace-nowrap" }, React.createElement("div", null, "PK입수"), React.createElement("div", { className: "text-[9px] font-normal text-slate-300" }, "(ea)")), React.createElement("th", { className: "bg-slate-700 py-1.5 px-0.5 text-center border-r border-b border-slate-500 whitespace-nowrap" }, React.createElement("div", null, "1배합"), React.createElement("div", { className: "text-[9px] font-normal text-slate-300" }, "→PK수")), React.createElement("th", { className: "bg-slate-700 py-1.5 px-0.5 text-center border-r border-b border-slate-500 whitespace-nowrap" }, React.createElement("div", null, "원재료비용"), React.createElement("div", { className: "text-[9px] font-normal text-slate-300" }, "(1배합,원)")), React.createElement("th", { className: "bg-slate-700 py-1.5 px-0.5 text-center border-r border-b border-slate-500 whitespace-nowrap" }, React.createElement("div", null, "1배합인건비"), React.createElement("div", { className: "text-[9px] font-normal text-slate-300" }, "(원)")), React.createElement("th", { className: "bg-slate-700 py-1.5 px-0.5 text-center border-r border-b border-slate-500 whitespace-nowrap" }, React.createElement("div", null, "PK당원재료"), React.createElement("div", { className: "text-[9px] font-normal text-slate-300" }, "(원)")), React.createElement("th", { className: "bg-slate-700 py-1.5 px-0.5 text-center border-r border-b border-slate-500 whitespace-nowrap" }, React.createElement("div", null, "PK당인건비"), React.createElement("div", { className: "text-[9px] font-normal text-slate-300" }, "(원)")), React.createElement("th", { className: "bg-slate-700 py-1.5 px-0.5 text-center border-r border-b border-slate-500 whitespace-nowrap" }, React.createElement("div", null, "PK당고정비"), React.createElement("div", { className: "text-[9px] font-normal text-slate-300" }, "(원)")), React.createElement("th", { className: "bg-slate-700 py-1.5 px-0.5 text-center border-r border-b border-slate-500 whitespace-nowrap" }, React.createElement("div", null, "PK총원가"), React.createElement("div", { className: "text-[9px] font-normal text-slate-300" }, "(원)")), React.createElement("th", { className: "bg-slate-700 py-1.5 px-0.5 text-center border-r border-b border-slate-500 whitespace-nowrap" }, React.createElement("div", null, "총생산원가"), React.createElement("div", { className: "text-[9px] font-normal text-slate-300" }, "(1ea,원)")), React.createElement("th", { className: "bg-slate-700 py-1.5 px-0.5 text-center border-r border-b border-slate-500 whitespace-nowrap" }, React.createElement("div", null, "바로가출고가"), React.createElement("div", { className: "text-[9px] font-normal text-slate-300" }, "(1ea,원)")), React.createElement("th", { className: "bg-slate-700 py-1.5 px-0.5 text-center border-r border-b border-slate-500 whitespace-nowrap" }, React.createElement("div", null, "생산원가"), React.createElement("div", { className: "text-[9px] font-normal text-slate-300" }, "비율")), React.createElement("th", { className: "bg-slate-700 py-1.5 px-0.5 text-center border-r border-b border-slate-500 whitespace-nowrap" }, React.createElement("div", null, "원재료"), React.createElement("div", { className: "text-[9px] font-normal text-slate-300" }, "비율")), React.createElement("th", { className: "bg-slate-700 py-1.5 px-0.5 text-center border-r border-b border-slate-500 whitespace-nowrap" }, React.createElement("div", null, "인건비"), React.createElement("div", { className: "text-[9px] font-normal text-slate-300" }, "비율")), React.createElement("th", { className: "bg-slate-700 py-1.5 px-0.5 text-center border-r border-b border-slate-500 whitespace-nowrap" }, React.createElement("div", null, "고정비"), React.createElement("div", { className: "text-[9px] font-normal text-slate-300" }, "비율")), React.createElement("th", { className: "bg-slate-700 py-1.5 px-0.5 text-center border-r border-b border-slate-500 whitespace-nowrap" }, React.createElement("div", null, "예상마진"), React.createElement("div", { className: "text-[9px] font-normal text-slate-300" }, "(1ea,원)")), React.createElement("th", { className: "bg-slate-700 py-1.5 px-0.5 text-center border-r border-b border-slate-500 whitespace-nowrap" }, React.createElement("div", null, "예상"), React.createElement("div", { className: "text-[9px] font-normal text-slate-300" }, "마진율")), React.createElement("th", { className: "bg-slate-700 py-1.5 px-0.5 text-center border-r border-b border-slate-500 whitespace-nowrap" }, React.createElement("div", null, "인건비/마진"), React.createElement("div", { className: "text-[9px] font-normal text-slate-300" }, "(1ea)")), React.createElement("th", { className: "bg-slate-700 py-1.5 px-0.5 text-center border-r border-b border-slate-500 whitespace-nowrap" }, React.createElement("div", null, "매장매입가"), React.createElement("div", { className: "text-[9px] font-normal text-slate-300" }, "(VAT포함)")), React.createElement("th", { className: "bg-slate-700 py-1.5 px-0.5 text-center border-r border-b border-slate-500 whitespace-nowrap" }, React.createElement("div", null, "곤트란판매가"), React.createElement("div", { className: "text-[9px] font-normal text-slate-300" }, "(1ea,원)")), React.createElement("th", { className: "bg-slate-700 py-1.5 px-0.5 text-center border-r border-b border-slate-500 whitespace-nowrap" }, React.createElement("div", null, "매입원가"), React.createElement("div", { className: "text-[9px] font-normal text-slate-300" }, "비율")))), React.createElement("tbody", null, tableBodyElements))))
        );
      };

      // ============================================================================
      // [신규 시트] 엠즈 매입/판매가 렌더링
      // ============================================================================
      const renderMsPriceSheet = () => {
        const sectionOrder = [];
        const groupedBySection = new Map();

        pkCostRows.forEach((row) => {
          const secName = (row.section || '기타').trim() || '기타';
          if (!groupedBySection.has(secName)) {
            groupedBySection.set(secName, []);
            sectionOrder.push(secName);
          }
          groupedBySection.get(secName).push(row);
        });

        const tableRows = [];
        let seq = 0;

        sectionOrder.forEach((secName) => {
          const rows = groupedBySection.get(secName) || [];
          tableRows.push(
            React.createElement("tr", { key: `ms-sec-${secName}`, className: "bg-slate-100 border-y border-slate-300" }, React.createElement("td", { colSpan: 10, className: "py-1.5 px-4 text-center text-xs font-extrabold text-slate-800 tracking-wide" }, "── ", secName, " ──"))
          );

          rows.forEach((row) => {
            seq += 1;
            const matchedDb = laborDbByProductName.findMatch(row);
            const effectiveCode = matchedDb
              ? matchedDb.productCode || normalizeCodeStr(row.productCode)
              : normalizeCodeStr(row.productCode);
            const pkQuantityEa = matchedDb ? Number(matchedDb.pkQuantityEa) || 0 : 0;
            const releasePriceEa = Number(row.releasePriceEa) || 0;
            const releasePricePk =
              releasePriceEa > 0 && pkQuantityEa > 0 ? releasePriceEa * pkQuantityEa : null;

            const msBuyPricePk = Number(row.msBuyPricePk) || 0;
            const msSellPricePk = Number(row.msSellPricePk) || 0;

            const buyPriceErrorRate =
              releasePricePk !== null && releasePricePk > 0 && msBuyPricePk > 0
                ? (msBuyPricePk - releasePricePk) / releasePricePk
                : null;

            const salesFeeRate =
              msBuyPricePk > 0 && msSellPricePk > 0
                ? (msSellPricePk - msBuyPricePk) / msBuyPricePk
                : null;

            const tipReleasePk = {
              title: '바로가 출고가 (pk)',
              formula: '바로가 출고가(ea) × PK입수량(ea)',
              calc:
                releasePricePk !== null
                  ? `${fmtInt(releasePriceEa)}원 × ${fmtQty(pkQuantityEa)}ea = ${fmtInt(releasePricePk)}원`
                  : 'PK단위 원가표에서 바로가 출고가를 입력하면 자동 계산됩니다.',
            };

            const tipBuyError = {
              title: '매입가 오차 (%)',
              formula: '(엠즈 매입가(pk) - 바로가 출고가(pk)) ÷ 바로가 출고가(pk)',
              calc:
                buyPriceErrorRate !== null
                  ? `(${fmtInt(msBuyPricePk)}원 - ${fmtInt(releasePricePk)}원) ÷ ${fmtInt(releasePricePk)}원 = ${(buyPriceErrorRate * 100).toFixed(2)}% (${msBuyPricePk - releasePricePk >= 0 ? '+' : ''}${fmtInt(msBuyPricePk - releasePricePk)}원)`
                  : '바로가 출고가(ea)와 엠즈 매입가(pk)가 모두 입력되면 계산됩니다.',
            };

            const tipSalesFee = {
              title: '판매 수수료 (%)',
              formula: '(엠즈 판매가(pk) - 엠즈 매입가(pk)) ÷ 엠즈 매입가(pk)',
              calc:
                salesFeeRate !== null
                  ? `(${fmtInt(msSellPricePk)}원 - ${fmtInt(msBuyPricePk)}원) ÷ ${fmtInt(msBuyPricePk)}원 = ${(salesFeeRate * 100).toFixed(2)}% (차액 ${fmtInt(msSellPricePk - msBuyPricePk)}원)`
                  : '엠즈 매입가(pk)와 판매가(pk)를 입력하면 자동 계산됩니다.',
            };

            const buyErrorAlert =
              buyPriceErrorRate !== null && Math.abs(buyPriceErrorRate * 100) >= 0.05;

            const msLinkedRecipe = effectiveCode ? liveRecipeLookup.byCode.get(effectiveCode) : null;
            tableRows.push(
              React.createElement("tr", { key: `ms-row-${row.id}`, className: "border-b border-slate-200 hover:bg-slate-50/90 transition-colors" }, React.createElement("td", { className: `relative py-1 px-1 text-center border-r border-slate-200 whitespace-nowrap ${msLinkedRecipe ? 'bg-emerald-50/70' : 'bg-amber-50/35'}` }, msLinkedRecipe && React.createElement("span", { className: "w-1 h-1 rounded-full bg-emerald-500 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none" }), React.createElement("input", { type: "text", value: effectiveCode, placeholder: String(seq), onChange: (e) =>
                      handleUpdateUnifiedProductCode(row.id, matchedDb, e.target.value), className: `w-full min-w-0 text-center font-mono text-xs bg-transparent focus:outline-none focus:bg-white focus:ring-1 focus:ring-amber-500 rounded px-0.5 py-0.5 tabular-nums ${
                      effectiveCode ? (msLinkedRecipe ? 'font-extrabold text-emerald-800' : 'font-extrabold text-amber-900') : 'font-normal text-slate-400'
                    }` })), React.createElement("td", { className: "py-1.5 px-2 text-left text-xs font-normal text-slate-900 bg-white border-r border-slate-200 truncate" }, React.createElement("span", { className: "inline-flex items-center gap-1.5 max-w-full" }, matchedDb && React.createElement("span", { className: "w-1 h-1 rounded-full bg-emerald-500 shrink-0", title: "PK단위 원가표 및 공정DB 연동됨" }), React.createElement("span", { className: "truncate" }, row.productName))), React.createElement("td", { className: "py-1.5 px-2 text-right text-[13.5px] font-normal text-slate-900 bg-white border-r border-slate-200 tabular-nums" }, pkQuantityEa > 0 ? React.createElement(SyncedVal, { synced: true }, fmtQty(pkQuantityEa)) : ''), React.createElement("td", { className: "py-1.5 px-2 text-right text-[13.5px] font-normal text-slate-900 bg-white border-r border-slate-200 tabular-nums" }, releasePriceEa > 0 ? React.createElement(SyncedVal, { synced: true }, fmtInt(releasePriceEa)) : ''), React.createElement("td", { onMouseEnter: (e) => showFormulaTooltip(e, tipReleasePk), onMouseLeave: hideFormulaTooltip, className: "py-1.5 px-2 text-right text-[13.5px] font-normal text-slate-900 bg-white border-r border-slate-200 tabular-nums cursor-help hover:bg-slate-50" }, releasePricePk !== null ? fmtInt(releasePricePk) : ''), React.createElement("td", { className: "py-1 px-1.5 bg-slate-100/80 hover:bg-slate-200/60 border-r border-slate-200 transition-colors" }, React.createElement(CommaNumberInput, { value: !row.msBuyPricePk ? '' : row.msBuyPricePk, allowEmpty: true, placeholder: "입력", onChangeValue: (val) =>
                      handleUpdatePkRow(row.id, 'msBuyPricePk', val === '' ? 0 : val), className: "w-full text-right text-[13.5px] font-bold text-blue-700 bg-transparent focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-1 py-0.5 tabular-nums" })), React.createElement("td", { className: "py-1 px-1.5 bg-slate-100/80 hover:bg-slate-200/60 border-r border-slate-200 transition-colors" }, React.createElement(CommaNumberInput, { value: !row.msSellPricePk ? '' : row.msSellPricePk, allowEmpty: true, placeholder: "입력", onChangeValue: (val) =>
                      handleUpdatePkRow(row.id, 'msSellPricePk', val === '' ? 0 : val), className: "w-full text-right text-[13.5px] font-bold text-blue-700 bg-transparent focus:outline-none focus:bg-white focus:ring-1 focus:ring-blue-500 rounded px-1 py-0.5 tabular-nums" })), React.createElement("td", { onMouseEnter: (e) => showFormulaTooltip(e, tipBuyError), onMouseLeave: hideFormulaTooltip, className: `py-1.5 px-2 text-right text-[13.5px] font-normal border-r border-slate-200 tabular-nums cursor-help ${
                    buyErrorAlert
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-white text-slate-900 hover:bg-slate-50'
                  }` }, buyPriceErrorRate !== null
                    ? `${buyPriceErrorRate > 0 ? '+' : ''}${(buyPriceErrorRate * 100).toFixed(2)}%`
                    : ''), React.createElement("td", { onMouseEnter: (e) => showFormulaTooltip(e, tipSalesFee), onMouseLeave: hideFormulaTooltip, className: "py-1.5 px-2 text-right text-[13.5px] font-normal text-slate-900 bg-white border-r border-slate-200 tabular-nums cursor-help hover:bg-slate-50" }, salesFeeRate !== null ? `${(salesFeeRate * 100).toFixed(2)}%` : ''), React.createElement("td", { className: "py-1 px-1.5 bg-white" }, React.createElement("input", { type: "text", value: row.msNote || '', onChange: (e) => handleUpdatePkRow(row.id, 'msNote', e.target.value), placeholder: "", className: "w-full text-[11.5px] font-bold text-slate-900 bg-transparent focus:outline-none focus:ring-1 focus:ring-slate-400 rounded-none px-1 py-0.5" })))
            );
          });
        });

        return (
          React.createElement("div", { className: "max-w-7xl mx-auto space-y-3" }, React.createElement("div", { className: "bg-white rounded-xl border border-slate-200 shadow-sm p-3 flex flex-wrap items-center justify-between gap-3" }, React.createElement("div", { className: "space-y-1" }, React.createElement("div", { className: "flex flex-wrap items-center gap-3" }, React.createElement("span", { className: "text-sm font-extrabold text-slate-800" }, "■ 엠즈(M's) 등록 매입/판매가 및 수수료 검증표"), React.createElement("span", { className: "text-xs font-semibold text-slate-500" }, "• 제품명 · PK입수량 · 바로가 출고가(ea)는 [PK단위 원가표]와 실시간 연동됩니다.")), React.createElement("p", { className: "text-xs font-bold text-rose-600" }, "※ 엠즈의 현재 매입가는 담당자를 통해서만 확인 가능하여 확인 후 수기 입력 진행해야함.")), React.createElement("span", { className: "text-[11px] font-semibold text-slate-500" }, "💡 자동계산 셀에 마우스를 올리면 산출 수식과 원화 차액이 표시됩니다.")), React.createElement("div", { className: "bg-white rounded-xl border border-slate-300 shadow-sm overflow-y-auto overflow-x-hidden max-h-[calc(100vh-145px)] relative" }, React.createElement("table", { className: "w-full border-collapse table-fixed" }, React.createElement("colgroup", null, React.createElement("col", { style: { width: '4.5%' } }), React.createElement("col", { style: { width: '16%' } }), React.createElement("col", { style: { width: '6.5%' } }), React.createElement("col", { style: { width: '8.5%' } }), React.createElement("col", { style: { width: '11%' } }), React.createElement("col", { style: { width: '9.5%' } }), React.createElement("col", { style: { width: '9.5%' } }), React.createElement("col", { style: { width: '8%' } }), React.createElement("col", { style: { width: '8.5%' } }), React.createElement("col", { style: { width: '18%' } })), React.createElement("thead", { className: "sticky top-0 z-20 shadow-sm" }, React.createElement("tr", { className: "text-white text-xs font-extrabold border-b border-slate-500" }, React.createElement("th", { colSpan: 2, className: "py-1 px-2 bg-slate-800 border-r border-slate-500" }, React.createElement("div", { className: "flex items-center justify-between gap-1.5" }, React.createElement("span", { className: "text-[11px] font-bold text-slate-200 shrink-0" }, "업데이트 날짜"), React.createElement("input", { type: "date", value: msUpdatedDate, onChange: (e) => setMsUpdatedDate(e.target.value), className: "w-[116px] text-center text-[11.5px] font-bold text-slate-900 bg-white hover:bg-amber-50 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded-none border border-slate-400 px-1 py-0.5 tabular-nums cursor-pointer" }))), React.createElement("th", { colSpan: 3, className: "py-1 px-2 text-center bg-[#FDFBF7] border-r border-slate-400" }, React.createElement("div", { className: "flex items-center justify-center" }, React.createElement("svg", { viewBox: "18 6 204 48", className: "h-6 w-auto block", role: "img", "aria-label": "BAROGA" }, React.createElement("text", { x: "120", y: "35", textAnchor: "middle", fill: "#332415", fontFamily: "Georgia, 'Times New Roman', serif", fontWeight: "700", fontSize: "36", letterSpacing: "3" }, "BAROGA"), React.createElement("text", { x: "120", y: "51", textAnchor: "middle", fill: "#332415", fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif", fontWeight: "600", fontSize: "10.5", letterSpacing: "1.4" }, "BAKERY MANUFACTURING")))), React.createElement("th", { colSpan: 2, className: "py-1 px-2 text-center bg-white border-r border-slate-400" }, React.createElement("div", { className: "flex items-center justify-center" }, React.createElement("svg", { viewBox: "0 0 218 62", className: "h-6 w-auto block", role: "img", "aria-label": "m's food" }, [0, 2.2, 4.4, 6.6, 8.8, 11].map((offset) => (
                            React.createElement("path", { key: offset, d: `M ${34 + offset * 0.35} ${28} A ${17 - offset * 0.5} ${17 - offset * 0.5} 0 0 1 ${72 - offset} 28 L ${72 - offset} 58`, fill: "none", stroke: "#B89B72", strokeWidth: "1.25" })
                          )), React.createElement("path", { d: "M 7 58 L 7 29 A 15.5 15.5 0 0 1 38 29 L 38 58", fill: "none", stroke: "#009FE3", strokeWidth: "13", strokeLinecap: "butt" }), React.createElement("text", { x: "75", y: "23", fill: "#009FE3", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontWeight: "700", fontSize: "26" }, "'s"), React.createElement("text", { x: "95", y: "57", fill: "#8C8C8C", fontFamily: "'Helvetica Neue', Arial, sans-serif", fontWeight: "300", fontSize: "44", letterSpacing: "-1" }, "food")))), React.createElement("th", { colSpan: 2, className: "py-1.5 px-2 text-center bg-rose-800/90 text-white border-r border-slate-500" }, "검증"), React.createElement("th", { rowSpan: 2, className: "py-1.5 px-2 text-center bg-slate-800 text-white border-b border-slate-500" }, "비고")), React.createElement("tr", { className: "bg-slate-700 text-white text-[11.5px] font-bold leading-tight" }, React.createElement("th", { className: "py-1.5 px-1 text-center border-r border-b border-slate-500 whitespace-nowrap" }, "품목코드"), React.createElement("th", { className: "py-1.5 px-2 text-left border-r border-b border-slate-500" }, "제품명"), React.createElement("th", { className: "py-1.5 px-1 text-center border-r border-b border-slate-500" }, "pk입수량"), React.createElement("th", { className: "py-1.5 px-1 text-center border-r border-b border-slate-500" }, React.createElement("div", null, "출고가"), React.createElement("div", { className: "text-[10px] font-normal text-slate-300" }, "(ea)")), React.createElement("th", { className: "py-1.5 px-1 text-center border-r border-b border-slate-500" }, React.createElement("div", null, "출고가"), React.createElement("div", { className: "text-[10px] font-normal text-slate-300" }, "(pk)")), React.createElement("th", { className: "py-1.5 px-1 text-center border-r border-b border-slate-500" }, React.createElement("div", null, "매입가"), React.createElement("div", { className: "text-[10px] font-normal text-slate-300" }, "(pk)")), React.createElement("th", { className: "py-1.5 px-1 text-center border-r border-b border-slate-500" }, React.createElement("div", null, "판매가"), React.createElement("div", { className: "text-[10px] font-normal text-slate-300" }, "(pk)")), React.createElement("th", { className: "py-1.5 px-1 text-center border-r border-b border-slate-500" }, "매입가 오차"), React.createElement("th", { className: "py-1.5 px-1 text-center border-r border-b border-slate-500" }, "판매 수수료"))), React.createElement("tbody", null, tableRows))))
        );
      };

      // ============================================================================
      // [시트 1] 기본설정 렌더링
      // ============================================================================
      const renderBasicSettingsSheet = () => {
        const halfIdx = Math.ceil(settings.jobTypeSalaries.length / 2);
        const leftJobs = settings.jobTypeSalaries.slice(0, halfIdx);
        const rightJobs = settings.jobTypeSalaries.slice(halfIdx);

        return (
          React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-4" }, React.createElement("div", { className: "lg:col-span-7 space-y-4" }, React.createElement("div", { className: "bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3" }, React.createElement("h3", { className: "text-xs font-extrabold text-slate-800 border-b border-slate-200 pb-2" }, "■ 1~3. 근무시간 산정 · 월간 환산 기준 (퇴직금은 작업유형별 기본급여에 포함된 것으로 보고 별도 가산하지 않음)"), React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs" }, React.createElement("div", { className: "p-2 rounded-lg bg-blue-50/60 border border-blue-200" }, React.createElement("div", { className: "text-[11px] text-slate-500 font-semibold" }, "월 소정근로일수"), React.createElement("div", { className: "mt-1 flex items-center justify-between" }, React.createElement(CommaNumberInput, { value: settings.avgMonthlyWorkDays, allowDecimal: true, onChangeValue: (v) => updateSettingField('avgMonthlyWorkDays', v), className: "w-16 text-sm font-extrabold text-blue-700 bg-white border border-blue-300 rounded px-1.5 py-0.5 text-right tabular-nums" }), React.createElement("span", { className: "text-slate-500 font-bold" }, "일"))), React.createElement("div", { className: "p-2 rounded-lg bg-amber-50/70 border border-amber-200", title: "매장 매입가(VAT 포함) = 바로가 출고가 × (1 + 수수료율) × 1.1" }, React.createElement("div", { className: "text-[11px] text-slate-500 font-semibold" }, "매장 매입가 수수료율"), React.createElement("div", { className: "mt-1 flex items-center justify-between" }, React.createElement(CommaNumberInput, { value: settings.storeCommissionRatePercent ?? 9.29, allowDecimal: true, onChangeValue: (v) => updateSettingField('storeCommissionRatePercent', v), className: "w-16 text-sm font-extrabold text-amber-800 bg-white border border-amber-300 rounded px-1.5 py-0.5 text-right tabular-nums" }), React.createElement("span", { className: "text-slate-500 font-bold" }, "%"))), React.createElement("div", { className: "p-2 rounded-lg bg-blue-50/60 border border-blue-200" }, React.createElement("div", { className: "text-[11px] text-slate-500 font-semibold" }, "일 소정근로시간"), React.createElement("div", { className: "mt-1 flex items-center justify-between" }, React.createElement(CommaNumberInput, { value: settings.dailyWorkHours, allowDecimal: true, onChangeValue: (v) => updateSettingField('dailyWorkHours', v), className: "w-16 text-sm font-extrabold text-blue-700 bg-white border border-blue-300 rounded px-1.5 py-0.5 text-right tabular-nums" }), React.createElement("span", { className: "text-slate-500 font-bold" }, "시간"))), React.createElement("div", { onMouseEnter: (e) =>
                      showFormulaTooltip(e, {
                        title: '실제 월 근무일수',
                        formula: '월 소정근로일수 - 월평균 공휴일 - 월평균 연차',
                        calc: `${settings.avgMonthlyWorkDays}일 - ${calc.avgMonthlyHolidays}일(연${settings.annualPublicHolidays}일÷12) - ${calc.avgMonthlyLeave}일(연${settings.annualLeaveDays}일÷12) = ${calc.actualMonthlyWorkDays}일`,
                      }), onMouseLeave: hideFormulaTooltip, className: "p-2 rounded-lg bg-amber-50/70 border border-amber-200 cursor-help" }, React.createElement("div", { className: "text-[11px] text-slate-500 font-semibold" }, "실제 월 근무일수"), React.createElement("div", { className: "mt-1 text-right font-extrabold text-amber-900 text-base tabular-nums" }, calc.actualMonthlyWorkDays, "일")), React.createElement("div", { onMouseEnter: (e) =>
                      showFormulaTooltip(e, {
                        title: '실제 월 근무시간 (분당단가 기준)',
                        formula: '실제 월 근무일수 × 일 소정근로시간',
                        calc: `${calc.actualMonthlyWorkDays}일 × ${settings.dailyWorkHours}시간 = ${calc.actualMonthlyWorkHours}시간`,
                      }), onMouseLeave: hideFormulaTooltip, className: "p-2 rounded-lg bg-amber-50/70 border border-amber-200 cursor-help" }, React.createElement("div", { className: "text-[11px] text-slate-500 font-semibold" }, "★ 실제 월 근무시간"), React.createElement("div", { className: "mt-1 text-right font-extrabold text-amber-900 text-base tabular-nums" }, calc.actualMonthlyWorkHours, "시간")))), React.createElement("div", { className: "bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3" }, React.createElement("div", { className: "flex items-center justify-between border-b border-slate-200 pb-2" }, React.createElement("h3", { className: "text-xs font-extrabold text-slate-800" }, "■ 4~5. 월 고정비 항목 (합계:", ' ', React.createElement("span", { className: "text-sm text-blue-700 tabular-nums" }, fmtInt(calc.totalMonthlyFixedCost)), "원/월)"), React.createElement("div", { className: "flex items-center gap-2 text-xs" }, React.createElement("span", { className: "text-slate-500 font-semibold" }, "예상 월 매출:"), React.createElement(CommaNumberInput, { value: settings.expectedTotalMonthlySales, onChangeValue: (v) => updateSettingField('expectedTotalMonthlySales', v), className: "w-32 text-sm font-extrabold text-blue-700 bg-blue-50 border border-blue-300 rounded px-2 py-0.5 text-right tabular-nums" }), React.createElement("span", { onMouseEnter: (e) =>
                        showFormulaTooltip(e, {
                          title: '매출 대비 고정비 비율',
                          formula: '월 고정비 합계 ÷ 예상 월 매출 × 100',
                          calc: `${fmtInt(calc.totalMonthlyFixedCost)}원 ÷ ${fmtInt(settings.expectedTotalMonthlySales)}원 = ${calc.fixedCostRatioPercent.toFixed(4)}%`,
                        }), onMouseLeave: hideFormulaTooltip, className: "text-sm font-extrabold text-emerald-700 cursor-help tabular-nums" }, "(고정비율 ", calc.fixedCostRatioPercent.toFixed(2), "%)"))), React.createElement("div", { className: "grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs" }, settings.fixedCostItems.map((fc) => (
                    React.createElement("div", { key: fc.id, className: "flex items-center justify-between gap-2 px-2.5 py-1.5 rounded border border-slate-200 bg-slate-50/60" }, React.createElement("span", { className: "font-semibold text-slate-700 truncate" }, fc.name), React.createElement("div", { className: "flex items-center gap-1 shrink-0" }, React.createElement(CommaNumberInput, { value: fc.amount, onChangeValue: (v) => handleUpdateFixedItem(fc.id, 'amount', v), className: "w-28 text-right text-sm font-bold text-blue-700 bg-white border border-slate-300 rounded px-1.5 py-0.5 tabular-nums" }), React.createElement("button", { type: "button", onClick: () => handleDeleteFixedItem(fc.id), className: "text-slate-300 hover:text-rose-600 px-1" }, "✕")))
                  )))), React.createElement("div", { className: "bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3" }, React.createElement("h3", { className: "text-xs font-extrabold text-slate-800 border-b border-slate-200 pb-2" }, "■ 6. 인건비 가동률 보정계수 (6월 실측 · 신급여 기준)"), React.createElement("div", { className: "overflow-x-auto" }, React.createElement("table", { className: "w-full text-xs border-collapse border border-slate-300" }, React.createElement("thead", null, React.createElement("tr", { className: "bg-slate-700 text-white font-bold" }, React.createElement("th", { className: "py-1.5 px-2 text-left border-r border-slate-500" }, "파트 구분"), React.createElement("th", { className: "py-1.5 px-2 text-right border-r border-slate-500" }, "보정계수 (H열)"), React.createElement("th", { className: "py-1.5 px-2 text-left border-r border-slate-500" }, "산출 근거"), React.createElement("th", { className: "py-1.5 px-2 text-right border-r border-slate-500" }, "급여합"), React.createElement("th", { className: "py-1.5 px-2 text-right" }, "6월 배부액(원)"))), React.createElement("tbody", null, settings.partAllocations.map((p) => (
                        React.createElement("tr", { key: p.id, className: "border-b border-slate-200" }, React.createElement("td", { className: "py-1.5 px-2 font-bold text-slate-800 border-r border-slate-200" }, p.name), React.createElement("td", { className: "py-1 px-2 bg-amber-50/80 border-r border-slate-200 text-right" }, React.createElement(CommaNumberInput, { value: p.laborFactor, allowDecimal: true, onChangeValue: (v) => handleUpdatePartSales(p.id, 'laborFactor', v), className: "w-16 text-right text-sm font-extrabold text-blue-700 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 tabular-nums" })), React.createElement("td", { className: "py-1.5 px-2 text-slate-600 border-r border-slate-200" }, p.factorNote), React.createElement("td", { className: "py-1 px-2 bg-amber-50/50 border-r border-slate-200 text-right" }, typeof p.juneSalaryTotal === 'number' ? (
                              React.createElement(CommaNumberInput, { value: p.juneSalaryTotal, onChangeValue: (v) =>
                                  handleUpdatePartSales(p.id, 'juneSalaryTotal', v), className: "w-28 text-right text-sm font-bold text-slate-800 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 tabular-nums" })
                            ) : (
                              React.createElement("span", { className: "text-slate-500 font-semibold" }, p.juneSalaryTotal)
                            )), React.createElement("td", { className: "py-1 px-2 text-right" }, p.juneAllocatedCost !== null && p.juneAllocatedCost !== undefined ? (
                              React.createElement(CommaNumberInput, { value: p.juneAllocatedCost, onChangeValue: (v) =>
                                  handleUpdatePartSales(p.id, 'juneAllocatedCost', v), className: "w-28 text-right text-sm font-bold text-slate-700 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded px-1 tabular-nums" })
                            ) : (
                              React.createElement("span", { className: "text-slate-400" }, "-")
                            )))
                      ))))), React.createElement("div", { className: "p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-700 space-y-1 leading-relaxed" }, React.createElement("p", { className: "font-bold text-slate-900" }, "💡 적용 수식: PK원가표 I열(PK당 인건비) = 배합인건비(G) ÷ 배합PK수(E) × 보정계수"), React.createElement("p", null, "• ", React.createElement("strong", null, "보정계수의 의미"), ": 스톱워치로 측정한 순수 작업시간 인건비(6월 모델 배부액)와 실제 회사가 지급한 월 급여합(세전) 사이의 간극(오븐 예열·청소·작업전환·유휴 대기시간 등)을 원가에 100% 반영하기 위한 현실 보정 배수입니다. (1.0 입력 시 순수 작업시간만 반영)")))), React.createElement("div", { className: "lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3" }, React.createElement("div", { className: "flex items-center justify-between border-b border-slate-200 pb-2" }, React.createElement("h3", { className: "text-xs font-extrabold text-slate-800" }, "■ 7. 작업유형별 기본급여(세전) DB (", settings.jobTypeSalaries.length, "종)"), React.createElement("span", { className: "text-[11px] text-slate-500" }, "스크롤 없이 전체 한눈에 보기")), React.createElement("div", { className: "grid grid-cols-2 gap-2" }, [leftJobs, rightJobs].map((colList, colIdx) => (
                  React.createElement("table", { key: colIdx, className: "w-full text-[11px] border-collapse border border-slate-300" }, React.createElement("thead", null, React.createElement("tr", { className: "bg-slate-700 text-white" }, React.createElement("th", { className: "py-1 px-1.5 text-left border-r border-slate-500" }, "작업유형"), React.createElement("th", { className: "py-1 px-1.5 text-right" }, "세전 기본급(원)"))), React.createElement("tbody", null, colList.map((jt) => (
                        React.createElement("tr", { key: jt.id, className: "border-b border-slate-200 hover:bg-slate-50" }, React.createElement("td", { className: "py-1 px-1.5 font-semibold text-slate-800 border-r border-slate-200 truncate" }, jt.jobType), React.createElement("td", { className: "py-0.5 px-1 text-right bg-blue-50/40" }, React.createElement(CommaNumberInput, { value: jt.baseSalary, onChangeValue: (v) => handleUpdateJobSalary(jt.id, 'baseSalary', v), className: "w-full text-right text-[13px] font-bold text-blue-700 bg-transparent focus:outline-none tabular-nums" })))
                      ))))
                )))))
        );
      };

      // ============================================================================
      // [시트 3~6] 공정별 인건비 DB 시트 렌더링
      // ============================================================================
      const renderProcessCategorySheet = (catKey) => {
        const catInfo = PROCESS_CATEGORIES[catKey];
        const computedList = computedCategoryDbs[catKey] || [];
        const filteredList = computedList.filter(({ product }) =>
          `${product.productCode || ''} ${product.productName || ''}`
            .toLowerCase()
            .includes(productSearchQuery.trim().toLowerCase())
        );
        const selectedId = selectedProductIds[catKey] || computedList[0]?.product?.id;
        const selectedEntry =
          computedList.find((item) => item.product.id === selectedId) || computedList[0] || null;
        const selCode = selectedEntry ? normalizeCodeStr(selectedEntry.product.productCode) : '';
        const selLinkedRc = selCode ? liveRecipeLookup.byCode.get(selCode) : null;
        const selRcMetrics = selLinkedRc ? evalLiveRecipeMetrics(selLinkedRc) : null;
        const selIsOutSynced = Boolean(
          selectedEntry &&
          selLinkedRc &&
          selRcMetrics &&
          selRcMetrics.productQty > 0 &&
          Math.abs(selectedEntry.computed.batchOutputEa - Math.round(selRcMetrics.productQty * 10) / 10) <= 0.2
        );
        const selIsPkSynced = Boolean(
          selectedEntry &&
          selLinkedRc &&
          Number(selLinkedRc.packQty) > 0 &&
          Number(selectedEntry.computed.pkQuantityEa) === Number(selLinkedRc.packQty)
        );
        const selIsMatSynced = Boolean(selectedEntry && selLinkedRc && selectedEntry.computed.batchMaterialCost > 0);

        return (
          React.createElement("div", { className: "space-y-3" }, React.createElement("div", { className: "bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 flex flex-wrap items-center justify-between gap-3" }, React.createElement("div", { className: "flex items-center gap-3" }, React.createElement("span", { className: "px-2.5 py-1 rounded-lg bg-slate-900 text-amber-300 text-xs font-extrabold" }, catInfo.label, " DB"), React.createElement("div", null, React.createElement("h2", { className: "text-sm font-extrabold text-slate-900" }, catInfo.desc, " (총 ", computedList.length, "종)"), React.createElement("p", { className: "text-[11px] text-slate-500" }, "좌측 목록에서 품목을 선택하고 우측에서 생산수량·원재료비·공정별 작업시간을 관리합니다."))), React.createElement("div", { className: "flex items-center gap-2" }, React.createElement("div", { className: "inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200" }, React.createElement("button", { type: "button", onClick: () => setCategoryViewMode('SHEET'), className: `px-3 py-1 rounded-md text-xs font-extrabold transition ${
                      categoryViewMode === 'SHEET'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }` }, "📋 품목별 공정 상세"), React.createElement("button", { type: "button", onClick: () => setCategoryViewMode('SUMMARY'), className: `px-3 py-1 rounded-md text-xs font-extrabold transition ${
                      categoryViewMode === 'SUMMARY'
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }` }, "📊 전체 품목 요약표 (", computedList.length, ")")), React.createElement("button", { type: "button", onClick: handleSortAllByProductCode, className: "px-2.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-bold shadow-sm transition cursor-pointer" }, "🔢 품목코드순 정렬"), React.createElement("button", { type: "button", onClick: () => handleAddProduct(catKey, false), className: "px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm transition cursor-pointer" }, "+ ", catInfo.label, " 신규 품목 추가"))), categoryViewMode === 'SUMMARY' ? (
              React.createElement("div", { className: "bg-white rounded-xl border border-slate-200 shadow-sm overflow-auto max-h-[calc(100vh-155px)]" }, React.createElement("table", { className: "w-full text-xs border-collapse" }, React.createElement("thead", { className: "sticky top-0 z-20 shadow-sm" }, React.createElement("tr", { className: "bg-slate-800 text-white font-bold" }, React.createElement("th", { className: "bg-slate-800 py-2.5 px-1 text-center border-r border-slate-600 w-14" }, "품목코드"), React.createElement("th", { className: "bg-slate-800 py-2.5 px-3 text-left border-r border-slate-600" }, "품목명"), React.createElement("th", { className: "bg-slate-800 py-2.5 px-3 text-right border-r border-slate-600" }, "1배합 실생산(ea)"), React.createElement("th", { className: "bg-slate-800 py-2.5 px-3 text-right border-r border-slate-600" }, "PK입수량(ea)"), React.createElement("th", { className: "bg-slate-800 py-2.5 px-3 text-right border-r border-slate-600" }, "1배합→PK수"), React.createElement("th", { className: "bg-slate-800 py-2.5 px-3 text-right border-r border-slate-600" }, "원재료비용(1배합, 원)"), React.createElement("th", { className: "bg-slate-800 py-2.5 px-3 text-right border-r border-slate-600" }, "총 투입시간(분)"), React.createElement("th", { className: "bg-slate-800 py-2.5 px-3 text-right border-r border-slate-600" }, "1배합 인건비(원)"), React.createElement("th", { className: "bg-slate-800 py-2.5 px-3 text-right border-r border-slate-600" }, "PK당 인건비(보정전)"), React.createElement("th", { className: "bg-slate-800 py-2.5 px-3 text-right border-r border-slate-600" }, "1ea 인건비(보정전)"), React.createElement("th", { className: "bg-slate-800 py-2.5 px-3 text-center w-24" }, "관리"))), React.createElement("tbody", null, computedList.map(({ product, computed }, idx) => {
                      const pCode = normalizeCodeStr(product.productCode);
                      const pLinkedRc = pCode ? liveRecipeLookup.byCode.get(pCode) : null;
                      const pRcMetrics = pLinkedRc ? evalLiveRecipeMetrics(pLinkedRc) : null;
                      const isOutSynced = Boolean(pLinkedRc && pRcMetrics && pRcMetrics.productQty > 0 && Math.abs(computed.batchOutputEa - Math.round(pRcMetrics.productQty * 10) / 10) <= 0.2);
                      const isPkSynced = Boolean(pLinkedRc && Number(pLinkedRc.packQty) > 0 && Number(computed.pkQuantityEa) === Number(pLinkedRc.packQty));
                      const isMatSynced = Boolean(pLinkedRc && computed.batchMaterialCost > 0);
                      return (
                      React.createElement("tr", { key: product.id, onClick: () => {
                          setSelectedProductIds((prev) => ({ ...prev, [catKey]: product.id }));
                          setCategoryViewMode('SHEET');
                        }, className: "border-b border-slate-200 hover:bg-blue-50/50 cursor-pointer transition-colors" }, React.createElement("td", { className: `relative py-1.5 px-2 text-center border-r border-slate-200 ${pLinkedRc ? 'bg-emerald-50/70' : 'bg-amber-50/40'}`, onClick: (e) => e.stopPropagation() }, pLinkedRc && React.createElement("span", { className: "w-1 h-1 rounded-full bg-emerald-500 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" }), React.createElement("input", { type: "text", value: product.productCode || '', placeholder: String(idx + 1), onChange: (e) =>
                              handleUpdateProductMeta(catKey, product.id, 'productCode', e.target.value), className: `w-full text-center font-mono text-xs font-extrabold bg-transparent focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 rounded px-1 py-0.5 tabular-nums ${pLinkedRc ? 'text-emerald-800' : 'text-amber-900'}` })), React.createElement("td", { className: "py-2 px-3 font-extrabold text-slate-900 border-r border-slate-200" }, product.productName), React.createElement("td", { className: "py-2 px-3 text-right text-sm font-semibold text-blue-700 border-r border-slate-200 tabular-nums" }, React.createElement(SyncedVal, { synced: isOutSynced }, fmtQty(computed.batchOutputEa))), React.createElement("td", { className: "py-2 px-3 text-right text-sm font-semibold text-blue-700 border-r border-slate-200 tabular-nums" }, React.createElement(SyncedVal, { synced: isPkSynced }, fmtQty(computed.pkQuantityEa))), React.createElement("td", { className: "py-2 px-3 text-right text-sm font-bold text-amber-800 bg-amber-50/40 border-r border-slate-200 tabular-nums" }, fmtDec(computed.batchOutputPk, 1)), React.createElement("td", { className: "py-2 px-3 text-right text-sm font-semibold text-blue-700 border-r border-slate-200 tabular-nums" }, React.createElement(SyncedVal, { synced: isMatSynced }, fmtInt(computed.batchMaterialCost))), React.createElement("td", { className: "py-2 px-3 text-right text-sm font-semibold text-slate-700 border-r border-slate-200 tabular-nums" }, fmtInt(computed.totalMinutes), "분"), React.createElement("td", { className: "py-2 px-3 text-right text-sm font-extrabold text-emerald-700 bg-emerald-50/40 border-r border-slate-200 tabular-nums" }, fmtInt(computed.totalBatchLaborCost)), React.createElement("td", { className: "py-2 px-3 text-right text-sm font-bold text-slate-800 border-r border-slate-200 tabular-nums" }, fmtInt(computed.laborCostPerPk)), React.createElement("td", { className: "py-2 px-3 text-right text-sm font-bold text-slate-800 border-r border-slate-200 tabular-nums" }, fmtInt(computed.laborCostPerEa)), React.createElement("td", { className: "py-2 px-3 text-center", onClick: (e) => e.stopPropagation() }, React.createElement("button", { type: "button", onClick: () => handleDuplicateProduct(catKey, product), className: "text-xs font-bold text-indigo-600 hover:underline mr-2" }, "복제"), React.createElement("button", { type: "button", onClick: () =>
                              setDeleteTargetProduct({
                                catKey,
                                prodId: product.id,
                                prodName: product.productName,
                              }), className: "text-xs font-bold text-rose-600 hover:underline" }, "삭제"))));
                    }))))
            ) : (
              React.createElement("div", { className: "grid grid-cols-1 lg:grid-cols-12 gap-4 items-start" }, React.createElement("aside", { className: "lg:col-span-3 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden" }, React.createElement("div", { className: "p-3 bg-slate-800 text-white space-y-2" }, React.createElement("div", { className: "flex items-center justify-between" }, React.createElement("span", { className: "text-xs font-extrabold" }, "📂 ", catInfo.label, " 제품 리스트 (", filteredList.length, "/", computedList.length, ")"), React.createElement("button", { type: "button", onClick: () => handleAddProduct(catKey, false), className: "px-2 py-0.5 rounded bg-blue-500 hover:bg-blue-400 text-white text-[11px] font-bold transition" }, "+ 추가")), React.createElement("input", { type: "text", value: productSearchQuery, onChange: (e) => setProductSearchQuery(e.target.value), placeholder: "품목코드 · 품목명 검색...", className: "w-full px-2.5 py-1.5 rounded-lg bg-slate-700 text-white placeholder-slate-400 text-xs focus:outline-none focus:ring-1 focus:ring-amber-400" })), React.createElement("div", { className: "divide-y divide-slate-100 max-h-[720px] overflow-y-auto" }, filteredList.length > 0 ? (
                      filteredList.map(({ product, computed }, idx) => {
                        const isSelected = selectedEntry?.product.id === product.id;
                        const sbCode = normalizeCodeStr(product.productCode);
                        const sbLinkedRc = sbCode ? liveRecipeLookup.byCode.get(sbCode) : null;
                        return (
                          React.createElement("button", { key: product.id, type: "button", onClick: () =>
                              setSelectedProductIds((prev) => ({ ...prev, [catKey]: product.id })), className: `w-full text-left px-3.5 py-2.5 transition flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-blue-50/90 border-l-4 border-l-blue-600'
                                : 'hover:bg-slate-50'
                            }` }, React.createElement("div", { className: "min-w-0" }, React.createElement("div", { className: "flex items-center gap-1.5" }, React.createElement("span", { className: `inline-flex items-center gap-1 text-[10.5px] font-mono font-extrabold px-1.5 py-0.5 rounded tabular-nums shrink-0 ${
                                    isSelected
                                      ? 'bg-blue-600 text-white'
                                      : sbLinkedRc
                                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                                        : product.productCode
                                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                          : 'bg-slate-200 text-slate-600'
                                  }` }, sbLinkedRc && React.createElement("span", { className: `w-1 h-1 rounded-full ${isSelected ? 'bg-emerald-300' : 'bg-emerald-500'}` }), product.productCode || idx + 1), React.createElement("span", { className: `text-xs truncate ${
                                    isSelected
                                      ? 'font-extrabold text-blue-950'
                                      : 'font-bold text-slate-800'
                                  }` }, product.productName)), React.createElement("div", { className: "mt-1 flex items-center gap-2 text-[11.5px] text-slate-500 tabular-nums" }, React.createElement("span", null, "생산 ", fmtQty(computed.batchOutputEa), "ea"), React.createElement("span", null, "·"), React.createElement("span", null, "입수 ", fmtQty(computed.pkQuantityEa), "ea"), React.createElement("span", null, "·"), React.createElement("span", { className: "font-bold text-amber-700" }, fmtDec(computed.batchOutputPk, 1), "PK"))), React.createElement("div", { className: "text-right shrink-0" }, React.createElement("div", { className: "text-[13.5px] font-extrabold text-emerald-700 tabular-nums" }, fmtInt(computed.totalBatchLaborCost), "원"), React.createElement("div", { className: "text-[11.5px] text-slate-400 tabular-nums" }, fmtInt(computed.totalMinutes), "분")))
                        );
                      })
                    ) : (
                      React.createElement("div", { className: "p-6 text-center text-xs text-slate-400" }, "검색 조건에 맞는 품목이 없습니다.")
                    ))), React.createElement("div", { className: "lg:col-span-9" }, selectedEntry ? (
                    React.createElement("div", { className: "bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4" }, React.createElement("div", { className: "flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200" }, React.createElement("div", { className: "flex items-center gap-2" }, React.createElement("span", { className: "px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-extrabold" }, "선택 품목"), React.createElement("h3", { className: "text-base font-extrabold text-slate-900" }, selectedEntry.product.productName)), React.createElement("div", { className: "flex flex-wrap items-center gap-2" }, React.createElement("button", { type: "button", onClick: () => handleSyncMaterialCostsFromRecipeTab(selectedEntry.product.id), title: "레시피 탭에서 동일 품목코드(또는 품목명)의 원재료비용·생산수량·PK입수량을 이 품목으로 가져옵니다", className: "px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-extrabold transition cursor-pointer" }, "🔗 이 품목 레시피 원가 가져오기"), React.createElement("button", { type: "button", onClick: () => handleDuplicateProduct(catKey, selectedEntry.product), className: "px-2.5 py-1 rounded-lg border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-700 transition" }, "📋 이 품목 복제"), React.createElement("button", { type: "button", onClick: () =>
                              setDeleteTargetProduct({
                                catKey,
                                prodId: selectedEntry.product.id,
                                prodName: selectedEntry.product.productName,
                              }), className: "px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 hover:bg-rose-100 text-xs font-bold text-rose-700 transition" }, "🗑 품목 삭제"))), React.createElement("div", { className: "grid grid-cols-2 sm:grid-cols-5 xl:grid-cols-10 gap-1.5 text-xs" }, React.createElement("div", { className: `p-2 rounded-lg border ${selLinkedRc ? 'bg-emerald-50/70 border-emerald-300' : 'bg-amber-50/70 border-amber-300'}` }, React.createElement("div", { className: "font-bold text-amber-950 text-[11px] whitespace-nowrap" }, "품목코드", React.createElement("span", { className: `block text-[9.5px] ${selLinkedRc ? 'text-emerald-700' : 'text-amber-700'}` }, selLinkedRc ? "(레시피 연동됨)" : "(레시피ID 통일)")), React.createElement("div", { className: "relative mt-1" }, selLinkedRc && React.createElement("span", { className: "w-1 h-1 rounded-full bg-emerald-500 absolute left-1.5 top-1/2 -translate-y-1/2 pointer-events-none" }), React.createElement("input", { type: "text", placeholder: "예: 1001", value: selectedEntry.product.productCode || '', onChange: (e) =>
                              handleUpdateProductMeta(
                                catKey,
                                selectedEntry.product.id,
                                'productCode',
                                e.target.value
                              ), className: `w-full font-mono text-[11.5px] font-extrabold bg-white border rounded px-1 py-0.5 text-center tabular-nums ${selLinkedRc ? 'text-emerald-800 border-emerald-400' : 'text-amber-950 border-amber-400'}` }))), React.createElement("div", { className: "p-2 rounded-lg bg-slate-50 border border-slate-200" }, React.createElement("div", { className: "font-bold text-slate-600 text-[11px] whitespace-nowrap" }, "품목명", React.createElement("span", { className: "block text-[9.5px] text-slate-400" }, "(이름수정)")), React.createElement("input", { type: "text", value: selectedEntry.product.productName, onChange: (e) =>
                              handleUpdateProductMeta(
                                catKey,
                                selectedEntry.product.id,
                                'productName',
                                e.target.value
                              ), className: "mt-1 w-full text-[11.5px] font-extrabold text-slate-900 bg-white border border-slate-300 rounded px-1 py-0.5" })), React.createElement("div", { className: "p-2 rounded-lg bg-blue-50/60 border border-blue-200" }, React.createElement("div", { className: "font-bold text-slate-700 text-[11px] whitespace-nowrap" }, "1배합 실생산 ", React.createElement("span", { className: "block text-[9.5px] text-slate-500" }, "(ea)")), React.createElement("div", { className: "relative mt-1" }, selIsOutSynced && React.createElement("span", { className: "w-1 h-1 rounded-full bg-emerald-500 absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none", title: "레시피 탭 생산수량과 동기화됨" }), React.createElement(CommaNumberInput, { value: selectedEntry.product.batchOutputEa, allowDecimal: true, onChangeValue: (v) =>
                              handleUpdateProductMeta(
                                catKey,
                                selectedEntry.product.id,
                                'batchOutputEa',
                                v
                              ), className: `w-full text-right text-[11.5px] font-extrabold text-blue-700 bg-white border border-blue-300 rounded py-0.5 tabular-nums ${selIsOutSynced ? 'pl-2.5 pr-1' : 'px-1'}` }))), React.createElement("div", { className: "p-2 rounded-lg bg-blue-50/60 border border-blue-200" }, React.createElement("div", { className: "font-bold text-slate-700 text-[11px] whitespace-nowrap" }, "PK입수량 ", React.createElement("span", { className: "block text-[9.5px] text-slate-500" }, "(ea)")), React.createElement("div", { className: "relative mt-1" }, selIsPkSynced && React.createElement("span", { className: "w-1 h-1 rounded-full bg-emerald-500 absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none", title: "레시피 탭 PK입수와 동기화됨" }), React.createElement(CommaNumberInput, { value: selectedEntry.product.pkQuantityEa, onChangeValue: (v) =>
                              handleUpdateProductMeta(
                                catKey,
                                selectedEntry.product.id,
                                'pkQuantityEa',
                                v
                              ), className: `w-full text-right text-[11.5px] font-extrabold text-blue-700 bg-white border border-blue-300 rounded py-0.5 tabular-nums ${selIsPkSynced ? 'pl-2.5 pr-1' : 'px-1'}` }))), React.createElement("div", { className: "p-2 rounded-lg bg-blue-50/60 border border-blue-200" }, React.createElement("div", { className: "font-bold text-slate-700 text-[11px] whitespace-nowrap" }, "원재료비용 ", React.createElement("span", { className: "block text-[9.5px] text-slate-500" }, "(1배합, 원)")), React.createElement("div", { className: "relative mt-1" }, selIsMatSynced && React.createElement("span", { className: "w-1 h-1 rounded-full bg-emerald-500 absolute left-1 top-1/2 -translate-y-1/2 pointer-events-none", title: "레시피 탭 원재료비용과 동기화됨" }), selIsMatSynced
                              // 레시피와 연결된 품목: 레시피 생산원가를 실시간으로 표시 (여기서는 수정 불가 → 레시피 탭에서 수정)
                              ? React.createElement("div", { title: "레시피 탭 생산원가(재료+포장)를 실시간 반영합니다. 수정은 레시피 탭에서 하세요.", className: "w-full text-right text-[11.5px] font-extrabold text-emerald-800 bg-emerald-50 border border-emerald-300 rounded py-0.5 pl-2.5 pr-1 tabular-nums cursor-help" }, fmtInt(selectedEntry.computed.batchMaterialCost))
                              : React.createElement(CommaNumberInput, { value: selectedEntry.product.batchMaterialCost || 0, onChangeValue: (v) =>
                              handleUpdateProductMeta(
                                catKey,
                                selectedEntry.product.id,
                                'batchMaterialCost',
                                v
                              ), className: `w-full text-right text-[11.5px] font-extrabold text-blue-700 bg-white border border-blue-300 rounded py-0.5 tabular-nums px-1` }))), React.createElement("div", { className: "p-2 rounded-lg bg-amber-50/70 border border-amber-200" }, React.createElement("div", { className: "font-bold text-slate-700 text-[11px] whitespace-nowrap" }, "1배합→PK수 ", React.createElement("span", { className: "block text-[9.5px] text-slate-500" }, "(PK)")), React.createElement("div", { className: "mt-1.5 text-right font-extrabold text-amber-900 text-[13.5px] tabular-nums" }, fmtDec(selectedEntry.computed.batchOutputPk, 1))), React.createElement("div", { className: "p-2 rounded-lg bg-amber-50/70 border border-amber-200" }, React.createElement("div", { className: "font-bold text-slate-700 text-[11px] whitespace-nowrap" }, "총 투입시간 ", React.createElement("span", { className: "block text-[9.5px] text-slate-500" }, "(분)")), React.createElement("div", { className: "mt-1.5 text-right font-extrabold text-amber-900 text-[13.5px] tabular-nums" }, fmtInt(selectedEntry.computed.totalMinutes), "분")), React.createElement("div", { className: "p-2 rounded-lg bg-emerald-50/70 border border-emerald-200" }, React.createElement("div", { className: "font-bold text-slate-700 text-[11px] whitespace-nowrap" }, "1배합 인건비 ", React.createElement("span", { className: "block text-[9.5px] text-slate-500" }, "(원)")), React.createElement("div", { className: "mt-1.5 text-right font-extrabold text-emerald-800 text-[13.5px] tabular-nums" }, fmtInt(selectedEntry.computed.totalBatchLaborCost))), React.createElement("div", { className: "p-2 rounded-lg bg-slate-50 border border-slate-200" }, React.createElement("div", { className: "font-bold text-slate-700 text-[11px] whitespace-nowrap" }, "PK당 인건비 ", React.createElement("span", { className: "block text-[9.5px] text-slate-500" }, "(보정전,원)")), React.createElement("div", { className: "mt-1.5 text-right font-extrabold text-slate-800 text-[13.5px] tabular-nums" }, fmtInt(selectedEntry.computed.laborCostPerPk))), React.createElement("div", { className: "p-2 rounded-lg bg-slate-50 border border-slate-200" }, React.createElement("div", { className: "font-bold text-slate-700 text-[11px] whitespace-nowrap" }, "1ea 인건비 ", React.createElement("span", { className: "block text-[9.5px] text-slate-500" }, "(보정전,원)")), React.createElement("div", { className: "mt-1.5 text-right font-extrabold text-slate-800 text-[13.5px] tabular-nums" }, fmtInt(selectedEntry.computed.laborCostPerEa)))), [
                        {
                          key: 'stage1Rows',
                          title: '1공정 (계량 · 믹싱 · 반죽)',
                          data: selectedEntry.computed.s1,
                        },
                        {
                          key: 'stage2Rows',
                          title: '2공정 (분할 · 성형 · 라미네이팅 · 굽기)',
                          data: selectedEntry.computed.s2,
                        },
                        {
                          key: 'stage3Rows',
                          title: '3공정 (포장 · 냉동 · 마무리)',
                          data: selectedEntry.computed.s3,
                        },
                      ].map((st) => (
                        React.createElement("div", { key: st.key, className: "border border-slate-200 rounded-lg overflow-hidden" }, React.createElement("div", { className: "bg-slate-800 text-white px-3 py-2 flex items-center justify-between text-xs font-bold" }, React.createElement("span", null, st.title, " — 투입 ", st.data.headcount, "명 / 소계: ", fmtInt(st.data.totalMinutes), "분 / ", fmtInt(st.data.totalCost), "원"), React.createElement("button", { type: "button", onClick: () =>
                                handleAddStageRow(catKey, selectedEntry.product.id, st.key, 'jt-6'), className: "px-2.5 py-1 rounded bg-slate-700 hover:bg-slate-600 text-[11px] font-extrabold transition" }, "+ 작업자 행 추가")), React.createElement("table", { className: "w-full text-xs border-collapse" }, React.createElement("thead", null, React.createElement("tr", { className: "bg-slate-100 text-slate-700 border-b border-slate-200" }, React.createElement("th", { className: "py-1.5 px-2.5 text-left" }, "작업유형"), React.createElement("th", { className: "py-1.5 px-2.5 text-right" }, "세전월급(원)"), React.createElement("th", { className: "py-1.5 px-2.5 text-right" }, "분당단가(원)"), React.createElement("th", { className: "py-1.5 px-2.5 text-right" }, "소요시간(분)"), React.createElement("th", { className: "py-1.5 px-2.5 text-right" }, "인건비(원)"), React.createElement("th", { className: "py-1.5 px-2.5 text-left" }, "비고"), React.createElement("th", { className: "py-1.5 px-2 text-center w-12" }, "삭제"))), React.createElement("tbody", null, st.data.rows.map((r) => (
                                React.createElement("tr", { key: r.id, className: "border-b border-slate-100 hover:bg-slate-50/70" }, React.createElement("td", { className: "py-1.5 px-2.5" }, React.createElement("select", { value: r.jobTypeId, onChange: (e) =>
                                        handleUpdateStageRow(
                                          catKey,
                                          selectedEntry.product.id,
                                          st.key,
                                          r.id,
                                          'jobTypeId',
                                          e.target.value
                                        ), className: "bg-white border border-slate-300 rounded px-2 py-1 font-semibold text-slate-800" }, React.createElement("option", { value: "" }, "-- 미배정 --"), settings.jobTypeSalaries.map((jt) => (
                                        React.createElement("option", { key: jt.id, value: jt.id }, jt.jobType, " (", fmtInt(jt.baseSalary), "원)")
                                      )))), React.createElement("td", { className: "py-1.5 px-2.5 text-right text-[13.5px] font-medium text-slate-600 tabular-nums", title: r.isAssigned ? "기본설정 탭 [작업유형별 기본급여 DB] 연동됨" : "" }, r.isAssigned ? React.createElement(SyncedVal, { synced: true }, fmtInt(r.baseSalary)) : '-'), React.createElement("td", { className: "py-1.5 px-2.5 text-right text-[13.5px] font-medium text-slate-600 tabular-nums", title: r.isAssigned ? "기본설정 탭 [실제 월 근무시간] 기준 자동 산출됨" : "" }, r.isAssigned ? React.createElement(SyncedVal, { synced: true }, fmtInt(r.costPerMin)) : '-'), React.createElement("td", { className: "py-1.5 px-2.5 text-right" }, React.createElement(CommaNumberInput, { value: r.minutes, onChangeValue: (v) =>
                                        handleUpdateStageRow(
                                          catKey,
                                          selectedEntry.product.id,
                                          st.key,
                                          r.id,
                                          'minutes',
                                          v
                                        ), className: "w-20 text-right text-[13.5px] font-bold text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-0.5 tabular-nums" })), React.createElement("td", { className: "py-1.5 px-2.5 text-right text-[13.5px] font-extrabold text-slate-900 tabular-nums" }, fmtInt(r.rowLaborCost)), React.createElement("td", { className: "py-1.5 px-2.5" }, React.createElement("input", { type: "text", value: r.note || '', onChange: (e) =>
                                        handleUpdateStageRow(
                                          catKey,
                                          selectedEntry.product.id,
                                          st.key,
                                          r.id,
                                          'note',
                                          e.target.value
                                        ), placeholder: "메모", className: "w-full text-xs text-slate-600 bg-transparent border-b border-transparent focus:border-slate-300 focus:outline-none py-0.5" })), React.createElement("td", { className: "py-1.5 px-2 text-center" }, React.createElement("button", { type: "button", onClick: () =>
                                        handleRemoveStageRow(
                                          catKey,
                                          selectedEntry.product.id,
                                          st.key,
                                          r.id
                                        ), className: "text-slate-300 hover:text-rose-600 font-bold" }, "✕")))
                              )))))
                      )))
                  ) : (
                    React.createElement("div", { className: "bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500" }, "등록된 품목이 없습니다. 상단 [+ ", catInfo.label, " 신규 품목 추가] 버튼을 눌러 추가해주세요.")
                  )))
            ), deleteTargetProduct && deleteTargetProduct.catKey === catKey && (
              React.createElement("div", { className: "fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4" }, React.createElement("div", { className: "bg-white rounded-xl border border-slate-200 shadow-xl max-w-sm w-full p-5 space-y-4" }, React.createElement("h4", { className: "text-sm font-extrabold text-slate-900" }, "품목 삭제 확인"), React.createElement("p", { className: "text-xs text-slate-600 leading-relaxed" }, React.createElement("strong", null, "[", deleteTargetProduct.prodName, "]"), " 품목을 삭제하시겠습니까? 삭제 후에는 복구할 수 없습니다."), React.createElement("div", { className: "flex justify-end gap-2" }, React.createElement("button", { type: "button", onClick: () => setDeleteTargetProduct(null), className: "px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-700" }, "취소"), React.createElement("button", { type: "button", onClick: confirmDeleteProduct, className: "px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold" }, "삭제하기"))))
            ))
        );
      };

      return (
        React.createElement("div", { className: "w-full text-slate-900 flex flex-col" }, React.createElement("datalist", { id: "barogaRecipeCodeDatalist" }, liveRecipeLookup.list.map((rc) =>
              rc && rc.productCode ? (
                React.createElement("option", { key: rc.id || rc.productCode, value: String(rc.productCode).trim() }, `${rc.recipeType === 'SUB' ? '[반제품]' : '[완제품]'} ${rc.productName || ''}`)
              ) : null
            )), formulaTooltip && (
            React.createElement("div", { style: {
                left: `${Math.min(Math.max(formulaTooltip.x, 160), typeof window !== 'undefined' ? window.innerWidth - 160 : 800)}px`,
                top:
                  formulaTooltip.y > 110
                    ? `${formulaTooltip.y - 8}px`
                    : `${formulaTooltip.bottomY + 8}px`,
                transform:
                  formulaTooltip.y > 110 ? 'translate(-50%, -100%)' : 'translate(-50%, 0)',
              }, className: "fixed z-50 pointer-events-none w-max max-w-xs sm:max-w-sm bg-slate-900/95 text-white px-3 py-2 rounded-lg shadow-xl border border-slate-700 text-[11px] leading-snug" }, React.createElement("div", { className: "font-extrabold text-amber-300 mb-0.5" }, formulaTooltip.title), React.createElement("div", { className: "text-slate-300 font-mono text-[10.5px]" }, "수식: ", formulaTooltip.formula), React.createElement("div", { className: "mt-1 pt-1 border-t border-slate-700 font-bold text-emerald-300" }, "계산: ", formulaTooltip.calc))
          ), React.createElement("div", { className: "bg-stone-100/90 border-b border-stone-200" }, React.createElement("div", { className: "max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-2 flex flex-wrap items-center justify-between gap-2" }, React.createElement("nav", { className: "flex flex-wrap items-center gap-1.5" }, SHEET_TABS.map((tab) => {
                      const isActive = activeTab === tab.id;
                      const count =
                        tab.id === 'PK_MAIN'
                          ? pkCostRows.length
                          : PROCESS_CATEGORIES[tab.id]
                            ? (categoryDbs[tab.id] || []).length
                            : null;

                      return (
                        React.createElement("button", { key: tab.id, type: "button", onClick: () => setActiveTab(tab.id), className: `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-extrabold transition cursor-pointer ${
                            isActive
                              ? 'bg-stone-900 text-white shadow-xs'
                              : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                          }` }, React.createElement("span", { className: "text-sm leading-none" }, tab.icon), React.createElement("span", null, tab.label), count !== null && (
                            React.createElement("span", { className: `px-1.5 py-0.5 rounded-full text-[11px] font-extrabold tabular-nums transition ${
                                isActive
                                  ? 'bg-amber-400 text-stone-950'
                                  : 'bg-stone-100 text-stone-600'
                              }` }, count)
                          ))
                      );
                    }), React.createElement("span", { className: "h-5 w-px bg-stone-300 mx-0.5 hidden sm:inline-block" }), React.createElement("button", { type: "button", onClick: () => setActiveTab('MS_PRICE'), className: `flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-extrabold transition cursor-pointer ${
                        activeTab === 'MS_PRICE'
                          ? 'bg-stone-900 text-white shadow-xs'
                          : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-50'
                      }` }, React.createElement("span", { className: "text-sm leading-none" }, "✅"), React.createElement("span", null, "엠즈 매입/판매가"), React.createElement("span", { className: `px-1.5 py-0.5 rounded-full text-[11px] font-extrabold tabular-nums transition ${
                          activeTab === 'MS_PRICE'
                            ? 'bg-amber-400 text-stone-950'
                            : 'bg-stone-100 text-stone-600'
                        }` }, pkCostRows.length))), React.createElement("div", { className: "flex items-center gap-1.5 ml-auto text-xs" },
                    React.createElement("button", {
                      type: "button",
                      onClick: openPriceDbConfigModal,
                      className: `flex items-center gap-1.5 px-3 py-1.5 h-9 rounded-xl border text-xs font-bold transition cursor-pointer ${
                        syncStatus === 'ERROR'
                          ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                          : syncStatus === 'SAVING' || syncStatus === 'LOADING'
                            ? 'bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      }`
                    },
                      React.createElement("span", { className: `w-2 h-2 rounded-full ${
                        syncStatus === 'SAVING' || syncStatus === 'LOADING'
                          ? 'bg-amber-500 animate-pulse'
                          : syncStatus === 'ERROR'
                            ? 'bg-rose-500'
                            : 'bg-emerald-500'
                      }` }),
                      React.createElement("span", null, syncStatus === 'SAVING'
                        ? '저장중...'
                        : syncStatus === 'LOADING'
                          ? '동기화중...'
                          : syncStatus === 'ERROR'
                            ? syncErrorLabel
                            : `DB 연동됨 (${pkCostRows.length}종)`),
                      React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "w-3.5 h-3.5 ml-0.5 opacity-75" },
                        React.createElement("path", { d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" }),
                        React.createElement("circle", { cx: "12", cy: "12", r: "3" })
                      )
                    ),
                    React.createElement("button", {
                      type: "button",
                      onClick: () => handleSaveToGoogleSheet(null, false),
                      disabled: syncStatus === 'LOADING' || syncStatus === 'SAVING',
                      className: "flex items-center gap-1.5 px-3.5 py-1.5 h-9 rounded-xl text-xs font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition cursor-pointer disabled:opacity-50"
                    },
                      React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "w-3.5 h-3.5" },
                        React.createElement("path", { d: "M12 13v8" }),
                        React.createElement("path", { d: "M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" }),
                        React.createElement("path", { d: "m8 17 4-4 4 4" })
                      ),
                      React.createElement("span", null, "DB 저장")
                    ),
                    React.createElement("button", {
                      type: "button",
                      onClick: () => handleLoadFromGoogleSheet(false),
                      disabled: syncStatus === 'LOADING' || syncStatus === 'SAVING',
                      title: "구글 시트 새로고침",
                      className: "flex items-center justify-center w-9 h-9 rounded-xl border border-stone-200 bg-white hover:bg-stone-100 text-stone-700 transition cursor-pointer disabled:opacity-50"
                    },
                      React.createElement("span", { className: `inline-flex items-center justify-center ${syncStatus === 'LOADING' ? 'animate-spin' : ''}` },
                        React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "w-4 h-4" },
                          React.createElement("path", { d: "M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" }),
                          React.createElement("path", { d: "M21 3v5h-5" }),
                          React.createElement("path", { d: "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" }),
                          React.createElement("path", { d: "M8 16H3v5" })
                        )
                      )
                    )
                  ))), isPriceDbModalOpen && (
            React.createElement("div", { onClick: (e) => { if (e.target === e.currentTarget) closePriceDbConfigModal(); }, className: "fixed inset-0 bg-stone-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4" },
              React.createElement("div", { className: "bg-white rounded-2xl max-w-lg w-full p-5 shadow-xl border border-stone-200 text-xs" },
                React.createElement("div", { className: "flex items-center justify-between pb-3 border-b border-stone-200" },
                  React.createElement("h3", { className: "text-base font-extrabold text-stone-900" }, "제품단가 구글 스프레드시트 DB 설정"),
                  React.createElement("button", { type: "button", onClick: closePriceDbConfigModal, className: "text-stone-400 hover:text-stone-700 cursor-pointer" },
                    React.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", className: "w-5 h-5" },
                      React.createElement("path", { d: "M18 6 6 18" }),
                      React.createElement("path", { d: "m6 6 12 12" })
                    )
                  )
                ),
                React.createElement("div", { className: "mt-4 space-y-3" },
                  React.createElement("div", null,
                    React.createElement("label", { className: "font-bold text-stone-700 block mb-1" }, "Google Apps Script 웹 앱 URL"),
                    React.createElement("input", {
                      type: "text",
                      value: draftPriceGasUrl,
                      onChange: (e) => setDraftPriceGasUrl(e.target.value),
                      placeholder: "https://script.google.com/macros/s/.../exec",
                      className: "w-full border border-stone-300 focus:border-emerald-600 focus:outline-none rounded-xl px-3 py-2 font-mono bg-stone-50 focus:bg-white text-stone-900"
                    })
                  ),
                  React.createElement("div", { className: "flex justify-end gap-2 pt-1" },
                    React.createElement("button", {
                      type: "button",
                      onClick: closePriceDbConfigModal,
                      className: "px-4 py-2 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold cursor-pointer"
                    }, "닫기"),
                    React.createElement("button", {
                      type: "button",
                      onClick: handleSavePriceGasUrlConfig,
                      className: "px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold cursor-pointer"
                    }, "URL 저장 및 동기화")
                  )
                )
              )
            )
          ), toastMessage && (
            React.createElement("div", { className: "fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-bold border border-slate-700" }, toastMessage)
          ), React.createElement("main", { className: "flex-1 max-w-[1600px] w-full mx-auto px-4 sm:px-6 py-4" }, activeTab === 'BASIC_DB' && renderBasicSettingsSheet(), activeTab === 'PK_MAIN' && renderPkMainCostSheet(), activeTab === 'MS_PRICE' && renderMsPriceSheet(), activeTab === 'PIE' && renderProcessCategorySheet('PIE'), activeTab === 'DOUGH' && renderProcessCategorySheet('DOUGH'), activeTab === 'PARBAKE' && renderProcessCategorySheet('PARBAKE'), activeTab === 'BAKERY' && renderProcessCategorySheet('BAKERY')))
      );
    }

    let _barogaPriceRoot = null;
    window.mountProductPriceApp = function () {
      const container = document.getElementById('productPriceRoot');
      if (!container || typeof ReactDOM === 'undefined') return;
      if (!_barogaPriceRoot) {
        _barogaPriceRoot = ReactDOM.createRoot(container);
        _barogaPriceRoot.render(React.createElement(App, null));
      } else if (typeof window.refreshProductPriceRecipeLinks === 'function') {
        window.refreshProductPriceRecipeLinks();
      }
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        window.mountProductPriceApp();
      });
    } else {
      window.mountProductPriceApp();
    }
  
})();
