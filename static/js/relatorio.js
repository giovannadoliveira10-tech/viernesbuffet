(function () {
  const rel = $("rel");
  rel.querySelector("h2").textContent = "Relatório";

  // o "+ Ano" do relatório sai: os anos são adicionados pelo calendário
  rel.querySelectorAll(".bar button").forEach((b) => {
    if (b.textContent.trim() === "+ Ano") b.remove();
  });

  // seletor de mês
  const mesSel = document.createElement("select");
  mesSel.id = "mesRel";
  mesSel.setAttribute("aria-label", "Mês");
  mesSel.innerHTML =
    `<option value="todos">Ano inteiro</option>` +
    MESES.map((m, i) => `<option value="${i}">${m}</option>`).join("");
  mesSel.value = String(new Date().getMonth());
  $("anoRel").before(mesSel);

  // cartões e gráfico, antes da tabela
  const kp = document.createElement("div");
  kp.id = "relKpis";
  kp.className = "kpis";
  const gr = document.createElement("div");
  gr.id = "relGraf";
  gr.className = "card";
  gr.style.cssText = "margin:0 0 16px";
  $("tb").closest(".tw").before(kp, gr);

  async function buscar(ano, m) {
    if (m !== "todos") {
      const r = await fetch(`/api/eventos?mes=${+m + 1}&ano=${ano}`);
      return r.ok ? r.json() : [];
    }
    const partes = await Promise.all(
      Array.from({ length: 12 }, (_, i) =>
        fetch(`/api/eventos?mes=${i + 1}&ano=${ano}`)
          .then((r) => (r.ok ? r.json() : []))
          .catch(() => []),
      ),
    );
    return partes.flat();
  }

  const n = (x) => Number(x || 0);
  const soma = (l, f) => l.reduce((s, e) => s + n(f(e)), 0);
  const pl = (q, s, p) => (q === 1 ? s : p);

  let seq = 0,
    iniciado = false;
  relatorio = async function () {
    if (!iniciado) {
      iniciado = true;
      const atual = String(new Date().getFullYear());
      if ([...$("anoRel").options].some((o) => o.value === atual))
        $("anoRel").value = atual;
    }
    const meu = ++seq;
    const ano = $("anoRel").value,
      m = $("mesRel").value;
    const todos = await buscar(ano, m);
    if (meu !== seq) return;

    // o relatório conta só o que é venda: orçamentos ficam de fora
    const lista = todos
      .filter((e) => e.status !== "ORCAMENTO")
      .sort(
        (a, b) =>
          a.dataEvento.localeCompare(b.dataEvento) ||
          (a.horaInicio || "").localeCompare(b.horaInicio || ""),
      );

    const venda = soma(lista, (e) => e.valorVendaReal);
    const custo = soma(lista, (e) => e.custoVariavel);
    const recebido = soma(lista, (e) => e.totalRecebido);
    const aReceber = lista.reduce(
      (s, e) => s + Math.max(0, n(e.valorFinalContrato) - n(e.totalRecebido)),
      0,
    );

    const kpi = (t, v, extra) =>
      `<div class="kpi"><span>${t}</span><b class="val">${v}</b>${extra ? `<small class="note" style="margin:0;display:block">${extra}</small>` : ""}</div>`;
    $("relKpis").innerHTML =
      kpi(
        "Venda",
        R(venda),
        `${lista.length} ${pl(lista.length, "evento", "eventos")}`,
      ) +
      kpi("Custo", R(custo)) +
      kpi("Lucro", R(venda - custo)) +
      kpi("Recebido", R(recebido)) +
      kpi("A receber", R(aReceber));

    // gráfico: por dia (mês) ou por mês (ano inteiro)
    const grupos = new Map();
    lista.forEach((e) => {
      const k = m === "todos" ? e.dataEvento.slice(0, 7) : e.dataEvento;
      const g = grupos.get(k) || { v: 0, r: 0 };
      g.v += n(e.valorVendaReal);
      g.r += n(e.totalRecebido);
      grupos.set(k, g);
    });
    const chaves = [...grupos.keys()].sort();
    const max = Math.max(
      1,
      ...chaves.map((k) => Math.max(grupos.get(k).v, grupos.get(k).r)),
    );
    const rot = (k) =>
      m === "todos" ? MESES[+k.slice(5, 7) - 1] : fmtData(k).slice(0, 5);

    $("relGraf").innerHTML =
      `<h3 style="margin-top:0">${m === "todos" ? "Venda por mês" : "Venda por dia"}</h3>
       <div class="gr-leg"><span><i class="gr-b gr-v"></i>Venda</span><span><i class="gr-b gr-r"></i>Recebido</span></div>` +
      (chaves.length
        ? chaves
            .map((k) => {
              const g = grupos.get(k);
              return `<div class="gr-lin"><span class="gr-rot">${rot(k)}</span>
              <div class="gr-barras">
                <div class="gr-b gr-v" style="width:${(g.v / max) * 100}%"></div>
                <div class="gr-b gr-r" style="width:${(g.r / max) * 100}%"></div>
              </div>
              <span class="gr-val val">${R(g.v)}</span></div>`;
            })
            .join("")
        : `<div class="note">Sem eventos neste período.</div>`);

    // tabela
    let tv = 0,
      tc = 0;
    const linhas = lista
      .map((e) => {
        const v = n(e.valorVendaReal),
          c = n(e.custoVariavel);
        tv += v;
        tc += c;
        return `<tr><td>${fmtData(e.dataEvento)}</td><td>${esc(e.tipoEvento.nome)} – ${esc(nomeCli(e))}</td>
        <td class="r val">${R(v)}</td><td class="r val">${R(c)}</td><td class="r val">${R(v - c)}</td></tr>`;
      })
      .join("");
    $("tb").innerHTML =
      "<tr><th>Data</th><th>Evento</th><th class='r'>Venda</th><th class='r'>Custo</th><th class='r'>Diferença</th></tr>" +
      (linhas || "<tr><td colspan='5'>Nenhum evento neste período.</td></tr>") +
      `<tr><th colspan="2">Total</th><th class="r val">${R(tv)}</th><th class="r val">${R(tc)}</th><th class="r val">${R(tv - tc)}</th></tr>`;
  };

  // controles do relatório
  $("anoRel").onchange = () => relatorio();
  mesSel.onchange = () => relatorio();
  $("imprimirRel").onclick = () => {
    const m = $("mesRel").value;
    const titulo =
      m === "todos"
        ? `Relatório ${$("anoRel").value}`
        : `Relatório ${MESES[+m]} de ${$("anoRel").value}`;
    $("ficha").innerHTML = `<h1>V | b &nbsp; ${titulo}</h1>
      <p class="sub">Diferença = valor da venda – custo</p><table class="rel">${$("tb").innerHTML}</table>
      <div class="rod">Impresso em ${new Date().toLocaleDateString("pt-BR")}</div>`;
    window.print();
  };
})();
