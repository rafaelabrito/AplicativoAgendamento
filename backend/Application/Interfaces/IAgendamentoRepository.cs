using Domain.Entities;
using System;
using System.Threading.Tasks;

namespace Application.Interfaces
{
    public interface IAgendamentoRepository
    {
        Task<bool> ClientePossuiConflitoAsync(Guid clienteId, DateTime data, TimeSpan horario, Guid? ignoreAgendamentoId = null);
        Task<bool> AtendentePossuiConflitoAsync(Guid atendenteId, DateTime data, TimeSpan horario, Guid? ignoreAgendamentoId = null);
    }
}
