using Application.Interfaces;
using Domain.Entities;

namespace Application.Services
{
    public class AgendamentoService
    {
        private readonly IAgendamentoRepository _repo;
        private readonly IDisponibilidadeRepository _disponibilidadeRepository;

        public AgendamentoService(IAgendamentoRepository repo, IDisponibilidadeRepository disponibilidadeRepository)
        {
            _repo = repo;
            _disponibilidadeRepository = disponibilidadeRepository;
        }

        public async Task<(bool Success, string? Error)> ValidarNovoAgendamentoAsync(
            Guid clienteId,
            Guid atendenteId,
            DateTime data,
            TimeSpan horario,
            Guid? ignoreAgendamentoId = null)
        {
            var dataHora = data.Date + horario;
            // Não permitir agendamento no passado
            if (dataHora < DateTime.UtcNow)
                return (false, "Não é possível agendar para o passado.");

            // Não permitir conflito para o mesmo cliente
            if (await _repo.ClientePossuiConflitoAsync(clienteId, data, horario, ignoreAgendamentoId))
                return (false, "Já existe um agendamento para este cliente neste horário.");

            // Não permitir conflito para o mesmo atendente
            if (await _repo.AtendentePossuiConflitoAsync(atendenteId, data, horario, ignoreAgendamentoId))
                return (false, "O atendente já possui um agendamento neste horário.");

            if (!await _disponibilidadeRepository.HorarioDisponivelAsync(atendenteId, data, horario))
                return (false, "O horário informado não está disponível na agenda do atendente.");

            return (true, null);
        }
    }
}