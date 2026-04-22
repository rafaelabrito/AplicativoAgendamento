using System.Collections.Generic;
using System.Threading.Tasks;

namespace Application.Interfaces
{
    public interface IRelatorioService
    {
        Task<IEnumerable<object>> GetRelatorioAsync();
    }
}