namespace Domain.Entities
{
    public class Disponibilidade
    {
        public Guid Id { get; set; }
        public Guid AtendenteId { get; set; }
        public DayOfWeek DiaSemana { get; set; }
        public TimeSpan HoraInicio { get; set; }
        public TimeSpan HoraFim { get; set; }
        public bool Ativo { get; set; } = true;
    }
}