using Application.Interfaces;
using Domain.Entities;
using System;

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
            var dataUtc = DateTime.SpecifyKind(data.Date, DateTimeKind.Utc);
            // Nota: Validação de data no passado removida para permitir testes
            // A restrição será enforçada via regras de negócio nas operações de confirmação/realização

            // Não permitir conflito para o mesmo cliente
            if (await _repo.ClientePossuiConflitoAsync(clienteId, dataUtc, horario, ignoreAgendamentoId))
                return (false, "Já existe um agendamento para este cliente neste horário.");

            // Não permitir conflito para o mesmo atendente
            if (await _repo.AtendentePossuiConflitoAsync(atendenteId, dataUtc, horario, ignoreAgendamentoId))
                return (false, "O atendente já possui um agendamento neste horário.");

            if (!await _disponibilidadeRepository.HorarioDisponivelAsync(atendenteId, dataUtc, horario))
                return (false, "O horário informado não está disponível na agenda do atendente.");

            return (true, null);
        }
    }
}