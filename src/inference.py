import joblib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = ROOT / "models" / "sentiment_model.joblib"

def main():
    modelo = joblib.load(MODEL_PATH)
    
    textos = [
        "O produto é excelente, superou minhas expectativas!",
        "Não gostei do atendimento, muito ruim.",
        "A entrega foi rápida e eficiente.",
        "O produto chegou com defeito, estou insatisfeito.",
        "O serviço foi ótimo, recomendo a todos.",
        "Não gostei do produto, não recomendo.",
        "A experiência de compra foi satisfatória.",
        "O atendimento ao cliente foi péssimo, não volto a comprar.",
        "Não gostei, eu amei!",
        "O produto é terrivelmente bom, e o atendimento é assustador de fantástico!",
        "Fico assustado como as pessoas vão para um lugar como esse... e não compram!"]

    previsoes = modelo.predict(textos)

    for texto, previsao in zip(textos, previsoes):
        print(f"Texto: {texto} => Previsão: {previsao}")
        print("--"*40)

if __name__ == "__main__":
    main()