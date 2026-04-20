using Application.Services;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Xunit;
using System;
using System.Threading.Tasks;

namespace Tests
{
    public class DisponibilidadeServiceTests
    {
        private AppDbContext GetDbContext()
        {
            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString())
                .Options;
            return new AppDbContext(options);
        }

        [Fact]
        public async Task NaoPermiteSobreposicaoDisponibilidade()
        {
            var db = GetDbContext();
            var repo = new Infrastructure.Repositories.DisponibilidadeRepository(db);
            var service = new DisponibilidadeService(repo);
            var atendenteId = Guid.NewGuid();
            db.Disponibilidades.Add(new Disponibilidade
            {
                Id = Guid.NewGuid(),
                AtendenteId = atendenteId,
                DiaSemana = DayOfWeek.Monday,
                HoraInicio = new TimeSpan(8, 0, 0),
                HoraFim = new TimeSpan(12, 0, 0),
                Ativo = true
            });
            await db.SaveChangesAsync();
            var (ok, error) = await service.ValidarDisponibilidadeAsync(atendenteId, DayOfWeek.Monday, new TimeSpan(10, 0, 0), new TimeSpan(13, 0, 0));
            Assert.False(ok);
            Assert.Contains("sobreposta", error);
        }

        [Fact]
        public async Task PermiteDisponibilidadeSemSobreposicao()
        {
            var db = GetDbContext();
            var repo = new Infrastructure.Repositories.DisponibilidadeRepository(db);
            var service = new DisponibilidadeService(repo);
            var atendenteId = Guid.NewGuid();
            db.Disponibilidades.Add(new Disponibilidade
            {
                Id = Guid.NewGuid(),
                AtendenteId = atendenteId,
                DiaSemana = DayOfWeek.Monday,
                HoraInicio = new TimeSpan(8, 0, 0),
                HoraFim = new TimeSpan(12, 0, 0),
                Ativo = true
            });
            await db.SaveChangesAsync();
            var (ok, error) = await service.ValidarDisponibilidadeAsync(atendenteId, DayOfWeek.Monday, new TimeSpan(13, 0, 0), new TimeSpan(14, 0, 0));
            Assert.True(ok);
            Assert.Null(error);
        }
        [Fact]
        public async Task NaoPermiteHoraInicioIgualHoraFim()
        {
            var db = GetDbContext();
            var repo = new Infrastructure.Repositories.DisponibilidadeRepository(db);
            var service = new DisponibilidadeService(repo);
            var atendenteId = Guid.NewGuid();
            var (ok, error) = await service.ValidarDisponibilidadeAsync(atendenteId, DayOfWeek.Tuesday, new TimeSpan(8, 0, 0), new TimeSpan(8, 0, 0));
            Assert.False(ok);
            Assert.Contains("Hora de início deve ser menor que a hora de fim", error);
        }

        [Fact]
        public async Task NaoPermiteHoraInicioMaiorQueFim()
        {
            var db = GetDbContext();
            var repo = new Infrastructure.Repositories.DisponibilidadeRepository(db);
            var service = new DisponibilidadeService(repo);
            var atendenteId = Guid.NewGuid();
            var (ok, error) = await service.ValidarDisponibilidadeAsync(atendenteId, DayOfWeek.Tuesday, new TimeSpan(12, 0, 0), new TimeSpan(8, 0, 0));
            Assert.False(ok);
            Assert.Contains("Hora de início deve ser menor que a hora de fim", error);
        }

        [Fact]
        public async Task NaoPermiteHoraInicioNegativa()
        {
            var db = GetDbContext();
            var repo = new Infrastructure.Repositories.DisponibilidadeRepository(db);
            var service = new DisponibilidadeService(repo);
            var atendenteId = Guid.NewGuid();
            var (ok, error) = await service.ValidarDisponibilidadeAsync(atendenteId, DayOfWeek.Tuesday, new TimeSpan(-1, 0, 0), new TimeSpan(8, 0, 0));
            Assert.False(ok);
            Assert.Contains("Horário deve estar entre 00:00 e 23:59", error);
        }

        [Fact]
        public async Task NaoPermiteHoraFimMaiorQue2359()
        {
            var db = GetDbContext();
            var repo = new Infrastructure.Repositories.DisponibilidadeRepository(db);
            var service = new DisponibilidadeService(repo);
            var atendenteId = Guid.NewGuid();
            var (ok, error) = await service.ValidarDisponibilidadeAsync(atendenteId, DayOfWeek.Tuesday, new TimeSpan(8, 0, 0), new TimeSpan(23, 59, 59).Add(TimeSpan.FromSeconds(1)));
            Assert.False(ok);
            Assert.Contains("Horário deve estar entre 00:00 e 23:59", error);
        }
    }
}
