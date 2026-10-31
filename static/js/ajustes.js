(function () {
  const sec = document.createElement("section");
  sec.id = "ajustes";
  sec.hidden = true;
  sec.innerHTML = `<h2>Ajustes</h2><div id="ajConteudo"></div>`;
  document.querySelector("main.conteudo").appendChild(sec);

  const btn = document.createElement("button");
  btn.setAttribute("role", "tab");
  btn.setAttribute("aria-selected", "false");
  btn.dataset.t = "ajustes";
  btn.textContent = "Ajustes";
  btn.onclick = () => tab("ajustes");
  document.querySelector("nav").appendChild(btn);

  let eu = null;
  const euPronto = fetch("/api/me").then(r => r.ok ? r.json() : null).then(x => { eu = x; }).catch(() => { });

  const JSONH = { "Content-Type": "application/json" };
  const PERFIL = { ADMIN: "Administrador", RESTRITO: "Restrito (sem valores)" };

  async function erroDe(r, padrao) {
    try { const d = await r.json(); return d.erro || padrao; } catch { return padrao; }
  }

  const bloco = (titulo, corpo, aberto) =>
    `<details class="card" ${aberto ? "open" : ""}>
       <summary style="cursor:pointer;font:700 16px Georgia,serif">${titulo}</summary>
       <div style="margin-top:12px">${corpo}</div>
     </details>`;

  const formSenha = () => `
    <div class="grid">
      <label><span>Senha atual</span><input id="ajSenhaAtual" type="password" autocomplete="current-password"></label>
      <label><span>Nova senha (mínimo 10 caracteres)</span><input id="ajSenhaNova" type="password" autocomplete="new-password"></label>
      <label><span>Repita a nova senha</span><input id="ajSenhaRep" type="password" autocomplete="new-password"></label>
    </div>
    <button type="button" class="btn sec" data-a="senha-propria">Trocar minha senha</button>`;

  const formUsuario = () => `
    <h3>Novo usuário</h3>
    <div class="grid">
      <label><span>Nome</span><input id="usNome"></label>
      <label><span>E-mail</span><input id="usEmail" type="email" autocomplete="off"></label>
      <label><span>Senha (mínimo 10 caracteres)</span><input id="usSenha" type="password" autocomplete="new-password"></label>
      <label><span>Perfil</span>
        <select id="usPerfil">
          <option value="RESTRITO">Restrito (só consulta, sem valores)</option>
          <option value="ADMIN">Administrador (acesso total)</option>
        </select></label>
    </div>
    <button type="button" class="btn sec" data-a="usuario-add">Criar usuário</button>`;

  async function carregar() {
    await euPronto;
    if (!eu) return;
    const admin = eu.perfil === "ADMIN";
    let html = bloco("Redefinir senha", formSenha(), !admin);
    if (admin) html += bloco("Informações do usuário", `<div id="ajUsuarios">Carregando…</div>` + formUsuario());
    $("ajConteudo").innerHTML = html;
    if (admin) usuarios();
  }

  // ---------- usuários ----------
  async function usuarios() {
    const r = await fetch("/api/usuarios");
    if (!r.ok) { $("ajUsuarios").textContent = "Não foi possível carregar os usuários."; return; }
    const lista = await r.json();
    $("ajUsuarios").innerHTML = `<div class="tw"><table>
      <tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th></th></tr>` +
      lista.map(u => `<tr><td>${esc(u.nome)}</td><td>${esc(u.email)}</td><td>${PERFIL[u.perfil] || esc(u.perfil)}</td>
        <td><button type="button" class="mini" data-a="usuario-senha" data-id="${u.id}">Nova senha</button>
            <button type="button" class="mini perigo" data-a="usuario-del" data-id="${u.id}" data-nome="${esc(u.nome)}">Excluir</button></td></tr>`).join("") +
      `</table></div>`;
  }

  // ---------- ações ----------
  $("ajConteudo").addEventListener("click", async ev => {
    const b = ev.target.closest("button[data-a]");
    if (!b) return;
    const id = b.dataset.id;

    switch (b.dataset.a) {
      case "senha-propria": {
        const atual = $("ajSenhaAtual").value, nova = $("ajSenhaNova").value, rep = $("ajSenhaRep").value;
        if (!atual || !nova) { alert("Preencha a senha atual e a nova senha."); return; }
        if (nova !== rep) { alert("As senhas novas não são iguais."); return; }
        if (nova.length < 10) { alert("A nova senha precisa ter pelo menos 10 caracteres."); return; }
        const r = await fetch("/api/me/senha", { method: "POST", headers: JSONH, body: JSON.stringify({ senhaAtual: atual, novaSenha: nova }) });
        if (!r.ok) { alert(await erroDe(r, "Não foi possível trocar a senha.")); return; }
        ["ajSenhaAtual", "ajSenhaNova", "ajSenhaRep"].forEach(i => $(i).value = "");
        alert("Senha alterada.");
        break;
      }
      case "usuario-add": {
        const dados = { nome: $("usNome").value, email: $("usEmail").value, senha: $("usSenha").value, perfil: $("usPerfil").value };
        const r = await fetch("/api/usuarios", { method: "POST", headers: JSONH, body: JSON.stringify(dados) });
        if (!r.ok) { alert(await erroDe(r, "Não foi possível criar o usuário.")); return; }
        ["usNome", "usEmail", "usSenha"].forEach(i => $(i).value = "");
        usuarios();
        alert("Usuário criado.");
        break;
      }
      case "usuario-senha": {
        const nova = prompt("Digite a nova senha para este usuário (mínimo 10 caracteres):");
        if (!nova) return;
        const r = await fetch(`/api/usuarios/${id}/senha`, { method: "PUT", headers: JSONH, body: JSON.stringify({ novaSenha: nova }) });
        if (!r.ok) { alert(await erroDe(r, "Não foi possível alterar a senha.")); return; }
        alert("Senha alterada.");
        break;
      }
      case "usuario-del": {
        if (!confirm(`Excluir o usuário ${b.dataset.nome}?`)) return;
        const r = await fetch(`/api/usuarios/${id}`, { method: "DELETE" });
        if (!r.ok) { alert(await erroDe(r, "Não foi possível excluir o usuário.")); return; }
        usuarios();
        break;
      }
    }
  });

  // ---------- integra com o sistema de abas ----------
  const tabOriginal = tab;
  tab = function (t) {
    tabOriginal(t);
    $("ajustes").hidden = t !== "ajustes";
    if (t === "ajustes") carregar();
  };
})();