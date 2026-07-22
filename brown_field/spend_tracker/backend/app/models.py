from pydantic import BaseModel, Field


class EntryCreate(BaseModel):
    amount: float = Field(..., ge=-10.0)
    category: str = Field(..., min_length=1)
    description: str | None = None
    spent_on: str = Field(..., pattern=r"^\d{4}-\d{2}-\d{2}$")


class EntryResponse(BaseModel):
    id: int
    amount: float
    category: str
    description: str | None
    spent_on: str
