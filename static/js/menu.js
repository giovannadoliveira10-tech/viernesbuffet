(function () {
  const CHAVE = "menuMinimizado";
  const ler = () => { try { return localStorage.getItem(CHAVE) === "1"; } catch { return false; } };
  const gravar = v => { try { localStorage.setItem(CHAVE, v ? "1" : "0"); } catch {} };

  // nome de cada item aparece ao passar o mouse (útil com o menu recolhido)
  document.querySelectorAll("nav button").forEach(b => { b.title = b.textContent.trim(); });

  const t = document.createElement("button");
  t.type = "button";
  t.className = "menu-toggle";
  document.body.appendChild(t);

  function aplicar(min) {
    document.body.classList.toggle("menu-min", min);
    t.textContent = min ? "›" : "‹";
    t.title = t.ariaLabel = min ? "Expandir menu" : "Minimizar menu";
  }

  t.onclick = () => {
    const min = !document.body.classList.contains("menu-min");
    aplicar(min);
    gravar(min);
  };

  aplicar(ler());
})();