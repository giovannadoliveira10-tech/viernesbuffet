(function () {
  const H = 44;   // altura de uma hora na grade da semana (px), igual ao CSS
  const p2 = n => String(n).padStart(2, "0");
  const isoD = d => d.getFullYear() + "-" + p2(d.getMonth() + 1) + "-" + p2(d.getDate());
  const lerD = s => { const [y, m, d] = s.split("-").map(Number); return new Date(y, m - 1, d); };
  const minutos = h => +h.slice(0, 2) * 60 + +h.slice(3, 5);
  const DIAS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

  let vista = "mes", perfil = null, mapa = new Map(), seq = 0;
  const cache = new Map();

  fetch("/api/me").then(r => r.ok ? r.json() : null).then(eu => { perfil = eu ? eu.perfil : null; }).catch(() => {});

  // ---------- elementos ----------
  const bar = $("agenda").querySelector(".bar");
  const leg = bar.querySelector(".leg");

  const seg = document.createElement("div");
  seg.className = "seg";
    seg.innerHTML = [["mes", "Mês"], ["semana", "Semana"]]
    .map(([v, t]) => `<button type="button" data-v="${v}">${t}</button>`).join("");

  const semanaSel = document.createElement("select");
  semanaSel.id = "semanaSel";
  semanaSel.hidden = true;
  semanaSel.setAttribute("aria-label", "Semana");
  leg.before(seg);
  leg.before(semanaSel);

  const semWrap = document.createElement("div");
  semWrap.id = "semWrap";
  semWrap.hidden = true;
  const listaWrap = document.createElement("div");
  listaWrap.id = "listaWrap";
  listaWrap.hidden = true;
  const detV = document.createElement("div");
  detV.id = "detVista";
  detV.className = "card";
  detV.hidden = true;
  $("cal").after(semWrap, listaWrap, detV);

  // ---------- dados ----------
    const filtrar = l => l.filter(passaFiltro);

  async function mesDados(y, m) {
    const k = y + "-" + m;
    if (!cache.has(k)) {
      const r = await fetch(`/api/eventos?mes=${m}&ano=${y}`);
      cache.set(k, r.ok ? await r.json() : []);
    }
    return cache.get(k);
  }

  // ---------- semana ----------
  function prepararSemanas() {
    const y = +$("ano").value, m = +$("mes").value;
    const primeiro = new Date(y, m, 1), ultimo = new Date(y, m + 1, 0);
    const lista = [];
    let ini = new Date(y, m, 1 - primeiro.getDay());
    while (ini <= ultimo) {
      const fim = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + 6);
      lista.push([isoD(ini), isoD(fim)]);
      ini = new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + 7);
    }
    const atual = semanaSel.value;
    semanaSel.innerHTML = lista
      .map(([a, b]) => `<option value="${a}">${fmtData(a).slice(0, 5)} a ${fmtData(b).slice(0, 5)}</option>`).join("");
    const hoje = isoD(new Date());
    const dela = lista.find(([a, b]) => hoje >= a && hoje <= b);
    semanaSel.value = lista.some(([a]) => a === atual) ? atual : (dela ? dela[0] : lista[0][0]);
  }

  // posiciona os eventos lado a lado quando os horários se sobrepõem
  function disposicao(es) {
    const itens = es.filter(e => e.horaInicio).map(e => {
      const a = minutos(e.horaInicio);
      let b = e.horaFim ? minutos(e.horaFim) : a + 60;
      if (b <= a) b = 1440;   // termina depois da meia-noite: segue até o fim do dia
      return { e, a, b, c: 0 };
    }).sort((x, y) => x.a - y.a);
    const fins = [];
    itens.forEach(it => {
      let c = fins.findIndex(f => f <= it.a);
      if (c < 0) { c = fins.length; fins.push(0); }
      fins[c] = it.b;
      it.c = c;
    });
    return { itens, n: Math.max(1, fins.length) };
  }

  async function renderSemana() {
    const meu = ++seq;
    const ini = lerD(semanaSel.value);
    const dias = Array.from({ length: 7 }, (_, i) => new Date(ini.getFullYear(), ini.getMonth(), ini.getDate() + i));
    const meses = new Set(dias.map(d => d.getFullYear() + "-" + (d.getMonth() + 1)));
    let todos = [];
    for (const k of meses) { const [y, m] = k.split("-"); todos = todos.concat(await mesDados(y, m)); }
    if (meu !== seq) return;

    const lista = filtrar(todos);
    mapa = new Map(lista.map(e => [e.id, e]));
    const hojeIso = isoD(new Date());
    const porDia = dias.map(d => lista.filter(e => e.dataEvento === isoD(d)));

    const cab = dias.map(d =>
      `<button type="button" class="sem-dia${isoD(d) === hojeIso ? " hoje" : ""}" data-novo="${isoD(d)}">${DIAS[d.getDay()]} <b>${d.getDate()}</b></button>`).join("");

    const semHora = porDia.some(es => es.some(e => !e.horaInicio))
      ? `<div class="sem-linha"><div class="sem-h">Sem horário</div>` +
        porDia.map(es => `<div class="sem-cel">` +
          es.filter(e => !e.horaInicio).map(e =>
            `<button type="button" class="sem-ev-s ${ST[e.status].cls}" data-id="${e.id}">${esc(e.tipoEvento.nome)}</button>`).join("") +
          `</div>`).join("") + `</div>`
      : "";

    const horas = Array.from({ length: 24 }, (_, h) => `<div style="height:${H}px">${p2(h)}:00</div>`).join("");

    const colunas = porDia.map(es => {
      const { itens, n } = disposicao(es);
      return `<div class="sem-col">` + itens.map(({ e, a, b, c }) =>
        `<button type="button" class="sem-ev ${ST[e.status].cls}" data-id="${e.id}"
           title="${esc(e.tipoEvento.nome)} – ${esc(nomeCli(e))}"
           style="top:${a / 60 * H}px;height:${Math.max((b - a) / 60 * H, 24)}px;left:${c / n * 100}%;width:${100 / n}%">
           <b>${hora(e)}</b> ${esc(e.tipoEvento.nome)}<br>${esc(nomeCli(e))}</button>`).join("") + `</div>`;
    }).join("");

    semWrap.innerHTML = `<div class="sem"><div class="sem-in">
      <div class="sem-linha sem-cab"><div></div>${cab}</div>
      ${semHora}
      <div class="sem-rolagem"><div class="sem-linha"><div class="sem-horas">${horas}</div>${colunas}</div></div>
    </div></div>`;
    semWrap.querySelector(".sem-rolagem").scrollTop = 8 * H;
  }

  // ---------- lista ----------
  function renderLista() {
    const lista = filtrar(eventos);
    mapa = new Map(lista.map(e => [e.id, e]));
    if (!lista.length) {
      listaWrap.innerHTML = `<div class="card" style="margin-top:0">Nenhum evento neste mês.</div>`;
      return;
    }
    let html = "", atual = "";
    lista.forEach(e => {
      if (e.dataEvento !== atual) {
        atual = e.dataEvento;
        const d = lerD(atual);
        html += `<div class="li-dia">${DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}</div>`;
      }
      html += `<button type="button" class="li-row" data-id="${e.id}">
        <span class="li-h">${hora(e) || "Sem horário"}</span>
        <span><b>${esc(e.tipoEvento.nome)}</b> – ${esc(nomeCli(e))}</span>
        <span class="tag ${ST[e.status].cls}">${ST[e.status].txt}</span></button>`;
    });
    listaWrap.innerHTML = html;
  }

  // ---------- cartão do evento (semana e lista) ----------
  function abrirDetalhe(id) {
    const e = mapa.get(+id);
    if (!e) return;
    detV.hidden = false;
    detV.innerHTML = `<b>${fmtData(e.dataEvento)}</b> · <b>${esc(e.tipoEvento.nome)}</b> – ${esc(nomeCli(e))}
      <span class="tag ${ST[e.status].cls}">${ST[e.status].txt}</span>${hora(e) ? "<br>" + hora(e) : ""}<br>
      Venda: <span class="val">${R(e.valorVendaReal)}</span> · Custo: <span class="val">${R(e.custoVariavel)}</span>
      <div class="acoes">
        <button type="button" class="mini" data-acao="editar" data-id="${e.id}">Editar</button>
        <button type="button" class="mini" data-acao="imprimir" data-id="${e.id}">Imprimir</button>
        ${zap(e)}
        <button type="button" class="mini perigo" data-acao="excluir" data-id="${e.id}">Excluir</button>
      </div>`;
    detV.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  detV.onclick = async ev => {
    const b = ev.target.closest("button[data-acao]");
    if (!b) return;
    const e = mapa.get(+b.dataset.id);
    if (!e) return;
    if (b.dataset.acao === "editar") editar(e);
    else if (b.dataset.acao === "imprimir") imprimir(e);
    else if (b.dataset.acao === "excluir") {
      if (!confirm("Excluir este evento? Essa ação não pode ser desfeita.")) return;
      const r = await fetch("/api/eventos/" + e.id, { method: "DELETE" });
      if (r.ok) { detV.hidden = true; await carregarMes(); }
      else alert("Não foi possível excluir o evento.");
    }
  };

  function novoEm(iso) {
    const [, m, d] = iso.split("-").map(Number);
    limpar();
    setv("dataEvento", iso);
    $("dataEvento").dispatchEvent(new Event("change"));   // confere conflito de horário
    $("tituloForm").textContent = `Novo evento – ${d} de ${MESES[m - 1]}`;
    tab("novo");
  }

  semWrap.onclick = ev => {
    const evt = ev.target.closest("[data-id]");
    if (evt) { abrirDetalhe(evt.dataset.id); return; }
    const dia = ev.target.closest("[data-novo]");
    if (dia && perfil === "ADMIN") novoEm(dia.dataset.novo);
  };
  listaWrap.onclick = ev => {
    const r = ev.target.closest("[data-id]");
    if (r) abrirDetalhe(r.dataset.id);
  };

  // ---------- troca de vista ----------
  function renderVista() {
    $("cal").hidden = vista !== "mes";
    $("det").hidden = vista !== "mes";
    semWrap.hidden = vista !== "semana";
    listaWrap.hidden = vista !== "lista";
    semanaSel.hidden = vista !== "semana";
    detV.hidden = true;
    seg.querySelectorAll("button").forEach(b => b.setAttribute("aria-pressed", b.dataset.v === vista));
    if (vista === "semana") { prepararSemanas(); renderSemana(); }
    if (vista === "lista") renderLista();
  }

  seg.onclick = ev => {
    const b = ev.target.closest("button[data-v]");
    if (!b) return;
    vista = b.dataset.v;
    renderVista();
  };
  semanaSel.onchange = () => { detV.hidden = true; renderSemana(); };
  $("vis").addEventListener("change", () => { if (vista !== "mes") renderVista(); });

  // sempre que o mês é recarregado (troca de mês, salvar, excluir), as vistas se atualizam
  const carregarMesOriginal = carregarMes;
  carregarMes = async function () {
    cache.clear();
    await carregarMesOriginal();
    renderVista();
  };
  $("mes").onchange = () => carregarMes();
  $("ano").onchange = () => carregarMes();

  renderVista();
})();