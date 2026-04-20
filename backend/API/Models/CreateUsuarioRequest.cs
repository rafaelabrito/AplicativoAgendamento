namespace API.Models
{
    public class CreateUsuarioRequest
    {
        public string Nome { get; set; } = string.Empty;
        public string Tipo { get; set; } = "Cliente"; // Cliente, Atendente, Administrador
        public string Email { get; set; } = string.Empty;
        public string Senha { get; set; } = string.Empty;
        public string ConfirmeSenha { get; set; } = string.Empty;
        // Para Cliente:
        public string? CPF { get; set; } // Apenas números
        public string? DataNascimento { get; set; } // string para validação de formato
        public string? Telefone { get; set; } // Apenas números
        public string? Observacoes { get; set; }
        // Ativo: somente leitura, true por padrão
        public bool Ativo { get; set; } = true;
    }
}