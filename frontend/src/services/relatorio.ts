import api from './api';

export async function getRelatorioAgendamentos(filtros: any) {
  const response = await api.post('/agendamentos/relatorio', filtros);
  return response.data;
}

export async function exportarRelatorioAgendamentos(filtros: any, formato: 'csv' | 'xlsx') {
  const response = await api.post('/agendamentos/relatorio', {
    ...filtros,
    ExportFormat: formato,
  }, {
    responseType: 'blob',
  });
  return response.data;
}
