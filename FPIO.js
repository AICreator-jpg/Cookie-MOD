Game.registerMod("fthof_planner_internal", {
    init: function() {
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
                    renderFtHoFPlanner();
                }, 10);
                return result;
            };
        }

        function renderFtHoFPlanner() {
            if (Game.onMenu != 'prefs') return;

            let menu = document.getElementById('menu');
            if (!menu) return;

            let currentTower = Game.Objects['Wizard tower'];
            if (!currentTower || !currentTower.minigame) return;
            
            let M = currentTower.minigame;
            let spellsCount = M.spellsCastTotal;

            let existing = document.getElementById('custom-internal-fthof');
            if (existing) existing.remove();

            let div = document.createElement('div');
            div.id = 'custom-internal-fthof';
            div.className = 'listing';
            div.style.cssText = 'padding: 15px; border-top: 1px dashed #666; margin-top: 15px; background: rgba(0,0,0,0.4);';

            let html = `
                <div style="text-align: center; margin-bottom: 10px;">
                    <h3 style="color: #ecc45e; font-size: 18px; margin: 0;">FtHoF プランナー (v14.1.0)</h3>
                    <p style="font-size: 11px; color: #ccc; margin: 5px 0;">現在の総詠唱回数: <b style="color:#fff; font-size:14px;">${spellsCount}</b> 回</p>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 1px solid #555; color: #add8e6; text-align: center;">
                            <th style="padding: 4px; text-align: left; width: 10%;">Spell #</th>
                            <th style="padding: 4px; width: 10%;">総詠唱</th>
                            <th style="padding: 4px; color: #6f6; width: 20%;">通常 成功</th>
                            <th style="padding: 4px; color: #ffd700; width: 20%;">4季 成功</th>
                            <th style="padding: 4px; color: #f55; width: 20%;">通常 失敗</th>
                            <th style="padding: 4px; color: #ffb6c1; width: 20%;">4季 失敗</th>
                            <th style="padding: 4px; color: #ff7f50; width: 10%;">条件 (GC数)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            // 計算を開始する前の、ゲーム本来のピュアなMath.randomを一度だけ退避
            let absoluteOriginalRandom = Math.random;

            for (let i = 1; i <= 10; i++) {
                let futureCast = spellsCount + (i - 1);
                
                let normalSuccess = predictFtHoF(futureCast, 0, 0, absoluteOriginalRandom);
                let seasonSuccess = predictFtHoF(futureCast, 0, 1, absoluteOriginalRandom);
                let normalFail = predictFtHoF(futureCast, 1, 0, absoluteOriginalRandom);
                let seasonFail = predictFtHoF(futureCast, 1, 1, absoluteOriginalRandom);
                
                let failCondition = getFailCondition(futureCast, absoluteOriginalRandom);

                html += `
                    <tr style="border-bottom: 1px solid #333; text-align: center; background: ${i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent'};">
                        <td style="padding: 6px; text-align: left; color: #aaa;">+${i}</td>
                        <td style="padding: 6px; font-weight: bold;">${futureCast}</td>
                        <td style="padding: 6px; color: #6f6;">${normalSuccess}</td>
                        <td style="padding: 6px; color: #ffd700;">${seasonSuccess}</td>
                        <td style="padding: 6px; color: #f55;">${normalFail}</td>
                        <td style="padding: 6px; color: #ffb6c1;">${seasonFail}</td>
                        <td style="padding: 6px; color: #ff7f50; font-weight: bold;">${failCondition}</td>
                    </tr>
                `;
            }

            // すべてのセルの計算が完全に終わったら、ゲーム本来のMath.randomに完璧に戻す
            Math.random = absoluteOriginalRandom;

            html += `
                    </tbody>
                </table>
            `;

            div.innerHTML = html;
            menu.appendChild(div);
        }

        function predictFtHoF(spellsCast, backfire, isSeasonMod, originalRandom) {
            // シードを固定（これによってMath.randomがその手専用の関数にすり替わる）
            Math.seedrandom(Game.seed + '/' + spellsCast);
            
            // バックファイア確率判定用の消費
            Math.random(); 

            // シ즌変形があればさらに消費を進める
            if (isSeasonMod) Math.random();

            let choice = '';
            let auraLvl = Game.hasAura('Supreme Intellect');
            
            if (!backfire) {
                let r = Math.random();
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
                    if (Math.random() < 0.05) choice = 'blood frenzy';
                } else if (r < clickFrenzyChance + bldgSpecChance) {
                    choice = 'building special';
                } else if (r < clickFrenzyChance + bldgSpecChance + stormChance) {
                    choice = 'cookie storm';
                } else if (r < clickFrenzyChance + bldgSpecChance + stormChance + lumpChance) {
                    choice = 'sugar lump';
                } else {
                    if (Math.random() < 0.5) choice = 'frenzy';
                    else choice = 'multiply cookies';
                }
                
                let blabChance = 0.15;
                if (auraLvl) blabChance *= 1.1;
                if (Math.random() < blabChance) choice = 'blab';
            } else {
                let r = Math.random();
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
                    if (Math.random() < 0.05) choice = 'click frenzy';
                } else if (r < bloodFrenzyChance + cursedFingerChance) {
                    choice = 'cursed finger';
                } else if (r < bloodFrenzyChance + cursedFingerChance + stormChance) {
                    choice = 'cookie storm';
                } else if (r < bloodFrenzyChance + cursedFingerChance + stormChance + lumpChance) {
                    choice = 'sugar lump';
                } else {
                    if (Math.random() < 0.5) choice = 'clot';
                    else choice = 'ruins';
                }
                
                let blabChance = 0.1;
                if (auraLvl) blabChance *= 1.1;
                if (Math.random() < blabChance) choice = 'blab';
            }

            return loc(choice) || choice;
        }

        function getFailCondition(spellsCast, originalRandom) {
            Math.seedrandom(Game.seed + '/' + spellsCast);
            let failRoll = Math.random();

            let baseFailChance = 0.15;
            if (Game.hasAura('Supreme Intellect')) baseFailChance *= 1.1;
            if (Game.hasAura('Reality Bending')) baseFailChance *= 1.01;

            for (let gcs = 0; gcs <= 6; gcs++) {
                let actualFailChance = baseFailChance + (gcs * 0.15);
                if (failRoll < actualFailChance) {
                    return gcs.toString();
                }
            }
            return "6+";
        }
    },
    save: function() {},
    load: function() {}
});
