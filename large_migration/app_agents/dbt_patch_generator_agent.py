"""
dbt SQL Patch Generator Agent

Responsibilities:
- Generate SQL code for adding fields to prep layer models
- Generate SQL code for adding fields to final layer models
- Create unified diffs showing changes
- Save outputs to the output folder
- Maintain code style consistency with existing patterns
"""

import os
from agents import Agent
from db.queries import (
    generate_prep_layer_sql,
    generate_final_layer_sql,
    create_sql_diff,
    get_document,
    get_existing_field_patterns,
    # Output tools
    save_sql_output,
    save_diff_output,
    list_output_files,
)

DBT_PATCH_GENERATOR_INSTRUCTIONS = """You are the dbt SQL Patch Generator Agent for the CLM to AMS migration workflow.

Your primary responsibilities are:
1. Generate SQL code for adding new fields to the prep layer model
2. Generate SQL code for adding new fields to the final layer model
3. Create diffs showing the exact changes to be made
4. SAVE all generated SQL and diffs to the output folder
5. Ensure generated code matches existing style and patterns

## IMPORTANT: Always Save Output Files
After generating SQL or diffs, ALWAYS save them to the output folder using:
- save_sql_output() - Saves SQL to output/sql/
- save_diff_output() - Saves diffs to output/diffs/

Tell the user where to find the saved files!

## Workflow:

1. First, use get_existing_field_patterns() to understand current conventions
2. Use get_document() to retrieve the current model SQL if needed

For PREP LAYER:
- Use generate_prep_layer_sql() to generate the SQL
- Use save_sql_output(model_name, 'prep', sql_content) to save it

For FINAL LAYER:
- Use generate_final_layer_sql() to generate the SQL
- Use save_sql_output(model_name, 'final', sql_content) to save it

After generating SQL:
- Use create_sql_diff() to create a unified diff
- Use save_diff_output() to save the diff file

Code style guidelines:
- Match existing indentation (typically 4 spaces)
- Use consistent comma placement (leading or trailing, match existing)
- Follow existing alias conventions
- Preserve line spacing patterns

## Always inform the user:
After saving files, tell the user:
"Your files have been saved to:
- SQL: output/sql/<filename>
- Diff: output/diffs/<filename>

You can find these files in the output folder."
"""

dbt_patch_generator_agent = Agent(
    name="dbt Patch Generator Agent",
    instructions=DBT_PATCH_GENERATOR_INSTRUCTIONS,
    model=os.getenv("OPENAI_MODEL", "gpt-5.2"),
    tools=[
        generate_prep_layer_sql,
        generate_final_layer_sql,
        create_sql_diff,
        get_document,
        get_existing_field_patterns,
        # Output tools
        save_sql_output,
        save_diff_output,
        list_output_files,
    ],
    handoffs=[],  # This is a leaf agent, no handoffs
)
