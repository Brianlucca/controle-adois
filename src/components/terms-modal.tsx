"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle, X, CheckCircle } from "lucide-react";

interface TermsModalProps {
  isOpen: boolean;
  onAccept: (userAgent: string) => void;
  onDecline: () => void;
}

export function TermsModal({ isOpen, onAccept, onDecline }: TermsModalProps) {
  const [accepted, setAccepted] = useState(false);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setAccepted(false);
      setScrolledToBottom(false);
    }
  }, [isOpen]);

  const handleAccept = () => {
    const userAgent = navigator.userAgent;
    onAccept(userAgent);
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
    setScrolledToBottom(isAtBottom);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="text-amber-600" size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">Termos de Uso</h2>
              <p className="text-sm text-slate-600">Leia atentamente antes de continuar</p>
            </div>
          </div>
          <button
            onClick={onDecline}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="flex-1 p-6 overflow-y-auto max-h-96" onScroll={handleScroll}>
          <div className="space-y-6 text-slate-700">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="font-semibold text-amber-900 mb-2">Atenção Importante</h3>
                  <p className="text-sm text-amber-800">
                    Este é um projeto de portfólio e estudo. Leia os termos abaixo antes de prosseguir.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">1. Natureza do Projeto</h3>
              <p className="mb-3">
                O <strong>Controle A Dois</strong> é uma aplicação desenvolvida exclusivamente para fins de portfólio e estudo de programação. Não se trata de um produto comercial ou serviço profissional oferecido ao público.
              </p>
              <p className="mb-3">
                O projeto é desenvolvido e mantido por{" "}
                <a
                  href="https://brianlucca.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
                >
                  Brian Lucca
                </a>
                .
              </p>
              <p>
                Esta aplicação está em constante desenvolvimento e pode apresentar bugs, falhas ou limitações técnicas. O uso é feito por conta e risco do usuário.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">2. Responsabilidades do Usuário</h3>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>O usuário é responsável por todos os dados inseridos na aplicação</li>
                <li>Não há garantias de backup automático ou recuperação de dados perdidos</li>
                <li>O usuário deve manter suas credenciais de acesso seguras</li>
                <li>Qualquer uso indevido ou violação dos termos pode resultar na suspensão da conta</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">3. Limitações e Isenções</h3>
              <ul className="list-disc list-inside space-y-2 text-sm">
                <li>Não oferecemos suporte técnico ou atendimento ao cliente</li>
                <li>Não garantimos a disponibilidade contínua do serviço</li>
                <li>Podemos modificar ou descontinuar o serviço a qualquer momento</li>
                <li>Não nos responsabilizamos por perdas financeiras ou danos decorrentes do uso</li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">4. Privacidade e Dados</h3>
              <p className="mb-3">
                Os dados inseridos são armazenados em servidores Firebase. Embora implementemos medidas básicas de segurança, não oferecemos garantias absolutas de proteção de dados contra ataques cibernéticos.
              </p>
              
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-lg mb-3">
                 <p className="text-sm text-blue-800">
                    <strong>Recomendação de Segurança:</strong> Por se tratar de um ambiente de estudo, recomendamos fortemente que você <strong>NÃO</strong> insira dados sensíveis reais (como senhas bancárias reais, números de documentos oficiais ou informações financeiras críticas). Utilize valores fictícios para testar a plataforma.
                 </p>
              </div>

              <p>
                Ao utilizar o sistema, você concorda que os dados inseridos fazem parte de um banco de dados de teste e podem ser excluídos a qualquer momento sem aviso prévio.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">5. Atualizações e Modificações</h3>
              <p>
                Este projeto recebe atualizações frequentes como parte do processo de aprendizado. Mudanças podem afetar a funcionalidade existente ou remover recursos sem aviso prévio.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <p className="text-sm text-slate-600">
                <strong>Ao aceitar estes termos, você declara que:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm text-slate-600 mt-2">
                <li>Entende que este é um projeto de estudo</li>
                <li>Assume total responsabilidade pelo uso da aplicação</li>
                <li>Não utilizará para fins comerciais ou críticos</li>
                <li>Concorda com as limitações e riscos descritos acima</li>
              </ul>
            </div>
          </div>
        </div>

        <div className="border-t border-slate-200 p-6">
          <div className="flex items-start gap-3 mb-4">
            <input
              type="checkbox"
              id="accept-terms"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              disabled={!scrolledToBottom}
              className="mt-1 w-4 h-4 text-slate-900 bg-slate-50 border-slate-300 rounded focus:ring-slate-900 focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed"
            />
            <label htmlFor="accept-terms" className="text-sm text-slate-700 leading-relaxed cursor-pointer">
              Li e aceito os termos de uso acima. Entendo que este é um projeto de portfólio e estudo,
              e uso a aplicação por minha própria conta e risco.
            </label>
          </div>

          {!scrolledToBottom && (
            <p className="text-xs text-amber-600 mb-4 flex items-center gap-2">
              <AlertTriangle size={14} />
              Role até o final para aceitar os termos
            </p>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onDecline}
              className="flex-1 border-slate-200 bg-white text-slate-900 hover:bg-slate-100 hover:text-slate-900"
            >
              Recusar
            </Button>
            <Button
              onClick={handleAccept}
              disabled={!accepted || !scrolledToBottom}
              className="flex-1 bg-slate-900 hover:bg-slate-800"
            >
              <CheckCircle size={16} className="mr-2" />
              Aceitar e Continuar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
