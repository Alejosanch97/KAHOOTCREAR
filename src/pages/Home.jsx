import React, { useState, useEffect, useRef } from "react";
import "../Styles/kahoot.css"; 

const API_URL = 'https://script.google.com/macros/s/AKfycbygUCMU1nsht22zE3cYBjF2gjJg_mwAL5DLu513Q0ODGJ7FsNc8zuBb3YGcj1XJ4ERR/exec'; 

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

    const fetchAvailableModules = async () => {
        setStep("LOADING_QUIZ");
        try {
            const resp = await fetch(API_URL);
            const allData = await resp.json();
            const uniqueIDs = [...new Set(allData.map(item => item.ID_Formulario || item.id_formulario))];
            setAvailableModules(uniqueIDs.filter(id => id)); 
            setStep("MODULE_SELECT");
        } catch (err) {
            console.error("Error cargando módulos", err);
            setStep("LOGIN");
        }
    };

    const startQuiz = async (moduleId) => {
        setSelectedModule(moduleId);
        setStep("LOADING_QUIZ");
        try {
            const resp = await fetch(`${API_URL}?formId=${moduleId}`);
            const data = await resp.json();
            setQuestions(data);
            if (data.length > 0) {
                startQuestionCycle(0);
            }
        } catch (err) {
            console.error("Error cargando preguntas", err);
            setStep("MODULE_SELECT");
        }
    };

    const startQuestionCycle = (index) => {
        setCurrentIdx(index);
        setStep("SHOW_QUESTION");
        setTimer(10);
    };

    useEffect(() => {
        let interval = null;
        if (timer > 0) {
            interval = setInterval(() => setTimer(prev => prev - 1), 1000);
        } else {
            if (step === "SHOW_QUESTION") {
                setStep("SHOW_OPTIONS");
                setTimer(30);
                startTimeRef.current = Date.now();
            } else if (step === "SHOW_OPTIONS") {
                handleAnswer("SIN RESPUESTA");
            }
        }
        return () => clearInterval(interval);
    }, [timer, step]);

    const handleAnswer = (optionSelected) => {
        const timeUsed = startTimeRef.current ? Date.now() - startTimeRef.current : 0;
        
        const payload = {
            action: 'CREATE',
            data: {
                ID_Formulario: selectedModule,
                Usuario: user,
                ID_Pregunta: questions[currentIdx].ID_Pregunta,
                Respuesta_Usuario: optionSelected,
                Time_Used_Ms: timeUsed,
                Teacher_Key: "GENERAL"
            }
        };

        fetch(API_URL, {
            method: 'POST',
            mode: 'no-cors',
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

    const finishGame = async () => {
        setStep("LOADING_RESULTS");
        try {
            // Espera de 4.5 segundos para dar tiempo al motor de Google de escribir la última fila
            await new Promise(resolve => setTimeout(resolve, 4500));
            
            // LLAMADA CLAVE: type=RANKING para leer Respuestas_Enviadas y t=Date.now para evitar caché
            const resp = await fetch(`${API_URL}?type=RANKING&formId=${selectedModule}&t=${Date.now()}`);
            const allData = await resp.json();
            
            console.log("Datos de ranking recibidos:", allData);

            // Procesar los datos sumando los puntos por usuario
            const stats = allData.reduce((acc, curr) => {
                // Buscamos las llaves dinámicamente para evitar errores de mayúsculas/minúsculas
                const keys = Object.keys(curr);
                const userKey = keys.find(k => k.toLowerCase().trim() === 'usuario');
                const pointsKey = keys.find(k => k.toLowerCase().trim() === 'puntos_obtenidos');

                const name = curr[userKey];
                const pts = Number(curr[pointsKey] || 0);

                if (name) {
                    const cleanName = String(name).trim();
                    acc[cleanName] = (acc[cleanName] || 0) + pts;
                }
                return acc;
            }, {});

            // Convertir objeto en array, ordenar de mayor a menor y tomar los 3 primeros
            const sortedRanking = Object.entries(stats)
                .map(([name, pts]) => ({ name, pts }))
                .sort((a, b) => b.pts - a.pts)
                .slice(0, 3);

            setRanking(sortedRanking);
            setStep("END_GAME");
        } catch (err) { 
            console.error("Error al generar podio:", err);
            // Si hay error, intentamos mostrar lo que tengamos o volvemos al inicio
            setStep("MODULE_SELECT"); 
        }
    };

    return (
        <div className="kahoot-container">
            {step === "LOGIN" && (
                <div className="step-box">
                    <h1>KAHOOT CREAR 🎯</h1>
                    <input type="text" placeholder="Tu Nombre..." onChange={(e) => setUser(e.target.value)} />
                    <button disabled={!user} onClick={fetchAvailableModules}>INGRESAR</button>
                </div>
            )}

            {step === "MODULE_SELECT" && (
                <div className="step-box">
                    <h2>Hola {user}, selecciona un ID:</h2>
                    <div className="module-list">
                        {availableModules.map(id => (
                            <button key={id} className="mod-btn" onClick={() => startQuiz(id)}>📂 {id}</button>
                        ))}
                    </div>
                </div>
            )}

            {step === "LOADING_QUIZ" && (
                <div className="loader-full">
                    <div className="spinner"></div>
                    <h1>Sincronizando... ⏳</h1>
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
                        <div className="opt red" onClick={() => handleAnswer("A")}>
                            <span className="shape">{shapes.A}</span> {questions[currentIdx]?.Opción_A}
                        </div>
                        <div className="opt blue" onClick={() => handleAnswer("B")}>
                            <span className="shape">{shapes.B}</span> {questions[currentIdx]?.Opción_B}
                        </div>
                        <div className="opt yellow" onClick={() => handleAnswer("C")}>
                            <span className="shape">{shapes.C}</span> {questions[currentIdx]?.Opción_C}
                        </div>
                        <div className="opt green" onClick={() => handleAnswer("D")}>
                            <span className="shape">{shapes.D}</span> {questions[currentIdx]?.Opción_D}
                        </div>
                    </div>
                </div>
            )}

            {step === "LOADING_RESULTS" && (
                <div className="loader-full">
                    <div className="spinner"></div>
                    <h1>GENERANDO PODIO...</h1>
                    <p>Calculando resultados finales</p>
                </div>
            )}

            {step === "END_GAME" && (
                <div className="ranking-screen">
                    <h1>🏆 TOP 3 - {selectedModule}</h1>
                    <div className="podium-container">
                        {ranking.map((player, i) => (
                            <div key={i} className={`podium-item pos-${i+1}`}>
                                <div className="medal">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</div>
                                <strong>{player.name}</strong>
                                <p>{player.pts} pts</p>
                            </div>
                        ))}
                        {ranking.length === 0 && <p>No hay datos de participación aún.</p>}
                    </div>
                    <button className="restart-btn" onClick={() => window.location.reload()}>SALIR</button>
                </div>
            )}
        </div>
    );
};