(function () {
  const lerCookie = nome => {
    const m = document.cookie.match(new RegExp("(?:^|; )" + nome + "=([^;]*)"));
    return m ? decodeURIComponent(m[1]) : null;
  };

  const original = window.fetch;
  window.fetch = function (url, opcoes = {}) {
    const metodo = (opcoes.method || "GET").toUpperCase();
    if (!["GET", "HEAD", "OPTIONS", "TRACE"].includes(metodo)) {
      const token = lerCookie("XSRF-TOKEN");
      if (token) {
        const cab = new Headers(opcoes.headers || {});
        cab.set("X-XSRF-TOKEN", token);
        opcoes = { ...opcoes, headers: cab };
      }
    }
    return original.call(this, url, opcoes);
  };
})();