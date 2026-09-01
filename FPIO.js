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

            let activeGCs = Game.shimmerTypes['golden'].n;

            let html = `
                <div style="text-align: center; margin-bottom: 10px;">
                    <h3 style="color: #ecc45e; font-size: 18px; margin: 0;">FtHoF プランナー (v3.1.0)</h3>
                    <p style="font-size: 11px; color: #ccc; margin: 5px 0;">現在の総詠唱回数: <b style="color:#fff; font-size:14px;">${spellsCount}</b> 回</p>
                    <p style="font-size: 10px; color: #aaa; margin: 0;">同期：既存GC[${activeGCs}枚]</p>
                </div>
                <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left;">
                    <thead>
                        <tr style="border-bottom: 1px solid #555; color: #add8e6;">
                            <th style="padding: 4px;">先の手数</th>
                            <th style="padding: 4px;">総詠唱数</th>
                            <th style="padding: 4px;">成功時 (ゴールデン)</th>
                            <th style="padding: 4px;">失敗時 (ラース)</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            for (let i = 1; i <= 10; i++) {
                let futureCast = spellsCount + (i - 1);
                
                let successCookie = predictFtHoF(futureCast, 0, activeGCs);
                let backfireCookie = predictFtHoF(futureCast, 1, activeGCs);

                html += `
                    <tr style="border-bottom: 1px solid #333; background: ${i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent'};">
                        <td style="padding: 6px; color: #aaa;">+${i} 手目</td>
                        <td style="padding: 6px; font-weight: bold;">${futureCast}</td>
                        <td style="padding: 6px; color: #6f6;">${successCookie}</td>
                        <td style="padding: 6px; color: #f55;">${backfireCookie}</td>
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

        function predictFtHoF(spellsCast, backfire, gcs) {
            Math.seedrandom(Game.seed + '/' + spellsCast);
            
            Math.random(); 

            for (let k = 0; k < gcs; k++) Math.random();

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

            Math.seedrandom();

            return loc(choice) || choice;
        }
    },
    save: function() {},
    load: function() {}
});
