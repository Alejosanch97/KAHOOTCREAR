import React, { useState, useEffect, useRef } from "react";
import "../Styles/kahoot.css"; 

const API_URL = "https://script.google.com/macros/s/AKfycbxaCshH28XqDAnv3KGCms5toYxEjjsBfjVsdkEPNJYj1SC2ZAeebQPNGbi-FTtoJU39/exec";

export const Home = () => {

    const [step, setStep] = useState("LOGIN"); 
    const [user, setUser] = useState("");
    const [availableModules, setAvailableModules] = useState([]);
    const [selectedModule, setSelectedModule] = useState("");
    const [questions, setQuestions] = useState([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [timer, setTimer] = useState(0);
    const [ranking, setRanking] = useState([]);

    const startTimeRef = useRef(null);

    const shapes = {
        A: "🔥",
        B: "💎",
        C: "⚡",
        D: "🚀"
    };

    /* ===============================
       OBTENER MÓDULOS
    =============================== */
    const fetchAvailableModules = async () => {
        setStep("LOADING_QUIZ");
        try {
            const resp = await fetch(`${API_URL}?t=${Date.now()}`);
            const data = await resp.json();

            const uniqueIDs = [...new Set(data.map(item => item.ID_Formulario))];
            setAvailableModules(uniqueIDs.filter(Boolean));

            setStep("MODULE_SELECT");
        } catch (err) {
            console.error(err);
            setStep("LOGIN");
        }
    };

    /* ===============================
       INICIAR QUIZ
    =============================== */
    const startQuiz = async (moduleId) => {
        setSelectedModule(moduleId);
        setStep("LOADING_QUIZ");

        try {
            const resp = await fetch(
                `${API_URL}?fId=${encodeURIComponent(moduleId)}&t=${Date.now()}`
            );

            const data = await resp.json();
            setQuestions(data);

            if (data.length > 0) {
                startQuestionCycle(0);
            } else {
                setStep("MODULE_SELECT");
            }

        } catch (err) {
            console.error(err);
            setStep("MODULE_SELECT");
        }
    };

    const startQuestionCycle = (index) => {
        setCurrentIdx(index);
        setStep("SHOW_QUESTION");
        setTimer(5);
    };

    /* ===============================
       TEMPORIZADOR
    =============================== */
    useEffect(() => {
        let interval = null;

        if (timer > 0) {
            interval = setInterval(() => setTimer(prev => prev - 1), 1000);
        } else {
            if (step === "SHOW_QUESTION") {
                setStep("SHOW_OPTIONS");
                setTimer(15);
                startTimeRef.current = Date.now();
            } else if (step === "SHOW_OPTIONS") {
                handleAnswer("SIN_RESPUESTA");
            }
        }

        return () => clearInterval(interval);

    }, [timer, step]);

    /* ===============================
       ENVIAR RESPUESTA
    =============================== */
    const handleAnswer = async (optionSelected) => {

        const currentQuestion = questions[currentIdx];

        const payload = {
            data: {
                ID_Formulario: selectedModule,
                Usuario: user,
                ID_Pregunta: currentQuestion.ID_Pregunta,
                Respuesta_Usuario: optionSelected,
                Teacher_Key: "GENERAL"
            }
        };

        fetch(API_URL, {
            method: "POST",
            mode: "no-cors",
            body: JSON.stringify(payload)
        });

        handleNextOrFinish();
    };

    const handleNextOrFinish = () => {
        if (currentIdx + 1 < questions.length) {
            startQuestionCycle(currentIdx + 1);
        } else {
            finishGame();
        }
    };

    /* ===============================
       RANKING CORREGIDO
    =============================== */
    const refreshRanking = async () => {
        try {
            const resp = await fetch(
                `${API_URL}?get_mode=SHOW_RANKING&fId=${encodeURIComponent(selectedModule)}&t=${Date.now()}`
            );

            const data = await resp.json();

            const rankingArray = data.map(item => ({
                name: item.Usuario,
                pts: Number(item.Puntos_Totales) || 0
            }));

            setRanking(rankingArray);

        } catch (err) {
            console.error("Error ranking", err);
        }
    };

    const finishGame = async () => {
        setStep("LOADING_RESULTS");

        setTimeout(async () => {
            await refreshRanking();
            setStep("END_GAME");
        }, 3000);
    };

    /* ===============================
       RETURN ORIGINAL (NO MODIFICADO)
    =============================== */

    return (
        <div className="kahoot-container">

            {step === "LOGIN" && (
                <div className="step-box">
                    <h1>KAHOOT CREAR 🎯</h1>
                    <input
                        type="text"
                        placeholder="Escribe tu nombre..."
                        value={user}
                        onChange={(e) => setUser(e.target.value)}
                    />
                    <button disabled={!user} onClick={fetchAvailableModules}>
                        ENTRAR
                    </button>
                </div>
            )}

            {step === "MODULE_SELECT" && (
                <div className="step-box">
                    <h2>Bienvenido {user}</h2>
                    <p>Selecciona un formulario:</p>
                    <div className="module-list">
                        {availableModules.map(id => (
                            <button key={id} className="mod-btn" onClick={() => startQuiz(id)}>
                                📝 {id}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {step === "LOADING_QUIZ" && (
                <div className="loader-full">
                    <div className="spinner"></div>
                    <h1>Cargando...</h1>
                </div>
            )}

            {step === "SHOW_QUESTION" && (
                <div className="question-only">
                    <div className="timer-badge">{timer}</div>
                    <h1>{questions[currentIdx]?.Enunciado}</h1>
                </div>
            )}

            {step === "SHOW_OPTIONS" && (
                <div className="game-screen">
                    <div className="game-header">
                        <div className="timer-small">{timer}</div>
                        <h2>{questions[currentIdx]?.Enunciado}</h2>
                    </div>

                    <div className="options-grid">
                        <button className="opt red" onClick={() => handleAnswer("A")}>
                            <span className="shape">{shapes.A}</span> {questions[currentIdx]?.Opción_A}
                        </button>
                        <button className="opt blue" onClick={() => handleAnswer("B")}>
                            <span className="shape">{shapes.B}</span> {questions[currentIdx]?.Opción_B}
                        </button>
                        <button className="opt yellow" onClick={() => handleAnswer("C")}>
                            <span className="shape">{shapes.C}</span> {questions[currentIdx]?.Opción_C}
                        </button>
                        <button className="opt green" onClick={() => handleAnswer("D")}>
                            <span className="shape">{shapes.D}</span> {questions[currentIdx]?.Opción_D}
                        </button>
                    </div>
                </div>
            )}

            {step === "LOADING_RESULTS" && (
                <div className="loader-full">
                    <div className="spinner"></div>
                    <h1>GENERANDO PODIO...</h1>
                </div>
            )}

            {step === "END_GAME" && (
                <div className="ranking-screen">
                    <h1>🏆 PODIO FINAL - {selectedModule}</h1>

                    <div className="podium-container">
                        {ranking.map((player, i) => (
                            <div key={i} className={`podium-item pos-${i+1}`}>
                                <div className="medal">
                                    {i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}
                                </div>
                                <strong>{player.name}</strong>
                                <p>{player.pts} pts</p>
                            </div>
                        ))}
                        {ranking.length === 0 && <p>Cargando resultados...</p>}
                    </div>

                    <div className="actions">
                        <button className="update-btn" onClick={refreshRanking}>
                            ACTUALIZAR
                        </button>
                        <button className="restart-btn" onClick={() => window.location.reload()}>
                            SALIR
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
};