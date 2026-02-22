INPUT FOLDER - Migration Agent System
=====================================

Place your input files in this folder for processing.

SUPPORTED FILE FORMATS
----------------------
- TXT     - Plain text files
- PDF     - PDF documents (text will be extracted)
- DOCX    - Microsoft Word documents
- CSV     - Comma-separated values (spreadsheets)
- XLSX    - Microsoft Excel workbooks
- XLS     - Legacy Excel files
- JSON    - JSON data files
- YAML    - YAML configuration files
- SQL     - SQL script files
- MD      - Markdown files

FILE TYPES
----------
1. Vendor Templates (.csv, .xlsx, .docx, .pdf, .txt)
   - Field definitions
   - Data types
   - Business rules
   - Agreement-type requirements

2. Mapping Documents (.csv, .xlsx, .docx, .pdf, .txt)
   - Source-to-target field mappings
   - Transformation rules
   - Join key specifications

3. dbt Model Files (.sql)
   - Prep layer models
   - Final/staging layer models

HOW TO USE
----------
1. Copy your files to this folder
2. Start the chatbot: streamlit run main.py
3. Ask the chatbot:
   - "List input files" - See all available files
   - "Read <filename>" - Preview file contents
   - "Load vendor template <filename>" - Load into database
   - "Load mapping document <filename>" - Load into database

EXAMPLE COMMANDS
----------------
- "What files are in the input folder?"
- "Show me the contents of vendor_template.xlsx"
- "Read mapping_doc.pdf"
- "Load the vendor template from field_specs.docx"
- "Load the mapping document from mappings.csv"
- "Load prep_model.sql as prep layer model named ams_ai_dbt_add_info"

NOTES
-----
- PDF text extraction works best with text-based PDFs (not scanned images)
- Excel files with multiple sheets will show all sheets
- Word documents with tables will extract table contents
- Files are parsed and stored in PostgreSQL for agent processing
