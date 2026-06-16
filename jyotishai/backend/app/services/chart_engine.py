import asyncio
import json
import logging
import os
from datetime import datetime, date, time as time_type


import httpx
import pytz
import swisseph as swe

from app.config import settings
from app.services.geocoding import geocode_city

logger = logging.getLogger(__name__)

# Point pyswisseph to the downloaded ephemeris files
EPHE_PATH = os.path.join(os.path.dirname(__file__), "../../ephe")
swe.set_ephe_path(EPHE_PATH)

# Western Tropical planets — 10 bodies, no Rahu/Ketu/Vedic nodes
PLANETS = {
    "sun":     swe.SUN,
    "moon":    swe.MOON,
    "mercury": swe.MERCURY,
    "venus":   swe.VENUS,
    "mars":    swe.MARS,
    "jupiter": swe.JUPITER,
    "saturn":  swe.SATURN,
    "uranus":  swe.URANUS,
    "neptune": swe.NEPTUNE,
    "pluto":   swe.PLUTO,
}

SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
]

# Safe fallback used when OpenRouter is unavailable
# Safe fallback used when OpenRouter is unavailable
_FALLBACK_REPORT = {
    "age": None,
    "timeframes": None,
    "hustle_tab": {
        "your_natural_style": "You have a deep inner drive to create things from scratch. However, this urge is constantly in a race with your impatience, making you want to see results immediately rather than enjoying the process.",
        "the_biggest_block": "You get stuck waiting for everything to be absolutely perfect. This means you end up delaying sharing your creations with the world because you fear they are not ready yet.",
        "how_to_fix_it": "Just put one simple thing out there today, even if it feels unfinished. Done is more valuable than perfect when you're just starting out.",
        "identity_cards": [
            { "symbol": "⚡", "tagline": "Your soul work", "word": "Entrepreneur" },
            { "symbol": "🎯", "tagline": "Your work style", "word": "Architect" },
            { "symbol": "🔥", "tagline": "Your drive", "word": "Builder" }
        ],
        "past_transit": {
            "planet": "Saturn",
            "cycle_name": "Saturn in Aquarius",
            "description": "Over the last couple of years, Saturn pushed you to take your work more seriously and build real, lasting structures. The pressure felt heavy, but it forced you to figure out what actually matters versus what you were just doing out of habit."
        },
        "current_transit": {
            "planet": "Jupiter",
            "cycle_name": "Jupiter Expanding Your Sector",
            "description": "Right now, there's a genuine window of growth opening up in how you approach your ambitions. Things you've been quietly working on are ready to get bigger — the conditions are more supportive than they've felt in a while."
        },
        "future_transit": {
            "planet": "Mars",
            "cycle_name": "Mars Direct in Your Career Zone",
            "description": "In the next few months, your energy and drive are going to feel sharper and more focused. A Mars direct shift is coming that will clear the fog and make it easier to push forward on the things you've been sitting on."
        }
    },
    "money_tab": {
        "your_financial_mindset": "You value security and safety deeply, yet you also appreciate nice things and comfort, creating a tug-of-war between wanting to save and wanting to enjoy quality.",
        "the_money_trap": "You tend to overthink and freeze when it comes to spending even small amounts of money on yourself, worrying that you are wasting resources.",
        "cash_advice": "Learn to view spending as a way to support your own growth and trust that investing in yourself will pay off in the long run.",
        "identity_cards": [
            { "symbol": "💎", "tagline": "Your money type", "word": "Investor" },
            { "symbol": "🏦", "tagline": "Your wealth style", "word": "Accumulator" },
            { "symbol": "📈", "tagline": "Your risk profile", "word": "Strategist" }
        ],
        "past_transit": {
            "planet": "Venus",
            "cycle_name": "Venus Retrograde Lessons",
            "description": "The past cycle brought up a lot of questions about what you actually value versus what you just thought you were supposed to want. That unsettled feeling around money and spending? It was asking you to recalibrate your real priorities."
        },
        "current_transit": {
            "planet": "Mercury",
            "cycle_name": "Mercury in Your Money House",
            "description": "Your mind is sharper than usual right now when it comes to financial decisions. This is a good week to review where your money is actually going and make one clear, conscious choice about how you want that to change."
        },
        "future_transit": {
            "planet": "Jupiter",
            "cycle_name": "Jupiter Moving into Your Wealth Zone",
            "description": "A major expansion cycle is heading your way in the next several months. Jupiter's shift will open up new opportunities to grow your resources — but only if you've laid the groundwork by getting honest about your money habits now."
        }
    },
    "growth_tab": {
        "public_mask": "To the outside world, you appear calm, steady, and totally in control of your life.",
        "private_reality": "In private, you criticize yourself harshly for small mistakes and easily absorb the heavy or tense energy of the people around you.",
        "mental_reset": "Protect your peace by setting clear boundaries and saying no to things that drain your spirit. Start by identifying one commitment this week that no longer serves you.",
        "identity_cards": [
            { "symbol": "🌙", "tagline": "Your inner nature", "word": "Observer" },
            { "symbol": "🧠", "tagline": "Your mind type", "word": "Analyst" },
            { "symbol": "🎭", "tagline": "Your shadow self", "word": "Perfectionist" }
        ],
        "past_transit": {
            "planet": "Pluto",
            "cycle_name": "Pluto's Long Transformation",
            "description": "The last few years have quietly dismantled some old parts of how you see yourself. Pluto's slow work has been pulling up the roots of beliefs and patterns you inherited rather than chose — that process is now mostly done."
        },
        "current_transit": {
            "planet": "Saturn",
            "cycle_name": "Saturn Testing Your Foundation",
            "description": "Right now Saturn is asking you to take your inner life as seriously as your outer responsibilities. The heavy feeling you may be carrying is Saturn doing its job — it's pointing at exactly where your next real growth is."
        },
        "future_transit": {
            "planet": "Uranus",
            "cycle_name": "Uranus Bringing a Breakthrough",
            "description": "Something unexpected but liberating is coming your way in the next few months. Uranus is set to shake up a part of your life that has felt too rigid or stuck — the disruption will feel strange at first, but it clears space for something much more you."
        }
    },
    "love_tab": {
        "what_you_actually_crave": "You crave deep, honest connection and have zero tolerance for surface-level conversations or playing games with feelings.",
        "the_romantic_fear": "You worry that letting someone get too close to you will crowd your space and destroy your personal freedom.",
        "heart_advice": "Talk openly about your need for quiet time and space rather than pulling away or disappearing when things get close.",
        "identity_cards": [
            { "symbol": "✦", "tagline": "Your love style", "word": "Soulseeker" },
            { "symbol": "🌊", "tagline": "Your depth", "word": "Intense" },
            { "symbol": "🔐", "tagline": "Your attachment", "word": "Selective" }
        ],
        "past_transit": {
            "planet": "Venus",
            "cycle_name": "Venus Retrograde in Your Heart Zone",
            "description": "The past cycle stirred up old relationship patterns — people from the past may have resurfaced, or familiar emotional loops played out in new people. That wasn't random; it was giving you a chance to finally see the pattern clearly."
        },
        "current_transit": {
            "planet": "Mars",
            "cycle_name": "Mars Activating Desire",
            "description": "Right now your emotional intensity is running high and your desire for real connection is stronger than usual. Mars is amplifying what you feel, which means it's an especially honest time to notice what you actually want versus what you're settling for."
        },
        "future_transit": {
            "planet": "Jupiter",
            "cycle_name": "Jupiter Opening the Heart",
            "description": "A genuinely optimistic shift is coming for your love life in the next few months. Jupiter's expansion is going to make it easier to attract and recognize the kind of connection you actually want — but you have to be willing to be seen first."
        }
    }
}



def _sign_from_longitude(lon: float) -> dict:
    """Return sign name and degree-within-sign for an ecliptic longitude."""
    sign_index = int(lon / 30) % 12
    degree_in_sign = lon % 30
    return {
        "sign": SIGNS[sign_index],
        "degree": round(degree_in_sign, 4),
    }


def _assign_house(planet_lon: float, cusps: tuple) -> int:
    """
    Return the house number (1–12) for a planet longitude given Placidus cusps.
    cusps is a 12-element tuple of cusp longitudes (0-indexed, cusp[0] = house 1).
    """
    for i in range(12):
        start = cusps[i] % 360
        end = cusps[(i + 1) % 12] % 360
        lon = planet_lon % 360
        if start <= end:
            if start <= lon < end:
                return i + 1
        else:  # cusp wraps around 0°
            if lon >= start or lon < end:
                return i + 1
    return 1  # fallback


def compute_raw_western_data(
    birth_date: date,
    birth_time: time_type,
    city: str,
) -> dict:
    """
    Compute a complete Western Tropical birth chart.

    Returns a dict shaped like RawAstrologyData plus a '_meta' key containing
    latitude, longitude, and timezone for the router to extract.

    Raises:
        ValueError: if the city cannot be geocoded
        Exception:  if pyswisseph calculation fails
    """
    # 1. Geocode city
    lat, lon, timezone = geocode_city(city)

    # 2. Convert local birth time → UTC Julian Day
    tz = pytz.timezone(timezone)
    local_dt = datetime.combine(birth_date, birth_time)
    local_dt = tz.localize(local_dt)
    utc_dt = local_dt.astimezone(pytz.utc)

    jd = swe.julday(
        utc_dt.year, utc_dt.month, utc_dt.day,
        utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0,
    )

    # 3. Force tropical mode — SIDM_FAGAN_BRADLEY with FLG_SPEED only (no FLG_SIDEREAL)
    swe.set_sid_mode(swe.SIDM_FAGAN_BRADLEY, 0, 0)
    planet_flags = swe.FLG_SPEED

    # 4. Compute Placidus house cusps and angles
    house_cusps, ascmc = swe.houses(jd, lat, lon, b'P')
    # house_cusps: tuple of 12 cusp longitudes (house 1 … house 12)
    # ascmc[0] = Ascendant, ascmc[1] = MC
 
    # 5. Compute planetary positions
    planets_out = {}
    for name, planet_id in PLANETS.items():
        pos, _ = swe.calc_ut(jd, planet_id, planet_flags)
        planet_lon = pos[0] % 360
        speed = pos[3]
        sign_data = _sign_from_longitude(planet_lon)
        planets_out[name] = {
            "sign": sign_data["sign"],
            "degree": sign_data["degree"],
            "house": _assign_house(planet_lon, house_cusps),
            "is_retrograde": speed < 0,
        }

    # 6. Build houses dict keyed "1" through "12"
    houses_out = {}
    for i, cusp_lon in enumerate(house_cusps):
        sign_data = _sign_from_longitude(cusp_lon % 360)
        houses_out[str(i + 1)] = {
            "sign": sign_data["sign"],
            "degree": sign_data["degree"],
        }

    # 7. Build angles dict
    asc_data = _sign_from_longitude(ascmc[0] % 360)
    mc_data = _sign_from_longitude(ascmc[1] % 360)
    angles_out = {
        "ascendant": {"sign": asc_data["sign"], "degree": asc_data["degree"]},
        "midheaven": {"sign": mc_data["sign"], "degree": mc_data["degree"]},
    }

    return {
        "planets": planets_out,
        "houses": houses_out,
        "angles": angles_out,
        "_meta": {
            "latitude": lat,
            "longitude": lon,
            "timezone": timezone,
            "birth_date": birth_date.isoformat(),
        },
    }


async def _call_openrouter(model: str, messages: list, response_format: dict = None, max_tokens: int = 4000) -> str:
    # Cap at 4096 — free-tier models reject anything higher
    max_tokens = min(max_tokens, 4096)
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
    }
    if response_format:
        payload["response_format"] = response_format

    for attempt in range(3):
        try:
            async with httpx.AsyncClient(timeout=90.0) as client:
                response = await client.post(
                    "https://openrouter.ai/api/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.openrouter_api_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://jyotishai.app",
                        "X-Title": "JyotishAI",
                    },
                    json=payload,
                )
            if response.status_code == 200:
                resp_json = response.json()
                # OpenRouter can return 200 with an error body (no choices)
                if "error" in resp_json and "choices" not in resp_json:
                    err_msg = resp_json["error"].get("message", str(resp_json["error"]))
                    logger.warning(f"Model {model} returned error in body on attempt {attempt+1}: {err_msg}")
                    await asyncio.sleep(2.0)
                    continue
                content = resp_json["choices"][0]["message"].get("content")
                if content is None:
                    # Some reasoning models put output in reasoning field
                    content = resp_json["choices"][0]["message"].get("reasoning")
                if content is None:
                    # Last resort: check reasoning_details array
                    reasoning_details = resp_json["choices"][0]["message"].get("reasoning_details", [])
                    texts = [rd.get("text", "") for rd in reasoning_details if rd.get("text")]
                    if texts:
                        content = "\n".join(texts)
                if content is None:
                    logger.warning(f"Model {model} returned null content on attempt {attempt+1}. Full response: {resp_json}")
                    await asyncio.sleep(2.0)
                    continue
                logger.info(f"Model {model} responded ({len(content)} chars). Preview: {content[:120]!r}")
                return content
            elif response.status_code == 429:
                logger.warning(f"Rate limited (429) for model {model}. Retrying in 3.0s... (Attempt {attempt+1}/3)")
                await asyncio.sleep(3.0)
            else:
                logger.error(f"OpenRouter non-200 for {model}: status={response.status_code} body={response.text[:500]}")
                raise Exception(f"OpenRouter call failed: status={response.status_code} body={response.text[:300]}")
        except httpx.HTTPError as he:
            logger.warning(f"HTTP error for model {model}: {repr(he)}. Retrying in 3.0s... (Attempt {attempt+1}/3)")
            await asyncio.sleep(3.0)

    raise Exception(f"OpenRouter call failed for model {model} after 3 attempts")





def _extract_json(text: str) -> dict:
    """Extract and parse a JSON object from text, handling markdown blocks and cleanups."""
    text = text.strip()
    # Handle thinking tags if they weren't stripped
    if "<think>" in text and "</think>" in text:
        text = text.split("</think>")[-1].strip()
    
    # If wrapped in markdown blocks, extract content inside
    if "```" in text:
        parts = text.split("```")
        for part in parts:
            part_clean = part.strip()
            if part_clean.startswith("json"):
                part_clean = part_clean[4:].strip()
            if part_clean.startswith("{") and part_clean.endswith("}"):
                try:
                    return json.loads(part_clean)
                except Exception:
                    pass
    
    # Try direct load
    try:
        return json.loads(text)
    except Exception as e:
        # Find first '{' and last '}'
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start:end+1])
            except Exception:
                pass
        raise e


async def generate_human_report(raw_data: dict) -> dict:
    """
    Send raw chart data through a two-step pipeline using OpenRouter and return a structured report.
    """
    if not settings.openrouter_api_key:
        return _FALLBACK_REPORT

    # Strip internal _meta before sending to the model
    chart_payload = {k: v for k, v in raw_data.items() if k != "_meta"}
    current_date_str = datetime.now().strftime("%B %d, %Y")

    # Calculate age and timeline years before generating prompts
    birth_date_str = raw_data.get("_meta", {}).get("birth_date")
    age = None
    birth_year = None
    current_year = datetime.now().year
    
    if birth_date_str:
        try:
            if "T" in birth_date_str:
                birth_date_str = birth_date_str.split("T")[0]
            birth_date = datetime.strptime(birth_date_str, "%Y-%m-%d").date()
            today = datetime.now().date()
            age = today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))
            birth_year = birth_date.year
        except Exception as e:
            logger.warning(f"Failed to parse birth_date from meta: {e}")

    if age is not None:
        past_timeframe = f"Ages {age-5} to {age-1} ({birth_year + age - 5} – Early {current_year})"
        present_timeframe = f"Age {age} | Right Now"
        future_timeframe = f"Ages {age+1} to {age+5} ({current_year + 1} – {current_year + 5})"
    else:
        past_timeframe = "Last 5 years"
        present_timeframe = "Right now"
        future_timeframe = "Next 5 years"

    # --- EXAMPLES OF HOW YOU WANT THE OUTPUT TO LOOK (FILL THESE IN AS NEEDED) ---
    # Leave these empty/blank as requested. The LLM will be instructed to use them when writing the report.
    # You can fill these in yourself with text examples for love, personal, and professional (career).
    EXAMPLE_CAREER_PAST = """You have a mind that catches things others skip over. In a group, when something doesn't make sense, you're the first one to see it, but you often stay quiet because you've already figured out that pointing it out won't always go well. So you watch, you remember, and you wait. This is not a weakness. It's actually the same quality that makes certain kinds of people incredibly valuable once they find the right place.

Growing up, you got results not by working harder than everyone else, but by working more carefully. You re-read things. You double-checked. You noticed the small mistake that everyone else walked past. Most of the time, nobody noticed that you did this — the work just turned out better. That habit of quiet precision is still with you.

You have never liked being told how to do something when you already know a better way. Not out of ego — out of accuracy. When someone's method is simply wrong, it's hard for you to pretend it isn't. That tension between following instructions and knowing you could do it better has been present since the beginning.

Detail-oriented
Works best alone
Quiet problem-solver
Doesn't rush"""

    EXAMPLE_CAREER_PRESENT = """You are not built to work for someone else long-term — not because you're difficult, but because you're wired to build things that are entirely yours. You notice what's broken before anyone else does, you can see exactly how it should be fixed, and you can't fake commitment to something you don't believe in. That combination — seeing the gap, knowing the solution, and being physically unable to phone it in — is exactly what entrepreneurship requires. Most people can work within a system. You are the type who builds one."""

    EXAMPLE_CAREER_FUTURE = """Between now and age 24, your chart enters a window where the work you've been doing quietly starts getting noticed. Not because you changed — because the gap between what you're capable of and what you've been given to do becomes too obvious to ignore, by you and by others. An opportunity will come that feels too soon or too uncertain. It won't be. That's the one to take.

By your mid-twenties, the path starts to narrow — in a good way. You stop trying to figure out what you should do and start going deeper into the thing you're already good at. The people who matter will start to associate your name with a specific kind of quality. That reputation, once it forms, compounds fast.

Long term, your chart points toward work that is yours — something you built or shaped from the ground up. Not necessarily a business, but something with your fingerprints on it. Something that required your specific way of thinking to exist. That's the endgame your chart is building toward, and every careful, precise thing you do right now is a brick in it."""

    EXAMPLE_CAREER_PRESENT_VIBE = ""

    EXAMPLE_PERSONAL_PAST = """You feel things much more deeply than people think you do. On the outside, you can appear calm, put-together, even a little hard to read. But on the inside, you're processing everything — the tone someone used, the thing that was left unsaid, the shift in the room that nobody else seemed to catch. You've always been this way. Most people in your life don't know this version of you exists because you've never had a reason to show it.

You are the kind of person who gives people fewer chances than it looks like you do. You're warm and patient on the surface, but internally you make up your mind about people quite quickly — and once you've decided someone isn't trustworthy or worth your time, that decision is very hard to reverse. You don't hold grudges. You just quietly adjust how much of yourself you give.

You have a strong sense of right and wrong that you didn't pick up from rules — it came from inside. When something feels unfair or dishonest, it bothers you in a way that's hard to shake, even when it has nothing to do with you directly. This makes you someone people want on their side, but also someone who finds it genuinely hard to let things go."""

    EXAMPLE_PERSONAL_PRESENT = """Right now you're in a phase where you're figuring out who you actually are versus who you learned to be. Some habits, some ways of talking, some things you say yes to — they're not really yours. They came from fitting in, or keeping the peace, or not wanting to deal with what saying no would cost. You're starting to notice which is which, and it's making some parts of life feel less comfortable than they used to.

You're becoming more honest — not louder, not more aggressive, but more honest. You're getting better at saying what you actually think instead of the version you calculated would land best. This is new. Not everyone around you will like it. That's fine — the people worth keeping will respect it.

The version of you that exists right now is more capable than the opportunities you've been given so far. You know this. It's not arrogance — it's just accurate. You're in the part of the story where the gap between what you can do and what you're being asked to do is widest. That gap closes. Be patient without being passive."""

    EXAMPLE_PERSONAL_FUTURE = """By your late twenties, the version of you that exists will be noticeably more settled — not because life gets easier, but because you'll have stopped spending energy pretending things are fine when they're not, staying in situations you've outgrown, or waiting for permission to be who you already are. That constant background noise of managing yourself will get much quieter.

The circle of people around you will get smaller and better. Not because you become cold — because you get honest about what kind of connection actually feels good versus what you were tolerating. The friendships and relationships you have at 28 will feel completely different from the ones you have now. More real. Less effort. More you.

The core of who you are — the sharp, feeling, private, deeply loyal person underneath all the careful management — that part doesn't change. It just gets more room. And when it gets more room, the people around you feel it. You become someone people remember not for what you did but for what it felt like to be known by you."""

    EXAMPLE_PERSONAL_PRESENT_VIBE = ""

    EXAMPLE_LOVE_PAST = """Before anything else, you need to find someone interesting. Not good-looking, not successful — interesting. Someone who thinks in a way you haven't seen before, who says something that makes you pause, who makes a connection between two ideas you never linked. That spark is not optional for you — it's the thing that starts everything. Without it, nothing else matters how good it looks on paper.

But interesting alone isn't enough. You also need to feel completely safe. Not physically safe — emotionally safe. Safe enough to say the real thing, not the version you calculated would go over well. Safe enough to be in a bad mood without it becoming a problem. Safe enough to be fully known. That combination — someone who genuinely excites your mind AND makes you feel completely safe — is rare. You've always sensed this, which is why you've been careful in ways others have found confusing.

In the past, you've likely had one or the other. Someone exciting who kept you on edge, never fully comfortable. Or someone steady and safe who slowly felt like too little. The push and pull between those two experiences has taught you exactly what you don't want, which is getting you closer to knowing what you do."""

    EXAMPLE_LOVE_PRESENT = """You attract people who sense that there's more to you than what you're showing. There's something about you that reads as private-but-worth-knowing, and that pulls in a specific type of person — usually curious, a little intense, someone who finds most people easy to figure out and is drawn to someone they can't immediately read. That's not an accident. Your energy does that.

Right now, you are most attracted to people who are direct. Not aggressive — direct. People who say what they mean, don't play games, and are secure enough in themselves that they don't need you to perform anything for them. You're tired, on some level, of interactions where you have to guess what someone actually wants. When someone just says it plainly, you find that more attractive than almost anything else.

The biggest thing holding you back in love right now is that you won't show interest before you feel safe, but you won't feel safe until you know the interest is real — so sometimes the connection never starts, not because it wasn't there, but because you both waited. This isn't a flaw you need to fix. It's just something to notice. Sometimes the first move has to be yours."""

    EXAMPLE_LOVE_FUTURE = """The relationship that actually works for you will feel different from the first conversation. Not butterflies — clarity. A sense that you don't have to translate yourself for this person, that you can say the actual thing and they'll get it. You've had glimpses of that feeling in the past. When you feel it again, in a more complete form, you'll recognize it immediately because you'll feel less tired, not more, after spending time together.

The person your chart points toward is someone who is mentally alive, emotionally honest, and completely unbothered by your intensity. Not someone who handles you — someone who matches you. Someone who doesn't need you to be lighter or easier or less. When you find someone who makes your full self feel like enough — that's the one your chart has been building toward.

Between 23 and 25, what you're attracted to shifts slightly. You start valuing emotional groundedness over cleverness alone. Someone being funny and smart starts to matter less than someone being real and present. This isn't you settling — it's you getting more honest about what actually makes you feel good versus what impresses you. Those are not the same thing, and by 25 you'll know the difference completely."""

    EXAMPLE_LOVE_PRESENT_VIBE = ""
    # -----------------------------------------------------------------------------

    # Step 1: Interpretation call — compact schema to fit within 4096 token limit
    step1_system_prompt = """You are a wise, old local Indian astrologer (Panditji/Jyotishi) who has seen thousands of horoscopes over forty years. You speak with deep wisdom and fatherly authority. Your job is to extract the absolute truth from a birth chart — no sugarcoating, no vague modern generalities. You call things exactly as they are. You identify the real karmic challenges, the self-sabotaging patterns, and the hidden potentials. You write like a traditional wise elder who knows the user's destiny better than they do themselves."""

    step1_user_prompt = f"""Analyze this birth chart with complete truth and traditional Indian astrological insight:
{json.dumps(chart_payload, indent=2)}

Additional Context:
- Today's date: {current_date_str}
"""
    if age is not None:
        step1_user_prompt += f"- User's current age: {age} (born in {birth_year})\n"
        
    step1_user_prompt += """
Dig deep and identify:
1. The core karmic tension or conflict they struggle with (give a clear label like 'The Restless Soul' or 'The Wealthy merchant who is afraid of risk')
2. The exact behavioral pattern holding them back
3. The major hidden gift or strength in their chart
4. The honest truth about their work, ambition, and career path
5. The honest truth about their love life and relationships
6. The private, hidden truth about their inner world

Return ONLY this JSON object with zero markdown formatting or thinking tags outside the JSON:
{
  "core_identity": {
    "conflict_name": "A short vivid label for their core tension (e.g. 'The Fearful King')",
    "internal_experience": "2-3 sentences on what it actually feels like to be them on the inside every day.",
    "sabotage_pattern": "2-3 sentences on how they stand in their own way.",
    "hidden_gift": "2-3 sentences on the strength they possess but underuse."
  },
  "career_truth": "3-4 sentences of direct, honest truth about their work life and path.",
  "love_truth": "3-4 sentences of direct, honest truth about their relationship patterns.",
  "personal_truth": "3-4 sentences of direct, honest truth about who they are when completely alone."
}"""


    # Step 2: Report writing call
    step2_system_prompt = """You are writing a deeply personal astrology report. Your job is to tell the truth — clearly, specifically, and with traditional wisdom.

Your writing voice: a wise, old local Indian astrologer (Panditji) who speaks with deep authority, experience, and grandfatherly warmth. You say exactly what you see. You don't flatter them. You don't sugarcoat. You talk like a wise elder who has seen thousands of lives. Most importantly, you are direct and predict concrete future events (e.g., "you will become rich", "you will start a business", "you will marry late but happily").

THE UNBREAKABLE PRODUCTION RULES:
1. MINIMUM LENGTH — EACH FIELD MUST BE AT LEAST 2 FULL SENTENCES. Short, vague answers are not acceptable. Every field needs real, specific content.
2. NO GENERIC FILLER: Do not write things that could apply to anyone. Every sentence must feel like it was written specifically for this one person based on their chart data and synthesis.
3. TRUTH FIRST: Say the hard thing. Don't bury the real observation. Lead with what is actually true.
4. NO FAKE LIFE STORIES OR JOBS: Focus 100% on their internal habits, how they handle life, and how their mind operates. Do NOT invent specific real-world tasks, project names, deadlines, or job titles.
5. BANNED WORDS: Absolutely NO tech or corporate jargon. The words: 'app', 'server', 'code', 'framework', 'MVP', 'investor', 'pitch', 'job', and 'office' are strictly BANNED.
6. VERY SIMPLE VOCABULARY: Use short, plain words. Strictly FORBIDDEN: "resonance", "frequency", "trajectory", "vulnerable", "manifestation", "rhythm", "indicators", "fusion", "catalyst", "nurturing", "journey", "alignment". Use real words like "stuff", "mind", "gut feeling", "loop", "honest", "lock in".
7. NO ASTROLOGICAL JARGON IN DESCRIPTION FIELDS: Do not name-drop planets, signs, houses, or degrees in description fields. Translate everything into everyday human behavior.
8. CONCRETE FUTURE PREDICTIONS: Make specific, clear, and direct statements about what will happen in their future (e.g., "you will become rich", "you will travel far", "you will lead others"). Do not hide behind vague possibilities."""


    try:
        # Step 1: Get structured psychological and emotional interpretation
        step1_parsed = None
        step1_errors = []
        step1_models = [
            "google/gemma-4-31b-it:free",
            "openai/gpt-oss-120b:free"
        ]
        for model_id in step1_models:
            for attempt in range(3):
                try:
                    raw_content = await _call_openrouter(
                        model=model_id,
                        messages=[
                            {"role": "system", "content": step1_system_prompt},
                            {"role": "user", "content": step1_user_prompt}
                        ],
                        max_tokens=4000
                    )
                    if raw_content is None:
                        raise ValueError("Model returned empty content (None)")
                    if "<think>" in raw_content and "</think>" in raw_content:
                        raw_content = raw_content.split("</think>")[-1].strip()
                    
                    # Validate: just needs to be parseable JSON with at least one key
                    parsed_data = _extract_json(raw_content)
                    if not isinstance(parsed_data, dict) or len(parsed_data) == 0:
                        raise ValueError("Step 1 returned empty JSON object")
                    logger.info(f"Step 1 succeeded. Keys: {list(parsed_data.keys())[:5]}")
                    
                    step1_parsed = parsed_data
                    break  # Succeeded and validated!
                except Exception as e:
                    logger.warning(f"Step 1 attempt {attempt+1} failed with model {model_id}: {e}.")
                    if attempt == 2:
                        step1_errors.append(f"{model_id}: {e}")
                    await asyncio.sleep(1.5)
            if step1_parsed:
                break

        if not step1_parsed:
            raise Exception(f"All models failed for Step 1. Errors: {'; '.join(step1_errors)}")

        # Step 2: Report writing call
        step2_user_prompt = f"""Here are my birth details and synthesis:
Chart: {json.dumps(chart_payload, indent=2)}
Synthesis: {json.dumps(step1_parsed, indent=2)}
Today's date is {current_date_str}.
The user is currently {age} years old (born in {birth_year}).
The calculated timeframes are:
- Past: {past_timeframe}
- Present: {present_timeframe}
- Future: {future_timeframe}

Write a highly personalized Astrology report. Instead of a single, general layout, write the insights for exactly 4 distinct tabs: "hustle_tab", "money_tab", "growth_tab", and "love_tab".

You must follow the following unbreakable rules:
1. NO FAKE LIFE EVENTS OR JOBS: Do NOT invent specific real-world tasks, project names, deadlines, family events, or job titles. Focus 100% on internal habits, how they handle stress, and how their mind operates.
2. BANNED WORDS: Absolutely NO tech or corporate jargon (BANNED words: "app", "server", "code", "framework", "MVP", "investor", "pitch", "framework", "job", "office").
3. ABSOLUTELY NO ASTROLOGICAL JARGON IN DESCRIPTION FIELDS: Do not mention planet names, houses, zodiac signs, degrees, or transits. Translate the data completely into everyday human behavior.
4. TONE: Use incredibly basic, friendly, plain language, like a wise old Indian astrologer talking to the user. Speak with simple, powerful wisdom and authority.
5. CONCRETE PREDICTIONS: Say future events directly (e.g., "you will become rich", "you will start a business", "you will marry late but happily").

Output format:
Return ONLY a valid JSON object matching this structure. Do NOT wrap it in markdown code blocks (no ```json). Do NOT add any text outside the JSON.

IMPORTANT QUALITY BAR: Every single field below must be at least 2 full sentences of specific, honest, personalized content. If a field is only one sentence or sounds generic, you have failed. Lead with the truth. Be specific. Be direct.

For the transit objects (past_transit, current_transit, future_transit): Use real planetary knowledge. Name the actual planet that is most relevant to that tab and timeframe based on the chart. Write the cycle_name as something descriptive and real (e.g. 'Saturn Entering Aries', 'Jupiter Expanding Your 10th House Energy'). The description must be in plain conversational English — NO astrological jargon — just tell them what this transit is actually making them feel or do right now.

For "identity_cards": Generate exactly 3 identity cards that reflect their specific cosmic nature/energy for this tab. Each card must have:
- "symbol": An emoji symbol (e.g. ⚡, 🎯, 🔥, 💎, 👑, 🌊, 🚪, 🌾)
- "tagline": A short 2-3 word label describing this aspect of them (e.g., "Your soul work", "Your money type", "Your inner nature", "Your depth")
- "word": A single, powerful noun representing their cosmic archetype or personality in this domain (e.g. "Merchant", "Builder", "King", "Sage", "Worker", "Disruptor", "Seeker"). Keep them aligned with a traditional wise astrologer's view.

{{
  "hustle_tab": {{
    "your_natural_style": "MINIMUM 2 SENTENCES. Describe how their mind actually works when they are trying to build or create something — the specific inner drive that pushes them and the specific tension that works against it. Make it feel like you've been watching them work.",
    "the_biggest_block": "MINIMUM 2 SENTENCES. Name the exact psychological pattern that stalls them — not just 'perfectionism' but HOW it shows up, WHEN it kicks in, and what it actually costs them in practical terms.",
    "how_to_fix_it": "MINIMUM 2 SENTENCES. Give honest, specific, actionable advice. Not a platitude — something they can actually think about and do differently starting today.",
    "identity_cards": [
      {{
        "symbol": "Emoji symbol",
        "tagline": "Short label",
        "word": "Single powerful archetype noun"
      }},
      {{
        "symbol": "Emoji symbol",
        "tagline": "Short label",
        "word": "Single powerful archetype noun"
      }},
      {{
        "symbol": "Emoji symbol",
        "tagline": "Short label",
        "word": "Single powerful archetype noun"
      }}
    ],
    "past_transit": {{
      "planet": "Name of the most relevant planet for their career past cycle (e.g. Saturn, Jupiter, Mars)",
      "cycle_name": "A short, vivid name for the cycle that just ended (e.g. 'Saturn Restructuring Your Drive')",
      "description": "2-3 plain sentences on what this past planetary cycle was pushing them to deal with in their work and ambition. No jargon. Speak to them directly."
    }},
    "current_transit": {{
      "planet": "Name of the most relevant planet active right now for their career",
      "cycle_name": "A short vivid name for what is happening right now (e.g. 'Mercury Sharpening Your Focus')",
      "description": "2-3 plain sentences on exactly what this current transit is doing to their work life and mindset this week. Be specific to their chart. No jargon."
    }},
    "future_transit": {{
      "planet": "Name of the planet arriving soon that is most relevant to their career",
      "cycle_name": "A short vivid name for the coming shift (e.g. 'Mars Unlocking Your Momentum')",
      "description": "2-3 plain sentences on what this upcoming planetary shift will open up for them in the next few months. Make it feel exciting but honest. No jargon."
    }}
  }},
  "money_tab": {{
    "your_financial_mindset": "MINIMUM 2 SENTENCES. Describe their actual relationship with money — the specific push-pull they feel, what money represents to them emotionally, and how that drives their behavior in ways they might not be fully aware of.",
    "the_money_trap": "MINIMUM 2 SENTENCES. Name the specific money habit or thinking pattern that costs them — not generic advice but the exact loop they get stuck in and why it happens.",
    "cash_advice": "MINIMUM 2 SENTENCES. Give them one clear, honest perspective shift on money that actually addresses their specific pattern. Make it feel like advice from someone who knows them, not a finance book.",
    "identity_cards": [
      {{
        "symbol": "Emoji symbol",
        "tagline": "Short label",
        "word": "Single powerful archetype noun"
      }},
      {{
        "symbol": "Emoji symbol",
        "tagline": "Short label",
        "word": "Single powerful archetype noun"
      }},
      {{
        "symbol": "Emoji symbol",
        "tagline": "Short label",
        "word": "Single powerful archetype noun"
      }}
    ],
    "past_transit": {{
      "planet": "Most relevant planet for their money past cycle",
      "cycle_name": "Short vivid name for the past money cycle",
      "description": "2-3 plain sentences on what the past transit was doing to their relationship with money and resources. Direct and specific."
    }},
    "current_transit": {{
      "planet": "Most relevant planet active now for their finances",
      "cycle_name": "Short vivid name for the current money transit",
      "description": "2-3 plain sentences on what this transit is doing to their financial thinking and decisions right now this week."
    }},
    "future_transit": {{
      "planet": "Most relevant planet coming soon for their wealth",
      "cycle_name": "Short vivid name for the coming money shift",
      "description": "2-3 plain sentences on what the coming transit will open up or shift in their financial life over the next few months."
    }}
  }},
  "growth_tab": {{
    "public_mask": "MINIMUM 2 SENTENCES. Describe precisely what people see when they look at this person — the version they project — and why they project it. Be specific about what the mask actually is.",
    "private_reality": "MINIMUM 2 SENTENCES. Describe who this person actually is in private — what they feel, how they talk to themselves, what they struggle with that no one else knows. This should feel uncomfortably accurate.",
    "mental_reset": "MINIMUM 2 SENTENCES. Give them one honest, specific mindset shift or habit that would actually change things for them. Not a vague mantra — something concrete they can use.",
    "identity_cards": [
      {{
        "symbol": "Emoji symbol",
        "tagline": "Short label",
        "word": "Single powerful archetype noun"
      }},
      {{
        "symbol": "Emoji symbol",
        "tagline": "Short label",
        "word": "Single powerful archetype noun"
      }},
      {{
        "symbol": "Emoji symbol",
        "tagline": "Short label",
        "word": "Single powerful archetype noun"
      }}
    ],
    "past_transit": {{
      "planet": "Most relevant planet for their inner growth past cycle",
      "cycle_name": "Short vivid name for the past growth cycle",
      "description": "2-3 plain sentences on what the past transit was dismantling or rebuilding in their inner life and self-perception."
    }},
    "current_transit": {{
      "planet": "Most relevant planet active now for their inner growth",
      "cycle_name": "Short vivid name for the current growth transit",
      "description": "2-3 plain sentences on what this current transit is pushing them to face or shift in how they see themselves right now."
    }},
    "future_transit": {{
      "planet": "Most relevant planet coming soon for their personal evolution",
      "cycle_name": "Short vivid name for the coming growth shift",
      "description": "2-3 plain sentences on what the upcoming transit will unlock or shake loose in their inner world over the next few months."
    }}
  }},
  "love_tab": {{
    "what_you_actually_crave": "MINIMUM 2 SENTENCES. Describe what this person actually needs in love — not what they say they want, but what the chart shows they deeply need. Be specific about the type of connection, the feeling they're chasing, and why.",
    "the_romantic_fear": "MINIMUM 2 SENTENCES. Name the specific fear or pattern that holds them back in relationships — the exact thing they do (or don't do) because of it, and what it costs them.",
    "heart_advice": "MINIMUM 2 SENTENCES. Give them one honest, specific piece of advice about their love life. Something they might not want to hear but need to. Direct and kind at the same time.",
    "identity_cards": [
      {{
        "symbol": "Emoji symbol",
        "tagline": "Short label",
        "word": "Single powerful archetype noun"
      }},
      {{
        "symbol": "Emoji symbol",
        "tagline": "Short label",
        "word": "Single powerful archetype noun"
      }},
      {{
        "symbol": "Emoji symbol",
        "tagline": "Short label",
        "word": "Single powerful archetype noun"
      }}
    ],
    "past_transit": {{
      "planet": "Most relevant planet for their love past cycle",
      "cycle_name": "Short vivid name for the past love cycle",
      "description": "2-3 plain sentences on what the past transit was stirring up in their romantic life and emotional patterns."
    }},
    "current_transit": {{
      "planet": "Most relevant planet active now for their love life",
      "cycle_name": "Short vivid name for the current love transit",
      "description": "2-3 plain sentences on what this current transit is intensifying or clarifying in their romantic and emotional life right now."
    }},
    "future_transit": {{
      "planet": "Most relevant planet coming soon for their heart",
      "cycle_name": "Short vivid name for the coming love shift",
      "description": "2-3 plain sentences on what the upcoming transit is going to open up or bring to their love life in the next few months."
    }}
  }}
}}"""

        report_content = None
        step2_errors = []
        step2_models = [
            "openai/gpt-oss-120b:free",
            "openai/gpt-oss-120b:free"
        ]
        for model_id in step2_models:
            for attempt in range(3):
                try:
                    raw_content = await _call_openrouter(
                        model=model_id,
                        messages=[
                            {"role": "system", "content": step2_system_prompt},
                            {"role": "user", "content": step2_user_prompt}
                        ],
                        max_tokens=4000
                    )
                    if raw_content is None:
                        raise ValueError("Model returned empty content (None)")
                    if "<think>" in raw_content and "</think>" in raw_content:
                        raw_content = raw_content.split("</think>")[-1].strip()
                    
                    # Validate JSON structure
                    parsed_data = _extract_json(raw_content)
                    required_categories = ["hustle_tab", "money_tab", "growth_tab", "love_tab"]
                    expected_keys = {
                        "hustle_tab": ["your_natural_style", "the_biggest_block", "how_to_fix_it", "identity_cards"],
                        "money_tab": ["your_financial_mindset", "the_money_trap", "cash_advice", "identity_cards"],
                        "growth_tab": ["public_mask", "private_reality", "mental_reset", "identity_cards"],
                        "love_tab": ["what_you_actually_crave", "the_romantic_fear", "heart_advice", "identity_cards"]
                    }
                    for cat in required_categories:
                        if cat not in parsed_data:
                            raise ValueError(f"Invalid Step 2 JSON structure: missing category '{cat}'")
                        cat_data = parsed_data[cat]
                        if not isinstance(cat_data, dict):
                            raise ValueError(f"Category '{cat}' must be an object")
                        req_keys = expected_keys[cat]
                        if not all(k in cat_data for k in req_keys):
                            raise ValueError(f"Category '{cat}' is missing required keys: {req_keys}")
                        if not isinstance(cat_data.get("identity_cards"), list) or len(cat_data["identity_cards"]) != 3:
                            raise ValueError(f"Category '{cat}' must have an 'identity_cards' list with exactly 3 elements")
                    
                    report_content = raw_content
                    break  # Succeeded and validated!
                except Exception as e:
                    logger.warning(f"Step 2 attempt {attempt+1} failed with model {model_id}: {e}.")
                    if attempt == 2:
                        step2_errors.append(f"{model_id}: {e}")
                    await asyncio.sleep(1.5)
            if report_content:
                break

        if not report_content:
            raise Exception(f"All models failed for Step 2. Errors: {'; '.join(step2_errors)}")

        parsed_report = _extract_json(report_content)

        # Inject fallback transit and identity card data for any tab where the model ran out of tokens
        for tab_key in ["hustle_tab", "money_tab", "growth_tab", "love_tab"]:
            if tab_key in parsed_report and isinstance(parsed_report[tab_key], dict):
                fallback_tab = _FALLBACK_REPORT.get(tab_key, {})
                for transit_key in ["past_transit", "current_transit", "future_transit"]:
                    if not parsed_report[tab_key].get(transit_key):
                        if transit_key in fallback_tab:
                            parsed_report[tab_key][transit_key] = fallback_tab[transit_key]
                if not parsed_report[tab_key].get("identity_cards"):
                    if "identity_cards" in fallback_tab:
                        parsed_report[tab_key]["identity_cards"] = fallback_tab["identity_cards"]

        parsed_report["age"] = age
        parsed_report["timeframes"] = {
            "past": past_timeframe,
            "present": present_timeframe,
            "future": future_timeframe
        }
        return parsed_report


    except Exception as exc:
        logger.error(f"Error in two-step report pipeline: {exc}", exc_info=True)
        fallback = dict(_FALLBACK_REPORT)
        fallback["age"] = age
        fallback["timeframes"] = {
            "past": past_timeframe,
            "present": present_timeframe,
            "future": future_timeframe
        }
        return fallback

