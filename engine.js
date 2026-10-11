/**
 * Eclipsing the Competition: The Solar PV Industry Simulation
 * 核心模擬演算法與學習曲線動態模型 (Learning Curve & PV System Dynamics Engine)
 * 
 * 參考文獻與模型來源：
 * 1. Henderson, Rebecca M., Joel Conkling, and Scott Roberts. (2007)
 *    "SunPower: Focused on the Future of Solar Power" MIT Sloan Case 07-042.
 * 2. Sterman, John. (2014)
 *    "Interactive web-based simulations for strategy and sustainability:
 *     The MIT Sloan LearningEdge management flight simulators, Part I"
 *     System Dynamics Review, 30(1–2), 89–121.
 * 3. IPCC (2011) Special Report on Renewable Energy Sources and Climate Change Mitigation.
 */

class SolarPVEngine {
    constructor() {
        this.reset();
    }

    reset(customConfig = {}) {
        this.currentYear = 1;
        this.maxYears = customConfig.maxYears || 15; // 支援 15 年決策週期 (2006 ~ 2020)
        this.isGameOver = false;
        this.gameOverReason = "";
        this.isWon = false;

        // ---- 1. 總體電網環境與政策參數 (Macro Environment & Grid Parity) ----
        this.environment = {
            // 傳統市電基準價格 (Grid Electricity Price: $/kWh)
            // 2005 年加州約 $0.13/kWh，每年預期緩步上漲 3%
            gridPowerPrice: 0.130,
            gridPowerGrowthRate: 0.03,

            // 碳稅政策 (Carbon Tax: $/ton CO2，每增加 $10 碳稅約使傳統化石電力成本提高 $0.006/kWh)
            carbonTaxPerTon: 0.0,
            carbonTaxRateAnnual: 2.0, // 每年碳稅遞增 $2/ton

            // 太陽能政府補助 (Government Subsidies: $/Watt)
            // 2005/2006 加州太陽能倡議 (CSI) 補助約 $2.60/W，預計隨市場成熟每年遞減 12%
            subsidyPerWatt: 2.60,
            subsidyPhaseoutRate: 0.12,

            // 市網平價門檻判定 (Grid Parity)
            gridParityAchieved: false,
            gridParityYear: null,

            // 全球光伏市場基底需求 (MW)，2005 年約 1,800 MW，年增長率具備高彈性
            globalBaseDemandMW: 1800,
            currentGlobalDemandMW: 1800
        };

        // ---- 2. 學習曲線與製程改善參數 (Learning Curve Dynamics) ----
        // 經典學習曲線: c_t = c_0 * (Q_t / Q_0)^(-b)
        // 進步比率 (Progress Ratio) PR = 2^(-b)
        // 太陽能行業經驗 PR 約為 80% (學習率 20%，累積產量每翻一番，單位成本下降 20%)
        this.learningParams = {
            progressRatio: 0.80,         // PR = 80%
            learningExponent: 0.3219,    // b = -ln(0.80)/ln(2) = 0.3219
            knowledgeSpilloverRate: 0.25 // 跨廠商技術外溢率 (25% 的外部產量貢獻於通用製程改善)
        };

        // ---- 3. 四大太陽能模組製造商 (Four Competitors) ----
        // 依據個案：SunPower、Sharp Solar (當時龍頭)、REC Group (一體化)、Q-Cells / 晶澳 (規模化主流)
        this.companies = [
            {
                id: "sunpower",
                name: "SunPower (您的公司)",
                isPlayer: true,
                technology: "背接觸超高轉換效率單晶矽 (Maxeon Back-Contact, 22% Efficiency)",
                moduleEfficiency: 0.215,     // 21.5% 轉換效率 (業界最高，屋頂單位面積發電量多 50%)
                cumulativeProductionMW: 85,  // 2005 累積產量 (MW)
                annualCapacityMW: 65,        // 2006 產能
                unitCostPerWatt: 3.80,       // 初始單位成本 ($/Watt)
                sellingPricePerWatt: 4.80,   // 初始模組售價 ($/Watt)
                processImprovementBudgetPct: 0.12, // 製程改善/R&D 預算佔營收比 (12%)
                
                // 營運成果
                shipmentsMW: 0,
                marketSharePct: 0,
                revenueM: 0,
                cogsM: 0,
                rdExpenseM: 0,
                operatingProfitM: 0,
                cumulativeProfitM: 0,
                levelizedCostOfEnergy: 0.31  // 平準化度電成本 LCOE ($/kWh)
            },
            {
                id: "sharp",
                name: "Sharp Solar (夏普: 當時全球龍頭)",
                isPlayer: false,
                strategy: "industry_incumbent", // 規模龍頭，標準工藝，高累積經驗
                technology: "標準多晶矽技術 (Standard Poly-Si, 14.5% Efficiency)",
                moduleEfficiency: 0.145,
                cumulativeProductionMW: 1200, // 歷史產量最大
                annualCapacityMW: 450,
                unitCostPerWatt: 3.40,
                sellingPricePerWatt: 4.40,
                processImprovementBudgetPct: 0.08,
                shipmentsMW: 0,
                marketSharePct: 0,
                revenueM: 0,
                operatingProfitM: 0,
                cumulativeProfitM: 0,
                levelizedCostOfEnergy: 0.33
            },
            {
                id: "rec",
                name: "REC Group (挪威可再生能源: 全產業鏈垂直整合)",
                isPlayer: false,
                strategy: "vertical_integration", // 掌控多晶矽原料至模組，原料缺貨時具備成本優勢
                technology: "多晶矽全垂直整合 (Integrated Ingot-Wafer-Cell, 15.0% Efficiency)",
                moduleEfficiency: 0.150,
                cumulativeProductionMW: 500,
                annualCapacityMW: 280,
                unitCostPerWatt: 3.50,
                sellingPricePerWatt: 4.50,
                processImprovementBudgetPct: 0.07,
                shipmentsMW: 0,
                marketSharePct: 0,
                revenueM: 0,
                operatingProfitM: 0,
                cumulativeProfitM: 0,
                levelizedCostOfEnergy: 0.34
            },
            {
                id: "qcells",
                name: "Q-Cells / 亞洲製造巨頭 (規模擴張激進者)",
                isPlayer: false,
                strategy: "aggressive_capacity", // 快速擴建巨型產能，激進降價搶市佔
                technology: "大產能多晶矽模組 (Mass Production Poly-Si, 14.8% Efficiency)",
                moduleEfficiency: 0.148,
                cumulativeProductionMW: 600,
                annualCapacityMW: 400,
                unitCostPerWatt: 3.45,
                sellingPricePerWatt: 4.25,
                processImprovementBudgetPct: 0.06,
                shipmentsMW: 0,
                marketSharePct: 0,
                revenueM: 0,
                operatingProfitM: 0,
                cumulativeProfitM: 0,
                levelizedCostOfEnergy: 0.35
            }
        ];

        // 歷史軌跡與日誌
        this.history = [];
        this.recordHistoryInitial();
    }

    /**
     * 計算平準化度電成本 (Levelized Cost of Electricity, LCOE: $/kWh)
     * 依據個案 Exhibit 2 3.0 kW 系統折舊、日照、逆變器與 BOS 成本精確公式
     * 高效率模組 (SunPower 21.5% vs 14.5%) 顯著降低 BOS (平衡系統、支架、安裝屋頂面積)
     */
    calculateLCOE(modulePricePerWatt, efficiency, subsidyPerWatt, isUnsubsidized = false) {
        // BOS (Balance of System) 與安裝人工成本：高效率模組可節省 20%~30% 屋頂安裝成本
        const baseBOS = 3.20 * (0.15 / efficiency); // 效率越高，BOS 成本越低
        const effectiveSubsidy = isUnsubsidized ? 0 : subsidyPerWatt;
        const netInstalledCostPerWatt = Math.max(0.5, (modulePricePerWatt - effectiveSubsidy) + baseBOS);

        // 假設平均日照 5.25 小時/天 (加州條件)，系統壽命 25 年，折現率 5%
        // 每 Watt 年發電量約 1.53 kWh
        const annualOutputPerWatt = 5.25 * 365 * 0.80 / 1000; // 約 1.533 kWh
        const capitalRecoveryFactor = 0.071; // 25 年 5% 折現率資本回收係數
        const oAndMCostPerKWh = 0.012; // 維護與逆變器更換

        const lcoe = (netInstalledCostPerWatt * capitalRecoveryFactor) / annualOutputPerWatt + oAndMCostPerKWh;
        return Math.round(lcoe * 1000) / 1000;
    }

    /**
     * 總體市場需求函數 (Market Demand Dynamics)
     * 光伏需求受「電價競爭力（LCOE vs 市電價格）」與全球低碳補貼強烈驅動
     */
    calculateGlobalDemand() {
        const gridPrice = this.environment.gridPowerPrice + (this.environment.carbonTaxPerTon * 0.0006);
        
        // 四大廠商平均 LCOE
        const avgLCOE = this.companies.reduce((acc, c) => acc + c.levelizedCostOfEnergy, 0) / this.companies.length;
        
        // 需求價格彈性模型：當 LCOE 接近或低於電網價格時，需求呈現 S 型指數爆發 (Bass Diffusion / Adoption)
        const priceParityRatio = gridPrice / avgLCOE;
        let growthMultiplier = 1.25; // 基礎年複合成長率 25%

        if (priceParityRatio >= 1.0) {
            // 達到市網平價！爆發性採購
            growthMultiplier = 1.45 + (priceParityRatio - 1.0) * 0.5;
            if (!this.environment.gridParityAchieved) {
                this.environment.gridParityAchieved = true;
                this.environment.gridParityYear = this.currentYear;
            }
        } else if (priceParityRatio >= 0.8) {
            growthMultiplier = 1.32;
        }

        this.environment.currentGlobalDemandMW = Math.round(this.environment.currentGlobalDemandMW * growthMultiplier);
    }

    /**
     * AI 競爭對手的自動決策生成
     */
    generateAIDecisions() {
        this.companies.filter(c => !c.isPlayer).forEach(ai => {
            // AI 定價邏輯：根據自身當前單位成本，加上合理毛利率加成 (Mark-up)
            let markup = 0.20;
            if (ai.strategy === "aggressive_capacity") {
                markup = 0.12; // 激進薄利多銷
            } else if (ai.strategy === "industry_incumbent") {
                markup = 0.22; // 龍頭利潤保衛
            } else {
                markup = 0.18;
            }

            ai.sellingPricePerWatt = Math.max(0.3, Math.round(ai.unitCostPerWatt * (1 + markup) * 100) / 100);

            // AI 自動產能擴充：若產能利用率高，擴充 25%~35%
            ai.annualCapacityMW = Math.round(ai.annualCapacityMW * (1.20 + Math.random() * 0.15));
        });
    }

    /**
     * 多項羅吉特市場分配 (Multinomial Logit Market Share Allocation)
     * 消費者權衡「性價比」：有效售價 ($/Watt) 與發電效率 (Efficiency Advantage)
     */
    allocateMarketShare(totalDemandMW) {
        // 吸引力分數 Attraction: exp(alpha * Efficiency - beta * Price)
        const scores = this.companies.map(c => {
            const effBonus = (c.moduleEfficiency - 0.14) * 25.0; // 高效率換算價值折抵
            const effectivePrice = c.sellingPricePerWatt - effBonus;
            return Math.exp(-1.8 * effectivePrice);
        });

        const totalScore = scores.reduce((a, b) => a + b, 0);
        const desiredShares = scores.map(s => s / totalScore);

        // 產能約束分配
        this.companies.forEach((c, idx) => {
            const desiredMW = Math.round(desiredShares[idx] * totalDemandMW);
            c.shipmentsMW = Math.min(c.annualCapacityMW, desiredMW);
            c.marketSharePct = totalDemandMW > 0 ? Math.round((c.shipmentsMW / totalDemandMW) * 1000) / 10 : 0;
        });
    }

    /**
     * 核心學習曲線成本下降更新 (Wright's Law + Process Improvement)
     */
    updateLearningCurveCosts() {
        // 全球行業總產出
        const industryAnnualMW = this.companies.reduce((a, c) => a + c.shipmentsMW, 0);

        this.companies.forEach(c => {
            const prevCumul = c.cumulativeProductionMW;
            // 自身累積產量增加
            c.cumulativeProductionMW += c.shipmentsMW;

            // 知識溢出：部分來自同業通用裝備改進 (Equipment vendor spillovers)
            const spilloverMW = (industryAnnualMW - c.shipmentsMW) * this.learningParams.knowledgeSpilloverRate;
            const effectiveExperienceRatio = (c.cumulativeProductionMW + spilloverMW) / (prevCumul + spilloverMW * 0.5);

            // 經典經驗曲線下降因子: (Q_t / Q_0)^(-b)
            const experienceCostFactor = Math.pow(effectiveExperienceRatio, -this.learningParams.learningExponent);

            // 自主製程改善投入 (Process Improvement Budget) 帶來的額外效率推動力
            const rAndDExtraBoost = 1.0 - (c.processImprovementBudgetPct * 0.28);

            // 更新單位成本 (有技術極限保底 $0.25/W)
            const newCost = Math.max(0.25, c.unitCostPerWatt * experienceCostFactor * rAndDExtraBoost);
            c.unitCostPerWatt = Math.round(newCost * 100) / 100;

            // 更新 LCOE
            c.levelizedCostOfEnergy = this.calculateLCOE(c.sellingPricePerWatt, c.moduleEfficiency, this.environment.subsidyPerWatt);
        });
    }

    /**
     * 執行一年商業營運與學習曲線競賽
     * @param {Object} playerDecisions 玩家決策 { modulePrice, capacityExpansionMW, processImprovementBudgetPct }
     */
    step(playerDecisions) {
        if (this.isGameOver) return;

        const player = this.companies.find(c => c.isPlayer);

        // 1. 套用玩家決策
        player.sellingPricePerWatt = Math.max(0.20, Math.min(10.0, parseFloat(playerDecisions.modulePrice || 4.80)));
        const expandCapacity = Math.max(0, parseInt(playerDecisions.capacityExpansionMW || 35));
        player.annualCapacityMW += expandCapacity;
        player.processImprovementBudgetPct = Math.max(0.01, Math.min(0.35, parseFloat(playerDecisions.processImprovementBudgetPct || 0.12)));

        // 2. 更新宏觀環境與政策變化 (市電漲價、碳稅增加、補貼退坡)
        this.environment.gridPowerPrice = Math.round(this.environment.gridPowerPrice * (1 + this.environment.gridPowerGrowthRate) * 1000) / 1000;
        this.environment.carbonTaxPerTon += this.environment.carbonTaxRateAnnual;
        this.environment.subsidyPerWatt = Math.max(0, Math.round(this.environment.subsidyPerWatt * (1 - this.environment.subsidyPhaseoutRate) * 100) / 100);

        // 3. AI 決策與總體市場需求計算
        this.generateAIDecisions();
        this.calculateGlobalDemand();

        // 4. 市場份額分配
        this.allocateMarketShare(this.environment.currentGlobalDemandMW);

        // 5. 財務結算 (損益表)
        this.companies.forEach(c => {
            // 模組出貨量 (MW) * 1,000,000 = Watts
            const totalWatts = c.shipmentsMW * 1000000;
            c.revenueM = Math.round((totalWatts * c.sellingPricePerWatt) / 1000000 * 10) / 10;
            c.cogsM = Math.round((totalWatts * c.unitCostPerWatt) / 1000000 * 10) / 10;
            c.rdExpenseM = Math.round(c.revenueM * c.processImprovementBudgetPct * 10) / 10;

            // 營業利益 EBIT
            c.operatingProfitM = Math.round((c.revenueM - c.cogsM - c.rdExpenseM) * 10) / 10;
            c.cumulativeProfitM = Math.round((c.cumulativeProfitM + c.operatingProfitM) * 10) / 10;
        });

        // 6. 學習曲線與成本更新 (Wright's Law)
        this.updateLearningCurveCosts();

        // 7. 判定結算勝負
        const sorted = [...this.companies].sort((a, b) => b.cumulativeProfitM - a.cumulativeProfitM);
        const playerRank = sorted.findIndex(c => c.id === "sunpower") + 1;

        if (player.cumulativeProfitM < -150) {
            this.isGameOver = true;
            this.isWon = false;
            this.gameOverReason = `【重大財務虧損危機】在第 ${this.currentYear} 年，因過度激進降價低於成本或 R&D 支出失控，累計虧損達 $${Math.abs(player.cumulativeProfitM)}M，現金流斷裂被迫進行債務重組！`;
        } else if (this.currentYear >= this.maxYears) {
            this.isGameOver = true;
            this.isWon = (playerRank === 1);

            if (this.isWon) {
                this.gameOverReason = `【榮登太陽能產業王者 (Eclipsing the Competition)】完成 ${this.maxYears} 年營運！SunPower 以累計營業利潤 $${player.cumulativeProfitM}M 榮登全球第 1 名！單位成本降至 $${player.unitCostPerWatt}/W，成功引領全球實現市網平價 (Grid Parity)！`;
            } else {
                this.gameOverReason = `【完成 ${this.maxYears} 年營運挑戰】您的累計利潤為 $${player.cumulativeProfitM}M（全球排名第 ${playerRank} 名，單位成本 $${player.unitCostPerWatt}/W）。面对夏普與亞洲巨頭的產能狂潮，您守住了高端技術陣地，但規模經濟擴張節奏仍有進一步優化空間。`;
            }
        }

        // 8. 記錄歷史日誌
        this.recordHistory();

        // 推進年度
        this.currentYear++;
    }

    recordHistoryInitial() {
        const player = this.companies[0];
        this.history.push({
            year: 0,
            gridPowerPrice: this.environment.gridPowerPrice,
            subsidyPerWatt: this.environment.subsidyPerWatt,
            carbonTax: this.environment.carbonTaxPerTon,
            globalDemandMW: this.environment.currentGlobalDemandMW,
            gridParityStatus: "尚未平價",

            // SunPower 初始指標
            playerPrice: player.sellingPricePerWatt,
            playerUnitCost: player.unitCostPerWatt,
            playerGrossMarginPct: Math.round(((player.sellingPricePerWatt - player.unitCostPerWatt) / player.sellingPricePerWatt) * 100),
            playerShipmentsMW: 20.5, // 2005 實際出貨
            playerCapacityMW: player.annualCapacityMW,
            playerMarketShare: 4.5,
            playerRevenueM: 78.7,    // 2005 實際營收
            playerOperatingProfitM: 5.8,
            playerCumulativeProfitM: 5.8,
            playerLCOE: player.levelizedCostOfEnergy,
            playerRank: 1,

            companiesSnapshot: JSON.parse(JSON.stringify(this.companies))
        });
    }

    recordHistory() {
        const player = this.companies.find(c => c.isPlayer);
        const sorted = [...this.companies].sort((a, b) => b.cumulativeProfitM - a.cumulativeProfitM);
        const playerRank = sorted.findIndex(c => c.id === "sunpower") + 1;

        const grossMargin = player.sellingPricePerWatt > 0 
            ? Math.round(((player.sellingPricePerWatt - player.unitCostPerWatt) / player.sellingPricePerWatt) * 100) 
            : 0;

        const record = {
            year: this.currentYear,
            gridPowerPrice: this.environment.gridPowerPrice,
            subsidyPerWatt: this.environment.subsidyPerWatt,
            carbonTax: this.environment.carbonTaxPerTon,
            globalDemandMW: this.environment.currentGlobalDemandMW,
            gridParityStatus: this.environment.gridParityAchieved ? `已平價 (第${this.environment.gridParityYear}年)` : "尚未平價",

            // 玩家決策與狀態
            playerPrice: player.sellingPricePerWatt,
            playerUnitCost: player.unitCostPerWatt,
            playerGrossMarginPct: grossMargin,
            playerShipmentsMW: player.shipmentsMW,
            playerCapacityMW: player.annualCapacityMW,
            playerMarketShare: player.marketSharePct,
            playerRevenueM: player.revenueM,
            playerOperatingProfitM: player.operatingProfitM,
            playerCumulativeProfitM: player.cumulativeProfitM,
            playerLCOE: player.levelizedCostOfEnergy,
            playerRank: playerRank,

            // 四大巨頭競爭快照
            companiesSnapshot: JSON.parse(JSON.stringify(this.companies))
        };

        this.history.push(record);
    }

    getCurrentStatus() {
        const player = this.companies.find(c => c.isPlayer);
        const sorted = [...this.companies].sort((a, b) => b.cumulativeProfitM - a.cumulativeProfitM);
        const playerRank = sorted.findIndex(c => c.id === "sunpower") + 1;

        return {
            year: this.currentYear,
            maxYears: this.maxYears,
            environment: this.environment,
            companies: this.companies,
            player: player,
            playerRank: playerRank,
            isGameOver: this.isGameOver,
            isWon: this.isWon,
            gameOverReason: this.gameOverReason
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = SolarPVEngine;
}
