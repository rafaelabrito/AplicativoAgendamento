namespace API.Models
{
    public class AgendamentoResponse
    {
        public Guid Id { get; set; }
        public string Titulo { get; set; } = string.Empty;
        public string? Descricao { get; set; }
        public string TipoAtendimento { get; set; } = string.Empty;
        public DateTime Data { get; set; }
        public TimeSpan Horario { get; set; }
        public string Status { get; set; } = string.Empty;
        public Guid ClienteId { get; set; }
        public Guid AtendenteId { get; set; }
        public string? ClienteNome { get; set; }
        public string? AtendenteNome { get; set; }
        public string? AtendenteName { get; set; }
        public string? Observacoes { get; set; }
        public string? JustificativaRecusa { get; set; }
        public string? JustificativaCancelamento { get; set; }
        public string? JustificativaReagendamento { get; set; }
        public DateTime DataCriacao { get; set; }
        public DateTime? DataConfirmacao { get; set; }
        public DateTime? DataCancelamento { get; set; }
        public DateTime? DataReagendamento { get; set; }
        public string? ResumoAtendimento { get; set; }
    }
}