Game.registerMod("fthof_planner_internal", {
    init: function() {
        Game.registerHook('draw', function() {
            if (Game.onMenu == 'options') {
                let menu = document.getElementById('menu');
                if (!menu) return;

                // 描写を常に最新化
                let existing = document.getElementById('custom-internal-fthof');
                if (existing) existing.remove();

                // 魔導書ミニゲームが解放されているかチェック
                let tower = Game.Objects['Wizard tower'];
                if (!tower || !tower.minigame) return;
                
                let M = tower.minigame;
                let spellsCount = M.spellsCastTotal;

                // コンテナの作成
                let div = document.createElement('div');
                div.id = 'custom-internal-fthof';
                div.className = 'listing';
                div.style.cssText = 'padding: 15px; border-top: 1px dashed #666; margin-top: 15px; background: rgba(0,0,0,0.4);';

                let html = `
                    <div style="text-align: center; margin-bottom: 10px;">
                        <h3 style="color: #ecc45e; font-size: 18px; margin: 0;">FtHoF プランナー</h3>
                        <p style="font-size: 11px; color: #ccc; margin: 5px 0;">現在の総詠唱回数: <b style="color:#fff; font-size:14px;">${spellsCount}</b> 回</p>
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

                // 先10手分を計算
                for (let i = 1; i <= 10; i++) {
                    let futureCast = spellsCount + (i - 1);
                    
                    let successCookie = predictFtHoF(futureCast, 0);
                    let backfireCookie = predictFtHoF(futureCast, 1);

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
                    <p style="font-size: 10px; color: #888; margin-top: 8px; text-align: center;">※チャイムの有無や現在のシーズン、画面上の既存ゴールデンクッキー数によって実際の挙動は変動する場合があります。</p>
                `;

                div.innerHTML = html;
                menu.appendChild(div);
            }
        });

        // FtHoFの正確なシミュレータ関数
        function predictFtHoF(spellsCast, backfire) {
            // ゲームのシード値と詠唱回数から予測用の乱数値をリセット
            Math.seedrandom(Game.seed + '/' + spellsCast);
            
            // 呪文の選択、バックファイア判定、クッキー種別判定のステップを模倣
            let r = Math.random(); 
            for (let j = 0; j < 3; j++) Math.random(); 

            let list = [];
            if (!backfire) {
                // 正しいゲーム内データ名（英語の内部プロパティ）で処理
                list.push('frenzy', 'multiply cookies');
                if (Math.random() < 0.15) { list.push('click frenzy'); r = Math.random(); if (r < 0.05) list.push('blood frenzy'); }
                if (Math.random() < 0.1) list.push('building special');
                if (Math.random() < 0.01) list.push('sugar lump');
            } else {
                list.push('clot', 'ruins');
                if (Math.random() < 0.1) { list.push('blood frenzy'); r = Math.random(); if (r < 0.05) list.push('click frenzy'); }
                if (Math.random() < 0.1) list.push('cursed finger');
            }

            let choice = list[Math.floor(Math.random() * list.length)];
            
            // クッキークリッカー本体の公式日本語翻訳テキストに変換
            const officialTranslations = {
                'frenzy': loc("frenzy"),                       // 狂乱
                'multiply cookies': loc("multiply cookies"),   // 幸運
                'click frenzy': loc("click frenzy"),           // 連打狂乱
                'blood frenzy': loc("blood frenzy"),           // 長老狂乱
                'building special': loc("building special"),   // 建物特効
                'sugar lump': loc("sugar lump"),               // 砂糖結晶
                'clot': loc("clot"),                           // 凝固
                'ruins': loc("ruins"),                         // 破滅
                'cursed finger': loc("cursed finger")          // 呪われた指
            };

            // 乱数シードを安全に通常状態に戻す
            Math.seedrandom();

            return officialTranslations[choice] || choice;
        }
    },
    save: function() {},
    load: function() {}
});
