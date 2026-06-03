"""
GeoHash encoding and decoding using Base32 character set.

Maps (latitude, longitude) pairs to compact string representations
for spatial indexing and proximity search.

Contract: FND-005
"""

from __future__ import annotations

from typing import List, Tuple

_BASE32 = "0123456789bcdefghjkmnpqrstuvwxyz"
_BASE32_DECODE = {ch: i for i, ch in enumerate(_BASE32)}


class GeoHash:
    """Encode/decode coordinates to/from GeoHash strings."""

    @staticmethod
    def encode(lat: float, lng: float, precision: int = 12) -> str:
        """Encode (lat, lng) to a GeoHash string."""
        if not (-90 <= lat <= 90):
            raise ValueError(f"Latitude {lat} out of range [-90, 90]")
        if not (-180 <= lng <= 180):
            raise ValueError(f"Longitude {lng} out of range [-180, 180]")
        if not 1 <= precision <= 12:
            raise ValueError(f"Precision {precision} must be in [1, 12]")

        lat_min, lat_max = -90.0, 90.0
        lng_min, lng_max = -180.0, 180.0

        result: List[str] = []
        bit = 0
        ch = 0
        is_even = True

        while len(result) < precision:
            if is_even:
                mid = (lng_min + lng_max) / 2.0
                if lng > mid:
                    ch |= 1 << (4 - bit)
                    lng_min = mid
                else:
                    lng_max = mid
            else:
                mid = (lat_min + lat_max) / 2.0
                if lat > mid:
                    ch |= 1 << (4 - bit)
                    lat_min = mid
                else:
                    lat_max = mid

            is_even = not is_even
            bit += 1
            if bit == 5:
                result.append(_BASE32[ch])
                bit = 0
                ch = 0

        return "".join(result)

    @staticmethod
    def decode(geohash: str) -> Tuple[float, float]:
        """Decode a GeoHash to its centre (lat, lng)."""
        lat_min, lat_max = -90.0, 90.0
        lng_min, lng_max = -180.0, 180.0
        is_even = True

        for ch in geohash.lower():
            if ch not in _BASE32_DECODE:
                raise ValueError(f"Invalid GeoHash character: {ch!r}")
            val = _BASE32_DECODE[ch]
            for i in range(4, -1, -1):
                bit_val = (val >> i) & 1
                if is_even:
                    mid = (lng_min + lng_max) / 2.0
                    if bit_val:
                        lng_min = mid
                    else:
                        lng_max = mid
                else:
                    mid = (lat_min + lat_max) / 2.0
                    if bit_val:
                        lat_min = mid
                    else:
                        lat_max = mid
                is_even = not is_even

        return ((lat_min + lat_max) / 2.0, (lng_min + lng_max) / 2.0)

    @staticmethod
    def bbox(geohash: str) -> Tuple[float, float, float, float]:
        """Return (min_lat, min_lng, max_lat, max_lng) for a GeoHash."""
        lat_min, lat_max = -90.0, 90.0
        lng_min, lng_max = -180.0, 180.0
        is_even = True

        for ch in geohash.lower():
            if ch not in _BASE32_DECODE:
                raise ValueError(f"Invalid GeoHash character: {ch!r}")
            val = _BASE32_DECODE[ch]
            for i in range(4, -1, -1):
                bit_val = (val >> i) & 1
                if is_even:
                    mid = (lng_min + lng_max) / 2.0
                    if bit_val:
                        lng_min = mid
                    else:
                        lng_max = mid
                else:
                    mid = (lat_min + lat_max) / 2.0
                    if bit_val:
                        lat_min = mid
                    else:
                        lat_max = mid
                is_even = not is_even

        return (lat_min, lng_min, lat_max, lng_max)

    @staticmethod
    def _cell_error(geohash: str) -> Tuple[float, float]:
        """Half the cell dimensions (lat_err, lng_err)."""
        lat_min, lng_min, lat_max, lng_max = GeoHash.bbox(geohash)
        return ((lat_max - lat_min) / 2.0, (lng_max - lng_min) / 2.0)

    @staticmethod
    def neighbors(geohash: str) -> List[str]:
        """Return 8 adjacent GeoHash cells: N, E, S, W, NE, SE, SW, NW."""
        lat, lng = GeoHash.decode(geohash)
        lat_err, lng_err = GeoHash._cell_error(geohash)
        prec = len(geohash)

        offsets = [
            (lat_err * 2, 0),          # N
            (0, lng_err * 2),          # E
            (-lat_err * 2, 0),         # S
            (0, -lng_err * 2),         # W
            (lat_err * 2, lng_err * 2),    # NE
            (-lat_err * 2, lng_err * 2),   # SE
            (-lat_err * 2, -lng_err * 2),  # SW
            (lat_err * 2, -lng_err * 2),   # NW
        ]

        result = []
        for dlat, dlng in offsets:
            nlat = max(-90.0, min(90.0, lat + dlat))
            nlng = max(-180.0, min(180.0, lng + dlng))
            result.append(GeoHash.encode(nlat, nlng, prec))

        return result
