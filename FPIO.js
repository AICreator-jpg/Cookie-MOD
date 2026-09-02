Game.registerMod("fthof_planner_internal", {
    init: function() {
        Game.fthof_planner_cache = [];
        Game.fthof_planner_last_count = -1;

        let oldUpdateMenu = Game.UpdateMenu;
        Game.UpdateMenu = function() {
            oldUpdateMenu();
            renderFtHoFPlanner();
        };

        let tower = Game.Objects['Wizard tower'];
        if (tower && tower.minigame) {
            let M = tower.minigame;
            let oldCastSpell = M.castSpell;
            M.castSpell = function(spell, obj) {
                let result = oldCastSpell(spell, obj);
                setTimeout(function() {
                    updateFtHoFPlannerCache();
                    renderFtHoFPlanner();
                }, 10);
                return result;
            };
        }

        function updateFtHoFPlannerCache() {
            let currentTower = Game.Objects['Wizard tower'];
            if (!currentTower || !currentTower.minigame || !Math.seedrandom) return;
            
            let M = currentTower.minigame;
            let spellsCount = M.spellsCastTotal;
            
            if (spellsCount === Game.fthof_planner_last_count && Game.fthof_planner_cache.length > 0) return;
            
            Game.fthof_planner_cache = [];
            Game.fthof_planner_last_count = spellsCount;
            let trueSeed = Game.seed || "unknown";

            for (let i = 1; i <= 10; i++) {
                let futureCast = spellsCount + (i - 1);
                
                let localRngForSeed = Math.seedrandom(trueSeed + futureCast, { global: false });
                localRngForSeed();
                let rawSeedValue = localRngForSeed();

                let normalSuccess = predictRawFtHoF(futureCast, 0, 0, trueSeed);
                let seasonSuccess = predictRawFtHoF(futureCast, 0, 1, trueSeed);
                let normalFail = predictRawFtHoF(futureCast, 1, 0, trueSeed);
                let seasonFail = predictRawFtHoF(futureCast, 1, 1, trueSeed);
                
                let failCondition = getRawFailCondition(rawSeedValue);

                Game.fthof_planner_cache.push({
                    futureCast: futureCast,
                    rawSeed: rawSeedValue.toFixed(6),
                    normalSuccess: normalSuccess,
                    seasonSuccess: seasonSuccess,
                    normalFail: normalFail,
                    seasonFail: seasonFail,
                    failCondition: failCondition
                });
            }
        }
        function predictRawFtHoF(spellsCast, backfire, isSeasonMod, trueSeed) {
            let localRng = Math.seedrandom(trueSeed + spellsCast, { global: false });
            localRng();
            let choice = '';
            let auraLvl = Game.hasAura('supreme intellect');
            if (!backfire) {
                let r = localRng();
                let clickFrenzyChance = 0.15;
                let bldgSpecChance = 0.1;
                let stormChance = 0.1;
                let lumpChance = 0.01;
                if (auraLvl) {
                    clickFrenzyChance *= 1.1;
                    bldgSpecChance *= 1.1;
                    stormChance *= 1.1;
                    lumpChance *= 1.1;
                }
                if (r < clickFrenzyChance) {
                    choice = 'click frenzy';
                    if (localRng() < 0.05) choice = 'blood frenzy';
                } else if (r < clickFrenzyChance + bldgSpecChance) {
                    choice = 'building special';
                } else if (r < clickFrenzyChance + bldgSpecChance + stormChance) {
                    choice = 'cookie storm';
                } else if (r < clickFrenzyChance + bldgSpecChance + stormChance + lumpChance) {
                    choice = 'sugar lump';
                } else {
                    let list = ['frenzy', 'multiply cookies'];
                    if (isSeasonMod) list.push('season_placeholder_cookie');
                    choice = list[Math.floor(localRng() * list.length)];
                    if (choice === 'season_placeholder_cookie') {
                        choice = 'frenzy'; 
                    }
                }
                let blabChance = 0.15;
                if (auraLvl) blabChance *= 1.1;
                if (localRng() < blabChance) choice = 'blab';
            } else {
                let r = localRng();
                let bloodFrenzyChance = 0.1;
                let cursedFingerChance = 0.1;
                let stormChance = 0.1;
                let lumpChance = 0.003;
                if (auraLvl) {
                    bloodFrenzyChance *= 1.1;
                    cursedFingerChance *= 1.1;
                    stormChance *= 1.1;
                    lumpChance *= 1.1;
                }
                if (r < bloodFrenzyChance) {
                    choice = 'blood frenzy';
                    if (localRng() < 0.05) choice = 'click frenzy';
                } else if (r < bloodFrenzyChance + cursedFingerChance) {
                    choice = 'cursed finger';
                } else if (r < bloodFrenzyChance + cursedFingerChance + stormChance) {
                    choice = 'cookie storm';
                } else if (r < bloodFrenzyChance + cursedFingerChance + stormChance + lumpChance) {
                    choice = 'sugar lump';
                } else {
                    let list = ['clot', 'ruins'];
                    if (isSeasonMod) list.push('season_placeholder_cookie');
                    choice = list[Math.floor(localRng() * list.length)];
                    if (choice === 'season_placeholder_cookie') {
                        choice = 'clot'; 
                    }
                }
                let blabChance = 0.1;
                if (auraLvl) blabChance *= 1.1;
                if (localRng() < blabChance) choice = 'blab';
            }
            return loc(choice) || choice;
        }

        function getRawFailCondition(rawSeedValue) {
            let neededGCs = Math.floor((1 - rawSeedValue) / 0.15);
            if (neededGCs <= 0) return "0";
            if (neededGCs > 6) return "6+";
            return neededGCs.toString();
        }

        function renderFtHoFPlanner() {
            if (Game.onMenu != 'prefs') return;

            let menu = document.getElementById('menu');
            if (!menu) return;

            updateFtHoFPlannerCache();

            let existing = document.getElementById('custom-internal-fthof');
            if (existing) existing.remove();

            let div = document.createElement('div');
            div.id = 'custom-internal-fthof';
            div.className = 'listing';
            div.style.cssText = 'padding: 15px; border-top: 1px dashed #666; margin-top: 15px; background: rgba(0,0,0,0.4);';

            let trueSeed = Game.seed || "unknown";

            let html = `
                <div style="text-align: center; margin-bottom: 10px;">
                    <h3 style="color: #ecc45e; font-size: 18px; margin: 0;">FtHoF プランナー (v51.0.0)</h3>
                    <p style="font-size: 11px; color: #ccc; margin: 5px 0;">アセンド固定シード: <b style="color:#ecc45e; font-family:monospace; font-size:13px;">${trueSeed}</b> | 現在の総詠唱回数: <b style="color:#fff; font-size:14px;">${Game.fthof_planner_last_count}</b> 回</p>
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

            for (let i = 0; i < Game.fthof_planner_cache.length; i++) {
                let data = Game.fthof_planner_cache[i];
                html += `
                    <tr style="border-bottom: 1px solid #333; text-align: center; background: ${(i + 1) % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent'};">
                        <td style="padding: 6px; text-align: left; color: #aaa;">+${i + 1}</td>
                        <td style="padding: 6px; font-weight: bold;">${data.futureCast}</td>
                        <td style="padding: 6px; font-family: monospace; color: #add8e6;">${data.rawSeed}</td>
                        <td style="padding: 6px; color: #6f6;">${data.normalSuccess}</td>
                        <td style="padding: 6px; color: #ffd700;">${data.seasonSuccess}</td>
                        <td style="padding: 6px; color: #f55;">${data.normalFail}</td>
                        <td style="padding: 6px; color: #ffb6c1;">${data.seasonFail}</td>
                        <td style="padding: 6px; color: #ff7f50; font-weight: bold;">${data.failCondition}</td>
                    </tr>
                `;
            }

            html += `
                    </tbody>
                </table>
            `;

            div.innerHTML = html;
            menu.appendChild(div);
        }
    },
    save: function() {},
    load: function() {}
});
