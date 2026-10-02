"""
Pydantic Schemas for AI Multi-Agent Decision Panel.
Compatible with Instructor and Pydantic v2.
"""

from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class AgentPersona(BaseModel):
    id: str = Field(..., description="Unique identifier for the agent (e.g. 'cto')")
    name: str = Field(..., description="Display name of the agent (e.g. 'Giám đốc Công nghệ (CTO)')")
    role: str = Field(..., description="Professional title and domain")
    perspective: str = Field(..., description="Key criteria focus and primary business objective")
    avatar_color: Optional[str] = Field("#3b82f6", description="Color theme for UI")


class PairwiseJudgment(BaseModel):
    element_a: str = Field(..., description="First element being compared")
    element_b: str = Field(..., description="Second element being compared")
    saaty_value: float = Field(..., description="Saaty scale value from 1/9 to 9.0")
    rationale: str = Field(..., description="Professional justification and evidence for this comparison")


class AgentAssessment(BaseModel):
    agent_id: str
    agent_name: str
    judgments: List[PairwiseJudgment]
    matrix: List[List[float]]
    summary: str


class DebateMessage(BaseModel):
    speaker_id: str
    speaker_name: str
    round: int
    target_pair: str
    argument: str
    counter_to: Optional[str] = None


class DeliberationRequest(BaseModel):
    goal: str
    scope: str = Field("criteria", description="'criteria' or specific criterion name for alternatives")
    elements: List[str]
    personas: Optional[List[AgentPersona]] = None
    num_rounds: Optional[int] = Field(2, ge=1, le=4)
    api_key: Optional[str] = None
    model_provider: Optional[str] = Field("auto", description="'openai', 'gemini', or 'auto' (fallback simulator)")


class DeliberationResponse(BaseModel):
    goal: str
    scope: str
    elements: List[str]
    personas: List[AgentPersona]
    dialogue: List[DebateMessage]
    individual_assessments: List[AgentAssessment]
    consensus_matrix: List[List[float]]
    consensus_metric: Dict[str, Any]
    evaluation: Dict[str, Any]
    guardrails_passed: bool
    guardrail_warnings: List[str] = []
