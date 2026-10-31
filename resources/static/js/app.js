const MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const ST = {
  ORCAMENTO: { cls: "a", txt: "Orçamento" },
  FECHADO: { cls: "v", txt: "Fechado" },
  NAO_PAGO: { cls: "n", txt: "Não pago" },
};

const $ = (id) => document.getElementById(id);
const R = (n) =>
  n == null
    ? "—"
    : "R$ " + Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const dia = (e) => +e.dataEvento.split("-")[2];
const hora = (e) =>
  e.horaInicio
    ? e.horaInicio.slice(0, 5) + (e.horaFim ? "–" + e.horaFim.slice(0, 5) : "")
    : "";
const nomeCli = (e) =>
  e.cliente1.nome + (e.cliente2 ? " e " + e.cliente2.nome : "");
const fmtData = (s) => (s ? s.split("-").reverse().join("/") : "—");
const ou = (v) => (v === null || v === undefined || v === "" ? "—" : esc(v));

// filtro do calendário: todos, futuros (de hoje em diante) ou já realizados (antes de hoje)
const hojeIsoFiltro = () => {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
};
const passaFiltro = (e) => {
  const f = $("vis").value;
  if (f === "futuros") return e.dataEvento >= hojeIsoFiltro();
  if (f === "passados") return e.dataEvento < hojeIsoFiltro();
  return true;
};

let eventos = [];
let sel = null;
let editandoId = null;
let ultimoSalvo = null;

$("anoRodape").textContent = "© " + new Date().getFullYear();

// ---------- Abas ----------
function tab(t) {
  ["agenda", "novo", "rel"].forEach((s) => ($(s).hidden = s !== t));
  document
    .querySelectorAll("nav button")
    .forEach((b) => b.setAttribute("aria-selected", b.dataset.t === t));
  if (t === "rel") relatorio();
  window.scrollTo(0, 0);
}
document
  .querySelectorAll("nav button")
  .forEach((b) => (b.onclick = () => tab(b.dataset.t)));

// ---------- Agenda ----------
const hoje = new Date();
$("mes").innerHTML = MESES.map(
  (m, i) => `<option value="${i}">${m}</option>`,
).join("");
$("mes").value = hoje.getMonth();
if ([...$("ano").options].some((o) => o.value == hoje.getFullYear()))
  $("ano").value = hoje.getFullYear();

async function carregarMes() {
  const r = await fetch(
    `/api/eventos?mes=${+$("mes").value + 1}&ano=${$("ano").value}`,
  );
  if (!r.ok) {
    alert("Não foi possível carregar os eventos.");
    return;
  }
  eventos = await r.json();
  sel = null;
  $("det").innerHTML = "<b>Toque em um dia</b> para ver os eventos.";
  cal();
}

function cal() {
  const m = +$("mes").value,
    y = +$("ano").value;
  const first = new Date(y, m, 1).getDay();
  const n = new Date(y, m + 1, 0).getDate();
  const f = $("vis").value;
  let h =
    ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]
      .map((x) => `<div class="h">${x}</div>`)
      .join("") + "<div></div>".repeat(first);
  for (let d = 1; d <= n; d++) {
    const es = eventos.filter((e) => dia(e) === d && passaFiltro(e));
    h +=
      `<button class="d${sel === d ? " sel" : ""}" data-d="${d}"><b>${d}</b>` +
      es
        .map(
          (e) =>
            `<span class="chip ${ST[e.status].cls}">${esc(e.tipoEvento.nome)}</span>`,
        )
        .join("") +
      `</button>`;
  }
  $("cal").innerHTML = h;
  document.querySelectorAll(".cal .d").forEach(
    (b) =>
      (b.onclick = () => {
        sel = +b.dataset.d;
        cal();
        det();
      }),
  );
}

function zap(e) {
  const digitos = (e.cliente1.telefone1 || "").replace(/\D/g, "");
  if (!digitos) return "";
  const numero = digitos.length <= 11 ? "55" + digitos : digitos;
  return `<a class="mini" target="_blank" rel="noopener" href="https://wa.me/${numero}">WhatsApp</a>`;
}

function det() {
  const es = eventos.filter((e) => dia(e) === sel && passaFiltro(e));
  $("det").innerHTML =
    `<b>${sel} de ${MESES[+$("mes").value]}</b>` +
    (es.length
      ? es
          .map(
            (
              e,
            ) => `<div class="ev"><b>${esc(e.tipoEvento.nome)}</b> – ${esc(nomeCli(e))}
        <span class="tag ${ST[e.status].cls}">${ST[e.status].txt}</span><br>${hora(e)}<br>
        Venda: <span class="val">${R(e.valorVendaReal)}</span> · Custo: <span class="val">${R(e.custoVariavel)}</span>
        <div class="acoes">
          <button class="mini" data-acao="editar" data-id="${e.id}">Editar</button>
          <button class="mini" data-acao="imprimir" data-id="${e.id}">Imprimir</button>
          ${zap(e)}
          <button class="mini perigo" data-acao="excluir" data-id="${e.id}">Excluir</button>
        </div></div>`,
          )
          .join("")
      : `<div class="ev">Nenhum evento neste dia.</div>`);
}

$("det").onclick = async (ev) => {
  const b = ev.target.closest("button[data-acao]");
  if (!b) return;
  const e = eventos.find((x) => x.id == b.dataset.id);
  if (!e) return;
  if (b.dataset.acao === "editar") editar(e);
  else if (b.dataset.acao === "imprimir") imprimir(e);
  else if (b.dataset.acao === "excluir") {
    if (!confirm("Excluir este evento? Essa ação não pode ser desfeita."))
      return;
    const r = await fetch("/api/eventos/" + e.id, { method: "DELETE" });
    if (r.ok) carregarMes();
    else alert("Não foi possível excluir o evento.");
  }
};

["mes", "ano"].forEach((i) => ($(i).onchange = carregarMes));
$("vis").onchange = cal;

// ---------- Tipos de evento ----------
async function carregarTipos() {
  const atual = $("tipoEvento").value;
  const r = await fetch("/api/tipos-evento");
  const tipos = await r.json();
  $("tipoEvento").innerHTML = tipos
    .map((t) => `<option value="${t.id}">${esc(t.nome)}</option>`)
    .join("");
  if (atual) $("tipoEvento").value = atual;
}

$("addTipo").onclick = async () => {
  const nome = $("novoTipo").value.trim();
  if (!nome) return;
  const r = await fetch("/api/tipos-evento", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nome }),
  });
  if (r.ok) {
    $("novoTipo").value = "";
    carregarTipos();
  } else alert("Não foi possível cadastrar. Esse tipo já existe?");
};

// ---------- Formulário ----------
function atualizarTotal() {
  const total = [...document.querySelectorAll(".g")].reduce(
    (s, x) => s + (+x.value || 0),
    0,
  );
  $("tot").textContent = "Total: " + total;
}
document.querySelectorAll(".g").forEach((i) => (i.oninput = atualizarTotal));

const txt = (id) => $(id).value.trim() || null;

function parseMoeda(s) {
  s = String(s)
    .trim()
    .replace(/[R$\s]/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return isNaN(n) ? null : n;
}
function fmtMoeda(n) {
  return Number(n).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
const num = (id) => {
  const v = $(id).value.trim();
  if (v === "") return null;
  return $(id).dataset.money ? parseMoeda(v) : Number(v);
};
const setv = (id, v) =>
  ($(id).value =
    $(id).dataset.money && v != null && v !== "" ? fmtMoeda(v) : (v ?? ""));

function limpar() {
  document
    .querySelectorAll("#novo input:not(#novoTipo), #novo textarea")
    .forEach((i) => {
      if (i.type === "checkbox") i.checked = false;
      else i.value = "";
    });
  $("status").selectedIndex = 0;
  $("tot").textContent = "Total: 0";
  editandoId = null;
  $("tituloForm").textContent = "Novo evento";
  $("cancelar").hidden = true;
}

function editar(e) {
  limpar();
  editandoId = e.id;
  setv("c1nome", e.cliente1.nome);
  setv("c1sobrenome", e.cliente1.sobrenome);
  setv("c1email", e.cliente1.email);
  setv("tel1", e.cliente1.telefone1);
  if (e.cliente2) {
    setv("c2nome", e.cliente2.nome);
    setv("c2sobrenome", e.cliente2.sobrenome);
    setv("c2email", e.cliente2.email);
    setv("tel2", e.cliente2.telefone1);
  }
  setv("tipoEvento", e.tipoEvento.id);
  setv("status", e.status);
  setv("dataAtend", e.dataAtendimento);
  setv("dataConf", e.dataConfirmacao);
  setv("dataEvento", e.dataEvento);
  setv("horaIni", e.horaInicio ? e.horaInicio.slice(0, 5) : "");
  setv("horaFim", e.horaFim ? e.horaFim.slice(0, 5) : "");
  setv("prev", e.convidadosPrevistos);
  setv("comp", e.convidadosCompareceram);
  setv("inteiros", e.pagantesInteiros);
  setv("meias", e.pagantesMeias);
  setv("naoPag", e.naoPagantes);
  setv("vPessoa", e.valorPorPessoa);
  setv("vBuffet", e.valorBuffet);
  setv("vFinal", e.valorFinalContrato);
  setv("custo", e.custoVariavel);
  setv("vVenda", e.valorVendaReal);
  setv("recebido", e.totalRecebido);
  $("bar").checked = e.bartenderIncluido;
  setv("obs", e.observacao);
  const prof = (f) => (e.profissionais || []).find((p) => p.funcao === f);
  setv("cerNome", prof("CERIMONIALISTA")?.nome);
  setv("cerTel", prof("CERIMONIALISTA")?.telefone);
  setv("orgNome", prof("ORGANIZADOR")?.nome);
  setv("orgTel", prof("ORGANIZADOR")?.telefone);
  setv("djNome", prof("DJ")?.nome);
  setv("djTel", prof("DJ")?.telefone);
  atualizarTotal();
  $("tituloForm").textContent = "Editar evento";
  $("cancelar").hidden = false;
  tab("novo");
}

$("cancelar").onclick = () => {
  limpar();
  tab("agenda");
};

$("save").onclick = async () => {
  if (!txt("c1nome")) {
    alert("Informe o nome do cliente 1.");
    return;
  }
  if (!txt("dataEvento")) {
    alert("Informe a data do evento.");
    return;
  }

  const dados = {
    cliente1Id: num("c1id"),
    cliente2Id: num("c2id"),
    cliente1Novo: $("c1novo").value === "1",
    cliente2Novo: $("c2novo").value === "1",
    cliente1Nome: txt("c1nome"),
    cliente1Sobrenome: txt("c1sobrenome"),
    cliente1Email: txt("c1email"),
    telefone1: txt("tel1"),
    telefone2: txt("tel2"),
    cliente2Nome: txt("c2nome"),
    cliente2Sobrenome: txt("c2sobrenome"),
    cliente2Email: txt("c2email"),
    tipoEventoId: num("tipoEvento"),
    status: $("status").value,
    dataAtendimento: txt("dataAtend"),
    dataConfirmacao: txt("dataConf"),
    dataEvento: txt("dataEvento"),
    horaInicio: txt("horaIni"),
    horaFim: txt("horaFim"),
    convidadosPrevistos: num("prev"),
    convidadosCompareceram: num("comp"),
    pagantesInteiros: num("inteiros"),
    pagantesMeias: num("meias"),
    naoPagantes: num("naoPag"),
    valorPorPessoa: num("vPessoa"),
    valorBuffet: num("vBuffet"),
    valorFinalContrato: num("vFinal"),
    valorVendaReal: num("vVenda"),
    custoVariavel: num("custo"),
    totalRecebido: num("recebido"),
    bartenderIncluido: $("bar").checked,
    observacao: txt("obs"),
    cerimonialistaNome: txt("cerNome"),
    cerimonialistaTelefone: txt("cerTel"),
    organizadorNome: txt("orgNome"),
    organizadorTelefone: txt("orgTel"),
    djNome: txt("djNome"),
    djTelefone: txt("djTel"),
  };

  const url = editandoId ? "/api/eventos/" + editandoId : "/api/eventos";
  const r = await fetch(url, {
    method: editandoId ? "PUT" : "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(dados),
  });
  if (!r.ok) {
    alert("Erro ao salvar o evento. Confira os campos e tente de novo.");
    return;
  }

  ultimoSalvo = await r.json();
  limpar();

  const [ano, mes] = dados.dataEvento.split("-");
  if ([...$("ano").options].some((o) => o.value === ano)) $("ano").value = ano;
  $("mes").value = +mes - 1;
  await carregarMes();

  $("modal").hidden = false;
};

// ---------- Janela após salvar ----------
$("mImprimir").onclick = () => imprimir(ultimoSalvo);
$("mAgenda").onclick = () => {
  $("modal").hidden = true;
  tab("agenda");
};
$("mNovo").onclick = () => {
  $("modal").hidden = true;
  window.scrollTo(0, 0);
};

// ---------- Impressão da ficha ----------
const linha = (rot, val) => `<tr><th>${rot}</th><td>${val}</td></tr>`;

function imprimir(e) {
  const prof = (f) => (e.profissionais || []).find((p) => p.funcao === f);
  const pf = (f) => {
    const p = prof(f);
    return p ? esc(p.nome) + (p.telefone ? " – " + esc(p.telefone) : "") : "—";
  };
  const c1 = e.cliente1,
    c2 = e.cliente2;
  const totalConv =
    (e.pagantesInteiros || 0) + (e.pagantesMeias || 0) + (e.naoPagantes || 0);

  $("ficha").innerHTML = `
    <h1>V | b &nbsp; Ficha do evento</h1>
    <p class="sub">${esc(e.tipoEvento.nome)} – ${esc(nomeCli(e))} · ${fmtData(e.dataEvento)}</p>

    <h4>Clientes</h4>
    <table>
      ${linha("Cliente 1", esc(c1.nome + " " + (c1.sobrenome || "")) + " · " + ou(c1.telefone1) + (c1.email ? " · " + esc(c1.email) : ""))}
      ${c2 ? linha("Cliente 2", esc(c2.nome + " " + (c2.sobrenome || "")) + " · " + ou(c2.telefone1) + (c2.email ? " · " + esc(c2.email) : "")) : ""}
    </table>

    <h4>Evento</h4>
    <table>
      ${linha("Tipo", esc(e.tipoEvento.nome))}
      ${linha("Status", ST[e.status].txt)}
      ${linha("Data do evento", fmtData(e.dataEvento))}
      ${linha("Horário", hora(e) || "—")}
      ${linha("Data de atendimento", fmtData(e.dataAtendimento))}
      ${linha("Data da confirmação", fmtData(e.dataConfirmacao))}
    </table>

    <h4>Convidados</h4>
    <table>
      ${linha("Previstos", ou(e.convidadosPrevistos))}
      ${linha("Compareceram", ou(e.convidadosCompareceram))}
      ${linha("Pagantes inteiros", ou(e.pagantesInteiros))}
      ${linha("Meias", ou(e.pagantesMeias))}
      ${linha("Não pagantes", ou(e.naoPagantes))}
      ${linha("Total (inteiros + meias + não pagantes)", totalConv)}
    </table>

    <h4>Valores</h4>
    <table>
      ${linha("Valor por pessoa", `<span class="val">${R(e.valorPorPessoa)}</span>`)}
      ${linha("Valor do buffet", `<span class="val">${R(e.valorBuffet)}</span>`)}
      ${linha("Valor final do contrato", `<span class="val">${R(e.valorFinalContrato)}</span>`)}
      ${linha("Total recebido", `<span class="val">${R(e.totalRecebido)}</span>`)}
      ${linha("Bartender", e.bartenderIncluido ? "Incluído" : "Não incluído")}
    </table>

    <h4>Profissionais</h4>
    <table>
      ${linha("Cerimonialista", pf("CERIMONIALISTA"))}
      ${linha("Organizador", pf("ORGANIZADOR"))}
      ${linha("DJ", pf("DJ"))}
    </table>

    <h4>Observações</h4>
    <table><tr><td style="height:70px;vertical-align:top">${ou(e.observacao)}</td></tr></table>

    <div class="assin"><div>Assinatura do cliente</div><div>Assinatura do responsável</div></div>
    <div class="rod">Impresso em ${new Date().toLocaleDateString("pt-BR")}</div>`;
  window.print();
}

// ---------- Relatório ----------
async function relatorio() {
  const ano = $("anoRel").value;
  const meses = await Promise.all(
    Array.from({ length: 12 }, (_, i) =>
      fetch(`/api/eventos?mes=${i + 1}&ano=${ano}`).then((r) => r.json()),
    ),
  );
  const lista = meses.flat();
  let tv = 0,
    tc = 0;
  const linhas = lista
    .map((e) => {
      const v = Number(e.valorVendaReal || 0),
        c = Number(e.custoVariavel || 0);
      tv += v;
      tc += c;
      return `<tr><td>${fmtData(e.dataEvento)}</td><td>${esc(e.tipoEvento.nome)} – ${esc(nomeCli(e))}</td>
      <td class="r val">${R(v)}</td><td class="r val">${R(c)}</td><td class="r val">${R(v - c)}</td></tr>`;
    })
    .join("");
  $("tb").innerHTML =
    "<tr><th>Data</th><th>Evento</th><th class='r'>Venda</th><th class='r'>Custo</th><th class='r'>Diferença</th></tr>" +
    (linhas || "<tr><td colspan='5'>Nenhum evento neste ano.</td></tr>") +
    `<tr><th colspan="2">Total</th><th class="r val">${R(tv)}</th><th class="r val">${R(tc)}</th><th class="r val">${R(tv - tc)}</th></tr>`;
}
$("anoRel").onchange = relatorio;
$("imprimirRel").onclick = () => {
  $("ficha").innerHTML = `<h1>V | b &nbsp; Relatório ${$("anoRel").value}</h1>
    <p class="sub">Diferença = valor da venda – custo</p><table class="rel">${$("tb").innerHTML}</table>
    <div class="rod">Impresso em ${new Date().toLocaleDateString("pt-BR")}</div>`;
  window.print();
};

// ---------- Início ----------
carregarTipos();
carregarMes();
