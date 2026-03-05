"""
LearnUP NLP Service - spaCy + modelo sueco KBLab
API para POS tagging, validação gramatical e auto-categorização.
"""
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

# Carregar modelo ao iniciar
nlp = None


def load_model():
    global nlp
    try:
        import spacy
        # Tenta KBLab primeiro, depois modelo oficial spaCy
        for model_name in ["sv_core_news_sm", "sv_pipeline"]:
            try:
                nlp = spacy.load(model_name)
                print(f"✅ Modelo sueco {model_name} carregado")
                return
            except Exception:
                continue
        nlp = spacy.blank("sv")
        print("⚠️ Usando spacy blank (sem POS). Instale: pip install sv_core_news_sm")
    except Exception as e:
        print(f"⚠️ Falha ao carregar modelo: {e}")
        nlp = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_model()
    yield
    # cleanup se necessário


app = FastAPI(title="LearnUP NLP", lifespan=lifespan)

# Mapeamento spaCy UPOS -> categorias internas LearnUP
POSSESSIVES = {"min", "mitt", "mina", "din", "ditt", "dina", "hans", "hennes", "vår", "er", "deras"}
VERB_NAME_LEMMAS = {"heta"}  # heter -> heta
VERB_COPULA_FORMS = {"är", "var", "bli", "blir"}


def spacy_pos_to_learnup(token) -> str:
    """Converte POS do spaCy para categoria LearnUP."""
    text = token.text.lower()
    pos = token.pos_
    lemma = token.lemma_.lower() if token.lemma_ else ""

    # Possessivos suecos (spaCy marca como DET)
    if text in POSSESSIVES:
        return "POSS"

    # heter -> VERB_NAME
    if lemma in VERB_NAME_LEMMAS:
        return "VERB_NAME"

    # är, var, bli -> VERB_COPULA
    if text in VERB_COPULA_FORMS or lemma in VERB_COPULA_FORMS:
        return "VERB_COPULA"

    # Mapeamento direto UPOS -> LearnUP
    mapping = {
        "PRON": "PRON",
        "NOUN": "NOUN",
        "PROPN": "PROPN",
        "VERB": "VERB_INTRANS",
        "ADJ": "ADJ",
        "ADV": "ADV",
        "INTJ": "INTJ",
        "DET": "DET",
        "CCONJ": "CONJ",
        "SCONJ": "CONJ",
        "ADP": "ADP",
        "NUM": "NUM",
        "PART": "PART",
    }
    return mapping.get(pos, "X")


# --- Schemas ---
class PosRequest(BaseModel):
    text: str


class PosToken(BaseModel):
    text: str
    pos: str
    tag: str
    lemma: str
    learnup_category: str


class PosResponse(BaseModel):
    tokens: list[PosToken]
    sentence: str


class ValidateRequest(BaseModel):
    sentence: str


class ValidateResponse(BaseModel):
    valid: bool
    reason: str | None = None
    tokens: list[PosToken] | None = None


class CategorizeRequest(BaseModel):
    word: str


class CategorizeResponse(BaseModel):
    word: str
    category: str
    lemma: str | None = None


# --- Endpoints ---
@app.get("/health")
def health():
    """Health check."""
    return {"ok": True, "model_loaded": nlp is not None}


@app.post("/pos", response_model=PosResponse)
def get_pos(req: PosRequest):
    """Extrai POS tags de uma frase em sueco."""
    if not nlp:
        raise HTTPException(503, "Modelo NLP não carregado")
    doc = nlp(req.text.strip())
    tokens = [
        PosToken(
            text=t.text,
            pos=t.pos_,
            tag=t.tag_,
            lemma=t.lemma_,
            learnup_category=spacy_pos_to_learnup(t),
        )
        for t in doc
    ]
    return PosResponse(tokens=tokens, sentence=req.text.strip())


@app.post("/validate", response_model=ValidateResponse)
def validate_sentence(req: ValidateRequest):
    """
    Valida frase em sueco usando spaCy.
    Verifica: possessivo+verbo, heter+nome próprio, verbo sem sujeito.
    """
    if not nlp:
        raise HTTPException(503, "Modelo NLP não carregado")

    sentence = req.sentence.strip()
    doc = nlp(sentence)
    tokens = [
        PosToken(
            text=t.text,
            pos=t.pos_,
            tag=t.tag_,
            lemma=t.lemma_,
            learnup_category=spacy_pos_to_learnup(t),
        )
        for t in doc
    ]
    categories = [t.learnup_category for t in tokens]

    # Pares proibidos (subset dos usados no LearnUP)
    invalid_pairs = [
        ("POSS", "VERB_INTRANS"),
        ("POSS", "VERB_NAME"),
        ("POSS", "VERB_COPULA"),
        ("POSS", "ADV"),
        ("POSS", "ADJ"),
        ("POSS", "CONJ"),
        ("POSS", "DET"),
        ("POSS", "INTJ"),
        ("ADJ", "VERB_INTRANS"),
        ("ADJ", "VERB_NAME"),
        ("CONJ", "VERB_INTRANS"),
        ("CONJ", "VERB_NAME"),
        ("NOUN", "NOUN"),
        ("NOUN", "POSS"),
        ("INTJ", "VERB_INTRANS"),
        ("INTJ", "VERB_NAME"),
        ("INTJ", "VERB_COPULA"),
    ]

    for i in range(len(categories) - 1):
        pair = (categories[i], categories[i + 1])
        if pair in invalid_pairs:
            return ValidateResponse(
                valid=False,
                reason=f"Combinação proibida: {pair[0]} + {pair[1]} ({tokens[i].text} {tokens[i+1].text})",
                tokens=tokens,
            )

    # heter exige PROPN como complemento
    for i, t in enumerate(tokens):
        if t.learnup_category == "VERB_NAME" and i < len(tokens) - 1:
            comp = tokens[i + 1].learnup_category
            if comp != "PROPN":
                return ValidateResponse(
                    valid=False,
                    reason=f"'heter' exige nome próprio, não {comp} ({tokens[i+1].text})",
                    tokens=tokens,
                )

    # Verbo sem sujeito (frase com 1 token ou verbo no início)
    has_verb = any(
        c in ("VERB_INTRANS", "VERB_NAME", "VERB_COPULA") for c in categories
    )
    has_subject = any(
        tok.dep_ in ("nsubj", "nsubj:pass")
        for tok in doc
    ) or any(c in ("PRON", "PROPN", "NOUN", "DET") for c in categories[:2])

    if has_verb and len(categories) == 1:
        return ValidateResponse(
            valid=False,
            reason="Verbo exige sujeito",
            tokens=tokens,
        )

    if has_verb and categories[0] in ("VERB_INTRANS", "VERB_NAME", "VERB_COPULA"):
        # Verbo no início: ok para perguntas (Mår du? Är du bra?)
        if len(categories) >= 2 and categories[1] in ("PRON", "DET"):
            pass  # Pergunta válida
        elif len(categories) < 2:
            return ValidateResponse(
                valid=False,
                reason="Verbo exige sujeito",
                tokens=tokens,
            )

    return ValidateResponse(valid=True, tokens=tokens)


@app.post("/categorize", response_model=CategorizeResponse)
def categorize_word(req: CategorizeRequest):
    """Auto-categoriza uma palavra usando spaCy."""
    if not nlp:
        raise HTTPException(503, "Modelo NLP não carregado")

    word = req.word.strip()
    if not word:
        raise HTTPException(400, "Palavra vazia")

    doc = nlp(word)
    if len(doc) == 0:
        return CategorizeResponse(word=word, category="NOUN", lemma=None)

    token = doc[0]
    category = spacy_pos_to_learnup(token)
    return CategorizeResponse(
        word=word,
        category=category,
        lemma=token.lemma_,
    )
