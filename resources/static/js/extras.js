(function () {
  const CAMPOS = ["vPessoa", "vBuffet", "vFinal", "custo", "vVenda", "recebido"];
  const AUTO = ["vBuffet", "vFinal", "vVenda"];

  // ---------- Campos de dinheiro com vírgula ----------
  CAMPOS.forEach(id => {
    const el = $(id);
    el.type = "text";
    el.inputMode = "decimal";
    el.placeholder = "0,00";
    el.dataset.money = "1";
    el.addEventListener("input", () => { el.value = el.value.replace(/[^\d.,]/g, ""); });
    el.addEventListener("blur", () => {
      const n = parseMoeda(el.value);
      el.value = n == null ? "" : fmtMoeda(n);
    });
  });
  document.querySelectorAll("#novo h3").forEach(h => {
    if (h.textContent.includes("use ponto")) h.textContent = "Valores (use vírgula para os centavos, ex.: 180,50)";
  });

  // ---------- Cálculos automáticos ----------
  const din = id => parseMoeda($(id).value) || 0;
  const qtd = id => parseFloat($(id).value) || 0;
  const arred = x => Math.round(x * 100) / 100;

  const painel = document.createElement("div");
  painel.innerHTML = `
    <div class="bar" style="margin-top:14px">
      <button type="button" class="mini" id="recalc">Recalcular automático</button>
      <span class="note" style="margin:0">Buffet, valor final e venda real são calculados sozinhos. Se você digitar em um deles, ele passa a ser manual.</span>
    </div>
    <div class="kpis" id="resFin"></div>`;
  $("bar").closest(".card").after(painel);

  function calcular() {
    const porPessoa = din("vPessoa");
    const inteiros = qtd("inteiros"), meias = qtd("meias"), nao = qtd("naoPag");
    const base = (inteiros + meias + nao) > 0 ? inteiros + meias * 0.5 : qtd("prev");
    const set = (id, v) => { if (!$(id).dataset.manual) $(id).value = fmtMoeda(arred(v)); };

    if (porPessoa > 0) {
      set("vBuffet", porPessoa * qtd("prev"));
      set("vFinal", porPessoa * base);
      set("vVenda", din("vFinal"));
    } else {
      AUTO.forEach(id => { if (!$(id).dataset.manual) $(id).value = ""; });
    }

    const final = din("vFinal"), venda = din("vVenda"), custo = din("custo"), receb = din("recebido");
    const lucro = venda - custo;
    const margem = venda > 0
      ? (lucro / venda * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + "%" : "—";
    const kpi = (t, v, mask = true) =>
      `<div class="kpi"><span>${t}</span><b${mask ? ' class="val"' : ""}>${v}</b></div>`;

    $("resFin").innerHTML =
      kpi("Pagantes (inteiros + meias ÷ 2)", base.toLocaleString("pt-BR"), false) +
      kpi("Valor final do contrato", R(final)) +
      kpi("Total recebido", R(receb)) +
      kpi("A receber", R(final - receb)) +
      kpi("Custo variável", R(custo)) +
      kpi("Lucro (venda − custo)", R(lucro)) +
      kpi("Margem", margem);
  }

  AUTO.forEach(id => $(id).addEventListener("input", () => {
    if ($(id).value === "") delete $(id).dataset.manual; else $(id).dataset.manual = "1";
  }));
  ["vPessoa", "prev", "inteiros", "meias", "naoPag", "vBuffet", "vFinal", "vVenda", "custo", "recebido"]
    .forEach(id => $(id).addEventListener("input", calcular));

  $("recalc").onclick = () => { AUTO.forEach(id => delete $(id).dataset.manual); calcular(); };

  const limparOriginal = limpar;
  limpar = function () {
    limparOriginal();
    AUTO.forEach(id => delete $(id).dataset.manual);
    calcular();
  };

  const editarOriginal = editar;
  editar = function (e) {
    editarOriginal(e);
    AUTO.forEach(id => { if ($(id).value !== "") $(id).dataset.manual = "1"; });
    calcular();
  };

  calcular();

  // ---------- Anos (guardados no banco) ----------
  async function carregarAnos() {
    try {
      const r = await fetch("/api/anos");
      if (!r.ok) return;
      const anos = (await r.json()).map(String);
      ["ano", "anoRel"].forEach(id => {
        const s = $(id), atual = s.value;
        s.innerHTML = anos.map(a => `<option>${a}</option>`).join("");
        if (anos.includes(atual)) s.value = atual;
      });
    } catch (e) { console.error(e); }
  }

  async function adicionarAno(a) {
    a = String(a).trim();
    if (!/^\d{4}$/.test(a) || +a < 2000 || +a > 2100) { alert("Ano inválido."); return false; }
    const r = await fetch("/api/anos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ano: +a })
    });
    if (!r.ok) { alert("Não foi possível adicionar o ano."); return false; }
    await carregarAnos();
    return true;
  }

  function botaoAno(selectId, aoMudar) {
    const b = document.createElement("button");
    b.type = "button"; b.className = "mini"; b.textContent = "+ Ano";
    b.onclick = async () => {
      const v = prompt("Digite o ano que deseja adicionar (ex.: 2030):");
      if (!v) return;
      if (await adicionarAno(v)) { $(selectId).value = v.trim(); aoMudar(); }
    };
    $(selectId).after(b);
  }

  $("dataEvento").addEventListener("change", async e => {
    const a = e.target.value.slice(0, 4);
    if (a && ![...$("ano").options].some(o => o.value === a)) await adicionarAno(a);
  });

  carregarAnos();
  botaoAno("ano", carregarMes);
  botaoAno("anoRel", relatorio);
})();