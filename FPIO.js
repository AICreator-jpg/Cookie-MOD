Game.registerMod("fthof_planner_internal", {
    init: function() {
        if (!Game.customOptionsMenu) Game.customOptionsMenu = [];
        Game.customOptionsMenu.push(function() {
            let currentTower = Game.Objects['Wizard tower'];
            if (!currentTower || !currentTower.minigame) return;
            
            let M = currentTower.minigame;
            let spellsCount = M.spellsCastTotal;
            let trueSeed = Game.seed || "unknown";

            let html = `
                <div class="listing" id="custom-internal-fthof" style="padding: 15px; border-top: 1px dashed #666; margin-top: 15px; background: rgba(0,0,0,0.4);">
                    <div style="text-align: center; margin-bottom: 10px;">
                        <h3 style="color: #ecc45e; font-size: 18px; margin: 0;">FtHoF プランナー (v30.0.0)</h3>
                        <p style="font-size: 11px; color: #ccc; margin: 5px 0;">アセンド固定シード: <b style="color:#ecc45e; font-family:monospace; font-size:13px;">${trueSeed}</b> | 現在の総詠唱回数: <b style="color:#fff; font-size:14px;">${spellsCount}</b> 回</p>
                    </div>
                    <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
                        <thead>
                            <tr style="border-bottom: 1px solid #555; color: #add8e6; text-align: center;">
                                <th style="padding: 4px; text-align: left; width: 8%;">Spell #</th>
                                <th style="padding: 4px; width: 8%;">総詠唱</th>
                                <th style="padding: 4px; width: 14%;">Random Seed</th>
                                <th style="padding: 4px; color: #6f6; width: 18%;">通常 成功</th>
                                <th style="padding: 4px; color: #ffd700; width: 18%;">4季 成功</th>
                                <th style="padding: 4px; color: #f55; width: 18%;">通常 失敗</th>
                                <th style="padding: 4px; color: #ffb6c1; width: 18%;">4季 失敗</th>
                                <th style="padding: 4px; color: #ff7f50; width: 6%;">GC数</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            for (let i = 1; i <= 10; i++) {
                let futureCast = spellsCount + (i - 1);
                
                let localRngForSeed = new Game.math.seedrandom(trueSeed + '/' + futureCast);
                localRngForSeed();
                let rawSeedValue = localRngForSeed();

                let normalSuccess = Game.mods['fthof_planner_internal'].predictFtHoF(futureCast, 0, 0, trueSeed);
                let seasonSuccess = Game.mods['fthof_planner_internal'].predictFtHoF(futureCast, 0, 1, trueSeed);
                let normalFail = Game.mods['fthof_planner_internal'].predictFtHoF(futureCast, 1, 0, trueSeed);
                let seasonFail = Game.mods['fthof_planner_internal'].predictFtHoF(futureCast, 1, 1, trueSeed);
                
                let failCondition = Game.mods['fthof_planner_internal'].getFailCondition(futureCast, trueSeed);

                html += `
                    <tr style="border-bottom: 1px solid #333; text-align: center; background: ${i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent'};">
                        <td style="padding: 6px; text-align: left; color: #aaa;">+${i}</td>
                        <td style="padding: 6px; font-weight: bold;">${futureCast}</td>
                        <td style="padding: 6px; font-family: monospace; color: #add8e6;">${rawSeedValue.toFixed(6)}</td>
                        <td style="padding: 6px; color: #6f6;">${normalSuccess}</td>
                        <td style="padding: 6px; color: #ffd700;">${seasonSuccess}</td>
                        <td style="padding: 6px; color: #f55;">${normalFail}</td>
                        <td style="padding: 6px; color: #ffb6c1;">${seasonFail}</td>
                        <td style="padding: 6px; color: #ff7f50; font-weight: bold;">${failCondition}</td>
                    </tr>
                `;
            }

            html += `
                        </tbody>
                    </table>
                </div>
            `;
            
            CCSE.AppendOptionsMenu(html);
        });
    },
