import os
from typing import Dict, TypedDict
from langchain_google_genai import ChatGoogleGenerativeAI  # type: ignore
from langchain_core.prompts import PromptTemplate  # type: ignore
from langgraph.graph import StateGraph, END  # type: ignore

class NoteState(TypedDict):
    risk_score: float
    biomarkers: Dict[str, float]
    test_type: str
    soap_note: str

def format_prompt_node(state: NoteState) -> NoteState:
    risk_score = state["risk_score"]
    biomarkers = state["biomarkers"]
    test_type = state["test_type"]
    
    cpp = round(biomarkers.get("CPP", 0), 2)
    f0 = round(biomarkers.get("F0", 0), 2)
    risk_level = "High" if risk_score > 0.7 else "Moderate" if risk_score > 0.4 else "Low"
    test_name = "60-Second Guided Battery (Aggregated)" if test_type == "aggregated" else "Sustained 'Ah' Phonation"

    template = """You are an expert clinical AI assistant for a Remote Patient Monitoring system (NeuralEcho).
Your job is to format the provided objective data and deterministic risk score into a professional medical SOAP note.
CRITICAL CONSTRAINT: The diagnosis is provided by a deterministic XGBoost model. Do not alter the risk score or provide your own diagnosis. Just synthesize the provided metrics into a clear clinical summary.

Provided Metrics:
- Clinical Test Performed: {test_name}
- Cepstral Peak Prominence (CPP): {cpp} dB
- Fundamental Frequency (F0): {f0} Hz
- ML-Derived Phonatory Motor Risk Score: {risk_score} (Risk Level: {risk_level})

Context:
- Risk Score 0.00 - 0.40 (Low): Normal phonation.
- Risk Score 0.41 - 0.70 (Moderate): Early vocal micro-tremors detected.
- Risk Score 0.71 - 1.00 (High): High acoustic deviation consistent with Hypokinetic Dysarthria (Parkinson's Disease indicator).

Format the response clearly with SUBJECTIVE, OBJECTIVE, ASSESSMENT, and PLAN sections.
For Subjective, state that the patient provided a remote 60-second vocal battery with no active complaints.
For Assessment, explicitly mention if the risk score indicates potential Hypokinetic Dysarthria/Parkinson's markers based on the context provided.
For Plan, recommend continuous longitudinal monitoring and alert investigator if risk exceeds 0.75.
"""
    prompt = PromptTemplate(
        input_variables=["test_name", "cpp", "f0", "risk_score", "risk_level"],
        template=template
    )

    formatted_prompt = prompt.format(
        test_name=test_name,
        cpp=cpp,
        f0=f0,
        risk_score=round(risk_score, 2),
        risk_level=risk_level
    )
    
    return {"soap_note": formatted_prompt}

def call_llm_node(state: NoteState) -> NoteState:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key or api_key == "your_api_key_here":
        mocked = f"[MOCKED NOTE - NO API KEY]\n**SUBJECTIVE:**\nRemote battery submitted.\n\n**OBJECTIVE:**\n- CPP: {state['biomarkers'].get('CPP',0):.2f}\n- F0: {state['biomarkers'].get('F0',0):.2f}\n- Risk: {state['risk_score']}\n\n**ASSESSMENT:**\nModel generated risk.\n\n**PLAN:**\nMonitor."
        return {"soap_note": mocked}
        
    formatted_prompt = state["soap_note"]
    
    try:
        llm = ChatGoogleGenerativeAI(
            model="gemini-3.6-flash",
            temperature=0.2,
            google_api_key=api_key
        )
        result = llm.invoke(formatted_prompt)
        content = result.content
        if isinstance(content, list):
            content = "".join([block.get("text", "") if isinstance(block, dict) else str(block) for block in content])
        return {"soap_note": str(content)}
    except Exception as e:
        print(f"Gemini API Error: {e}")
        return {"soap_note": f"[ERROR CALLING GEMINI: {e}]\nFallback to mocked note."}

# Build LangGraph
workflow = StateGraph(NoteState)
workflow.add_node("format_prompt", format_prompt_node)
workflow.add_node("call_llm", call_llm_node)

workflow.set_entry_point("format_prompt")
workflow.add_edge("format_prompt", "call_llm")
workflow.add_edge("call_llm", END)

app_graph = workflow.compile()

def generate_soap_note(risk_score: float, biomarkers: Dict[str, float], test_type: str = "sustained_ah") -> str:
    """
    LangGraph pipeline for generating SOAP notes using Gemini.
    """
    initial_state = {
        "risk_score": risk_score,
        "biomarkers": biomarkers,
        "test_type": test_type,
        "soap_note": ""
    }
    
    result = app_graph.invoke(initial_state)
    return result["soap_note"]
