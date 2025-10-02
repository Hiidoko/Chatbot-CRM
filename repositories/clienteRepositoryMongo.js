const mongoose = require('mongoose');

// Esquema Mongoose para Cliente (reflete schema de validação atual)
const clienteSchema = new mongoose.Schema({
  nome: { type: String, required: true },
  email: { type: String, required: true },
  telefone: { type: String, required: true },
  cidade: { type: String, required: true },
  maquina: { type: String, required: true },
  horario: { type: String, required: true },
  status: { type: String, required: false, default: 'novo' },
  origem: { type: String, required: false, default: 'manual' },
  consultor: { type: String },
  dataCadastro: { type: Date, required: true },
  id: { type: Number, required: true, unique: true, index: true }
}, { versionKey: false });

clienteSchema.index({ dataCadastro: -1 });
clienteSchema.index({ status: 1 });
clienteSchema.index({ cidade: 1 });
clienteSchema.index({ maquina: 1 });
clienteSchema.index({ consultor: 1 });

const ClienteModel = mongoose.models.Cliente || mongoose.model('Cliente', clienteSchema);

class MongoClienteRepository {
  async getAll() {
    const docs = await ClienteModel.find({}).lean();
    return docs.map(d => ({ ...d, dataCadastro: (d.dataCadastro instanceof Date ? d.dataCadastro.toISOString() : d.dataCadastro) }));
  }
  async addMany(list) {
    if (!Array.isArray(list) || list.length === 0) return true;
    await ClienteModel.insertMany(list, { ordered: true });
    return true;
  }
  async update(id, patch) {
    const res = await ClienteModel.findOneAndUpdate({ id }, { $set: { ...patch } }, { new: true }).lean();
    return !!res;
  }
  async delete(id) {
    const res = await ClienteModel.deleteOne({ id });
    return res.deletedCount === 1;
  }
}

module.exports = { MongoClienteRepository };
