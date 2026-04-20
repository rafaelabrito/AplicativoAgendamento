namespace Application.Models
{
    public class CreateUsuarioRequest
    {
        public string Nome { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Senha { get; set; } = string.Empty;
        public string ConfirmeSenha { get; set; } = string.Empty;
        public string Tipo { get; set; } = string.Empty;
        public string? CPF { get; set; }
        public string? DataNascimento { get; set; }
        public string? Telefone { get; set; }
        public bool Ativo { get; set; } = true;
        public string? Observacoes { get; set; }
    }
}
