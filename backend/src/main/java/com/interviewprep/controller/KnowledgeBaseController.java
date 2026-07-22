package com.interviewprep.controller;

import com.interviewprep.service.CompanyKnowledgeService;
import com.interviewprep.service.TipsKnowledgeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/kb")
@RequiredArgsConstructor
public class KnowledgeBaseController {

    private final CompanyKnowledgeService companyKB;
    private final TipsKnowledgeService tipsKB;

    @PostMapping("/company")
    public ResponseEntity<Void> addCompanyEntry(@RequestBody Map<String, String> body) {
        companyKB.addEntry(body.get("company"), body.get("pattern"));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/tips")
    public ResponseEntity<Void> addTip(@RequestBody Map<String, String> body) {
        tipsKB.addTip(body.get("category"), body.get("tip"));
        return ResponseEntity.ok().build();
    }
}
