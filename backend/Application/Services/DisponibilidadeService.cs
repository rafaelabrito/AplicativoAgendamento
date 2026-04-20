using Application.Interfaces;

namespace Application.Services
{
    public class DisponibilidadeService
    {
        private readonly IDisponibilidadeRepository _repo;
        public DisponibilidadeService(IDisponibilidadeRepository repo)
        {
            _repo = repo;
        }

        // Validação para criar/atualizar disponibilidade
        public async Task<(bool Success, string? Error)> ValidarDisponibilidadeAsync(Guid atendenteId, DayOfWeek diaSemana, TimeSpan horaInicio, TimeSpan horaFim, Guid? ignoreId = null)
        {
            if (horaInicio >= horaFim)
                return (false, "Hora de início deve ser menor que a hora de fim.");
            if (horaInicio < TimeSpan.Zero || horaFim > new TimeSpan(23,59,59))
                return (false, "Horário deve estar entre 00:00 e 23:59.");
            // Não permitir sobreposição para o mesmo atendente e dia
            var sobrepoe = await _repo.ExisteSobreposicaoAsync(atendenteId, diaSemana, horaInicio, horaFim, ignoreId);
            if (sobrepoe)
                return (false, "Já existe uma disponibilidade sobreposta para este atendente e dia.");
            return (true, null);
        }
    }
}
