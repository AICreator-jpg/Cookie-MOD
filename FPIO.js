/*
 * FtHoF Planner Internal
 * MOD version: 1.1.0
 * Target Cookie Clicker version: 2.058
 *
 * RNG model:
 *   Game.seed + "/" + futureSpellsCastTotal
 *
 * Important:
 *   - Uses new Math.seedrandom(seed) so the game's global Math.random()
 *     is NOT modified by the forecast.
 *   - Reproduces the RNG consumption of the Golden Cookie created by
 *     Force the Hand of Fate.
 */

Game.registerMod("fthof_planner_internal", {

    init: function() {

        var PLANNER_VERSION = "1.1.0";
        var TARGET_GAME_VERSION = "2.058";
        var FORECAST_LENGTH = 10;

        Game.fthof_planner_html_cache = "";
        Game.fthof_planner_last_count = -1;
        Game.fthof_planner_last_state = "";

        var recalculationTimer = null;
        var hookedMinigame = null;
        var originalCastSpell = null;

        /*
         * ------------------------------------------------------------
         * Utility
         * ------------------------------------------------------------
         */

        function getWizardMinigame() {
            var tower = Game.Objects && Game.Objects["Wizard tower"];
            return tower && tower.minigame ? tower.minigame : null;
        }

        function getFtHoFSpell() {
            var M = getWizardMinigame();
            if (!M || !M.spells) return null;
            return M.spells["hand of fate"] || null;
        }

        function isSeasonalRngSeason() {
            /*
             * In the Golden Cookie shimmer initialization,
             * Valentine's and Easter consume one additional RNG
             * to select the seasonal cookie graphic.
             *
             * Other seasons do not consume this RNG here.
             */
            return Game.season === "valentines" ||
                   Game.season === "easter";
        }

        function isChimeRngActive() {
            /*
             * Golden Cookie shimmer initialization:
             *
             * if (!this.spawned &&
             *     Game.chimeType == 1 &&
             *     Game.ascensionMode != 1)
             *
             *     PlaySound(...)
             *
             * The important part for FtHoF is that PlaySound itself
             * does not consume RNG; the shimmer initialization's
             * random-state behavior is represented by the planner
             * RNG alignment.
             *
             * "spawned" is the timer-spawned Golden Cookie state.
             */
            var golden = Game.shimmerTypes &&
                         Game.shimmerTypes["golden"];

            if (!golden) return false;

            return Game.chimeType === 1 &&
                   Game.ascensionMode !== 1 &&
                   !golden.spawned;
        }

        function getSetupRandomCount() {
            /*
             * Golden Cookie creation consumes:
             *
             *   1. seasonal graphic RNG (Valentine/Easter only)
             *   2. x-position RNG
             *   3. y-position RNG
             *
             * The chime condition affects the alignment used by
             * existing FtHoF planners as well.
             *
             * Base = 2 (x + y)
             */
            var count = 2;

            if (isSeasonalRngSeason()) {
                count++;
            }

            if (isChimeRngActive()) {
                count++;
            }

            return count;
        }

        /*
         * ------------------------------------------------------------
         * Local seedrandom
         * ------------------------------------------------------------
         *
         * Cookie Clicker ships seedrandom as Math.seedrandom.
         *
         * Using "new" is important:
         *
         *     new Math.seedrandom(seed)
         *
         * creates an independent RNG and does NOT replace Math.random.
         */

        function createFtHoFRng(seed) {
            if (typeof Math.seedrandom !== "function") {
                throw new Error(
                    "FtHoF Planner: Math.seedrandom is not available."
                );
            }

            return new Math.seedrandom(seed);
        }

        function chooseWithRng(array, rng) {
            if (!array || array.length === 0) {
                return null;
            }

            return array[Math.floor(rng() * array.length)];
        }

        /*
         * ------------------------------------------------------------
         * Backfire chance
         * ------------------------------------------------------------
         */

        function getCurrentBackfireChance() {
            var M = getWizardMinigame();
            var spell = getFtHoFSpell();

            if (!M || !spell) return 0.15;

            /*
             * Use the game's own calculation whenever possible.
             *
             * For FtHoF this includes:
             *   - base 15%
             *   - Magic adept
             *   - Magic inept
             *   - Supreme Intellect
             *   - +15% per existing Golden Cookie
             */
            try {
                return M.getFailChance(spell);
            } catch (e) {
                var failChance = 0.15;

                if (Game.hasBuff("Magic adept")) {
                    failChance *= 0.1;
                }

                if (Game.hasBuff("Magic inept")) {
                    failChance *= 5;
                }

                if (Game.auraMult) {
                    failChance *= 1 + 0.1 * Game.auraMult("Supreme Intellect");
                }

                var golden = Game.shimmerTypes &&
                             Game.shimmerTypes["golden"];

                if (golden) {
                    failChance += 0.15 * golden.n;
                }

                return failChance;
            }
        }

        /*
         * ------------------------------------------------------------
         * FtHoF RNG simulation
         * ------------------------------------------------------------
         */

        function simulateFtHoF(seedString, forceSeasonalMode) {

            var rng = createFtHoFRng(seedString);

            /*
             * The first RNG value is ALWAYS the spell success/failure
             * decision.
             *
             * This is the important value that the previous version
             * displayed incorrectly as allSpells[1].
             */
            var backfireRoll = rng();

            /*
             * Normally use the current Dragonflight state.
             *
             * For the "Seasonal" preview, only season RNG alignment
             * is changed. Dragonflight remains the actual current
             * Dragonflight state.
             */
            var dragonflight = Game.hasBuff &&
                               Game.hasBuff("Dragonflight");

            /*
             * We need to simulate the Golden Cookie creation BEFORE
             * the FtHoF effect selection.
             *
             * In the actual game the shimmer initialization consumes
             * RNG for:
             *
             *   - seasonal graphic selection
             *   - x
             *   - y
             *
             * and the relevant chime alignment.
             *
             * For the seasonal preview we force the seasonal branch,
             * while the normal preview uses the current season.
             */
            var actualSeasonal = isSeasonalRngSeason();

            var setupRandomCount = 2;

            if (forceSeasonalMode) {
                setupRandomCount++;
            } else if (actualSeasonal) {
                setupRandomCount++;
            }

            if (isChimeRngActive()) {
                setupRandomCount++;
            }

            for (var setup = 0; setup < setupRandomCount; setup++) {
                rng();
            }

            /*
             * --------------------------------------------------------
             * Success / Backfire
             * --------------------------------------------------------
             */

            var failChance = getCurrentBackfireChance();

            /*
             * IMPORTANT:
             *
             * The game checks:
             *
             * Math.random() < (1 - failChance)
             *
             * using the FIRST RNG value.
             */
            var success = backfireRoll < (1 - failChance);

            var result;

            if (success) {
                result = simulateFtHoFSuccess(
                    rng,
                    dragonflight
                );
            } else {
                result = simulateFtHoFFail(rng);
            }

            return {
                success: success,
                backfireRoll: backfireRoll,
                failChance: failChance,
                result: result
            };
        }

        /*
         * ------------------------------------------------------------
         * Success side
         * ------------------------------------------------------------
         *
         * This mirrors the current 2.058 FtHoF win() function:
         *
         * choices.push('frenzy','multiply cookies');
         *
         * if (!Game.hasBuff('Dragonflight'))
         *     choices.push('click frenzy');
         *
         * if (Math.random()<0.1)
         *     choices.push('cookie storm','cookie storm','blab');
         *
         * if (Game.BuildingsOwned>=10 && Math.random()<0.25)
         *     choices.push('building special');
         *
         * if (Math.random()<0.15)
         *     choices=['cookie storm drop'];
         *
         * if (Math.random()<0.0001)
         *     choices.push('free sugar lump');
         *
         * choose(choices);
         *
         * if cookie storm drop:
         *     Math.random()*0.75+0.25
         */

        function simulateFtHoFSuccess(rng, dragonflight) {

            var choices = [
                "frenzy",
                "multiply cookies"
            ];

            if (!dragonflight) {
                choices.push("click frenzy");
            }

            if (rng() < 0.1) {
                choices.push(
                    "cookie storm",
                    "cookie storm",
                    "blab"
                );
            }

            if (Game.BuildingsOwned >= 10 && rng() < 0.25) {
                choices.push("building special");
            }

            if (rng() < 0.15) {
                choices = [
                    "cookie storm drop"
                ];
            }

            if (rng() < 0.0001) {
                choices.push("free sugar lump");
            }

            var choice = chooseWithRng(choices, rng);

            /*
             * The actual game consumes another random number when
             * cookie storm drop gets its sizeMult.
             */
            var sizeRoll = null;

            if (choice === "cookie storm drop") {
                sizeRoll = rng();

                return {
                    name: "Cookie Storm Drop",
                    key: choice,
                    sizeMult: sizeRoll * 0.75 + 0.25
                };
            }

            return {
                name: formatFtHoFResult(choice, false),
                key: choice,
                sizeMult: null
            };
        }

        /*
         * ------------------------------------------------------------
         * Failure side
         * ------------------------------------------------------------
         */

        function simulateFtHoFFail(rng) {

            var choices = [
                "clot",
                "ruin cookies"
            ];

            if (rng() < 0.1) {
                choices.push(
                    "cursed finger",
                    "blood frenzy"
                );
            }

            if (rng() < 0.003) {
                choices.push(
                    "free sugar lump"
                );
            }

            if (rng() < 0.1) {
                choices = [
                    "blab"
                ];
            }

            var choice = chooseWithRng(choices, rng);

            return {
                name: formatFtHoFResult(choice, true),
                key: choice,
                sizeMult: null
            };
        }

        /*
         * ------------------------------------------------------------
         * Display names
         * ------------------------------------------------------------
         */

        function formatFtHoFResult(choice, fail) {

            switch (choice) {

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
                    return choice;
            }
        }

        /*
         * ------------------------------------------------------------
         * Backfire threshold / GC count
         * ------------------------------------------------------------
         *
         * Base FtHoF backfire chance is usually 15%.
         * Each existing Golden Cookie adds 15 percentage points.
         *
         * This function tells how many additional Golden Cookies would
         * be required to make this particular roll backfire.
         */
        function getRequiredGCsForBackfire(backfireRoll) {

            var M = getWizardMinigame();
            var spell = getFtHoFSpell();

            if (!M || !spell) {
                return "-";
            }

            var baseChance;

            try {
                baseChance = M.getFailChance(spell);
            } catch (e) {
                baseChance = 0.15;
            }

            /*
             * Current golden cookies are already included in
             * M.getFailChance() for FtHoF.
             */
            var golden = Game.shimmerTypes &&
                         Game.shimmerTypes["golden"];

            var currentGCs = golden ? golden.n : 0;

            /*
             * Find the minimum total GC count which makes:
             *
             * backfireRoll >= 1 - failChance
             */
            for (var totalGCs = currentGCs; totalGCs <= 20; totalGCs++) {

                var failChanceWithoutCurrentGCIncrement =
                    baseChance - 0.15 * currentGCs;

                /*
                 * Clamp because buffs/aura can make the non-GC portion
                 * differ from exactly 0.15.
                 */
                var testChance =
                    failChanceWithoutCurrentGCIncrement +
                    0.15 * totalGCs;

                if (backfireRoll >= 1 - testChance) {
                    return Math.max(
                        0,
                        totalGCs - currentGCs
                    );
                }
            }

            return "6+";
        }

        /*
         * ------------------------------------------------------------
         * State key
         * ------------------------------------------------------------
         */

        function getPlannerStateKey() {

            var M = getWizardMinigame();

            if (!M) {
                return "no-grimoire";
            }

            var golden = Game.shimmerTypes &&
                         Game.shimmerTypes["golden"];

            return [
                Game.seed || "",
                M.spellsCastTotal,
                Game.season || "",
                Game.chimeType,
                Game.ascensionMode,
                golden ? golden.n : 0,
                golden ? golden.spawned : 0,
                Game.hasBuff && Game.hasBuff("Dragonflight") ? 1 : 0,
                Game.BuildingsOwned
            ].join("|");
        }

        /*
         * ------------------------------------------------------------
         * Planner calculation
         * ------------------------------------------------------------
         */

        function calculateFtHoFPlannerData() {

            var M = getWizardMinigame();

            if (!M) {
                Game.fthof_planner_html_cache = "";
                return;
            }

            var stateKey = getPlannerStateKey();

            if (
                stateKey === Game.fthof_planner_last_state &&
                Game.fthof_planner_html_cache !== ""
            ) {
                return;
            }

            Game.fthof_planner_last_state = stateKey;
            Game.fthof_planner_last_count = M.spellsCastTotal;

            var trueSeed = Game.seed || "unknown";
            var spellsCount = M.spellsCastTotal;

            var currentGoldenCookies =
                Game.shimmerTypes &&
                Game.shimmerTypes["golden"]
                    ? Game.shimmerTypes["golden"].n
                    : 0;

            var currentFailChance = getCurrentBackfireChance();

            /*
             * Current Dragonflight state.
             */
            var dragonflightActive =
                Game.hasBuff &&
                Game.hasBuff("Dragonflight");

            /*
             * Determine whether current state is one of the two
             * season-sensitive FtHoF states.
             */
            var currentSeasonal =
                isSeasonalRngSeason();

            var html = `
                <div style="
                    text-align:center;
                    margin-bottom:10px;
                ">
                    <h3 style="
                        color:#ecc45e;
                        font-size:18px;
                        margin:0;
                    ">
                        FtHoF プランナー
                        <span style="
                            font-size:10px;
                            color:#888;
                        ">
                            v${PLANNER_VERSION}
                        </span>
                    </h3>

                    <p style="
                        font-size:11px;
                        color:#ccc;
                        margin:5px 0;
                    ">
                        Cookie Clicker:
                        <b style="color:#add8e6;">
                            ${TARGET_GAME_VERSION}
                        </b>
                        &nbsp;|&nbsp;
                        Seed:
                        <b style="
                            color:#ecc45e;
                            font-family:monospace;
                            font-size:12px;
                        ">
                            ${escapeHtml(String(trueSeed))}
                        </b>
                    </p>

                    <p style="
                        font-size:11px;
                        color:#ccc;
                        margin:5px 0;
                    ">
                        現在の総詠唱回数:
                        <b style="
                            color:#fff;
                            font-size:14px;
                        ">
                            ${spellsCount}
                        </b>
                        &nbsp;|&nbsp;
                        場上GC:
                        <b style="color:#ff7f50;">
                            ${currentGoldenCookies}
                        </b>
                       
