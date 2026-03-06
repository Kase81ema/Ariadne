"""
Ariadne Editorial Studio - AI Agents Module
Uses Claude Sonnet 4.5 via emergentintegrations for text generation.
"""
import os
import uuid
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / '.env')

from emergentintegrations.llm.chat import LlmChat, UserMessage

EMERGENT_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

AGENT_DEFINITIONS = [
    {"agent_id": "planner", "name": "Planner editoriale", "description": "Crea piano editoriale e distribuisce i post nel calendario rispettando regole e conflitti.", "active": True, "always_on": True},
    {"agent_id": "writer_linkedin_company", "name": "Writer LinkedIn (azienda)", "description": "Scrive testi per la pagina aziendale LinkedIn.", "active": True, "always_on": False},
    {"agent_id": "writer_linkedin_personal", "name": "Writer LinkedIn (soci)", "description": "Adatta il contenuto per il tono personale del singolo socio.", "active": True, "always_on": False},
    {"agent_id": "writer_instagram", "name": "Writer Instagram", "description": "Scrive caption testo, sintetico, con CTA e hashtag coerenti.", "active": True, "always_on": False},
    {"agent_id": "image_cropper", "name": "Ritaglia immagini", "description": "Crea formati quadrato, verticale e orizzontale pronti per i canali social.", "active": False, "always_on": False},
    {"agent_id": "image_enhancer", "name": "Migliora immagine", "description": "Applica ottimizzazioni leggere a contrasto, nitidezza e compressione.", "active": False, "always_on": False},
    {"agent_id": "deep_research", "name": "Deep Research", "description": "Integra riferimenti generali e confronti soft senza citare dati non verificati.", "active": False, "always_on": False},
    {"agent_id": "compliance_icf", "name": "Compliance ICF", "description": "Controlla linguaggio, claim, promesse e segnala rischi con proposte alternative.", "active": True, "always_on": False},
    {"agent_id": "quality_reviewer", "name": "Revisore qualita", "description": "Rimuove banalita, riduce ripetizioni, migliora ritmo e chiarezza.", "active": False, "always_on": False},
    {"agent_id": "grammar_editor", "name": "Editor grammatica e stile", "description": "Verifica italiano, maiuscole, punteggiatura, coerenza.", "active": False, "always_on": False},
    {"agent_id": "hashtag_curator", "name": "Hashtag Curator", "description": "Suggerisce fino a 5 hashtag coerenti e non generici.", "active": False, "always_on": False},
    {"agent_id": "formatter_export", "name": "Formatter Export", "description": "Normalizza output per CSV/JSON e copy pack.", "active": True, "always_on": True},
]

BASE_SYSTEM = """Sei un copywriter esperto per Ariadne, una scuola di coaching creativo-esperienziale in Italia.

REGOLE INVIOLABILI:
- Lingua: italiano corretto.
- Maiuscole solo secondo grammatica italiana (inizio frase, nomi propri, sigle, titoli). Niente maiuscole decorative.
- NON inventare informazioni (date, luogo, prezzi, docenti, accreditamenti). Se manca un dato critico, scrivi [DATO MANCANTE: descrizione].
- Niente emoji salvo indicazione esplicita.
- Hashtag massimo 5, solo pertinenti.
- Solo testo: non generare immagini ne prompt per immagini.
- Compliance: non formulare claim impropri o promesse non verificabili. Evita formulazioni che confliggano con linee guida ICF.
- Tono: professionale ma caldo, autentico, mai banale. Stile Ariadne: elegante, creativo, esperienziale.
"""


async def run_agent(agent_id: str, context: dict, repository_context: str = "") -> str:
    """Run a specific agent with the given context."""
    system_messages = {
        "planner": BASE_SYSTEM + "\nSei il planner editoriale. Il tuo compito e creare un piano di pubblicazione con date e orari, rispettando le regole di pianificazione fornite. Evita sovrapposizioni tra profili e mantieni le distanze minime. Rispondi in formato strutturato.",
        "writer_linkedin_company": BASE_SYSTEM + "\nScrivi post per la pagina LinkedIn aziendale di Ariadne. Tono istituzionale ma non freddo. Lunghezza standard: max 1300 caratteri. Versione breve: max 600 caratteri. Includi CTA e link quando appropriato.",
        "writer_linkedin_personal": BASE_SYSTEM + f"\nScrivi come se fossi il socio indicato. Usa il suo stile personale (fornito nel contesto). Prima persona. Tono autentico, personale, non promozionale. Max 1300 caratteri standard, 600 breve. Profilo stile: {context.get('style_guide', 'professionale e diretto')}",
        "writer_instagram": BASE_SYSTEM + "\nScrivi caption Instagram per Ariadne. Sintetico, coinvolgente. Max 900 caratteri standard, 400 breve. CTA finale. Hashtag coerenti (max 5). No emoji salvo indicazione.",
        "deep_research": BASE_SYSTEM + "\nArricchisci il contenuto con riferimenti generali e confronti soft. NON citare dati specifici non verificati. Se usi dati, includi la fonte. Proponi formulazione prudente.",
        "compliance_icf": BASE_SYSTEM + "\nControlla il testo per compliance ICF. Segnala: claim impropri, promesse non verificabili, formulazioni che possano confliggere con linee guida ICF (es. garantire risultati, diagnosi, sostituzione terapia). Per ogni problema, proponi versione alternativa.",
        "quality_reviewer": BASE_SYSTEM + "\nMigliora il testo: rimuovi banalita, riduci ripetizioni, migliora ritmo e chiarezza. Mantieni lo stile Ariadne. Non cambiare il significato.",
        "grammar_editor": BASE_SYSTEM + "\nCorreggi: italiano, maiuscole, punteggiatura, coerenza. Segnala errori trovati e versione corretta.",
        "hashtag_curator": BASE_SYSTEM + "\nSuggerisci fino a 5 hashtag pertinenti e non generici per il post. Devono essere rilevanti per il coaching, la formazione esperienziale e il pubblico target.",
        "formatter_export": "Normalizza il seguente testo per l'export. Restituisci solo il testo finale pulito, pronto per la pubblicazione.",
    }

    system_msg = system_messages.get(agent_id, BASE_SYSTEM)
    if repository_context:
        system_msg += f"\n\nCONTESTO REPOSITORY ARIADNE:\n{repository_context}"

    user_text = _build_user_message(agent_id, context)

    try:
        chat = LlmChat(
            api_key=EMERGENT_KEY,
            session_id=f"ariadne-{agent_id}-{uuid.uuid4().hex[:8]}",
            system_message=system_msg
        ).with_model("anthropic", "claude-sonnet-4-5-20250929")

        response = await chat.send_message(UserMessage(text=user_text))
        return response
    except Exception as e:
        return f"[ERRORE AGENTE {agent_id}]: {str(e)}"


def _build_user_message(agent_id: str, context: dict) -> str:
    """Build the user message for a specific agent."""
    parts = []

    if context.get("campaign_title"):
        parts.append(f"Campagna: {context['campaign_title']}")
    if context.get("campaign_type"):
        parts.append(f"Tipo: {context['campaign_type']}")
    if context.get("course_title"):
        parts.append(f"Corso/Evento: {context['course_title']}")
    if context.get("course_description"):
        parts.append(f"Descrizione: {context['course_description']}")
    if context.get("course_dates"):
        parts.append(f"Date: {context['course_dates']}")
    if context.get("trainers"):
        parts.append(f"Trainer: {', '.join(context['trainers'])}")
    if context.get("location"):
        parts.append(f"Luogo: {context['location']}")
    if context.get("price"):
        parts.append(f"Prezzo: {context['price']}")
    if context.get("link"):
        parts.append(f"Link: {context['link']}")
    if context.get("intention"):
        parts.append(f"Intenzione del post: {context['intention']}")
    if context.get("platform"):
        parts.append(f"Piattaforma: {context['platform']}")
    if context.get("profile_name"):
        parts.append(f"Profilo: {context['profile_name']}")
    if context.get("existing_content"):
        parts.append(f"\nContenuto esistente da migliorare:\n{context['existing_content']}")
    if context.get("editorial_topic"):
        parts.append(f"Tema editoriale: {context['editorial_topic']}")
    if context.get("use_emoji"):
        parts.append("NOTA: Puoi usare emoji in questo post.")

    if agent_id == "planner":
        if context.get("rules"):
            parts.append(f"\nRegole di pianificazione: {context['rules']}")
        if context.get("period_start") and context.get("period_end"):
            parts.append(f"Periodo: {context['period_start']} - {context['period_end']}")
        if context.get("posts_per_profile"):
            parts.append(f"Post per profilo: {context['posts_per_profile']}")
        if context.get("mix_intentions"):
            parts.append(f"Mix intenzioni: {context['mix_intentions']}")
        parts.append("\nGenera un piano con date, orari e intenzioni per ogni post. Formato JSON array: [{\"date\": \"YYYY-MM-DD\", \"time\": \"HH:MM\", \"profile_id\": \"...\", \"intention\": \"...\"}]")

    return "\n".join(parts) if parts else "Genera un post per Ariadne."


async def generate_post_text(platform: str, intention: str, context: dict, active_agents: list, repository_context: str = "") -> dict:
    """Generate post text through the agent pipeline."""
    result = {"content": "", "content_short": "", "hashtags": [], "quality_issues": [], "agents_used": []}

    # Determine writer agent
    if platform == "linkedin_company":
        writer_id = "writer_linkedin_company"
    elif platform == "linkedin_personal":
        writer_id = "writer_linkedin_personal"
    elif platform == "instagram":
        writer_id = "writer_instagram"
    else:
        writer_id = "writer_linkedin_company"

    context["intention"] = intention
    context["platform"] = platform

    # Step 1: Deep research (if active)
    if "deep_research" in active_agents:
        research = await run_agent("deep_research", context, repository_context)
        context["research_notes"] = research
        result["agents_used"].append("deep_research")

    # Step 2: Generate main content
    if writer_id in active_agents or True:
        content = await run_agent(writer_id, context, repository_context)
        result["content"] = content
        result["agents_used"].append(writer_id)

    # Step 3: Generate short version
    short_context = {**context, "existing_content": content, "intention": f"Versione BREVE di: {intention}"}
    short_content = await run_agent(writer_id, short_context, repository_context)
    result["content_short"] = short_content

    # Step 4: Quality review (if active)
    if "quality_reviewer" in active_agents:
        reviewed = await run_agent("quality_reviewer", {**context, "existing_content": result["content"]}, repository_context)
        result["content"] = reviewed
        result["agents_used"].append("quality_reviewer")

    # Step 5: Grammar check (if active)
    if "grammar_editor" in active_agents:
        edited = await run_agent("grammar_editor", {**context, "existing_content": result["content"]}, repository_context)
        result["content"] = edited
        result["agents_used"].append("grammar_editor")

    # Step 6: Compliance check (if active)
    if "compliance_icf" in active_agents:
        compliance = await run_agent("compliance_icf", {**context, "existing_content": result["content"]}, repository_context)
        if "[RISCHIO]" in compliance or "[PROBLEMA]" in compliance:
            result["quality_issues"].append({"type": "compliance", "detail": compliance})
        result["agents_used"].append("compliance_icf")

    # Step 7: Hashtag curation (if active)
    if "hashtag_curator" in active_agents:
        hashtags_text = await run_agent("hashtag_curator", {**context, "existing_content": result["content"]}, repository_context)
        hashtags = [h.strip().lstrip('#') for h in hashtags_text.split() if h.startswith('#')][:5]
        if not hashtags:
            hashtags = [h.strip() for h in hashtags_text.split(',')][:5]
        result["hashtags"] = hashtags
        result["agents_used"].append("hashtag_curator")

    return result


async def generate_plan(context: dict, repository_context: str = "") -> str:
    """Generate an editorial plan."""
    return await run_agent("planner", context, repository_context)
