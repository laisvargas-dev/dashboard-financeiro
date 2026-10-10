
const pool = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const cadastrar = async (req, res) => {
    try {
        const { nome, email, senha } = req.body;

        if (
            typeof nome !== "string" ||
            typeof email !== "string" ||
            typeof senha !== "string" ||
            !nome.trim() ||
            !email.trim() ||
            senha.length < 8
        ) {
            return res.status(400).json({
                erro: "Informe nome, email e senha de pelo menos 8 caracteres."
            });
        }

        const emailNormalizado = email.trim().toLowerCase();

        const senhaHash = await bcrypt.hash(senha, 12);

        const resultado = await pool.query(
            `INSERT INTO usuarios (nome, email, senha_hash)
             VALUES ($1, $2, $3)
             RETURNING id, nome, email`,
            [nome.trim(), emailNormalizado, senhaHash]
        );

        res.status(201).json({
            mensagem: "Usuário cadastrado com sucesso!",
            usuario: resultado.rows[0]
        });

    } catch (erro) {
        if (erro.code === "23505") {
            return res.status(409).json({
                erro: "Este email já está cadastrado."
            });
        }

        console.error(erro);
        res.status(500).json({
            erro: "Erro interno ao cadastrar usuário."
        });
    }
};

const login = async (req, res) => {
    try {
        const { email, senha } = req.body;

        if (
            typeof email !== "string" ||
            typeof senha !== "string"
        ) {
            return res.status(400).json({
                erro: "Email e senha são obrigatórios."
            });
        }

        const resultado = await pool.query(
            "SELECT * FROM usuarios WHERE email = $1",
            [email.trim().toLowerCase()]
        );

        const usuario = resultado.rows[0];

        const senhaCorreta = usuario
            ? await bcrypt.compare(senha, usuario.senha_hash)
            : false;

        if (!senhaCorreta) {
            return res.status(401).json({
                erro: "Email ou senha inválidos."
            });
        }

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET não configurado.");
        }

        const token = jwt.sign(
            { id: usuario.id },
            process.env.JWT_SECRET,
            { expiresIn: "2h" }
        );

        res.json({
            mensagem: "Login realizado com sucesso!",
            token,
            usuario: {
                id: usuario.id,
                nome: usuario.nome,
                email: usuario.email
            }
        });

    } catch (erro) {
        console.error(erro);
        res.status(500).json({
            erro: "Erro interno ao realizar login."
        });
    }
};

module.exports = { cadastrar, login };
