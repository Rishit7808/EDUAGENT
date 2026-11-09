"""
EDUAGENT UI Reusable Components for Streamlit
"""
import streamlit as st

def render_header(title: str, subtitle: str, role_badge: str = "Student"):
    badge_color = "#6366f1" if role_badge == "Student" else "#ef4444"
    st.markdown(
        f"""
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); padding: 1.5rem; border-radius: 8px; border: 1px solid #334155; margin-bottom: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <h1 style="color: #f8fafc; margin: 0; font-size: 1.8rem; font-weight: 700; letter-spacing: -0.02em;">
                        EDUAGENT <span style="font-size: 0.9rem; font-weight: 400; color: #94a3b8;">| {title}</span>
                    </h1>
                    <p style="color: #94a3b8; margin: 0.25rem 0 0 0; font-size: 0.95rem;">{subtitle}</p>
                </div>
                <div>
                    <span style="background-color: {badge_color}; color: white; padding: 0.35rem 0.75rem; border-radius: 4px; font-size: 0.8rem; font-weight: 600; text-transform: uppercase;">
                        {role_badge} Mode
                    </span>
                </div>
            </div>
        </div>
        """,
        unsafe_allow_html=True
    )

def render_agent_trace(steps: list):
    """Renders real agent execution trace."""
    if not steps:
        return
    st.markdown("##### Multi-Agent Orchestration Trace")
    for s in steps:
        status_icon = "✓" if s.get("status") == "completed" else "⟳" if s.get("status") == "running" else "✗"
        status_color = "#22c55e" if s.get("status") == "completed" else "#3b82f6" if s.get("status") == "running" else "#ef4444"
        st.markdown(
            f"""
            <div style="border-left: 3px solid {status_color}; padding-left: 0.75rem; margin-bottom: 0.5rem; background: #1e293b; padding: 0.5rem 0.75rem; border-radius: 0 4px 4px 0;">
                <div style="font-weight: 600; font-size: 0.85rem; color: #e2e8f0;">
                    <span style="color: {status_color}; margin-right: 0.5rem;">{status_icon}</span>{s.get('step')}
                </div>
                <div style="font-size: 0.8rem; color: #94a3b8; margin-top: 0.2rem;">
                    {s.get('description')}
                </div>
            </div>
            """,
            unsafe_allow_html=True
        )
