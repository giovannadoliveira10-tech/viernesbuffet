(function () {
  const novo = $("novo");
  const editando = { 1: false, 2: false };
  const CAMPOS = {
    1: ["c1nome", "c1sobrenome", "c1email", "tel1"],
    2: ["c2nome", "c2sobrenome", "c2email", "tel2"]
  };

  // campos escondidos que guardam qual cliente foi escolhido
  ["c1id", "c2id", "c1novo", "c2novo"].forEach(id => {
    const i = document.createElement("input");
    i.type = "hidden";
    i.id = id;
    novo.appendChild(i);
  });

  // ---------- monta o campo único ----------
  const h3 = [...novo.querySelectorAll("h3")].find(h => h.textContent.trim() === "Clientes");
  const grade = $("c1nome").closest(".grid");
  const rotulos = [...grade.children];

  const wrap = document.createElement("div");
  wrap.id = "cliWrap";
  wrap.innerHTML = [1, 2].map(n => `
    <div class="cli-bloco" id="cli${n}">
      <div class="cli-topo">
        <b>${n === 1 ? "Cliente *" : "Segundo cliente (opcional)"}</b>
        <button type="button" class="link" data-n="${n}" data-a="novo">+ Novo cliente</button>
      </div>
      <div class="cli-busca">
        <input id="cli${n}Busca" autocomplete="off" placeholder="Buscar cliente por nome ou telefone...">
        <div class="cli-res" id="cli${n}Res" hidden></div>
      </div>
      <div class="cli-sel" id="cli${n}Sel" hidden></div>
      <div class="grid cli-campos" id="cli${n}Campos" hidden></div>
    </div>`).join("");
  h3.after(wrap);

  // os campos de cadastro que já existiam passam a viver dentro de cada cliente:
  // nome, sobrenome, e-mail e telefone 1 no cliente 1; nome, sobrenome, e-mail e telefone 2 no cliente 2
  const idDe = l => l.querySelector("input").id;
  const donoDe = id => (/^c2/.test(id) || id === "tel2") ? 2 : 1;
  rotulos.filter(l => idDe(l) !== "tel2").forEach(l => $("cli" + donoDe(idDe(l)) + "Campos").appendChild(l));
  rotulos.filter(l => idDe(l) === "tel2").forEach(l => $("cli2Campos").appendChild(l));   // por último
  grade.remove();
  $("c1nome").closest("label").querySelector("span").textContent = "Nome";
  $("c2nome").closest("label").querySelector("span").textContent = "Nome";

  // ---------- estado de cada cliente ----------
  const nomeCompleto = n =>
    (($("c" + n + "nome").value || "") + " " + ($("c" + n + "sobrenome").value || "")).trim();

  function render(n) {
    const sel = $("c" + n + "id").value;
    const isNovo = $("c" + n + "novo").value === "1";

    $("cli" + n + "Busca").parentElement.hidden = !!(sel || isNovo);
    $("cli" + n + "Res").hidden = true;
    $("cli" + n + "Sel").hidden = !sel;
    $("cli" + n + "Campos").hidden = !(isNovo || (sel && editando[n]));

    const link = $("cli" + n).querySelector(".link");
    link.hidden = !!sel;
    link.dataset.a = isNovo ? "cancelar" : "novo";
    link.textContent = isNovo ? "Cancelar novo cadastro" : "+ Novo cliente";

    if (sel) {
      const tel = $("tel" + n).value;
      $("cli" + n + "Sel").innerHTML = `
        <div><b>${esc(nomeCompleto(n))}</b>${tel ? " · " + esc(tel) : ""}
          <span class="note" style="margin:0;display:block">Cadastro existente</span></div>
        <div class="acoes" style="margin:0">
          <button type="button" class="mini" data-n="${n}" data-a="dados">${editando[n] ? "Ocultar dados" : "Editar dados"}</button>
          <button type="button" class="mini" data-n="${n}" data-a="trocar">Trocar</button>
        </div>`;
    }
  }

  function limparCliente(n) {
    CAMPOS[n].forEach(id => { $(id).value = ""; });
    $("c" + n + "id").value = "";
    $("c" + n + "novo").value = "";
    $("cli" + n + "Busca").value = "";
    editando[n] = false;
  }

  function novoCliente(n, texto) {
    limparCliente(n);
    $("c" + n + "novo").value = "1";
    const t = (texto || "").trim();
    if (t) {
      if (/^[\d\s().+-]+$/.test(t)) $("tel" + n).value = t;   // parece telefone
      else {
        const p = t.split(/\s+/);
        $("c" + n + "nome").value = p.shift() || "";
        $("c" + n + "sobrenome").value = p.join(" ");
      }
    }
    render(n);
    $("c" + n + "nome").focus();
  }

  // escolhe um cliente já cadastrado (o telefone dele vai para o campo Telefone 1 ou 2, conforme o cliente)
  window.usarCliente = function (n, c) {
    setv("c" + n + "nome", c.nome);
    setv("c" + n + "sobrenome", c.sobrenome);
    setv("c" + n + "email", c.email);
    setv("tel" + n, c.telefone1);
    $("c" + n + "id").value = c.id;
    $("c" + n + "novo").value = "";
    $("cli" + n + "Busca").value = "";
    editando[n] = false;
    render(n);
  };

  // ---------- busca ----------
  const achados = { 1: [], 2: [] };
  const timer = {};

  [1, 2].forEach(n => {
    const inp = $("cli" + n + "Busca"), res = $("cli" + n + "Res");
    inp.addEventListener("input", () => {
      clearTimeout(timer[n]);
      const q = inp.value.trim();
      if (q.length < 2) { res.hidden = true; return; }
      timer[n] = setTimeout(async () => {
        const r = await fetch("/api/clientes?busca=" + encodeURIComponent(q));
        if (!r.ok) return;
        achados[n] = await r.json();
        res.innerHTML =
          (achados[n].length
            ? achados[n].map((c, i) => `<button type="button" class="cli-item" data-n="${n}" data-i="${i}">
                <b>${esc(c.nome)} ${esc(c.sobrenome)}</b>
                <span>${esc(c.telefone1 || "")}${c.email ? " · " + esc(c.email) : ""}</span></button>`).join("")
            : `<div class="cli-vazio">Nenhum cliente encontrado.</div>`) +
          `<button type="button" class="cli-item cli-novo" data-n="${n}" data-a="cad" data-q="${esc(q)}">+ Cadastrar "${esc(q)}" como novo cliente</button>`;
        res.hidden = false;
      }, 250);
    });
  });

  // ---------- cliques ----------
  wrap.addEventListener("click", ev => {
    const b = ev.target.closest("button");
    if (!b) return;
    const n = +b.dataset.n, a = b.dataset.a;

    if (b.classList.contains("cli-item") && !a) { window.usarCliente(n, achados[n][+b.dataset.i]); return; }
    if (a === "cad") { novoCliente(n, b.dataset.q); return; }
    if (a === "novo") { novoCliente(n, ""); return; }
    if (a === "cancelar") { limparCliente(n); render(n); return; }
    if (a === "dados") { editando[n] = !editando[n]; render(n); return; }
    if (a === "trocar") { limparCliente(n); render(n); $("cli" + n + "Busca").focus(); }
  });

  // clicar fora fecha a lista de resultados
  document.addEventListener("click", ev => {
    if (!ev.target.closest(".cli-busca")) wrap.querySelectorAll(".cli-res").forEach(r => { r.hidden = true; });
  });

  // ao limpar, volta ao campo de busca; ao editar, mostra os clientes do evento
  const limparOriginal = limpar;
  limpar = function () {
    limparOriginal();
    editando[1] = editando[2] = false;
    render(1);
    render(2);
  };

  const editarOriginal = editar;
  editar = function (e) {
    editarOriginal(e);
    $("c1id").value = e.cliente1.id;
    $("c1novo").value = "";
    $("c2id").value = e.cliente2 ? e.cliente2.id : "";
    $("c2novo").value = "";
    editando[1] = editando[2] = false;
    render(1);
    render(2);
  };

  render(1);
  render(2);
})();