package com.interviewprep.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.StringReader;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Fetches real company-wise LeetCode questions from:
 *   https://github.com/hxu296/leetcode-company-wise-problems-2022
 *
 * CSV format: problem_link,problem_name,num_occur
 * Results are cached in-memory per company (TTL: 12 hours).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class CompanyGithubService {

    private static final String CSV_BASE =
            "/hxu296/leetcode-company-wise-problems-2022/main/companies/";
    private static final String GITHUB_API_URL =
            "https://api.github.com/repos/hxu296/leetcode-company-wise-problems-2022/contents/companies";
    private static final long TTL_MS = 12 * 60 * 60 * 1000L;

    private final ExternalDataFetcher fetcher;
    private final ObjectMapper objectMapper = new ObjectMapper();

    private final ConcurrentHashMap<String, CacheEntry> questionCache = new ConcurrentHashMap<>();
    private volatile List<String> companyListCache = null;
    private volatile long companyListFetchedAt = 0L;

    public record GithubQuestion(
            String title,
            String url,
            int occurrences,
            int rank
    ) {}

    private record CacheEntry(long fetchedAt, List<GithubQuestion> questions) {}

    // ── Company list ──────────────────────────────────────────────────────────

    public List<String> getCompanyList() {
        long now = System.currentTimeMillis();
        if (companyListCache != null && (now - companyListFetchedAt) < TTL_MS) {
            return companyListCache;
        }

        try {
            String raw = fetcher.fetchUrl(GITHUB_API_URL);
            if (!raw.isBlank()) {
                JsonNode arr = objectMapper.readTree(raw);
                List<String> companies = new ArrayList<>();
                for (JsonNode node : arr) {
                    String name = node.path("name").asText("");
                    if (name.endsWith(".csv")) {
                        companies.add(name.substring(0, name.length() - 4));
                    }
                }
                companies.sort(String.CASE_INSENSITIVE_ORDER);
                companyListCache = Collections.unmodifiableList(companies);
                companyListFetchedAt = now;
                return companyListCache;
            }
        } catch (Exception e) {
            log.warn("Failed to fetch company list from GitHub API: {}", e.getMessage());
        }

        companyListCache = KNOWN_COMPANIES;
        companyListFetchedAt = now;
        return companyListCache;
    }

    // ── Questions for a company ───────────────────────────────────────────────

    public List<GithubQuestion> getQuestionsForCompany(String company) {
        long now = System.currentTimeMillis();
        CacheEntry entry = questionCache.get(company);
        if (entry != null && (now - entry.fetchedAt()) < TTL_MS) {
            return entry.questions();
        }

        List<GithubQuestion> questions = fetchCsv(company);
        questionCache.put(company, new CacheEntry(now, questions));
        return questions;
    }

    private List<GithubQuestion> fetchCsv(String company) {
        String raw = fetcher.fetchGithubRaw(CSV_BASE + encodeSlug(company) + ".csv");
        if (raw.isBlank()) {
            log.warn("No GitHub CSV found for company: {}", company);
            return List.of();
        }

        List<GithubQuestion> questions = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(new StringReader(raw))) {
            String line = reader.readLine(); // skip header
            int rank = 1;
            while ((line = reader.readLine()) != null) {
                String[] parts = line.split(",", 3);
                if (parts.length < 2) continue;
                String url = parts[0].trim();
                String title = parts[1].trim();
                int occurrences = parts.length >= 3 ? parseIntSafe(parts[2].trim()) : 1;
                if (title.isBlank() || url.isBlank()) continue;
                questions.add(new GithubQuestion(title, url, occurrences, rank++));
            }
        } catch (Exception e) {
            log.warn("Failed to parse CSV for {}: {}", company, e.getMessage());
            return List.of();
        }

        // Sort by occurrences descending (most frequently asked first)
        questions.sort(Comparator.comparingInt(GithubQuestion::occurrences).reversed());
        // Re-rank after sort
        List<GithubQuestion> ranked = new ArrayList<>();
        for (int i = 0; i < questions.size(); i++) {
            GithubQuestion q = questions.get(i);
            ranked.add(new GithubQuestion(q.title(), q.url(), q.occurrences(), i + 1));
        }

        log.info("Fetched {} questions for {} from GitHub", ranked.size(), company);
        return Collections.unmodifiableList(ranked);
    }

    private String encodeSlug(String company) {
        // GitHub raw URLs need %20 for spaces
        return company.replace(" ", "%20");
    }

    private int parseIntSafe(String s) {
        try { return Integer.parseInt(s); } catch (NumberFormatException e) { return 1; }
    }

    // ── Hardcoded fallback company list ───────────────────────────────────────

    private static final List<String> KNOWN_COMPANIES = List.of(
            "Adobe", "Airbnb", "Amazon", "Apple", "Atlassian",
            "Bloomberg", "ByteDance", "Citadel", "Coinbase", "Datadog",
            "DoorDash", "Dropbox", "Facebook", "Goldman Sachs", "Google",
            "Intuit", "JPMorgan", "LinkedIn", "Lyft", "Microsoft",
            "Morgan Stanley", "Netflix", "Oracle", "Palantir", "PayPal",
            "Pinterest", "Roblox", "Robinhood", "Salesforce", "Snap",
            "Spotify", "Stripe", "TikTok", "Twilio", "Twitter",
            "Two Sigma", "Uber", "VMware", "Walmart"
    );
}
