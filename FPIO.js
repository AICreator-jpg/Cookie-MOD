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
            (function (a, b, c, d, e, f) {
              function k(a) {
                var b,
                  c = a.length,
                  e = this,
                  f = 0,
                  g = (e.i = e.j = 0),
                  h = (e.S = []);
                for (c || (a = [c++]); d > f; ) h[f] = f++;
                for (f = 0; d > f; f++)
                  ((h[f] = h[(g = j & (g + a[f % c] + (b = h[f])))]), (h[g] = b));
                (e.g = function (a) {
                  for (var b, c = 0, f = e.i, g = e.j, h = e.S; a--; )
                    ((b = h[(f = j & (f + 1))]),
                      (c = c * d + h[j & ((h[f] = h[(g = j & (g + b))]) + (h[g] = b))]));
                  return ((e.i = f), (e.j = g), c);
                })(d);
              }

              function l(a, b) {
                var e,
                  c = [],
                  d = (typeof a);
                if (b && 'o' == d)
                  for (e in a)
                    try {
                      c.push(l(a[e], b - 1));
                    } catch (f) {}
                return (
                  c.length ? c
                  : 's' == d ? a
                  : a + '\0'
                );
              }

              function m(a, b) {
                for (var d, c = a + '', e = 0; c.length > e; )
                  b[j & e] = j & ((d ^= 19 * b[j & e]) + c.charCodeAt(e++));
                return o(b);
              }

              function n(c) {
                try {
                  return (a.crypto.getRandomValues((c = new Uint8Array(d))), o(c));
                } catch (e) {
                  return [+new Date(), a, a.navigator.plugins, a.screen, o(b)];
                }
              }

              function o(a) {
                return String.fromCharCode.apply(0, a);
              }

              var g = c.pow(d, e),
                h = c.pow(2, f),
                i = 2 * h,
                j = d - 1;
              ((c.seedrandom = function (a, f) {
                var j = [],
                  p = m(
                    l(
                      f ? [a, o(b)]
                      : 0 in arguments ? a
                      : n(),
                      3
                    ),
                    j
                  ),
                  q = new k(j);
                return (
                  m(o(q.S), b),
                  (c.random = function () {
                    for (var a = q.g(e), b = g, c = 0; h > a; )
                      ((a = (a + c) * d), (b *= d), (c = q.g(1)));
                    for (; a >= i; ) ((a /= 2), (b /= 2), (c >>>= 1));
                    return (a + c) / b;
                  }),
                  p
                );
              }),
                m(c.random(), b));
            })(this, [], Math, 256, 6, 52);

            Math.seedrandom(seedStr);
            return Math.random;
        }

        function calculateFtHoFPlannerData() {
            let currentTower = Game.Objects['Wizard tower'];
            if (!currentTower || !currentTower.minigame) return;
            
            let M = currentTower.minigame;
            let spellsCount = M.spellsCastTotal;
            if (spellsCount === Game.fthof_planner_last_count && Game.fthof_planner_html_cache !== "") return;

            Game.fthof_planner_last_count = spellsCount;
            let trueSeed = Game.seed || "unknown";

            let hasDragonflight = (Game.dragonAura === 11 || Game.dragonAura2 === 11);

            let html = `
                <div style="text-align: center; margin-bottom: 10px;">
                    <h3 style="color: #ecc45e; font-size: 18px; margin: 0;">FtHoF プランナー (v142.0.0)</h3>
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

                let rowRng = createTrueFtHoFMathRandom(targetSeedStr);

                let rawSeedValue = rowRng();

                let normalSuccess = predictSuccessFtHoF(0, hasDragonflight, rowRng);
                let seasonSuccess = predictSuccessFtHoF(1, hasDragonflight, rowRng);
                let normalFail = predictFailFtHoF(0, rowRng);
                let seasonFail = predictFailFtHoF(1, rowRng);
                
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
        function predictSuccessFtHoF(isSeasonMod, hasDragonflight, localRng) {
            let list = ['frenzy', 'multiply cookies'];
            
            if (localRng() < 0.10) {
                list.push('cookie storm');
            }
            if (localRng() < 0.10) {
                list.push('blab');
            }
            if (!hasDragonflight) {
                list.push('click frenzy');
            }
            if (localRng() < 0.25) {
                list.push('building special');
            }
            if (localRng() < 0.10) {
                list.push('cookie storm');
            }
            if (isSeasonMod) {
                list.push('season_placeholder_cookie');
            }
            if (localRng() < 0.0001) {
                list.push('sugar lump');
            }
            
            if (localRng() < 0.15) {
                list = ['cookie storm'];
            }
            
            let choice = list[Math.floor(localRng() * list.length)];
            
            if (choice === 'multiply cookies') return 'Lucky';
            if (choice === 'frenzy') return 'Frenzy';
            if (choice === 'click frenzy') return 'Click Frenzy';
            if (choice === 'building special') return 'Building Special';
            if (choice === 'cookie storm') return 'Cookie Storm Drop';
            if (choice === 'sugar lump') return 'Sugar Lump';
            if (choice === 'blab') return 'Blab';
            if (choice === 'season_placeholder_cookie') return 'Cookie Storm Drop';
            return choice;
        }

        function predictFailFtHoF(isSeasonMod, localRng) {
            let list = ['clot', 'ruins'];
            
            if (localRng() < 0.10) {
                list.push('cursed finger');
            }
            if (localRng() < 0.10) {
                list.push('blood frenzy');
            }
            if (isSeasonMod) {
                list.push('season_placeholder_cookie');
            }
            if (localRng() < 0.003) {
                list.push('sugar lump');
            }
            
            if (localRng() < 0.10) {
                list = ['blab'];
            }
            
            let choice = list[Math.floor(localRng() * list.length)];
            
            if (choice === 'clot') return 'Clot';
            if (choice === 'ruins') return 'Ruin';
            if (choice === 'cursed finger') return 'Cursed Finger';
            if (choice === 'blood frenzy') return 'Elder Frenzy';
            if (choice === 'sugar lump') return 'Sugar Lump';
            if (choice === 'blab') return 'Blab';
            if (choice === 'season_placeholder_cookie') return 'Ruin';
            return choice;
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
