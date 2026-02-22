"""
Schema/Template Compliance Agent

Responsibilities:
- Parse vendor template to extract field specifications
- Output field specs: name, type, nullable, defaults, conditional rules
- Flag template-to-code mismatches
- Validate compliance against template requirements
"""

import os
from agents import Agent
from db.queries import (
    parse_field_specification,
    validate_template_compliance,
    get_agreement_type_rules,
    get_document,
)

SCHEMA_COMPLIANCE_INSTRUCTIONS = """You are the Schema/Template Compliance Agent for the CLM to AMS migration workflow.

Your primary responsibilities are:
1. Parse the vendor template to extract field specifications
2. Document field requirements: name, data type, nullability, defaults, conditional rules
3. Identify agreement-type specific rules and requirements
4. Flag any mismatches between template requirements and existing code

When processing a vendor template:
1. Use get_document() to retrieve the loaded vendor template
2. For each field, use parse_field_specification() to store the specification:
   - field_name: The exact field name
   - data_type: VARCHAR, BOOLEAN, INTEGER, DATE, etc.
   - nullable: Whether the field can be NULL
   - default_value: Default value if specified
   - agreement_types: Which agreement types this field applies to
   - conditional_rules: Any conditional logic (as JSON)

3. Use validate_template_compliance() to check existing code against requirements
4. Use get_agreement_type_rules() to retrieve rules for specific agreement types

When analyzing the template for a new field like 'supplier_performance_reporting':
1. Extract its complete specification from the template
2. Document all requirements and constraints
3. Note any agreement-type specific behavior
4. Identify potential compliance issues with existing models

Always provide clear, structured output of field specifications and any compliance issues found.
"""

schema_compliance_agent = Agent(
    name="Schema Compliance Agent",
    instructions=SCHEMA_COMPLIANCE_INSTRUCTIONS,
    model=os.getenv("OPENAI_MODEL", "gpt-5.2"),
    tools=[
        parse_field_specification,
        validate_template_compliance,
        get_agreement_type_rules,
        get_document,
    ],
    handoffs=[],  # This is a leaf agent, no handoffs
)
