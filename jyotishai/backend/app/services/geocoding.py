from geopy.geocoders import Nominatim
from timezonefinder import TimezoneFinder
from typing import Tuple

geolocator = Nominatim(user_agent="jyotishai/1.0")
tf = TimezoneFinder()


def geocode_city(city: str) -> Tuple[float, float, str]:
    """
    Convert a city name to (latitude, longitude, timezone).

    Returns:
        Tuple of (lat, lon, timezone_str)
        e.g. (19.076090, 72.877426, "Asia/Kolkata")

    Raises:
        ValueError if city is not found
    """
    location = geolocator.geocode(city, exactly_one=True, timeout=10)

    if not location:
        raise ValueError(f"Could not geocode city: '{city}'. Try a more specific name.")

    lat = location.latitude
    lon = location.longitude
    tz = tf.timezone_at(lat=lat, lng=lon)

    if not tz:
        raise ValueError(f"Could not determine timezone for coordinates ({lat}, {lon})")

    return lat, lon, tz
