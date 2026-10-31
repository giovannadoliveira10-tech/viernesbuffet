(function () {
  let perfil = null;
  const aberto = () => document.body.classList.contains("drawer-aberto");

  // ---------- painel lateral do evento ----------
  const fundo = document.createElement("div");
  fundo.id = "drawerFundo";
  fundo.hidden = true;
  document.body.appendChild(fundo);

  const fechar = document.createElement("button");
  fechar.type = "button";
  fechar.className = "mini dr-x";
  fechar.textContent = "✕ Fechar";
  $("novo").prepend(fechar);
  fechar.onclick = fundo.onclick = () => tab("agenda");

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && aberto() && $("modal").hidden) tab("agenda");
  });

  // "novo" passa a abrir o painel por cima do calendário
  const tabOriginal = tab;
  tab = function (t) {
    const y = window.scrollY;
    if (t === "novo") {
      tabOriginal("agenda");
      window.scrollTo(0, y);
      $("novo").hidden = false;
      fundo.hidden = false;
      document.body.classList.add("drawer-aberto");
      $("novo").scrollTop = 0;
      return;
    }
    const estava = aberto();
    document.body.classList.remove("drawer-aberto");
    fundo.hidden = true;
    tabOriginal(t);
    if (estava && t === "agenda") window.scrollTo(0, y);
  };

  // ---------- clique no dia ----------
  function novoNoDia(d) {
    const mes = +$("mes").value;
    const iso = `${$("ano").value}-${String(mes + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    limpar();
    setv("dataEvento", iso);
    $("dataEvento").dispatchEvent(new Event("change")); // confere conflito de horário
    $("tituloForm").textContent = `Novo evento – ${d} de ${MESES[mes]}`;
    tab("novo");
  }

  const calOriginal = cal;
  cal = function () {
    calOriginal();
    if (perfil !== "ADMIN") return;
    document.querySelectorAll(".cal .d").forEach(
      (b) =>
        (b.onclick = () => {
          sel = +b.dataset.d;
          // só conta o que está aparecendo (respeita o filtro do calendário)
          const temEvento = eventos.some(
            (e) => dia(e) === sel && passaFiltro(e),
          );
          cal();
          det();
          if (!temEvento) novoNoDia(sel); // dia vazio: abre o cadastro direto
        }),
    );
  };
  $("vis").onchange = () => cal();

  // ---------- barra do calendário ----------
  const bar = document.querySelector("#agenda .bar");
  const botao = (txt, classe, titulo) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = classe;
    b.textContent = txt;
    b.setAttribute("aria-label", titulo || txt);
    if (titulo) b.title = titulo;
    return b;
  };

  function ir(m, y) {
    if (m < 0) {
      m = 11;
      y--;
    } else if (m > 11) {
      m = 0;
      y++;
    }
    if (![...$("ano").options].some((o) => +o.value === y)) {
      alert(
        `O ano ${y} ainda não está na lista. Use o botão + Ano para adicioná-lo.`,
      );
      return;
    }
    $("ano").value = y;
    $("mes").value = m;
    carregarMes();
  }

  const hoje = botao("Hoje", "mini");
  hoje.onclick = () => {
    const d = new Date();
    ir(d.getMonth(), d.getFullYear());
  };
  bar.prepend(hoje);

  // ---------- só o administrador cria eventos ----------
  fetch("/api/me")
    .then((r) => (r.ok ? r.json() : null))
    .then((eu) => {
      perfil = eu ? eu.perfil : null;
      if (perfil !== "ADMIN") return;
      const novo = botao("+ Novo evento", "btn");
      novo.style.margin = "0";
      novo.onclick = () => {
        limpar();
        tab("novo");
      };
      bar.appendChild(novo);
      cal(); // refaz o calendário já com o clique novo nos dias
    })
    .catch(() => {});
})();
