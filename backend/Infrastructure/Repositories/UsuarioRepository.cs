using Application.Interfaces;
using Domain.Entities;
using Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Infrastructure.Repositories
{
    public class UsuarioRepository : IUsuarioRepository
    {
        private readonly AppDbContext _db;
        public UsuarioRepository(AppDbContext db)
        {
            _db = db;
        }

        public async Task<bool> EmailExisteAsync(string email)
        {
            return await _db.Usuarios.AnyAsync(u => u.Email == email);
        }

        public async Task<bool> CpfExisteAsync(string cpf)
        {
            return await _db.Usuarios.AnyAsync(u => u.CPF == cpf);
        }
    }
}
