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

        // RQF3.2 - Consulta de Horários Disponíveis: testes para HorarioDisponivelAsync

        [Fact]
        public async Task HorarioDisponivel_RetornaTrue_QuandoDentroDoIntervalo()
        {
            var db = GetDbContext();
            var repo = new Infrastructure.Repositories.DisponibilidadeRepository(db);
            var atendenteId = Guid.NewGuid();
            var data = new DateTime(2025, 6, 2, 0, 0, 0, DateTimeKind.Utc); // Monday
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

            var disponivel = await repo.HorarioDisponivelAsync(atendenteId, data, new TimeSpan(10, 0, 0));

            Assert.True(disponivel);
        }

        [Fact]
        public async Task HorarioDisponivel_RetornaFalse_QuandoForaDoIntervalo()
        {
            var db = GetDbContext();
            var repo = new Infrastructure.Repositories.DisponibilidadeRepository(db);
            var atendenteId = Guid.NewGuid();
            var data = new DateTime(2025, 6, 2, 0, 0, 0, DateTimeKind.Utc); // Monday
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

            var disponivel = await repo.HorarioDisponivelAsync(atendenteId, data, new TimeSpan(14, 0, 0));

            Assert.False(disponivel);
        }

        [Fact]
        public async Task HorarioDisponivel_RetornaFalse_QuandoNaoHaDisponibilidade()
        {
            var db = GetDbContext();
            var repo = new Infrastructure.Repositories.DisponibilidadeRepository(db);
            var atendenteId = Guid.NewGuid();
            var data = new DateTime(2025, 6, 2, 0, 0, 0, DateTimeKind.Utc); // Monday

            var disponivel = await repo.HorarioDisponivelAsync(atendenteId, data, new TimeSpan(10, 0, 0));

            Assert.False(disponivel);
        }

        [Fact]
        public async Task HorarioDisponivel_RetornaFalse_QuandoDisponibilidadeInativa()
        {
            var db = GetDbContext();
            var repo = new Infrastructure.Repositories.DisponibilidadeRepository(db);
            var atendenteId = Guid.NewGuid();
            var data = new DateTime(2025, 6, 2, 0, 0, 0, DateTimeKind.Utc); // Monday
            db.Disponibilidades.Add(new Disponibilidade
            {
                Id = Guid.NewGuid(),
                AtendenteId = atendenteId,
                DiaSemana = DayOfWeek.Monday,
                HoraInicio = new TimeSpan(8, 0, 0),
                HoraFim = new TimeSpan(12, 0, 0),
                Ativo = false  // inativa
            });
            await db.SaveChangesAsync();

            var disponivel = await repo.HorarioDisponivelAsync(atendenteId, data, new TimeSpan(10, 0, 0));

            Assert.False(disponivel);
        }

        [Fact]
        public async Task HorarioDisponivel_RetornaFalse_QuandoHorarioExatamentNoFimDoIntervalo()
        {
            // Horário no final do intervalo (HoraFim) não deve ser válido (usa < e não <=)
            var db = GetDbContext();
            var repo = new Infrastructure.Repositories.DisponibilidadeRepository(db);
            var atendenteId = Guid.NewGuid();
            var data = new DateTime(2025, 6, 2, 0, 0, 0, DateTimeKind.Utc); // Monday
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

            var disponivel = await repo.HorarioDisponivelAsync(atendenteId, data, new TimeSpan(12, 0, 0));

            Assert.False(disponivel); // 12:00 == HoraFim, não deve ser válido
        }

        [Fact]
        public async Task HorarioDisponivel_RetornaTrue_QuandoHorarioExatamenteNoInicio()
        {
            // Horário exatamente no início do intervalo (HoraInicio) deve ser válido (usa >= )
            var db = GetDbContext();
            var repo = new Infrastructure.Repositories.DisponibilidadeRepository(db);
            var atendenteId = Guid.NewGuid();
            var data = new DateTime(2025, 6, 2, 0, 0, 0, DateTimeKind.Utc); // Monday
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

            var disponivel = await repo.HorarioDisponivelAsync(atendenteId, data, new TimeSpan(8, 0, 0));

            Assert.True(disponivel); // 08:00 == HoraInicio, deve ser válido
        }

        [Fact]
        public async Task HorarioDisponivel_RetornaFalse_QuandoDiaSemanaErrado()
        {
            var db = GetDbContext();
            var repo = new Infrastructure.Repositories.DisponibilidadeRepository(db);
            var atendenteId = Guid.NewGuid();
            // Disponibilidade para Monday, mas data é Tuesday
            var dataMonday = new DateTime(2025, 6, 2, 0, 0, 0, DateTimeKind.Utc); // Monday
            var dataTuesday = new DateTime(2025, 6, 3, 0, 0, 0, DateTimeKind.Utc); // Tuesday
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

            var disponivel = await repo.HorarioDisponivelAsync(atendenteId, dataTuesday, new TimeSpan(10, 0, 0));

            Assert.False(disponivel); // Disponibilidade é para Monday, não Tuesday
        }
    }
}
