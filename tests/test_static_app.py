from pathlib import Path
import re
import unittest

ROOT = Path(__file__).resolve().parents[1]


class StaticAppTests(unittest.TestCase):
    def test_core_files_exist(self):
        for filename in ["index.html", "styles.css", "app.js"]:
            self.assertTrue((ROOT / filename).exists(), filename)

    def test_html_has_mobile_viewport_and_cbs_api(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('name="viewport"', html)
        self.assertIn("MigratieMonitor", html)
        self.assertIn("85484NED", html)
        self.assertIn("trendChart", html)
        self.assertIn("originChart", html)

    def test_javascript_uses_live_cbs_api_not_fixture_data(self):
        js = (ROOT / "app.js").read_text(encoding="utf-8")
        self.assertIn("https://opendata.cbs.nl/ODataApi/OData/85484NED", js)
        self.assertIn("fetch(`${baseUrl}/${resource}", js)
        self.assertIn("TOTAL_FILTER", js)
        self.assertIn("ORIGIN_SEGMENTS", js)
        self.assertNotRegex(js, re.compile(r"mock|fixture|dummy", re.IGNORECASE))

    def test_html_shows_country_level_origin_section(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn("countryChart", html)
        self.assertIn("countryList", html)
        self.assertIn("Top herkomstlanden", html)
        self.assertIn('href="#landen"', html)

    def test_javascript_builds_country_level_rows_from_cbs_herkomstland(self):
        js = (ROOT / "app.js").read_text(encoding="utf-8")
        self.assertIn("countryRows", js)
        self.assertIn("COUNTRY_CATEGORY_GROUPS", js)
        self.assertIn("CategoryGroupID", js)
        self.assertIn("renderCountryChart", js)
        self.assertIn("renderCountryList", js)
        self.assertRegex(js, re.compile(r"sort\(\(a, b\) => b\.immigratie - a\.immigratie"))

    def test_html_shows_migration_motive_section(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        js = (ROOT / "app.js").read_text(encoding="utf-8")
        self.assertIn("motiveChart", html)
        self.assertIn("motiveList", html)
        self.assertIn("Migratiemotieven", html)
        self.assertIn("horizontalBarOptions('Aantal immigranten', false)", js)
        self.assertNotIn("type: 'doughnut'", js)

    def test_javascript_fetches_cbs_migration_motives(self):
        js = (ROOT / "app.js").read_text(encoding="utf-8")
        self.assertIn("MOTIVE_API_BASE", js)
        self.assertIn("84809NED", js)
        self.assertIn("MOTIVE_KEYS", js)
        self.assertIn("A009232", js)  # Arbeid: totaal
        self.assertIn("A009233", js)  # Asiel: totaal
        self.assertIn("fetchMigrationMotives", js)
        self.assertIn("renderMotiveChart", js)
        self.assertIn("motiveRows", js)

    def test_page_has_publishable_social_metadata(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('name="description"', html)
        self.assertIn('property="og:title"', html)
        self.assertIn('property="og:image"', html)
        self.assertIn('name="twitter:card"', html)
        self.assertIn('rel="canonical"', html)

    def test_dashboard_leads_with_plots_and_keeps_exact_values_available(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        js = (ROOT / "app.js").read_text(encoding="utf-8")
        for element_id in [
            "insightSaldo12",
            "insightSaldoBars",
            "insightCountry",
            "insightCountryBar",
            "insightMotive",
            "insightMotiveBar",
            "trendDataTableBody",
        ]:
            self.assertIn(element_id, html)
        self.assertNotIn("insightSummary", html)
        self.assertIn("renderVisualInsights", js)
        self.assertIn("renderTrendTable", js)
        self.assertIn("jaar-op-jaar", js)

    def test_motive_failure_does_not_block_the_monthly_dashboard(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        js = (ROOT / "app.js").read_text(encoding="utf-8")
        self.assertIn("motiveError", html)
        self.assertIn("fetchMigrationMotives().catch", js)
        self.assertIn("motiveData.error", js)

    def test_css_is_responsive_and_accessible(self):
        css = (ROOT / "styles.css").read_text(encoding="utf-8")
        self.assertIn("@media (max-width: 880px)", css)
        self.assertIn("@media (max-width: 640px)", css)
        self.assertIn("grid-template-columns", css)
        self.assertIn(":focus-visible", css)
        self.assertIn("prefers-reduced-motion", css)


if __name__ == "__main__":
    unittest.main()
