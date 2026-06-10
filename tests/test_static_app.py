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
        self.assertIn("Herkomstlanden", html)

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
        self.assertIn("motiveChart", html)
        self.assertIn("motiveList", html)
        self.assertIn("Arbeidsmigratie", html)
        self.assertIn("Asielmigratie", html)
        self.assertIn("Migratiemotief", html)

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

    def test_css_is_responsive(self):
        css = (ROOT / "styles.css").read_text(encoding="utf-8")
        self.assertIn("@media (max-width: 880px)", css)
        self.assertIn("@media (max-width: 640px)", css)
        self.assertIn("grid-template-columns", css)


if __name__ == "__main__":
    unittest.main()
