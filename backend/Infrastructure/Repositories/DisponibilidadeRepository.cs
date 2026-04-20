using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories
{
    public class DisponibilidadeRepository : IDisponibilidadeRepository
    {
        private readonly AppDbContext _db;
        public DisponibilidadeRepository(AppDbContext db)
        {
            _db = db;
        }

        public async Task<bool> ExisteSobreposicaoAsync(Guid atendenteId, DayOfWeek diaSemana, TimeSpan horaInicio, TimeSpan horaFim, Guid? ignoreId = null)
        {
            return await _db.Disponibilidades
                .Where(d => d.AtendenteId == atendenteId && d.DiaSemana == diaSemana && d.Ativo)
                .Where(d => ignoreId == null || d.Id != ignoreId)
                .AnyAsync(d => (horaInicio < d.HoraFim && horaFim > d.HoraInicio));
        }

        public async Task<bool> HorarioDisponivelAsync(Guid atendenteId, DateTime data, TimeSpan horario)
        {
            var diaSemana = data.DayOfWeek;
            return await _db.Disponibilidades.AnyAsync(d =>
                d.AtendenteId == atendenteId &&
                d.DiaSemana == diaSemana &&
                d.Ativo &&
                horario >= d.HoraInicio &&
                horario < d.HoraFim);
        }
    }
}
