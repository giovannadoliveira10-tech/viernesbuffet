(function () {
  const FORMAS = { PIX: "Pix", CARTAO: "Cartão", DINHEIRO: "Dinheiro", TRANSFERENCIA: "Transferência", OUTRO: "Outro" };
  const hojeIso = () => {
    const d = new Date();
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  };

  // painel dentro do formulário, logo abaixo dos resumos de valores
  const h = document.createElement("h3");
  h.textContent = "Pagamentos";
  const box = document.createElement("div");
  box.id = "pagBox";
  $("resFin").parentElement.after(h);
  h.after(box);

  // "Total recebido" passa a ser calculado pelos pagamentos
  $("recebido").readOnly = true;
  $("recebido").style.background = "#f6f3ec";
  $("recebido").closest("label").querySelector("span").textContent = "Total recebido (R$) – soma dos pagamentos";

  function desenhar(d) {
    const final = parseMoeda($("vFinal").value) || 0;
    const falta = final - Number(d.total);

    setv("recebido", d.total);
    $("recebido").dispatchEvent(new Event("input"));

    const linhas = d.pagamentos.length
      ? d.pagamentos.map(p => `<tr>
          <td>${fmtData(p.data)}</td><td>${esc(FORMAS[p.forma] || p.forma)}</td>
          <td class="r val">${R(p.valor)}</td><td>${esc(p.observacao)}</td>
          <td><button type="button" class="mini perigo" data-del="${p.id}">Excluir</button></td></tr>`).join("")
      : `<tr><td colspan="5">Nenhum pagamento registrado.</td></tr>`;

    const situacao = final > 0
      ? (falta > 0.005 ? `Falta <b class="val">${R(falta)}</b>` : "<b>Contrato quitado</b>")
      : "";

    box.innerHTML = `
      <div class="tw"><table>
        <tr><th>Data</th><th>Forma</th><th class="r">Valor</th><th>Observação</th><th></th></tr>
        ${linhas}
        <tr><th colspan="2">Total recebido</th><th class="r val">${R(d.total)}</th><th colspan="2">${situacao}</th></tr>
      </table></div>
      <div class="grid" style="margin-top:12px">
        <label><span>Data</span><input id="pgData" type="date" value="${hojeIso()}"></label>
        <label><span>Valor (R$)</span><input id="pgValor" inputmode="decimal" placeholder="0,00"></label>
        <label><span>Forma</span><select id="pgForma">
          ${Object.entries(FORMAS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("")}
        </select></label>
        <label><span>Observação</span><input id="pgObs" placeholder="Ex.: sinal, 2ª parcela"></label>
      </div>
      <button type="button" class="btn sec" id="pgAdd">Registrar pagamento</button>`;
  }

  async function carregar() {
    if (!editandoId) {
      box.innerHTML = `<div class="note">Salve o evento para registrar os pagamentos.</div>`;
      return;
    }
    const r = await fetch(`/api/eventos/${editandoId}/pagamentos`);
    if (!r.ok) { box.innerHTML = `<div class="note">Não foi possível carregar os pagamentos.</div>`; return; }
    desenhar(await r.json());
  }

  box.addEventListener("input", ev => {
    if (ev.target.id === "pgValor") ev.target.value = ev.target.value.replace(/[^\d.,]/g, "");
  });
  box.addEventListener("focusout", ev => {
    if (ev.target.id === "pgValor") {
      const n = parseMoeda(ev.target.value);
      ev.target.value = n == null ? "" : fmtMoeda(n);
    }
  });

  box.onclick = async ev => {
    if (ev.target.id === "pgAdd") {
      const valor = parseMoeda($("pgValor").value);
      const data = $("pgData").value;
      if (!valor || valor <= 0) { alert("Informe o valor do pagamento."); return; }
      if (!data) { alert("Informe a data do pagamento."); return; }
      const r = await fetch(`/api/eventos/${editandoId}/pagamentos`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data, valor, forma: $("pgForma").value, observacao: $("pgObs").value.trim() || null })
      });
      if (!r.ok) { alert("Não foi possível registrar o pagamento."); return; }
      desenhar(await r.json());
      return;
    }
    const del = ev.target.closest("button[data-del]");
    if (del) {
      if (!confirm("Excluir este pagamento?")) return;
      const r = await fetch(`/api/eventos/${editandoId}/pagamentos/${del.dataset.del}`, { method: "DELETE" });
      if (r.ok) desenhar(await r.json()); else alert("Não foi possível excluir o pagamento.");
    }
  };

  // acompanha o formulário
  const limparOriginal = limpar;
  limpar = function () { limparOriginal(); carregar(); };

  const editarOriginal = editar;
  editar = function (e) { editarOriginal(e); carregar(); };

  // botão na janela "Evento salvo!"
  const bPag = document.createElement("button");
  bPag.className = "btn sec";
  bPag.id = "mPag";
  bPag.textContent = "Registrar pagamento";
  $("mImprimir").after(bPag);
  bPag.onclick = () => { $("modal").hidden = true; editar(ultimoSalvo); };

  carregar();
})();