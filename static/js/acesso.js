(function () {
  fetch("/api/me")
    .then(r => r.ok ? r.json() : null)
    .then(eu => {
      if (!eu) return;

      const box = document.createElement("div");
      box.style.cssText = "display:flex;align-items:center;gap:12px;flex-wrap:wrap";
      box.innerHTML = `<span style="font-size:13px">${esc(eu.nome)}${eu.perfil === "RESTRITO" ? " (acesso restrito)" : ""}</span>
                       <button type="button" class="mini" id="sair">Sair</button>`;
      document.querySelector(".topo-in").appendChild(box);
      $("sair").onclick = async () => {
        await fetch("/logout", { method: "POST" });
        location.href = "/login.html";
      };

      if (eu.perfil === "RESTRITO") {
        document.body.classList.add("restrito");
        const st = document.createElement("style");
        st.textContent = `
          .restrito nav button[data-t="novo"], .restrito nav button[data-t="rel"], .restrito .tg,
          .restrito [data-acao="editar"], .restrito [data-acao="excluir"],
          .restrito #agenda .bar .mini { display: none !important; }
          .restrito #resumo .kpi:nth-child(n+2) { display: none; }`;
        document.head.appendChild(st);
      }
    });
})();