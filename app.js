/**
 * SunPower: Focused on the Future of Solar Power
 * Eclipsing the Competition: The Solar PV Industry Simulation
 * 前端儀表板控制器與 Google 試算表連動模組
 */

let sim = null;
let charts = {};

const STORAGE_KEY_WEBHOOK = "sunpower_gas_webhook_url";
const STORAGE_KEY_CLASS = "sunpower_student_class";
const STORAGE_KEY_ID = "sunpower_student_id";
const STORAGE_KEY_NAME = "sunpower_student_name";

document.addEventListener('DOMContentLoaded', () => {
    if (window.lucide) lucide.createIcons();
    initSimulation();
    setupInputs();
    setupCharts();
    setupGoogleSheetsModule();
    updateUI();
});

function initSimulation() {
    sim = new SolarPVEngine();
}

function resetSimulation() {
    if (confirm("確定要重新開局嗎？當前太陽能產能與學習曲線進度將被重置。")) {
        sim.reset();
        updateUI();
    }
}

function setupInputs() {
    // 1. 價格滑桿聯動
    const sliderPrice = document.getElementById('slider-modulePrice');
    const inputPrice = document.getElementById('input-modulePrice');
    const sliderCapacity = document.getElementById('slider-expandCapacity');
    const inputCapacity = document.getElementById('input-expandCapacity');
    const sliderRD = document.getElementById('slider-rdBudget');
    const inputRD = document.getElementById('input-rdBudget');

    if (sliderPrice && inputPrice) {
        sliderPrice.addEventListener('input', (e) => {
            inputPrice.value = e.target.value;
            calculateForecast();
        });
        inputPrice.addEventListener('input', (e) => {
            sliderPrice.value = e.target.value;
            calculateForecast();
        });
    }

    if (sliderCapacity && inputCapacity) {
        sliderCapacity.addEventListener('input', (e) => {
            inputCapacity.value = e.target.value;
            calculateForecast();
        });
        inputCapacity.addEventListener('input', (e) => {
            sliderCapacity.value = e.target.value;
            calculateForecast();
        });
    }

    if (sliderRD && inputRD) {
        sliderRD.addEventListener('input', (e) => {
            inputRD.value = e.target.value;
            calculateForecast();
        });
        inputRD.addEventListener('input', (e) => {
            sliderRD.value = e.target.value;
            calculateForecast();
        });
    }

    // 2. 策略預設按鈕 (Presets)
    const btnPresetAggressive = document.getElementById('btnPresetAggressive');
    const btnPresetPremium = document.getElementById('btnPresetPremium');
    const btnPresetBalanced = document.getElementById('btnPresetBalanced');

    if (btnPresetAggressive) {
        btnPresetAggressive.addEventListener('click', () => {
            // 激進產能擴張：低價衝量換取極速學習曲線下降
            const currentCost = sim.companies[0].unitCostPerWatt;
            setDecisionValues(Math.max(0.3, Math.round((currentCost * 1.08) * 100) / 100), 120, 15);
        });
    }
    if (btnPresetPremium) {
        btnPresetPremium.addEventListener('click', () => {
            // 高端溢價策略：維持高毛利支撐製程改善
            const currentCost = sim.companies[0].unitCostPerWatt;
            setDecisionValues(Math.round((currentCost * 1.30) * 100) / 100, 45, 18);
        });
    }
    if (btnPresetBalanced) {
        btnPresetBalanced.addEventListener('click', () => {
            // 平衡穩健策略
            const currentCost = sim.companies[0].unitCostPerWatt;
            setDecisionValues(Math.round((currentCost * 1.20) * 100) / 100, 70, 12);
        });
    }

    // 3. 提交決策推進年度
    const btnNextYear = document.getElementById('btnNextYear');
    if (btnNextYear) {
        btnNextYear.addEventListener('click', executeStep);
    }
}

function setDecisionValues(price, expandMW, rdPct) {
    const slP = document.getElementById('slider-modulePrice');
    const inP = document.getElementById('input-modulePrice');
    const slC = document.getElementById('slider-expandCapacity');
    const inC = document.getElementById('input-expandCapacity');
    const slR = document.getElementById('slider-rdBudget');
    const inR = document.getElementById('input-rdBudget');

    if (slP) slP.value = price;
    if (inP) inP.value = price;
    if (slC) slC.value = expandMW;
    if (inC) inC.value = expandMW;
    if (slR) slR.value = rdPct;
    if (inR) inR.value = rdPct;

    calculateForecast();
}

function calculateForecast() {
    const price = parseFloat(document.getElementById('input-modulePrice')?.value || 4.80);
    const expandMW = parseInt(document.getElementById('input-expandCapacity')?.value || 35);
    const rdPct = parseFloat(document.getElementById('input-rdBudget')?.value || 12) / 100;

    const p = sim.companies[0];
    const estCap = p.annualCapacityMW + expandMW;
    const estRev = Math.round(estCap * price * 10) / 10;
    const estRD = Math.round(estRev * rdPct * 10) / 10;

    setText('previewForecastCap', `${estCap} MW`);
    setText('previewForecastRev', `$${estRev.toFixed(1)}M`);
    setText('previewForecastRD', `$${estRD.toFixed(1)}M`);
}

function executeStep() {
    if (sim.isGameOver) {
        openSubmitModal();
        return;
    }

    const price = parseFloat(document.getElementById('input-modulePrice')?.value || 4.80);
    const expandMW = parseInt(document.getElementById('input-expandCapacity')?.value || 35);
    const rdPct = parseFloat(document.getElementById('input-rdBudget')?.value || 12) / 100;

    sim.step({
        modulePrice: price,
        capacityExpansionMW: expandMW,
        processImprovementBudgetPct: rdPct
    });

    updateUI();

    if (sim.isGameOver) {
        setTimeout(() => {
            openSubmitModal();
        }, 800);
    }
}

function updateUI() {
    const st = sim.getCurrentStatus();
    const p = st.player;
    const env = st.environment;

    // 頂部 KPI 卡片
    setText('valCurrentYear', `第 ${Math.min(st.maxYears, st.year)} 年 / 共 ${st.maxYears} 年`);
    setText('valCumulativeProfit', `$${p.cumulativeProfitM.toFixed(1)}M`);
    setText('valPlayerRank', `#${st.playerRank}`);
    setText('valUnitCost', `$${p.unitCostPerWatt.toFixed(2)} / W`);
    setText('valSellingPrice', `$${p.sellingPricePerWatt.toFixed(2)} / W`);
    setText('valCapacity', `${p.annualCapacityMW} MW`);

    const marginPct = p.sellingPricePerWatt > 0 
        ? Math.round(((p.sellingPricePerWatt - p.unitCostPerWatt) / p.sellingPricePerWatt) * 100) 
        : 0;
    setText('valGrossMargin', `${marginPct}% 毛利率`);

    setText('valGridPrice', `$${env.gridPowerPrice.toFixed(3)}/kWh`);
    setText('valSubsidy', `$${env.subsidyPerWatt.toFixed(2)}/W`);
    setText('valCarbonTax', `$${env.carbonTaxPerTon.toFixed(1)}/ton`);
    setText('valLCOE', `$${p.levelizedCostOfEnergy.toFixed(3)}/kWh`);

    const parityStatus = env.gridParityAchieved 
        ? `⚡ 已達成 (第${env.gridParityYear}年)` 
        : `差 $${Math.max(0, p.levelizedCostOfEnergy - env.gridPowerPrice).toFixed(3)}/kWh`;
    setText('valGridParityStatus', parityStatus);

    // 渲染競爭者卡片
    renderCompetitorCards();

    // 渲染歷史營運紀錄表
    renderHistoryTable();

    // 更新圖表
    updateCharts();

    // 模擬結束橫幅渲染
    renderGameBanner();

    // 更新按鈕
    const btnNext = document.getElementById('btnNextYear');
    if (btnNext) {
        if (sim.isGameOver) {
            btnNext.innerHTML = `<i data-lucide="award" class="w-4 h-4"></i> 挑戰已結算・登錄總成績`;
            btnNext.className = "w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition";
        } else {
            btnNext.innerHTML = `<i data-lucide="arrow-right" class="w-4 h-4"></i> 投入擴產與製程改善，推進至第 ${st.year + 1} 年`;
            btnNext.className = "w-full py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition";
        }
    }

    if (window.lucide) lucide.createIcons();
}

function renderCompetitorCards() {
    const container = document.getElementById('competitorsGrid');
    if (!container) return;

    container.innerHTML = '';
    const sorted = [...sim.companies].sort((a, b) => b.cumulativeProfitM - a.cumulativeProfitM);

    sorted.forEach((c, idx) => {
        const isPlayer = c.isPlayer;
        const card = document.createElement('div');
        card.className = `p-4 rounded-xl border transition ${
            isPlayer 
            ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20 shadow-sm' 
            : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
        }`;

        const rankBadge = idx === 0 
            ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">👑 利潤榜首 (#1)</span>' 
            : `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">#${idx + 1}</span>`;

        card.innerHTML = `
            <div class="flex items-start justify-between mb-2">
                <div>
                    <div class="font-bold text-xs ${isPlayer ? 'text-amber-900 font-extrabold' : 'text-slate-800'}">${c.name}</div>
                    <div class="text-[10px] text-slate-500">${c.technology}</div>
                </div>
                ${rankBadge}
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs font-mono mt-3 pt-2 border-t border-slate-100">
                <div>
                    <span class="text-[10px] text-slate-400 block font-sans">累積營業利潤</span>
                    <strong class="${c.cumulativeProfitM >= 0 ? 'text-emerald-600 font-bold' : 'text-rose-600 font-bold'}">$${c.cumulativeProfitM.toFixed(1)}M</strong>
                </div>
                <div>
                    <span class="text-[10px] text-slate-400 block font-sans">單位製造成本</span>
                    <strong class="text-slate-800 font-bold">$${c.unitCostPerWatt.toFixed(2)}/W</strong>
                </div>
                <div>
                    <span class="text-[10px] text-slate-400 block font-sans">模組售價</span>
                    <span class="text-slate-700">$${c.sellingPricePerWatt.toFixed(2)}/W</span>
                </div>
                <div>
                    <span class="text-[10px] text-slate-400 block font-sans">年產能 / 市佔</span>
                    <span class="text-slate-700">${c.annualCapacityMW}MW (${c.marketSharePct}%)</span>
                </div>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderHistoryTable() {
    const tbody = document.getElementById('historyTableBody');
    const badge = document.getElementById('tableRecordCount');
    if (!tbody) return;

    const records = sim.history.filter(h => h.year > 0).slice().reverse();
    if (badge) badge.textContent = `共 ${records.length} 筆營運紀錄`;

    if (records.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="p-4 text-center text-slate-400 font-sans italic">尚無營運數據，請點擊「投入擴產與製程改善」開始第一年競賽</td></tr>`;
        return;
    }

    tbody.innerHTML = '';
    records.forEach(r => {
        const tr = document.createElement('tr');
        tr.className = 'hover:bg-slate-50 border-b border-slate-100 transition';

        const parityBadge = r.gridParityStatus.includes('已平價') 
            ? `<span class="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 text-[10px] font-bold">市網平價</span>` 
            : `<span class="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-medium">補貼期</span>`;

        tr.innerHTML = `
            <td class="p-2.5 font-bold text-slate-900">第 ${r.year} 年</td>
            <td class="p-2.5 text-right font-medium text-slate-700">$${r.playerPrice.toFixed(2)}</td>
            <td class="p-2.5 text-right font-bold text-blue-600">$${r.playerUnitCost.toFixed(2)}</td>
            <td class="p-2.5 text-right font-mono text-slate-800">${r.playerGrossMarginPct}%</td>
            <td class="p-2.5 text-right font-mono text-slate-800">${r.playerShipmentsMW} MW</td>
            <td class="p-2.5 text-right font-bold text-amber-600">${r.playerMarketShare.toFixed(1)}%</td>
            <td class="p-2.5 text-right font-mono text-slate-800">$${r.playerRevenueM.toFixed(1)}M</td>
            <td class="p-2.5 text-right font-mono text-emerald-600 font-bold">$${r.playerOperatingProfitM.toFixed(1)}M</td>
            <td class="p-2.5 text-right font-mono font-extrabold text-indigo-700">$${r.playerCumulativeProfitM.toFixed(1)}M (#${r.playerRank})</td>
            <td class="p-2.5 text-center font-sans">${parityBadge}</td>
        `;
        tbody.appendChild(tr);
    });
}

function renderGameBanner() {
    const banner = document.getElementById('gameStatusBanner');
    if (!banner) return;

    if (sim.isGameOver) {
        banner.classList.remove('hidden');
        if (sim.isWon) {
            banner.className = 'p-5 rounded-2xl border border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm';
            banner.innerHTML = `
                <div class="flex items-start gap-4">
                    <span class="text-3xl">🏆</span>
                    <div>
                        <h4 class="font-bold text-base text-emerald-900">恭喜！達成太陽能產業王者 (Eclipsing the Competition)</h4>
                        <p class="text-xs text-emerald-800 mt-1 leading-relaxed">${sim.gameOverReason}</p>
                        <div class="mt-3 flex gap-2">
                            <button onclick="openSubmitModal()" class="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow flex items-center gap-1.5">
                                <i data-lucide="send" class="w-3.5 h-3.5"></i>
                                <span>登記成績至 Google 試算表</span>
                            </button>
                            <button onclick="resetSimulation()" class="px-4 py-1.5 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-semibold">再次開局挑戰</button>
                            <button onclick="exportCSV()" class="px-4 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-semibold">匯出歷史報表</button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            banner.className = 'p-5 rounded-2xl border border-rose-300 bg-rose-50 text-rose-950 shadow-sm';
            banner.innerHTML = `
                <div class="flex items-start gap-4">
                    <span class="text-3xl">⚠️</span>
                    <div>
                        <h4 class="font-bold text-base text-rose-900">模擬結束：產能競賽陷阱或利潤失血</h4>
                        <p class="text-xs text-rose-800 mt-1 leading-relaxed">${sim.gameOverReason}</p>
                        <div class="text-[11px] text-rose-700 mt-2 bg-white/70 p-2.5 rounded-lg border border-rose-200">
                            💡 MIT Sloan 教授 John Sterman 洞察：光伏產業的「學習曲線」是雙刃劍——累積產量固然能推動成本沿著 80% 進步比率下降，但若盲目殺價而缺乏充足的毛利來支撐製程改善 R&D，或是忽視同業的設備外溢效應，將在價格暴跌中耗盡資本！
                        </div>
                        <div class="mt-3 flex gap-2">
                            <button onclick="openSubmitModal()" class="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow flex items-center gap-1.5">
                                <i data-lucide="send" class="w-3.5 h-3.5"></i>
                                <span>登記成績至 Google 試算表</span>
                            </button>
                            <button onclick="resetSimulation()" class="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow">重新調整擴產策略</button>
                        </div>
                    </div>
                </div>
            `;
        }
        if (window.lucide) lucide.createIcons();
    } else {
        banner.classList.add('hidden');
    }
}

function setupCharts() {
    const lightGrid = { color: 'rgba(226, 232, 240, 0.8)', drawBorder: false };
    const lightTicks = { color: '#475569', font: { size: 10, family: 'JetBrains Mono' } };
    const commonPlugins = {
        legend: { labels: { color: '#334155', font: { size: 11, weight: '500' }, boxWidth: 12 } }
    };

    // Chart 1: 學習曲線對數圖 (Learning Curve: Cost vs Cumulative Volume)
    const ctxLearning = document.getElementById('chartLearning')?.getContext('2d');
    if (ctxLearning) {
        charts.learning = new Chart(ctxLearning, {
            type: 'line',
            data: {
                labels: ['85MW'],
                datasets: [
                    { label: 'SunPower 單位成本 ($/W)', data: [3.80], borderColor: '#d97706', borderWidth: 3 },
                    { label: 'Sharp Solar 單位成本 ($/W)', data: [3.40], borderColor: '#ef4444', borderWidth: 1.5, borderDash: [2, 2] },
                    { label: 'REC Group 單位成本 ($/W)', data: [3.50], borderColor: '#10b981', borderWidth: 1.5, borderDash: [2, 2] },
                    { label: 'Q-Cells 單位成本 ($/W)', data: [3.45], borderColor: '#6366f1', borderWidth: 1.5, borderDash: [2, 2] }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: commonPlugins,
                scales: { 
                    x: { grid: lightGrid, ticks: lightTicks, title: { display: true, text: '累積產量 (Cumulative MW)', font: { size: 9 } } }, 
                    y: { grid: lightGrid, ticks: lightTicks, title: { display: true, text: '單位成本 ($/Watt)', font: { size: 9 } } } 
                }
            }
        });
    }

    // Chart 2: 價格 vs 成本動態 (Price vs Cost Margin)
    const ctxPriceCost = document.getElementById('chartPriceCost')?.getContext('2d');
    if (ctxPriceCost) {
        charts.priceCost = new Chart(ctxPriceCost, {
            type: 'line',
            data: {
                labels: ['Y0'],
                datasets: [
                    { label: '模組銷售價格 ($/W)', data: [4.80], borderColor: '#2563eb', borderWidth: 2.5 },
                    { label: '單位製造成本 ($/W)', data: [3.80], borderColor: '#d97706', borderWidth: 2.5 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: commonPlugins,
                scales: { x: { grid: lightGrid, ticks: lightTicks }, y: { grid: lightGrid, ticks: lightTicks, title: { display: true, text: '$/Watt', font: { size: 9 } } } }
            }
        });
    }

    // Chart 3: 累積利潤競爭 (Cumulative Profits)
    const ctxProfit = document.getElementById('chartProfit')?.getContext('2d');
    if (ctxProfit) {
        charts.profit = new Chart(ctxProfit, {
            type: 'line',
            data: {
                labels: ['Y0'],
                datasets: [
                    { label: 'SunPower', data: [5.8], borderColor: '#d97706', borderWidth: 3 },
                    { label: 'Sharp Solar', data: [85.0], borderColor: '#ef4444', borderWidth: 1.5, borderDash: [2, 2] },
                    { label: 'REC Group', data: [45.0], borderColor: '#10b981', borderWidth: 1.5, borderDash: [2, 2] },
                    { label: 'Q-Cells', data: [38.0], borderColor: '#6366f1', borderWidth: 1.5, borderDash: [2, 2] }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: commonPlugins,
                scales: { x: { grid: lightGrid, ticks: lightTicks }, y: { grid: lightGrid, ticks: lightTicks, title: { display: true, text: '累積利潤 ($M)', font: { size: 9 } } } }
            }
        });
    }

    // Chart 4: 市網平價走向 (LCOE vs Grid Price)
    const ctxGridParity = document.getElementById('chartGridParity')?.getContext('2d');
    if (ctxGridParity) {
        charts.gridParity = new Chart(ctxGridParity, {
            type: 'line',
            data: {
                labels: ['Y0'],
                datasets: [
                    { label: '傳統市電基準價格 (含碳稅)', data: [0.130], borderColor: '#dc2626', borderWidth: 2.5, borderDash: [3, 3] },
                    { label: 'SunPower 光伏度電成本 (LCOE)', data: [0.310], borderColor: '#0284c7', borderWidth: 3 }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: commonPlugins,
                scales: { x: { grid: lightGrid, ticks: lightTicks }, y: { grid: lightGrid, ticks: lightTicks, title: { display: true, text: '度電成本 ($/kWh)', font: { size: 9 } } } }
            }
        });
    }
}

function updateCharts() {
    const validHistory = sim.history.filter(h => h.year > 0);
    const labels = validHistory.map(h => `第 ${h.year} 年`);

    if (charts.learning) {
        charts.learning.data.labels = validHistory.map(h => `${h.companiesSnapshot[0].cumulativeProductionMW}MW`);
        charts.learning.data.datasets[0].data = validHistory.map(h => h.playerUnitCost);
        charts.learning.data.datasets[1].data = validHistory.map(h => h.companiesSnapshot[1].unitCostPerWatt);
        charts.learning.data.datasets[2].data = validHistory.map(h => h.companiesSnapshot[2].unitCostPerWatt);
        charts.learning.data.datasets[3].data = validHistory.map(h => h.companiesSnapshot[3].unitCostPerWatt);
        charts.learning.update();
    }

    if (charts.priceCost) {
        charts.priceCost.data.labels = labels;
        charts.priceCost.data.datasets[0].data = validHistory.map(h => h.playerPrice);
        charts.priceCost.data.datasets[1].data = validHistory.map(h => h.playerUnitCost);
        charts.priceCost.update();
    }

    if (charts.profit) {
        charts.profit.data.labels = labels;
        charts.profit.data.datasets[0].data = validHistory.map(h => h.playerCumulativeProfitM);
        charts.profit.data.datasets[1].data = validHistory.map(h => h.companiesSnapshot[1].cumulativeProfitM);
        charts.profit.data.datasets[2].data = validHistory.map(h => h.companiesSnapshot[2].cumulativeProfitM);
        charts.profit.data.datasets[3].data = validHistory.map(h => h.companiesSnapshot[3].cumulativeProfitM);
        charts.profit.update();
    }

    if (charts.gridParity) {
        charts.gridParity.data.labels = labels;
        charts.gridParity.data.datasets[0].data = validHistory.map(h => h.gridPowerPrice + (h.carbonTax * 0.0006));
        charts.gridParity.data.datasets[1].data = validHistory.map(h => h.playerLCOE);
        charts.gridParity.update();
    }
}

function exportCSV() {
    const validHistory = sim.history.filter(h => h.year > 0);
    if (validHistory.length === 0) {
        alert('尚無營運數據可供匯出！');
        return;
    }

    let csv = 'data:text/csv;charset=utf-8,\uFEFF';
    const headers = [
        '年度', '模組售價', '單位成本', '毛利率', '出貨量MW', '總產能MW', '市佔率',
        '營業收入M', '當期營業利益M', '累積營業利潤M', '度電成本LCOE', '市網電價', '市網平價狀態', '全球排名'
    ];
    csv += headers.join(',') + '\r\n';

    validHistory.forEach(r => {
        const row = [
            r.year,
            r.playerPrice,
            r.playerUnitCost,
            r.playerGrossMarginPct + '%',
            r.playerShipmentsMW,
            r.playerCapacityMW,
            r.playerMarketShare + '%',
            r.playerRevenueM,
            r.playerOperatingProfitM,
            r.playerCumulativeProfitM,
            r.playerLCOE,
            r.gridPowerPrice,
            r.gridParityStatus,
            r.playerRank
        ];
        csv += row.join(',') + '\r\n';
    });

    const encodedUri = encodeURI(csv);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SunPower_SolarPV_Simulation_Y${sim.currentYear - 1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==========================================
// Google 試算表 (Google Apps Script Webhook) 串接模組
// ==========================================

function setupGoogleSheetsModule() {
    const savedUrl = localStorage.getItem(STORAGE_KEY_WEBHOOK) || "";
    const savedClass = localStorage.getItem(STORAGE_KEY_CLASS) || "";
    const savedId = localStorage.getItem(STORAGE_KEY_ID) || "";
    const savedName = localStorage.getItem(STORAGE_KEY_NAME) || "";

    const elUrl = document.getElementById('inputWebhookUrl');
    const elClass = document.getElementById('inputClass');
    const elId = document.getElementById('inputId');
    const elName = document.getElementById('inputName');

    if (elUrl) elUrl.value = savedUrl;
    if (elClass) elClass.value = savedClass;
    if (elId) elId.value = savedId;
    if (elName) elName.value = savedName;

    const btnOpen = document.getElementById('btnOpenSubmitModal');
    if (btnOpen) btnOpen.addEventListener('click', openSubmitModal);

    const btnSubmit = document.getElementById('btnSubmitScore');
    if (btnSubmit) btnSubmit.addEventListener('click', submitToGoogleSheets);
}

function openSubmitModal() {
    const modal = document.getElementById('submitModal');
    if (!modal) return;

    const st = sim.getCurrentStatus();
    const p = st.player;

    setText('modalSummaryYear', `第 ${Math.min(st.maxYears, st.year)} 年 (${sim.isGameOver ? '挑戰已結算' : '進行中'})`);
    setText('modalSummaryProfit', `$${p.cumulativeProfitM.toFixed(1)}M (全球 #${st.playerRank})`);
    setText('modalSummaryUnitCost', `$${p.unitCostPerWatt.toFixed(2)}/W (售價 $${p.sellingPricePerWatt.toFixed(2)}/W)`);
    setText('modalSummaryParity', st.environment.gridParityAchieved ? `⚡ 已達成市網平價 (第${st.environment.gridParityYear}年)` : "尚未達成市網平價");

    const msgEl = document.getElementById('submitResultMsg');
    if (msgEl) msgEl.innerHTML = '';

    modal.classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
}

function closeSubmitModal() {
    const modal = document.getElementById('submitModal');
    if (modal) modal.classList.add('hidden');
}

function toggleWebhookConfig() {
    const el = document.getElementById('inputWebhookUrl');
    if (el) {
        el.focus();
        el.select();
    }
}

function submitToGoogleSheets() {
    const elUrl = document.getElementById('inputWebhookUrl');
    const elClass = document.getElementById('inputClass');
    const elId = document.getElementById('inputId');
    const elName = document.getElementById('inputName');
    const msgEl = document.getElementById('submitResultMsg');

    const webhookUrl = elUrl ? elUrl.value.trim() : "";
    const className = elClass ? elClass.value.trim() : "";
    const studentId = elId ? elId.value.trim() : "";
    const studentName = elName ? elName.value.trim() : "";

    if (!studentId || !studentName) {
        alert("請填寫「學號」與「姓名」！");
        return;
    }

    if (!webhookUrl) {
        alert("尚未填寫 Google Apps Script Webhook 網址！\n請先依據指引在 Google 試算表部署 Web 應用程式並貼上網址。");
        if (elUrl) elUrl.focus();
        return;
    }

    localStorage.setItem(STORAGE_KEY_WEBHOOK, webhookUrl);
    localStorage.setItem(STORAGE_KEY_CLASS, className);
    localStorage.setItem(STORAGE_KEY_ID, studentId);
    localStorage.setItem(STORAGE_KEY_NAME, studentName);

    const st = sim.getCurrentStatus();
    const p = st.player;
    const validHistory = sim.history.filter(h => h.year > 0);

    const yearlyLogs = validHistory.map(r => ({
        year: r.year,
        gridPowerPrice: r.gridPowerPrice,
        subsidyPerWatt: r.subsidyPerWatt,
        carbonTax: r.carbonTax,
        globalDemandMW: r.globalDemandMW,
        gridParityStatus: r.gridParityStatus,
        playerPrice: r.playerPrice,
        playerUnitCost: r.playerUnitCost,
        playerGrossMarginPct: r.playerGrossMarginPct,
        playerShipmentsMW: r.playerShipmentsMW,
        playerCapacityMW: r.playerCapacityMW,
        playerMarketShare: r.playerMarketShare,
        playerRevenueM: r.playerRevenueM,
        playerOperatingProfitM: r.playerOperatingProfitM,
        playerCumulativeProfitM: r.playerCumulativeProfitM,
        playerLCOE: r.playerLCOE,
        rank: r.playerRank,
        sharpProfitM: r.companiesSnapshot?.[1]?.cumulativeProfitM ?? 0,
        recProfitM: r.companiesSnapshot?.[2]?.cumulativeProfitM ?? 0,
        qcellsProfitM: r.companiesSnapshot?.[3]?.cumulativeProfitM ?? 0
    }));

    const payload = {
        action: "submit_two_sheet_solar",
        timestamp: new Date().toISOString(),
        summary: {
            className: className || "未填寫班級",
            studentId: studentId,
            studentName: studentName,
            finalRank: st.playerRank,
            cumulativeProfit: p.cumulativeProfitM,
            finalUnitCost: p.unitCostPerWatt,
            finalPrice: p.sellingPricePerWatt,
            finalCapacity: p.annualCapacityMW,
            finalRevenue: p.revenueM,
            gridParityStatus: st.environment.gridParityAchieved ? `已達成 (第${st.environment.gridParityYear}年)` : "未達成",
            statusResult: sim.isGameOver ? (sim.isWon ? "產業王者" : "已結算") : "進行中",
            gameOverReason: sim.gameOverReason || (sim.isGameOver ? "模擬已結算" : "挑戰進行中，尚未觸發結算通知"),
            totalLoggedYears: yearlyLogs.length
        },
        yearlyLogs: yearlyLogs
    };

    msgEl.innerHTML = `<span class="text-blue-600 flex items-center justify-center gap-1.5"><svg class="animate-spin h-3.5 w-3.5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> 正在將總成績與 ${yearlyLogs.length} 期太陽能營運明細同步寫入 Google 試算表...</span>`;

    fetch(webhookUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    })
    .then(() => {
        msgEl.innerHTML = `<span class="text-emerald-600 font-bold">✅ 成功！排行榜與 ${yearlyLogs.length} 期營運歷程已完整寫入 Google 試算表！</span>`;
        setTimeout(() => {
            closeSubmitModal();
        }, 2500);
    })
    .catch(err => {
        msgEl.innerHTML = `<span class="text-rose-600 font-bold">❌ 傳送失敗：${err.message}，請檢查網路或 Webhook 網址。</span>`;
    });
}

function setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}
