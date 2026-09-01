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
                    <h3 style="color: #ecc45e; font-size: 18px; margin: 0;">FtHoF プランナー (v6.0.0)</h3>
                    <p style="font-size: 11px; color: #ccc; margin: 5px 0;">現在の総詠唱回数: <b style="color:#fff; font-size:14px;">${spellsCount}</b> 回</p>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 11px; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 1px solid #555; color: #add8e6; text-align: center;">
                            <th style="padding: 4px; text-align: left;">先の手数</th>
                            <th style="padding: 4px;">総詠唱</th>
                            <th style="padding: 4px; color: #ffd700;">シーズン無 / クリスマス</th>
                            <th style="padding: 4px; color: #ffb6c1;">特定4シーズン</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            for (let i = 1; i <= 10; i++) {
                let futureCast = spellsCount + (i - 1);
                
                let normalResult = calculateFtHoFOutcome(futureCast, 0);
                let seasonResult = calculateFtHoFOutcome(futureCast, 1);

                html += `
                    <tr style="border-bottom: 1px solid #333; text-align: center; background: ${i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent'};">
                        <td style="padding: 6px; text-align: left; color: #aaa;">+${i} 手目</td>
                        <td style="padding: 6px; font-weight: bold;">${futureCast}</td>
                        <td style="padding: 6px;">${normalResult}</td>
                        <td style="padding: 6px;">${seasonResult}</td>
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

        function calculateFtHoFOutcome(spellsCast, isSeasonMod) {
            Math.seedrandom(Game.seed + '/' + spellsCast);
            
            let backfireRoll = Math.random();
            if (isSeasonMod) Math.random();

            let baseFailChance = 0.15;
            if (Game.hasAura('Supreme Intellect')) baseFailChance *= 1.1;
            if (Game.hasAura('Reality Bending')) baseFailChance *= 1.01;

            let neededGCsToFail = "N";
            for (let gcs = 0; gcs <= 4; gcs++) {
                let actualFailChance = baseFailChance + (gcs * 0.15);
                if (backfireRoll < actualFailChance) {
                    neededGCsToFail = gcs.toString();
                    break;
                }
            }

            let isBackfire = false;
            let currentGCs = Game.shimmerTypes['golden'].n;
            let currentFailChance = baseFailChance + (currentGCs * 0.15);
            if (backfireRoll < currentFailChance) {
                isBackfire = true;
            }

            let choice = '';
            let auraLvl = Game.hasAura('Supreme Intellect');
            
            if (!isBackfire) {
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

            Math.seedrandom();

            let color = isBackfire ? '#f55' : '#6f6';
            let localizedName = loc(choice) || choice;
            return `<span style="color: ${color};">${localizedName}</span> <span style="color: #ff7f50; font-weight: bold; font-size: 10px;">(${neededGCsToFail})</span>`;
        }
    },
    save: function() {},
    load: function() {}
});
