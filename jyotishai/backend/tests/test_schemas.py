"""Unit tests for Pydantic v2 models in schemas.py."""
import datetime
import uuid

import pytest
from pydantic import ValidationError

from app.models.schemas import (
    AngleDetails,
    ChartComputeRequest,
    ChartResponse,
    DetailedReport,
    HouseDetails,
    PlanetDetails,
    RawAstrologyData,
    SessionAssessment,
    TokenGenerateRequest,
    TokenResponse,
    Timeframes,
    HustleTab,
    MoneyTab,
    GrowthTab,
    LoveTab,
)


# ---------------------------------------------------------------------------
# Sub-model tests
# ---------------------------------------------------------------------------

def test_planet_details_valid():
    p = PlanetDetails(sign="Taurus", degree=21.4, house=9, is_retrograde=False)
    assert p.sign == "Taurus"
    assert p.degree == 21.4
    assert p.house == 9
    assert p.is_retrograde is False


def test_planet_details_invalid_degree():
    with pytest.raises(ValidationError):
        PlanetDetails(sign="Taurus", degree="not-a-float", house=9, is_retrograde=False)


def test_house_details_valid():
    h = HouseDetails(sign="Leo", degree=11.2)
    assert h.sign == "Leo"
    assert h.degree == 11.2


def test_house_details_invalid():
    with pytest.raises(ValidationError):
        HouseDetails(sign="Leo", degree="bad")


def test_angle_details_valid():
    a = AngleDetails(sign="Capricorn", degree=5.0)
    assert a.sign == "Capricorn"


def test_raw_astrology_data_valid():
    data = RawAstrologyData(
        planets={"sun": PlanetDetails(sign="Aries", degree=10.0, house=1, is_retrograde=False)},
        houses={"1": HouseDetails(sign="Aries", degree=0.0)},
        angles={"ascendant": AngleDetails(sign="Aries", degree=0.0)},
    )
    assert "sun" in data.planets
    assert "1" in data.houses
    assert "ascendant" in data.angles


def test_detailed_report_valid():
    tf = Timeframes(past="past", present="present", future="future")
    hustle = HustleTab(your_natural_style="style", the_biggest_block="block", how_to_fix_it="fix")
    money = MoneyTab(your_financial_mindset="mindset", the_money_trap="trap", cash_advice="advice")
    growth = GrowthTab(public_mask="mask", private_reality="reality", mental_reset="reset")
    love = LoveTab(what_you_actually_crave="crave", the_romantic_fear="fear", heart_advice="advice")
    d = DetailedReport(
        age=25,
        timeframes=tf,
        hustle_tab=hustle,
        money_tab=money,
        growth_tab=growth,
        love_tab=love
    )
    assert d.hustle_tab.your_natural_style == "style"
    assert d.money_tab.the_money_trap == "trap"


def test_session_assessment_valid():
    s = SessionAssessment(
        session_summary="summary",
        key_insights=["insight1"],
        action_items=["action1"],
    )
    assert s.session_summary == "summary"
    assert len(s.key_insights) == 1


def test_session_assessment_invalid_insights_type():
    with pytest.raises(ValidationError):
        SessionAssessment(
            session_summary="summary",
            key_insights="not-a-list",
            action_items=[],
        )


# ---------------------------------------------------------------------------
# Top-level request / response model tests
# ---------------------------------------------------------------------------

def test_chart_compute_request_valid():
    req = ChartComputeRequest(
        full_name="Jane Doe",
        birth_date=datetime.date(1990, 5, 15),
        birth_time=datetime.time(8, 30),
        birth_city="London, UK",
        gender="female",
        user_id=uuid.uuid4(),
    )
    assert req.full_name == "Jane Doe"


def test_chart_compute_request_invalid_uuid():
    with pytest.raises(ValidationError):
        ChartComputeRequest(
            full_name="Jane Doe",
            birth_date=datetime.date(1990, 5, 15),
            birth_time=datetime.time(8, 30),
            birth_city="London, UK",
            gender="female",
            user_id="not-a-uuid",
        )


def test_chart_response_valid():
    tf = Timeframes(past="past", present="present", future="future")
    hustle = HustleTab(your_natural_style="style", the_biggest_block="block", how_to_fix_it="fix")
    money = MoneyTab(your_financial_mindset="mindset", the_money_trap="trap", cash_advice="advice")
    growth = GrowthTab(public_mask="mask", private_reality="reality", mental_reset="reset")
    love = LoveTab(what_you_actually_crave="crave", the_romantic_fear="fear", heart_advice="advice")
    resp = ChartResponse(
        chart_id=uuid.uuid4(),
        full_name="Jane Doe",
        raw_astrology_data=RawAstrologyData(
            planets={"sun": PlanetDetails(sign="Aries", degree=10.0, house=1, is_retrograde=False)},
            houses={"1": HouseDetails(sign="Aries", degree=0.0)},
            angles={"ascendant": AngleDetails(sign="Aries", degree=0.0)},
        ),
        detailed_report=DetailedReport(
            age=25,
            timeframes=tf,
            hustle_tab=hustle,
            money_tab=money,
            growth_tab=growth,
            love_tab=love
        ),
        message="ok",
    )
    assert resp.message == "ok"


def test_token_generate_request_valid():
    req = TokenGenerateRequest(chart_id=uuid.uuid4())
    assert req.chart_id is not None


def test_token_generate_request_invalid():
    with pytest.raises(ValidationError):
        TokenGenerateRequest(chart_id="bad-uuid")


def test_token_response_valid():
    resp = TokenResponse(
        token="abc123",
        room_name="room-1",
        session_id=uuid.uuid4(),
        livekit_url="wss://example.livekit.cloud",
    )
    assert resp.token == "abc123"
