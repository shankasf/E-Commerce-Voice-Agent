"""
Dashboard API Endpoints for U Rack IT Voice Agent
FastAPI routes for all 100 metrics
"""

import logging
from datetime import date, datetime, timedelta
from typing import Optional

from fastapi import APIRouter, Query, HTTPException
from fastapi.responses import JSONResponse

from db.dashboard_queries import (
    get_call_metrics,
    get_call_queue_metrics,
    get_ai_performance_metrics,
    get_ticket_metrics,
    get_customer_metrics,
    get_system_health_metrics,
    get_cost_metrics,
    get_trend_metrics,
    get_dashboard_overview,
    get_realtime_metrics
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


def parse_date_range(
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    range_preset: Optional[str] = None
) -> tuple[date, date]:
    """Parse date range from query params."""
    today = date.today()
    
    if range_preset:
        if range_preset == "today":
            return today, today
        elif range_preset == "yesterday":
            yesterday = today - timedelta(days=1)
            return yesterday, yesterday
        elif range_preset == "7d":
            return today - timedelta(days=7), today
        elif range_preset == "30d":
            return today - timedelta(days=30), today
        elif range_preset == "90d":
            return today - timedelta(days=90), today
        elif range_preset == "this_month":
            return today.replace(day=1), today
        elif range_preset == "last_month":
            first_of_this_month = today.replace(day=1)
            last_month_end = first_of_this_month - timedelta(days=1)
            last_month_start = last_month_end.replace(day=1)
            return last_month_start, last_month_end
    
    if date_from:
        date_from = datetime.strptime(date_from, "%Y-%m-%d").date()
    else:
        date_from = today
    
    if date_to:
        date_to = datetime.strptime(date_to, "%Y-%m-%d").date()
    else:
        date_to = today
    
    return date_from, date_to


# =====================================================
# OVERVIEW ENDPOINTS
# =====================================================

@router.get("/overview")
async def dashboard_overview():
    """Get complete dashboard overview with all metrics."""
    try:
        data = await get_dashboard_overview()
        return JSONResponse(content=data)
    except Exception as e:
        logger.error(f"Error fetching dashboard overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/realtime")
async def realtime_metrics():
    """Get real-time metrics for live dashboard updates."""
    try:
        data = await get_realtime_metrics()
        return JSONResponse(content=data)
    except Exception as e:
        logger.error(f"Error fetching realtime metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# CALL METRICS (1-15)
# =====================================================

@router.get("/calls")
async def call_metrics(
    date_from: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    range: Optional[str] = Query(None, description="Preset: today, yesterday, 7d, 30d, 90d")
):
    """
    Get comprehensive call metrics including:
    - Total calls, active calls, completed, abandoned
    - Call duration stats (avg, max, min)
    - Wait times
    - Hourly and daily distribution
    - Peak hours analysis
    """
    try:
        start, end = parse_date_range(date_from, date_to, range)
        data = await get_call_metrics(start, end)
        return JSONResponse(content={
            "date_range": {"from": start.isoformat(), "to": end.isoformat()},
            "metrics": data
        })
    except Exception as e:
        logger.error(f"Error fetching call metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calls/queue")
async def call_queue():
    """Get real-time call queue status."""
    try:
        data = await get_call_queue_metrics()
        return JSONResponse(content=data)
    except Exception as e:
        logger.error(f"Error fetching queue metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# AI AGENT PERFORMANCE (16-35)
# =====================================================

@router.get("/ai-performance")
async def ai_performance(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    range: Optional[str] = Query(None)
):
    """
    Get AI agent performance metrics including:
    - AI resolution rate
    - Escalation rate
    - Response times
    - Agent distribution (email, network, printer, etc.)
    - Tool call statistics
    - Confidence scores
    - Fallback responses
    """
    try:
        start, end = parse_date_range(date_from, date_to, range)
        data = await get_ai_performance_metrics(start, end)
        return JSONResponse(content={
            "date_range": {"from": start.isoformat(), "to": end.isoformat()},
            "metrics": data
        })
    except Exception as e:
        logger.error(f"Error fetching AI performance metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# TICKET METRICS (36-55)
# =====================================================

@router.get("/tickets")
async def ticket_metrics(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    range: Optional[str] = Query(None)
):
    """
    Get ticket metrics including:
    - Tickets created, open, pending, resolved
    - Priority breakdown
    - Resolution times
    - SLA compliance
    - Escalation rates
    """
    try:
        start, end = parse_date_range(date_from, date_to, range)
        data = await get_ticket_metrics(start, end)
        return JSONResponse(content={
            "date_range": {"from": start.isoformat(), "to": end.isoformat()},
            "metrics": data
        })
    except Exception as e:
        logger.error(f"Error fetching ticket metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# CUSTOMER METRICS (56-70)
# =====================================================

@router.get("/customers")
async def customer_metrics(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    range: Optional[str] = Query(None)
):
    """
    Get customer metrics including:
    - Unique callers
    - Repeat vs new callers
    - CSAT scores
    - Top callers
    - Calls by organization
    - Resolution efficiency
    """
    try:
        start, end = parse_date_range(date_from, date_to, range)
        data = await get_customer_metrics(start, end)
        return JSONResponse(content={
            "date_range": {"from": start.isoformat(), "to": end.isoformat()},
            "metrics": data
        })
    except Exception as e:
        logger.error(f"Error fetching customer metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# SYSTEM HEALTH (71-85)
# =====================================================

@router.get("/system")
async def system_health():
    """
    Get system health metrics including:
    - CPU, memory, disk usage
    - Active sessions
    - API latencies (OpenAI, Twilio, DB)
    - Error rates
    - Uptime
    """
    try:
        data = await get_system_health_metrics()
        return JSONResponse(content=data)
    except Exception as e:
        logger.error(f"Error fetching system health: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# COST & BUSINESS METRICS (86-95)
# =====================================================

@router.get("/costs")
async def cost_metrics(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    range: Optional[str] = Query(None)
):
    """
    Get cost and business metrics including:
    - AI token usage and costs
    - Twilio minutes and costs
    - Cost per call/resolution
    - Model usage breakdown
    - First call resolution rate
    - Estimated savings
    """
    try:
        start, end = parse_date_range(date_from, date_to, range)
        data = await get_cost_metrics(start, end)
        return JSONResponse(content={
            "date_range": {"from": start.isoformat(), "to": end.isoformat()},
            "metrics": data
        })
    except Exception as e:
        logger.error(f"Error fetching cost metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# TRENDS & ANALYTICS (96-100)
# =====================================================

@router.get("/trends")
async def trend_metrics(
    days: int = Query(30, description="Number of days for trend analysis")
):
    """
    Get trend and analytics data including:
    - Daily trends
    - Issue category trends
    - Common keywords
    - Sentiment analysis
    - Knowledge gaps
    """
    try:
        data = await get_trend_metrics(days)
        return JSONResponse(content=data)
    except Exception as e:
        logger.error(f"Error fetching trend metrics: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# =====================================================
# EXPORT ENDPOINTS
# =====================================================

@router.get("/export/summary")
async def export_summary(
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None),
    range: Optional[str] = Query(None)
):
    """Export all metrics as a JSON summary."""
    try:
        start, end = parse_date_range(date_from, date_to, range)
        
        call_data = await get_call_metrics(start, end)
        ai_data = await get_ai_performance_metrics(start, end)
        ticket_data = await get_ticket_metrics(start, end)
        customer_data = await get_customer_metrics(start, end)
        system_data = await get_system_health_metrics()
        cost_data = await get_cost_metrics(start, end)
        
        return JSONResponse(content={
            "generated_at": datetime.utcnow().isoformat(),
            "date_range": {"from": start.isoformat(), "to": end.isoformat()},
            "call_metrics": call_data,
            "ai_performance": ai_data,
            "ticket_metrics": ticket_data,
            "customer_metrics": customer_data,
            "system_health": system_data,
            "cost_metrics": cost_data
        })
    except Exception as e:
        logger.error(f"Error exporting summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))
