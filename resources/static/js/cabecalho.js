(function () {
  const ABR = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  const ICONES = {
    lista:  '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    semana: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
    mes:    '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 10h18M3 15h18M9 4v16M15 4v16"/>'
  };
  const ROTULO = { lista: "Lista", semana: "Semana", mes: "Mês" };

  // só o administrador vê o "+ Adicionar" ao passar o mouse
  fetch("/api/me")
    .then(r => r.ok ? r.json() : null)
    .then(eu => { if (eu && eu.perfil === "ADMIN") document.body.classList.add("admin"); })
    .catch(() => {});

  // ---------- botão de visões com ícones ----------
  const seg = document.querySelector("#agenda .seg");
    ["semana", "mes"].forEach(v => {
    const b = seg.querySelector(`button[data-v="${v}"]`);
    b.innerHTML = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[v]}</svg><span>${ROTULO[v]}</span>`;
    b.title = ROTULO[v];
    b.setAttribute("aria-label", ROTULO[v]);
    seg.appendChild(b);   // reordena: Lista, Semana, Mês
  });

  // ---------- cabeçalho ----------
  const hoje = new Date();
  const cab = document.createElement("div");
  cab.className = "cal-cab";
  cab.innerHTML = `
    <div class="cab-esq">
      <div class="selo"><span>${ABR[hoje.getMonth()].toUpperCase()}.</span><b>${hoje.getDate()}</b></div>
      <div>
        <div class="cab-tit"><h3 id="calTit"></h3><span class="chip-n" id="calQtd"></span></div>
        <div class="cab-sub" id="calFaixa"></div>
      </div>
    </div>
    <div id="segSlot"></div>`;
  $("cal").before(cab);
  $("segSlot").appendChild(seg);

  const fmt = d => `${d.getDate()} de ${ABR[d.getMonth()]}. de ${d.getFullYear()}`;
  const dataDe = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const vistaAtual = () => seg.querySelector('[aria-pressed="true"]')?.dataset.v || "mes";

  function atualizar() {
    const m = +$("mes").value, y = +$("ano").value, v = vistaAtual();
    let ini = new Date(y, m, 1), fim = new Date(y, m + 1, 0), qtd;
    if (v === "semana" && $("semanaSel").value) {
      ini = dataDe($("semanaSel").value);
      fim = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + 6);
      qtd = document.querySelectorAll("#semWrap .sem-ev, #semWrap .sem-ev-s").length;
    } else if (v === "lista") {
      qtd = document.querySelectorAll("#listaWrap .li-row").length;
    } else {
      qtd = document.querySelectorAll("#cal .chip").length;
    }
    $("calTit").textContent = `${MESES[m].toLowerCase()} ${y}`;
    $("calQtd").textContent = `${qtd} ${qtd === 1 ? "evento" : "eventos"}`;
    $("calFaixa").textContent = `${fmt(ini)} – ${fmt(fim)}`;
  }

  let agendado = false;
  const pedir = () => {
    if (agendado) return;
    agendado = true;
    queueMicrotask(() => { agendado = false; atualizar(); });
  };

  // ---------- grade do mês: dias vizinhos em cinza e hoje destacado ----------
  function ajustarGrade() {
    const m = +$("mes").value, y = +$("ano").value;
    const grade = $("cal");
    const primeiro = new Date(y, m, 1).getDay();
    const total = new Date(y, m + 1, 0).getDate();
    const anterior = new Date(y, m, 0).getDate();

    // células vazias do começo viram os últimos dias do mês anterior
    [...grade.children]
      .filter(el => el.tagName === "DIV" && !el.classList.contains("h"))
      .forEach((el, i) => { el.className = "fora"; el.textContent = anterior - primeiro + 1 + i; });

    // completa a última semana com os primeiros dias do próximo mês
    const resto = (primeiro + total) % 7;
    for (let k = 1; resto && k <= 7 - resto; k++)
      grade.insertAdjacentHTML("beforeend", `<div class="fora">${k}</div>`);

    // hoje
    if (hoje.getFullYear() === y && hoje.getMonth() === m)
      grade.querySelector(`.d[data-d="${hoje.getDate()}"]`)?.classList.add("hoje");
  }

  const calAnterior = cal;
  cal = function () {
    calAnterior();
    ajustarGrade();
    pedir();
  };

  // o cabeçalho acompanha a troca de visão, de semana e o redesenho das visões
  seg.addEventListener("click", pedir);
  $("semanaSel").addEventListener("change", pedir);
  new MutationObserver(pedir).observe($("semWrap"), { childList: true });
  new MutationObserver(pedir).observe($("listaWrap"), { childList: true });

  cal();
})();