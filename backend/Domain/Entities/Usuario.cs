namespace Domain.Entities
{
    public enum TipoUsuario
    {
        Administrador,
        Atendente,
        Cliente
    }

    public class Usuario
    {
        public Guid Id { get; set; }
        public string Nome { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string SenhaHash { get; set; } = string.Empty;
        public TipoUsuario Tipo { get; set; }
        public string? CPF { get; set; }
        public DateTime? DataNascimento { get; set; }
        public string? Telefone { get; set; }
        public bool Ativo { get; set; } = true;
        public string? Observacoes { get; set; }
    }
}