namespace Domain.Entities
{
    public enum StatusAgendamento
    {
        Pendente, // Criado pelo cliente, aguardando confirmação
        Confirmado, // Confirmado pelo atendente
        Recusado, // Recusado pelo atendente (com justificativa)
        Cancelado, // Cancelado pelo cliente (com justificativa)
        Reagendado, // Reagendado por cliente ou atendente
        Realizado // Atendimento concluído
    }

    public class Agendamento
    {
        public Guid Id { get; set; }
        public string Titulo { get; set; } = string.Empty;
        public string? Descricao { get; set; }
        public string TipoAtendimento { get; set; } = string.Empty;
        public DateTime Data { get; set; }
        public TimeSpan Horario { get; set; }
        public StatusAgendamento Status { get; set; } = StatusAgendamento.Pendente;
        public Guid ClienteId { get; set; }
        public Guid AtendenteId { get; set; }
        public string? Observacoes { get; set; }
        public string? JustificativaRecusa { get; set; }
        public string? JustificativaCancelamento { get; set; }
        public string? JustificativaReagendamento { get; set; }
        public DateTime DataCriacao { get; set; } = DateTime.UtcNow;
        public DateTime? DataConfirmacao { get; set; }
        public DateTime? DataCancelamento { get; set; }
        public DateTime? DataReagendamento { get; set; }
        public string? ResumoAtendimento { get; set; }
        // Relacionamentos de navegação (opcional, para EF Core)
        public Usuario? Cliente { get; set; }
        public Usuario? Atendente { get; set; }
    }
}