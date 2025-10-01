const router = require('express').Router();
const { listar, obter, adicionar, atualizar, remover, patch, head, options } = require('../controllers/clienteController');

router
	.get('/', listar)
	.head('/', head)
	.options('/', options)
	.get('/:id', obter)
	.post('/', adicionar)
	.put('/:id', atualizar) // Full update (mantido por compat)
	.patch('/:id', patch) // Partial update
	.delete('/:id', remover)
	.options('/:id', options)
	.head('/:id', head);

module.exports = router;
