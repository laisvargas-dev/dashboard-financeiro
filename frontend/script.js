
const API = "/api";
const $ = (id) => document.getElementById(id);
const moeda = (v) => new Intl.NumberFormat("pt-BR", {
  style: "currency", currency: "BRL"
}).format(Number(v) || 0);

function dataHoje() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function dataFormatada(valor) {
  if (!valor) return "—";
  const parte = String(valor).slice(0,10);
  const [ano, mes, dia] = parte.split("-");
  return `${dia}/${mes}/${ano}`;
}
function avisar(texto, erro = false) {
  const el = $("aviso") || $("mensagem");
  if (!el) return;
  el.textContent = texto;
  el.hidden = !texto;
  el.style.color = erro ? "#b42355" : "#137d60";
}
function erroTexto(d) {
  return d?.erro || d?.mensagem || "Não foi possível concluir a operação.";
}
async function api(rota, opcoes = {}) {
  const token = sessionStorage.getItem("token");
  const resposta = await fetch(API + rota, {
    ...opcoes,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...opcoes.headers
    }
  });
  if (resposta.status === 401) {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("usuario");
    location.replace("login.html");
    throw new Error("Sua sessão expirou.");
  }
  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) throw new Error(erroTexto(dados));
  return dados;
}

/* LOGIN E CADASTRO */
if ($("loginForm")) {
  const login = $("loginForm");
  const cadastro = $("cadastroForm");

  $("mostrarCadastro")?.addEventListener("click", e => {
    e.preventDefault();
    login.hidden = true;
    cadastro.hidden = false;
    avisar("");
  });
  $("mostrarLogin")?.addEventListener("click", e => {
    e.preventDefault();
    cadastro.hidden = true;
    login.hidden = false;
    avisar("");
  });

  document.querySelectorAll(".toggle-password").forEach(botao => {
    botao.addEventListener("click", () => {
      const campo = $(botao.dataset.target);
      if (!campo) return;
      campo.type = campo.type === "password" ? "text" : "password";
      botao.setAttribute("aria-label",
        campo.type === "password" ? "Mostrar senha" : "Ocultar senha");
    });
  });

  login.addEventListener("submit", async e => {
    e.preventDefault();
    const botao = login.querySelector('[type="submit"]');
    botao.disabled = true;
    try {
      const resposta = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          email: $("email").value.trim(),
          senha: $("senha").value
        })
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(erroTexto(dados));
      if (!dados.token) throw new Error("O servidor não retornou um token.");
      sessionStorage.setItem("token", dados.token);
      sessionStorage.setItem("usuario", JSON.stringify(dados.usuario || {}));
      location.href = "index.html";
    } catch (erro) {
      avisar(erro.message, true);
    } finally {
      botao.disabled = false;
    }
  });

  cadastro?.addEventListener("submit", async e => {
    e.preventDefault();
    const botao = cadastro.querySelector('[type="submit"]');
    botao.disabled = true;
    try {
      const resposta = await fetch(`${API}/auth/cadastro`, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({
          nome: $("nomeCadastro").value.trim(),
          email: $("emailCadastro").value.trim(),
          senha: $("senhaCadastro").value
        })
      });
      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(erroTexto(dados));
      cadastro.reset();
      cadastro.hidden = true;
      login.hidden = false;
      avisar("Conta criada! Agora entre com seu e-mail e senha.");
    } catch (erro) {
      avisar(erro.message, true);
    } finally {
      botao.disabled = false;
    }
  });
}

/* DASHBOARD */
let transacoes = [];
let metas = [];
let dadosGrafico = [];
let saldoTotal = 0;
let graficoLinha = null;
let graficoRosca = null;
let idEdicao = null;

if (document.body.classList.contains("app-page")) {
  if (!sessionStorage.getItem("token")) {
    location.replace("login.html");
  } else {
    iniciarDashboard();
  }
}

function navegar(pagina) {
  document.querySelectorAll(".page-section").forEach(el => {
    el.classList.toggle("active", el.id === pagina);
  });
  document.querySelectorAll(".nav-link").forEach(el => {
    el.classList.toggle("active", el.dataset.page === pagina);
  });
  const titulos = {
    visao: "Visão geral",
    transacoes: "Transações",
    metas: "Minhas metas",
    relatorios: "Relatórios"
  };
  $("breadcrumb").textContent = titulos[pagina] || "Visão geral";
  $("sidebar").classList.remove("open");
}

function iniciarDashboard() {
  let usuario = {};
  try {
    usuario = JSON.parse(sessionStorage.getItem("usuario") || "{}");
  } catch {}

  const nome = usuario.nome || "usuária";
  const primeiroNome = nome.split(" ")[0];
  $("tituloPagina").textContent = `Olá, ${primeiroNome}! ✨`;
  $("avatar").textContent = nome.split(" ").slice(0,2)
    .map(p => p[0]?.toUpperCase()).join("") || "MF";

  $("dataHoje").textContent = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric"
  });
  $("mesSelecionado").value = dataHoje().slice(0,7);
  $("dataTransacao").value = dataHoje();

  $("sair").onclick = () => {
    sessionStorage.removeItem("token");
    sessionStorage.removeItem("usuario");
    location.replace("login.html");
  };

  $("menuToggle")?.addEventListener("click", () =>
    $("sidebar").classList.toggle("open"));

  document.querySelectorAll("[data-page], [data-go]").forEach(el => {
    el.addEventListener("click", e => {
      e.preventDefault();
      navegar(el.dataset.page || el.dataset.go);
    });
  });

  $("mesSelecionado").addEventListener("change", renderizar);
  $("buscaTransacao").addEventListener("input", renderizarTransacoes);
  $("filtroTipo").addEventListener("change", renderizarTransacoes);

  $("abrirLancamento").onclick = abrirModal;
  $("fecharModal").onclick = fecharModal;
  $("cancelarLancamento").onclick = fecharModal;
  $("formTransacao").addEventListener("submit", salvarTransacao);
  $("formMeta").addEventListener("submit", salvarMeta);

  $("listaTransacoes").addEventListener("click", acaoTransacao);
  $("listaMetas").addEventListener("click", acaoMeta);

  $("exportarCsv").onclick = () => exportarCSV(transacoesFiltradas());
  $("baixarRelatorio").onclick = () => exportarCSV(transacoesDoMes());
  $("imprimirRelatorio").onclick = () => {
    navegar("relatorios");
    window.print();
  };

  carregarDados();
}

async function carregarDados() {
  avisar("");
  try {
    const [resumo, lista, grafico, listaMetas] = await Promise.all([
      api("/dashboard/resumo"),
      api("/transacoes"),
      api("/dashboard/grafico"),
      api("/metas")
    ]);
    saldoTotal = Number(resumo.saldo) || 0;
    transacoes = Array.isArray(lista) ? lista : [];
    dadosGrafico = Array.isArray(grafico) ? grafico : [];
    metas = Array.isArray(listaMetas) ? listaMetas : [];
    renderizar();
  } catch (erro) {
    avisar(erro.message, true);
  }
}

function transacoesDoMes() {
  const mes = $("mesSelecionado").value;
  return transacoes.filter(t => String(t.data).slice(0,7) === mes);
}
function transacoesFiltradas() {
  const busca = $("buscaTransacao").value.toLowerCase();
  const tipo = $("filtroTipo").value;
  return transacoesDoMes().filter(t =>
    (tipo === "todos" || t.tipo === tipo) &&
    String(t.descricao || "").toLowerCase().includes(busca)
  );
}
function totaisMes() {
  const lista = transacoesDoMes();
  const receitas = lista.filter(t => t.tipo === "receita")
    .reduce((s,t) => s + Number(t.valor), 0);
  const despesas = lista.filter(t => t.tipo === "despesa")
    .reduce((s,t) => s + Number(t.valor), 0);
  return {receitas, despesas, resultado: receitas - despesas};
}

function renderizar() {
  const {receitas, despesas, resultado} = totaisMes();
  $("saldo").textContent = moeda(saldoTotal);
  $("receitas").textContent = moeda(receitas);
  $("despesas").textContent = moeda(despesas);
  $("lucro").textContent = moeda(resultado);
  renderizarTransacoes();
  renderizarRecentes();
  renderizarMetas();
  renderizarRelatorio();
  desenharGraficos(receitas, despesas);
}

function renderizarTransacoes() {
  const tbody = $("listaTransacoes");
  tbody.replaceChildren();
  const lista = transacoesFiltradas().sort((a,b) =>
    String(b.data).localeCompare(String(a.data)));

  if (!lista.length) {
    const linha = tbody.insertRow();
    const celula = linha.insertCell();
    celula.colSpan = 5;
    celula.className = "empty";
    celula.textContent = "Nenhuma transação encontrada neste mês.";
    return;
  }

  lista.forEach(t => {
    const linha = tbody.insertRow();
    linha.insertCell().textContent = t.descricao;
    const tipo = linha.insertCell();
    const selo = document.createElement("span");
    selo.className = `type-pill ${t.tipo}`;
    selo.textContent = t.tipo === "receita" ? "Receita" : "Despesa";
    tipo.appendChild(selo);
    linha.insertCell().textContent = moeda(t.valor);
    linha.insertCell().textContent = dataFormatada(t.data);
    const acoes = linha.insertCell();

    const editar = document.createElement("button");
    editar.textContent = "Editar";
    editar.dataset.editar = t.id;

    const excluir = document.createElement("button");
    excluir.textContent = "Excluir";
    excluir.dataset.excluir = t.id;
    acoes.append(editar, excluir);
  });
}

function renderizarRecentes() {
  const area = $("ultimasTransacoes");
  area.replaceChildren();
  const lista = [...transacoesDoMes()]
    .sort((a,b) => String(b.data).localeCompare(String(a.data)))
    .slice(0,5);

  if (!lista.length) {
    area.innerHTML = '<p class="empty">Ainda não há movimentações neste mês.</p>';
    return;
  }

  lista.forEach(t => {
    const item = document.createElement("div");
    item.className = "recent-item";

    const icone = document.createElement("div");
    icone.className = "recent-icon " + (t.tipo === "receita" ? "income" : "");
    icone.textContent = t.tipo === "receita" ? "↗" : "↘";

    const info = document.createElement("div");
    info.className = "recent-info";
    const titulo = document.createElement("strong");
    titulo.textContent = t.descricao;
    const data = document.createElement("small");
    data.textContent = dataFormatada(t.data);
    info.append(titulo, data);

    const valor = document.createElement("span");
    valor.className = "recent-value " +
      (t.tipo === "receita" ? "income" : "outcome");
    valor.textContent = (t.tipo === "receita" ? "+" : "−") + moeda(t.valor);
    item.append(icone, info, valor);
    area.appendChild(item);
  });
}

function abrirModal(transacao = null) {
  idEdicao = transacao?.id ?? null;
  $("formTransacao").reset();
  $("tituloModal").textContent = idEdicao ? "Editar transação" : "Nova transação";
  $("descricao").value = transacao?.descricao || "";
  $("tipo").value = transacao?.tipo || "receita";
  $("valor").value = transacao?.valor || "";
  $("dataTransacao").value = transacao
    ? String(transacao.data).slice(0,10) : dataHoje();
  $("modalLancamento").showModal();
}
function fecharModal() {
  $("modalLancamento").close();
  idEdicao = null;
}

async function salvarTransacao(e) {
  e.preventDefault();
  const dados = {
    descricao: $("descricao").value.trim(),
    tipo: $("tipo").value,
    valor: Number($("valor").value),
    data: $("dataTransacao").value
  };
  if (!dados.descricao || dados.valor <= 0 || !dados.data) {
    avisar("Preencha os campos corretamente.", true);
    return;
  }

  const botao = $("salvarLancamento");
  botao.disabled = true;
  try {
    await api(idEdicao ? `/transacoes/${idEdicao}` : "/transacoes", {
      method: idEdicao ? "PUT" : "POST",
      body: JSON.stringify(dados)
    });
    fecharModal();
    $("mesSelecionado").value = dados.data.slice(0,7);
    await carregarDados();
  } catch (erro) {
    avisar(erro.message, true);
  } finally {
    botao.disabled = false;
  }
}

async function acaoTransacao(e) {
  const botao = e.target.closest("button");
  if (!botao) return;

  if (botao.dataset.editar) {
    const t = transacoes.find(t =>
      String(t.id) === botao.dataset.editar);
    if (t) abrirModal(t);
    return;
  }
  if (botao.dataset.excluir) {
    if (!confirm("Deseja realmente excluir esta transação?")) return;
    try {
      await api(`/transacoes/${botao.dataset.excluir}`, {method:"DELETE"});
      await carregarDados();
    } catch (erro) {
      avisar(erro.message, true);
    }
  }
}

async function salvarMeta(e) {
  e.preventDefault();
  const dados = {
    nome: $("nomeMeta").value.trim(),
    valor_alvo: Number($("valorAlvo").value)
  };
  if (!dados.nome || dados.valor_alvo <= 0) {
    avisar("Preencha a meta corretamente.", true);
    return;
  }
  try {
    await api("/metas", {
      method:"POST",
      body:JSON.stringify(dados)
    });
    $("formMeta").reset();
    await carregarDados();
  } catch (erro) {
    avisar(erro.message, true);
  }
}

function renderizarMetas() {
  const area = $("listaMetas");
  area.replaceChildren();
  const primeira = metas[0];
  $("nomeMetaDestaque").textContent =
    primeira?.nome || "Crie sua primeira meta";
  $("valorGuardado").textContent = moeda(primeira?.valor_atual);
  $("valorMeta").textContent = "de " + moeda(primeira?.valor_alvo);
  const percentual = primeira && Number(primeira.valor_alvo) > 0
    ? Math.min(100, Math.max(0,
        Number(primeira.valor_atual) / Number(primeira.valor_alvo) * 100))
    : 0;
  $("progressoMeta").style.width = percentual + "%";
  $("percentualMeta").textContent = percentual.toFixed(0) + "% concluído";

  if (!metas.length) {
    area.innerHTML = '<p class="empty">Nenhuma meta cadastrada ainda.</p>';
    return;
  }

  metas.forEach(meta => {
    const item = document.createElement("article");
    item.className = "goal-item";
    const titulo = document.createElement("h3");
    titulo.textContent = meta.nome;
    const detalhe = document.createElement("p");
    detalhe.textContent = `${moeda(meta.valor_atual)} de ${moeda(meta.valor_alvo)}`;

    const barra = document.createElement("div");
    barra.className = "progress";
    const preenchimento = document.createElement("div");
    const pct = Number(meta.valor_alvo) > 0
      ? Math.min(100, Number(meta.valor_atual)/Number(meta.valor_alvo)*100) : 0;
    preenchimento.style.width = Math.max(0,pct) + "%";
    barra.appendChild(preenchimento);

    const acoes = document.createElement("div");
    acoes.className = "goal-actions";
    const atualizar = document.createElement("button");
    atualizar.textContent = "Atualizar valor";
    atualizar.dataset.atualizarMeta = meta.id;
    const excluir = document.createElement("button");
    excluir.textContent = "Excluir";
    excluir.dataset.excluirMeta = meta.id;
    acoes.append(atualizar, excluir);
    item.append(titulo, detalhe, barra, acoes);
    area.appendChild(item);
  });
}

async function acaoMeta(e) {
  const botao = e.target.closest("button");
  if (!botao) return;
  try {
    if (botao.dataset.excluirMeta) {
      if (!confirm("Excluir esta meta?")) return;
      await api(`/metas/${botao.dataset.excluirMeta}`, {method:"DELETE"});
    } else if (botao.dataset.atualizarMeta) {
      const entrada = prompt("Qual o valor TOTAL já guardado para esta meta?");
      if (entrada === null) return;
      const valor = Number(entrada.replace(",","."));
      if (!Number.isFinite(valor) || valor < 0) {
        avisar("Digite um valor válido.", true);
        return;
      }
      await api(`/metas/${botao.dataset.atualizarMeta}`, {
        method:"PATCH",
        body:JSON.stringify({valor_atual:valor})
      });
    } else return;
    await carregarDados();
  } catch (erro) {
    avisar(erro.message, true);
  }
}

function renderizarRelatorio() {
  const {receitas, despesas, resultado} = totaisMes();
  const area = $("relatorioResumo");
  area.replaceChildren();
  [
    ["Receitas", receitas],
    ["Despesas", despesas],
    ["Resultado", resultado]
  ].forEach(([nome, valor]) => {
    const card = document.createElement("div");
    card.className = "report-stat";
    const label = document.createElement("span");
    label.textContent = nome;
    const numero = document.createElement("strong");
    numero.textContent = moeda(valor);
    card.append(label, numero);
    area.appendChild(card);
  });
}

function exportarCSV(lista) {
  const linhas = [
    ["Descrição","Tipo","Valor","Data"],
    ...lista.map(t => [
      t.descricao, t.tipo, t.valor, String(t.data).slice(0,10)
    ])
  ];
  const csv = linhas.map(linha => linha.map(v =>
    `"${String(v ?? "").replace(/"/g,'""').replace(/^[=+\-@\t\r]/, "'$&')}"`
  ).join(";")).join("\r\n");
  const blob = new Blob(["\uFEFF",csv], {
    type:"text/csv;charset=utf-8"
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `financeiro-${$("mesSelecionado").value}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

function desenharGraficos(receitas, despesas) {
  if (typeof Chart === "undefined") {
    avisar("A biblioteca Chart.js não carregou. Confira sua internet.", true);
    return;
  }
  graficoLinha?.destroy();
  graficoRosca?.destroy();

  const meses = [...new Set(dadosGrafico.map(d => String(d.mes)))].sort();
  const valores = tipo => meses.map(mes =>
    dadosGrafico.filter(d => String(d.mes) === mes && d.tipo === tipo)
      .reduce((s,d) => s + Number(d.total), 0)
  );

  graficoLinha = new Chart($("graficoLinha"), {
    type:"line",
    data:{
      labels:meses,
      datasets:[
        {
          label:"Receitas",
          data:valores("receita"),
          borderColor:"#20b486",
          backgroundColor:"#20b48622",
          tension:.4,
          fill:true
        },
        {
          label:"Despesas",
          data:valores("despesa"),
          borderColor:"#d50092",
          backgroundColor:"#d5009215",
          tension:.4,
          fill:true
        }
      ]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      plugins:{
        tooltip:{callbacks:{label:c => `${c.dataset.label}: ${moeda(c.parsed.y)}`}}
      }
    }
  });

  graficoRosca = new Chart($("graficoRosca"), {
    type:"doughnut",
    data:{
      labels:["Receitas","Despesas"],
      datasets:[{
        data:[receitas,despesas],
        backgroundColor:["#20b486","#d50092"],
        borderWidth:0,
        hoverOffset:8
      }]
    },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      cutout:"72%",
      plugins:{
        legend:{display:false},
        tooltip:{callbacks:{label:c => `${c.label}: ${moeda(c.parsed)}`}}
      }
    }
  });
}
