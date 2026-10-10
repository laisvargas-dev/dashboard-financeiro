/* ==========================================
   MEU FINANCEIRO - SCRIPT COMPLETO
   Frontend conectado ao Render + Neon
========================================== */

const API = "https://dashboard-financeiro-u3ja.onrender.com/api";

const $ = (id) => document.getElementById(id);

const dinheiro = (valor) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(valor) || 0);

function hojeLocal() {
  const d = new Date();

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dataISO(valor) {
  return typeof valor === "string" ? valor.slice(0, 10) : "";
}

function dataBR(valor) {
  const data = dataISO(valor);

  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return data;
  }

  return data.split("-").reverse().join("/");
}

function mostrarAviso(mensagem) {
  const elemento = $("aviso");

  if (!elemento) return;

  elemento.textContent = mensagem;
  elemento.hidden = !mensagem;
}

function token() {
  return sessionStorage.getItem("token");
}

/* ==========================================
   CONEXÃO COM A API
========================================== */

async function api(rota, opcoes = {}) {
  let resposta;

  try {
    resposta = await fetch(`${API}${rota}`, {
      ...opcoes,
      headers: {
        "Content-Type": "application/json",
        ...(token()
          ? { Authorization: `Bearer ${token()}` }
          : {}),
        ...(opcoes.headers || {})
      }
    });
  } catch {
    throw new Error(
      "Não foi possível conectar ao servidor. Tente novamente em alguns instantes."
    );
  }

  let dados;

  try {
    dados = await resposta.json();
  } catch {
    dados = {};
  }

  if (
    resposta.status === 401 &&
    rota !== "/auth/login" &&
    rota !== "/auth/cadastro"
  ) {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("usuario");

    location.replace("login.html");

    throw new Error("Sessão expirada.");
  }

  if (!resposta.ok) {
    throw new Error(
      dados.erro ||
      dados.mensagem ||
      `Erro HTTP ${resposta.status}`
    );
  }

  return dados;
}

/* ==========================================
   LOGIN E CADASTRO
========================================== */

if ($("loginForm")) {
  const login = $("loginForm");
  const cadastro = $("cadastroForm");
  const mensagem = $("mensagem");

  function informar(texto) {
    if (!mensagem) return;

    mensagem.textContent = texto;
    mensagem.hidden = !texto;
  }

  $("mostrarCadastro")?.addEventListener(
    "click",
    (event) => {
      event.preventDefault();

      login.hidden = true;
      cadastro.hidden = false;

      informar("");
    }
  );

  $("mostrarLogin")?.addEventListener(
    "click",
    (event) => {
      event.preventDefault();

      cadastro.hidden = true;
      login.hidden = false;

      informar("");
    }
  );

  document
    .querySelectorAll(".toggle-password, [data-toggle]")
    .forEach((botao) => {
      botao.addEventListener("click", () => {
        const campo = $(
          botao.dataset.target ||
          botao.dataset.toggle
        );

        if (!campo) return;

        campo.type =
          campo.type === "password"
            ? "text"
            : "password";
      });
    });

  /* LOGIN */

  login.addEventListener("submit", async (event) => {
    event.preventDefault();

    const botao = login.querySelector(
      '[type="submit"]'
    );

    botao.disabled = true;

    informar("Entrando...");

    try {
      const dados = await api("/auth/login", {
        method: "POST",

        body: JSON.stringify({
          email: $("email").value.trim(),
          senha: $("senha").value
        })
      });

      if (!dados.token) {
        throw new Error(
          "O servidor não retornou o token."
        );
      }

      sessionStorage.setItem(
        "token",
        dados.token
      );

      sessionStorage.setItem(
        "usuario",
        JSON.stringify(dados.usuario || {})
      );

      location.replace("index.html");

    } catch (erro) {
      informar(erro.message);

    } finally {
      botao.disabled = false;
    }
  });

  /* CADASTRO */

  cadastro?.addEventListener(
    "submit",
    async (event) => {
      event.preventDefault();

      const botao = cadastro.querySelector(
        '[type="submit"]'
      );

      botao.disabled = true;

      informar("Criando conta...");

      try {
        await api("/auth/cadastro", {
          method: "POST",

          body: JSON.stringify({
            nome: $("nomeCadastro").value.trim(),
            email: $("emailCadastro").value.trim(),
            senha: $("senhaCadastro").value
          })
        });

        const email = $("emailCadastro").value.trim();

        cadastro
