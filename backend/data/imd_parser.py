"""
IMD HTML and JSON Parser
Extracts structured district rainfall tables, JavaScript map data providers, and statistical reports.
"""

import re
import json
import pandas as pd
from typing import List, Dict, Any, Optional
from backend.data.imd_schema import COLUMN_NORMALIZATION_MAP

class IMDParser:
    """
    Parses raw HTML and JavaScript responses from IMD MAUSAM into structured DataFrames.
    """

    @staticmethod
    def clean_cell_text(text: str) -> str:
        """Strip HTML tags, non-breaking spaces, and leading/trailing whitespace."""
        if not text:
            return ""
        clean = re.sub(r'<[^>]+>', '', text)
        clean = clean.replace('&nbsp;', ' ').replace('&#160;', ' ')
        clean = re.sub(r'\s+', ' ', clean).strip()
        return clean

    @staticmethod
    def parse_numeric(val: Any) -> Optional[float]:
        """Convert string values to float, safely handling '-', 'NA', 'N/A', empty strings."""
        if val is None or pd.isna(val):
            return None
        s = str(val).strip().replace(',', '')
        if s in ['', '-', 'NA', 'N/A', 'NaN', 'null', 'None', 'TR', 'Trace']:
            return 0.0 if s in ['TR', 'Trace'] else None
        try:
            return float(s)
        except ValueError:
            return None

    def parse_html_tables(self, html_content: str) -> List[pd.DataFrame]:
        """Parse all <table> elements in HTML into list of DataFrames."""
        tables = re.findall(r'<table[^>]*>(.*?)</table>', html_content, re.DOTALL | re.IGNORECASE)
        dataframes = []

        for table_html in tables:
            rows = re.findall(r'<tr[^>]*>(.*?)</tr>', table_html, re.DOTALL | re.IGNORECASE)
            table_data = []
            headers = []

            for row_idx, row_html in enumerate(rows):
                cells = re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', row_html, re.DOTALL | re.IGNORECASE)
                cleaned_cells = [self.clean_cell_text(c) for c in cells]
                
                if not cleaned_cells or all(c == '' for c in cleaned_cells):
                    continue

                if not headers and any(c.lower() in ['district', 'state', 'actual', 'normal'] for c in cleaned_cells):
                    headers = [c.lower() for c in cleaned_cells]
                else:
                    table_data.append(cleaned_cells)

            if table_data:
                # Assign default headers if none found
                max_cols = max(len(r) for r in table_data)
                if not headers or len(headers) != max_cols:
                    headers = [f"col_{i}" for i in range(max_cols)]
                
                # Standardize rows to max_cols length
                norm_data = [r + [''] * (max_cols - len(r)) for r in table_data]
                df = pd.DataFrame(norm_data, columns=headers)
                dataframes.append(df)

        return dataframes

    def extract_country_data_provider(self, html_content: str) -> List[Dict[str, Any]]:
        """
        Extracts embedded JavaScript map dataset `var countrydataprovider = [...]` from IMD map pages.
        """
        match = re.search(r'var\s+countrydataprovider\s*=\s*(\[.*?\]|\{.*?\});', html_content, re.DOTALL)
        if match:
            raw_js = match.group(1)
            # Standardize JS keys to quoted JSON keys
            sanitized = re.sub(r'([a-zA-Z0-9_]+)\s*:', r'"\1":', raw_js)
            sanitized = re.sub(r':\s*([a-zA-Z0-9_]+)', r': "\1"', sanitized)
            try:
                data = json.loads(raw_js)
                if isinstance(data, list):
                    return data
                elif isinstance(data, dict):
                    return [data]
            except Exception:
                # Fallback regex extraction of key-values
                records = []
                district_blocks = re.findall(r'\{([^}]+)\}', raw_js)
                for block in district_blocks:
                    pairs = re.findall(r'([a-zA-Z0-9_]+)\s*:\s*["\']?([^"\',}]+)["\']?', block)
                    if pairs:
                        records.append(dict(pairs))
                return records

        return []

    def parse_stats_page(self, html_content: str) -> pd.DataFrame:
        """Extracts statistical summary table from IMD rainfall_statistics.php pages."""
        dfs = self.parse_html_tables(html_content)
        if dfs:
            # Select the table with the most rows
            best_df = max(dfs, key=lambda x: len(x))
            return best_df
        return pd.DataFrame()
