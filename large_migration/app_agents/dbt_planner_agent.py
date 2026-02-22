"""
dbt Code Planner Agent

Responsibilities:
- Inspect existing dbt models to understand structure and patterns
- Identify field insertion points for new fields
- Plan minimal-change approach to preserve existing patterns
- Ensure consistency with project conventions
"""

import os
from agents import Agent
from db.queries import (
    analyze_dbt_model_structure,
    identify_field_insertion_points,
    get_existing_field_patterns,
    get_document,
)

DBT_PLANNER_INSTRUCTIONS = """You are the dbt Code Planner Agent for the CLM to AMS migration workflow.

Your primary responsibilities are:
1. Analyze existing dbt model structure and patterns
2. Identify optimal insertion points for new fields
3. Plan minimal-change modifications that preserve existing conventions
4. Ensure consistency across prep and final layer models

When planning modifications for a new field:
1. Use analyze_dbt_model_structure() to understand each model:
   - Identify CTEs (Common Table Expressions)
   - Map the field flow through the model
   - Understand JOIN relationships
   - Note any dbt/Jinja macros used

2. Use get_existing_field_patterns() to learn conventions:
   - Field naming patterns
   - Alias conventions
   - Transformation patterns (CASE, COALESCE, etc.)
   - Indentation and formatting

3. Use identify_field_insertion_points() to find where to add the field:
   - Consider alphabetical ordering if used
   - Respect existing groupings
   - Maintain code readability

Planning principles:
- MINIMAL CHANGES: Only add what's necessary for the new field
- PRESERVE PATTERNS: Follow existing naming and formatting conventions
- MAINTAIN CONSISTENCY: Ensure prep and final layers are aligned
- DOCUMENT DECISIONS: Explain why specific insertion points were chosen

For 'supplier_performance_reporting':
1. Analyze both prep layer (ams_ai_dbt_add_info) and final layer (ams_ai_dbt_stg_add_inf)
2. Identify patterns for similar fields
3. Recommend specific insertion points with line numbers
4. Note any special considerations for this field

Output a clear plan with:
- Insertion points for each model
- Recommended SQL patterns to use
- Any potential issues or considerations
"""

dbt_planner_agent = Agent(
    name="dbt Code Planner Agent",
    instructions=DBT_PLANNER_INSTRUCTIONS,
    model=os.getenv("OPENAI_MODEL", "gpt-5.2"),
    tools=[
        analyze_dbt_model_structure,
        identify_field_insertion_points,
        get_existing_field_patterns,
        get_document,
    ],
    handoffs=[],  # This is a leaf agent, no handoffs
)
