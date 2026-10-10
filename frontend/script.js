
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
