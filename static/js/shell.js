(function () {
  // ---------- ícones no menu ----------
  const ICONES = {
    inicio:  '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    agenda:  '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    rel:     '<path d="M3 3v18h18"/><path d="M7 16V9M12 16V5M17 16v-4"/>',
    ajustes: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>'
  };

  document.querySelectorAll("nav button").forEach(b => {
    const d = ICONES[b.dataset.t];
    if (!d || b.querySelector("svg")) return;
    b.insertAdjacentHTML("afterbegin",
      `<svg class="ico" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`);
  });

  // ---------- barra superior ----------
  const NOMES = {
    inicio: "Início", agenda: "Calendário", novo: "Calendário", rel: "Relatório",
    ajustes: "Ajustes", clientes: "Clientes", cadCliente: "Cadastro de cliente"
  };

  const topo = document.createElement("div");
  topo.className = "barra-topo";
  topo.innerHTML = `
    <div class="migalha"><span>Viernes</span><i>›</i><b id="migalha">Início</b></div>
        <div class="barra-dir"></div>`;
  document.querySelector("main.conteudo").prepend(topo);

  // o caminho acompanha a tela aberta
  const tabOriginal = tab;
  tab = function (t) {
    tabOriginal(t);
    $("migalha").textContent = NOMES[t] || "";
  };

  // só o administrador cria eventos
  fetch("/api/me")
    .then(r => r.ok ? r.json() : null)
    .then(eu => {
      if (!eu || eu.perfil !== "ADMIN") return;
      const b = document.createElement("button");
      b.type = "button";
      b.className = "btn";
      b.textContent = "+ Novo evento";
      b.onclick = () => { limpar(); tab("novo"); };
      document.querySelector(".barra-dir").appendChild(b);
    })
    .catch(() => {});
})();