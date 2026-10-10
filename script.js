
/* MEU FINANCEIRO - DASHBOARD */

const API = "/api";

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

async function api(rota, opcoes = {}) {
  const resposta = await fetch(`${API}${rota}`, {
    ...opcoes,

    headers: {
      "Content-Type": "application/json",

      ...(token()
        ? { Authorization: `Bearer ${token()}` }
        : {}),

      ...(opcoes.headers || {})
    }
  });

  let dados;

  try {
    dados = await resposta.json();
  } catch {
    dados = {};
  }

  if (
    resposta.status === 401 &&
    rota !== "/auth/login"
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

/* LOGIN E CADASTRO */

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

        cadastro.reset();

        cadastro.hidden = true;
        login.hidden = false;

        $("email").value = email;

        informar(
          "Conta criada! Agora faça login."
        );

      } catch (erro) {
        informar(erro.message);

      } finally {
        botao.disabled = false;
      }
    }
  );
}

/* VARIÁVEIS DO DASHBOARD */

let transacoes = [];
let metas = [];
let graficoMensal = [];
let resumo = {};

let linha = null;
let rosca = null;
let editando = null;

/* INICIALIZAÇÃO */

if (document.body.classList.contains("app-page")) {
  if (!token()) {
    location.replace("login.html");
  } else {
    iniciar();
  }
}

/* NAVEGAÇÃO CORRIGIDA */

function irPara(pagina) {
  const paginas = [
    "visao",
    "transacoes",
    "metas",
    "relatorios"
  ];

  if (!paginas.includes(pagina)) {
    pagina = "visao";
  }

  // Esconde todas as páginas e abre a escolhida
  document
    .querySelectorAll(".page-section")
    .forEach((secao) => {
      const ativa = secao.id === pagina;

      secao.classList.toggle(
        "active",
        ativa
      );

      secao.style.display = ativa
        ? "block"
        : "none";
    });

  // Atualiza o menu lateral
  document
    .querySelectorAll(".nav-link")
    .forEach((link) => {
      link.classList.toggle(
        "active",
        link.dataset.page === pagina
      );
    });

  const titulos = {
    visao: "Visão geral",
    transacoes: "Transações",
    metas: "Minhas metas",
    relatorios: "Relatórios"
  };

  if ($("breadcrumb")) {
    $("breadcrumb").textContent =
      titulos[pagina];
  }

  if ($("tituloPagina")) {
    $("tituloPagina").textContent =
      pagina === "visao"
        ? "Olá, bem-vinda! ✳"
        : titulos[pagina];
  }

  if ($("subtituloPagina")) {
    $("subtituloPagina").textContent =
      pagina === "visao"
        ? "Aqui está o panorama das suas finanças."
        : "Tudo organizado em um só lugar.";
  }

  $("sidebar")?.classList.remove("open");

  if (location.hash !== "#" + pagina) {
    history.replaceState(
      null,
      "",
      "#" + pagina
    );
  }

  if (pagina === "visao") {
    requestAnimationFrame(() => {
      linha?.resize();
      rosca?.resize();
    });
  }
}

/* CLIQUES DO MENU */

document.addEventListener("click", (event) => {
  const link = event.target.closest(
    "[data-page], [data-go]"
  );

  if (
    !link ||
    !document.body.classList.contains("app-page")
  ) {
    return;
  }

  event.preventDefault();

  irPara(
    link.dataset.page ||
    link.dataset.go
  );
});

window.addEventListener("hashchange", () => {
  if (
    document.body.classList.contains("app-page")
  ) {
    irPara(
      location.hash.slice(1) || "visao"
    );
  }
});

/* INICIAR DASHBOARD */

function iniciar() {
  let usuario = {};

  try {
    usuario = JSON.parse(
      sessionStorage.getItem("usuario") || "{}"
    );
  } catch {}

  const nome = (
    usuario.nome || "bem-vinda"
  ).split(" ")[0];

  $("tituloPagina").textContent =
    `Olá, ${nome}! ✳`;

  $("avatar").textContent =
    (usuario.nome || "MF")
      .split(/\s+/)
      .slice(0, 2)
      .map((parte) => parte[0])
      .join("")
      .toUpperCase();

  $("dataHoje").textContent =
    new Intl.DateTimeFormat("pt-BR", {
      day: "numeric",
      month: "long",
      year: "numeric"
    }).format(new Date());

  $("mesSelecionado").value =
    hojeLocal().slice(0, 7);

  $("dataTransacao").value = hojeLocal();

  $("sair").addEventListener("click", () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("usuario");

    location.replace("login.html");
  });

  $("menuToggle")?.addEventListener(
    "click",
    () => {
      $("sidebar").classList.toggle("open");
    }
  );

  $("mesSelecionado").addEventListener(
    "change",
    render
  );

  $("buscaTransacao").addEventListener(
    "input",
    renderTabela
  );

  $("filtroTipo").addEventListener(
    "change",
    renderTabela
  );

  $("abrirLancamento").addEventListener(
    "click",
    () => abrirModal()
  );

  $("fecharModal").addEventListener(
    "click",
    fecharModal
  );

  $("cancelarLancamento").addEventListener(
    "click",
    fecharModal
  );

  $("formTransacao").addEventListener(
    "submit",
    salvarTransacao
  );

  $("formMeta").addEventListener(
    "submit",
    salvarMeta
  );

  $("listaTransacoes").addEventListener(
    "click",
    acaoTransacao
  );

  $("listaMetas").addEventListener(
    "click",
    acaoMeta
  );

  $("exportarCsv").addEventListener(
    "click",
    () => baixarCsv(
      transacoes,
      "todas-transacoes.csv"
    )
  );

  $("baixarRelatorio").addEventListener(
    "click",
    () => baixarCsv(
      doMes(),
      `relatorio-${$("mesSelecionado").value}.csv`
    )
  );

  $("imprimirRelatorio").addEventListener(
    "click",
    () => {
      irPara("relatorios");
      window.print();
    }
  );

  // Abre a página correta
  irPara(
    location.hash.slice(1) || "visao"
  );

  carregar();
}

/* CARREGAR DADOS */

async function carregar() {
  mostrarAviso("");

  try {
    [
      resumo,
      transacoes,
      graficoMensal,
      metas
    ] = await Promise.all([
      api("/dashboard/resumo"),
      api("/transacoes"),
      api("/dashboard/grafico"),
      api("/metas")
    ]);

    if (!Array.isArray(transacoes)) {
      transacoes = [];
    }

    if (!Array.isArray(graficoMensal)) {
      graficoMensal = [];
    }

    if (!Array.isArray(metas)) {
      metas = [];
    }

    render();

  } catch (erro) {
    mostrarAviso(
      `Não foi possível carregar os dados: ${erro.message}`
    );
  }
}

/* RESUMO FINANCEIRO */

function doMes() {
  return transacoes.filter(
    (t) =>
      dataISO(t.data).slice(0, 7) ===
      $("mesSelecionado").value
  );
}

function totais(lista) {
  return lista.reduce(
    (acumulador, item) => {
      acumulador[item.tipo] =
        (acumulador[item.tipo] || 0) +
        Number(item.valor);

      return acumulador;
    },
    {
      receita: 0,
      despesa: 0
    }
  );
}

function render() {
  const mes = doMes();
  const soma = totais(mes);

  $("saldo").textContent =
    dinheiro(resumo.saldo);

  $("receitas").textContent =
    dinheiro(soma.receita);

  $("despesas").textContent =
    dinheiro(soma.despesa);

  $("lucro").textContent =
    dinheiro(soma.receita - soma.despesa);

  renderRecentes(mes);
  renderTabela();
  renderMetas();
  renderGraficos(soma);
  renderRelatorio(soma, mes);
}

/* TRANSAÇÕES RECENTES */

function renderRecentes(lista) {
  const elemento = $("ultimasTransacoes");

  elemento.replaceChildren();

  if (!lista.length) {
    elemento.append(
      criarVazio("Nenhuma movimentação neste mês.")
    );

    return;
  }

  lista
    .slice()
    .sort(
      (a, b) =>
        dataISO(b.data).localeCompare(
          dataISO(a.data)
        ) || b.id - a.id
    )
    .slice(0, 4)
    .forEach((transacao) => {
      const item = document.createElement("div");

      item.className = "recent-item";

      const icone = document.createElement("div");

      icone.className =
        "recent-icon " +
        (
          transacao.tipo === "receita"
            ? "income"
            : ""
        );

      icone.textContent =
        transacao.tipo === "receita"
          ? "↗"
          : "↘";

      const info = document.createElement("div");

      info.className = "recent-info";

      const nome = document.createElement("strong");

      nome.textContent = transacao.descricao;

      const data = document.createElement("small");

      data.textContent =
        dataBR(transacao.data);

      info.append(nome, data);

      const valor = document.createElement("div");

      valor.className =
        "recent-value " +
        (
          transacao.tipo === "receita"
            ? "income"
            : "outcome"
        );

      valor.textContent =
        (
          transacao.tipo === "receita"
            ? "+ "
            : "− "
        ) + dinheiro(transacao.valor);

      item.append(icone, info, valor);

      elemento.append(item);
    });
}

function criarVazio(texto) {
  const elemento = document.createElement("p");

  elemento.className = "empty";
  elemento.textContent = texto;

  return elemento;
}

/* TABELA DE TRANSAÇÕES */

function renderTabela() {
  const tabela = $("listaTransacoes");

  tabela.replaceChildren();

  const busca = $("buscaTransacao")
    .value.toLowerCase()
    .trim();

  const tipo = $("filtroTipo").value;

  const lista = transacoes
    .filter(
      (transacao) =>
        (
          tipo === "todos" ||
          transacao.tipo === tipo
        ) &&
        transacao.descricao
          .toLowerCase()
          .includes(busca)
    )
    .sort(
      (a, b) =>
        dataISO(b.data).localeCompare(
          dataISO(a.data)
        ) || b.id - a.id
    );

  if (!lista.length) {
    const linha = tabela.insertRow();
    const celula = linha.insertCell();

    celula.colSpan = 5;

    celula.append(
      criarVazio("Nenhuma transação encontrada.")
    );

    return;
  }

  lista.forEach((transacao) => {
    const linha = tabela.insertRow();

    linha.insertCell().textContent =
      transacao.descricao;

    const tipoCelula = linha.insertCell();

    const selo = document.createElement("span");

    selo.className =
      "type-pill " + transacao.tipo;

    selo.textContent =
      transacao.tipo === "receita"
        ? "↗ Receita"
        : "↘ Despesa";

    tipoCelula.append(selo);

    linha.insertCell().textContent =
      dinheiro(transacao.valor);

    linha.insertCell().textContent =
      dataBR(transacao.data);

    const acoes = linha.insertCell();

    for (const [rotulo, acao] of [
      ["Editar", "editar"],
      ["Excluir", "excluir"]
    ]) {
      const botao = document.createElement("button");

      botao.type = "button";
      botao.textContent = rotulo;

      botao.dataset.acao = acao;
      botao.dataset.id = transacao.id;

      acoes.append(botao);
    }
  });
}

/* MODAL DE TRANSAÇÕES */

function abrirModal(transacao = null) {
  editando = transacao ? transacao.id : null;

  $("tituloModal").textContent =
    transacao
      ? "Editar transação"
      : "Nova transação";

  $("descricao").value =
    transacao?.descricao || "";

  $("tipo").value =
    transacao?.tipo || "receita";

  $("valor").value =
    transacao?.valor || "";

  $("dataTransacao").value =
    transacao
      ? dataISO(transacao.data)
      : hojeLocal();

  $("salvarLancamento").textContent =
    transacao
      ? "Salvar alterações"
      : "Salvar transação";

  $("modalLancamento").showModal();
}

function fecharModal() {
  $("modalLancamento").close();

  editando = null;
}

/* SALVAR TRANSAÇÃO */

async function salvarTransacao(evento) {
  evento.preventDefault();

  const botao = $("salvarLancamento");

  botao.disabled = true;

  const dados = {
    descricao: $("descricao").value.trim(),
    tipo: $("tipo").value,
    valor: Number($("valor").value),
    data: $("dataTransacao").value
  };

  try {
    await api(
      editando
        ? `/transacoes/${editando}`
        : "/transacoes",
      {
        method: editando ? "PUT" : "POST",
        body: JSON.stringify(dados)
      }
    );

    fecharModal();

    $("mesSelecionado").value =
      dados.data.slice(0, 7);

    await carregar();

    mostrarAviso(
      "Transação salva com sucesso!"
    );

  } catch (erro) {
    mostrarAviso(erro.message);

  } finally {
    botao.disabled = false;
  }
}

/* EDITAR E EXCLUIR TRANSAÇÕES */

async function acaoTransacao(evento) {
  const botao = evento.target.closest(
    "button[data-acao]"
  );

  if (!botao) return;

  const transacao = transacoes.find(
    (item) =>
      String(item.id) === botao.dataset.id
  );

  if (!transacao) return;

  if (botao.dataset.acao === "editar") {
    abrirModal(transacao);
    return;
  }

  if (
    !confirm(
      `Excluir a transação "${transacao.descricao}"?`
    )
  ) {
    return;
  }

  try {
    await api(
      `/transacoes/${transacao.id}`,
      { method: "DELETE" }
    );

    await carregar();

    mostrarAviso("Transação excluída.");

  } catch (erro) {
    mostrarAviso(erro.message);
  }
}

/* CRIAR META */

async function salvarMeta(evento) {
  evento.preventDefault();

  const botao = evento.target.querySelector(
    '[type="submit"]'
  );

  botao.disabled = true;

  const dados = {
    nome: $("nomeMeta").value.trim(),
    valor_alvo: Number($("valorAlvo").value)
  };

  if ($("prazoMeta")?.value) {
    dados.prazo = $("prazoMeta").value;
  }

  try {
    await api("/metas", {
      method: "POST",
      body: JSON.stringify(dados)
    });

    evento.target.reset();

    await carregar();

    mostrarAviso(
      "Meta criada com sucesso!"
    );

  } catch (erro) {
    mostrarAviso(erro.message);

  } finally {
    botao.disabled = false;
  }
}

/* EXIBIR METAS */

function renderMetas() {
  const primeira = metas[0];

  $("nomeMetaDestaque").textContent =
    primeira?.nome ||
    "Crie sua primeira meta";

  $("valorGuardado").textContent =
    dinheiro(primeira?.valor_atual);

  $("valorMeta").textContent =
    "de " + dinheiro(primeira?.valor_alvo);

  const percentual =
    primeira && Number(primeira.valor_alvo) > 0
      ? Math.min(
          100,
          100 *
          Number(primeira.valor_atual) /
          Number(primeira.valor_alvo)
        )
      : 0;

  $("progressoMeta").style.width =
    `${percentual}%`;

  $("percentualMeta").textContent =
    `${percentual.toFixed(0)}% concluído`;

  const lista = $("listaMetas");

  lista.replaceChildren();

  if (!metas.length) {
    lista.append(
      criarVazio("Suas metas vão aparecer aqui.")
    );

    return;
  }

  metas.forEach((meta) => {
    const card = document.createElement("article");

    card.className = "goal-item";

    const titulo = document.createElement("h3");

    titulo.textContent = meta.nome;

    const detalhe = document.createElement("p");

    detalhe.textContent =
      `${dinheiro(meta.valor_atual)} de ${dinheiro(meta.valor_alvo)}` +
      (
        meta.prazo
          ? ` • até ${dataBR(meta.prazo)}`
          : ""
      );

    const barra = document.createElement("div");

    barra.className = "progress";

    const preenchimento =
      document.createElement("div");

    const percentualMeta =
      Number(meta.valor_alvo) > 0
        ? Math.min(
            100,
            100 *
            Number(meta.valor_atual) /
            Number(meta.valor_alvo)
          )
        : 0;

    preenchimento.style.width =
      `${percentualMeta}%`;

    barra.append(preenchimento);

    const acoes = document.createElement("div");

    acoes.className = "goal-actions";

    for (const [rotulo, acao] of [
      ["Atualizar valor", "atualizar"],
      ["Excluir", "excluir"]
    ]) {
      const botao = document.createElement("button");

      botao.type = "button";
      botao.textContent = rotulo;

      botao.dataset.meta = meta.id;
      botao.dataset.acao = acao;

      acoes.append(botao);
    }

    card.append(
      titulo,
      detalhe,
      barra,
      acoes
    );

    lista.append(card);
  });
}

/* ATUALIZAR OU EXCLUIR META */

async function acaoMeta(evento) {
  const botao = evento.target.closest(
    "button[data-meta]"
  );

  if (!botao) return;

  const id = botao.dataset.meta;

  try {
    if (botao.dataset.acao === "excluir") {
      if (!confirm("Excluir esta meta?")) {
        return;
      }

      await api(`/metas/${id}`, {
        method: "DELETE"
      });

    } else {
      const entrada = prompt(
        "Qual o valor TOTAL já guardado para esta meta?"
      );

      if (entrada === null) return;

      const valor = Number(
        entrada.replace(",", ".")
      );

      if (
        !Number.isFinite(valor) ||
        valor < 0
      ) {
        mostrarAviso(
          "Informe um valor válido."
        );

        return;
      }

      await api(`/metas/${id}`, {
        method: "PATCH",

        body: JSON.stringify({
          valor_atual: valor
        })
      });
    }

    await carregar();

    mostrarAviso(
      "Meta atualizada com sucesso!"
    );

  } catch (erro) {
    mostrarAviso(erro.message);
  }
}

/* GRÁFICOS */

function renderGraficos(soma) {
  if (typeof Chart === "undefined") {
    mostrarAviso(
      "A biblioteca Chart.js não carregou."
    );

    return;
  }

  linha?.destroy();
  rosca?.destroy();

  const labels = [];
  const receitas = [];
  const despesas = [];

  const base = $("mesSelecionado")
    .value.split("-")
    .map(Number);

  for (let i = 11; i >= 0; i--) {
    const data = new Date(
      base[0],
      base[1] - 1 - i,
      1
    );

    const chave =
      `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}`;

    labels.push(
      new Intl.DateTimeFormat("pt-BR", {
        month: "short"
      }).format(data)
    );

    const registros = graficoMensal.filter(
      (item) => item.mes === chave
    );

    receitas.push(
      registros
        .filter((item) => item.tipo === "receita")
        .reduce(
          (total, item) =>
            total + Number(item.total),
          0
        )
    );

    despesas.push(
      registros
        .filter((item) => item.tipo === "despesa")
        .reduce(
          (total, item) =>
            total + Number(item.total),
          0
        )
    );
  }

  linha = new Chart($("graficoLinha"), {
    type: "line",

    data: {
      labels,

      datasets: [
        {
          label: "Receitas",
          data: receitas,
          borderColor: "#24bc90",
          backgroundColor: "#24bc9018",
          fill: true,
          tension: 0.38
        },
        {
          label: "Despesas",
          data: despesas,
          borderColor: "#d82b98",
          backgroundColor: "#d82b9815",
          fill: true,
          tension: 0.38
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });

  rosca = new Chart($("graficoRosca"), {
    type: "doughnut",

    data: {
      labels: [
        "Receitas",
        "Despesas"
      ],

      datasets: [
        {
          data: [
            soma.receita,
            soma.despesa
          ],

          backgroundColor: [
            "#29c99b",
            "#e13c9f"
          ],

          borderWidth: 0
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "75%",

      plugins: {
        legend: {
          display: false
        }
      }
    }
  });
}

/* RELATÓRIOS */

function renderRelatorio(soma, mes) {
  const itens = [
    ["Receitas", soma.receita],
    ["Despesas", soma.despesa],
    [
      "Resultado",
      soma.receita - soma.despesa
    ]
  ];

  const area = $("relatorioResumo");

  area.replaceChildren();

  itens.forEach(([titulo, valor]) => {
    const card = document.createElement("div");

    card.className = "report-stat";

    const nome = document.createElement("span");

    nome.textContent = titulo;

    const numero = document.createElement("strong");

    numero.textContent = dinheiro(valor);

    card.append(nome, numero);

    area.append(card);
  });

  const texto = document.createElement("p");

  texto.className = "muted";

  texto.textContent =
    `${mes.length} movimentação(ões) no mês ${$("mesSelecionado").value}.`;

  area.append(texto);
}

/* EXPORTAR CSV */

function baixarCsv(lista, nome) {
  const linhas = [
    [
      "Descrição",
      "Tipo",
      "Valor",
      "Data"
    ],

    ...lista.map((transacao) => [
      transacao.descricao,
      transacao.tipo,
      Number(transacao.valor).toFixed(2),
      dataISO(transacao.data)
    ])
  ];

  const csv =
    "\uFEFF" +
    linhas
      .map((linha) =>
        linha
          .map((valor) =>
            '"' +
            String(valor)
              .replace(/"/g, '""')
              .replace(/^[=+\-@\t\r]/, "'$&") +
            '"'
          )
          .join(";")
      )
      .join("\r\n");

  const url = URL.createObjectURL(
    new Blob([csv], {
      type: "text/csv;charset=utf-8"
    })
  );

  const link = document.createElement("a");

  link.href = url;
  link.download = nome;

  link.click();

  setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}
