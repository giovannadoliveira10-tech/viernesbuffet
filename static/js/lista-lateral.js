(function () {
  const ABREV = ["dom.", "seg.", "ter.", "qua.", "qui.", "sex.", "sáb."];
  const MAX = 300;       // o servidor devolve no máximo 300 eventos por vez
  let itens = [];
  let seqBusca = 0;
 
  // ---------- layout: calendário à esquerda, lista à direita ----------
  const cab = $("agenda").querySelector(".cal-cab");
  const layout = document.createElement("div");
  layout.className = "cal-layout";
  const col = document.createElement("div");
  col.className = "cal-col";
  const lado = document.createElement("aside");
  lado.id = "listaLado";
  lado.className = "lista-lado";
  lado.setAttribute("aria-label", "Lista de eventos");
  layout.append(col, lado);
  (cab || $("cal")).before(layout);
  [cab, $("cal"), $("semWrap"), $("listaWrap"), $("detVista")]
    .forEach(el => { if (el) col.appendChild(el); });
 
  // ---------- textos conforme o filtro ----------
  const tituloDe = f =>
    f === "futuros" ? "Eventos futuros" :
    f === "passados" ? "Eventos já realizados" :
    `Eventos de ${MESES[+$("mes").value]} de ${$("ano").value}`;
 
  const vazioDe = f =>
    f === "futuros" ? "Nenhum evento futuro." :
    f === "passados" ? "Nenhum evento realizado ainda." :
    "Nenhum evento neste mês.";
 
  // ---------- desenha a lista ----------
  function desenhar() {
    const f = $("vis").value;
    let html = `<div class="ls-cab"><h3>${tituloDe(f)}</h3><span class="chip-n">${itens.length}</span></div>`;
 
    if (!itens.length) {
      html += `<div class="note">${vazioDe(f)}</div>`;
    } else {
      let mesAtual = "";
      itens.forEach(e => {
        const k = e.dataEvento.slice(0, 7);
        if (f !== "todos" && k !== mesAtual) {
          mesAtual = k;
          html += `<div class="ls-mes">${MESES[+k.slice(5, 7) - 1]} de ${k.slice(0, 4)}</div>`;
        }
        const [y, m, d] = e.dataEvento.split("-").map(Number);
        const dow = new Date(y, m - 1, d).getDay();
        html += `<button type="button" class="ls-item" data-id="${e.id}">
          <span class="ls-data"><b>${d}</b><small>${ABREV[dow]}</small></span>
          <span class="ls-info"><b>${esc(e.tipoEvento.nome)}</b> – ${esc(nomeCli(e))}
            <small><i class="dot ${ST[e.status].cls}"></i>${ST[e.status].txt}${hora(e) ? " · " + hora(e) : ""}</small></span>
        </button>`;
      });
      if (itens.length >= MAX && f !== "todos")
        html += `<div class="note">Mostrando os primeiros ${MAX} eventos.</div>`;
    }
    lado.innerHTML = html;
  }
 
  // ---------- busca os dados ----------
  // todos os eventos: os do mês aberto no calendário (já carregados)
  // futuros e já realizados: busca no servidor, de todos os meses
  async function carregar() {
    const f = $("vis").value;
    const meu = ++seqBusca;
    if (f === "todos") { itens = eventos.slice(); desenhar(); return; }
    let lista = [];
    try {
      const r = await fetch("/api/eventos/" + f);
      lista = r.ok ? await r.json() : [];
    } catch { lista = []; }
    if (meu !== seqBusca) return;          // chegou uma resposta antiga: ignora
    itens = lista;
    desenhar();
  }
 
  // no modo "todos", a lista acompanha o calendário
  const calAntes = cal;
  cal = function () {
    calAntes();
    if ($("vis").value === "todos") { itens = eventos.slice(); desenhar(); }
  };
 
  // depois de trocar de mês, salvar ou excluir, a lista é atualizada
  const carregarAntes = carregarMes;
  carregarMes = async function () {
    await carregarAntes();
    carregar();
  };
 
  // trocar o filtro redesenha o calendário e a lista
  $("vis").addEventListener("change", () => { sel = null; cal(); carregar(); });
 
  // ---------- clicar num evento da lista: abre o dia dele no calendário ----------
  lado.addEventListener("click", async ev => {
    const b = ev.target.closest(".ls-item");
    if (!b) return;
    const e = itens.find(x => x.id == b.dataset.id);
    if (!e) return;
 
    const [y, m, d] = e.dataEvento.split("-");
    const ano = $("ano");
    if (![...ano.options].some(o => o.value === y)) ano.add(new Option(y, y));
    ano.value = y;
    $("mes").value = +m - 1;
 
    document.querySelector('#agenda .seg [data-v="mes"]')?.click();   // volta para a visão do mês
    await carregarMes();
    sel = +d;
    cal();
    det();
  });
 
  carregar();
})();