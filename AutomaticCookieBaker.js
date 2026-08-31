var mod = {
  id: 'custom_automation_mod',
  init: function() {
    if (document.getElementById('mobile-auto-menu')) return;
    
    var b = document.createElement("div");
    b.id = "mobile-auto-menu";
    b.style.cssText = "position:fixed;left:5px;top:32%;z-index:999999;background:#222;color:#fff;padding:8px;border:2px solid #ffd700;border-radius:8px;font-size:11px;box-shadow:0 0 10px #000;line-height:1.4;width:150px;";
    
    b.innerHTML = '<div style="display:flex;justify-content:space-between;margin-bottom:3px;">' +
      '<b>多機能自動化MOD</b>' +
      '<button id="au-t" style="background:#444;color:#fff;border:1px solid #ffd700;font-size:9px;padding:1px 3px;">縮小</button>' +
      '</div>' +
      '<div id="au-b">' +
      '<label><input type="checkbox" id="au-1"> 連打</label><br>' +
      '<label><input type="checkbox" id="au-2"> 金クッキー</label><br>' +
      '<label><input type="checkbox" id="au-3"> トナカイ</label><br>' +
      '<label><input type="checkbox" id="au-4"> フォーチュン</label><br>' +
      '<label><input type="checkbox" id="au-5"> 施設（効率）</label><br>' +
      '<label><input type="checkbox" id="au-6"> 改良</label><br>' +
      '<label><input type="checkbox" id="au-ep"> 自動誓約</label><br>' +
      '<div style="display:flex;gap:4px;margin-top:5px;">' +
      '<button id="au-g" style="flex:1;background:#4a148c;color:#fff;border:1px solid #9c27b0;font-size:9px;padding:3px 0;border-radius:4px;font-weight:bold;">M1</button>' +
      '<button id="au-g10" style="flex:1;background:#4a148c;color:#fff;border:1px solid #9c27b0;font-size:9px;padding:3px 0;border-radius:4px;font-weight:bold;">M10</button>' +
      '<button id="au-g100" style="flex:1;background:#4a148c;color:#fff;border:1px solid #9c27b0;font-size:9px;padding:3px 0;border-radius:4px;font-weight:bold;">M100</button>' +
      '</div>' +
      '<button id="au-bk" style="width:100%;background:#c62828;color:#fff;border:1px solid #f44336;font-size:10px;padding:4px 0;border-radius:4px;font-weight:bold;margin-top:4px;">BK（バフ消し）</button>' +
      '</div>';
      
    document.body.appendChild(b);
    
    document.getElementById("au-t").onclick = function() {
      var d = document.getElementById("au-b");
      if (d.style.display !== "none") {
        b.style.transform = "scale(0.7)"; d.style.display = "none"; this.innerHTML = "拡大";
      } else {
        b.style.transform = "scale(1)"; d.style.display = "block"; this.innerHTML = "縮小";
      }
    };
    
    function addSpells(count) {
      try {
        var tower = Game.Objects["Wizard tower"];
        if (tower && tower.minigame) {
          tower.minigame.spellsCastTotal += count; 
          tower.minigame.spellsCast += count; 
          Game.spellsCast += count;
          var display = document.getElementById("grimoireSpellsCast");
          if (display) display.innerHTML = "呪文：" + tower.minigame.spellsCast;
          if (Game.draw) Game.UpdateMenu();
        }
      } catch(e) {}
    }
    document.getElementById("au-g").onclick = function() { addSpells(1); };
    document.getElementById("au-g10").onclick = function() { addSpells(10); };
    document.getElementById("au-g100").onclick = function() { addSpells(100); };
    
    document.getElementById("au-bk").onclick = function() {
      try { 
        if (typeof Game !== "undefined" && Game.buffs) { 
          for (var i in Game.buffs) { 
            if (Game.buffs[i]) Game.buffs[i].time = 0; 
          } 
        } 
      } catch(e) {}
    };
    
    try {
      for (var i in Game.Objects) {
        var obj = Game.Objects[i];
        if (obj && typeof obj.sell === 'function' && !obj.originalSell) {
          obj.originalSell = obj.sell;
          obj.sell = function(num) {
            var lastAmount = this.amount;
            var res = this.originalSell(num);
            try {
              if (this.amount < lastAmount) {
                var isOrb = false;
                if (Game.hasAura) isOrb = Game.hasAura("Dragon Orbs");
                else if (Game.dragonAura === 19 || Game.dragonAura2 === 19) isOrb = true;
                
                if (isOrb) {
                  var highest = null;
                  for (var j in Game.Objects) {
                    if (Game.Objects[j].amount > 0) highest = Game.Objects[j];
                  }
                  
                  if (highest && this.name === highest.name) {
                    var hasForbiddenBuff = false;
                    if (Game.buffs) {
                      for (var bId in Game.buffs) {
                        var bObj = Game.buffs[bId];
                        if (bObj) {
                          var isGozamok = (bId === "Devastation" || bObj.name === "Devastation" || (bObj.type && bObj.type.name === "Devastation"));
                          var isRedDebuff = (bObj.type && bObj.type.deb && (bObj.type.name === "Clot" || bObj.name === "Clot"));
                          var isMagic = (bObj.name.includes("storm") || bObj.name.includes("Everything") || bObj.name.includes("Egg"));
                          var isGiftLimit = (bObj.name === "Gift limit" || bId === "Gift limit");
                          
                          if (!isGozamok && !isRedDebuff && !isMagic && !isGiftLimit) {
                            hasForbiddenBuff = true;
                            break;
                          }
                        }
                      }
                    }
                    
                    if (!hasForbiddenBuff) {
                      var noCookie = (!Game.shimmers || Game.shimmers.length === 0);
                      if (noCookie && Math.random() < 0.1) {
                        new Game.shimmer("golden", "item");
                        Game.Notify("ドラゴンオーブ", "願いが叶い黄金クッキーが出現。", [33, 25], 1);
                      }
                    }
                  }
                }
              }
            } catch(err) {}
            return res;
          };
        }
      }
    } catch(e) {}
    
    setInterval(function() {
      if (typeof Game === "undefined" || !Game.ready) return;
      
      if (document.getElementById("au-1") && document.getElementById("au-1").checked && Game.ClickCookie) {
        Game.ClickCookie(); 
        if (Game.mouseDown !== undefined) Game.mouseDown = 0;
      }
      
      if (Game.researchT > 0) Game.researchT = 1;
      
      if (Game.lumpRefill > 0) {
        Game.lumpRefill = 1; 
        var wt = Game.Objects["Wizard tower"]; 
        if (wt && wt.minigame) {
          wt.minigame.lumpRefill = 1; 
          if (Game.draw) Game.UpdateMenu();
        }
      }
    }, 16);
    
    setInterval(function() {
      if (typeof Game === "undefined" || !Game.ready) return;
      
      if (Game.shimmers && Game.shimmers.length > 0) {
        for (var i = Game.shimmers.length - 1; i >= 0; i--) {
          var sh = Game.shimmers[i];
          if (sh.type === "golden" && document.getElementById("au-2") && document.getElementById("au-2").checked) sh.pop();
          if (sh.type === "reindeer" && document.getElementById("au-3") && document.getElementById("au-3").checked) sh.pop();
        }
      }
      
      if (document.getElementById("au-4") && document.getElementById("au-4").checked) {
        var tk = document.getElementById("commentsText1");
        if (tk && (/fortune|幸運/i.test(tk.innerHTML))) {
          try {
            var ev = new MouseEvent("click", {bubbles:true,cancelable:true,view:window}); 
            tk.dispatchEvent(ev);
          } catch(err) { 
            if (Game.TickerClick) Game.TickerClick(); 
          }
        }
      }
      
      if (document.getElementById("au-5") && document.getElementById("au-5").checked && Game.ObjectsById) {
        var bO = null, bS = -1;
        for (var i = 0; i < Game.ObjectsById.length; i++) {
          var o = Game.ObjectsById[i];
          if (!o) continue;
          var p = o.getPrice();
          var c = o.storedCps ? o.storedCps : (typeof o.cps === 'function' ? o.cps(o) : (o.cps || 0));
          if (p > 0 && c >= 0 && (c / p) > bS) { bS = c / p; bO = o; }
        }
        if (bO && Game.cookies >= bO.getPrice()) bO.buy(1);
      }
      
      if (document.getElementById("au-6") && document.getElementById("au-6").checked && Game.UpgradesInStore) {
        for (var j = 0; j < Game.UpgradesInStore.length; j++) {
          var u = Game.UpgradesInStore[j];
          if (!u) continue;
          if (u.pool == "tech" || u.pool == "toggle" || u.id == 64 || u.id == 65 || u.id == 66 || u.id == 67 || u.id == 68 || (u.id >= 222 && u.id <= 229)) continue;
          if (Game.cookies >= u.getPrice()) { u.buy(); break; }
        }
      }
      
      if (document.getElementById("au-ep") && document.getElementById("au-ep").checked && Game.Upgrades) {
        if (Game.pledgeT === 0 && Game.Upgrades["Elder Pledge"] && Game.Upgrades["Elder Pledge"].pool === "toggle" && Game.cookies >= Game.Upgrades["Elder Pledge"].getPrice()) {
          Game.Upgrades["Elder Pledge"].buy();
        }
      }
    }, 500);
    
    Game.Notify("Automation MOD", "ver 14.0", "", 1);
  },
  save: function() {},
  load: function() {}
};

if (typeof Game !== "undefined" && Game.RegisterMod) {
  Game.RegisterMod(mod.id, mod);
} else {
  setTimeout(function() { if (typeof Game !== "undefined" && Game.RegisterMod) Game.RegisterMod(mod.id, mod); }, 2000);
}
