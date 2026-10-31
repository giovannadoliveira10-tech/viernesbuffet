(function () {
  let perfil = null;
  fetch("/api/me").then(r => r.ok ? r.json() : null).then(eu => { perfil = eu ? eu.perfil : null; }).catch(() => {});

  const p2 = n => String(n).padStart(2, "0");

  // ---------- o formulário de evento abre embaixo do calendário ----------
  const tabOriginal = tab;
  tab = function (t) {
    tabOriginal(t);
    if (t !== "novo") return;
    $("agenda").hidden = false;
    document.querySelectorAll("nav button").forEach(b => b.setAttribute("aria-selected", b.dataset.t === "agenda"));
    $("novo").scrollIntoView({ behavior: "smooth", block: "start" });
  };

  // ---------- clicar em um dia ----------
  function escolherDia(d) {
    sel = d;
    cal();
    det();                                   // eventos do dia (editar, imprimir, excluir...)
    if (perfil !== "ADMIN") return;          // acesso restrito só consulta

    const aberto = !$("novo").hidden;
    if (aberto && editandoId) {
      if (!confirm("Você está editando um evento. Descartar a edição e começar um novo evento neste dia?")) return;
      limpar();
    } else if (!aberto) {
      limpar();                              // formulário fechado: começa limpo
    }                                        // formulário aberto: só troca a data e mantém o que já foi digitado

    setv("dataEvento", `${$("ano").value}-${p2(+$("mes").value + 1)}-${p2(d)}`);
    $("dataEvento").dispatchEvent(new Event("change"));   // confere conflito de horário
    tab("novo");
    $("det").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const calOriginal = cal;
  cal = function () {
    calOriginal();
    document.querySelectorAll(".cal .d").forEach(b => b.onclick = () => escolherDia(+b.dataset.d));
  };

})();