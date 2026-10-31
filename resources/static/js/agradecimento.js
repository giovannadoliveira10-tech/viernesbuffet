(function () {
  let modelo = "Olá, {cliente}! Foi uma alegria participar do seu {tipo}. Esperamos que tenha sido um dia inesquecível. Muito obrigado pela confiança! Um abraço, equipe Viernes.";
  let perfil = null;
  let pendentes = [];
  let abertoLista = false, abertoTexto = false;

  const pronto = Promise.all([
    fetch("/api/me").then(r => r.ok ? r.json() : null).then(eu => { perfil = eu ? eu.perfil : null; }),
    fetch("/api/agradecimento/modelo").then(r => r.ok ? r.json() : null).then(m => { if (m && m.texto) modelo = m.texto; })
  ]).catch(() => {});

  // a tela de Ajustes avisa quando a mensagem é alterada
  window.addEventListener("modeloAgradecimento", e => { modelo = e.detail; });

  // ---------- utilitários ----------
  const hojeIso = () => {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  };
  const idx = s => { const [y, m, d] = s.split("-").map(Number); return Math.floor(Date.UTC(y, m - 1, d) / 86400000); };
  const primeiro = s => (s || "").trim().split(/\s+/)[0];
  const nomes = e => {
    const a = primeiro(e.cliente1.nome), b = e.cliente2 ? primeiro(e.cliente2.nome) : "";
    return b ? a + " e " + b : a;
  };
  const mensagem = e => modelo
    .split("{cliente}").join(nomes(e))
    .split("{tipo}").join(e.tipoEvento.nome.toLowerCase())
    .split("{data}").join(fmtData(e.dataEvento));
  const numeroZap = e => {
    const d = (e.cliente1.telefone1 || "").replace(/\D/g, "");
    if (!d) return "";
    return d.length <= 11 ? "55" + d : d;
  };
  const linkZap = e => {
    const n = numeroZap(e);
    return n ? `https://wa.me/${n}?text=${encodeURIComponent(mensagem(e))}` : "";
  };

  function botoes(e) {
    if (e.agradecimentoEnviadoEm)
      return `<span class="tag v">Agradecimento enviado em ${fmtData(e.agradecimentoEnviadoEm.slice(0, 10))}</span>
              <button type="button" class="mini" data-agr="desmarcar" data-id="${e.id}">Desmarcar</button>`;
    const link = linkZap(e);
    return (link
      ? `<a class="mini" target="_blank" rel="noopener" href="${link}">Enviar agradecimento</a>`
      : `<span class="note" style="margin:0">Sem telefone para o agradecimento</span>`) +
      ` <button type="button" class="mini" data-agr="marcar" data-id="${e.id}">Marcar como enviado</button>`;
  }

  // ---------- marcar / desmarcar ----------
  async function alternar(id, marcar) {
    const r = await fetch(`/api/agradecimento/${id}/enviado`, { method: marcar ? "POST" : "DELETE" });
    if (!r.ok) { alert("Não foi possível atualizar o agradecimento."); return; }
    const d = await r.json();
    [...eventos, ...pendentes].forEach(x => { if (x.id === id) x.agradecimentoEnviadoEm = d.enviadoEm; });
    if (!$("agenda").hidden && sel) det();
    if ($("pnAgr")) desenharPendentes();
  }

  document.addEventListener("click", ev => {
    const b = ev.target.closest("button[data-agr]");
    if (b) alternar(+b.dataset.id, b.dataset.agr === "marcar");
  });

  // ---------- botões na agenda ----------
  const detOriginal = det;
  det = function () {
    detOriginal();
    if (perfil !== "ADMIN") return;
    const hoje = hojeIso();
    document.querySelectorAll("#det .acoes").forEach(div => {
      const id = div.querySelector("[data-acao='editar']")?.dataset.id;
      const e = eventos.find(x => x.id == id);
      if (!e || e.dataEvento > hoje) return;
      div.insertAdjacentHTML("beforeend", " " + botoes(e));
    });
  };

  // ---------- quadro no Início (só aparece se houver pendência) ----------
  async function carregarPendentes() {
    const hoje = new Date(), base = idx(hojeIso());
    const pedidos = [0, -1, -2].map(o => {
      const t = new Date(hoje.getFullYear(), hoje.getMonth() + o, 1);
      return fetch(`/api/eventos?mes=${t.getMonth() + 1}&ano=${t.getFullYear()}`)
        .then(r => r.ok ? r.json() : []).catch(() => []);
    });
    const todos = (await Promise.all(pedidos)).flat();
    pendentes = todos
      .filter(e => e.status !== "ORCAMENTO" && !e.agradecimentoEnviadoEm
        && idx(e.dataEvento) <= base && base - idx(e.dataEvento) <= 60)
      .sort((a, b) => b.dataEvento.localeCompare(a.dataEvento));
  }

  function montarHtml() {
    const lista = pendentes.filter(e => !e.agradecimentoEnviadoEm);
    const itens = abertoLista
      ? lista.slice(0, 10).map(e => `<div class="ev"><b>${esc(e.tipoEvento.nome)}</b> – ${esc(nomeCli(e))} · ${fmtData(e.dataEvento)}
          <div class="acoes">${botoes(e)}</div></div>`).join("") +
        (lista.length > 10 ? `<div class="note">e mais ${lista.length - 10}…</div>` : "")
      : "";
    const editor = abertoTexto
      ? `<div style="margin-top:10px">
           <label><span>Use {cliente}, {tipo} e {data} onde quiser</span>
             <textarea id="agrTexto" rows="3">${esc(modelo)}</textarea></label>
           <button class="mini" id="agrSalvar" type="button" style="margin-top:8px">Salvar mensagem</button>
         </div>`
      : "";
    return `<div class="card" id="pnAgr" style="grid-column:1/-1;padding:10px 16px">
      <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
        <b>Agradecimentos pendentes: ${lista.length}</b>
        <button type="button" class="mini" id="agrVer">${abertoLista ? "Ocultar" : "Ver lista"}</button>
        <button type="button" class="mini" id="agrEdit" style="margin-left:auto">${abertoTexto ? "Fechar" : "Editar mensagem"}</button>
      </div>
      ${itens}${editor}
    </div>`;
  }

  function ligarEditor() {
    $("agrEdit").onclick = () => { abertoTexto = !abertoTexto; desenharPendentes(); };
    $("agrVer").onclick = () => { abertoLista = !abertoLista; desenharPendentes(); };
    if (!abertoTexto) return;
    $("agrSalvar").onclick = async () => {
      const texto = $("agrTexto").value.trim();
      if (!texto) { alert("Escreva a mensagem."); return; }
      const r = await fetch("/api/agradecimento/modelo", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto })
      });
      if (!r.ok) { alert("Não foi possível salvar a mensagem."); return; }
      modelo = (await r.json()).texto;
      abertoTexto = false;
      desenharPendentes();
      alert("Mensagem salva.");
    };
  }

  function desenharPendentes() {
    $("pnAgr")?.remove();
    if (pendentes.some(e => !e.agradecimentoEnviadoEm)) {
      $("pnListas").insertAdjacentHTML("beforeend", montarHtml());
      ligarEditor();
    } else {
      abertoLista = false;
      abertoTexto = false;
    }
  }

  let ocupado = false;
  async function injetar() {
    if (ocupado || $("pnAgr")) return;
    ocupado = true;
    try {
      await pronto;
      if (perfil !== "ADMIN") return;
      await carregarPendentes();
      desenharPendentes();
    } finally { ocupado = false; }
  }

    // sempre que o Início carrega, confere de novo se há pendências
  window.addEventListener("painelCarregado", () => { $("pnAgr")?.remove(); injetar(); });
  if (window.painelLista) injetar();
})();