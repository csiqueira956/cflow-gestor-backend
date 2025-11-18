import { useMemo } from 'react';

const PasswordStrengthIndicator = ({ password }) => {
  const strength = useMemo(() => {
    if (!password) return { level: 0, text: '', color: '' };

    let score = 0;

    // Comprimento
    if (password.length >= 6) score += 1;
    if (password.length >= 10) score += 1;
    if (password.length >= 14) score += 1;

    // Contém minúsculas
    if (/[a-z]/.test(password)) score += 1;

    // Contém maiúsculas
    if (/[A-Z]/.test(password)) score += 1;

    // Contém números
    if (/\d/.test(password)) score += 1;

    // Contém caracteres especiais
    if (/[^A-Za-z0-9]/.test(password)) score += 1;

    // Determinar força
    if (score < 3) {
      return {
        level: 1,
        text: 'Fraca',
        color: 'bg-red-500',
        textColor: 'text-red-700',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-200'
      };
    } else if (score < 5) {
      return {
        level: 2,
        text: 'Média',
        color: 'bg-yellow-500',
        textColor: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-200'
      };
    } else if (score < 6) {
      return {
        level: 3,
        text: 'Boa',
        color: 'bg-blue-500',
        textColor: 'text-blue-700',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200'
      };
    } else {
      return {
        level: 4,
        text: 'Forte',
        color: 'bg-green-500',
        textColor: 'text-green-700',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200'
      };
    }
  }, [password]);

  if (!password) return null;

  return (
    <div className="mt-2">
      {/* Barra de força */}
      <div className="flex gap-1 mb-2">
        {[1, 2, 3, 4].map((level) => (
          <div
            key={level}
            className={`h-2 flex-1 rounded-full transition-colors ${
              level <= strength.level ? strength.color : 'bg-gray-200'
            }`}
          />
        ))}
      </div>

      {/* Texto e dicas */}
      <div className={`text-sm p-2 rounded border ${strength.bgColor} ${strength.borderColor}`}>
        <p className={`font-medium ${strength.textColor} mb-1`}>
          Força da senha: <span className="font-bold">{strength.text}</span>
        </p>

        {strength.level < 4 && (
          <div className="text-xs text-gray-600 mt-2">
            <p className="font-medium mb-1">Dicas para melhorar:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              {password.length < 10 && <li>Use pelo menos 10 caracteres</li>}
              {!/[a-z]/.test(password) && <li>Adicione letras minúsculas</li>}
              {!/[A-Z]/.test(password) && <li>Adicione letras maiúsculas</li>}
              {!/\d/.test(password) && <li>Adicione números</li>}
              {!/[^A-Za-z0-9]/.test(password) && <li>Adicione caracteres especiais (!@#$%)</li>}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default PasswordStrengthIndicator;
