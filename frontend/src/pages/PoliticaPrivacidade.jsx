import { Link } from 'react-router-dom';

const PoliticaPrivacidade = () => {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            to="/login"
            className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-4"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Voltar
          </Link>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Política de Privacidade</h1>
          <p className="text-gray-600">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        {/* Conteúdo */}
        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Introdução</h2>
            <p className="text-gray-700 mb-4">
              Esta Política de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas informações
              pessoais em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Informações que Coletamos</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">2.1 Informações de Cadastro</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Nome completo</li>
              <li>E-mail</li>
              <li>Telefone/Celular</li>
              <li>Foto de perfil (opcional)</li>
              <li>Cargo/Função</li>
              <li>Equipe</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">2.2 Informações de Clientes</h3>
            <p className="text-gray-700 mb-2">Fornecidas por você:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Nome dos clientes</li>
              <li>CPF</li>
              <li>Telefone</li>
              <li>E-mail</li>
              <li>Endereço</li>
              <li>Informações de consórcios</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">2.3 Informações Técnicas</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Endereço IP</li>
              <li>Navegador e dispositivo</li>
              <li>Logs de acesso</li>
              <li>Cookies (essenciais ao funcionamento)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">2.4 Informações de Uso</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Páginas visitadas</li>
              <li>Ações realizadas no sistema</li>
              <li>Data e hora de acesso</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Como Usamos suas Informações</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">3.1 Finalidades</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Fornecer e melhorar nossos serviços</li>
              <li>Autenticar e gerenciar sua conta</li>
              <li>Processar transações</li>
              <li>Enviar notificações importantes</li>
              <li>Prevenir fraudes e abusos</li>
              <li>Cumprir obrigações legais</li>
              <li>Análise e estatísticas (dados agregados e anônimos)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">3.2 Base Legal (LGPD)</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Execução de contrato (Art. 7º, V)</li>
              <li>Legítimo interesse (Art. 7º, IX)</li>
              <li>Consentimento (quando aplicável - Art. 7º, I)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Compartilhamento de Informações</h2>

            <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
              <h3 className="text-lg font-semibold text-green-800 mb-2">4.1 NÃO Compartilhamos ou Vendemos</h3>
              <p className="text-green-700">
                Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros para fins de marketing.
              </p>
            </div>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">4.2 Compartilhamento Permitido</h3>
            <p className="text-gray-700 mb-2">Podemos compartilhar informações com:</p>

            <p className="text-gray-700 font-semibold mt-4 mb-2">Prestadores de Serviço:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Hospedagem (Render, Heroku, etc.)</li>
              <li>E-mail transacional (SendGrid, etc.)</li>
              <li>Monitoramento (Sentry, etc.)</li>
            </ul>

            <p className="text-gray-700 font-semibold mt-4 mb-2">Obrigações Legais:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Autoridades quando exigido por lei</li>
              <li>Proteção de direitos e segurança</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">4.3 Transferência Internacional</h3>
            <p className="text-gray-700 mb-4">
              Alguns prestadores podem estar localizados fora do Brasil. Garantimos que atendem aos requisitos da LGPD.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Armazenamento e Segurança</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">5.1 Medidas de Segurança</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Criptografia de senhas (bcrypt)</li>
              <li>Autenticação JWT</li>
              <li>Rate limiting (prevenção de ataques)</li>
              <li>HTTPS obrigatório</li>
              <li>Backups regulares</li>
              <li>Monitoramento de segurança</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">5.2 Retenção de Dados</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Dados de conta: enquanto sua conta estiver ativa</li>
              <li>Dados de clientes: conforme sua necessidade de negócio</li>
              <li>Logs: 90 dias</li>
              <li>Após exclusão: 30 dias (backup) e depois permanentemente excluídos</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Seus Direitos (LGPD)</h2>
            <p className="text-gray-700 mb-4">Você tem direito a:</p>

            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">6.1 Acesso (Art. 18, I e II)</h3>
                <ul className="list-disc pl-6 text-blue-800">
                  <li>Confirmação de que processamos seus dados</li>
                  <li>Acesso aos seus dados pessoais</li>
                </ul>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">6.2 Correção (Art. 18, III)</h3>
                <p className="text-blue-800">Corrigir dados incompletos, inexatos ou desatualizados</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">6.3 Exclusão (Art. 18, VI)</h3>
                <p className="text-blue-800">Solicitar a exclusão de seus dados (exceções: obrigações legais)</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">6.4 Portabilidade (Art. 18, V)</h3>
                <p className="text-blue-800">Exportar seus dados em formato estruturado</p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">6.5 Revogação do Consentimento (Art. 18, IX)</h3>
                <p className="text-blue-800">Retirar consentimento a qualquer momento</p>
              </div>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Cookies</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">7.1 Tipos de Cookies Usados</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li><strong>Essenciais:</strong> Necessários para funcionamento (autenticação)</li>
              <li><strong>Preferências:</strong> Lembrar suas configurações</li>
              <li><strong>Análise:</strong> Entender como você usa o sistema (anonimizado)</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">7.2 Gerenciar Cookies</h3>
            <p className="text-gray-700 mb-4">
              Você pode desabilitar cookies nas configurações do navegador, mas isso pode afetar a funcionalidade.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Proteção de Menores</h2>
            <p className="text-gray-700 mb-4">
              Nosso serviço não é direcionado a menores de 18 anos. Não coletamos intencionalmente dados de menores.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Alterações nesta Política</h2>
            <p className="text-gray-700 mb-4">
              Podemos atualizar esta Política periodicamente. Notificaremos sobre mudanças significativas por e-mail
              ou aviso no sistema.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Autoridade Nacional de Proteção de Dados (ANPD)</h2>
            <p className="text-gray-700 mb-4">
              Você pode contactar a ANPD em{' '}
              <a href="https://www.gov.br/anpd" target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-700 underline">
                www.gov.br/anpd
              </a>
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contato</h2>
            <p className="text-gray-700 mb-4">
              Para exercer seus direitos ou esclarecer dúvidas, entre em contato conosco através do sistema.
            </p>
            <p className="text-gray-700 mb-4">
              Responderemos sua solicitação em até 15 dias.
            </p>
          </section>

          {/* Resumo Simplificado */}
          <div className="bg-gradient-to-r from-primary-50 to-accent-50 p-6 rounded-lg my-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Resumo Simplificado</h2>
            <div className="space-y-3 text-gray-700">
              <p>📊 <strong>O que coletamos:</strong> Nome, e-mail, telefone, dados de uso</p>
              <p>🔒 <strong>Como protegemos:</strong> Criptografia, HTTPS, backups seguros</p>
              <p>🚫 <strong>O que NÃO fazemos:</strong> Não vendemos seus dados</p>
              <p>✅ <strong>Seus direitos:</strong> Acesso, correção, exclusão, portabilidade</p>
            </div>
          </div>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-8">
            <p className="text-sm text-yellow-800">
              <strong>IMPORTANTE:</strong> Este é um modelo básico adaptado à LGPD. Consulte um advogado
              especializado em proteção de dados para revisar e personalizar conforme sua operação específica.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/termos-de-uso"
              className="text-center px-6 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
            >
              Ver Termos de Uso
            </Link>
            <Link
              to="/login"
              className="text-center px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Voltar ao Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoliticaPrivacidade;
