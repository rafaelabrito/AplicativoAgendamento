using Application.Interfaces;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Application.Services
{
    public class RelatorioService : IRelatorioService
    {
        public async Task<IEnumerable<object>> GetRelatorioAsync()
        {
            // Simulação de dados para o relatório
            var relatorio = new List<object>
            {
                new
                {
                    NomeCliente = "João Silva",
                    NomeAtendente = "Maria Oliveira",
                    DataAtendimento = "2026-04-20",
                    Horario = "10:00",
                    TipoAtendimento = "Consulta",
                    Status = "Confirmado",
                    DataCriacao = "2026-04-15",
                    DataConfirmacao = "2026-04-16",
                    DataCancelamento = (string)null,
                    Justificativa = (string)null
                }
            };

            return await Task.FromResult(relatorio);
        }
    }
}