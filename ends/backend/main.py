import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split


ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = ROOT / "models" / "sentiment_model.joblib"
DATA_PATH = ROOT / "data" / "comentarios.csv"
FRONTEND_PATH = Path(__file__).resolve().parents[1] / "frontend"
FEEDBACK_PATH = ROOT / "ends" / "feedback.jsonl"
MODEL_VERSION = "0.1.0"

model = joblib.load(MODEL_PATH)


class PredictionInput(BaseModel):
    texto: str = Field(min_length=3, max_length=1000)


class FeedbackInput(BaseModel):
    texto: str = Field(min_length=3, max_length=1000)
    sentimento_modelo: str = Field(min_length=1, max_length=80)
    avaliacao_usuario: str | None = Field(default=None, pattern="^(positivo|negativo)$")
    reacao: str | None = Field(default=None, pattern="^(like|dislike|relato)$")
    relato: str | None = Field(default=None, max_length=500)


def get_metrics() -> dict[str, float]:
    data = pd.read_csv(DATA_PATH)
    _, texts_test, _, labels_test = train_test_split(
        data["texto"].tolist(),
        data["sentimento"].tolist(),
        test_size=0.2,
        random_state=42,
    )
    predictions = model.predict(texts_test)
    return {
        "acuracia": round(float(accuracy_score(labels_test, predictions)), 4),
        "f1_macro": round(float(f1_score(labels_test, predictions, average="macro")), 4),
        "amostras_teste": len(texts_test),
        "classes": [str(label) for label in model.classes_],
    }


try:
    metrics = get_metrics()
except Exception:
    metrics = {
        "acuracia": 0.0,
        "f1_macro": 0.0,
        "amostras_teste": 0,
        "classes": [str(label) for label in model.classes_],
    }

app = FastAPI(title="OQSente?", version=MODEL_VERSION)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health() -> dict[str, str]:
    return {"status": "ok", "versao_modelo": MODEL_VERSION}


@app.post("/api/predict")
def predict(payload: PredictionInput) -> dict:
    probabilities = model.predict_proba([payload.texto])[0]
    index = int(probabilities.argmax())
    sentiment = str(model.classes_[index])
    confidence = round(float(probabilities[index]), 4)
    is_positive = sentiment.lower() in {"positivo", "positive"}
    polarity = "Positivo" if is_positive else "Negativo"
    uncertain = confidence < 0.55

    return {
        "texto": payload.texto,
        "sentimento": sentiment,
        "polaridade": "Indefinido" if uncertain else polarity,
        "confianca": confidence,
        "incerto": uncertain,
        "versao_modelo": MODEL_VERSION,
        "metricas": metrics,
    }


@app.post("/api/feedback")
def feedback(payload: FeedbackInput) -> dict[str, str]:
    FEEDBACK_PATH.parent.mkdir(parents=True, exist_ok=True)
    record = {
        **payload.model_dump(),
        "criado_em": datetime.now(timezone.utc).isoformat(),
        "versao_modelo": MODEL_VERSION,
    }
    with FEEDBACK_PATH.open("a", encoding="utf-8") as feedback_file:
        feedback_file.write(json.dumps(record, ensure_ascii=False) + "\n")
    return {"status": "recebido"}


@app.exception_handler(Exception)
async def unexpected_error(_, exc: Exception):
    if isinstance(exc, HTTPException):
        raise exc
    raise HTTPException(status_code=503, detail="Não foi possível consultar o modelo.") from exc


app.mount("/", StaticFiles(directory=FRONTEND_PATH, html=True), name="frontend")