(function () {
  const hero = document.createElement("div");
  hero.id = "pnHero";
  $("inicio").prepend(hero);

  let eu = null;
  const euPronto = fetch("/api/me")
    .then(r => r.ok ? r.json() : null)
    .then(x => { eu = x; })
    .catch(() => {});

  // ---------- utilitários ----------
  const iso = d => d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  const idx = s => { const [y, m, d] = s.split("-").map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 86400000); };
  const pl = (n, s, p) => n === 1 ? s : p;
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
  const quando = n => n === 0 ? "hoje" : n === 1 ? "amanhã" : n > 0 ? `em ${n} dias` : `há ${-n} dia${n === -1 ? "" : "s"}`;
  const porData = (a, b) => a.dataEvento.localeCompare(b.dataEvento) || (a.horaInicio || "").localeCompare(b.horaInicio || "");
  const pend = e => Number(e.valorFinalContrato || 0) - Number(e.totalRecebido || 0);
  const nome = e => `${esc(e.tipoEvento.nome)} de ${esc(nomeCli(e))}`;

  // ---------- montagem ----------
  async function montar() {
    await euPronto;
    const lista = window.painelLista || [];
    const admin = !!eu && eu.perfil === "ADMIN";
    const agora = new Date();
    const base = idx(iso(agora));
    const falta = e => idx(e.dataEvento) - base;

    const futuros = lista.filter(e => falta(e) >= 0).sort(porData);
    const hoje = futuros.filter(e => falta(e) === 0);
    const semana = futuros.filter(e => falta(e) <= 6);
    const trinta = futuros.filter(e => falta(e) <= 30);
    const orc = futuros.filter(e => e.status === "ORCAMENTO");
    const orcUrgentes = orc.filter(e => falta(e) <= 15);
    const semConf = futuros.filter(e => e.status === "FECHADO" && !e.dataConfirmacao);
    const semHora = semana.filter(e => !e.horaInicio);
    const passadosReceber = lista
      .filter(e => falta(e) < 0 && e.status !== "ORCAMENTO" && pend(e) > 0.005)
      .sort(porData);

    // saudação
    const h = agora.getHours();
    const periodo = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
    const primeiro = eu && eu.nome ? eu.nome.trim().split(/\s+/)[0] : "";
    const generico = /^(administrador|acesso)$/i.test(primeiro);
    const saud = periodo + (primeiro && !generico ? ", " + esc(primeiro) : "");
    const dataExt = cap(agora.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }));

    // frase principal
    let manchete;
    if (hoje.length) {
      const e = hoje[0];
      manchete = `Hoje: ${nome(e)}${e.horaInicio ? " às " + e.horaInicio.slice(0, 5) : ""}` +
        (hoje.length > 1 ? ` e mais ${hoje.length - 1}` : "") + ".";
    } else if (orcUrgentes.length) {
      manchete = `${orcUrgentes.length} ${pl(orcUrgentes.length, "orçamento perto da data e sem resposta", "orçamentos perto da data e sem resposta")}.`;
    } else if (semana.length) {
      const e = semana[0];
      manchete = `Próximo evento ${quando(falta(e))}: ${nome(e)}.`;
    } else if (trinta.length) {
      const e = trinta[0];
      manchete = `Nenhum evento esta semana. O próximo é ${quando(falta(e))}: ${nome(e)}.`;
    } else {
      manchete = "Nenhum evento nos próximos 30 dias.";
    }

    const sub = `Esta semana você tem ${semana.length} ${pl(semana.length, "evento", "eventos")}.`;

    const chips = [
      `${semana.length} ${pl(semana.length, "evento", "eventos")} na semana`,
      `${trinta.length} em 30 dias`,
      `${orc.length} ${pl(orc.length, "orçamento", "orçamentos")} em aberto`,
      `${semConf.length} sem confirmação`
    ].map(t => `<span>${t}</span>`).join("");

    // pontos de atenção
    const itens = [];
    orcUrgentes.forEach(e => itens.push({ cor: "n", id: e.id,
      t: `Orçamento sem resposta, ${quando(falta(e))}: ${nome(e)}` }));
    if (admin) passadosReceber.forEach(e => itens.push({ cor: "n", id: e.id,
      t: `Já aconteceu e falta receber <b class="val">${R(pend(e))}</b>: ${nome(e)}` }));
    semConf.forEach(e => itens.push({ cor: "a", id: e.id,
      t: `Sem data de confirmação, ${quando(falta(e))}: ${nome(e)}` }));
    semHora.forEach(e => itens.push({ cor: "a", id: e.id,
      t: `Sem horário definido, ${quando(falta(e))}: ${nome(e)}` }));

    const MAX = 6;
    const linhas = itens.length
      ? itens.slice(0, MAX).map(i => `<div class="at-item"><i class="dot ${i.cor}"></i>
          <span>${i.t}</span><button type="button" class="mini" data-ver="${i.id}">Ver no calendário</button></div>`).join("") +
        (itens.length > MAX ? `<div class="note">e mais ${itens.length - MAX}…</div>` : "")
      : `<div class="at-item"><i class="dot v"></i><span>Nenhum ponto de atenção agora.</span></div>`;

    hero.innerHTML = `
      <div class="saud"><h2>${saud}</h2><div class="note" style="margin:0">${dataExt}</div></div>
      <section class="hero solo">
        <div>
          <div class="rot">Resumo de hoje</div>
          <h1>${manchete}</h1>
          <p>${sub}</p>
          <div class="chips">${chips}</div>
        </div>
      </section>
      <div class="card atencao">
        <h3 style="margin-top:0">Pontos de atenção (${itens.length})</h3>
        ${linhas}
      </div>`;
  }

  // "Ver no calendário": abre o mês do evento e seleciona o dia
  hero.addEventListener("click", async ev => {
    const b = ev.target.closest("button[data-ver]");
    if (!b) return;
    const e = (window.painelLista || []).find(x => x.id == b.dataset.ver);
    if (!e) return;
    const [y, m, d] = e.dataEvento.split("-");
    if ([...$("ano").options].some(o => o.value === y)) $("ano").value = y;
    $("mes").value = +m - 1;
    await carregarMes();
    sel = +d;
    cal();
    det();
    tab("agenda");
  });

  // sempre que o Início carrega os eventos, o resumo é refeito
  window.addEventListener("painelCarregado", montar);
  if (window.painelLista) montar();
})();