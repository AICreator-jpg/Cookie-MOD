Game.registerMod("fthof_planner_internal", {
    init: function() {
        Game.fthof_planner_html_cache = "";
        Game.fthof_planner_last_count = -1;

        let oldUpdateMenu = Game.UpdateMenu;
        Game.UpdateMenu = function() {
            oldUpdateMenu();
            injectFtHoFPlannerUI();
        };

        if (Game.registerSpellCastHook) {
            Game.registerSpellCastHook(function() {
                triggerPlannerRecalculation();
            });
        }

        let tower = Game.Objects['Wizard tower'];
        if (tower && tower.minigame) {
            let M = tower.minigame;
            let oldCastSpell = M.castSpell;
            M.castSpell = function(spell, obj) {
                let result = oldCastSpell(spell, obj);
                triggerPlannerRecalculation();
                return result;
            };
        }

        function triggerPlannerRecalculation() {
            setTimeout(function() {
                Game.fthof_planner_last_count = -1;
                Game.fthof_planner_html_cache = "";
                calculateFtHoFPlannerData();
            }, 10);
        }

        function createTrueFtHoFMathRandom(seedStr) {
            var width = 256, chunks = 6, digits = 52;
            
            function Arc4(a) {
                var b, c = a.length, f = 0, g = this.i = this.j = 0, h = this.S = [];
                for (c || (a = [c++]); width > f; ) { h[f] = f++; }
                for (f = 0; width > f; f++) {
                    h[f] = h[g = width - 1 & (g + a[f % c] + (b = h[f]))];
                    h[g] = b;
                }
                this.g = function (a) {
                    var b, c = 0, f = this.i, g = this.j, h = this.S;
                    while (a--) {
                        f = width - 1 & (f + 1);
                        g = width - 1 & (g + h[f]);
                        b = h[f]; h[f] = h[g]; h[g] = b;
                        c = c * width + h[width - 1 & (h[f] + h[g])];
                    }
                    this.i = f; this.j = g;
                    return c;
                };
            }

            function mixkey(a, b) {
                for (var d = 0, c = a + '', e = 0; c.length > e; ) {
                    b[width - 1 & e] = width - 1 & ((d ^= 19 * (b[width - 1 & e] || 0)) + c.charCodeAt(e++));
                }
                return tostring(b);
            }

            function tostring(a) {
                return String.fromCharCode.apply(0, a);
            }

            var startdenom = Math.pow(width, chunks),
                significance = Math.pow(2, digits),
                overflow = significance * 2;

            var key = [],
                q = new Arc4(mixkey(seedStr, key));

            return function () {
                var a = q.g(chunks), b = startdenom, c = 0;
                while (significance > a) {
                    a = (a + q.g(1)) * width;
                    b *= width;
                    c = q.g(1);
                }
                while (a >= overflow) {
                    a /= 2;
                    b /= 2;
                    c >>>= 1;
                }
                return (a + c) / b;
            };
        }

        function calculateFtHoFPlannerData() {
            let currentTower = Game.Objects['Wizard tower'];
            if (!currentTower || !currentTower.minigame) return;
            
            let M = currentTower.minigame;
            let spellsCount = M.spellsCastTotal;
            if (spellsCount === Game.fthof_planner_last_count && Game.fthof_planner_html_cache !== "") return;

            Game.fthof_planner_last_count = spellsCount;
            let trueSeed = Game.seed || "unknown";

            let html = `
                <div style="text-align: center; margin-bottom: 10px;">
                    <h3 style="color: #ecc45e; font-size: 18px; margin: 0;">FtHoF プランナー (v127.0.0)</h3>
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
                let futureCast = spellsCount + i;
                let targetSeedStr = trueSeed + '/' + futureCast;

                let normalRng = createTrueFtHoFMathRandom(targetSeedStr);
                let seasonRng = createTrueFtHoFMathRandom(targetSeedStr);
                let normalFailRng = createTrueFtHoFMathRandom(targetSeedStr);
                let seasonFailRng = createTrueFtHoFMathRandom(targetSeedStr);

                let localRngForSeed = createTrueFtHoFMathRandom(targetSeedStr);
                let rawSeedValue = localRngForSeed();

                let normalSuccess = predictRawFtHoF(0, 0, normalRng);
                let seasonSuccess = predictRawFtHoF(0, 1, seasonRng);
                let normalFail = predictRawFtHoF(1, 0, normalFailRng);
                let seasonFail = predictRawFtHoF(1, 1, seasonFailRng);
                
                let failCondition = getRawFailCondition(rawSeedValue);

                html += `
                    <tr style="border-bottom: 1px solid #333; text-align: center; background: ${i % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'transparent'};">
                        <td style="padding: 6px; text-align: left; color: #aaa;">+${i}</td>
                        <td style="padding: 6px; font-weight: bold;">${futureCast}</td>
                        <td style="padding: 6px; font-family: monospace; color: #add8e6;">${rawSeedValue.toFixed(4)}</td>
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
            `;
            Game.fthof_planner_html_cache = html;
        }

        function injectFtHoFPlannerUI() {
            if (Game.onMenu != 'prefs') return;

            let menu = document.getElementById('menu');
            if (!menu) return;

            let existing = document.getElementById('custom-internal-fthof');
            if (existing) return;

            if (Game.fthof_planner_html_cache === "") {
                calculateFtHoFPlannerData();
            }

            let div = document.createElement('div');
            div.id = 'custom-internal-fthof';
            div.className = 'listing';
            div.style.cssText = 'padding: 15px; border-top: 1px dashed #666; margin-top: 15px; background: rgba(0,0,0,0.4);';
            div.innerHTML = Game.fthof_planner_html_cache;
            menu.appendChild(div);
        }
        function predictRawFtHoF(backfire, isSeasonMod, localRng) {
            localRng();
            let choice = '';
            if (!backfire) {
                if (localRng() < 0.15) {
                    choice = 'blab';
                } else {
                    let r = localRng();
                    let clickFrenzyChance = 0.15;
                    let bldgSpecChance = 0.1;
                    let stormChance = 0.1;
                    let lumpChance = 0.01;
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
                }
            } else {
                if (localRng() < 0.1) {
                    choice = 'blab';
                } else {
                    let r = localRng();
                    let bloodFrenzyChance = 0.1;
                    let cursedFingerChance = 0.1;
                    let stormChance = 0.1;
                    let lumpChance = 0.003;
                    if (r < bloodFrenzyChance) {
                        choice = 'blood frenzy';
                        if (localRng() < 0.05) choice = 'click frenzy';
                    } else if (r < bloodFrenzyChance + cursedFingerFinger) {
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
                }
            }
            return loc(choice) || choice;
        }

        function getRawFailCondition(rawSeedValue) {
            let neededGCs = Math.floor((1 - rawSeedValue) / 0.15);
            if (neededGCs <= 0) return "0";
            if (neededGCs > 6) return "6+";
            return neededGCs.toString();
        }
    },
    save: function() {},
    load: function() {}
});
