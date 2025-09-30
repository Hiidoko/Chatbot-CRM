const router = require('express').Router();
const { listar, adicionar, atualizar, remover } = require('../controllers/clienteController');

router
	.get('/', listar)
	.post('/', adicionar)
	.put('/:id', atualizar)
	.delete('/:id', remover);

module.exports = router;
