const express = require("express");
const axios = require("axios");
const db = require("./db");

const app = express();

const PRODUTOS_URL =
    process.env.PRODUTOS_URL || "http://localhost:3001";

const CLIENTES_URL =
    process.env.CLIENTES_URL || "http://localhost:3003";

app.use(express.json());

const pedidos = [];

/*app.get("/pedidos", (req, res) => {
    res.json(pedidos);
});*/

app.get("/pedidos", async (req, res) => {
    try {
        const resultado = await db.query(
            "SELECT * FROM pedidos ORDER BY id"
        );

        res.json(resultado.rows);
    } catch (erro) {
        res.status(500).json({
            erro: "Erro ao buscar pedidos"
        });
    }
});

/*app.post("/pedidos", async (req, res) => {
    const { produtoId, quantidade } = req.body;

    if (!produtoId || !quantidade || quantidade <= 0) {
        return res.status(400).json({
            erro: "produtoId e quantidade válida são obrigatórios"
        });
    }

    try {
        const resposta = await axios.get(
            `${PRODUTOS_URL}/produtos/${produtoId}`,
            {
                timeout: 3000
            }
        );

        const produto = resposta.data;

        const pedido = {
            id: pedidos.length + 1,
            produto,
            quantidade,
            total: produto.preco * quantidade
        };

        pedidos.push(pedido);

        res.status(201).json(pedido);
    } catch (erro) {
        if (erro.response?.status === 404) {
            return res.status(400).json({
                erro: "Produto não encontrado"
            });
        }

        return res.status(503).json({
            erro: "Serviço de Produtos indisponível"
        });
    }
});*/

app.post("/pedidos", async (req, res) => {
    const { cliente_id, produtoId, quantidade } = req.body;

    if (!cliente_id || !produtoId || !quantidade || quantidade <= 0) {
        return res.status(400).json({
            erro: "cliente_id, produtoId e quantidade válida são obrigatórios"
        });
    }

    try {
        const respostaCliente = await axios.get(
            `${CLIENTES_URL}/clientes/${cliente_id}`,
            {
                timeout: 3000
            }
        );

        const cliente = respostaCliente.data;

        const respostaProduto = await axios.get(
            `${PRODUTOS_URL}/produtos/${produtoId}`,
            {
                timeout: 3000
            }
        );

        const produto = respostaProduto.data;

        const total = produto.preco * quantidade;

        const resultado = await db.query(
            `INSERT INTO pedidos (
                cliente,
                produto,
                quantidade,
                total
            )
            VALUES ($1, $2, $3, $4)
            RETURNING *`,
            [
                JSON.stringify(cliente),
                JSON.stringify(produto),
                quantidade,
                total
            ]
        );

        res.status(201).json(resultado.rows[0]);

    } catch (erro) {
        if (erro.response?.status === 404) {
            return res.status(400).json({
                erro: "Cliente ou produto não encontrado"
            });
        }

        if (
            erro.code === "ECONNREFUSED" ||
            erro.code === "ECONNABORTED"
        ) {
            return res.status(503).json({
                erro: "Serviço indisponível"
            });
        }

        console.error(erro);

        return res.status(500).json({
            erro: "Erro ao criar pedido"
        });
    }
});


/*app.get("/pedidos/:id", (req, res) => {
    const pedido = pedidos.find(
        p => p.id === Number(req.params.id)
    );

    if (!pedido) {
        return res.status(404).json({
            erro: "Pedido não encontrado"
        });
    }

    res.json(pedido);
});*/

app.get("/pedidos/:id", async (req, res) => {
    try {
        const resultado = await db.query(
            "SELECT * FROM pedidos WHERE id = $1",
            [req.params.id]
        );

        const pedido = resultado.rows[0];

        if (!pedido) {
            return res.status(404).json({
                erro: "Pedido não encontrado"
            });
        }

        res.json(pedido);
    } catch (erro) {
        res.status(500).json({
            erro: "Erro ao buscar pedido"
        });
    }
});

app.use(express.json());

async function criarTabela() {
    await db.query(`
        CREATE TABLE IF NOT EXISTS pedidos (
            id SERIAL PRIMARY KEY,
            cliente JSONB NOT NULL,
            produto JSONB NOT NULL,
            quantidade INTEGER NOT NULL,
            total NUMERIC(10, 2) NOT NULL
        )
    `);

    console.log("Tabela de pedidos pronta");
}


criarTabela();

app.listen(3002, () => {
    console.log("Pedidos rodando na porta 3002");
});