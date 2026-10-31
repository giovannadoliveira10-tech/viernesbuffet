(function () {
  // ============ 1) SETAS DE MÊS (ao lado do período) ============
  const faixa = $("calFaixa");
  const seg = document.querySelector("#agenda .seg");
  const vistaAtual = () =>
    seg.querySelector('[aria-pressed="true"]')?.dataset.v || "mes";

  const nav = document.createElement("div");
  nav.className = "cab-nav";
  const seta = (txt, titulo, d) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "seta";
    b.textContent = txt;
    b.title = titulo;
    b.setAttribute("aria-label", titulo);
    b.dataset.d = d;
    return b;
  };
  faixa.before(nav);
  nav.append(seta("‹", "Anterior", -1), faixa, seta("›", "Próximo", 1));

  async function mover(delta) {
    const semana = vistaAtual() === "semana";

    // na visão semanal, anda de semana em semana
    if (semana) {
      const s = $("semanaSel"),
        i = s.selectedIndex + delta;
      if (i >= 0 && i < s.options.length) {
        s.selectedIndex = i;
        s.dispatchEvent(new Event("change"));
        return;
      }
    }

    // fim do mês: vai para o mês vizinho
    let m = +$("mes").value + delta,
      y = +$("ano").value;
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
    await carregarMes();

    if (semana) {
      const s = $("semanaSel");
      s.selectedIndex = delta < 0 ? s.options.length - 1 : 0;
      s.dispatchEvent(new Event("change"));
    }
  }
  nav.addEventListener("click", (ev) => {
    const b = ev.target.closest(".seta");
    if (b) mover(+b.dataset.d);
  });

  // ============ 2) INFORMAÇÃO DENTRO DO QUADRADO (ao passar o mouse) ============
  function infoEvento(e) {
    const valor =
      e.valorVendaReal != null
        ? `<span class="di-val val">Venda ${R(e.valorVendaReal)}</span>`
        : "";
    return `<span class="di-bloco">
      <span class="di-ev"><b>${esc(e.tipoEvento.nome)}</b> – ${esc(nomeCli(e))}</span>
      <span class="di-meta"><i class="dot ${ST[e.status].cls}"></i>${ST[e.status].txt}${hora(e) ? " · " + hora(e) : ""}</span>
      ${valor}</span>`;
  }

  const calAntes = cal;
  cal = function () {
    calAntes();
    document.querySelectorAll("#cal .d").forEach((b) => {
      const d = +b.dataset.d;
      const es = eventos.filter((e) => dia(e) === d && passaFiltro(e));
      if (es.length)
        b.insertAdjacentHTML(
          "beforeend",
          `<span class="d-info">${es.map(infoEvento).join("")}</span>`,
        );
    });
  };

  // ============ 3) DETALHES DO DIA: janela ao clicar (no lugar do cartão embaixo) ============
  const fundo = document.createElement("div");
  fundo.id = "detFundo";
  fundo.hidden = true;
  document.body.appendChild(fundo);

  const fecharDet = () => {
    document.body.classList.remove("det-aberto");
    fundo.hidden = true;
  };
  const fecharEDesmarcar = () => {
    fecharDet();
    sel = null;
    cal();
  };

  function abrirDet() {
    const caixa = $("det");
    if (!caixa.querySelector(".det-x")) {
      const x = document.createElement("button");
      x.type = "button";
      x.className = "mini det-x";
      x.textContent = "✕";
      x.title = "Fechar";
      x.setAttribute("aria-label", "Fechar");
      x.onclick = fecharEDesmarcar;
      caixa.prepend(x);
    }
    document.body.classList.add("det-aberto");
    fundo.hidden = false;
  }

  fundo.onclick = fecharEDesmarcar;
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      document.body.classList.contains("det-aberto") &&
      $("modal").hidden
    )
      fecharEDesmarcar();
  });

  // só abre a janela quando o dia tem evento; dia vazio não mostra nada
  const detAntes = det;
  det = function () {
    detAntes();
    if (sel && eventos.some((e) => dia(e) === sel && passaFiltro(e)))
      abrirDet();
    else fecharDet();
  };

  // fecha ao ir para outra tela (o painel do evento, por exemplo) e ao recarregar o mês
  const tabAntes = tab;
  tab = function (t) {
    if (t !== "agenda") fecharDet();
    tabAntes(t);
  };
  const carregarAntes = carregarMes;
  carregarMes = async function () {
    fecharDet();
    await carregarAntes();
  };

  cal();
})();
