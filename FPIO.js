Game.registerMod("fthof_planner_internal", {
    init: function() {
        var VERSION = "1.2.0";
        var GAME_VERSION = "2.058";
        var FORECAST = 10;

        Game.fthof_planner_html_cache = "";
        Game.fthof_planner_last_count = -1;
        Game.fthof_planner_last_state = "";

        var timer = null;
        var wrappedM = null;

        function getM() {
            var tower = Game.Objects && Game.Objects["Wizard tower"];
            return tower && tower.minigame ? tower.minigame : null;
        }

        function getSpell() {
            var M = getM();
            return M && M.spells ? M.spells["hand of fate"] : null;
        }

        function esc(v) {
            return String(v)
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#39;");
        }

        function rng(seed) {
            if (typeof Math.seedrandom !== "function") {
                throw new Error("Math.seedrandom が見つかりません");
            }
            return new Math.seedrandom(seed);
        }

        function choose(a, r) {
            return a[Math.floor(r() * a.length)];
        }

        function seasonal() {
            return Game.season === "easter" ||
                   Game.season === "valentines";
        }

        function chime() {
            var g = Game.shimmerTypes &&
                    Game.shimmerTypes["golden"];

            return !!(
                g &&
                !g.spawned &&
                Game.chimeType == 1 &&
                Game.ascensionMode != 1
            );
        }

        function failChance() {
            var M = getM();
            var spell = getSpell();

            if (!M || !spell) return 0.15;

            try {
                return M.getFailChance(spell);
            } catch (e) {
                var f = 0.15;

                if (Game.hasBuff("Magic adept")) f *= 0.1;
                if (Game.hasBuff("Magic inept")) f *= 5;

                if (Game.auraMult) {
                    f *= 1 + 0.1 * Game.auraMult("Supreme Intellect");
                }

                var g = Game.shimmerTypes &&
                        Game.shimmerTypes["golden"];

                if (g) f += 0.15 * g.n;

                return f;
            }
        }

        function simulate(seed, forceSeason) {
            var r = rng(seed);
            var backfireRoll = r();
            var fc = failChance();
            var success = backfireRoll < 1 - fc;

            var offset = 2;

            if (forceSeason || seasonal()) {
                offset++;
            }

            if (chime()) {
                offset++;
            }

            for (var i = 0; i < offset; i++) {
                r();
            }

            var result = success
                ? successResult(r)
                : failResult(r);

            return {
                success: success,
                roll: backfireRoll,
                failChance: fc,
                result: result
            };
        }

        function successResult(r) {
            var choices = [
                "frenzy",
                "multiply cookies"
            ];

            if (!Game.hasBuff("Dragonflight")) {
                choices.push("click frenzy");
            }

            if (r() < 0.1) {
                choices.push(
                    "cookie storm",
                    "cookie storm",
                    "blab"
                );
            }

            if (
                Game.BuildingsOwned >= 10 &&
                r() < 0.25
            ) {
                choices.push("building special");
            }

            if (r() < 0.15) {
                choices = ["cookie storm drop"];
            }

            if (r() < 0.0001) {
                choices.push("free sugar lump");
            }

            var choice = choose(choices, r);
            var size = null;

            if (choice === "cookie storm drop") {
                size = r() * 0.75 + 0.25;
            }

            return {
                key: choice,
                name: format(choice),
                size: size
            };
        }

        function failResult(r) {
            var choices = [
                "clot",
                "ruin cookies"
            ];

            if (r() < 0.1) {
                choices.push(
                    "cursed finger",
                    "blood frenzy"
                );
            }

            if (r() < 0.003) {
                choices.push("free sugar lump");
            }

            if (r() < 0.1) {
                choices = ["blab"];
            }

            var choice = choose(choices, r);

            return {
                key: choice,
                name: format(choice),
                size: null
            };
        }

        function format(c) {
            switch (c) {
                case "frenzy":
                    return "Frenzy";
                case "multiply cookies":
                    return "Lucky";
                case "click frenzy":
                    return "Click Frenzy";
                case "building special":
                    return "Building Special";
                case "cookie storm":
                    return "Cookie Storm";
                case "cookie storm drop":
                    return "Cookie Storm Drop";
                case "free sugar lump":
                    return "Sugar Lump";
                case "blab":
                    return "Blab";
                case "clot":
                    return "Clot";
                case "ruin cookies":
                    return "Ruin";
                case "cursed finger":
                    return "Cursed Finger";
                case "blood frenzy":
                    return "Elder Frenzy";
                default:
                    return c;
            }
        }

        function requiredGC(roll) {
            var g = Game.shimmerTypes &&
                    Game.shimmerTypes["golden"];

            if (!g) return "-";

            var current = g.n || 0;
            var currentFail = failChance();
            var base = currentFail - current * 0.15;

            for (var i = 0; i <= 20; i++) {
                var f = base + (current + i) * 0.15;

                if (roll >= 1 - f) {
                    return i;
                }
            }

            return "20+";
        }

        function stateKey() {
            var M = getM();

            if (!M) return "NO_GRIMOIRE";

            var g = Game.shimmerTypes &&
                    Game.shimmerTypes["golden"];

            return [
                Game.seed || "",
                M.spellsCastTotal,
                Game.season || "",
                Game.chimeType || 0,
                Game.ascensionMode || 0,
                g ? g.n : 0,
                g ? g.spawned : 0,
                Game.BuildingsOwned || 0,
                Game.hasBuff("Dragonflight") ? 1 : 0
            ].join("|");
        }

        function calculate() {
            try {
                var M = getM();

                if (!M) {
                    Game.fthof_planner_html_cache =
                        "<div style='padding:10px;color:#f66;text-align:center'>" +
                        "Wizard Tower / Grimoire が読み込まれていません。" +
                        "</div>";
                    return;
                }

                var key = stateKey();

                if (
                    key === Game.fthof_planner_last_state &&
                    Game.fthof_planner_html_cache
                ) {
                    return;
                }

                Game.fthof_planner_last_state = key;
                Game.fthof_planner_last_count = M.spellsCastTotal;

                var seed = Game.seed || "unknown";
                var count = M.spellsCastTotal;

                var g = Game.shimmerTypes &&
                        Game.shimmerTypes["golden"];

                var gc = g ? g.n : 0;
                var fc = failChance();

                var dragon =
                    Game.hasBuff("Dragonflight");

                var currentSeason =
                    seasonal();

                var html = "";

                html +=
                    "<div style='text-align:center;margin-bottom:10px'>" +
                    "<h3 style='color:#ecc45e;font-size:18px;margin:0'>" +
                    "FtHoF プランナー " +
                    "<span style='font-size:10px;color:#888'>v" +
                    VERSION +
                    "</span></h3>" +

                    "<p style='font-size:11px;color:#ccc;margin:5px 0'>" +
                    "Cookie Clicker <b style='color:#add8e6'>" +
                    GAME_VERSION +
                    "</b>　Seed: " +
                    "<b style='color:#ecc45e;font-family:monospace'>" +
                    esc(seed) +
                    "</b></p>" +

                    "<p style='font-size:11px;color:#ccc;margin:5px 0'>" +
                    "現在の総詠唱回数: " +
                    "<b style='color:#fff;font-size:14px'>" +
                    count +
                    "</b>　場のGC: " +
                    "<b style='color:#ff7f50'>" +
                    gc +
                    "</b>　Backfire: " +
                    "<b style='color:#f88'>" +
                    (fc * 100).toFixed(2) +
                    "%</b></p>" +

                    "<p style='font-size:10px;color:#999;margin:4px 0 8px'>" +
                    "Season: <b style='color:#ddd'>" +
                    esc(Game.season || "none") +
                    "</b>　Chime: <b style='color:#ddd'>" +
                    (Game.chimeType == 1 ? "ON" : "OFF") +
                    "</b>　Dragonflight: <b style='color:" +
                    (dragon ? "#6f6" : "#aaa") +
                    "'>" +
                    (dragon ? "ON" : "OFF") +
                    "</b></p></div>";

                html +=
                    "<table style='width:100%;border-collapse:collapse;font-size:11px;text-align:center'>" +
                    "<thead><tr style='border-bottom:1px solid #555;color:#add8e6'>" +

                    "<th style='padding:4px;text-align:left'>#</th>" +
                    "<th style='padding:4px'>総詠唱</th>" +
                    "<th style='padding:4px'>Random Seed</th>" +
                    "<th style='padding:4px;color:#6f6'>通常</th>" +
                    "<th style='padding:4px;color:#ffd700'>4季</th>" +
                    "<th style='padding:4px;color:#f55'>通常 Backfire</th>" +
                    "<th style='padding:4px;color:#ffb6c1'>4季 Backfire</th>" +
                    "<th style='padding:4px;color:#ff7f50'>GC</th>" +

                    "</tr></thead><tbody>";

                for (var i = 1; i <= FORECAST; i++) {

                    var futureCast = count + i;
                    var futureSeed =
                        seed + "/" + (futureCast - 1);

                    var normal =
                        simulate(
                            futureSeed,
                            currentSeason
                        );

                    var season =
                        simulate(
                            futureSeed,
                            true
                        );

                    var roll = normal.roll;
                    var normalColor =
                        normal.success ? "#6f6" : "#f55";
                    var seasonColor =
                        season.success ? "#ffd700" : "#ffb6c1";

                    html +=
                        "<tr style='border-bottom:1px solid #333;background:" +
                        (i % 2 === 0
                            ? "rgba(255,255,255,0.03)"
                            : "transparent") +
                        "'>" +

                        "<td style='padding:6px;text-align:left;color:#aaa'>" +
                        "+" + i +
                        "</td>" +

                        "<td style='padding:6px;font-weight:bold'>" +
                        futureCast +
                        "</td>" +

                        "<td style='padding:6px;font-family:monospace;color:#add8e6'>" +
                        roll.toFixed(6) +
                        "</td>" +

                        "<td style='padding:6px;color:" +
                        normalColor +
                        "'><b>" +
                        normal.result.name +
                        "</b><br><span style='font-size:9px;color:#888'>" +
                        (normal.success ? "Success" : "Backfire") +
                        "</span></td>" +

                        "<td style='padding:6px;color:" +
                        seasonColor +
                        "'><b>" +
                        season.result.name +
                        "</b><br><span style='font-size:9px;color:#888'>" +
                        (season.success ? "Success" : "Backfire") +
                        "</span></td>" +

                        "<td style='padding:6px;color:#f55'>" +
                        (normal.success ? "-" : normal.result.name) +
                        "</td>" +

                        "<td style='padding:6px;color:#ffb6c1'>" +
                        (season.success ? "-" : season.result.name) +
                        "</td>" +

                        "<td style='padding:6px;color:#ff7f50;font-weight:bold'>" +
                        requiredGC(roll) +
                        "</td>" +

                        "</tr>";
                }

                html +=
                    "</tbody></table>" +

                    "<div style='margin-top:8px;padding-top:7px;border-top:1px dashed #555;font-size:9px;color:#888'>" +
                    "通常 = 現在の状態　/　4季 = 季節RNG追加状態" +
                    "</div>";

                Game.fthof_planner_html_cache = html;

            } catch (e) {

                console.error(
                    "[FtHoF Planner]",
                    e
                );

                Game.fthof_planner_html_cache =
                    "<div style='padding:10px;color:#f66;font-family:monospace'>" +
                    "<b>FtHoF Planner Error</b><br><br>" +
                    esc(
                        e && e.message
                            ? e.message
                            : String(e)
                    ) +
                    "</div>";
            }
        }

        function inject() {

            if (Game.onMenu !== "prefs") {
                return;
            }

            var menu =
                document.getElementById("menu");

            if (!menu) {
                return;
            }

            if (!Game.fthof_planner_html_cache) {
                calculate();
            }

            var div =
                document.getElementById(
                    "custom-internal-fthof"
                );

            if (!div) {

                div =
                    document.createElement("div");

                div.id =
                    "custom-internal-fthof";

                div.className =
                    "listing";

                div.style.cssText =
                    "padding:15px;" +
                    "border-top:1px dashed #666;" +
                    "margin-top:15px;" +
                    "background:rgba(0,0,0,0.4);";

                menu.appendChild(div);
            }

            div.innerHTML =
                Game.fthof_planner_html_cache;
        }

        function refresh() {

            if (timer) {
                clearTimeout(timer);
            }

            timer =
                setTimeout(function() {

                    timer = null;

                    Game.fthof_planner_last_count = -1;
                    Game.fthof_planner_last_state = "";
                    Game.fthof_planner_html_cache = "";

                    calculate();
                    inject();

                }, 20);
        }

        var oldUpdateMenu =
            Game.UpdateMenu;

        Game.UpdateMenu =
            function() {

                oldUpdateMenu.apply(
                    this,
                    arguments
                );

                setTimeout(
                    inject,
                    0
                );
            };

        if (
            typeof Game.registerSpellCastHook ===
            "function"
        ) {

            Game.registerSpellCastHook(
                function() {
                    refresh();
                }
            );
        }

        function hookCastSpell() {

            var M = getM();

            if (!M ||
                wrappedM === M ||
                typeof M.castSpell !== "function") {
                return;
            }

            wrappedM = M;

            var oldCastSpell =
                M.castSpell;

            M.castSpell =
                function() {

                    var result =
                        oldCastSpell.apply(
                            this,
                            arguments
                        );

                    refresh();

                    return result;
                };
        }

        hookCastSpell();

        setTimeout(function() {
            hookCastSpell();
            calculate();
            inject();
        }, 500);

        setInterval(function() {

            hookCastSpell();

            if (Game.onMenu === "prefs") {
                inject();
            }

        }, 500);
    },

    save: function() {},
    load: function() {}
});
