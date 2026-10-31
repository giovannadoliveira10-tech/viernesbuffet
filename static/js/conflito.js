(function () {
  const aviso = document.createElement("div");
  aviso.id = "avisoConflito";
  $("horaFim").closest(".grid").after(aviso);

  let conflitoReal = false;
  let ultimaBusca = 0;

  const minutos = h => { const [a, b] = h.slice(0, 5).split(":"); return +a * 60 + +b; };
  const diaIdx = s => { const [y, m, d] = s.split("-").map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 86400000); };

  // faixa em minutos absolutos; se termina "antes" de começar, termina no dia seguinte
  function faixa(data, ini, fim) {
    const base = diaIdx(data) * 1440;
    const a = base + minutos(ini);
    let b = base + minutos(fim);
    if (b <= a) b += 1440;
    return [a, b];
  }

  const linha = e => `${esc(e.tipoEvento.nome)} – ${esc(nomeCli(e))}${hora(e) ? " (" + hora(e) + ")" : ""}`;
  const caixa = (cor, html) =>
    `<div class="card" style="border-color:${cor};margin:12px 0">${html}</div>`;

  async function verificar() {
    const minha = ++ultimaBusca;
    const data = $("dataEvento").value;
    if (!data) { aviso.innerHTML = ""; conflitoReal = false; return; }

    // mês do dia anterior, do dia e do dia seguinte
    const [y, m, d] = data.split("-").map(Number);
    const meses = new Set();
    [-1, 0, 1].forEach(o => {
      const t = new Date(Date.UTC(y, m - 1, d + o));
      meses.add(t.getUTCFullYear() + "-" + (t.getUTCMonth() + 1));
    });

    let lista = [];
    for (const k of meses) {
      const [a, b] = k.split("-");
      const r = await fetch(`/api/eventos?mes=${b}&ano=${a}`);
      if (r.ok) lista = lista.concat(await r.json());
    }
    if (minha !== ultimaBusca) return;   // chegou resposta velha, ignora

    lista = lista.filter(e => e.id !== editandoId);
    const mesmoDia = lista.filter(e => e.dataEvento === data);

    const ini = $("horaIni").value, fim = $("horaFim").value;
    let conflitos = [];
    if (ini && fim) {
      const [a0, a1] = faixa(data, ini, fim);
      conflitos = lista.filter(e => {
        if (!e.horaInicio || !e.horaFim) return false;
        const [b0, b1] = faixa(e.dataEvento, e.horaInicio, e.horaFim);
        return a0 < b1 && b0 < a1;
      });
    }

    conflitoReal = conflitos.length > 0;

    if (conflitos.length) {
      aviso.innerHTML = caixa("var(--r)",
        `<b style="color:var(--r)">Conflito de horário</b> com ${conflitos.length === 1 ? "este evento" : "estes eventos"}:` +
        conflitos.map(e => `<div class="ev">${linha(e)} – ${fmtData(e.dataEvento)}</div>`).join(""));
    } else if (mesmoDia.length) {
      aviso.innerHTML = caixa("var(--y)",
        `<b>Já existe${mesmoDia.length > 1 ? "m" : ""} ${mesmoDia.length} evento${mesmoDia.length > 1 ? "s" : ""} neste dia</b>` +
        mesmoDia.map(e => `<div class="ev">${linha(e)}</div>`).join("") +
        `<div class="note">${ini && fim ? "Os horários não se sobrepõem." : "Informe o início e o término para verificar se há sobreposição."}</div>`);
    } else {
      aviso.innerHTML = "";
    }
  }

  ["dataEvento", "horaIni", "horaFim"].forEach(id => $(id).addEventListener("change", verificar));

  // pergunta antes de salvar quando há conflito
  const salvarOriginal = $("save").onclick;
  $("save").onclick = async () => {
    await verificar();
    if (conflitoReal && !confirm("Existe conflito de horário com outro evento. Deseja salvar mesmo assim?")) return;
    return salvarOriginal();
  };

  // ao limpar o formulário some o aviso; ao editar, confere de novo
  const limparOriginal = limpar;
  limpar = function () { limparOriginal(); aviso.innerHTML = ""; conflitoReal = false; };

  const editarOriginal = editar;
  editar = function (e) { editarOriginal(e); verificar(); };
})();