
const API = "/api";

const loginForm = document.getElementById("loginForm");
const cadastroForm = document.getElementById("cadastroForm");
const mensagem = document.getElementById("mensagem");

function mostrarMensagem(texto) {
    if (mensagem) mensagem.textContent = texto;
}

if (loginForm) {
    loginForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const email = document.getElementById("email").value;
        const senha = document.getElementById("senha").value;

        try {
            const resposta = await fetch(`${API}/auth/login`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email, senha })
            });

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(dados.erro || "Erro no login.");
            }

            sessionStorage.setItem("token", dados.token);
            sessionStorage.setItem(
                "usuario",
                JSON.stringify(dados.usuario)
            );

            window.location.href = "index.html";

        } catch (erro) {
            mostrarMensagem(erro.message);
        }
    });
}

document.getElementById("mostrarCadastro")
    ?.addEventListener("click", (event) => {
        event.preventDefault();
        cadastroForm.hidden = false;
    });

if (cadastroForm) {
    cadastroForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const nome = document.getElementById(
            "nomeCadastro"
        ).value;

        const email = document.getElementById(
            "emailCadastro"
        ).value;

        const senha = document.getElementById(
            "senhaCadastro"
        ).value;

        try {
            const resposta = await fetch(
                `${API}/auth/cadastro`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        nome,
                        email,
                        senha
                    })
                }
            );

            const dados = await resposta.json();

            if (!resposta.ok) {
                throw new Error(
                    dados.erro || "Erro no cadastro."
                );
            }

            mostrarMensagem(
                "Conta criada! Agora faça login."
            );

            cadastroForm.hidden = true;

        } catch (erro) {
            mostrarMensagem(erro.message);
        }
    });
}



/* DASHBOARD FINANCEIRO */

const tokenDashboard = sessionStorage.getItem("token");

const moeda = (valor) =>
    new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(Number(valor) || 0);

const hojeLocal = () => {
    const data = new Date();
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");
    return `${ano}-${mes}-${dia}`;
};

async function requisicaoFinanceira(rota, opcoes = {}) {
    const resposta = await fetch(`${API}${rota}`, {
        ...opcoes,
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${tokenDashboard}`,
            ...opcoes.headers
        }
    });

    if (resposta.status === 401) {
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("usuario");
        window.location.replace("login.html");
        throw new Error("Sessão expirada.");
    }

    const dados = await resposta.json();

    if (!resposta.ok) {
        throw new Error(dados.erro || "Erro na requisição.");
    }

    return dados;
}

const painel = document.querySelector(".dashboard-page");

if (painel) {
    if (!tokenDashboard) {
        window.location.replace("login.html");
    } else {
        iniciarDashboard();
    }
}

let graficoLinha = null;
let graficoRosca = null;

function erroPainel(mensagem) {
    document.getElementById("erroDashboard").textContent =
        mensagem;
}

async function iniciarDashboard() {
    const usuario = JSON.parse(
        sessionStorage.getItem("usuario") || "{}"
    );

    document.getElementById("nomeUsuario").textContent =
        usuario.nome || "usuário";

    const seletorMes = document.getElementById("mesSelecionado");
    seletorMes.value = hojeLocal().slice(0, 7);

    document.getElementById("dataTransacao").value =
        hojeLocal();

    document.getElementById("sair").onclick = () => {
        sessionStorage.clear();
        window.location.replace("login.html");
    };

    seletorMes.addEventListener("change", carregarDashboard);

    const modal = document.getElementById("modalLancamento");

    ["abrirLancamento", "novoLancamento"].forEach(id => {
        document.getElementById(id).onclick = () =>
            modal.showModal();
    });

    document.getElementById("cancelarLancamento").onclick =
        () => modal.close();

    document.getElementById("formTransacao")
        .addEventListener("submit", salvarTransacao);

    document.getElementById("formMeta")
        .addEventListener("submit", salvarMeta);

    document.getElementById("listaTransacoes")
        .addEventListener("click", async (evento) => {
            const botao = evento.target.closest("[data-excluir]");
            if (!botao) return;

            if (!confirm("Excluir esta movimentação?")) return;

            try {
                await requisicaoFinanceira(
                    `/transacoes/${botao.dataset.excluir}`,
                    { method: "DELETE" }
                );
                await carregarDashboard();
            } catch (erro) {
                erroPainel(erro.message);
            }
        });

    document.getElementById("listaMetas")
        .addEventListener("click", gerenciarMetas);

    await carregarDashboard();
}

async function carregarDashboard() {
    erroPainel("");

    try {
        const [resumo, transacoes, grafico, metas] =
            await Promise.all([
                requisicaoFinanceira("/dashboard/resumo"),
                requisicaoFinanceira("/transacoes"),
                requisicaoFinanceira("/dashboard/grafico"),
                requisicaoFinanceira("/metas")
            ]);

        const mes = document.getElementById(
            "mesSelecionado"
        ).value;

        const transacoesMes = transacoes.filter(t =>
            String(t.data).slice(0, 7) === mes
        );

        const receitasMes = transacoesMes
            .filter(t => t.tipo === "receita")
            .reduce((soma, t) => soma + Number(t.valor), 0);

        const despesasMes = transacoesMes
            .filter(t => t.tipo === "despesa")
            .reduce((soma, t) => soma + Number(t.valor), 0);

        document.getElementById("saldo").textContent =
            moeda(resumo.saldo);

        document.getElementById("receitas").textContent =
            moeda(receitasMes);

        document.getElementById("despesas").textContent =
            moeda(despesasMes);

        document.getElementById("lucro").textContent =
            moeda(receitasMes - despesasMes);

        mostrarTransacoes(transacoesMes);
        mostrarMetas(metas);
        desenharGraficos(grafico, receitasMes, despesasMes);

    } catch (erro) {
        erroPainel(erro.message);
    }
}

function mostrarTransacoes(transacoes) {
    const tabela = document.getElementById("listaTransacoes");
    tabela.replaceChildren();

    if (!transacoes.length) {
        const linha = tabela.insertRow();
        const celula = linha.insertCell();
        celula.colSpan = 5;
        celula.textContent = "Nenhuma movimentação neste mês.";
        return;
    }

    transacoes.forEach(t => {
        const linha = tabela.insertRow();

        const descricao = linha.insertCell();
        descricao.textContent = t.descricao;

        const tipo = linha.insertCell();
        tipo.textContent = t.tipo === "receita"
            ? "Receita" : "Despesa";
        tipo.className = t.tipo;

        const valor = linha.insertCell();
        valor.textContent = moeda(t.valor);
        valor.className = t.tipo;

        const data = linha.insertCell();
        const dataISO = String(t.data).slice(0, 10);
        data.textContent = dataISO.split("-").reverse().join("/");

        const acao = linha.insertCell();
        const botao = document.createElement("button");
        botao.textContent = "Excluir";
        botao.dataset.excluir = t.id;
        botao.className = "botao-secundario";
        acao.appendChild(botao);
    });
}

async function salvarTransacao(evento) {
    evento.preventDefault();

    const dados = {
        descricao: document.getElementById("descricao").value,
        tipo: document.getElementById("tipo").value,
        valor: Number(document.getElementById("valor").value),
        data: document.getElementById("dataTransacao").value
    };

    try {
        await requisicaoFinanceira("/transacoes", {
            method: "POST",
            body: JSON.stringify(dados)
        });

        evento.target.reset();
        document.getElementById("modalLancamento").close();
        document.getElementById("mesSelecionado").value =
            dados.data.slice(0, 7);

        await carregarDashboard();
    } catch (erro) {
        alert(erro.message);
    }
}

async function salvarMeta(evento) {
    evento.preventDefault();

    const dados = {
        nome: document.getElementById("nomeMeta").value,
        valor_alvo: Number(
            document.getElementById("valorAlvo").value
        )
    };

    try {
        await requisicaoFinanceira("/metas", {
            method: "POST",
            body: JSON.stringify(dados)
        });

        evento.target.reset();
        await carregarDashboard();
    } catch (erro) {
        erroPainel(erro.message);
    }
}

function mostrarMetas(metas) {
    const lista = document.getElementById("listaMetas");
    lista.replaceChildren();

    const primeira = metas[0];

    document.getElementById("valorMeta").textContent =
        primeira ? moeda(primeira.valor_alvo) : moeda(0);

    const percentual = primeira
        ? Math.min(100, Number(primeira.valor_atual) /
            Number(primeira.valor_alvo) * 100)
        : 0;

    document.getElementById("progressoMeta").style.width =
        `${percentual}%`;

    document.getElementById("percentualMeta").textContent =
        primeira
            ? `${percentual.toFixed(0)}% da meta`
            : "Nenhuma meta cadastrada";

    metas.forEach(meta => {
        const item = document.createElement("div");
        item.className = "meta-item";

        const titulo = document.createElement("strong");
        titulo.textContent = meta.nome;

        const detalhe = document.createElement("p");
        detalhe.textContent =
            `${moeda(meta.valor_atual)} de ${moeda(meta.valor_alvo)}`;

        const adicionar = document.createElement("button");
        adicionar.textContent = "Atualizar valor";
        adicionar.dataset.atualizarMeta = meta.id;

        const excluir = document.createElement("button");
        excluir.textContent = "Excluir";
        excluir.className = "botao-secundario";
        excluir.dataset.excluirMeta = meta.id;

        item.append(titulo, detalhe, adicionar, " ", excluir);
        lista.appendChild(item);
    });
}

async function gerenciarMetas(evento) {
    const botao = evento.target.closest("button");
    if (!botao) return;

    try {
        if (botao.dataset.excluirMeta) {
            if (!confirm("Excluir esta meta?")) return;

            await requisicaoFinanceira(
                `/metas/${botao.dataset.excluirMeta}`,
                { method: "DELETE" }
            );
        }

        if (botao.dataset.atualizarMeta) {
            const entrada = prompt(
                "Qual é o valor total já guardado para esta meta?"
            );

            if (entrada === null) return;

            const valor = Number(
                entrada.replace(",", ".")
            );

            if (!Number.isFinite(valor) || valor < 0) {
                alert("Informe um valor válido.");
                return;
            }

            await requisicaoFinanceira(
                `/metas/${botao.dataset.atualizarMeta}`,
                {
                    method: "PATCH",
                    body: JSON.stringify({ valor_atual: valor })
                }
            );
        }

        await carregarDashboard();
    } catch (erro) {
        erroPainel(erro.message);
    }
}

function desenharGraficos(dados, receitas, despesas) {
    if (typeof Chart === "undefined") {
        erroPainel("Não foi possível carregar a biblioteca de gráficos.");
        return;
    }

    if (graficoLinha) graficoLinha.destroy();
    if (graficoRosca) graficoRosca.destroy();

    const meses = [...new Set(dados.map(d => d.mes))].sort();

    const valores = (tipo) => meses.map(mes =>
        dados.filter(d => d.mes === mes && d.tipo === tipo)
            .reduce((soma, d) => soma + Number(d.total), 0)
    );

    graficoLinha = new Chart(
        document.getElementById("graficoLinha"),
        {
            type: "line",
            data: {
                labels: meses,
                datasets: [
                    {
                        label: "Receitas",
                        data: valores("receita"),
                        borderColor: "#21966b",
                        backgroundColor: "#21966b22",
                        tension: .35,
                        fill: true
                    },
                    {
                        label: "Despesas",
                        data: valores("despesa"),
                        borderColor: "#db4184",
                        tension: .35
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        }
    );

    graficoRosca = new Chart(
        document.getElementById("graficoRosca"),
        {
            type: "doughnut",
            data: {
                labels: ["Receitas", "Despesas"],
                datasets: [{
                    data: [receitas, despesas],
                    backgroundColor: ["#24a477", "#dc3b8d"]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false
            }
        }
    );
}
