package com.interviewprep.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.sql.Array;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

/**
 * Stores and queries vector embeddings in PostgreSQL using the pgvector extension.
 *
 * All queries use cosine distance (<=>).
 * The vector_documents table must exist (see vector_schema.sql).
 */
@Service
@RequiredArgsConstructor
public class VectorStoreService {

    private final JdbcTemplate jdbc;
    private final EmbeddingService embeddingService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public void store(String docType, Long sourceId, String content, Map<String, Object> metadata) {
        float[] embedding = embeddingService.embed(content);
        String metaJson = toJson(metadata);
        String vectorLiteral = toVectorLiteral(embedding);

        jdbc.update(
                "INSERT INTO vector_documents (doc_type, source_id, content, metadata, embedding) " +
                "VALUES (?::varchar, ?, ?, ?::jsonb, ?::vector)",
                docType, sourceId, content, metaJson, vectorLiteral
        );
    }

    public List<SearchResult> similaritySearch(String query, String docType, int topK) {
        float[] queryVec = embeddingService.embed(query);
        String vectorLiteral = toVectorLiteral(queryVec);

        String sql = """
                SELECT id, doc_type, source_id, content, metadata,
                       1 - (embedding <=> ?::vector) AS score
                FROM vector_documents
                WHERE doc_type = ?
                ORDER BY embedding <=> ?::vector
                LIMIT ?
                """;

        return jdbc.query(sql,
                (rs, rowNum) -> {
                    String metaStr = rs.getString("metadata");
                    Map<String, Object> meta = parseJson(metaStr);
                    return new SearchResult(
                            rs.getLong("id"),
                            rs.getString("doc_type"),
                            rs.getLong("source_id"),
                            rs.getString("content"),
                            meta,
                            rs.getDouble("score")
                    );
                },
                vectorLiteral, docType, vectorLiteral, topK
        );
    }

    public List<SearchResult> similaritySearchAny(String query, int topK) {
        float[] queryVec = embeddingService.embed(query);
        String vectorLiteral = toVectorLiteral(queryVec);

        String sql = """
                SELECT id, doc_type, source_id, content, metadata,
                       1 - (embedding <=> ?::vector) AS score
                FROM vector_documents
                ORDER BY embedding <=> ?::vector
                LIMIT ?
                """;

        return jdbc.query(sql,
                (rs, rowNum) -> {
                    String metaStr = rs.getString("metadata");
                    Map<String, Object> meta = parseJson(metaStr);
                    return new SearchResult(
                            rs.getLong("id"),
                            rs.getString("doc_type"),
                            rs.getLong("source_id"),
                            rs.getString("content"),
                            meta,
                            rs.getDouble("score")
                    );
                },
                vectorLiteral, vectorLiteral, topK
        );
    }

    public void deleteBySourceId(String docType, Long sourceId) {
        jdbc.update("DELETE FROM vector_documents WHERE doc_type = ? AND source_id = ?",
                docType, sourceId);
    }

    public boolean hasDocType(String docType) {
        Integer count = jdbc.queryForObject(
                "SELECT COUNT(*) FROM vector_documents WHERE doc_type = ?",
                Integer.class, docType);
        return count != null && count > 0;
    }

    private String toVectorLiteral(float[] vec) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < vec.length; i++) {
            if (i > 0) sb.append(',');
            sb.append(vec[i]);
        }
        sb.append(']');
        return sb.toString();
    }

    private String toJson(Map<String, Object> map) {
        try {
            return map == null ? "{}" : objectMapper.writeValueAsString(map);
        } catch (Exception e) {
            return "{}";
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJson(String json) {
        try {
            if (json == null || json.isBlank()) return Map.of();
            return objectMapper.readValue(json, Map.class);
        } catch (Exception e) {
            return Map.of();
        }
    }

    public record SearchResult(
            Long id,
            String docType,
            Long sourceId,
            String content,
            Map<String, Object> metadata,
            double score
    ) {}
}
