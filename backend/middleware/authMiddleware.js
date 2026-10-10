
const jwt = require("jsonwebtoken");

function autenticar(req, res, next) {
    const autorizacao = req.headers.authorization;

    if (!autorizacao?.startsWith("Bearer ")) {
        return res.status(401).json({
            erro: "Token não informado."
        });
    }

    const token = autorizacao.split(" ")[1];

    try {
        const usuario = jwt.verify(
            token,
            process.env.JWT_SECRET,
            { algorithms: ["HS256"] }
        );

        req.usuarioId = usuario.id;
        next();
    } catch (erro) {
        return res.status(401).json({
            erro: "Token inválido ou expirado."
        });
    }
}

module.exports = autenticar;
