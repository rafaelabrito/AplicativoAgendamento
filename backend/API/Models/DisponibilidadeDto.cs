namespace API.Models
{
    public class CreateDisponibilidadeRequest
    {
        public Guid AtendenteId { get; set; }
        public DayOfWeek DiaSemana { get; set; }
        public TimeSpan HoraInicio { get; set; }
        public TimeSpan HoraFim { get; set; }
        public bool Ativo { get; set; } = true;
    }

    public class UpdateDisponibilidadeRequest
    {
        public DayOfWeek DiaSemana { get; set; }
        public TimeSpan HoraInicio { get; set; }
        public TimeSpan HoraFim { get; set; }
        public bool Ativo { get; set; } = true;
    }

    public class DisponibilidadeResponse
    {
        public Guid Id { get; set; }
        public Guid AtendenteId { get; set; }
        public DayOfWeek DiaSemana { get; set; }
        public TimeSpan HoraInicio { get; set; }
        public TimeSpan HoraFim { get; set; }
        public bool Ativo { get; set; }
    }
}
