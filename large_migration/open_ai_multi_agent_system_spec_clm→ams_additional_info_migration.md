goal
build an openai multi-agent workflow that incrementally produces (1) a migration mapping document and (2) dbt sql code updates, using vendor templates + mapping + existing dbt models as inputs. the immediate mvp is: add a single new field to an existing table/model.

domain context
source system: clm
target system: ams
platform: snowflake
transformation framework: dbt (sql models)
object migrated: contract
focus table: additionalinfo (one row per contract)
existing lineage: earlier models already select contracts; additionalinfo is produced by two dbt models

key business rules
additionalinfo is built for vendor consumption and must meet the vendor template requirements.
fields can be populated depending on agreement type.
agreement types mentioned:
- funder_2_loa
- funder_2_outcome_agreement
- funder_2_migration variation

change request to automate
in the most recent ams release, additionalinfo got a new field.
field name in ams model context: supplier_performance_reporting
field label used in template/mapping prompt: supplier performance reports
objective: update dbt models to add this new field end-to-end.

available inputs to the ai workflow
input 1: target vendor template for the required table
- defines, per row, the fields required, data types, and rules for data provided
- table requirement: one row per contract
- indicates field population rules depending on agreement type (the 3 types above)

input 2: mapping document
- explains how to create the table requested in the template
- includes, for each field (including the new one), the data source and transformation rules
- key columns to read for the new field:
  - source data base
  - source schema
  - source table name
  - source columns
  - selection (transform logic)

input 3: dbt model file that prepares transformed source data for staging
- model name in prompt: ams_ai_dbt-add_info
- purpose: creates a table of transformed clm data prepared for staging (upstream/prep layer)

input 4: dbt model file that produces the final vendor table
- model name in prompt: ams_ai_dbt_stg_add_inf (also referred to as ams_ai_dbt_stg_add_info in step wording)
- purpose: creates the final additionalinfo table for vendor consumption
- requirement: must meet template rules in input 1

human reference artifacts (for evaluation / grounding)
- anonymising guide created by adi to produce cut-down anonymised versions of template/map/code
- human result when tony added the new field for alm5 (human-written code changes)

proposed ai task sequence (the prompt’s steps)
step 1: open contractadditionalinformation template and confirm requirements for adding the new field
- confirm field name + field type
- confirm any template rules that affect how the field is populated

step 2: open mapping document and identify the mapping for the new field
- extract the data source (db/schema/table/columns)
- extract the selection/transform rules

step 3: update dbt code in two places
- update ams_ai_dbt-add_info to source + transform the new field based on mapping
- update downstream model (ams_ai_dbt_stg_add_inf / ams_ai_dbt_stg_add_info) to include the new field in the staging/final table and populate it from the prior model

multi-agent architecture to build for this (what the system must do)
1) intake + document loader agent
- loads template, mapping, and dbt sql files
- normalizes naming (e.g., supplier_performance_reporting vs supplier performance reports)
- detects agreement-type-specific rules

2) schema/template compliance agent
- reads vendor template
- outputs a strict field requirement spec: fieldname, datatype, nullable/default rules, any conditional population rules
- flags mismatches between template field name and code field name

3) mapping extraction agent
- reads mapping document row for the new field
- outputs a structured mapping object:
  - source_db
  - source_schema
  - source_table
  - source_columns
  - transform_sql (selection)
  - any join keys / filters implied

4) dbt code planner agent
- inspects existing dbt models (add_info and stg_add_inf)
- identifies where fields are selected/assembled and where to insert the new field
- produces a minimal-change plan that preserves existing patterns/macros/naming

5) dbt sql patch generator agent
- generates the exact sql diffs/patches for:
  - ams_ai_dbt-add_info (prep layer)
  - ams_ai_dbt_stg_add_inf (final/staging layer)
- keeps style consistent with existing code (aliases, nvl/nullif conventions, macros, etc.)

6) validator / reviewer agent
- checks:
  - field exists in both models
  - final table contains the field with correct name/type
  - logic matches mapping selection rules
  - one-row-per-contract requirement remains satisfied
  - agreement-type rules are respected (if conditional)
- outputs a checklist and any corrections

7) optional: regression diff + test suggestion agent
- proposes dbt tests (not_null, accepted_values, relationships) only if they align with template rules
- suggests a small sample query to validate values in snowflake

success criteria (mvp)
- the new field is added end-to-end: mapping → prep model → final model.
- generated sql compiles in dbt and conforms to the vendor template requirements.
- changes are minimal and follow existing project conventions.

notes and constraints captured from the email thread
- the test is about ai capability to assist with mapping + coding.
- focus is on incremental change to an existing model (not a full greenfield migration build).
- inputs are anonymised/cut-down for safe sharing.
- the author’s limited technical knowledge was a blocker; the workflow should reduce reliance on deep dbt expertise by guiding and validating each step.

stakeholders referenced
- emma de wit: data migration analyst / release & environments manager
- adi (aditya sharma): created the anonymised/cut-down input set and anonymising guide
- tony: produced the human-written implementation for the analogous alm5 change
- bhavesh shankaran: coordinating and seeking ai expert consultation

