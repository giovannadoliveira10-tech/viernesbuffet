(function () {
  // ---------- aba e seção Início ----------
  const sec = document.createElement("section");
  sec.id = "inicio";
  sec.hidden = true;
  sec.innerHTML = `<div id="pnListas"></div>`;
  document.querySelector("main.conteudo").prepend(sec);

  const btn = document.createElement("button");
  btn.setAttribute("role", "tab");
  btn.setAttribute("aria-selected", "false");
  btn.dataset.t = "inicio";
  btn.textContent = "Início";
  btn.onclick = () => tab("inicio");
  document.querySelector("nav").prepend(btn);

  // ---------- carrega os eventos de 6 meses atrás até 6 meses à frente ----------
  async function painel() {
    const hoje = new Date();
    const pedidos = [];
    for (let o = -6; o <= 6; o++) {
      const t = new Date(hoje.getFullYear(), hoje.getMonth() + o, 1);
      pedidos.push(
        fetch(`/api/eventos?mes=${t.getMonth() + 1}&ano=${t.getFullYear()}`)
          .then(r => r.ok ? r.json() : [])
          .catch(() => [])
      );
    }
    window.painelLista = (await Promise.all(pedidos)).flat();
    window.dispatchEvent(new Event("painelCarregado"));   // avisa o resumo e os agradecimentos
  }

  // ---------- integra com o sistema de abas ----------
  const tabOriginal = tab;
  tab = function (t) {
    tabOriginal(t);
    $("inicio").hidden = t !== "inicio";
    if (t === "inicio") painel();
  };

  // abre o sistema na aba Início
  tab("inicio");
})();