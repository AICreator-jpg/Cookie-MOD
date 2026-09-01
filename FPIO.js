Game.registerMod("fthof_planner_test", {
    init: function() {
        let oldUpdateMenu = Game.UpdateMenu;
        
        Game.UpdateMenu = function() {
            oldUpdateMenu();
            
            if (Game.onMenu == 'prefs') {
                let menu = document.getElementById('menu');
                if (menu) {
                    let existing = document.getElementById('custom-test-element');
                    if (existing) existing.remove();

                    let div = document.createElement('div');
                    div.id = 'custom-test-element';
                    div.className = 'listing';
                    div.style.cssText = 'padding: 15px; border-top: 1px dashed #666; margin-top: 15px; text-align: center; font-size: 18px; color: #fff;';
                    div.innerHTML = 'テスト (v1.0.0)';

                    menu.appendChild(div);
                }
            }
        };
    },
    save: function() {},
    load: function() {}
});
