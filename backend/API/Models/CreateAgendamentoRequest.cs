namespace API.Models
{
    public class CreateAgendamentoRequest
    {
        public Guid ClienteId { get; set; }
        public Guid AtendenteId { get; set; }
        public string Titulo { get; set; } = string.Empty;
        public string? Descricao { get; set; }
        public string TipoAtendimento { get; set; } = string.Empty;
        public DateTime Data { get; set; }
        public TimeSpan Horario { get; set; }
        public string? Observacoes { get; set; }
    }
}