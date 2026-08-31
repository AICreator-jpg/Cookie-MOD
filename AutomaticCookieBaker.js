Game.registerMod("automatic_cookie_baker", {
    init: function() {.js
        console.log("[AutomaticCookieBaker.js] Loader loaded successfully.");
        Game.Win('Third-party');
    },
    save: function() { return ''; },
    load: function(str) {}
});
