(function () {
  const novo = $("novo");
  const secs = [];

  [...novo.querySelectorAll(":scope > h3")].forEach(h => {
    const corpo = document.createElement("div");
    corpo.className = "sec-corpo";

    // leva para dentro da seção tudo o que vem até o próximo título (ou até os botões de salvar)
    let n = h.nextElementSibling;
    while (n && n.tagName !== "H3" && n.id !== "save" && n.id !== "cancelar") {
      const prox = n.nextElementSibling;
      corpo.appendChild(n);
      n = prox;
    }
    h.after(corpo);

    h.classList.add("sec-t");
    h.tabIndex = 0;
    h.setAttribute("role", "button");

    const alternar = () => {
      const fechar = !corpo.hidden;
      corpo.hidden = fechar;
      h.classList.toggle("fechada", fechar);
    };
    h.onclick = alternar;
    h.onkeydown = e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); alternar(); } };

    // começam fechadas as seções usadas com menos frequência
    if (/novo tipo|Profissionais/.test(h.textContent)) alternar();

    secs.push({ h, corpo, alternar });
  });

  function abrir(re) {
    secs.forEach(s => { if (re.test(s.h.textContent) && s.corpo.hidden) s.alternar(); });
  }

  // ao editar um evento que tem profissionais, abre a seção deles
  const editarOriginal = editar;
  editar = function (e) {
    editarOriginal(e);
    if ((e.profissionais || []).length) abrir(/Profissionais/);
  };
})();