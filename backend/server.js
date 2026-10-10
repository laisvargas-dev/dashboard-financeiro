
require("dotenv").config();

const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const authRoutes = require("./routes/authRoutes");

const app = express();

app.use(helmet());
app.use(cors({
    origin: process.env.FRONTEND_ORIGIN ||
        "http://localhost:3000"
}));

app.use(express.json({ limit: "20kb" }));

const limiteAuth = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: "draft-8",
    legacyHeaders: false
});

app.get("/", (req, res) => {
    res.json({
        mensagem: "API financeira funcionando!"
    });
});

app.use("/api/auth", limiteAuth, authRoutes);

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(
        `Servidor rodando em http://localhost:${PORT}`
    );
});
