(function () {
  const novo = $("novo");
  const p2 = n => String(n).padStart(2, "0");

  // ---------- cabeçalho com título, subtítulo e ✕ ----------
  let x = novo.querySelector(".dr-x");
  if (!x) {
    x = document.createElement("button");
    x.type = "button";
    x.className = "mini dr-x";
    x.onclick = () => tab("agenda");
  }
  x.textContent = "✕";
  x.title = "Fechar";
  x.setAttribute("aria-label", "Fechar");

  const SUB_NOVO = "Preencha os detalhes para agendar um novo evento.";
  const SUB_EDIT = "Altere os dados e salve as mudanças.";
  const sub = document.createElement("p");
  sub.className = "dr-sub";
  sub.textContent = SUB_NOVO;

  const esq = document.createElement("div");
  esq.append($("tituloForm"), sub);
  const cab = document.createElement("div");
  cab.className = "dr-cab";
  cab.append(esq, x);
  novo.prepend(cab);

  // qualquer outro botão "Fechar" solto no painel é removido
  [...novo.querySelectorAll("button")]
    .filter(b => b !== x && b.textContent.trim() === "Fechar")
    .forEach(b => b.remove());

  // ---------- cada seção num cartão ----------
  [...novo.querySelectorAll(":scope > h3.sec-t")].forEach(h => {
    const corpo = h.nextElementSibling;
    const card = document.createElement("div");
    card.className = "sec-card";
    h.before(card);
    card.append(h);
    if (corpo && corpo.classList.contains("sec-corpo")) card.append(corpo);
  });

  // ---------- rodapé fixo com o botão de salvar ----------
  const rod = document.createElement("div");
  rod.className = "dr-rodape";
  rod.append($("save"), $("cancelar"));
  novo.appendChild(rod);

  // ---------- seletor de horário em botões ----------
  const ini = $("horaIni"), fim = $("horaFim");
  const SLOTS = [];
  for (let m = 6 * 60; m < 30 * 60; m += 30) {
    const t = m % 1440;
    SLOTS.push(p2(Math.floor(t / 60)) + ":" + p2(t % 60));
  }

  const grade = id => `<div class="hr-grade" data-alvo="${id}">` +
    SLOTS.map(s => `<button type="button" class="hr-b" data-v="${s}" aria-pressed="false">${s}</button>`).join("") +
    `</div>`;

  const bloco = document.createElement("div");
  bloco.className = "hr-bloco";
  bloco.innerHTML = `
    <div class="hr-topo"><b>Horário</b><span class="hr-res" id="hrResumo"></span></div>
    <div class="hr-rot">Início</div>${grade("horaIni")}
    <div class="hr-rot">Término</div>${grade("horaFim")}
    <button type="button" class="link" id="hrOutro" style="margin-top:10px">Digitar outro horário</button>`;

  // os campos de horário originais continuam existindo (o aviso de conflito e o salvar usam eles)
  const nativos = document.createElement("div");
  nativos.className = "grid hr-nativos";
  nativos.hidden = true;
  nativos.append(ini.closest("label"), fim.closest("label"));
  bloco.appendChild(nativos);
  $("dataEvento").closest(".grid").after(bloco);

  function duracao(a, b) {
    const m = s => +s.slice(0, 2) * 60 + +s.slice(3, 5);
    let d = m(b) - m(a);
    if (d <= 0) d += 1440;
    return `${Math.floor(d / 60)}h${d % 60 ? p2(d % 60) : ""}`;
  }

  function sync() {
    [["horaIni", ini], ["horaFim", fim]].forEach(([id, inp]) => {
      bloco.querySelectorAll(`.hr-grade[data-alvo="${id}"] .hr-b`)
        .forEach(b => b.setAttribute("aria-pressed", String(b.dataset.v === inp.value)));
    });
    $("hrResumo").textContent =
      ini.value && fim.value ? `${ini.value} – ${fim.value} · ${duracao(ini.value, fim.value)}` :
      ini.value ? `${ini.value} – término a definir` : "Escolha o início";
    // horário fora do padrão: mostra os campos de digitar
    if ((ini.value && !SLOTS.includes(ini.value)) || (fim.value && !SLOTS.includes(fim.value)))
      nativos.hidden = false;
  }

  bloco.addEventListener("click", ev => {
    const b = ev.target.closest(".hr-b");
    if (b) {
      const alvo = $(b.parentElement.dataset.alvo);
      alvo.value = alvo.value === b.dataset.v ? "" : b.dataset.v;
      alvo.dispatchEvent(new Event("change", { bubbles: true }));   // confere conflito de horário
      sync();
      return;
    }
    if (ev.target.id === "hrOutro") nativos.hidden = !nativos.hidden;
  });
  ini.addEventListener("change", sync);
  fim.addEventListener("change", sync);

  // ---------- acompanha o formulário ----------
  const limparOriginal = limpar;
  limpar = function () {
    limparOriginal();
    $("save").textContent = "Salvar evento";
    sub.textContent = SUB_NOVO;
    nativos.hidden = true;
    sync();
  };

  const editarOriginal = editar;
  editar = function (e) {
    editarOriginal(e);
    $("save").textContent = "Salvar alterações";
    sub.textContent = SUB_EDIT;
    sync();
  };

  $("save").textContent = "Salvar evento";
  sync();
})();