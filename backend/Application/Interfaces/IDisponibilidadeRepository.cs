using Domain.Entities;
using System;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Application.Interfaces
{
    public interface IDisponibilidadeRepository
    {
        Task<bool> ExisteSobreposicaoAsync(Guid atendenteId, DayOfWeek diaSemana, TimeSpan horaInicio, TimeSpan horaFim, Guid? ignoreId = null);
        Task<bool> HorarioDisponivelAsync(Guid atendenteId, DateTime data, TimeSpan horario);
    }
}
