import { Link } from 'react-router-dom';

const TermosDeUso = () => {
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
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Termos de Uso</h1>
          <p className="text-gray-600">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>
        </div>

        {/* Conteúdo */}
        <div className="prose prose-lg max-w-none">
          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">1. Aceitação dos Termos</h2>
            <p className="text-gray-700 mb-4">
              Ao acessar e usar o sistema Gestor de Consórcios ("o Sistema"), você concorda com estes Termos de Uso.
              Se você não concorda com qualquer parte destes termos, não utilize o Sistema.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">2. Descrição do Serviço</h2>
            <p className="text-gray-700 mb-4">
              O Gestor de Consórcios é uma plataforma de gerenciamento de vendas e clientes para empresas do setor de consórcios.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">3. Cadastro e Conta</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">3.1 Elegibilidade</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Você deve ter pelo menos 18 anos para usar o Sistema</li>
              <li>Você deve fornecer informações verdadeiras e atualizadas</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">3.2 Responsabilidade da Conta</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Você é responsável por manter a confidencialidade de sua senha</li>
              <li>Você é responsável por todas as atividades em sua conta</li>
              <li>Notifique-nos imediatamente sobre qualquer uso não autorizado</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">4. Uso Aceitável</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">4.1 Você PODE:</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Usar o Sistema para gerenciar seus clientes e vendas</li>
              <li>Armazenar dados de clientes de forma segura</li>
              <li>Compartilhar links públicos de cadastro</li>
              <li>Exportar seus dados</li>
            </ul>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">4.2 Você NÃO PODE:</h3>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Usar o Sistema para atividades ilegais</li>
              <li>Tentar hackear ou comprometer a segurança</li>
              <li>Compartilhar sua conta com terceiros não autorizados</li>
              <li>Fazer engenharia reversa do código</li>
              <li>Usar o Sistema para spam ou phishing</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">5. Propriedade Intelectual</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">5.1 Propriedade do Software</h3>
            <p className="text-gray-700 mb-4">
              O Sistema e todo seu conteúdo são propriedade de CFLOW Gestor de Consórcio e estão protegidos por leis de direitos autorais.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">5.2 Seus Dados</h3>
            <p className="text-gray-700 mb-4">
              Você mantém todos os direitos sobre os dados que insere no Sistema. Nós não reivindicamos propriedade sobre seus dados.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">6. Privacidade e Proteção de Dados</h2>
            <p className="text-gray-700 mb-4">
              Consulte nossa{' '}
              <Link to="/politica-privacidade" className="text-primary-600 hover:text-primary-700 underline">
                Política de Privacidade
              </Link>{' '}
              para entender como coletamos, usamos e protegemos seus dados.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">6.1 LGPD</h3>
            <p className="text-gray-700 mb-4">
              Estamos em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">7. Garantias e Limitações</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">7.1 Disponibilidade</h3>
            <p className="text-gray-700 mb-4">
              Nos esforçamos para manter o Sistema disponível 99% do tempo, mas não garantimos disponibilidade ininterrupta.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">7.2 Limitação de Responsabilidade</h3>
            <p className="text-gray-700 mb-4 font-semibold">
              EM NENHUMA CIRCUNSTÂNCIA SEREMOS RESPONSÁVEIS POR DANOS INDIRETOS, INCIDENTAIS, ESPECIAIS OU CONSEQUENCIAIS.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">8. Modificações do Serviço</h2>
            <p className="text-gray-700 mb-4">Reservamo-nos o direito de:</p>
            <ul className="list-disc pl-6 text-gray-700 mb-4">
              <li>Modificar ou descontinuar o Sistema a qualquer momento</li>
              <li>Alterar preços com aviso prévio de 30 dias</li>
              <li>Atualizar estes Termos (notificaremos você)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">9. Rescisão</h2>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">9.1 Por Você</h3>
            <p className="text-gray-700 mb-4">
              Você pode encerrar sua conta a qualquer momento através das configurações.
            </p>

            <h3 className="text-xl font-semibold text-gray-800 mb-3 mt-4">9.2 Por Nós</h3>
            <p className="text-gray-700 mb-4">
              Podemos suspender ou encerrar sua conta se você violar estes Termos.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">10. Legislação Aplicável</h2>
            <p className="text-gray-700 mb-4">
              Estes Termos são regidos pelas leis do Brasil.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">11. Contato</h2>
            <p className="text-gray-700 mb-4">Para questões sobre estes Termos, entre em contato conosco através do sistema.</p>
          </section>

          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 my-8">
            <p className="text-sm text-yellow-800">
              <strong>IMPORTANTE:</strong> Este é um modelo básico. Consulte um advogado especializado para revisar
              e adaptar estes termos à sua realidade jurídica específica.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/politica-privacidade"
              className="text-center px-6 py-2 border border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors"
            >
              Ver Política de Privacidade
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

export default TermosDeUso;
