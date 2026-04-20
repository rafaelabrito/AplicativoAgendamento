using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories
{
    public class AgendamentoRepository : IAgendamentoRepository
    {
        private readonly AppDbContext _db;
        public AgendamentoRepository(AppDbContext db)
        {
            _db = db;
        }

        public async Task<bool> ClientePossuiConflitoAsync(Guid clienteId, DateTime data, TimeSpan horario, Guid? ignoreAgendamentoId = null)
        {
            return await _db.Agendamentos.AnyAsync(a =>
                a.ClienteId == clienteId &&
                a.Data == data &&
                a.Horario == horario &&
                (a.Status == StatusAgendamento.Pendente || a.Status == StatusAgendamento.Confirmado) &&
                a.Id != ignoreAgendamentoId);
        }

        public async Task<bool> AtendentePossuiConflitoAsync(Guid atendenteId, DateTime data, TimeSpan horario, Guid? ignoreAgendamentoId = null)
        {
            return await _db.Agendamentos.AnyAsync(a =>
                a.AtendenteId == atendenteId &&
                a.Data == data &&
                a.Horario == horario &&
                (a.Status == StatusAgendamento.Pendente || a.Status == StatusAgendamento.Confirmado) &&
                a.Id != ignoreAgendamentoId);
        }
    }
}
