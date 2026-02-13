"""Market data endpoints — proxies Yahoo Finance for live quotes."""

from datetime import datetime, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.dependencies import get_current_active_user
from app.models.user import User

router = APIRouter()

# --- Response models ---

class MarketQuote(BaseModel):
    symbol: str
    name: str
    price: float
    change: float
    change_percent: float
    currency: str

class MarketQuotesResponse(BaseModel):
    quotes: list[MarketQuote]
    last_updated: str

# --- Cache ---
_cache: dict = {"quotes": [], "expires": datetime.min}
CACHE_TTL = timedelta(seconds=60)

# Default symbols (Indian + global markets)
DEFAULT_SYMBOLS = ["^BSESN", "^NSEI", "^NSEBANK", "GC=F", "USDINR=X"]
SYMBOL_NAMES = {
    "^BSESN": "BSE Sensex",
    "^NSEI": "Nifty 50",
    "^NSEBANK": "Bank Nifty",
    "GC=F": "Gold",
    "USDINR=X": "USD/INR",
}
DISPLAY_SYMBOLS = {
    "^BSESN": "SENSEX",
    "^NSEI": "NIFTY",
    "^NSEBANK": "BANKNIFTY",
    "GC=F": "GOLD",
    "USDINR=X": "USD/INR",
}

async def _fetch_quotes() -> list[MarketQuote]:
    """Fetch market quotes from Yahoo Finance with caching."""
    global _cache

    now = datetime.utcnow()
    if _cache["quotes"] and now < _cache["expires"]:
        return _cache["quotes"]

    quotes = []
    try:
        import yfinance as yf

        tickers = yf.Tickers(" ".join(DEFAULT_SYMBOLS))
        for sym in DEFAULT_SYMBOLS:
            try:
                info = tickers.tickers[sym].fast_info
                price = float(info.get("lastPrice", 0) or info.get("last_price", 0) or 0)
                prev_close = float(info.get("previousClose", 0) or info.get("previous_close", 0) or 0)
                change = price - prev_close if prev_close else 0
                change_pct = (change / prev_close * 100) if prev_close else 0
                currency = "INR" if sym in ("^BSESN", "^NSEI", "^NSEBANK", "USDINR=X") else "USD"

                quotes.append(MarketQuote(
                    symbol=DISPLAY_SYMBOLS.get(sym, sym),
                    name=SYMBOL_NAMES.get(sym, sym),
                    price=round(price, 2),
                    change=round(change, 2),
                    change_percent=round(change_pct, 2),
                    currency=currency,
                ))
            except Exception:
                continue

        if quotes:
            _cache["quotes"] = quotes
            _cache["expires"] = now + CACHE_TTL
    except ImportError:
        # yfinance not installed — return empty
        pass
    except Exception:
        # Network or API error — return cached if available
        if _cache["quotes"]:
            return _cache["quotes"]

    return quotes


@router.get("/quotes", response_model=MarketQuotesResponse)
async def get_market_quotes(
    current_user: User = Depends(get_current_active_user),
):
    """Get live market quotes (cached for 60 seconds)."""
    quotes = await _fetch_quotes()
    return MarketQuotesResponse(
        quotes=quotes,
        last_updated=datetime.utcnow().isoformat(),
    )
