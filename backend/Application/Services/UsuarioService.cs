using Application.Interfaces;
using Domain.Entities;
using System.Text.RegularExpressions;

namespace Application.Services
{
    public class UsuarioService
    {
        private readonly IUsuarioRepository _repo;
        public UsuarioService(IUsuarioRepository repo)
        {
            _repo = repo;
        }


        public async Task<(bool Success, string? Error)> ValidarNovoUsuarioAsync(Application.Models.CreateUsuarioRequest req)
        {
            // Nome obrigatório
            if (string.IsNullOrWhiteSpace(req.Nome))
                return (false, "Nome é obrigatório.");
            // Tipo obrigatório
            if (string.IsNullOrWhiteSpace(req.Tipo) || !Enum.TryParse<Domain.Entities.TipoUsuario>(req.Tipo, true, out var tipo))
                return (false, "Tipo de usuário inválido.");
            // Email obrigatório e formato
            if (string.IsNullOrWhiteSpace(req.Email))
                return (false, "E-mail é obrigatório.");
            if (!Regex.IsMatch(req.Email, @"^[^@\s]+@[^@\s]+\.[^@\s]+$"))
                return (false, "Formato de e-mail inválido.");
            if (await _repo.EmailExisteAsync(req.Email))
                return (false, "E-mail já cadastrado.");
            // Senha obrigatória e confirmação
            if (string.IsNullOrWhiteSpace(req.Senha) || req.Senha.Length < 8)
                return (false, "Senha deve ter no mínimo 8 caracteres.");
            if (req.Senha != req.ConfirmeSenha)
                return (false, "Confirme a senha deve ser igual à senha.");
            // Para Cliente: CPF, DataNascimento, Telefone obrigatórios
            if (tipo == Domain.Entities.TipoUsuario.Cliente)
            {
                if (string.IsNullOrWhiteSpace(req.CPF))
                    return (false, "CPF é obrigatório para Cliente.");

                var cpf = new string(req.CPF.Where(char.IsDigit).ToArray());
                if (!Regex.IsMatch(cpf, @"^\d{11}$"))
                    return (false, "CPF deve conter 11 dígitos.");
                if (!ValidarCpf(cpf))
                    return (false, "CPF inválido.");
                if (await _repo.CpfExisteAsync(cpf))
                    return (false, "CPF já cadastrado.");
                if (string.IsNullOrWhiteSpace(req.DataNascimento))
                    return (false, "Data de nascimento é obrigatória para Cliente.");
                if (!DateTime.TryParse(req.DataNascimento, out _))
                    return (false, "Data de nascimento inválida.");
                if (string.IsNullOrWhiteSpace(req.Telefone))
                    return (false, "Telefone é obrigatório para Cliente.");

                var telefone = new string(req.Telefone.Where(char.IsDigit).ToArray());
                if (!Regex.IsMatch(telefone, @"^\d{10,11}$"))
                    return (false, "Telefone deve conter 10 ou 11 dígitos.");
            }
            return (true, null);
        }

        public async Task<(bool Success, string? Error)> ValidarAtualizacaoUsuarioAsync(Application.Models.CreateUsuarioRequest req)
        {
            if (string.IsNullOrWhiteSpace(req.Nome))
                return (false, "Nome é obrigatório.");
            if (string.IsNullOrWhiteSpace(req.Tipo) || !Enum.TryParse<Domain.Entities.TipoUsuario>(req.Tipo, true, out var tipo))
                return (false, "Tipo de usuário inválido.");

            if (tipo == Domain.Entities.TipoUsuario.Cliente)
            {
                if (string.IsNullOrWhiteSpace(req.CPF))
                    return (false, "CPF é obrigatório para Cliente.");

                var cpf = new string(req.CPF.Where(char.IsDigit).ToArray());
                if (!Regex.IsMatch(cpf, @"^\d{11}$"))
                    return (false, "CPF deve conter 11 dígitos.");
                if (!ValidarCpf(cpf))
                    return (false, "CPF inválido.");

                if (string.IsNullOrWhiteSpace(req.DataNascimento))
                    return (false, "Data de nascimento é obrigatória para Cliente.");
                if (!DateTime.TryParse(req.DataNascimento, out _))
                    return (false, "Data de nascimento inválida.");

                if (string.IsNullOrWhiteSpace(req.Telefone))
                    return (false, "Telefone é obrigatório para Cliente.");

                var telefone = new string(req.Telefone.Where(char.IsDigit).ToArray());
                if (!Regex.IsMatch(telefone, @"^\d{10,11}$"))
                    return (false, "Telefone deve conter 10 ou 11 dígitos.");
            }

            return await Task.FromResult((true, (string?)null));
        }

        private bool ValidarCpf(string cpf)
        {
            // Algoritmo de validação de CPF (simplificado)
            if (cpf.Length != 11 || cpf.All(c => c == cpf[0])) return false;
            int[] mult1 = { 10, 9, 8, 7, 6, 5, 4, 3, 2 };
            int[] mult2 = { 11, 10, 9, 8, 7, 6, 5, 4, 3, 2 };
            var tempCpf = cpf.Substring(0, 9);
            int sum = 0;
            for (int i = 0; i < 9; i++) sum += int.Parse(tempCpf[i].ToString()) * mult1[i];
            int resto = sum % 11;
            int dig1 = resto < 2 ? 0 : 11 - resto;
            tempCpf += dig1;
            sum = 0;
            for (int i = 0; i < 10; i++) sum += int.Parse(tempCpf[i].ToString()) * mult2[i];
            resto = sum % 11;
            int dig2 = resto < 2 ? 0 : 11 - resto;
            return cpf.EndsWith($"{dig1}{dig2}");
        }

        private bool SenhaForte(string senha)
        {
            if (string.IsNullOrWhiteSpace(senha) || senha.Length < 8) return false;
            var hasUpper = senha.Any(char.IsUpper);
            var hasLower = senha.Any(char.IsLower);
            var hasDigit = senha.Any(char.IsDigit);
            var hasSpecial = Regex.IsMatch(senha, "[!@#$%^&*(),.?\":{}|<>]");
            return hasUpper && hasLower && hasDigit && hasSpecial;
        }
    }
}