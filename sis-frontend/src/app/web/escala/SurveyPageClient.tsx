// src/app/web/escala/SurveyPageClient.tsx
'use client';

import React, { useState } from 'react';
import styles from './SurveyPage.module.css';

type Option = {
  id: number;
  label: string;
};

type Question = {
  id: number;
  text: string;
  options: Option[];
};

type Props = {
  escalaId?: number;
  empresaId?: number;
  escalaNome?: string;
  initialQuestions?: Question[];
  error?: string;
};

export default function SurveyPageClient({
  escalaId,
  empresaId,
  escalaNome,
  initialQuestions,
  error,
}: Props) {
  const questions = initialQuestions ?? [];
  const totalQuestions = questions.length;

  const [started, setStarted] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number | null>>({});
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const current = questions[currentIndex];
  const currentAnswer = current ? answers[current.id] ?? null : null;

  function handleStart() {
    if (!totalQuestions || !escalaId || !empresaId) return;
    setStarted(true);
  }

  function handleSelectOption(optionId: number) {
    if (!current) return;
    setAnswers((prev) => ({
      ...prev,
      [current.id]: optionId,
    }));
  }

  function handlePrev() {
    if (currentIndex === 0) return;
    setCurrentIndex((idx) => idx - 1);
  }

  async function submitSurvey() {
    if (!escalaId || !empresaId) {
      setSubmitError('Link inválido.');
      return;
    }

    const respostasArray = Object.entries(answers)
      .filter(([, value]) => typeof value === 'number')
      .map(([perguntaId, respostaId]) => ({
        perguntaId: Number(perguntaId),
        respostaId: respostaId as number,
      }));

    if (respostasArray.length !== totalQuestions) {
      setSubmitError('Por favor, responda todas as perguntas antes de enviar.');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);

      const res = await fetch('/api/web/escalas/responder', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          escalaId,
          empresaId,
          respostas: respostasArray,
        }),
      });

      if (!res.ok) {
        let data: any = null;
        try {
          data = await res.json();
        } catch {
          // ignore
        }
        const message = data?.error || 'Não foi possível enviar suas respostas.';
        setSubmitError(message);
        return;
      }

      setFinished(true);
    } catch (e) {
      console.error(e);
      setSubmitError(
        'Ocorreu um erro ao enviar suas respostas. Tente novamente em instantes.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleNextOrSubmit() {
    if (!current || !currentAnswer) return;

    const isLast = currentIndex === totalQuestions - 1;

    if (!isLast) {
      setCurrentIndex((idx) => idx + 1);
      return;
    }

    await submitSurvey();
  }

  const isLastQuestion = currentIndex === totalQuestions - 1;

  return (
    <div className={styles.container}>
      {/* LADO ESQUERDO */}
      <aside className={styles.leftPanel}>
        <div className={styles.brand}>
          <div className={styles.logoCircle}>
            <img
              src="/logos/LogoWhite.png"
              alt="PSYQUÉ"
              className={styles.logoImage}
            />
          </div>
          <span className={styles.brandText}>PSYQUÉ</span>
        </div>

        <div className={styles.leftContent}>
          <h2 className={styles.enqueteTitle}>ENQUETE</h2>

          <section className={styles.infoBox}>
            <h3 className={styles.infoTitle}>IMPORTANTE</h3>
            <p className={styles.infoText}>
              Todas as informações fornecidas neste questionário serão tratadas de forma
              estritamente confidencial. Nenhuma resposta será associada ao seu nome
              ou qualquer dado pessoal.
            </p>
            <p className={styles.infoText}>
              Os resultados serão utilizados apenas de forma anônima para fins de análise.
            </p>
            <p className={styles.infoText}>
              Sua sinceridade é fundamental. Obrigado por colaborar!
            </p>
          </section>
        </div>
      </aside>

      {/* LADO DIREITO */}
      <main className={styles.rightPanel}>
        {/* Erro de link ou carregamento */}
        {error ? (
          <div className={styles.startContainer}>
            <h1 className={styles.startTitle}>Enquete indisponível</h1>
            <p className={styles.startSubtitle}>{error}</p>
          </div>
        ) : finished ? (
          // Tela de obrigado
          <div className={styles.startContainer}>
            <h1 className={styles.startTitle}>Obrigado por responder!</h1>
            <p className={styles.startSubtitle}>
              Suas respostas foram registradas com sucesso.
            </p>
          </div>
        ) : !started ? (
          // Tela de início
          <div className={styles.startContainer}>
            <h1 className={styles.startTitle}>
              {escalaNome || 'Enquete de Bem-estar no Trabalho'}
            </h1>
            {totalQuestions > 0 ? (
              <>
                <p className={styles.startSubtitle}>
                  Este questionário levará apenas alguns minutos. Suas respostas são
                  anônimas e ajudarão a melhorar o ambiente de trabalho.
                </p>
                <button
                  className={styles.startButton}
                  onClick={handleStart}
                  disabled={!escalaId || !empresaId}
                >
                  Iniciar
                </button>
              </>
            ) : (
              <p className={styles.startSubtitle}>
                Esta enquete ainda não possui perguntas configuradas.
              </p>
            )}
          </div>
        ) : totalQuestions === 0 ? (
          // fallback se não houver perguntas depois de iniciado (bem improvável)
          <div className={styles.startContainer}>
            <h1 className={styles.startTitle}>Enquete sem perguntas</h1>
            <p className={styles.startSubtitle}>
              No momento não há perguntas disponíveis para esta enquete.
            </p>
          </div>
        ) : (
          // Tela das perguntas
          <div className={styles.questionContainer}>
            <header className={styles.questionHeader}>
              <span className={styles.questionStep}>
                Pergunta {currentIndex + 1} de {totalQuestions}
              </span>
              <h1 className={styles.questionTitle}>
                {currentIndex + 1}. {current?.text}
              </h1>
            </header>

            <section className={styles.optionsList}>
              {current?.options.map((option) => {
                const selected = currentAnswer === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    className={
                      selected
                        ? `${styles.option} ${styles.optionSelected}`
                        : styles.option
                    }
                    onClick={() => handleSelectOption(option.id)}
                  >
                    <div
                      className={
                        selected
                          ? `${styles.optionIndex} ${styles.optionIndexSelected}`
                          : styles.optionIndex
                      }
                    >
                      {option.id}
                    </div>
                    <span className={styles.optionLabel}>{option.label}</span>
                  </button>
                );
              })}
            </section>

            {submitError && (
              <p
                style={{
                  color: '#b91c1c',
                  fontSize: 14,
                  marginBottom: 16,
                }}
              >
                {submitError}
              </p>
            )}

            <footer className={styles.navButtons}>
              <button
                type="button"
                className={`${styles.navButton} ${
                  currentIndex === 0 ? styles.navButtonDisabled : ''
                }`}
                onClick={handlePrev}
                disabled={currentIndex === 0 || submitting}
              >
                Anterior
              </button>

              <button
                type="button"
                className={`${styles.navButton} ${
                  !currentAnswer ? styles.navButtonDisabled : styles.navButtonPrimary
                }`}
                onClick={handleNextOrSubmit}
                disabled={!currentAnswer || submitting}
              >
                {isLastQuestion
                  ? submitting
                    ? 'Enviando...'
                    : 'Enviar respostas'
                  : 'Próxima questão'}
              </button>
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}
    